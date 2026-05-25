import test from 'node:test';
import assert from 'node:assert/strict';
import { getReportes } from '../../src/controllers/reporte.controller.js';
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

test('getReportes devuelve total real filtrado y paginacion', async (t) => {
  const reportes = [
    { id_reporte: 11, tipo_contaminacion: 'inundacion' },
    { id_reporte: 12, tipo_contaminacion: 'inundacion' },
  ];

  t.mock.method(ReporteModel, 'findAll', async () => reportes);
  t.mock.method(ReporteModel, 'countAll', async () => 8);

  const req = {
    query: {
      tipo_contaminacion: 'inundacion',
      estado: 'pendiente',
      nivel_severidad: 'alto',
      municipio: 'mocoa',
      limit: '2',
      offset: '4',
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await getReportes(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, {
    reportes,
    total: 8,
    limit: 2,
    offset: 4,
  });
  assert.deepEqual(ReporteModel.findAll.mock.calls[0].arguments[0], {
    tipo_contaminacion: 'inundacion',
    estado: 'pendiente',
    nivel_severidad: 'alto',
    municipio: 'mocoa',
    limit: 2,
    offset: 4,
  });
  assert.deepEqual(ReporteModel.countAll.mock.calls[0].arguments[0], {
    tipo_contaminacion: 'inundacion',
    estado: 'pendiente',
    nivel_severidad: 'alto',
    municipio: 'mocoa',
  });
  assert.equal(next.mock.callCount(), 0);
});

test('getReportes total no depende de la cantidad devuelta en la pagina', async (t) => {
  t.mock.method(ReporteModel, 'findAll', async () => []);
  t.mock.method(ReporteModel, 'countAll', async () => 25);

  const req = {
    query: {
      limit: '10',
      offset: '20',
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await getReportes(req, res, next);

  assert.equal(res.body.data.reportes.length, 0);
  assert.equal(res.body.data.total, 25);
  assert.equal(res.body.data.limit, 10);
  assert.equal(res.body.data.offset, 20);
  assert.equal(next.mock.callCount(), 0);
});

test('ReporteModel.countAll usa COUNT con filtros compartidos', () => {
  const source = ReporteModel.countAll.toString();

  assert.match(source, /COUNT\(\*\) AS total/);
  assert.match(source, /buildReportesFilter/);
  assert.doesNotMatch(source, /LIMIT/);
  assert.doesNotMatch(source, /OFFSET/);
});
