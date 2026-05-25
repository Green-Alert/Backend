#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.resolve(path.dirname(__filename), '..');
const repoDir = path.resolve(backendDir, '..');
const frontendApiPath = path.join(repoDir, 'Frontend', 'src', 'services', 'api.js');

const source = await fs.readFile(frontendApiPath, 'utf8');
const regex = /export const (\w+)\s*=.*?api\.(get|post|patch|delete)\((`[^`]+`|'[^']+'|"[^"]+")/gs;

console.log('Contrato consumido por Frontend/src/services/api.js\n');
let total = 0;
for (const match of source.matchAll(regex)) {
  const [, name, method, rawPath] = match;
  const endpoint = rawPath.slice(1, -1);
  console.log(`${method.toUpperCase().padEnd(6)} ${endpoint.padEnd(42)} ${name}`);
  total += 1;
}

console.log(`\nTotal endpoints exportados: ${total}`);
console.log('Nota: el frontend usa baseURL /api y Vite reescribe /api hacia el backend sin prefijo interno.');
