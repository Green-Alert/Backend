-- Migracion: tokens FCM por usuario
-- Descripcion: Registra tokens de Firebase Cloud Messaging para notificaciones push.

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id_fcm_token BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario BIGINT UNSIGNED NOT NULL,
  token TEXT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  user_agent VARCHAR(255) NULL,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_fcm_tokens_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,

  UNIQUE KEY uk_fcm_tokens_hash (token_hash),
  INDEX idx_fcm_tokens_usuario_activo (id_usuario, activo),
  INDEX idx_fcm_tokens_last_seen_at (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
