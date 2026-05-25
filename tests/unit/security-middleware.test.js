import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.CORS_ORIGIN = 'http://localhost:5173';

const { default: app } = await import('../../src/app.js');

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

test('Helmet agrega cabeceras de seguridad HTTP', async () => {
  const server = await listen();

  try {
    const response = await request(server, '/api/no-existe');

    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  } finally {
    await close(server);
  }
});

test('CORS permite el origen configurado en CORS_ORIGIN', async () => {
  const server = await listen();

  try {
    const response = await request(server, '/api/no-existe', {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  } finally {
    await close(server);
  }
});

test('CORS no expone cabeceras para origen no permitido', async () => {
  const server = await listen();

  try {
    const response = await request(server, '/api/no-existe', {
      headers: {
        Origin: 'https://malicious.example',
      },
    });

    assert.equal(response.headers.get('access-control-allow-origin'), null);
  } finally {
    await close(server);
  }
});
