import { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig } from '../config/cloudinary.config.js';

let injectedClient = null;

const isTestEnvironment = () => (
  process.env.NODE_ENV === 'test' ||
  typeof process.env.NODE_TEST_CONTEXT === 'string'
);

const sanitizePublicIdPart = (value) => (
  String(value || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archivo'
);

const getResourceType = (mimeType = '') => (
  mimeType.startsWith('video/') ? 'video' : 'image'
);

const buildTestUploadResult = ({ originalname, mimetype, size }) => {
  const resourceType = getResourceType(mimetype);
  const name = sanitizePublicIdPart(originalname);
  const timestamp = Date.now();
  const publicId = `green-alert/test/${timestamp}-${name}`;

  return {
    asset_id: `asset-${timestamp}`,
    public_id: publicId,
    secure_url: `https://res.cloudinary.com/test/${resourceType}/upload/${publicId}`,
    resource_type: resourceType,
    bytes: size ?? 0,
    format: originalname?.split('.').pop()?.toLowerCase() || null,
  };
};

export const setCloudinaryClientForTest = (client) => {
  if (!isTestEnvironment()) {
    throw new Error('setCloudinaryClientForTest solo puede usarse con NODE_ENV=test.');
  }

  injectedClient = client;
};

export const resetCloudinaryClientForTest = () => {
  injectedClient = null;
};

const getCloudinaryClient = () => injectedClient || cloudinary;

const configureClientForOperation = () => {
  const usingInjectedTestClient = isTestEnvironment() && injectedClient;
  const config = getCloudinaryConfig({ requireCredentials: !usingInjectedTestClient });
  const client = getCloudinaryClient();

  if (config.configured && typeof client.config === 'function') {
    client.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  return { client, config };
};

const uploadWithClient = ({ client, buffer, folder, resourceType, publicId }) => (
  new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  })
);

export const uploadFileBuffer = async ({
  buffer,
  originalname,
  mimetype,
  size,
  folder,
  publicId,
} = {}) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('buffer es requerido para subir archivos a Cloudinary.');
  }

  if (isTestEnvironment() && !injectedClient) {
    return buildTestUploadResult({ originalname, mimetype, size });
  }

  const resourceType = getResourceType(mimetype);
  const { client, config } = configureClientForOperation();

  return uploadWithClient({
    client,
    buffer,
    folder: folder || config.folder,
    resourceType,
    publicId,
  });
};

export const deleteFileByPublicId = async (publicId, { resourceType = 'image' } = {}) => {
  if (!publicId) {
    throw new Error('public_id es requerido para eliminar archivos de Cloudinary.');
  }

  if (isTestEnvironment() && !injectedClient) {
    return { result: 'ok', public_id: publicId, resource_type: resourceType };
  }

  const { client } = configureClientForOperation();

  return client.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
};
