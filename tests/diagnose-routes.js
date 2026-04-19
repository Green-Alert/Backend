#!/usr/bin/env node
/**
 * Test simple para diagnosticar rutas disponibles
 */

const BASE_URL = 'http://localhost:3000';

async function testRoute(method, path) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { method });
    console.log(`${method} ${path}: ${response.status}`);
    return response.status;
  } catch (error) {
    console.log(`${method} ${path}: ERROR - ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('Diagnosticando rutas disponibles...\n');

  // Test rutas básicas
  console.log('Rutas básicas:');
  await testRoute('GET', '/health');
  await testRoute('GET', '/');
  
  // Test rutas auth
  console.log('\nRutas Auth:');
  await testRoute('POST', '/auth/register');
  await testRoute('POST', '/auth/login');
  await testRoute('POST', '/auth/send-verification-email');
  await testRoute('GET', '/auth/verify-email');
  
  // Test rutas reportes
  console.log('\nRutas Reportes:');
  await testRoute('GET', '/reportes/mis-reportes');
  await testRoute('GET', '/reportes');
  await testRoute('POST', '/reportes');

  // Test con headers adicionales
  console.log('\nRutas con Bearer token inválido:');
  const headers = {
    'Authorization': 'Bearer invalid-token'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/auth/send-verification-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    console.log(`POST /auth/send-verification-email: ${response.status}`);
    const data = await response.json();
    console.log(`Response:`, data);
  } catch (error) {
    console.log(`Error:`, error.message);
  }
}

main().catch(console.error);
