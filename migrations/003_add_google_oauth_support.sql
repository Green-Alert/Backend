-- Migracion: Agregar soporte para Google OAuth
-- Fecha: 2026-04-26
-- Descripcion: Agrega columna google_id a usuarios para vincular cuentas de Google.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE NULL AFTER uuid;

CREATE INDEX IF NOT EXISTS idx_google_id ON usuarios(google_id);
