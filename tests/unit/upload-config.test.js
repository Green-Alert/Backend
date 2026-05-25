import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { getMaxFileSize, getUploadDir } from '../../src/config/upload.config.js';

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
