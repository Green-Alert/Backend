-- Migracion: vistas unicas persistentes para usuarios autenticados
CREATE TABLE IF NOT EXISTS reporte_vistas (
  id_vista BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_vista),
  UNIQUE KEY uk_reporte_vistas_reporte_usuario (id_reporte, id_usuario),
  KEY idx_reporte_vistas_usuario (id_usuario),
  CONSTRAINT fk_reporte_vistas_reporte
    FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reporte_vistas_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
