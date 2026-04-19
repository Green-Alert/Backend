#!/usr/bin/env node
/**
 * Test Suite Mejorado: Features implementadas
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = {
  test: (msg) => console.log(`${colors.cyan}✓ TEST: ${msg}${colors.reset}`),
  pass: (msg) => console.log(`${colors.green}✅ PASS: ${msg}${colors.reset}`),
  fail: (msg) => console.log(`${colors.red}❌ FAIL: ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ INFO: ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}═══════════════════════════════════\n  ${msg}\n═══════════════════════════════════${colors.reset}\n`),
};

let testsPassed = 0;
let testsFailed = 0;
let testToken = '';
let testUserId = '';
let testEmail = '';

async function apiRequest(method, endpoint, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    throw error;
  }
}

async function test(name, fn) {
  log.test(name);
  try {
    await fn();
    log.pass(name);
    testsPassed++;
  } catch (error) {
    log.fail(`${name}: ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  log.section('TEST SUITE: Green Alert Backend Features');

  // ─── 1. REGISTRO Y AUTENTICACIÓN ───
  log.section('1. REGISTRO Y AUTENTICACIÓN');

  await test('Registro de usuario exitoso', async () => {
    testEmail = `test-${Date.now()}@example.com`;
    const res = await apiRequest('POST', '/auth/register', {
      nombre: 'Test',
      apellido: 'User',
      email: testEmail,
      password: 'TestPass123!',
    });
    
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert(res.data?.data?.token, 'Token en respuesta');
    assert(res.data?.data?.user?.id_usuario, 'Usuario creado con ID');
    
    testUserId = res.data?.data?.user?.id_usuario;
    testToken = res.data?.data?.token;
    log.info(`Registro exitoso. Token obtenido: ${testToken.substring(0, 20)}...`);
  });

  await test('Login exitoso con usuario registrado', async () => {
    if (!testEmail) {
      log.info('Saltando - sin email de prueba');
      return;
    }
    
    const res = await apiRequest('POST', '/auth/login', {
      email: testEmail,
      password: 'TestPass123!',
    });
    
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.data?.data?.token, 'Token retornado en login');
    testToken = res.data?.data?.token;
  });

  // ─── 2. ENDPOINTS OTP ───
  log.section('2. ENDPOINTS OTP EMAIL VERIFICATION');

  await test('GET /auth/send-verification-email devuelve 401 sin token', async () => {
    const res = await apiRequest('POST', '/auth/send-verification-email', {});
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /auth/verify-email devuelve 400/404 sin parámetros', async () => {
    const res = await apiRequest('GET', '/auth/verify-email');
    assert([400, 404].includes(res.status), `Expected 400/404, got ${res.status}`);
  });

  // ─── 3. GET /REPORTES/MIS-REPORTES ───
  log.section('3. GET /REPORTES/MIS-REPORTES');

  await test('Acceso a mis-reportes requiere autenticación', async () => {
    const res = await apiRequest('GET', '/reportes/mis-reportes');
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('Acceso a mis-reportes con token válido devuelve lista', async () => {
    if (!testToken) {
      log.info('Saltando - sin token');
      return;
    }

    const res = await apiRequest('GET', '/reportes/mis-reportes', null, testToken);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data?.data?.reportes), 'Reportes debe ser array');
    assert(typeof res.data?.data?.total === 'number', 'Total es número');
  });

  // ─── 4. CREAR REPORTE PARA TESTS ───
  log.section('4. CREAR REPORTE DE PRUEBA');

  let testReporteId = null;
  
  await test('Crear reporte con usuario autenticado', async () => {
    if (!testToken) {
      log.info('Saltando - sin token');
      return;
    }

    const res = await apiRequest('POST', '/reportes', {
      tipo_contaminacion: 'inundacion',
      nivel_severidad: 'medio',
      titulo: 'Test Report Title',
      descripcion: 'Test report description',
      direccion: 'Calle Test 123',
      municipio: 'Test City',
      departamento: 'Test Dept',
      latitud: 10.5,
      longitud: -73.5,
    }, testToken);

    if (res.status === 201) {
      testReporteId = res.data?.data?.id_reporte;
      log.info(`Reporte creado: ${testReporteId}`);
    }
  });

  // ─── 5. ENDPOINTS ADICIONALES ───
  log.section('5. ENDPOINTS ADICIONALES');

  await test('Health check está disponible', async () => {
    const res = await apiRequest('GET', '/health');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.data?.status, 'Health status disponible');
  });

  await test('GET /reportes devuelve lista pública', async () => {
    const res = await apiRequest('GET', '/reportes');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data?.data?.reportes), 'Reportes debe ser array');
  });

  // ─── RESULTADOS FINALES ───
  log.section('RESULTADOS FINALES');
  log.pass(`Tests pasados: ${testsPassed}`);
  log.fail(`Tests fallidos: ${testsFailed}`);
  console.log(`\nTotal: ${testsPassed + testsFailed} tests\n`);

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Ejecutar tests
setTimeout(() => {
  runTests().catch(error => {
    console.error('Error fatal:', error.message);
    process.exit(1);
  });
}, 1000);
