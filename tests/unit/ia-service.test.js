import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeReporte } from '../../src/services/ia.service.js';

test('analyzeReporte genera etiquetas, confianza y marca procesado', () => {
  const result = analyzeReporte({
    tipo_contaminacion: 'inundacion',
    nivel_severidad: 'alto',
    titulo: 'Vertimiento de agua contaminada en rio',
    descripcion: 'Hay olor fuerte y residuos cerca de la quebrada.',
    latitud: 1.25,
    longitud: -76.5,
  });

  assert.equal(result.procesado, true);
  assert.ok(result.confianza >= 0.1);
  assert.ok(result.confianza <= 0.99);
  assert.ok(result.etiquetas.includes('agua'));
  assert.ok(result.etiquetas.includes('residuos'));
  assert.ok(result.etiquetas.includes('inundacion'));
  assert.ok(result.etiquetas.includes('severidad_alto'));
  assert.equal(result.resumen.hasLocation, true);
});

test('analyzeReporte funciona con datos minimos', () => {
  const result = analyzeReporte({
    tipo_contaminacion: 'ruido',
    nivel_severidad: 'medio',
    titulo: 'Reporte ambiental',
  });

  assert.equal(result.procesado, true);
  assert.deepEqual(result.etiquetas, ['ruido', 'severidad_medio']);
  assert.equal(result.resumen.hasLocation, false);
});
