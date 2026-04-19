#!/usr/bin/env node

/**
 * Test: User Registration
 * USO: node tests/auth/register.test.js
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
let testsPassed = 0;
let testsFailed = 0;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
};

const assert = (condition, testName) => {
  if (condition) {
    log.success(testName);
    testsPassed++;
  } else {
    log.error(testName);
    testsFailed++;
  }
};

async function testConnection() {
  log.info('\n--- TEST 0: Connection ---');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
    });
    
    assert(response.status !== undefined, 'Server responding');
    return true;
  } catch {
    log.error('Server not responding. Make sure Backend is running.');
    return false;
  }
}

async function testValidRegistration() {
  log.info('\n--- TEST 1: Valid Registration ---');
  try {
    const email = `test-${Date.now()}@ejemplo.com`;
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Test',
        apellido: 'User',
        email: email,
        password: 'SecurePass123!',
        telefono: '+1234567890',
      }),
    });
    
    const data = await response.json();
    assert(response.status === 201, 'Status 201');
    assert(data.data?.token, 'JWT token generated');
    assert(data.data?.user?.email === email, 'Email matches');
    assert(data.data?.user?.email_verificado === 0, 'Email not verified by default');
    
    return true;
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return false;
  }
}

async function testInvalidEmail() {
  log.info('\n--- TEST 2: Invalid Email (Should fail) ---');
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Test',
        apellido: 'User',
        email: 'not-an-email',
        password: 'SecurePass123!',
      }),
    });
    
    const data = await response.json();
    assert(response.status === 400, 'Status 400');
    assert(data.success === false, 'Success false');
  } catch (error) {
    log.error(`Error: ${error.message}`);
  }
}

async function testShortPassword() {
  log.info('\n--- TEST 3: Short Password (Should fail) ---');
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Test',
        apellido: 'User',
        email: `test-${Date.now()}@ejemplo.com`,
        password: 'short',
      }),
    });
    
    const data = await response.json();
    assert(response.status === 400, 'Status 400');
    assert(data.success === false, 'Success false');
  } catch (error) {
    log.error(`Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n' + colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Testing: User Registration' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════\n' + colors.reset);

  const connected = await testConnection();
  if (!connected) process.exit(1);

  await testValidRegistration();
  await testInvalidEmail();
  await testShortPassword();

  console.log('\n' + colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Results' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(`Total: ${testsPassed + testsFailed}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runAllTests().catch((error) => {
  log.error(`Critical error: ${error.message}`);
  process.exit(1);
});
