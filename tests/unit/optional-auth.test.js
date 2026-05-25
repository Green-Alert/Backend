import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { optionalAuth } from '../../middlewares/auth.middleware.js';
import { LikeModel } from '../../src/models/like.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';

process.env.API_PREFIX = '';
process.env.JWT_SECRET = 'optional-auth-test-secret';

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const listen = async () => {
  const { default: app } = await import('../../src/app.js');

  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => resolve(server));
  });
};

const close = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

const request = async (server, path, options = {}) => {
  const { port } = server.address();
  return fetch(`http://127.0.0.1:${port}${path}`, options);
};

test('optionalAuth permite continuar sin token como anonimo', () => {
  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
  assert.equal(res.statusCode, null);
});

test('optionalAuth llena req.user con token valido', () => {
  const token = jwt.sign(
    { sub: 21, email: 'user@example.com', rol: 'ciudadano' },
    process.env.JWT_SECRET
  );
  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
  const res = createResponse();
  let nextCalled = false;

  optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.sub, 21);
  assert.equal(res.statusCode, null);
});

test('optionalAuth ignora token invalido y continua como anonimo', () => {
  const req = {
    headers: {
      authorization: 'Bearer token-invalido',
    },
    user: { sub: 99 },
  };
  const res = createResponse();
  let nextCalled = false;

  optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
  assert.equal(res.statusCode, null);
});

test('GET /reportes responde anonimo y enriquece liked_by_me con token valido', async (t) => {
  const reportes = [
    { id_reporte: 10, titulo: 'Reporte 10' },
    { id_reporte: 11, titulo: 'Reporte 11' },
  ];
  t.mock.method(ReporteModel, 'findAll', async () => reportes);
  t.mock.method(ReporteModel, 'countAll', async () => 2);
  t.mock.method(LikeModel, 'likedSet', async (_ids, idUsuario) => (
    Number(idUsuario) === 21 ? new Set([10]) : new Set()
  ));

  const server = await listen();

  try {
    const anon = await request(server, '/reportes');
    const anonBody = await anon.json();

    assert.equal(anon.status, 200);
    assert.equal(anonBody.data.reportes[0].liked_by_me, undefined);

    const token = jwt.sign(
      { sub: 21, email: 'user@example.com', rol: 'ciudadano' },
      process.env.JWT_SECRET
    );
    const authenticated = await request(server, '/reportes', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const authenticatedBody = await authenticated.json();

    assert.equal(authenticated.status, 200);
    assert.equal(authenticatedBody.data.reportes[0].liked_by_me, true);
    assert.equal(authenticatedBody.data.reportes[1].liked_by_me, false);

    const invalid = await request(server, '/reportes', {
      headers: {
        authorization: 'Bearer token-invalido',
      },
    });
    const invalidBody = await invalid.json();

    assert.equal(invalid.status, 200);
    assert.equal(invalidBody.data.reportes[0].liked_by_me, undefined);
  } finally {
    await close(server);
  }
});

test('POST /chatbot/mensaje ignora token invalido y responde como anonimo', async (t) => {
  t.mock.method(ReporteModel, 'getStats', async () => ({
    total_reportes: 0,
    municipios_activos: 0,
  }));
  t.mock.method(ReporteModel, 'getAlertasPredictivas', async () => []);

  const server = await listen();

  try {
    const response = await request(server, '/chatbot/mensaje', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer token-invalido',
      },
      body: JSON.stringify({ mensaje: 'Como crear un reporte?' }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'success');
    assert.equal(body.data.intent, 'reportes');
  } finally {
    await close(server);
  }
});
