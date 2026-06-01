import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.resolve(path.dirname(__filename), '../..');
const repoDir = path.resolve(backendDir, '..');
const frontendApiCandidates = [
  path.join(backendDir, 'Frontend', 'src', 'services', 'api.js'),
  path.join(backendDir, 'Front', 'src', 'services', 'api.js'),
  path.join(repoDir, 'Frontend', 'src', 'services', 'api.js'),
  path.join(repoDir, 'Front', 'src', 'services', 'api.js'),
];

const resolveFrontendApiPath = async () => {
  for (const candidate of frontendApiCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // intenta con la siguiente ruta
    }
  }

  throw new Error('No se encontro Frontend/src/services/api.js en rutas conocidas.');
};

const expectedFrontendContracts = [
  { method: 'get', path: '/health' },
  { method: 'post', path: '/auth/login' },
  { method: 'post', path: '/auth/register' },
  { method: 'post', path: '/auth/google' },
  { method: 'post', path: '/auth/facebook' },
  { method: 'get', path: '/categorias' },
  { method: 'get', path: '/categorias/${codigo}' },
  { method: 'get', path: '/reportes/stats' },
  { method: 'get', path: '/reportes/stats/categoria' },
  { method: 'get', path: '/reportes/stats/timeline' },
  { method: 'get', path: '/reportes/stats/heatmap' },
  { method: 'get', path: '/reportes/stats/ia' },
  { method: 'post', path: '/reportes' },
  { method: 'get', path: '/reportes' },
  { method: 'get', path: '/reportes/${id}' },
  { method: 'post', path: '/reportes/analizar-imagen' },
  { method: 'patch', path: '/reportes/${id}' },
  { method: 'delete', path: '/reportes/${id}' },
  { method: 'get', path: '/reportes/export' },
  { method: 'post', path: '/reportes/${id}/like' },
  { method: 'get', path: '/reportes/trending' },
  { method: 'get', path: '/reportes/zonas-riesgo' },
  { method: 'get', path: '/reportes/alertas-predictivas' },
  { method: 'get', path: '/auth/perfil' },
  { method: 'patch', path: '/auth/perfil' },
  { method: 'patch', path: '/auth/avatar' },
  { method: 'patch', path: '/auth/cambiar-contrasena' },
  { method: 'patch', path: '/auth/notificaciones' },
  { method: 'get', path: '/reportes/mis-reportes' },
  { method: 'post', path: '/auth/forgot-password' },
  { method: 'post', path: '/auth/reset-password' },
  { method: 'post', path: '/auth/enviar-verificacion' },
  { method: 'post', path: '/auth/verificar-email' },
  { method: 'get', path: '/admin/usuarios/stats' },
  { method: 'get', path: '/admin/usuarios' },
  { method: 'get', path: '/admin/usuarios/${id}' },
  { method: 'patch', path: '/admin/usuarios/${id}/rol' },
  { method: 'patch', path: '/admin/usuarios/${id}/estado' },
  { method: 'delete', path: '/admin/usuarios/${id}' },
  { method: 'post', path: '/chatbot/mensaje' },
  { method: 'get', path: '/chatbot/faqs' },
  { method: 'get', path: '/notificaciones' },
  { method: 'get', path: '/notificaciones/contador' },
  { method: 'post', path: '/notificaciones/fcm-token' },
  { method: 'patch', path: '/notificaciones/${uuid}/leida' },
  { method: 'patch', path: '/notificaciones/marcar-todas' },
  { method: 'delete', path: '/notificaciones/${uuid}' },
];

const normalizeTemplate = (value) => value
  .replace(/\$\{uuid\}/g, '__UUID__')
  .replace(/\$\{codigo\}/g, '__CODIGO__')
  .replace(/\$\{[^}]+\}/g, '${id}')
  .replace(/__UUID__/g, '${uuid}')
  .replace(/__CODIGO__/g, '${codigo}');

const extractContracts = (source) => {
  const contracts = [];
  const regex = /api\.(get|post|patch|delete)\((`[^`]+`|'[^']+'|"[^"]+")/g;
  let match;

  while ((match = regex.exec(source)) !== null) {
    contracts.push({
      method: match[1],
      path: normalizeTemplate(match[2].slice(1, -1)),
    });
  }

  return contracts;
};

test('frontend usa baseURL /api para que Vite haga proxy al backend sin prefijo interno', async () => {
  const frontendApiPath = await resolveFrontendApiPath();
  const source = await fs.readFile(frontendApiPath, 'utf8');

  assert.match(source, /baseURL:\s*'\/api'/);
});

test('endpoints consumidos por Frontend/src/services/api.js estan registrados en el contrato esperado', async () => {
  const frontendApiPath = await resolveFrontendApiPath();
  const source = await fs.readFile(frontendApiPath, 'utf8');
  const actual = extractContracts(source);
  const expectedKeys = new Set(expectedFrontendContracts.map((item) => `${item.method} ${item.path}`));
  const actualKeys = actual.map((item) => `${item.method} ${item.path}`);
  const missingFromExpected = actualKeys.filter((key) => !expectedKeys.has(key));
  const notUsedByFrontend = [...expectedKeys].filter((key) => !actualKeys.includes(key));

  assert.deepEqual(missingFromExpected, []);
  assert.deepEqual(notUsedByFrontend, []);
});

test('contrato de frontend cubre modulos principales verificados por la suite', () => {
  const prefixes = new Set(expectedFrontendContracts.map(({ path: routePath }) => routePath.split('/')[1]));

  assert.deepEqual([...prefixes].sort(), [
    'admin',
    'auth',
    'categorias',
    'chatbot',
    'health',
    'notificaciones',
    'reportes',
  ]);
});
