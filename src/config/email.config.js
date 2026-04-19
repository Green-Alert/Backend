/**
 * EMAIL CONFIGURATION
 * Centraliza y valida todas las variables de entorno para el servicio de correo
 * Nunca debe contener valores hardcodeados
 */

const validateEmailConfig = () => {
  const config = {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  };

  // Validar que todas las variables estén definidas
  const missingVars = [];
  
  if (!config.host) missingVars.push('EMAIL_HOST');
  if (!config.port) missingVars.push('EMAIL_PORT');
  if (!config.user) missingVars.push('EMAIL_USER');
  if (!config.pass) missingVars.push('EMAIL_PASS');
  if (!config.from) missingVars.push('EMAIL_FROM');

  if (missingVars.length > 0) {
    throw new Error(
      `Variables de entorno para Email no configuradas: ${missingVars.join(', ')}\n` +
      `Por favor, configura estas variables en el archivo .env\n` +
      `Referencia: Backend/.env.example`
    );
  }

  // Validar formato de puerto
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('EMAIL_PORT debe ser un número válido entre 1 y 65535');
  }

  // Validar formato de email en EMAIL_FROM
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(config.from)) {
    throw new Error('EMAIL_FROM debe ser un correo electrónico válido');
  }

  return config;
};

// Cargar y validar configuración
let emailConfig = null;

export const getEmailConfig = () => {
  if (!emailConfig) {
    emailConfig = validateEmailConfig();
  }
  return emailConfig;
};

export default getEmailConfig;
