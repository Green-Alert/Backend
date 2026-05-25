import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import {
  deleteFileByPublicId,
  resetCloudinaryClientForTest,
  setCloudinaryClientForTest,
  uploadFileBuffer,
} from '../../src/services/cloudinary.service.js';

const previousNodeEnv = process.env.NODE_ENV;

const clearCloudinaryEnv = () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_FOLDER;
};

test.beforeEach(() => {
  process.env.NODE_ENV = 'test';
  clearCloudinaryEnv();
  resetCloudinaryClientForTest();
});

test.afterEach(() => {
  process.env.NODE_ENV = previousNodeEnv;
  clearCloudinaryEnv();
  resetCloudinaryClientForTest();
});

test('uploadFileBuffer usa respuesta mock en test sin credenciales reales', async () => {
  const result = await uploadFileBuffer({
    buffer: Buffer.from('fake-image'),
    originalname: 'evidencia.png',
    mimetype: 'image/png',
    size: 10,
  });

  assert.match(result.secure_url, /^https:\/\/res\.cloudinary\.com\/test\/image\/upload\//);
  assert.match(result.public_id, /^green-alert\/test\//);
  assert.equal(result.resource_type, 'image');
  assert.equal(result.bytes, 10);
});

test('deleteFileByPublicId usa respuesta mock en test sin credenciales reales', async () => {
  const result = await deleteFileByPublicId('green-alert/test/demo', { resourceType: 'video' });

  assert.deepEqual(result, {
    result: 'ok',
    public_id: 'green-alert/test/demo',
    resource_type: 'video',
  });
});

test('uploadFileBuffer permite inyectar cliente mock en test', async () => {
  let configured = false;
  let streamOptions = null;
  const client = {
    config(options) {
      configured = options.cloud_name === 'demo' && options.api_key === 'key';
    },
    uploader: {
      upload_stream(options, callback) {
        streamOptions = options;
        return new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback(null, {
              public_id: 'mock/public-id',
              secure_url: 'https://mocked.cloudinary/image/upload/mock/public-id',
              resource_type: options.resource_type,
            });
            done();
          },
        });
      },
    },
  };

  setCloudinaryClientForTest(client);

  const result = await uploadFileBuffer({
    buffer: Buffer.from('fake-image'),
    originalname: 'evidencia.png',
    mimetype: 'image/png',
  });

  assert.equal(configured, false);
  assert.equal(streamOptions.folder, 'green-alert/reportes');
  assert.equal(streamOptions.resource_type, 'image');
  assert.equal(result.public_id, 'mock/public-id');
});
