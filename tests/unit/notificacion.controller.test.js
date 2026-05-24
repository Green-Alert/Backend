import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import notificacionRouter from '../../routes/notificacion.routes.js';
import {
  contadorNotificaciones,
  eliminarNotificacion,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  registrarFcmToken,
} from '../../src/controllers/notificacion.controller.js';
import { FcmTokenModel } from '../../src/models/fcm-token.model.js';
import { updateReporte } from '../../src/controllers/reporte.controller.js';
import { NotificacionModel } from '../../src/models/notificacion.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';
import { UsuarioModel } from '../../src/models/usuario.model.js';

const createResponse = () => ({
  statusCode: null,
  body: null,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  setHeader(key, value) {
    this.headers[key] = value;
  },
});

const createMemoryStore = () => {
  let nextId = 1;
  const rows = [];

  const create = async (data) => {
    const row = {
      id_notificacion: nextId,
      uuid: `notif-${nextId}`,
      leida: false,
      leida_at: null,
      created_at: new Date(nextId * 1000),
      referencia_tipo: null,
      referencia_uuid: null,
      link: null,
      ...data,
    };
    nextId += 1;
    rows.push(row);
    return { id_notificacion: row.id_notificacion, uuid: row.uuid };
  };

  return {
    rows,
    create,
    findByUsuario: async (id_usuario, { leida, limit = 20, offset = 0 } = {}) => {
      let items = rows.filter((row) => Number(row.id_usuario) === Number(id_usuario));
      if (leida === true || leida === false) {
        items = items.filter((row) => row.leida === leida);
      }
      items = items.sort((a, b) => b.id_notificacion - a.id_notificacion);

      const ownRows = rows.filter((row) => Number(row.id_usuario) === Number(id_usuario));
      return {
        items: items.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 20)),
        meta: {
          total: ownRows.length,
          no_leidas: ownRows.filter((row) => !row.leida).length,
          limit: Number(limit) || 20,
          offset: Number(offset) || 0,
        },
      };
    },
    contarNoLeidas: async (id_usuario) => (
      rows.filter((row) => Number(row.id_usuario) === Number(id_usuario) && !row.leida).length
    ),
    marcarLeida: async (uuid, id_usuario) => {
      const row = rows.find((item) => item.uuid === uuid && Number(item.id_usuario) === Number(id_usuario));
      if (!row) return false;
      row.leida = true;
      row.leida_at = new Date();
      return true;
    },
    marcarTodasLeidas: async (id_usuario) => {
      let count = 0;
      for (const row of rows) {
        if (Number(row.id_usuario) === Number(id_usuario) && !row.leida) {
          row.leida = true;
          row.leida_at = new Date();
          count += 1;
        }
      }
      return count;
    },
    eliminar: async (uuid, id_usuario) => {
      const index = rows.findIndex((row) => row.uuid === uuid && Number(row.id_usuario) === Number(id_usuario));
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
  };
};

const mockNotificationModel = (t, store) => {
  t.mock.method(NotificacionModel, 'create', store.create);
  t.mock.method(NotificacionModel, 'findByUsuario', store.findByUsuario);
  t.mock.method(NotificacionModel, 'contarNoLeidas', store.contarNoLeidas);
  t.mock.method(NotificacionModel, 'marcarLeida', store.marcarLeida);
  t.mock.method(NotificacionModel, 'marcarTodasLeidas', store.marcarTodasLeidas);
  t.mock.method(NotificacionModel, 'eliminar', store.eliminar);
};

test('contador devuelve no leidas y aisla por usuario', async (t) => {
  const store = createMemoryStore();
  mockNotificationModel(t, store);
  await store.create({ id_usuario: 1, tipo: 'sistema', titulo: 'A', mensaje: 'Uno' });
  await store.create({ id_usuario: 1, tipo: 'sistema', titulo: 'B', mensaje: 'Dos' });
  await store.create({ id_usuario: 2, tipo: 'sistema', titulo: 'C', mensaje: 'Tres' });

  const res = createResponse();
  await contadorNotificaciones({ user: { sub: 1 } }, res, t.mock.fn());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.no_leidas, 2);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('listado devuelve solo notificaciones del usuario autenticado', async (t) => {
  const store = createMemoryStore();
  mockNotificationModel(t, store);
  await store.create({ id_usuario: 1, tipo: 'sistema', titulo: 'A', mensaje: 'Uno' });
  await store.create({ id_usuario: 2, tipo: 'sistema', titulo: 'B', mensaje: 'Dos' });

  const res = createResponse();
  await listarNotificaciones({ user: { sub: 1 }, query: {} }, res, t.mock.fn());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.items.length, 1);
  assert.equal(res.body.data.items[0].id_usuario, 1);
  assert.equal(res.body.data.meta.total, 1);
});

test('marcar leida solo modifica notificaciones propias', async (t) => {
  const store = createMemoryStore();
  mockNotificationModel(t, store);
  const own = await store.create({ id_usuario: 1, tipo: 'sistema', titulo: 'A', mensaje: 'Uno' });
  const other = await store.create({ id_usuario: 2, tipo: 'sistema', titulo: 'B', mensaje: 'Dos' });

  const ownRes = createResponse();
  await marcarLeida(
    { user: { sub: 1 }, params: { uuid: own.uuid } },
    ownRes,
    t.mock.fn()
  );
  assert.equal(ownRes.statusCode, 200);
  assert.equal(store.rows.find((row) => row.uuid === own.uuid).leida, true);

  const otherRes = createResponse();
  await marcarLeida(
    { user: { sub: 1 }, params: { uuid: other.uuid } },
    otherRes,
    t.mock.fn()
  );
  assert.equal(otherRes.statusCode, 404);
  assert.equal(store.rows.find((row) => row.uuid === other.uuid).leida, false);
});

test('marcar todas solo afecta al usuario actual', async (t) => {
  const store = createMemoryStore();
  mockNotificationModel(t, store);
  await store.create({ id_usuario: 1, tipo: 'sistema', titulo: 'A', mensaje: 'Uno' });
  await store.create({ id_usuario: 1, tipo: 'sistema', titulo: 'B', mensaje: 'Dos' });
  await store.create({ id_usuario: 2, tipo: 'sistema', titulo: 'C', mensaje: 'Tres' });

  const res = createResponse();
  await marcarTodasLeidas({ user: { sub: 1 } }, res, t.mock.fn());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.actualizadas, 2);
  assert.equal(store.rows.filter((row) => row.id_usuario === 1 && !row.leida).length, 0);
  assert.equal(store.rows.filter((row) => row.id_usuario === 2 && !row.leida).length, 1);
});

test('eliminar solo borra notificaciones propias', async (t) => {
  const store = createMemoryStore();
  mockNotificationModel(t, store);
  const own = await store.create({ id_usuario: 1, tipo: 'sistema', titulo: 'A', mensaje: 'Uno' });
  const other = await store.create({ id_usuario: 2, tipo: 'sistema', titulo: 'B', mensaje: 'Dos' });

  const forbidden = createResponse();
  await eliminarNotificacion(
    { user: { sub: 1 }, params: { uuid: other.uuid } },
    forbidden,
    t.mock.fn()
  );
  assert.equal(forbidden.statusCode, 404);

  const ok = createResponse();
  await eliminarNotificacion(
    { user: { sub: 1 }, params: { uuid: own.uuid } },
    ok,
    t.mock.fn()
  );
  assert.equal(ok.statusCode, 200);
  assert.equal(store.rows.some((row) => row.uuid === own.uuid), false);
  assert.equal(store.rows.some((row) => row.uuid === other.uuid), true);
});

test('sin JWT todas las rutas de notificaciones responden 401', async () => {
  const app = express();
  app.use(express.json());
  app.use('/notificaciones', notificacionRouter);
  const server = await new Promise((resolve) => {
    const instance = http.createServer(app);
    instance.listen(0, () => resolve(instance));
  });

  try {
    const { port } = server.address();
    const cases = [
      ['GET', '/notificaciones'],
      ['GET', '/notificaciones/contador'],
      ['POST', '/notificaciones/fcm-token'],
      ['PATCH', '/notificaciones/marcar-todas'],
      ['PATCH', '/notificaciones/notif-1/leida'],
      ['DELETE', '/notificaciones/notif-1'],
    ];

    for (const [method, path] of cases) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('registrarFcmToken guarda token asociado al usuario autenticado', async (t) => {
  t.mock.method(FcmTokenModel, 'registrar', async (payload) => ({
    id_fcm_token: 12,
    token_hash: 'hash-token',
    registrado: true,
    payload,
  }));

  const res = createResponse();
  const next = t.mock.fn();

  await registrarFcmToken(
    {
      user: { sub: 7 },
      body: { token: 'fcm-token-valido-1234567890' },
      headers: { 'user-agent': 'node-test' },
    },
    res,
    next
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, 'Token FCM registrado.');
  assert.equal(FcmTokenModel.registrar.mock.callCount(), 1);
  assert.deepEqual(FcmTokenModel.registrar.mock.calls[0].arguments[0], {
    id_usuario: 7,
    token: 'fcm-token-valido-1234567890',
    user_agent: 'node-test',
  });
  assert.equal(next.mock.callCount(), 0);
});

test('registrarFcmToken rechaza token ausente o invalido antes de guardar', async (t) => {
  t.mock.method(FcmTokenModel, 'registrar', async () => {
    throw new Error('No debe guardar tokens invalidos');
  });

  const cases = [
    [{}, 'Token FCM requerido.'],
    [{ token: 'corto' }, 'Token FCM invalido.'],
    [{ token: 'token con espacios no valido 123456' }, 'Token FCM invalido.'],
  ];

  for (const [body, message] of cases) {
    const res = createResponse();
    await registrarFcmToken(
      { user: { sub: 7 }, body, headers: {} },
      res,
      t.mock.fn()
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, message);
  }

  assert.equal(FcmTokenModel.registrar.mock.callCount(), 0);
});

test('updateReporte genera notificacion al dueno cuando cambia estado o comentario', async (t) => {
  const reportes = [
    {
      id_reporte: 10,
      uuid: 'reporte-uuid',
      id_usuario: 7,
      estado: 'en_revision',
      titulo: 'Rio contaminado',
      comentario_moderacion: null,
    },
    {
      id_reporte: 10,
      uuid: 'reporte-uuid',
      id_usuario: 7,
      estado: 'verificado',
      titulo: 'Rio contaminado',
      comentario_moderacion: 'Se valido evidencia.',
    },
  ];

  t.mock.method(ReporteModel, 'findById', async () => reportes.shift());
  t.mock.method(ReporteModel, 'update', async () => true);
  t.mock.method(UsuarioModel, 'findByIdWithDetails', async () => ({
    id_usuario: 7,
    notification_preferences: { report_updates: true },
  }));
  t.mock.method(NotificacionModel, 'create', async () => ({ id_notificacion: 1, uuid: 'notif-1' }));

  const res = createResponse();
  await updateReporte(
    {
      params: { id: '10' },
      user: { sub: 99, rol: 'moderador' },
      body: {
        estado: 'verificado',
        comentario_moderacion: 'Se valido evidencia.',
      },
    },
    res,
    t.mock.fn()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(NotificacionModel.create.mock.callCount(), 2);
  assert.equal(NotificacionModel.create.mock.calls[0].arguments[0].id_usuario, 7);
  assert.equal(NotificacionModel.create.mock.calls[0].arguments[0].tipo, 'reporte_estado');
  assert.equal(NotificacionModel.create.mock.calls[1].arguments[0].tipo, 'reporte_comentario');
});

test('updateReporte respeta preferencia report_updates al crear notificaciones', async (t) => {
  const reportes = [
    {
      id_reporte: 12,
      uuid: 'reporte-uuid-3',
      id_usuario: 7,
      estado: 'en_revision',
      titulo: 'Humo constante',
      comentario_moderacion: null,
    },
    {
      id_reporte: 12,
      uuid: 'reporte-uuid-3',
      id_usuario: 7,
      estado: 'verificado',
      titulo: 'Humo constante',
      comentario_moderacion: null,
    },
  ];

  t.mock.method(ReporteModel, 'findById', async () => reportes.shift());
  t.mock.method(ReporteModel, 'update', async () => true);
  t.mock.method(UsuarioModel, 'findByIdWithDetails', async () => ({
    id_usuario: 7,
    notification_preferences: { report_updates: false },
  }));
  t.mock.method(NotificacionModel, 'create', async () => {
    throw new Error('No debe crear notificacion con report_updates desactivado');
  });

  const res = createResponse();
  const next = t.mock.fn();

  await updateReporte(
    {
      params: { id: '12' },
      user: { sub: 99, rol: 'moderador' },
      body: { estado: 'verificado' },
    },
    res,
    next
  );

  assert.equal(res.statusCode, 200);
  assert.equal(UsuarioModel.findByIdWithDetails.mock.callCount(), 1);
  assert.equal(NotificacionModel.create.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('fallo al crear notificacion no rompe updateReporte', async (t) => {
  const reportes = [
    {
      id_reporte: 11,
      uuid: 'reporte-uuid-2',
      id_usuario: 7,
      estado: 'pendiente',
      titulo: 'Basura acumulada',
      comentario_moderacion: null,
    },
    {
      id_reporte: 11,
      uuid: 'reporte-uuid-2',
      id_usuario: 7,
      estado: 'en_revision',
      titulo: 'Basura acumulada',
      comentario_moderacion: null,
    },
  ];

  t.mock.method(ReporteModel, 'findById', async () => reportes.shift());
  t.mock.method(ReporteModel, 'update', async () => true);
  t.mock.method(UsuarioModel, 'findByIdWithDetails', async () => ({
    id_usuario: 7,
    notification_preferences: { report_updates: true },
  }));
  t.mock.method(NotificacionModel, 'create', async () => {
    throw new Error('tabla no disponible');
  });
  t.mock.method(console, 'error', () => {});

  const res = createResponse();
  const next = t.mock.fn();

  await updateReporte(
    {
      params: { id: '11' },
      user: { sub: 99, rol: 'admin' },
      body: { estado: 'en_revision' },
    },
    res,
    next
  );

  assert.equal(res.statusCode, 200);
  assert.equal(next.mock.callCount(), 0);
});
