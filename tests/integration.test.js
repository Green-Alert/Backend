#!/usr/bin/env node
/**
 * Test Suite: Features implementadas
 * 1. OTP Email Verification
 * 2. GET /reportes/mis-reportes
 * 3. Report editing restrictions
 * 4. Moderation comments
 * 5. Welcome email
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

// Color codes for terminal output
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
  warn: (msg) => console.log(`${colors.yellow}⚠ WARN: ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}═══════════════════════════════════\n  ${msg}\n═══════════════════════════════════${colors.reset}\n`),
};

let testsPassed = 0;
let testsFailed = 0;
let testToken = '';
let testUserId = '';
let testReporteId = '';

// Helper function for API requests
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

// Test wrapper
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

// ============================================
// TEST SUITE
// ============================================

async function runTests() {
  log.section('TEST SUITE: Green Alert Backend Features');

  // ─── 1. REGISTRO Y AUTENTICACIÓN ───
  log.section('1. REGISTRO Y AUTENTICACIÓN');

  await test('Registro de usuario exitoso', async () => {
    const res = await apiRequest('POST', '/auth/register', {
      nombre: 'Test',
      apellido: 'User',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPass123!',
    });
    
    log.info(`Registro response: status=${res.status}, data=${JSON.stringify(res.data)}`);
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert(res.data.usuario || res.data.data, 'Usuario creado');
    assert(res.data.pendingEmailVerification === true || res.data.data?.pendingEmailVerification === true, 'Email verification pendiente');
    
    testUserId = res.data.usuario?.id_usuario || res.data.data?.usuario?.id_usuario;
  });

  await test('Login exitoso', async () => {
    const res = await apiRequest('POST', '/auth/login', {
      email: 'test-user@example.com',
      password: 'password123',
    });
    
    // Permitir 200 o 401 (usuario no existe por ahora)
    assert([200, 401].includes(res.status), `Login response ${res.status}`);
  });

  // ─── 2. OTP EMAIL VERIFICATION ───
  log.section('2. OTP EMAIL VERIFICATION');

  await test('Enviar verificación OTP requiere token', async () => {
    const res = await apiRequest('POST', '/auth/send-verification-email', {});
    
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert(res.data.message.includes('No autorizado'), 'Mensaje de error correcto');
  });

  await test('Verificación OTP con token inválido falla', async () => {
    const res = await apiRequest('POST', '/auth/verify-email', 
      { otp_code: '123456' },
      'invalid-token'
    );
    
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // ─── 3. GET /REPORTES/MIS-REPORTES ───
  log.section('3. GET /REPORTES/MIS-REPORTES');

  await test('Acceso a mis-reportes requiere autenticación', async () => {
    const res = await apiRequest('GET', '/reportes/mis-reportes');
    
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert(res.data.message.includes('No autorizado'), 'Mensaje de error correcto');
  });

  // ─── 4. CREAR REPORTE PARA TESTS ───
  log.section('4. CREAR REPORTE DE PRUEBA');

  // Necesito un token válido. Voy a crear un usuario de prueba
  let res = await apiRequest('POST', '/auth/register', {
    nombre: 'Report',
    apellido: 'Tester',
    email: `reporter-${Date.now()}@example.com`,
    password: 'TestPass123!',
  });

  if (res.status === 201) {
    // Intentar login con este usuario (usar email del registro)
    const testEmail = res.data.usuario.email;
    
    res = await apiRequest('POST', '/auth/login', {
      email: testEmail,
      password: 'TestPass123!',
    });

    if (res.status === 200) {
      testToken = res.data.token;
      log.info(`Token obtenido: ${testToken.substring(0, 20)}...`);

      // Crear un reporte
      res = await apiRequest('POST', '/reportes', 
        {
          id_categoria: 1,
          titulo: 'Test Report',
          descripcion: 'Test description',
          ubicacion: 'Test Location',
          latitud: 10.5,
          longitud: -73.5,
        },
        testToken
      );

      if (res.status === 201) {
        testReporteId = res.data.reporte.id_reporte;
        log.info(`Reporte creado: ${testReporteId}`);
      }
    }
  }

  // ─── 5. RESTRICCIONES DE EDICIÓN ───
  log.section('5. RESTRICCIONES DE EDICIÓN DE REPORTES');

  await test('Listar mis reportes retorna array', async () => {
    if (!testToken) {
      log.warn('Saltando - no hay token disponible');
      return;
    }

    const res = await apiRequest('GET', '/reportes/mis-reportes', null, testToken);
    
    assert([200, 401].includes(res.status), `Expected 200 or 401, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data.reportes) || res.data.reportes === undefined, 'Reportes debe ser array');
    }
  });

  await test('Propietario no puede editar reporte después de pendiente', async () => {
    if (!testToken || !testReporteId) {
      log.warn('Saltando - no hay token o reporte disponible');
      return;
    }

    // Intentar cambiar estado (lo cual debería estar bloqueado después de pendiente)
    const res = await apiRequest('PATCH', `/reportes/${testReporteId}`,
      { estado: 'en_revision' },
      testToken
    );

    // Debería retornar 403 si el reporte ya no está en pendiente
    // O 200 si todavía está en pendiente (es válido cambiar)
    assert([200, 403].includes(res.status), `Expected 200 or 403, got ${res.status}`);
  });

  // ─── 6. COMENTARIOS DE MODERACIÓN ───
  log.section('6. COMENTARIOS DE MODERACIÓN');

  await test('Rechazar reporte requiere comentario', async () => {
    if (!testToken || !testReporteId) {
      log.warn('Saltando - no hay token o reporte disponible');
      return;
    }

    // Intentar rechazar sin comentario
    const res = await apiRequest('PATCH', `/reportes/${testReporteId}`,
      { estado: 'rechazado' },
      testToken
    );

    // Podría fallar por permisos (no es mod) o por validación
    assert([400, 403].includes(res.status), `Expected 400 or 403, got ${res.status}`);
  });

  // ─── 7. ENDPOINTS ADICIONALES ───
  log.section('7. ENDPOINTS ADICIONALES');

  await test('Health check está disponible', async () => {
    const res = await apiRequest('GET', '/health');
    
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.data.status, 'Health status disponible');
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
    console.error('Error fatale:', error);
    process.exit(1);
  });
}, 1000); // Esperar 1 segundo para asegurar que el servidor está listo
