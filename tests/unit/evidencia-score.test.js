import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularScoreEvidencias } from '../../src/services/evidencia-score.service.js';

const createFile = (content, overrides = {}) => ({
  buffer: Buffer.from(content),
  mimetype: 'image/png',
  originalname: 'evidencia.png',
  size: Buffer.byteLength(content),
  ...overrides,
});

test('calcularScoreEvidencias retorna null cuando no hay archivos', async () => {
  const result = await calcularScoreEvidencias([]);

  assert.equal(result.score, null);
  assert.equal(result.accion, 'sin_evidencias');
  assert.equal(result.metadata.total, 0);
});

test('calcularScoreEvidencias calcula hashes y score por evidencia', async () => {
  const result = await calcularScoreEvidencias([
    createFile('imagen-real-1'),
    createFile('imagen-real-2'),
  ]);

  assert.equal(result.evidencias.length, 2);
  assert.match(result.evidencias[0].hash_sha256, /^[a-f0-9]{64}$/);
  assert.equal(typeof result.score, 'number');
  assert.ok(['aceptar', 'moderar'].includes(result.accion));
});

test('calcularScoreEvidencias penaliza duplicados en el mismo lote', async () => {
  const unique = await calcularScoreEvidencias([
    createFile('imagen-real-1'),
    createFile('imagen-real-2'),
  ]);
  const duplicated = await calcularScoreEvidencias([
    createFile('imagen-repetida'),
    createFile('imagen-repetida'),
  ]);

  assert.ok(duplicated.score < unique.score);
  assert.ok(duplicated.metadata.reasons.includes('hash_duplicado_en_lote'));
});

test('calcularScoreEvidencias detecta nombres con senales generativas', async () => {
  const result = await calcularScoreEvidencias([
    createFile('contenido', { originalname: 'midjourney-output.png' }),
  ]);

  assert.ok(result.metadata.reasons.includes('posible_imagen_generada'));
});
