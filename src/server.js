import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { testConnection } from './config/database.js';
import { getEmailConfig } from './config/email.config.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Validar configuración de email
    getEmailConfig();
    console.log('✓ Configuración de email validada correctamente');
  } catch (error) {
    console.error('✗ Error en configuración de email:', error.message);
    process.exit(1);
  }

  await testConnection();

  app.listen(PORT, () => {
    console.log(`servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer();
