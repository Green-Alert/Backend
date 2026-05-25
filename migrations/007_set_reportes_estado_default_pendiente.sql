-- Migracion: alinear estado inicial de reportes con reglas de edicion
-- Los reportes nuevos deben iniciar como 'pendiente' para que el creador
-- pueda editarlos antes de que pasen a revision.

ALTER TABLE reportes
  MODIFY estado ENUM('pendiente', 'en_revision', 'verificado', 'en_proceso', 'rechazado', 'resuelto')
  DEFAULT 'pendiente';
