const DEFAULT_CLOUDINARY_FOLDER = 'green-alert/reportes';
const DEFAULT_CLOUDINARY_AVATAR_FOLDER = 'green-alert/usuarios';

const readCloudinaryEnv = () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  folder: process.env.CLOUDINARY_FOLDER || DEFAULT_CLOUDINARY_FOLDER,
  avatarFolder: process.env.CLOUDINARY_AVATAR_FOLDER || DEFAULT_CLOUDINARY_AVATAR_FOLDER,
});

export const getMissingCloudinaryVars = (config = readCloudinaryEnv()) => {
  const missing = [];

  if (!config.cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!config.apiKey) missing.push('CLOUDINARY_API_KEY');
  if (!config.apiSecret) missing.push('CLOUDINARY_API_SECRET');

  return missing;
};

export const getCloudinaryConfig = ({ requireCredentials = false } = {}) => {
  const config = readCloudinaryEnv();
  const missingVars = getMissingCloudinaryVars(config);

  if (requireCredentials && missingVars.length > 0) {
    throw new Error(
      `Variables de entorno para Cloudinary no configuradas: ${missingVars.join(', ')}. ` +
      'Configuralas solo en el entorno donde se suban o eliminen archivos.'
    );
  }

  return {
    ...config,
    configured: missingVars.length === 0,
    missingVars,
  };
};
