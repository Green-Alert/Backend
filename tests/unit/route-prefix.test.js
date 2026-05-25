import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.API_PREFIX = '';

const { default: pool } = await import('../../src/config/database.js');
pool.query = async () => [[{ ok: 1 }], []];
pool.execute = async (sql) => {
  if (String(sql).includes('FROM reportes')) {
    return [[{
      total_reportes: 0,
      reportes_este_mes: 0,
      en_revision: 0,
      resueltos: 0,
      municipios_activos: 0,
      con_seguimiento: 0,
    }], []];
  }

  if (String(sql).includes('FROM usuarios')) {
    return [[{ total_usuarios: 0 }], []];
  }

  return [[], []];
};

const { default: app } = await import('../../src/app.js');
const { normalizeApiPrefix } = await import('../../src/config/api-prefix.config.js');

const listen = () => new Promise((resolve) => {
  const server = http.createServer(app);
  server.listen(0, () => resolve(server));
});

const close = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

const request = async (server, path, options = {}) => {
  const { port } = server.address();
  return fetch(`http://127.0.0.1:${port}${path}`, options);
};

test('API_PREFIX por defecto monta rutas sin prefijo para el proxy de Vite', async () => {
  const server = await listen();

  try {
    const health = await request(server, '/health');
    const stats = await request(server, '/reportes/stats');
    const login = await request(server, '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const prefixedHealth = await request(server, '/api/health');

    assert.equal(health.status, 200);
    assert.equal(stats.status, 200);
    assert.equal(login.status, 400);
    assert.equal(prefixedHealth.status, 404);
  } finally {
    await close(server);
  }
});

test('normaliza API_PREFIX vacio, raiz o con barras sin forzar /api', () => {
  assert.equal(normalizeApiPrefix(undefined), '');
  assert.equal(normalizeApiPrefix(''), '');
  assert.equal(normalizeApiPrefix('/'), '');
  assert.equal(normalizeApiPrefix('api'), '/api');
  assert.equal(normalizeApiPrefix('/api/'), '/api');
});
