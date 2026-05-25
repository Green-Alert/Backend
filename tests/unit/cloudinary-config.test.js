import test from 'node:test';
import assert from 'node:assert/strict';
import { getCloudinaryConfig } from '../../src/config/cloudinary.config.js';

const clearCloudinaryEnv = () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_FOLDER;
};

test.afterEach(() => {
  clearCloudinaryEnv();
});

test('getCloudinaryConfig no falla sin credenciales si no son requeridas', () => {
  clearCloudinaryEnv();

  const config = getCloudinaryConfig();

  assert.equal(config.configured, false);
  assert.deepEqual(config.missingVars, [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ]);
});

test('getCloudinaryConfig valida credenciales solo cuando se requieren', () => {
  clearCloudinaryEnv();

  assert.throws(
    () => getCloudinaryConfig({ requireCredentials: true }),
    /Variables de entorno para Cloudinary no configuradas/
  );
});

test('getCloudinaryConfig marca configuracion completa', () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'demo';
  process.env.CLOUDINARY_API_KEY = 'key';
  process.env.CLOUDINARY_API_SECRET = 'secret';
  process.env.CLOUDINARY_FOLDER = 'custom-folder';

  const config = getCloudinaryConfig();

  assert.equal(config.configured, true);
  assert.equal(config.folder, 'custom-folder');
  assert.deepEqual(config.missingVars, []);
});

