import test from 'node:test';
import assert from 'node:assert/strict';
import { asignarEntidadReporte } from '../../src/controllers/reporte.controller.js';
import { EntidadModel } from '../../src/models/entidad.model.js';
import { ReporteEntidadModel } from '../../src/models/reporte-entidad.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';

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

test('asignarEntidadReporte asigna manualmente a una entidad activa y permitida', async (t) => {
  const reporte = {
    id_reporte: 10,
    uuid: 'rep-10',
    id_usuario: null,
    titulo: 'Incendio en la vereda',
  };
  const entidad = {
    id_entidad: 1,
    codigo: 'bomberos',
    nombre: 'Bomberos',
    activo: 1,
  };
  const asignacion = {
    id_reporte_entidad: 7,
    id_reporte: 10,
    id_entidad: 1,
    estado_atencion: 'pendiente',
  };
  let assignmentPayload;

  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EntidadModel, 'findActiveAllowedByIdOrCodigo', async () => entidad);
  t.mock.method(ReporteEntidadModel, 'createAssignment', async (payload) => {
    assignmentPayload = payload;
    return 7;
  });
  t.mock.method(ReporteEntidadModel, 'findOneByReporteAndEntidad', async () => asignacion);

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
  assert.deepEqual(assignmentPayload, {
    id_reporte: 10,
    id_entidad: 1,
    tipo_asignacion: 'principal',
    prioridad: 'media',
    estado_atencion: 'pendiente',
    comentario: 'Revisar incendio',
  });
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
