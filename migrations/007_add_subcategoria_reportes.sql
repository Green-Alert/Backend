-- Migracion: Agregar subcategoria a reportes
-- Descripcion: Permite clasificar reportes con una subcategoria opcional.

ALTER TABLE reportes
ADD COLUMN subcategoria VARCHAR(100) NULL DEFAULT NULL
AFTER tipo_contaminacion;

CREATE INDEX idx_reportes_subcategoria ON reportes(subcategoria);
