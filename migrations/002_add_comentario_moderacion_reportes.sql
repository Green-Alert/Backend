-- Migración: Agregar columna comentario_moderacion a tabla reportes
-- Descripción: Permite a moderadores/admins adjuntar justificación al cambiar estado

ALTER TABLE reportes
ADD COLUMN comentario_moderacion TEXT NULL DEFAULT NULL COMMENT 'Comentario del moderador al cambiar estado (obligatorio para rechazo)' AFTER estado;

-- Crear índice para búsquedas futuras
CREATE INDEX idx_comentario_moderacion ON reportes(comentario_moderacion(100));
