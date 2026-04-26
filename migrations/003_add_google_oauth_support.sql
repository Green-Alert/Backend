-- Migración: Agregar soporte para Google OAuth
-- Fecha: 2026-04-26
-- Descripción: Agrega columna google_id a tabla usuarios para almacenar ID de Google

ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL AFTER uuid;

-- Crear índice para búsquedas rápidas por google_id
CREATE INDEX idx_google_id ON usuarios(google_id);

-- Comentario de columna
-- ALTER TABLE usuarios MODIFY COLUMN google_id VARCHAR(255) COMMENT 'Google user ID (sub claim)' UNIQUE;
