-- ============================================================================
-- Green Alert Database - Complete Schema
-- ============================================================================
-- This schema reflects the actual field usage in the codebase
-- Generated from: models, controllers, and migration files
-- Date: April 18, 2026
-- ============================================================================

-- Drop existing tables (use with caution!)
-- DROP TABLE IF EXISTS evidencias;
-- DROP TABLE IF EXISTS reportes;
-- DROP TABLE IF EXISTS categorias_riesgo;
-- DROP TABLE IF EXISTS usuarios;

-- ============================================================================
-- TABLE: usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ciudadano', 'moderador', 'admin') DEFAULT 'ciudadano',
  activo BOOLEAN DEFAULT TRUE,
  email_verificado BOOLEAN DEFAULT FALSE,
  avatar_url VARCHAR(255) NULL,
  telefono VARCHAR(20) NULL,
  ultimo_acceso DATETIME NULL,
  token_reset VARCHAR(64) NULL,
  token_reset_exp DATETIME NULL,
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
  INDEX idx_otp_code_hash (otp_code_hash),
  INDEX idx_otp_exp (otp_exp),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_rol (rol)
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
  id_reporte INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  id_usuario INT NOT NULL,
  tipo_contaminacion VARCHAR(50) NOT NULL,
  estado ENUM('pendiente', 'en_revision', 'verificado', 'en_proceso', 'rechazado', 'resuelto') DEFAULT 'en_revision',
  nivel_severidad ENUM('bajo', 'medio', 'alto', 'critico') DEFAULT 'medio',
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  latitud DECIMAL(10, 8) NULL,
  longitud DECIMAL(11, 8) NULL,
  punto_geo GEOMETRY(POINT, 4326) NULL,
  direccion VARCHAR(255) NULL,
  municipio VARCHAR(100) NULL,
  departamento VARCHAR(100) NULL,
  votos_relevancia INT DEFAULT 0,
  vistas INT DEFAULT 0,
  ia_etiquetas TEXT NULL,
  ia_confianza DECIMAL(3, 2) NULL,
  ia_procesado BOOLEAN DEFAULT FALSE,
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
  SPATIAL INDEX idx_punto_geo (punto_geo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: evidencias
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidencias (
  id_evidencia INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  id_reporte INT NOT NULL,
  id_usuario INT NOT NULL,
  tipo_archivo VARCHAR(50) NULL,
  url_archivo VARCHAR(255) NOT NULL,
  nombre_original VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  tamano_bytes BIGINT NULL,
  hash_sha256 VARCHAR(64) NULL,
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
  INDEX idx_created_at (created_at),
  INDEX idx_orden (orden),
  INDEX idx_deleted_at (deleted_at)
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
GROUP BY r.id_reporte;

-- ============================================================================
-- SEED DATA (Sample categories)
-- ============================================================================

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
CREATE PROCEDURE IF NOT EXISTS sp_reportes_por_radio(
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
CREATE PROCEDURE IF NOT EXISTS sp_estadisticas_usuarios()
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
