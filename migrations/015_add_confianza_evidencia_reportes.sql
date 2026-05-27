-- Migracion: Agregar confianza de evidencias a reportes
-- Descripcion: Guarda el score calculado a partir de metadata y hashes de evidencias.

ALTER TABLE reportes
ADD COLUMN confianza_evidencia TINYINT UNSIGNED NULL DEFAULT NULL
AFTER ia_procesado;

CREATE INDEX idx_reportes_confianza_evidencia ON reportes(confianza_evidencia);
