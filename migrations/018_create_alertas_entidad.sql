USE `green-alert`;

CREATE TABLE IF NOT EXISTS alertas_entidad (
  id_alerta_entidad BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL DEFAULT (UUID()),
  id_reporte_entidad BIGINT UNSIGNED NOT NULL,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_entidad INT NOT NULL,
  tipo_alerta ENUM(
    'reporte_critico_asignado',
    'reporte_prioritario_asignado',
    'reporte_asignado'
  ) NOT NULL,
  prioridad ENUM('baja', 'media', 'alta', 'critica') NOT NULL DEFAULT 'media',
  titulo VARCHAR(180) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  leida_at DATETIME NULL,
  leida_por BIGINT UNSIGNED NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_alertas_entidad_uuid (uuid),
  UNIQUE KEY uq_alerta_reporte_entidad_tipo (id_reporte_entidad, tipo_alerta),

  INDEX idx_alertas_entidad (id_entidad),
  INDEX idx_alertas_reporte (id_reporte),
  INDEX idx_alertas_reporte_entidad (id_reporte_entidad),
  INDEX idx_alertas_entidad_leida (id_entidad, leida, created_at),
  INDEX idx_alertas_entidad_prioridad (id_entidad, prioridad, created_at),
  INDEX idx_alertas_leida_por (leida_por),

  CONSTRAINT fk_alertas_entidad_reporte_entidad
    FOREIGN KEY (id_reporte_entidad)
    REFERENCES reporte_entidades(id_reporte_entidad)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_alertas_entidad_reporte
    FOREIGN KEY (id_reporte)
    REFERENCES reportes(id_reporte)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_alertas_entidad_entidad
    FOREIGN KEY (id_entidad)
    REFERENCES entidades(id_entidad)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_alertas_entidad_leida_por
    FOREIGN KEY (leida_por)
    REFERENCES usuarios(id_usuario)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
