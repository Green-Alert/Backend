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
    formData.append('file', new Blob(['fake-image'], { type: 'image/png' }), 'evidencia.png');

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
    formData.append('file', new Blob(['main'], { type: 'image/png' }), 'principal.png');
    formData.append('files', new Blob(['one'], { type: 'image/webp' }), 'uno.webp');
    formData.append('files', new Blob(['two'], { type: 'image/jpeg' }), 'dos.jpg');

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
