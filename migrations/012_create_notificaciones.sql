-- Migracion: notificaciones in-app por usuario
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  tipo ENUM('reporte_estado', 'reporte_comentario', 'reporte_creado', 'alerta_zona', 'sistema') NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  referencia_tipo VARCHAR(30) NULL,
  referencia_uuid VARCHAR(36) NULL,
  link VARCHAR(255) NULL,
  leida BOOLEAN DEFAULT FALSE,
  leida_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notificaciones_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  INDEX idx_notificaciones_usuario_leida (id_usuario, leida, created_at),
  INDEX idx_notificaciones_uuid (uuid),
  INDEX idx_notificaciones_referencia (referencia_tipo, referencia_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
