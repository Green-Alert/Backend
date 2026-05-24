import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.resolve(path.dirname(__filename), '../..');

const readSchema = () => fs.readFile(
  path.join(backendDir, 'DATABASE_SCHEMA_COMPLETE.sql'),
  'utf8'
);

test('schema completo incluye tablas de soporte requeridas por el backend', async () => {
  const schema = await readSchema();

  for (const table of [
    'usuarios',
    'entidades',
    'categorias_riesgo',
    'reportes',
    'reporte_entidades',
    'evidencias',
    'refresh_tokens',
    'reporte_likes',
    'reporte_vistas',
    'notificaciones',
    'fcm_tokens',
  ]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(`));
  }
});

test('schema completo conserva columnas actuales de auth, IA y moderacion', async () => {
  const schema = await readSchema();

  for (const column of [
    'google_id VARCHAR(255) UNIQUE NULL',
    'facebook_id VARCHAR(255) UNIQUE NULL',
    "rol ENUM('ciudadano', 'moderador', 'admin', 'entidad')",
    'id_entidad INT NULL',
    'notification_preferences JSON NULL',
    'avatar_url VARCHAR(255) NULL',
    'email_verificado BOOLEAN DEFAULT FALSE',
    'email_verification_token VARCHAR(64) NULL',
    'subcategoria VARCHAR(100) NULL',
    "estado ENUM('pendiente', 'en_revision', 'verificado', 'en_proceso', 'rechazado', 'resuelto')",
    'comentario_moderacion TEXT NULL',
    'ia_etiquetas JSON NULL',
    'ia_confianza DECIMAL(5, 2) NULL',
    'ia_procesado BOOLEAN DEFAULT FALSE',
    'token_hash CHAR(64) NOT NULL',
    "tipo_asignacion ENUM('principal', 'apoyo')",
    "estado_atencion ENUM('pendiente', 'en_atencion', 'atendido', 'cerrado')",
    "tipo ENUM('reporte_estado', 'reporte_comentario', 'reporte_creado', 'reporte_asignado_entidad', 'alerta_zona', 'sistema')",
  ]) {
    assert.ok(schema.includes(column), column);
  }
});

test('schema completo incluye indices de prediccion', async () => {
  const schema = await readSchema();

  assert.ok(schema.includes('INDEX idx_reportes_estado_created_at (estado, created_at)'));
  assert.ok(schema.includes('INDEX idx_reportes_tipo_created_at (tipo_contaminacion, created_at)'));
  assert.ok(schema.includes('INDEX idx_reportes_latitud_longitud (latitud, longitud)'));
});

test('migraciones no tienen numeracion duplicada ni scripts sueltos de notificaciones', async () => {
  const migrationsDir = path.join(backendDir, 'migrations');
  const files = await fs.readdir(migrationsDir);
  const numbered = files
    .map((file) => file.match(/^(\d{3})_/)?.[1])
    .filter(Boolean);
  const duplicateNumbers = numbered.filter((number, index) => numbered.indexOf(number) !== index);

  assert.deepEqual(duplicateNumbers, []);
  assert.equal(files.includes('create_notificaciones.sql'), false);
  assert.equal(files.includes('012_create_notificaciones.sql'), true);
  assert.equal(files.includes('014_create_entidades_and_reporte_entidades.sql'), true);
});
