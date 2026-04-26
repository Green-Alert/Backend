/**
 * GOOGLE OAUTH CONFIGURATION
 * Centraliza y valida todas las variables de entorno para Google OAuth 2.0
 * Nunca debe contener valores hardcodeados
 */

const validateGoogleConfig = () => {
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  };

  // Validar que variables críticas estén definidas
  const missingVars = [];
  
  if (!config.clientId) missingVars.push('GOOGLE_CLIENT_ID');
  if (!config.clientSecret) missingVars.push('GOOGLE_CLIENT_SECRET');

  if (missingVars.length > 0) {
    throw new Error(
      `Variables de entorno para Google OAuth no configuradas: ${missingVars.join(', ')}\n` +
      `Por favor, completa estos valores en el archivo .env\n` +
      `Referencia: ../GOOGLE_OAUTH_SETUP.md\n` +
      `\nPasos:\n` +
      `1. Ve a Google Cloud Console (console.cloud.google.com)\n` +
      `2. Crea un proyecto nuevo\n` +
      `3. Habilita Google+ API\n` +
      `4. Crea credenciales OAuth 2.0\n` +
      `5. Copia CLIENT_ID y CLIENT_SECRET a .env`
    );
  }

  return config;
};

// Cargar y validar configuración
let googleConfig = null;

export const getGoogleConfig = () => {
  if (!googleConfig) {
    googleConfig = validateGoogleConfig();
  }
  return googleConfig;
};

// Validar al importar si está en desarrollo
if (process.env.NODE_ENV === 'development') {
  try {
    getGoogleConfig();
    console.log('✓ Google OAuth configuration loaded successfully');
  } catch (error) {
    console.warn('⚠ Google OAuth not yet configured:', error.message);
  }
}

export default getGoogleConfig;
