#!/usr/bin/env node
/**
 * SCRIPT DE VALIDACIÓN: Google OAuth Credentials
 * 
 * Valida que:
 * 1. GOOGLE_CLIENT_ID esté definido en .env
 * 2. GOOGLE_CLIENT_SECRET esté definido en .env
 * 3. Los valores tengan formato correcto
 * 4. El backend puede cargar la configuración
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\nGoogle OAuth Credentials Validation');
console.log('=====================================\n');

// Cargar .env
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('[ERROR] Archivo .env no encontrado');
  console.error(`   Crea el archivo: ${envPath}`);
  console.error(`   Basado en: ${envPath}.example\n`);
  process.exit(1);
}

dotenv.config({ path: envPath });

// Validar variables
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

const errors = [];
const warnings = [];

console.log('[VALIDACION] Verificando variables...\n');

// Validar CLIENT_ID
if (!clientId) {
  errors.push('GOOGLE_CLIENT_ID no está definido');
  console.log('[ERROR] GOOGLE_CLIENT_ID: NO CONFIGURADO');
} else if (!clientId.includes('.apps.googleusercontent.com')) {
  errors.push('GOOGLE_CLIENT_ID tiene formato incorrecto');
  console.log(`[ERROR] GOOGLE_CLIENT_ID: Formato incorrecto`);
  console.log(`   Esperado: xxxxx.apps.googleusercontent.com`);
  console.log(`   Recibido: ${clientId.substring(0, 30)}...`);
} else {
  console.log(`[OK] GOOGLE_CLIENT_ID: ${clientId.substring(0, 30)}...`);
}

// Validar CLIENT_SECRET
if (!clientSecret) {
  errors.push('GOOGLE_CLIENT_SECRET no está definido');
  console.log('[ERROR] GOOGLE_CLIENT_SECRET: NO CONFIGURADO');
} else if (!clientSecret.startsWith('GOCSPX-') && clientSecret.length < 20) {
  warnings.push('GOOGLE_CLIENT_SECRET podría tener formato incorrecto');
  console.log(`[AVISO] GOOGLE_CLIENT_SECRET: Posible formato incorrecto`);
  console.log(`   Longitud: ${clientSecret.length} caracteres`);
  console.log(`   Formato esperado: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`);
} else {
  console.log(`[OK] GOOGLE_CLIENT_SECRET: ${clientSecret.substring(0, 20)}...`);
}

// Validar CALLBACK_URL
if (!callbackUrl) {
  warnings.push('GOOGLE_CALLBACK_URL no está definido');
  console.log('[AVISO] GOOGLE_CALLBACK_URL: NO CONFIGURADO (usará default)');
} else {
  console.log(`[OK] GOOGLE_CALLBACK_URL: ${callbackUrl}`);
}

console.log();

// Intentar cargar configuración
console.log('[CONFIG] Cargando configuración de backend...\n');

try {
  const { getGoogleConfig } = await import('./src/config/google.config.js');
  const config = getGoogleConfig();
  
  console.log('[OK] Configuración cargada exitosamente');
  console.log(`  - Client ID: ${config.clientId.substring(0, 30)}...`);
  console.log(`  - Client Secret: ${config.clientSecret.substring(0, 20)}...`);
  console.log(`  - Callback URL: ${config.callbackUrl}`);
  console.log();
} catch (error) {
  errors.push(`No se pudo cargar configuración: ${error.message}`);
  console.error(`[ERROR] Error: ${error.message}\n`);
}

// Resumen
console.log('RESUMEN');
console.log('═════════════════════════════════════════════════════\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('[SUCCESS] TODAS LAS VALIDACIONES PASARON');
  console.log('\nGoogle OAuth está correctamente configurado.');
  console.log('   El backend está listo para usar autenticación con Google.\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('[ERROR] ERRORES ENCONTRADOS:\n');
    errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log('[AVISO] ADVERTENCIAS:\n');
    warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    console.log();
  }
  
  if (errors.length > 0) {
    console.log('PRÓXIMOS PASOS:');
    console.log('   1. Lee: GOOGLE_OAUTH_SETUP.md');
    console.log('   2. Ve a: https://console.cloud.google.com/');
    console.log('   3. Sigue todos los pasos para obtener credenciales');
    console.log('   4. Copia los valores a .env');
    console.log('   5. Ejecuta este script nuevamente\n');
    process.exit(1);
  } else {
    console.log('SUGERENCIAS:');
    console.log('   - Verifica que los valores sean correctos\n');
    process.exit(0);
  }
}
