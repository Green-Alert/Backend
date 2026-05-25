import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESTADO_INICIAL_REPORTE } from '../../src/models/reporte.model.js';

const __filename = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(__filename), '../..');

const readBackendFile = (relativePath) => {
  return fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');
};

test('schema define pendiente como estado inicial de reportes', () => {
  const schema = readBackendFile('DATABASE_SCHEMA_COMPLETE.sql');

  assert.match(
    schema,
    /estado ENUM\('pendiente', 'en_revision', 'verificado', 'en_proceso', 'rechazado', 'resuelto'\) DEFAULT 'pendiente'/
  );
});

test('modelo crea reportes nuevos con estado pendiente explicito', () => {
  const model = readBackendFile('src/models/reporte.model.js');

  const createStart = model.indexOf('create: async');
  const updateStart = model.indexOf('update: async', createStart);
  const createSection = model.slice(createStart, updateStart);

  assert.match(createSection, /tipo_contaminacion, estado, nivel_severidad/);
  assert.equal(ESTADO_INICIAL_REPORTE, 'pendiente');
  assert.equal((createSection.match(/ESTADO_INICIAL_REPORTE/g) ?? []).length, 2);
});

test('controlador permite editar al propietario solo cuando el reporte esta pendiente', () => {
  const controller = readBackendFile('src/controllers/reporte.controller.js');

  assert.match(controller, /reporte\.estado !== ESTADO_INICIAL_REPORTE/);
  assert.match(controller, /const allowed = isOwner\s*\?\s*\['titulo', 'descripcion', 'direccion', 'municipio', 'departamento'\]/);
});
