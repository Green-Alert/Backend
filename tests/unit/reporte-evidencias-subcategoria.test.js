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

  assert.match(uploadMiddleware, /const MAX_REPORT_FILES = 10;/);
  assert.match(uploadMiddleware, /const MAX_REPORT_VIDEOS = 1;/);
  assert.match(uploadMiddleware, /\{ name: 'file', maxCount: 1 \}/);
  assert.match(uploadMiddleware, /\{ name: 'files', maxCount: MAX_REPORT_FILES \}/);
  assert.match(uploadMiddleware, /req\.reportFiles = reportFiles;/);
});

test('creacion de reportes guarda una evidencia por cada archivo recibido', () => {
  const controller = readProjectFile('src/controllers/reporte.controller.js');

  assert.match(controller, /const evidencias = req\.reportFiles \?\? \(req\.file \? \[req\.file\] : \[\]\);/);
  assert.match(controller, /evidencias\.map\(\(file, index\) =>/);
  assert.match(controller, /url_archivo:\s+`\/uploads\/\$\{file\.filename\}`/);
  assert.match(controller, /orden:\s+index/);
});

test('reportes soporta subcategoria en esquema, migracion, creacion y consultas', () => {
  const schema = readProjectFile('DATABASE_SCHEMA_COMPLETE.sql');
  const migration = readProjectFile('migrations/007_add_subcategoria_reportes.sql');
  const controller = readProjectFile('src/controllers/reporte.controller.js');
  const model = readProjectFile('src/models/reporte.model.js');

  assert.match(schema, /subcategoria VARCHAR\(100\) NULL/);
  assert.match(migration, /ADD COLUMN subcategoria VARCHAR\(100\) NULL DEFAULT NULL/);
  assert.match(controller, /subcategoria:\s+subcategoria\?\.trim\(\) \|\| null/);
  assert.match(model, /r\.tipo_contaminacion, r\.subcategoria, r\.estado/);
  assert.match(model, /tipo_contaminacion, subcategoria, nivel_severidad/);
});
