import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(__filename), '../..');

const readBackendFile = (relativePath) => {
  return fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');
};

test('EvidenciaModel.findByReporte filtra evidencias eliminadas logicamente', () => {
  const model = readBackendFile('src/models/evidencia.model.js');
  const findStart = model.indexOf('findByReporte: async');
  const createStart = model.indexOf('create: async', findStart);
  const findSection = model.slice(findStart, createStart);

  assert.match(findSection, /WHERE id_reporte = \? AND deleted_at IS NULL/);
});

test('EvidenciaModel.create no marca evidencias como eliminadas', () => {
  const model = readBackendFile('src/models/evidencia.model.js');
  const createStart = model.indexOf('create: async');
  const removeStart = model.indexOf('remove: async', createStart);
  const createSection = model.slice(createStart, removeStart);

  assert.doesNotMatch(createSection, /deleted_at/);
});
