/**
 * FACEBOOK OAUTH CONFIGURATION
 * Centraliza y valida las variables de entorno para Facebook OAuth.
 * No debe contener credenciales reales en el codigo.
 */

const validateFacebookConfig = () => {
  const config = {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/auth/facebook/callback',
    graphApiVersion: process.env.FACEBOOK_GRAPH_API_VERSION || 'v20.0',
  };

  const missingVars = [];

  if (!config.appId) missingVars.push('FACEBOOK_APP_ID');
  if (!config.appSecret) missingVars.push('FACEBOOK_APP_SECRET');

  if (missingVars.length > 0) {
    throw new Error(
      `Variables de entorno para Facebook OAuth no configuradas: ${missingVars.join(', ')}\n` +
      'Completa estos valores en el archivo .env con las credenciales de Meta for Developers.'
    );
  }

  return config;
};

let facebookConfig = null;

export const getFacebookConfig = () => {
  if (!facebookConfig) {
    facebookConfig = validateFacebookConfig();
  }

  return facebookConfig;
};

export const isFacebookConfigured = () => (
  Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
);

export default getFacebookConfig;
