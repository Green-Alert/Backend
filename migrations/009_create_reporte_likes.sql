-- Migracion: likes persistentes por usuario y reporte
CREATE TABLE IF NOT EXISTS reporte_likes (
  id_like BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_like),
  UNIQUE KEY uk_reporte_likes_reporte_usuario (id_reporte, id_usuario),
  KEY idx_reporte_likes_usuario (id_usuario),
  CONSTRAINT fk_reporte_likes_reporte
    FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reporte_likes_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
