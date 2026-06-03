import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import express from 'express';
import { getMaxFileSize, getUploadDir } from '../../src/config/upload.config.js';
import { upload, uploadMultiple } from '../../middlewares/upload.middleware.js';

test.afterEach(() => {
  delete process.env.UPLOAD_DIR;
  delete process.env.MAX_FILE_SIZE;
});

test('getUploadDir usa ./uploads por defecto', () => {
  assert.equal(getUploadDir(), path.resolve(process.cwd(), './uploads'));
});

test('getUploadDir usa UPLOAD_DIR desde entorno', () => {
  process.env.UPLOAD_DIR = './custom-uploads';

  assert.equal(getUploadDir(), path.resolve(process.cwd(), './custom-uploads'));
});

test('getMaxFileSize usa MAX_FILE_SIZE desde entorno', () => {
  process.env.MAX_FILE_SIZE = '2048';

  assert.equal(getMaxFileSize(), 2048);
});

test('getMaxFileSize usa fallback cuando MAX_FILE_SIZE es invalido', () => {
  process.env.MAX_FILE_SIZE = 'invalid';

  assert.equal(getMaxFileSize(), 10 * 1024 * 1024);
});

const listen = (app) => new Promise((resolve) => {
  const server = app.listen(0, () => resolve(server));
});

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake-image'),
]);

const WEBP_BYTES = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x10, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 ', 'ascii'),
  Buffer.from('fake-webp'),
]);

const JPEG_BYTES = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('fake-jpeg'),
]);

test('upload.single guarda archivo en memoria y conserva filename compatible', async () => {
  const app = express();
  app.post('/upload', upload.single('file'), (req, res) => {
    res.json({
      hasBuffer: Buffer.isBuffer(req.file?.buffer),
      filename: req.file?.filename,
      originalname: req.file?.originalname,
      path: req.file?.path ?? null,
    });
  });

  const server = await listen(app);
  try {
    const port = server.address().port;
    const formData = new FormData();
    formData.append('file', new Blob([PNG_BYTES], { type: 'image/png' }), 'evidencia.png');

    const response = await fetch(`http://127.0.0.1:${port}/upload`, {
      method: 'POST',
      body: formData,
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.hasBuffer, true);
    assert.match(body.filename, /^[0-9a-f-]{36}\.png$/);
    assert.equal(body.originalname, 'evidencia.png');
    assert.equal(body.path, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('upload.single rechaza MIME valido con contenido falso', async () => {
  const app = express();
  app.post('/upload', upload.single('file'), (_req, res) => {
    res.json({ ok: true });
  });
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ message: error.message });
  });

  const server = await listen(app);
  try {
    const port = server.address().port;
    const formData = new FormData();
    formData.append('file', new Blob(['%PDF-1.7 contenido falso'], { type: 'image/png' }), 'falso.png');

    const response = await fetch(`http://127.0.0.1:${port}/upload`, {
      method: 'POST',
      body: formData,
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(
      body.message,
      'El contenido del archivo "falso.png" no coincide con el tipo declarado o esta corrupto.'
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('uploadMultiple mantiene campos file y files', async () => {
  const app = express();
  app.post('/upload-multiple', uploadMultiple, (req, res) => {
    res.json({
      fileCount: req.files?.file?.length ?? 0,
      filesCount: req.files?.files?.length ?? 0,
      hasBuffers: [
        ...(req.files?.file ?? []),
        ...(req.files?.files ?? []),
      ].every((file) => Buffer.isBuffer(file.buffer)),
      filenames: [
        ...(req.files?.file ?? []),
        ...(req.files?.files ?? []),
      ].map((file) => file.filename),
    });
  });

  const server = await listen(app);
  try {
    const port = server.address().port;
    const formData = new FormData();
    formData.append('file', new Blob([PNG_BYTES], { type: 'image/png' }), 'principal.png');
    formData.append('files', new Blob([WEBP_BYTES], { type: 'image/webp' }), 'uno.webp');
    formData.append('files', new Blob([JPEG_BYTES], { type: 'image/jpeg' }), 'dos.jpg');

    const response = await fetch(`http://127.0.0.1:${port}/upload-multiple`, {
      method: 'POST',
      body: formData,
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.fileCount, 1);
    assert.equal(body.filesCount, 2);
    assert.equal(body.hasBuffers, true);
    assert.equal(body.filenames.length, 3);
    assert.ok(body.filenames.every((filename) => /^[0-9a-f-]{36}\.(png|webp|jpg)$/.test(filename)));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
