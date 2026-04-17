#!/usr/bin/env node

/**
 * Test: Password Reset
 * USO: node tests/auth/password-reset.test.js
 * 
 * TODO: Implementar tests para reset de contraseña
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

async function runAllTests() {
  console.log('\n' + colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Testing: Password Reset' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════\n' + colors.reset);

  const connected = await testConnection();
  if (!connected) process.exit(1);

  // TODO: Add more tests here
  log.info('\nTests not implemented yet');

  console.log('\n' + colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Results' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  process.exit(0);
}

runAllTests().catch((error) => {
  log.error(`Critical error: ${error.message}`);
  process.exit(1);
});
