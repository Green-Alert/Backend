import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerEstadisticasSeveridad } from '../../src/controllers/categoria-riesgo.controller.js';
import { CategoriaRiesgoModel } from '../../src/models/categoria-riesgo.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';

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

test('obtenerEstadisticasSeveridad usa una consulta agrupada y conserva formato de respuesta', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'getEstadisticasPorSeveridad', async () => ([
    {
      codigo: 'inundacion',
      nombre: 'Inundacion',
      icono: 'waves',
      color_hex: '#2563eb',
      bajo: 1,
      medio: 2,
      alto: 3,
      critico: 4,
    },
    {
      codigo: 'residuos',
      nombre: 'Residuos',
      icono: 'trash',
      color_hex: '#16a34a',
      bajo: 0,
      medio: 5,
      alto: 0,
      critico: 1,
    },
  ]));
  t.mock.method(ReporteModel, 'findAll', async () => {
    throw new Error('No debe consultar reportes por categoria');
  });

  const res = createResponse();
  const next = t.mock.fn();

  await obtenerEstadisticasSeveridad({}, res, next);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data.estadisticasPorSeveridad.inundacion, {
    nombre_categoria: 'Inundacion',
    icono: 'waves',
    color: '#2563eb',
    por_severidad: {
      bajo: 1,
      medio: 2,
      alto: 3,
      critico: 4,
    },
  });
  assert.deepEqual(res.body.data.estadisticasPorSeveridad.residuos.por_severidad, {
    bajo: 0,
    medio: 5,
    alto: 0,
    critico: 1,
  });
  assert.equal(CategoriaRiesgoModel.getEstadisticasPorSeveridad.mock.callCount(), 1);
  assert.equal(ReporteModel.findAll.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('CategoriaRiesgoModel.getEstadisticasPorSeveridad usa agregacion agrupada', () => {
  const source = CategoriaRiesgoModel.getEstadisticasPorSeveridad.toString();

  assert.match(source, /SUM\(CASE WHEN r\.nivel_severidad = 'bajo'/);
  assert.match(source, /GROUP BY cr\.id_categoria/);
  assert.doesNotMatch(source, /ReporteModel\.findAll/);
});
