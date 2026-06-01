import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import entidadRouter from '../../routes/entidad.routes.js';
import { EntidadModel } from '../../src/models/entidad.model.js';
import { ReporteEntidadModel } from '../../src/models/reporte-entidad.model.js';

const JWT_SECRET = 'test-secret-entidad-reportes';

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

const createReportes = (codigoEntidad) => ([
  {
    id_reporte: codigoEntidad === 'bomberos' ? 101 : 201,
    uuid: `${codigoEntidad}-reporte-1`,
    titulo: `Reporte ${codigoEntidad}`,
    categoria: 'suelo',
    tipo_contaminacion: 'suelo',
    subcategoria: 'Derrame de combustible',
    severidad: 'critico',
    nivel_severidad: 'critico',
    estado: 'pendiente',
    latitud: 1.12,
    longitud: -76.64,
    created_at: '2026-06-01T10:00:00.000Z',
    asignacion: {
      tipo_asignacion: 'principal',
      prioridad: 'critica',
      asignado_at: '2026-06-01T10:05:00.000Z',
    },
    entidad: {
      id_entidad: codigoEntidad === 'bomberos' ? 1 : 2,
      codigo: codigoEntidad,
      nombre: codigoEntidad === 'bomberos' ? 'Bomberos' : 'Corpoamazonia',
    },
  },
]);

test('listarMisReportesEntidad usa la entidad autenticada para Bomberos', async (t) => {
  t.mock.method(ReporteEntidadModel, 'findByEntidad', async (idEntidad) => {
    assert.equal(idEntidad, 1);
    return {
      reportes: createReportes('bomberos'),
      total: 1,
      limit: 20,
      offset: 0,
    };
  });

  const res = createResponse();
  const next = t.mock.fn();

  const { listarMisReportesEntidad } = await import('../../src/controllers/entidad.controller.js');
  await listarMisReportesEntidad(
    { user: { rol: 'entidad', id_entidad: 1 }, query: { id_entidad: '2' } },
    res,
    next
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.reportes.length, 1);
  assert.equal(res.body.data.reportes[0].entidad.codigo, 'bomberos');
  assert.equal(next.mock.callCount(), 0);
});

test('listarMisReportesEntidad usa entidad_id como alias autenticado para Corpoamazonia', async (t) => {
  t.mock.method(ReporteEntidadModel, 'findByEntidad', async (idEntidad) => {
    assert.equal(idEntidad, 2);
    return {
      reportes: createReportes('corpoamazonia'),
      total: 1,
      limit: 20,
      offset: 0,
    };
  });

  const res = createResponse();
  const next = t.mock.fn();

  const { listarMisReportesEntidad } = await import('../../src/controllers/entidad.controller.js');
  await listarMisReportesEntidad(
    { user: { rol: 'entidad', entidad_id: 2 }, query: { id_entidad: '1' } },
    res,
    next
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.reportes[0].entidad.codigo, 'corpoamazonia');
  assert.equal(next.mock.callCount(), 0);
});

test('listarMisReportesEntidad responde error controlado si usuario entidad no tiene entidad asociada', async (t) => {
  t.mock.method(ReporteEntidadModel, 'findByEntidad', async () => {
    assert.fail('No debe consultar reportes sin entidad autenticada.');
  });

  const res = createResponse();
  const next = t.mock.fn();

  const { listarMisReportesEntidad } = await import('../../src/controllers/entidad.controller.js');
  await listarMisReportesEntidad(
    { user: { rol: 'entidad', id_entidad: null }, query: {} },
    res,
    next
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Usuario entidad sin entidad asignada.');
  assert.equal(next.mock.callCount(), 0);
});

test('usuario entidad no puede consultar otra entidad por parametro administrativo', async (t) => {
  t.mock.method(EntidadModel, 'findActiveAllowedByIdOrCodigo', async () => {
    assert.fail('Debe rechazar antes de consultar entidad o reportes.');
  });
  t.mock.method(ReporteEntidadModel, 'findByEntidad', async () => {
    assert.fail('No debe consultar reportes de otra entidad.');
  });

  const res = createResponse();
  const next = t.mock.fn();

  const { listarReportesPorEntidad } = await import('../../src/controllers/entidad.controller.js');
  await listarReportesPorEntidad(
    { params: { id: '2' }, user: { rol: 'entidad', id_entidad: 1 }, query: {} },
    res,
    next
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'No tienes permiso para consultar esta entidad.');
  assert.equal(next.mock.callCount(), 0);
});

test('admin y moderador conservan consulta administrativa por entidad', async (t) => {
  const calls = [];
  t.mock.method(EntidadModel, 'findActiveAllowedByIdOrCodigo', async ({ id_entidad }) => ({
    id_entidad,
    codigo: id_entidad === 1 ? 'bomberos' : 'corpoamazonia',
    nombre: id_entidad === 1 ? 'Bomberos' : 'Corpoamazonia',
    activo: 1,
  }));
  t.mock.method(ReporteEntidadModel, 'findByEntidad', async (idEntidad) => {
    calls.push(idEntidad);
    return {
      reportes: createReportes(idEntidad === 1 ? 'bomberos' : 'corpoamazonia'),
      total: 1,
      limit: 20,
      offset: 0,
    };
  });

  const { listarReportesPorEntidad } = await import('../../src/controllers/entidad.controller.js');

  for (const [rol, id] of [['admin', '1'], ['moderador', '2']]) {
    const res = createResponse();
    await listarReportesPorEntidad(
      { params: { id }, user: { rol, id_entidad: null }, query: {} },
      res,
      assert.fail
    );

    assert.equal(res.statusCode, 200);
  }

  assert.deepEqual(calls, [1, 2]);
});

test('GET /entidades/mis-reportes exige rol entidad por middleware', async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const app = express();
  app.use(express.json());
  app.use('/entidades', entidadRouter);

  const server = await new Promise((resolve) => {
    const instance = http.createServer(app);
    instance.listen(0, () => resolve(instance));
  });

  try {
    const token = jwt.sign(
      { sub: 9, rol: 'admin', id_entidad: null, email: 'admin@test.local' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/entidades/mis-reportes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.message, 'acceso denegado. rol no autorizado.');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
