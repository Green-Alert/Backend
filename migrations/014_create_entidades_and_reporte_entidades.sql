USE `green-alert`;

CREATE TABLE IF NOT EXISTS entidades (
  id_entidad INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_entidades_codigo (codigo),
  INDEX idx_entidades_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO entidades (nombre, codigo, descripcion)
VALUES
(
  'Bomberos',
  'bomberos',
  'Entidad encargada de la atencion de incendios, quemas activas, emergencias, explosiones, derrames peligrosos y materiales inflamables.'
),
(
  'Corpoamazonia',
  'corpoamazonia',
  'Autoridad ambiental regional encargada de contaminacion ambiental, vertimientos, tala ilegal, deforestacion, fauna, flora, mineria ilegal y afectaciones a ecosistemas.'
),
(
  'Gestion del Riesgo',
  'gestion_riesgo',
  'Entidad encargada de amenazas, emergencias, desastres naturales, avalanchas, deslizamientos, inundaciones, crecientes subitas, derrames graves y eventos criticos.'
),
(
  'Secretaria de Salud',
  'secretaria_salud',
  'Entidad encargada de riesgos sanitarios, basuras con afectacion a la salud publica, aguas residuales, malos olores, residuos hospitalarios y proliferacion de vectores.'
),
(
  'Alcaldia / Servicios Publicos',
  'alcaldia_servicios_publicos',
  'Entidad encargada de la atencion operativa de residuos urbanos, basura en via publica, escombros, alcantarillado, espacio publico y mantenimiento municipal.'
)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  activo = TRUE,
  updated_at = CURRENT_TIMESTAMP;

UPDATE entidades
SET activo = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo NOT IN (
  'bomberos',
  'corpoamazonia',
  'gestion_riesgo',
  'secretaria_salud',
  'alcaldia_servicios_publicos'
);

SET @has_id_entidad = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'id_entidad'
);
SET @sql = IF(
  @has_id_entidad = 0,
  'ALTER TABLE usuarios ADD COLUMN id_entidad INT NULL AFTER rol',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE usuarios
  MODIFY rol ENUM('ciudadano', 'moderador', 'admin', 'entidad')
  NOT NULL DEFAULT 'ciudadano';

SET @has_idx_usuarios_entidad = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND INDEX_NAME = 'idx_usuarios_id_entidad'
);
SET @sql = IF(
  @has_idx_usuarios_entidad = 0,
  'CREATE INDEX idx_usuarios_id_entidad ON usuarios(id_entidad)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk_usuarios_entidad = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_usuarios_entidad'
);
SET @sql = IF(
  @has_fk_usuarios_entidad = 0,
  'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_entidad FOREIGN KEY (id_entidad) REFERENCES entidades(id_entidad) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS reporte_entidades (
  id_reporte_entidad BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_entidad INT NOT NULL,

  tipo_asignacion ENUM('principal', 'apoyo') NOT NULL DEFAULT 'principal',

  prioridad ENUM('baja', 'media', 'alta', 'critica') NOT NULL DEFAULT 'media',

  estado_atencion ENUM('pendiente', 'en_atencion', 'atendido', 'cerrado')
    NOT NULL DEFAULT 'pendiente',

  comentario TEXT NULL,

  asignado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_reporte_entidades_reporte
    FOREIGN KEY (id_reporte)
    REFERENCES reportes(id_reporte)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_reporte_entidades_entidad
    FOREIGN KEY (id_entidad)
    REFERENCES entidades(id_entidad)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  UNIQUE KEY unique_reporte_entidad (id_reporte, id_entidad),

  INDEX idx_reporte_entidades_reporte (id_reporte),
  INDEX idx_reporte_entidades_entidad (id_entidad),
  INDEX idx_reporte_entidades_tipo (tipo_asignacion),
  INDEX idx_reporte_entidades_prioridad (prioridad),
  INDEX idx_reporte_entidades_estado_atencion (estado_atencion),
  INDEX idx_reporte_entidades_asignado_at (asignado_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE notificaciones
  MODIFY tipo ENUM(
    'reporte_estado',
    'reporte_comentario',
    'reporte_creado',
    'reporte_asignado_entidad',
    'alerta_zona',
    'sistema'
  ) NOT NULL;
