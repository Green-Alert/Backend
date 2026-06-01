import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const readProjectFile = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

test('middleware de reportes acepta file y files con limite de 10 archivos', () => {
  const uploadMiddleware = readProjectFile('middlewares/upload.middleware.js');

  assert.match(uploadMiddleware, /\{ name: 'file', maxCount: 1 \}/);
  assert.match(uploadMiddleware, /\{ name: 'files', maxCount: 10 \}/);
  assert.match(uploadMiddleware, /multer\.memoryStorage\(\)/);
  assert.match(uploadMiddleware, /decorateUploadedFiles\(req\)/);
});

test('creacion de reportes guarda una evidencia por cada archivo recibido', () => {
  const controller = readProjectFile('src/controllers/reporte.controller.js');

  assert.match(controller, /const uploadedFiles = getUploadedFiles\(req\);/);
  assert.match(controller, /for \(const \[index, file\] of uploadedFiles\.entries\(\)\)/);
  assert.match(controller, /url_archivo:\s+uploadResult\.secure_url/);
  assert.match(controller, /await EvidenciaModel\.create\(evidencia\)/);
  assert.match(controller, /orden:\s+index/);
});

test('reportes soporta subcategoria en esquema, migracion, creacion y consultas', () => {
  const schema = readProjectFile('DATABASE_SCHEMA_COMPLETE.sql');
  const migration = readProjectFile('migrations/014_create_entidades_and_reporte_entidades.sql');
  const controller = readProjectFile('src/controllers/reporte.controller.js');
  const model = readProjectFile('src/models/reporte.model.js');

  assert.match(schema, /subcategoria VARCHAR\(100\) NULL/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS reporte_entidades/);
  assert.match(controller, /subcategoria:\s+subcategoria\?\.trim\(\) \|\| null/);
  assert.match(model, /r\.tipo_contaminacion, r\.subcategoria, r\.estado/);
  assert.match(model, /tipo_contaminacion, subcategoria, estado, nivel_severidad/);
});
