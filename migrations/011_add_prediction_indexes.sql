-- Migracion: indices para prediccion de zonas de riesgo y alertas.
-- Idempotente para poder aplicarse en bases existentes sin borrar datos.

SET @schema_name = DATABASE();

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'reportes'
    AND index_name = 'idx_reportes_estado_created_at'
);
SET @sql = IF(
  @index_exists = 0,
  'CREATE INDEX idx_reportes_estado_created_at ON reportes (estado, created_at)',
  'SELECT ''idx_reportes_estado_created_at ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'reportes'
    AND index_name = 'idx_reportes_tipo_created_at'
);
SET @sql = IF(
  @index_exists = 0,
  'CREATE INDEX idx_reportes_tipo_created_at ON reportes (tipo_contaminacion, created_at)',
  'SELECT ''idx_reportes_tipo_created_at ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'reportes'
    AND index_name = 'idx_reportes_latitud_longitud'
);
SET @sql = IF(
  @index_exists = 0,
  'CREATE INDEX idx_reportes_latitud_longitud ON reportes (latitud, longitud)',
  'SELECT ''idx_reportes_latitud_longitud ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
