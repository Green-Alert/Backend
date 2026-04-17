#!/usr/bin/env node

/**
 * Run All Tests
 * USO: node tests/run-all.js [pattern]
 * 
 * Ejemplos:
 *   node tests/run-all.js         (ejecuta todos)
 *   node tests/run-all.js email   (solo tests de email)
 *   node tests/run-all.js auth    (solo tests de auth)
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const pattern = process.argv[2] || '';
const __filename = fileURLToPath(import.meta.url);
const testDir = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
};

function findTestFiles(dir, pattern = '') {
  const files = [];
  
  const walkDir = (currentPath) => {
    const entries = fs.readdirSync(currentPath);
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && entry !== 'node_modules') {
        walkDir(fullPath);
      } else if (entry.endsWith('.test.js') || entry.endsWith('.spec.js')) {
        if (!pattern || fullPath.includes(pattern)) {
          files.push(fullPath);
        }
      }
    }
  };
  
  walkDir(dir);
  return files;
}

async function runTest(testFile) {
  return new Promise((resolve) => {
    const testName = path.relative(process.cwd(), testFile);
    
    log.info(`\n▶ Running: ${testName}`);
    
    const proc = spawn('node', [testFile], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ passed: true });
      } else {
        resolve({ passed: false });
      }
    });
    
    proc.on('error', (error) => {
      log.error(`Error running test: ${error.message}`);
      resolve({ passed: false });
    });
  });
}

async function main() {
  console.log(colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Running Test Suite' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════' + colors.reset);
  
  if (pattern) {
    log.info(`Pattern: ${pattern}`);
  }
  
  const testFiles = findTestFiles(testDir, pattern);
  
  if (testFiles.length === 0) {
    log.warn('No test files found');
    process.exit(1);
  }
  
  log.info(`\nFound ${testFiles.length} test file(s)\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const testFile of testFiles) {
    const result = await runTest(testFile);
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(colors.blue + '\n═══════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  Summary' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════' + colors.reset);
  console.log(`Total: ${testFiles.length}`);
  log.success(`Passed: ${passed}`);
  log.error(`Failed: ${failed}`);
  
  if (failed === 0) {
    log.success('\nAll tests passed!\n');
    process.exit(0);
  } else {
    log.error('\nSome tests failed\n');
    process.exit(1);
  }
}

main().catch((error) => {
  log.error(`Critical error: ${error.message}`);
  process.exit(1);
});
