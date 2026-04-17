#!/usr/bin/env node

/**
 * Test: Email Verification
 * USO: node tests/email/verification.test.js
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_EMAIL_BASE = `test-${Date.now()}`;
let testsPassed = 0;
let testsFailed = 0;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}! ${msg}${colors.reset}`),
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
  log.info('\n--- TEST 0: Connection to Server ---');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
      timeout: 5000,
    });

    assert(response.status !== undefined, 'Server responding');
    return true;
  } catch (error) {
    log.error(`Server not responding: ${error.message}`);
    log.warn('Make sure Backend is running at http://localhost:3000');
    return false;
  }
}

async function testRegister() {
  log.info('\n--- TEST 1: Register User ---');
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Test',
        apellido: 'Verificacion',
        email: `${TEST_EMAIL_BASE}@ejemplo.com`,
        password: 'SecurePass123!',
        telefono: '+1234567890',
      }),
    });

    const data = await response.json();
    
    assert(response.status === 201, 'Status 201');
    assert(data.data?.token, 'JWT token generated');
    assert(data.data?.user?.email_verificado === 0, 'Email not verified');
    
    return data.data;
  } catch (error) {
    log.error(`Error registering: ${error.message}`);
    return null;
  }
}

async function testSendVerification(jwt) {
  log.info('\n--- TEST 2: Send Verification Email ---');
  try {
    const response = await fetch(`${API_URL}/auth/send-verification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
    });

    const data = await response.json();
    
    assert(response.status === 200, 'Status 200');
    assert(data.success === true, 'Success true');
    
    return true;
  } catch (error) {
    log.error(`Error sending: ${error.message}`);
    return false;
  }
}

async function testNoAuth() {
  log.info('\n--- TEST 3: No Authentication (Should fail) ---');
  try {
    const response = await fetch(`${API_URL}/auth/send-verification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    
    assert(response.status === 401, 'Status 401');
    assert(data.success === false, 'Success false');
    assert(data.error.includes('No autorizado'), 'Correct message');
    
    return true;
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return false;
  }
}

async function testNoToken() {
  log.info('\n--- TEST 4: No Token in Query (Should fail) ---');
  try {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'GET',
    });

    const data = await response.json();
    
    assert(response.status === 400, 'Status 400');
    assert(data.success === false, 'Success false');
    assert(data.error.includes('Token'), 'Message mentions token');
    
    return true;
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return false;
  }
}

async function testInvalidToken() {
  log.info('\n--- TEST 5: Invalid Token (Should fail) ---');
  try {
    const response = await fetch(`${API_URL}/auth/verify-email?token=invalid_token_xyz123`, {
      method: 'GET',
    });

    const data = await response.json();
    
    assert(response.status === 400, 'Status 400');
    assert(data.success === false, 'Success false');
    assert(data.error.includes('invalido'), 'Message mentions invalid');
    
    return true;
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Testing: Email Verification' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════\n' + colors.reset);

  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  const userData = await testRegister();
  if (!userData) {
    log.error('Could not register user. Aborting.');
    process.exit(1);
  }

  await testSendVerification(userData.token);
  await testNoAuth();
  await testNoToken();
  await testInvalidToken();

  console.log('\n' + colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Results' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(`Total: ${testsPassed + testsFailed}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
  
  if (testsFailed === 0) {
    console.log(`\n${colors.green}✓ All tests passed${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  log.error(`Critical error: ${error.message}`);
  process.exit(1);
});
