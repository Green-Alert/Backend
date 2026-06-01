import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import entidadRouter from '../../routes/entidad.routes.js';
import { AlertaEntidadModel } from '../../src/models/alerta-entidad.model.js';
import {
  crearAlertaDesdeAsignacionReporte,
  crearAlertasDesdeAsignacionesReporte,
} from '../../src/services/alerta-entidad.service.js';
import {
  contarMisAlertasNoLeidasEntidad,
  listarMisAlertasEntidad,
  listarMisAlertasNoLeidasEntidad,
  marcarMiAlertaEntidadLeida,
  marcarTodasMisAlertasEntidadLeidas,
} from '../../src/controllers/entidad.controller.js';

const JWT_SECRET = 'test-secret-alertas-entidad';
const __filename = fileURLToPath(import.meta.url);
const backendDir = path.resolve(path.dirname(__filename), '../..');

const createResponse = () => ({
  statusCode: null,
  body: null,
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const reporte = {
  id_reporte: 50,
  uuid: 'rep-50',
  titulo: 'Derrame de combustible',
  descripcion: 'Derrame cerca al rio',
  tipo_contaminacion: 'suelo',
  subcategoria: 'derrame_de_combustible',
  nivel_severidad: 'critico',
  estado: 'pendiente',
  municipio: 'Mocoa',
  departamento: 'Putumayo',
  latitud: 1.15,
  longitud: -76.65,
};

const assignment = (overrides = {}) => ({
  id_reporte_entidad: 70,
  id_reporte: 50,
  id_entidad: 1,
  tipo_asignacion: 'principal',
  prioridad: 'critica',
  entidad: { id_entidad: 1, codigo: 'bomberos', nombre: 'Bomberos' },
  ...overrides,
});

test('crea una alerta cuando se asigna un reporte critico a una entidad', async (t) => {
  let payload;
  t.mock.method(AlertaEntidadModel, 'create', async (data) => {
    payload = data;
    return 99;
  });

  const alerta = await crearAlertaDesdeAsignacionReporte({
    reporte,
    assignment: assignment(),
  });

  assert.equal(alerta.id_alerta_entidad, 99);
  assert.equal(payload.tipo_alerta, 'reporte_critico_asignado');
  assert.equal(payload.prioridad, 'critica');
  assert.equal(payload.id_entidad, 1);
});

test('crea una alerta cuando se asigna un reporte de prioridad alta', async (t) => {
  let payload;
  t.mock.method(AlertaEntidadModel, 'create', async (data) => {
    payload = data;
    return 100;
  });

  const alerta = await crearAlertaDesdeAsignacionReporte({
    reporte: { ...reporte, nivel_severidad: 'alto' },
    assignment: assignment({ prioridad: 'alta' }),
  });

  assert.equal(alerta.id_alerta_entidad, 100);
  assert.equal(payload.tipo_alerta, 'reporte_prioritario_asignado');
  assert.equal(payload.titulo, 'Reporte prioritario asignado');
});

test('no crea alertas para prioridad media o baja', async (t) => {
  t.mock.method(AlertaEntidadModel, 'create', async () => {
    assert.fail('No debe persistir alertas de prioridad media o baja.');
  });

  assert.equal(
    await crearAlertaDesdeAsignacionReporte({
      reporte,
      assignment: assignment({ prioridad: 'media' }),
    }),
    null
  );
  assert.equal(
    await crearAlertaDesdeAsignacionReporte({
      reporte,
      assignment: assignment({ prioridad: 'baja' }),
    }),
    null
  );
});

test('la tabla y el modelo evitan duplicados por asignacion y tipo de alerta', async () => {
  const [migration, model] = await Promise.all([
    fs.readFile(path.join(backendDir, 'migrations/018_create_alertas_entidad.sql'), 'utf8'),
    fs.readFile(path.join(backendDir, 'src/models/alerta-entidad.model.js'), 'utf8'),
  ]);

  assert.match(migration, /UNIQUE KEY uq_alerta_reporte_entidad_tipo \(id_reporte_entidad, tipo_alerta\)/);
  assert.match(model, /ON DUPLICATE KEY UPDATE/);
  assert.match(model, /LAST_INSERT_ID\(id_alerta_entidad\)/);
});

test('crea alerta para entidad principal y secundaria cuando ambas asignaciones aplican', async (t) => {
  const created = [];
  t.mock.method(AlertaEntidadModel, 'create', async (data) => {
    created.push(data);
    return created.length;
  });

  const alertas = await crearAlertasDesdeAsignacionesReporte({
    reporte,
    assignments: [
      assignment(),
      assignment({
        id_reporte_entidad: 71,
        id_entidad: 2,
        tipo_asignacion: 'apoyo',
        entidad: { id_entidad: 2, codigo: 'corpoamazonia', nombre: 'Corpoamazonia' },
      }),
    ],
  });

  assert.equal(alertas.length, 2);
  assert.deepEqual(created.map((item) => item.id_entidad), [1, 2]);
});

test('usuario entidad solo lista alertas de su propia entidad', async (t) => {
  t.mock.method(AlertaEntidadModel, 'findByEntidad', async (idEntidad) => {
    assert.equal(idEntidad, 1);
    return { alertas: [{ id_alerta_entidad: 1, id_entidad: 1 }], meta: { total: 1 } };
  });

  const res = createResponse();
  await listarMisAlertasEntidad(
    { user: { rol: 'entidad', id_entidad: 1 }, query: { id_entidad: '2' } },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.alertas[0].id_entidad, 1);
});

test('usuario entidad solo lista alertas no leidas de su propia entidad', async (t) => {
  t.mock.method(AlertaEntidadModel, 'findByEntidad', async (idEntidad, filtros) => {
    assert.equal(idEntidad, 2);
    assert.equal(filtros.leida, false);
    return { alertas: [{ id_alerta_entidad: 2, leida: false }], meta: { total: 1 } };
  });

  const res = createResponse();
  await listarMisAlertasNoLeidasEntidad(
    { user: { rol: 'entidad', entidad_id: 2 }, query: {} },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.alertas[0].leida, false);
});

test('usuario entidad cuenta alertas no leidas solo de su entidad', async (t) => {
  t.mock.method(AlertaEntidadModel, 'countNoLeidasByEntidad', async (idEntidad) => {
    assert.equal(idEntidad, 1);
    return 3;
  });

  const res = createResponse();
  await contarMisAlertasNoLeidasEntidad(
    { user: { rol: 'entidad', id_entidad: 1 } },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.no_leidas, 3);
});

test('usuario entidad puede marcar como leida una alerta propia', async (t) => {
  t.mock.method(AlertaEntidadModel, 'markAsReadByEntidad', async (idAlerta, idEntidad, idUsuario) => {
    assert.equal(idAlerta, 15);
    assert.equal(idEntidad, 1);
    assert.equal(idUsuario, 9);
    return true;
  });

  const res = createResponse();
  await marcarMiAlertaEntidadLeida(
    { params: { id: '15' }, user: { sub: 9, rol: 'entidad', id_entidad: 1 } },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.id_alerta_entidad, 15);
});

test('usuario entidad no puede marcar como leida una alerta de otra entidad', async (t) => {
  t.mock.method(AlertaEntidadModel, 'markAsReadByEntidad', async (idAlerta, idEntidad) => {
    assert.equal(idAlerta, 16);
    assert.equal(idEntidad, 1);
    return false;
  });

  const res = createResponse();
  await marcarMiAlertaEntidadLeida(
    { params: { id: '16' }, user: { sub: 9, rol: 'entidad', id_entidad: 1 } },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'Alerta de entidad no encontrada.');
});

test('usuario entidad puede marcar todas sus alertas como leidas', async (t) => {
  t.mock.method(AlertaEntidadModel, 'markAllAsReadByEntidad', async (idEntidad, idUsuario) => {
    assert.equal(idEntidad, 1);
    assert.equal(idUsuario, 9);
    return 4;
  });

  const res = createResponse();
  await marcarTodasMisAlertasEntidadLeidas(
    { user: { sub: 9, rol: 'entidad', id_entidad: 1 } },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.actualizadas, 4);
});

test('endpoints mis-alertas rechazan usuarios sin rol entidad', async () => {
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
    const response = await fetch(`http://127.0.0.1:${port}/entidades/mis-alertas`, {
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

test('usuario entidad sin entidad asociada recibe error controlado', async (t) => {
  t.mock.method(AlertaEntidadModel, 'findByEntidad', async () => {
    assert.fail('No debe consultar alertas sin entidad autenticada.');
  });

  const res = createResponse();
  await listarMisAlertasEntidad(
    { user: { rol: 'entidad', id_entidad: null }, query: {} },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Usuario entidad sin entidad asignada.');
});
