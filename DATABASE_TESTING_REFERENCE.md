# 🧪 Database Testing Reference Guide

## Quick Summary

| Table | Fields | FK Count | Soft Delete | Indexes |
|-------|--------|----------|-------------|---------|
| **usuarios** | 20 | 0 | ✅ | 6 |
| **categorias_riesgo** | 11 | 0 | ✅ | 3 |
| **reportes** | 23 | 1 | ✅ | 9 |
| **evidencias** | 14 | 2 | ✅ | 7 |

---

## Field Reference by Table

### 1. USUARIOS - Minimal Test Insert
```sql
INSERT INTO usuarios (
  uuid, nombre, apellido, email, password_hash, rol, activo
) VALUES (
  UUID(), 'Juan', 'Pérez', 'juan@test.com', 'salt:hash', 'ciudadano', 1
);
```

**Required Fields (for register):**
- `nombre` (2+ characters)
- `apellido` (2+ characters)
- `email` (valid format, unique)
- `password_hash` (hashed with crypto.scryptSync)

**Auto-Generated/Default:**
- `id_usuario` (AUTO_INCREMENT)
- `uuid` (must generate as UUID v4)
- `rol` = 'ciudadano'
- `activo` = TRUE
- `email_verificado` = FALSE
- `created_at`, `updated_at` (CURRENT_TIMESTAMP)

**Optional for Registration:**
- `telefono`
- `avatar_url`

**For Password Reset:**
- `token_reset` (SHA-256 hash)
- `token_reset_exp` (NOW() + 30 min)

**For OTP Verification:**
- `otp_code_hash` (SHA-256 hash of 6-digit)
- `otp_exp` (NOW() + 10 min)
- `otp_attempts` (incremented on failed)
- `otp_last_request` (for cooldown)

---

### 2. CATEGORIAS_RIESGO - Sample Test Data
```sql
INSERT INTO categorias_riesgo (codigo, nombre, descripcion, color_hex) VALUES 
('inundacion', 'Inundación', 'Riesgo de inundación', '#0066FF'),
('deforestacion', 'Deforestación', 'Tala ilegal de bosques', '#00AA44'),
('incendio', 'Incendio', 'Riesgo de incendio forestal', '#FF0000');
```

**Required Fields:**
- `codigo` (unique, used as foreign key in reportes)
- `nombre` (display name)

**Optional for Full Metadata:**
- `descripcion`
- `icono` (emoji or URL)
- `color_hex` (for UI rendering)
- `nivel_prioridad_default`

**Note:** Use `codigo` field when creating reportes, NOT `id_categoria`

---

### 3. REPORTES - Minimal Test Insert
```sql
INSERT INTO reportes (
  uuid, id_usuario, tipo_contaminacion, titulo, 
  latitud, longitud, punto_geo
) VALUES (
  UUID(), 1, 'deforestacion', 'Tala en zona protegida',
  4.7110, -74.0721, ST_GeomFromText('POINT(-74.0721 4.7110)', 4326)
);
```

**Required Fields:**
- `id_usuario` (must exist in usuarios table)
- `tipo_contaminacion` (must match categorias_riesgo.codigo)
- `titulo` (report title)

**Auto-Generated/Default:**
- `id_reporte` (AUTO_INCREMENT)
- `uuid` (must generate as UUID v4)
- `estado` = 'en_revision'
- `nivel_severidad` = 'medio'
- `votos_relevancia` = 0
- `vistas` = 0
- `created_at`, `updated_at` (CURRENT_TIMESTAMP)

**Optional Location Data:**
- `latitud`, `longitud` (DECIMAL, 8 decimals)
- `punto_geo` (auto-generated from lat/lon)
- `direccion`
- `municipio`
- `departamento`

**Optional Content:**
- `descripcion` (detailed report)

**For Moderation:**
- `comentario_moderacion` (reason for status change)
- `estado` (change to: verificado, en_proceso, rechazado, resuelto)

**For AI Processing:**
- `ia_etiquetas` (JSON or CSV)
- `ia_confianza` (0.00 to 1.00)
- `ia_procesado` = TRUE

---

### 4. EVIDENCIAS - Minimal Test Insert
```sql
INSERT INTO evidencias (
  uuid, id_reporte, id_usuario, tipo_archivo, url_archivo
) VALUES (
  UUID(), 1, 1, 'image', 'https://storage.example.com/img.jpg'
);
```

**Required Fields:**
- `id_reporte` (must exist in reportes table)
- `id_usuario` (uploader)
- `url_archivo` (cloud storage URL)

**Auto-Generated/Default:**
- `id_evidencia` (AUTO_INCREMENT)
- `uuid` (must generate as UUID v4)
- `orden` = 0
- `created_at` (CURRENT_TIMESTAMP)

**Optional Metadata:**
- `tipo_archivo` (image, video, document, audio)
- `nombre_original` (original filename)
- `mime_type` (image/jpeg, application/pdf, etc.)
- `tamano_bytes` (file size)
- `hash_sha256` (for deduplication)

**For Images:**
- `metadatos_exif` (JSON: camera, GPS, timestamp, etc.)

**For AI Analysis:**
- `ia_analisis` (JSON with detection results)
- `ia_procesado` = TRUE

**For Verification:**
- `verificado` = TRUE (by moderator)

---

## Common Test Queries

### Get All Active Users with Reports
```sql
SELECT 
  u.id_usuario, u.nombre, u.email, COUNT(r.id_reporte) AS report_count
FROM usuarios u
LEFT JOIN reportes r ON r.id_usuario = u.id_usuario AND r.deleted_at IS NULL
WHERE u.deleted_at IS NULL AND u.activo = TRUE
GROUP BY u.id_usuario;
```

### Get Reports by Municipality
```sql
SELECT 
  r.id_reporte, r.titulo, r.municipio, r.estado,
  c.nombre AS categoria, COUNT(e.id_evidencia) AS evidencia_count
FROM reportes r
LEFT JOIN categorias_riesgo c ON c.codigo = r.tipo_contaminacion
LEFT JOIN evidencias e ON e.id_reporte = r.id_reporte AND e.deleted_at IS NULL
WHERE r.deleted_at IS NULL AND r.municipio = 'Bogotá'
GROUP BY r.id_reporte;
```

### Get Reports Within Geographic Radius
```sql
SELECT 
  r.id_reporte, r.titulo, r.municipio,
  ST_Distance_Sphere(r.punto_geo, 
    ST_GeomFromText('POINT(-74.0721 4.7110)', 4326)
  ) / 1000 AS km_from_center
FROM reportes r
WHERE r.deleted_at IS NULL
  AND ST_Distance_Sphere(r.punto_geo, 
    ST_GeomFromText('POINT(-74.0721 4.7110)', 4326)
  ) / 1000 <= 5
ORDER BY km_from_center ASC;
```

### Get User's Own Reports with Evidence
```sql
SELECT 
  r.id_reporte, r.titulo, r.estado, r.created_at,
  GROUP_CONCAT(e.url_archivo) AS evidencia_urls
FROM reportes r
LEFT JOIN evidencias e ON e.id_reporte = r.id_reporte AND e.deleted_at IS NULL
WHERE r.id_usuario = 1 AND r.deleted_at IS NULL
GROUP BY r.id_reporte
ORDER BY r.created_at DESC;
```

### Get Verification Status of OTP
```sql
SELECT 
  id_usuario, email, email_verificado, otp_exp,
  CASE 
    WHEN otp_exp IS NULL THEN 'No OTP'
    WHEN otp_exp > NOW() THEN 'OTP Valid'
    ELSE 'OTP Expired'
  END AS otp_status,
  otp_attempts
FROM usuarios
WHERE deleted_at IS NULL;
```

---

## Test Data Setup Script

```sql
-- Clear test data (careful!)
-- DELETE FROM evidencias;
-- DELETE FROM reportes;
-- DELETE FROM usuarios;
-- ALTER TABLE usuarios AUTO_INCREMENT = 1;

-- Insert test users
INSERT INTO usuarios (uuid, nombre, apellido, email, password_hash, rol, activo)
VALUES 
(UUID(), 'Admin', 'Test', 'admin@test.com', 'hash1', 'admin', 1),
(UUID(), 'Mod', 'Test', 'mod@test.com', 'hash2', 'moderador', 1),
(UUID(), 'User', 'Test', 'user@test.com', 'hash3', 'ciudadano', 1);

-- Insert test categories (if not exists)
INSERT IGNORE INTO categorias_riesgo (codigo, nombre, color_hex)
VALUES 
('test_cat1', 'Test Category 1', '#FF0000'),
('test_cat2', 'Test Category 2', '#00FF00');

-- Insert test reports
INSERT INTO reportes (uuid, id_usuario, tipo_contaminacion, titulo, 
                      latitud, longitud, punto_geo, municipio)
VALUES 
(UUID(), 3, 'test_cat1', 'Test Report 1',
 4.7110, -74.0721, ST_GeomFromText('POINT(-74.0721 4.7110)', 4326), 'Bogotá'),
(UUID(), 3, 'test_cat2', 'Test Report 2',
 4.6097, -74.0817, ST_GeomFromText('POINT(-74.0817 4.6097)', 4326), 'Bogotá');

-- Insert test evidence
INSERT INTO evidencias (uuid, id_reporte, id_usuario, tipo_archivo, url_archivo)
SELECT UUID(), r.id_reporte, r.id_usuario, 'image', 
       CONCAT('https://example.com/evidence/', r.id_reporte, '.jpg')
FROM reportes r LIMIT 2;
```

---

## Field Value Enums & Constants

### Usuario.rol
- `ciudadano` (default)
- `moderador`
- `admin`

### Reporte.estado
- `pendiente`
- `en_revision` (default)
- `verificado`
- `en_proceso`
- `rechazado`
- `resuelto`

### Reporte.nivel_severidad
- `bajo`
- `medio` (default)
- `alto`
- `critico`

### Evidencia.tipo_archivo
- `image`
- `video`
- `document`
- `audio`

---

## Important Validation Rules

### USUARIOS
- `nombre` / `apellido`: 2-100 characters
- `email`: Valid email format, unique
- `password_hash`: Must be stored as `salt:derivedKey`
- `telefono`: Optional, max 20 characters
- `otp_code_hash`: 6-digit codes hashed to 64 chars

### REPORTES
- `titulo`: 1-255 characters (not empty)
- `latitud`: -90 to +90 (DECIMAL 10,8)
- `longitud`: -180 to +180 (DECIMAL 11,8)
- `municipio`: Common Colombian municipalities
- `nivel_severidad`: Must be one of the enum values

### EVIDENCIAS
- `url_archivo`: Valid URL (not empty)
- `tamano_bytes`: Should not exceed storage limits
- `mime_type`: Standard MIME types

---

## Performance Considerations

### For Large Datasets:
1. Always use pagination with LIMIT/OFFSET
2. Use INDEXED columns in WHERE clauses
3. Avoid SELECT * - specify columns needed
4. Use SPATIAL INDEX for geographic queries
5. Monitor created_at indexes for time-range queries

### Typical Query Performance:
- Finding user by email: ~1ms (indexed)
- Getting reports by municipio: ~50ms (indexed)
- Geographic radius query: ~200ms (SPATIAL indexed)

---

## Soft Delete Recovery

If needed to recover soft-deleted records:
```sql
-- Check soft-deleted records
SELECT * FROM usuarios WHERE deleted_at IS NOT NULL;

-- Recover soft-deleted user
UPDATE usuarios SET deleted_at = NULL WHERE id_usuario = X;
```

---

## Additional Notes for Testing

1. **Always generate UUIDs on application side** - Don't rely on MYSQL UUID()
2. **OTP expires in 10 minutes** - Set expiration accordingly
3. **Reset tokens expire in 30 minutes** - Adjust test timing
4. **Geographic queries use POINT(longitude latitude)** - Note the order!
5. **All SELECT queries should filter deleted_at IS NULL** - Always apply soft delete logic

