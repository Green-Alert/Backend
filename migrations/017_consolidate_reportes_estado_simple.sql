-- Consolida el flujo simple de estados de reportes ambientales.
-- Estados definitivos: pendiente, en_proceso, resuelto, rechazado.

UPDATE reportes
SET estado = 'en_proceso'
WHERE estado IN ('en_revision', 'verificado');

ALTER TABLE reportes
  MODIFY estado ENUM('pendiente', 'en_proceso', 'resuelto', 'rechazado')
  DEFAULT 'pendiente';
