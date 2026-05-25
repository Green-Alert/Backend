#!/usr/bin/env node

import 'dotenv/config';
import { getFacebookConfig } from '../../src/config/facebook.config.js';

const isPlaceholder = (value) => {
  if (!value) return true;

  const normalizedValue = value.toLowerCase();
  return (
    normalizedValue.includes('your_') ||
    normalizedValue.includes('tu_') ||
    normalizedValue.includes('clave_secreta') ||
    normalizedValue.includes('app_id') ||
    normalizedValue.includes('app_secret')
  );
};

try {
  const config = getFacebookConfig();
  const warnings = [];

  if (isPlaceholder(config.appId)) {
    warnings.push('FACEBOOK_APP_ID parece ser un valor de ejemplo.');
  }

  if (isPlaceholder(config.appSecret)) {
    warnings.push('FACEBOOK_APP_SECRET parece ser un valor de ejemplo.');
  }

  console.log('[OK] FACEBOOK_APP_ID configurado.');
  console.log('[OK] FACEBOOK_APP_SECRET configurado.');
  console.log(`[OK] FACEBOOK_CALLBACK_URL: ${config.callbackUrl}`);
  console.log(`[OK] FACEBOOK_GRAPH_API_VERSION: ${config.graphApiVersion}`);

  if (warnings.length > 0) {
    console.log('\n[AVISO] Revisa estas advertencias:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
    process.exit(1);
  }

  console.log('\n[SUCCESS] Credenciales de Facebook OAuth cargadas correctamente.');
} catch (error) {
  console.error('[ERROR] No se pudo validar Facebook OAuth.');
  console.error(error.message);
  process.exit(1);
}
