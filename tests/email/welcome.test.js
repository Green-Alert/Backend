#!/usr/bin/env node

/**
 * Test: Welcome Email
 * USO: node tests/email/welcome.test.js
 * 
 * Requiere variables .env configuradas:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - FRONTEND_URL (opcional)
 */

import 'dotenv/config';
import { enviarCorreoBienvenida } from '../../src/services/email.service.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
};

const testWelcomeEmail = async () => {
  console.log('\n' + colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Testing: Welcome Email' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════\n' + colors.reset);

  const testUser = {
    email: process.env.TEST_EMAIL || 'test@ejemplo.com',
    nombre: 'Test',
    apellido: 'Usuario',
  };

  log.info(`Sending welcome email to: ${testUser.email}`);
  log.info(`User: ${testUser.nombre} ${testUser.apellido}\n`);

  try {
    const result = await enviarCorreoBienvenida(
      testUser.email,
      testUser.nombre,
      testUser.apellido
    );

    if (result) {
      log.success('Welcome email sent successfully');
      log.info('User should receive email within minutes\n');
      process.exit(0);
    } else {
      log.error('Could not send welcome email');
      log.info('Check console for details\n');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    log.info('\nPossible solutions:');
    log.info('1. Verify SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
    log.info('2. Confirm SMTP service is available');
    log.info('3. Check credentials (user/password correct)');
    log.info('4. For development, use https://mailtrap.io (free trial)\n');
    process.exit(1);
  }
};

testWelcomeEmail();
