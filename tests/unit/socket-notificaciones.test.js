import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { EntidadModel } from '../../src/models/entidad.model.js';
import { AlertaEntidadModel } from '../../src/models/alerta-entidad.model.js';
import { ReporteEntidadModel } from '../../src/models/reporte-entidad.model.js';
import { UsuarioModel } from '../../src/models/usuario.model.js';
import {
  authenticateSocket,
  getEntidadRoom,
  handleSocketConnection,
  notificarReporteCriticoAEntidad,
  notificarReporteCriticoAsignado,
  setSocketServerForTests,
  SOCKET_EVENTS,
} from '../../src/config/socket.js';
import { asignarEntidadesAReporte } from '../../src/services/asignacion-entidades.service.js';

const JWT_SECRET = 'socket-test-secret';

const signToken = (payload) => jwt.sign(payload, JWT_SECRET);

const runSocketAuth = async (socket) => new Promise((resolve) => {
  authenticateSocket(socket, (error) => resolve(error));
});

const createMockIo = () => {
  const emissions = [];

  return {
    emissions,
    io: {
      to(room) {
        return {
          emit(event, payload) {
            emissions.push({ room, event, payload });
          },
        };
      },
    },
  };
};

afterEach(() => {
  setSocketServerForTests(null);
  process.env.JWT_SECRET = JWT_SECRET;
});

test('socket rechaza conexion sin token', async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const error = await runSocketAuth({ handshake: { auth: {}, headers: {} } });

  assert.equal(error.message, 'token requerido');
});

test('socket rechaza token invalido', async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const error = await runSocketAuth({
    handshake: { auth: { token: 'token-invalido' }, headers: {} },
  });

  assert.equal(error.message, 'token invalido');
});

test('usuario entidad se une automaticamente a la sala de su entidad', async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const joinedRooms = [];
  const token = signToken({ sub: 7, rol: 'entidad', id_entidad: 1 });
  const socket = {
    handshake: { auth: { token }, headers: {} },
    join: (room) => joinedRooms.push(room),
  };

  const error = await runSocketAuth(socket);
  handleSocketConnection(socket);

  assert.equal(error, undefined);
  assert.deepEqual(joinedRooms, [getEntidadRoom(1)]);
});

test('usuario entidad no puede elegir manualmente otra sala desde el cliente', async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const joinedRooms = [];
  const token = signToken({ sub: 7, rol: 'entidad', id_entidad: 1 });
  const socket = {
    handshake: { auth: { token, id_entidad: 2, room: getEntidadRoom(2) }, headers: {} },
    join: (room) => joinedRooms.push(room),
  };

  const error = await runSocketAuth(socket);
  handleSocketConnection(socket);

  assert.equal(error, undefined);
  assert.deepEqual(joinedRooms, [getEntidadRoom(1)]);
});

test('socket rechaza usuario entidad sin entidad asociada', async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const token = signToken({ sub: 7, rol: 'entidad', id_entidad: null });

  const error = await runSocketAuth({
    handshake: { auth: { token }, headers: {} },
  });

  assert.equal(error.message, 'usuario entidad sin entidad asociada');
});

test('emision critica a Bomberos notifica solo la sala de Bomberos', () => {
  const { io, emissions } = createMockIo();
  setSocketServerForTests(io);

  const sent = notificarReporteCriticoAEntidad(1, {
    reporte: { id_reporte: 10, titulo: 'Incendio activo' },
  });

  assert.equal(sent, true);
  assert.deepEqual(emissions.map((item) => item.room), [getEntidadRoom(1)]);
  assert.equal(emissions[0].event, SOCKET_EVENTS.REPORTE_CRITICO_ASIGNADO);
});

test('reporte critico con entidad principal y de apoyo notifica ambas salas', () => {
  const { io, emissions } = createMockIo();
  setSocketServerForTests(io);

  const total = notificarReporteCriticoAsignado({
    reporte: {
      id_reporte: 11,
      uuid: 'rep-11',
      titulo: 'Derrame de combustible',
      descripcion: 'Derrame cerca al rio',
      tipo_contaminacion: 'suelo',
      subcategoria: 'derrame_de_combustible',
      nivel_severidad: 'critico',
      estado: 'pendiente',
      latitud: 1.15,
      longitud: -76.65,
    },
    assignments: [
      {
        id_entidad: 1,
        tipo_asignacion: 'principal',
        prioridad: 'critica',
        entidad: { id_entidad: 1, codigo: 'bomberos', nombre: 'Bomberos' },
      },
      {
        id_entidad: 2,
        tipo_asignacion: 'apoyo',
        prioridad: 'critica',
        entidad: { id_entidad: 2, codigo: 'corpoamazonia', nombre: 'Corpoamazonia' },
      },
    ],
  });

  assert.equal(total, 2);
  assert.deepEqual(
    emissions.map((item) => item.room),
    [getEntidadRoom(1), getEntidadRoom(2)]
  );
  assert.equal(emissions[0].payload.reporte.id_reporte, 11);
  assert.equal(emissions[1].payload.entidad.codigo, 'corpoamazonia');
});

test('reporte normal no emite evento critico', () => {
  const { io, emissions } = createMockIo();
  setSocketServerForTests(io);

  const total = notificarReporteCriticoAsignado({
    reporte: { id_reporte: 12, titulo: 'Basura en via publica' },
    assignments: [
      {
        id_entidad: 5,
        tipo_asignacion: 'principal',
        prioridad: 'media',
        entidad: { id_entidad: 5, codigo: 'alcaldia_servicios_publicos' },
      },
    ],
  });

  assert.equal(total, 0);
  assert.deepEqual(emissions, []);
});

test('asignacion de reporte funciona aunque no haya clientes socket conectados', async (t) => {
  setSocketServerForTests(null);

  t.mock.method(EntidadModel, 'findManyByCodigos', async () => [
    { id_entidad: 1, codigo: 'bomberos', nombre: 'Bomberos' },
    { id_entidad: 2, codigo: 'corpoamazonia', nombre: 'Corpoamazonia' },
  ]);
  t.mock.method(ReporteEntidadModel, 'bulkCreateAssignments', async (assignments) => (
    assignments.map((item, index) => ({ ...item, id_reporte_entidad: index + 1 }))
  ));
  t.mock.method(UsuarioModel, 'findActiveByEntidad', async () => []);
  t.mock.method(AlertaEntidadModel, 'create', async () => 1);

  const assignments = await asignarEntidadesAReporte({
    id_reporte: 13,
    uuid: 'rep-13',
    titulo: 'Derrame de combustible',
    descripcion: 'Derrame de gasolina en via publica',
    subcategoria: 'derrame_de_combustible',
    estado: 'pendiente',
  });

  assert.equal(assignments.length, 2);
  assert.equal(assignments[0].id_entidad, 1);
});
