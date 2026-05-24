import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clasificarImagen } from '../../src/services/clasificacion.service.js';
import { analizarImagen, createReporte } from '../../src/controllers/reporte.controller.js';
import { CategoriaRiesgoModel } from '../../src/models/categoria-riesgo.model.js';
import { EvidenciaModel } from '../../src/models/evidencia.model.js';
import { normalizeReporteIA, ReporteModel } from '../../src/models/reporte.model.js';
import { AsignacionEntidadesService } from '../../src/services/asignacion-entidades.service.js';

const __filename = fileURLToPath(import.meta.url);
const testsDir = path.dirname(__filename);

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

const createValidRequest = (overrides = {}) => ({
  user: { sub: 7 },
  body: {
    tipo_contaminacion: 'agua',
    nivel_severidad: 'alto',
    titulo: 'Reporte con IA',
    descripcion: 'Vertimiento en rio',
    direccion: 'Calle 10',
    municipio: 'Valledupar',
    departamento: 'Cesar',
    latitud: 10.45,
    longitud: -73.25,
    ...overrides,
  },
});

const mockReporteCreate = (t) => {
  t.mock.method(CategoriaRiesgoModel, 'esValido', async () => true);
  t.mock.method(ReporteModel, 'create', async () => 15);
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 15,
    tipo_contaminacion: 'agua',
    estado: 'pendiente',
  }));
  t.mock.method(ReporteModel, 'updateIaAnalysis', async () => true);
  t.mock.method(EvidenciaModel, 'create', async () => 1);
  t.mock.method(AsignacionEntidadesService, 'asignarEntidadesAReporte', async () => []);
};

test('clasificarImagen devuelve contrato esperado con fallback deterministico', async () => {
  const result = await clasificarImagen({
    originalname: 'foto-rio-agua-contaminada.jpg',
    mimetype: 'image/jpeg',
  });

  assert.equal(result.categoria, 'agua');
  assert.equal(result.nombre, 'Contaminacion de Agua');
  assert.equal(result.subcategoria, 'vertimiento');
  assert.equal(result.severidad, 'alto');
  assert.ok(result.confianza > 0);
  assert.ok(result.confianza_subcategoria > 0);
  assert.ok(result.confianza_severidad > 0);
  assert.ok(result.etiquetas.includes('agua'));

  const fallback = await clasificarImagen({ originalname: 'sin-pistas.jpg' });
  assert.equal(fallback.categoria, 'otro');
  assert.equal(fallback.nombre, 'Otro');
  assert.deepEqual(fallback.etiquetas, ['otro']);
});

test('analizarImagen exige imagen', async (t) => {
  const res = createResponse();
  const next = t.mock.fn();

  await analizarImagen({ file: null }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Imagen requerida.');
  assert.equal(next.mock.callCount(), 0);
});

test('analizarImagen clasifica y borra archivo temporal', async (t) => {
  const tempPath = path.join(testsDir, 'tmp-analizar-imagen.jpg');
  await fs.writeFile(tempPath, 'fake image bytes');

  const req = {
    file: {
      path: tempPath,
      originalname: 'agua-rio.jpg',
      mimetype: 'image/jpeg',
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await analizarImagen(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.categoria, 'agua');
  assert.equal(res.body.data.nombre, 'Contaminacion de Agua');
  assert.equal(res.body.data.severidad, 'alto');
  await assert.rejects(() => fs.access(tempPath));
  assert.equal(next.mock.callCount(), 0);
});

test('createReporte persiste payload IA valido aceptado por el usuario', async (t) => {
  mockReporteCreate(t);

  const req = createValidRequest({
    ia_procesado: '1',
    ia_confianza: '0.82',
    ia_etiquetas: JSON.stringify(['agua', 'vertimiento']),
  });
  const res = createResponse();
  const next = t.mock.fn();

  await createReporte(req, res, next);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(ReporteModel.updateIaAnalysis.mock.calls[0].arguments[1], {
    etiquetas: ['agua', 'vertimiento'],
    confianza: 0.82,
    procesado: true,
  });
  assert.equal(next.mock.callCount(), 0);
});

test('createReporte rechaza payload IA invalido sin crear reporte', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'esValido', async () => {
    throw new Error('No debe validar categoria con IA invalida');
  });
  t.mock.method(ReporteModel, 'create', async () => {
    throw new Error('No debe insertar reporte con IA invalida');
  });

  const req = createValidRequest({
    ia_procesado: '1',
    ia_confianza: '0.82',
    ia_etiquetas: '{json-invalido',
  });
  const res = createResponse();
  const next = t.mock.fn();

  await createReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'ia_etiquetas debe ser un arreglo JSON valido.');
  assert.equal(ReporteModel.create.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('normalizeReporteIA expone IA normalizada y no JSON crudo', () => {
  const reporte = normalizeReporteIA({
    id_reporte: 1,
    ia_etiquetas: '["agua","rio"]',
    ia_confianza: '0.75',
    ia_procesado: 1,
  });

  assert.deepEqual(reporte.ia_etiquetas, ['agua', 'rio']);
  assert.equal(reporte.ia_confianza, 0.75);
  assert.equal(reporte.ia_procesado, true);

  const invalid = normalizeReporteIA({
    id_reporte: 2,
    ia_etiquetas: 'json roto',
    ia_confianza: null,
    ia_procesado: 0,
  });

  assert.deepEqual(invalid.ia_etiquetas, []);
  assert.equal(invalid.ia_confianza, null);
  assert.equal(invalid.ia_procesado, false);
});
