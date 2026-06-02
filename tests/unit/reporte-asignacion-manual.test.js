import test from 'node:test';
import assert from 'node:assert/strict';
import { asignarEntidadReporte } from '../../src/controllers/reporte.controller.js';
import { AlertaEntidadModel } from '../../src/models/alerta-entidad.model.js';
import { EntidadModel } from '../../src/models/entidad.model.js';
import { ReporteEntidadModel } from '../../src/models/reporte-entidad.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';
import {
  setSocketServerForTests,
  SOCKET_EVENTS,
} from '../../src/config/socket.js';

const createRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return res;
};

const reporteBase = {
  id_reporte: 10,
  uuid: 'rep-10',
  id_usuario: null,
  titulo: 'Incendio en la vereda',
};

const entidadBomberos = {
  id_entidad: 1,
  codigo: 'bomberos',
  nombre: 'Bomberos',
  activo: 1,
};

const createAsignacion = (prioridad = 'media') => ({
  id_reporte_entidad: 7,
  id_reporte: 10,
  id_entidad: 1,
  tipo_asignacion: 'principal',
  prioridad,
  estado_atencion: 'pendiente',
});

const mockAsignacionManualBase = (t, { prioridad = 'media' } = {}) => {
  let assignmentPayload;

  t.mock.method(ReporteModel, 'findById', async () => reporteBase);
  t.mock.method(EntidadModel, 'findActiveAllowedByIdOrCodigo', async () => entidadBomberos);
  t.mock.method(ReporteEntidadModel, 'createAssignment', async (payload) => {
    assignmentPayload = payload;
    return 7;
  });
  t.mock.method(ReporteEntidadModel, 'findOneByReporteAndEntidad', async () => (
    createAsignacion(prioridad)
  ));

  return {
    getAssignmentPayload: () => assignmentPayload,
  };
};

test('asignarEntidadReporte asigna manualmente a una entidad activa y permitida', async (t) => {
  const { getAssignmentPayload } = mockAsignacionManualBase(t);
  t.mock.method(AlertaEntidadModel, 'create', async () => {
    assert.fail('No debe crear alerta persistente para prioridad media.');
  });

  const req = {
    params: { id: '10' },
    body: {
      codigo_entidad: 'bomberos',
      comentario: ' Revisar incendio ',
    },
    user: { sub: 1, rol: 'admin' },
  };
  const res = createRes();

  await asignarEntidadReporte(req, res, assert.fail);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.status, 'success');
  assert.equal(res.body.data.entidad.codigo, 'bomberos');
  assert.deepEqual(getAssignmentPayload(), {
    id_reporte: 10,
    id_entidad: 1,
    tipo_asignacion: 'principal',
    prioridad: 'media',
    estado_atencion: 'pendiente',
    comentario: 'Revisar incendio',
  });
});

test('asignarEntidadReporte con prioridad critica genera alerta y evento socket', async (t) => {
  const { getAssignmentPayload } = mockAsignacionManualBase(t, { prioridad: 'critica' });
  let alertaPayload;
  const emissions = [];
  t.mock.method(AlertaEntidadModel, 'create', async (payload) => {
    alertaPayload = payload;
    return 20;
  });
  setSocketServerForTests({
    to(room) {
      return {
        emit(event, payload) {
          emissions.push({ room, event, payload });
        },
      };
    },
  });

  const req = {
    params: { id: '10' },
    body: {
      codigo_entidad: 'bomberos',
      prioridad: 'critica',
    },
    user: { sub: 1, rol: 'admin' },
  };
  const res = createRes();

  try {
    await asignarEntidadReporte(req, res, assert.fail);
  } finally {
    setSocketServerForTests(null);
  }

  assert.equal(res.statusCode, 201);
  assert.equal(getAssignmentPayload().prioridad, 'critica');
  assert.equal(alertaPayload.tipo_alerta, 'reporte_critico_asignado');
  assert.equal(alertaPayload.id_reporte_entidad, 7);
  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].room, 'entidad:1');
  assert.equal(emissions[0].event, SOCKET_EVENTS.REPORTE_CRITICO_ASIGNADO);
});

test('asignarEntidadReporte con prioridad alta genera alerta persistente sin evento critico', async (t) => {
  const { getAssignmentPayload } = mockAsignacionManualBase(t, { prioridad: 'alta' });
  let alertaPayload;
  const emissions = [];
  t.mock.method(AlertaEntidadModel, 'create', async (payload) => {
    alertaPayload = payload;
    return 21;
  });
  setSocketServerForTests({
    to(room) {
      return {
        emit(event, payload) {
          emissions.push({ room, event, payload });
        },
      };
    },
  });

  const req = {
    params: { id: '10' },
    body: {
      codigo_entidad: 'bomberos',
      prioridad: 'alta',
    },
    user: { sub: 1, rol: 'moderador' },
  };
  const res = createRes();

  try {
    await asignarEntidadReporte(req, res, assert.fail);
  } finally {
    setSocketServerForTests(null);
  }

  assert.equal(res.statusCode, 201);
  assert.equal(getAssignmentPayload().prioridad, 'alta');
  assert.equal(alertaPayload.tipo_alerta, 'reporte_prioritario_asignado');
  assert.deepEqual(emissions, []);
});

test('asignarEntidadReporte rechaza prioridad invalida', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => {
    assert.fail('No debe consultar reporte si la prioridad es invalida.');
  });
  t.mock.method(ReporteEntidadModel, 'createAssignment', async () => {
    assert.fail('No debe crear asignacion con prioridad invalida.');
  });

  const req = {
    params: { id: '10' },
    body: {
      codigo_entidad: 'bomberos',
      prioridad: 'urgente',
    },
    user: { sub: 1, rol: 'admin' },
  };
  const res = createRes();

  await asignarEntidadReporte(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.status, 'error');
  assert.equal(res.body.message, 'La prioridad debe ser uno de: baja, media, alta, critica.');
});

test('asignarEntidadReporte rechaza entidades inactivas o fuera de alcance', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 11,
    id_usuario: 23,
    titulo: 'Tala ilegal',
  }));
  t.mock.method(EntidadModel, 'findActiveAllowedByIdOrCodigo', async () => null);
  t.mock.method(ReporteEntidadModel, 'createAssignment', async () => {
    assert.fail('No debe crear asignacion para una entidad invalida.');
  });

  const req = {
    params: { id: '11' },
    body: { codigo_entidad: 'parques_nacionales' },
    user: { sub: 1, rol: 'moderador' },
  };
  const res = createRes();

  await asignarEntidadReporte(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.status, 'error');
  assert.match(res.body.message, /fuera del alcance institucional/);
});

test('asignarEntidadReporte retorna 404 cuando el reporte no existe', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => null);

  const req = {
    params: { id: '999' },
    body: { codigo_entidad: 'bomberos' },
    user: { sub: 1, rol: 'admin' },
  };
  const res = createRes();

  await asignarEntidadReporte(req, res, assert.fail);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.status, 'error');
  assert.equal(res.body.message, 'Reporte no encontrado.');
});
