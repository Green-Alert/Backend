/**
 * Tests para email.config.js - Configuración centralizada de email
 * Valida que todas las variables requeridas estén presentes y sean válidas
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import assert from 'assert';
import { getEmailConfig } from '../../src/config/email.config.js';

const testResults = [];

const test = (name, fn) => {
  try {
    fn();
    testResults.push({ name, status: '✅ PASS', error: null });
    console.log(`✅ ${name}`);
  } catch (error) {
    testResults.push({ name, status: '❌ FAIL', error: error.message });
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
  }
};

console.log('\n📧 TESTS: Configuración de Email (email.config.js)\n');
console.log('=' .repeat(60));

// Test 1: Obtener configuración sin errores
test('Obtener configuración de email', () => {
  const config = getEmailConfig();
  assert.ok(config, 'Config debe existir');
  assert.ok(config.host, 'EMAIL_HOST debe existir');
  assert.ok(config.port, 'EMAIL_PORT debe existir');
  assert.ok(config.user, 'EMAIL_USER debe existir');
  assert.ok(config.pass, 'EMAIL_PASS debe existir');
  assert.ok(config.from, 'EMAIL_FROM debe existir');
});

// Test 2: Validar tipos de datos
test('Validar tipos de datos', () => {
  const config = getEmailConfig();
  assert.strictEqual(typeof config.host, 'string', 'host debe ser string');
  assert.strictEqual(typeof config.port, 'number', 'port debe ser number');
  assert.strictEqual(typeof config.user, 'string', 'user debe ser string');
  assert.strictEqual(typeof config.pass, 'string', 'pass debe ser string');
  assert.strictEqual(typeof config.from, 'string', 'from debe ser string');
});

// Test 3: Validar puerto en rango válido
test('Validar rango de puerto SMTP', () => {
  const config = getEmailConfig();
  assert.ok(config.port >= 1, 'Puerto debe ser >= 1');
  assert.ok(config.port <= 65535, 'Puerto debe ser <= 65535');
  assert.ok([25, 587, 465].includes(config.port), 'Puerto típico SMTP (25, 587, 465)');
});

// Test 4: Validar formato de EMAIL_FROM
test('Validar formato de EMAIL_FROM', () => {
  const config = getEmailConfig();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.ok(emailRegex.test(config.from), `EMAIL_FROM debe ser válido: ${config.from}`);
});

// Test 5: Validar hosts conocidos
test('Host SMTP válido o conocido', () => {
  const config = getEmailConfig();
  const knownHosts = ['smtp.mailtrap.io', 'smtp.gmail.com', 'smtp.sendgrid.net', 'localhost'];
  assert.ok(
    knownHosts.includes(config.host) || config.host.includes('mail'),
    `Host debe ser conocido o contener 'mail': ${config.host}`
  );
});

// Test 6: No contiene valores de prueba inválidos
test('No contiene valores de ejemplo sin cambiar', () => {
  const config = getEmailConfig();
  const invalidValues = ['your_email@mailtrap.io', 'your_password', 'smtp.example.com'];
  
  assert.ok(!invalidValues.includes(config.user), 'EMAIL_USER no debe ser valor de ejemplo');
  assert.ok(!invalidValues.includes(config.pass), 'EMAIL_PASS no debe ser valor de ejemplo');
  assert.ok(!invalidValues.includes(config.host), 'EMAIL_HOST no debe ser valor de ejemplo');
});

// Test 7: Cache de configuración funciona
test('Cache de configuración (singleton)', () => {
  const config1 = getEmailConfig();
  const config2 = getEmailConfig();
  assert.strictEqual(config1, config2, 'Debe retornar la misma instancia (cache)');
});

// Test 8: Estructura completa
test('Estructura de configuración completa', () => {
  const config = getEmailConfig();
  const expectedKeys = ['host', 'port', 'user', 'pass', 'from'];
  const actualKeys = Object.keys(config);
  
  expectedKeys.forEach(key => {
    assert.ok(actualKeys.includes(key), `Config debe tener propiedad: ${key}`);
  });
});

// Resumen
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMEN DE TESTS\n');

const total = testResults.length;
const passed = testResults.filter(r => r.status === '✅ PASS').length;
const failed = testResults.filter(r => r.status === '❌ FAIL').length;

testResults.forEach(r => {
  console.log(`${r.status} ${r.name}`);
  if (r.error) {
    console.log(`   ⚠️  ${r.error}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Total: ${total} | Pasado: ${passed} | Fallido: ${failed}`);

if (failed === 0) {
  console.log('\n✅ TODOS LOS TESTS PASARON\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} TEST(S) FALLARON\n`);
  process.exit(1);
}
