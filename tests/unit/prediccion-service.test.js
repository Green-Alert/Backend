import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calcularAlertasPredictivas,
  calcularZonasRiesgo,
  getPrediccionCacheSize,
  invalidatePrediccionCache,
  parseAlertasParams,
  parseZonasParams,
} from '../../src/services/prediccion.service.js';
import { ReporteModel } from '../../src/models/reporte.model.js';

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.resolve(path.dirname(__filename), '../..');

const reportesBase = [
  {
    id_reporte: 1,
    tipo_contaminacion: 'agua',
    subcategoria: 'vertimiento',
    estado: 'en_proceso',
    nivel_severidad: 'alto',
    latitud: 10.401,
    longitud: -73.201,
    municipio: 'Valledupar',
    departamento: 'Cesar',
    created_at: new Date().toISOString(),
  },
  {
    id_reporte: 2,
    tipo_contaminacion: 'agua',
    subcategoria: 'vertimiento',
    estado: 'resuelto',
    nivel_severidad: 'critico',
    latitud: 10.402,
    longitud: -73.202,
    municipio: 'Valledupar',
    departamento: 'Cesar',
    created_at: new Date().toISOString(),
  },
  {
    id_reporte: 3,
    tipo_contaminacion: 'aire',
    subcategoria: 'humo',
    estado: 'en_proceso',
    nivel_severidad: 'medio',
    latitud: 11.1,
    longitud: -74.1,
    municipio: 'Santa Marta',
    departamento: 'Magdalena',
    created_at: new Date().toISOString(),
  },
];

test('calcularZonasRiesgo agrupa por grilla y no expone datos personales', async (t) => {
  invalidatePrediccionCache();
  t.mock.method(ReporteModel, 'findParaPrediccion', async () => reportesBase);

  const result = await calcularZonasRiesgo(parseZonasParams({ min_score: '0' }));

  assert.equal(result.celda_grados, 0.05);
  assert.ok(result.actualizado_en);
  assert.equal(result.zonas.length, 2);
  assert.equal(result.zonas[0].tipo_dominante, 'agua');
  assert.equal(result.zonas[0].n_reportes, 2);
  assert.equal(Object.hasOwn(result.zonas[0], 'id_usuario'), false);
  assert.equal(Object.hasOwn(result.zonas[0], 'autor_nombre'), false);
});

test('calcularAlertasPredictivas filtra por nivel, tipo, distancia y limite', async (t) => {
  invalidatePrediccionCache();
  t.mock.method(ReporteModel, 'findParaPrediccion', async () => reportesBase);

  const result = await calcularAlertasPredictivas(parseAlertasParams({
    min_score: '0',
    nivel_min: 'alto',
    tipo: 'agua',
    limite: '1',
    lat: '10.40',
    lng: '-73.20',
    radio_km: '20',
  }));

  assert.ok(result.generado_en);
  assert.equal(result.alertas.length, 1);
  assert.equal(result.alertas[0].tipo_dominante, 'agua');
  assert.equal(result.alertas[0].nivel === 'alto' || result.alertas[0].nivel === 'critico', true);
  assert.equal(Object.hasOwn(result.alertas[0], 'id_usuario'), false);
});

test('prediccion responde listas vacias sin datos', async (t) => {
  invalidatePrediccionCache();
  t.mock.method(ReporteModel, 'findParaPrediccion', async () => []);

  const zonas = await calcularZonasRiesgo(parseZonasParams({}));
  const alertas = await calcularAlertasPredictivas(parseAlertasParams({}));

  assert.deepEqual(zonas.zonas, []);
  assert.deepEqual(alertas.alertas, []);
});

test('prediccion usa cache TTL hasta invalidar', async (t) => {
  invalidatePrediccionCache();
  t.mock.method(ReporteModel, 'findParaPrediccion', async () => reportesBase);

  await calcularZonasRiesgo(parseZonasParams({ min_score: '0' }));
  await calcularZonasRiesgo(parseZonasParams({ min_score: '0' }));

  assert.equal(ReporteModel.findParaPrediccion.mock.callCount(), 1);
  assert.equal(getPrediccionCacheSize() > 0, true);

  invalidatePrediccionCache();
  assert.equal(getPrediccionCacheSize(), 0);

  await calcularZonasRiesgo(parseZonasParams({ min_score: '0' }));
  assert.equal(ReporteModel.findParaPrediccion.mock.callCount(), 2);
});

test('parseAlertasParams valida parametros geograficos y nivel', () => {
  assert.throws(
    () => parseAlertasParams({ lat: '91' }),
    /lat debe ser un numero entre -90 y 90/
  );
  assert.throws(
    () => parseAlertasParams({ nivel_min: 'urgente' }),
    /nivel_min debe ser uno de/
  );
  assert.throws(
    () => parseZonasParams({ min_score: '101' }),
    /min_score debe ser un numero entre 0 y 100/
  );
  assert.throws(
    () => parseAlertasParams({ lat: '10.4' }),
    /lat y lng deben enviarse juntos/
  );
  assert.throws(
    () => parseAlertasParams({ radio_km: '20' }),
    /radio_km requiere lat y lng/
  );
});

test('ReporteModel.findParaPrediccion solo usa reportes moderados con ubicacion', async () => {
  const source = await fs.readFile(
    path.join(backendDir, 'src/models/reporte.model.js'),
    'utf8'
  );
  const start = source.indexOf('findParaPrediccion: async');
  const end = source.indexOf('findTrending: async', start);
  const section = source.slice(start, end);

  assert.match(section, /r\.deleted_at IS NULL/);
  assert.match(section, /r\.latitud IS NOT NULL/);
  assert.match(section, /r\.longitud IS NOT NULL/);
  assert.match(section, /r\.estado IN \('en_proceso', 'resuelto'\)/);
  assert.match(section, /r\.created_at >= \?/);
  assert.match(section, /r\.tipo_contaminacion = \?/);
});

test('documentacion de prediccion conserva formula y estados admitidos', async () => {
  const docs = await fs.readFile(
    path.join(backendDir, 'docs/PREDICCION_ZONAS_RIESGO.md'),
    'utf8'
  );

  assert.match(docs, /cantidad_reportes \* 16/);
  assert.match(docs, /severidad_promedio \* 14/);
  assert.match(docs, /recencia_promedio/);
  assert.match(docs, /'en_proceso', 'resuelto'/);
});
