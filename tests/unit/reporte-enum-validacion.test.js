import test from 'node:test';
import assert from 'node:assert/strict';
import { updateReporte } from '../../src/controllers/reporte.controller.js';
import { NotificacionModel } from '../../src/models/notificacion.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';
import { UsuarioModel } from '../../src/models/usuario.model.js';

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

const createModeratorRequest = (body) => ({
  params: { id: '15' },
  user: { sub: 9, rol: 'moderador' },
  body,
});

test('updateReporte acepta estado y nivel_severidad validos normalizados', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 15,
    id_usuario: 7,
    estado: 'pendiente',
  }));
  t.mock.method(ReporteModel, 'update', async () => true);
  t.mock.method(UsuarioModel, 'findByIdWithDetails', async () => ({
    id_usuario: 7,
    notification_preferences: { report_updates: true },
  }));
  t.mock.method(NotificacionModel, 'create', async () => ({ id_notificacion: 1, uuid: 'notif-1' }));

  const req = createModeratorRequest({
    estado: ' En Proceso ',
    nivel_severidad: ' Critico ',
  });
  const res = createResponse();
  const next = t.mock.fn();

  await updateReporte(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(ReporteModel.update.mock.callCount(), 1);
  assert.deepEqual(ReporteModel.update.mock.calls[0].arguments[1], {
    estado: 'en_proceso',
    nivel_severidad: 'critico',
  });
  assert.equal(next.mock.callCount(), 0);
});

test('updateReporte rechaza estado invalido antes de actualizar', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 15,
    id_usuario: 7,
    estado: 'pendiente',
  }));
  t.mock.method(ReporteModel, 'update', async () => {
    throw new Error('No debe actualizar reportes con estado invalido');
  });

  const req = createModeratorRequest({ estado: 'cerrado' });
  const res = createResponse();
  const next = t.mock.fn();

  await updateReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'El estado debe ser uno de: pendiente, en proceso, resuelto, rechazado.');
  assert.equal(ReporteModel.update.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('updateReporte rechaza transicion de estado no permitida antes de actualizar', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 15,
    id_usuario: 7,
    estado: 'pendiente',
  }));
  t.mock.method(ReporteModel, 'update', async () => {
    throw new Error('No debe actualizar reportes con transicion invalida');
  });

  const req = createModeratorRequest({ estado: 'resuelto', comentario_moderacion: 'Atendido' });
  const res = createResponse();
  const next = t.mock.fn();

  await updateReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Transicion de estado no permitida: pendiente -> resuelto.');
  assert.equal(ReporteModel.update.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('updateReporte permite transicion valida entre estados de moderacion', async (t) => {
  const reportes = [
    {
      id_reporte: 15,
      id_usuario: 7,
      estado: 'en_proceso',
    },
    {
      id_reporte: 15,
      id_usuario: 7,
      estado: 'resuelto',
    },
  ];
  t.mock.method(ReporteModel, 'findById', async () => reportes.shift());
  t.mock.method(ReporteModel, 'update', async () => true);
  t.mock.method(UsuarioModel, 'findByIdWithDetails', async () => ({
    id_usuario: 7,
    notification_preferences: { report_updates: true },
  }));
  t.mock.method(NotificacionModel, 'create', async () => ({ id_notificacion: 1, uuid: 'notif-1' }));

  const req = createModeratorRequest({
    estado: 'resuelto',
    comentario_moderacion: 'Caso atendido por la entidad.',
  });
  const res = createResponse();
  const next = t.mock.fn();

  await updateReporte(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(ReporteModel.update.mock.callCount(), 1);
  assert.deepEqual(ReporteModel.update.mock.calls[0].arguments[1], {
    estado: 'resuelto',
    comentario_moderacion: 'Caso atendido por la entidad.',
  });
  assert.equal(next.mock.callCount(), 0);
});

test('updateReporte exige comentario cuando se resuelve o rechaza', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 15,
    id_usuario: 7,
    estado: 'en_proceso',
  }));
  t.mock.method(ReporteModel, 'update', async () => {
    throw new Error('No debe actualizar reportes resueltos sin comentario');
  });

  const req = createModeratorRequest({ estado: 'resuelto' });
  const res = createResponse();
  const next = t.mock.fn();

  await updateReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'El comentario es obligatorio al resolver o rechazar un reporte.');
  assert.equal(ReporteModel.update.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('updateReporte rechaza nivel_severidad invalido antes de actualizar', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 15,
    id_usuario: 7,
    estado: 'pendiente',
  }));
  t.mock.method(ReporteModel, 'update', async () => {
    throw new Error('No debe actualizar reportes con severidad invalida');
  });

  const req = createModeratorRequest({ nivel_severidad: 'extremo' });
  const res = createResponse();
  const next = t.mock.fn();

  await updateReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'El nivel de severidad debe ser uno de: bajo, medio, alto, critico.');
  assert.equal(ReporteModel.update.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});
