-- ============================================================================
-- Green Alert Database - Complete Schema
-- ============================================================================
-- This schema reflects the actual field usage in the codebase
-- Generated from: models, controllers, and migration files
-- Date: May 18, 2026
-- ============================================================================

-- Drop existing tables (use with caution!)
-- DROP TABLE IF EXISTS notificaciones;
-- DROP TABLE IF EXISTS reporte_vistas;
-- DROP TABLE IF EXISTS reporte_likes;
-- DROP TABLE IF EXISTS refresh_tokens;
-- DROP TABLE IF EXISTS evidencias;
-- DROP TABLE IF EXISTS reporte_entidades;
-- DROP TABLE IF EXISTS reportes;
-- DROP TABLE IF EXISTS categorias_riesgo;
-- DROP TABLE IF EXISTS usuarios;
-- DROP TABLE IF EXISTS entidades;

-- ============================================================================
-- TABLE: entidades
-- ============================================================================
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

-- ============================================================================
-- TABLE: usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE NULL,
  facebook_id VARCHAR(255) UNIQUE NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  rol ENUM('ciudadano', 'moderador', 'admin', 'entidad') DEFAULT 'ciudadano',
  id_entidad INT NULL,
  activo BOOLEAN DEFAULT TRUE,
  email_verificado BOOLEAN DEFAULT FALSE,
  avatar_url VARCHAR(255) NULL,
  telefono VARCHAR(20) NULL,
  notification_preferences JSON NULL,
  ultimo_acceso DATETIME NULL,
  token_reset VARCHAR(64) NULL,
  token_reset_exp DATETIME NULL,
  email_verification_token VARCHAR(64) NULL,
  email_verification_exp DATETIME NULL,
  otp_code_hash VARCHAR(64) NULL,
  otp_exp DATETIME NULL,
  otp_attempts INT DEFAULT 0,
  otp_last_request DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_uuid (uuid),
  INDEX idx_google_id (google_id),
  INDEX idx_facebook_id (facebook_id),
  INDEX idx_email_verification_token (email_verification_token),
  INDEX idx_email_verification_exp (email_verification_exp),
  INDEX idx_otp_code_hash (otp_code_hash),
  INDEX idx_otp_exp (otp_exp),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_rol (rol),
  INDEX idx_usuarios_id_entidad (id_entidad),
  CONSTRAINT fk_usuarios_entidad FOREIGN KEY (id_entidad)
    REFERENCES entidades(id_entidad) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: categorias_riesgo
-- ============================================================================
CREATE TABLE IF NOT EXISTS categorias_riesgo (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  icono VARCHAR(255) NULL,
  color_hex VARCHAR(7) NULL,
  nivel_prioridad_default INT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  
  -- Indexes
  INDEX idx_codigo (codigo),
  INDEX idx_activo (activo),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: reportes
-- ============================================================================
CREATE TABLE IF NOT EXISTS reportes (
  id_reporte BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  tipo_contaminacion VARCHAR(50) NOT NULL,
  subcategoria VARCHAR(100) NULL,
  estado ENUM('pendiente', 'en_revision', 'verificado', 'en_proceso', 'rechazado', 'resuelto') DEFAULT 'pendiente',
  nivel_severidad ENUM('bajo', 'medio', 'alto', 'critico') DEFAULT 'medio',
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  latitud DECIMAL(10, 8) NULL,
  longitud DECIMAL(11, 8) NULL,
  punto_geo POINT SRID 4326 NULL,
  direccion VARCHAR(255) NULL,
  municipio VARCHAR(100) NULL,
  departamento VARCHAR(100) NULL,
  votos_relevancia INT DEFAULT 0,
  vistas INT DEFAULT 0,
  ia_etiquetas JSON NULL,
  ia_confianza DECIMAL(5, 2) NULL,
  ia_procesado BOOLEAN DEFAULT FALSE,
  confianza_evidencia TINYINT UNSIGNED NULL DEFAULT NULL,
  comentario_moderacion TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  
  -- Foreign Keys
  CONSTRAINT fk_reportes_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
  
  -- Indexes
  INDEX idx_uuid (uuid),
  INDEX idx_usuario (id_usuario),
  INDEX idx_estado (estado),
  INDEX idx_tipo_contaminacion (tipo_contaminacion),
  INDEX idx_nivel_severidad (nivel_severidad),
  INDEX idx_municipio (municipio),
  INDEX idx_created_at (created_at),
  INDEX idx_comentario_moderacion (comentario_moderacion(100)),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_reportes_estado_created_at (estado, created_at),
  INDEX idx_reportes_tipo_created_at (tipo_contaminacion, created_at),
  INDEX idx_reportes_confianza_evidencia (confianza_evidencia),
  INDEX idx_reportes_latitud_longitud (latitud, longitud),
  SPATIAL INDEX idx_punto_geo (punto_geo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: reporte_entidades
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporte_entidades (
  id_reporte_entidad BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_entidad INT NOT NULL,
  tipo_asignacion ENUM('principal', 'apoyo') NOT NULL DEFAULT 'principal',
  prioridad ENUM('baja', 'media', 'alta', 'critica') NOT NULL DEFAULT 'media',
  estado_atencion ENUM('pendiente', 'en_atencion', 'atendido', 'cerrado') NOT NULL DEFAULT 'pendiente',
  comentario TEXT NULL,
  asignado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_reporte_entidades_reporte FOREIGN KEY (id_reporte)
    REFERENCES reportes(id_reporte) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reporte_entidades_entidad FOREIGN KEY (id_entidad)
    REFERENCES entidades(id_entidad) ON DELETE CASCADE ON UPDATE CASCADE,

  UNIQUE KEY unique_reporte_entidad (id_reporte, id_entidad),
  INDEX idx_reporte_entidades_reporte (id_reporte),
  INDEX idx_reporte_entidades_entidad (id_entidad),
  INDEX idx_reporte_entidades_tipo (tipo_asignacion),
  INDEX idx_reporte_entidades_prioridad (prioridad),
  INDEX idx_reporte_entidades_estado_atencion (estado_atencion),
  INDEX idx_reporte_entidades_asignado_at (asignado_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: evidencias
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidencias (
  id_evidencia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  tipo_archivo VARCHAR(50) NULL,
  url_archivo VARCHAR(512) NOT NULL,
  nombre_original VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  tamano_bytes BIGINT NULL,
  hash_sha256 VARCHAR(64) NULL,
  storage_provider ENUM('local', 'cloudinary') NOT NULL DEFAULT 'cloudinary',
  cloudinary_public_id VARCHAR(255) NULL,
  cloudinary_asset_id VARCHAR(255) NULL,
  cloudinary_resource_type VARCHAR(50) NULL,
  cloudinary_metadata JSON NULL,
  metadatos_exif JSON NULL,
  ia_analisis TEXT NULL,
  ia_procesado BOOLEAN DEFAULT FALSE,
  verificado BOOLEAN DEFAULT FALSE,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  
  -- Foreign Keys
  CONSTRAINT fk_evidencias_reporte FOREIGN KEY (id_reporte) 
    REFERENCES reportes(id_reporte) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_evidencias_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
  
  -- Indexes
  INDEX idx_uuid (uuid),
  INDEX idx_reporte (id_reporte),
  INDEX idx_usuario (id_usuario),
  INDEX idx_hash_sha256 (hash_sha256),
  INDEX idx_storage_provider (storage_provider),
  INDEX idx_cloudinary_public_id (cloudinary_public_id),
  INDEX idx_created_at (created_at),
  INDEX idx_orden (orden),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: refresh_tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id_refresh_token BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_refresh_tokens_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_refresh_token_hash (token_hash),
  INDEX idx_refresh_usuario (id_usuario),
  INDEX idx_refresh_expires_at (expires_at),
  INDEX idx_refresh_revoked_at (revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: reporte_likes
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporte_likes (
  id_like BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reporte_likes_reporte FOREIGN KEY (id_reporte)
    REFERENCES reportes(id_reporte) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reporte_likes_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,

  UNIQUE KEY uk_reporte_likes_reporte_usuario (id_reporte, id_usuario),
  INDEX idx_reporte_likes_usuario (id_usuario),
  INDEX idx_reporte_likes_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: reporte_vistas
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporte_vistas (
  id_vista BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reporte_vistas_reporte FOREIGN KEY (id_reporte)
    REFERENCES reportes(id_reporte) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reporte_vistas_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,

  UNIQUE KEY uk_reporte_vistas_reporte_usuario (id_reporte, id_usuario),
  INDEX idx_reporte_vistas_usuario (id_usuario),
  INDEX idx_reporte_vistas_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: notificaciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  tipo ENUM('reporte_estado', 'reporte_comentario', 'reporte_creado', 'reporte_asignado_entidad', 'alerta_zona', 'sistema') NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  referencia_tipo VARCHAR(30) NULL,
  referencia_uuid VARCHAR(36) NULL,
  link VARCHAR(255) NULL,
  leida BOOLEAN DEFAULT FALSE,
  leida_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_notificaciones_usuario_leida (id_usuario, leida, created_at),
  INDEX idx_notificaciones_uuid (uuid),
  INDEX idx_notificaciones_referencia (referencia_tipo, referencia_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: fcm_tokens
-- ============================================================================
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

-- ============================================================================
-- VIEWS (Optional, for common queries)
-- ============================================================================

-- Active usuarios only
CREATE OR REPLACE VIEW v_usuarios_activos AS
SELECT * FROM usuarios 
WHERE deleted_at IS NULL AND activo = TRUE;

-- Reports with author information
CREATE OR REPLACE VIEW v_reportes_con_autor AS
SELECT 
  r.*,
  u.nombre AS autor_nombre,
  u.apellido AS autor_apellido,
  u.email AS autor_email,
  u.rol AS autor_rol
FROM reportes r
LEFT JOIN usuarios u ON u.id_usuario = r.id_usuario
WHERE r.deleted_at IS NULL;

-- Reports with evidence count
CREATE OR REPLACE VIEW v_reportes_con_evidencias AS
SELECT 
  r.id_reporte,
  r.uuid,
  r.titulo,
  r.estado,
  r.municipio,
  COUNT(e.id_evidencia) AS evidencia_count
FROM reportes r
LEFT JOIN evidencias e ON e.id_reporte = r.id_reporte AND e.deleted_at IS NULL
WHERE r.deleted_at IS NULL
GROUP BY r.id_reporte, r.uuid, r.titulo, r.estado, r.municipio;

-- ============================================================================
-- SEED DATA (Sample categories)
-- ============================================================================

INSERT INTO entidades
(nombre, codigo, descripcion)
VALUES
('Bomberos', 'bomberos', 'Entidad encargada de la atencion de incendios, quemas activas, emergencias, explosiones, derrames peligrosos y materiales inflamables.'),
('Corpoamazonia', 'corpoamazonia', 'Autoridad ambiental regional encargada de contaminacion ambiental, vertimientos, tala ilegal, deforestacion, fauna, flora, mineria ilegal y afectaciones a ecosistemas.'),
('Gestion del Riesgo', 'gestion_riesgo', 'Entidad encargada de amenazas, emergencias, desastres naturales, avalanchas, deslizamientos, inundaciones, crecientes subitas, derrames graves y eventos criticos.'),
('Secretaria de Salud', 'secretaria_salud', 'Entidad encargada de riesgos sanitarios, basuras con afectacion a la salud publica, aguas residuales, malos olores, residuos hospitalarios y proliferacion de vectores.'),
('Alcaldia / Servicios Publicos', 'alcaldia_servicios_publicos', 'Entidad encargada de la atencion operativa de residuos urbanos, basura en via publica, escombros, alcantarillado, espacio publico y mantenimiento municipal.')
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

INSERT IGNORE INTO categorias_riesgo 
(id_categoria, codigo, nombre, descripcion, icono, color_hex, nivel_prioridad_default, activo) 
VALUES 
(1, 'inundacion', 'Inundación', 'Riesgo de inundación o anegamiento', '🌊', '#0066FF', 3, TRUE),
(3, 'incendio', 'Incendio', 'Riesgo de incendio forestal o urbano', '🔥', '#FF0000', 1, TRUE),
(4, 'contaminacion_aire', 'Contaminación de Aire', 'Contaminación atmosférica', '💨', '#9933FF', 2, TRUE),
(5, 'contaminacion_agua', 'Contaminación de Agua', 'Contaminación de ríos, lagos o acuíferos', '💧', '#3399FF', 2, TRUE),
(6, 'deforestacion', 'Deforestación', 'Tala ilegal o pérdida de cobertura forestal', '🌳', '#00AA44', 2, TRUE),
(7, 'contaminacion_suelo', 'Contaminación de Suelo', 'Degradación o contaminación del suelo', '⛰️', '#996633', 2, TRUE),
(8, 'basura', 'Gestión de Residuos', 'Acumulación de basura o residuos', '🗑️', '#666666', 1, TRUE);

-- ============================================================================
-- STORED PROCEDURES (Optional, for common operations)
-- ============================================================================

-- Get reports by geographic radius
DELIMITER //
CREATE PROCEDURE sp_reportes_por_radio(
  IN p_latitude DECIMAL(10, 8),
  IN p_longitude DECIMAL(11, 8),
  IN p_radio_km INT
)
BEGIN
  SELECT 
    r.id_reporte,
    r.uuid,
    r.titulo,
    r.estado,
    r.latitud,
    r.longitud,
    r.municipio,
    u.nombre,
    u.apellido,
    ST_Distance_Sphere(r.punto_geo, 
      ST_GeomFromText(CONCAT('POINT(', p_longitude, ' ', p_latitude, ')'), 4326)
    ) / 1000 AS distancia_km
  FROM reportes r
  LEFT JOIN usuarios u ON u.id_usuario = r.id_usuario
  WHERE r.deleted_at IS NULL
    AND ST_Distance_Sphere(r.punto_geo, 
      ST_GeomFromText(CONCAT('POINT(', p_longitude, ' ', p_latitude, ')'), 4326)
    ) / 1000 <= p_radio_km
  ORDER BY distancia_km ASC;
END//
DELIMITER ;

-- Get user statistics
DELIMITER //
CREATE PROCEDURE sp_estadisticas_usuarios()
BEGIN
  SELECT 
    COUNT(*) AS total,
    SUM(CASE WHEN rol = 'ciudadano' THEN 1 ELSE 0 END) AS ciudadanos,
    SUM(CASE WHEN rol = 'moderador' THEN 1 ELSE 0 END) AS moderadores,
    SUM(CASE WHEN rol = 'admin' THEN 1 ELSE 0 END) AS admins,
    SUM(CASE WHEN activo = TRUE THEN 1 ELSE 0 END) AS activos,
    SUM(CASE WHEN activo = FALSE THEN 1 ELSE 0 END) AS inactivos
  FROM usuarios
  WHERE deleted_at IS NULL;
END//
DELIMITER ;

-- ============================================================================
-- NOTES
-- ============================================================================
/*
1. UUID Generation:
   - Generate UUID v4 on application side before INSERT
   - Example in Node.js: const uuid = require('uuid').v4();

2. Password Hashing:
   - Use crypto.scryptSync for password hashing
   - Format: salt:derivedKey (both hex encoded)
   - Example: '8a5c3f....:ab2d9e....'

3. OTP Hashing:
   - Hash 6-digit OTP code with SHA-256
   - Store hash in otp_code_hash
   - Example: crypto.createHash('sha256').update(otpCode).digest('hex')

4. Token Hashing (Reset, Verification):
   - Hash tokens with SHA-256 before storage
   - Store expiration times in UTC

5. Geographic Data:
   - Store both lat/lon and POINT geometry
   - POINT format must be: ST_GeomFromText('POINT(longitude latitude)', 4326)
   - Note: longitude comes FIRST in POINT format

6. Soft Deletes:
   - Always filter with: WHERE deleted_at IS NULL
   - Never physically delete user data

7. Pagination:
   - Use LIMIT and OFFSET for large result sets
   - Recommended: limit=20, offset=0

8. Indexes:
   - Added for frequently searched columns
   - Consider performance for SPATIAL queries
*/
