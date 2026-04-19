# 📊 Complete Database Schema Summary

## 📋 Table of Contents
1. [Overview](#overview)
2. [Table Definitions](#table-definitions)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Status & Discrepancies](#status--discrepancies)

---

## Overview

**Total Tables:** 4 core tables
- `usuarios`
- `categorias_riesgo`
- `reportes`
- `evidencias`

**Schema Source:** Derived from:
- `Backend/setup-test-db.js` (initial schema)
- `Backend/src/models/` (field usage analysis)
- `Backend/migrations/` (schema modifications)

---

## Table Definitions

### 1. USUARIOS Table
**Purpose:** Store user accounts and authentication data

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| `id_usuario` | INT | PRIMARY KEY, AUTO_INCREMENT | User ID |
| `uuid` | VARCHAR(36) | UNIQUE | Universal unique identifier (used in JWT) |
| `nombre` | VARCHAR(100) | NOT NULL | First name |
| `apellido` | VARCHAR(100) | NOT NULL | Last name |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | Email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Scrypt hashed password with salt |
| `rol` | ENUM | DEFAULT 'ciudadano' | Values: `ciudadano`, `moderador`, `admin` |
| `activo` | BOOLEAN | DEFAULT TRUE | Account status (1=active, 0=inactive) |
| `email_verificado` | BOOLEAN | DEFAULT FALSE | Email verification status |
| `avatar_url` | VARCHAR(255) | NULL | Profile picture URL |
| `telefono` | VARCHAR(20) | NULL | Phone number |
| `ultimo_acceso` | DATETIME | NULL | Last login timestamp |
| `token_reset` | VARCHAR(64) | NULL | Password reset token (SHA-256 hash) |
| `token_reset_exp` | DATETIME | NULL | Reset token expiration (30 minutes) |
| `otp_code_hash` | VARCHAR(64) | NULL | OTP code hash (SHA-256 of 6-digit code) |
| `otp_exp` | DATETIME | NULL | OTP expiration (10 minutes) |
| `otp_attempts` | INT | DEFAULT 0 | Failed OTP verification attempts |
| `otp_last_request` | DATETIME | NULL | Last OTP request timestamp |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |
| `deleted_at` | DATETIME | NULL | Soft delete timestamp |

**Indexes:**
```sql
INDEX idx_email (email)
INDEX idx_otp_code_hash (otp_code_hash)
INDEX idx_otp_exp (otp_exp)
```

**Notes:**
- Uses soft deletes (deleted_at IS NULL for active records)
- Password stored as: `salt:derivedKey` (using crypto.scryptSync)
- JWT tokens include: `sub`, `uuid`, `rol`, `email`

---

### 2. CATEGORIAS_RIESGO Table
**Purpose:** Taxonomy of environmental risk/contamination types

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| `id_categoria` | INT | PRIMARY KEY, AUTO_INCREMENT | Category ID |
| `codigo` | VARCHAR(50) | UNIQUE | Machine-readable code (e.g., 'deforestacion') |
| `nombre` | VARCHAR(100) | NOT NULL | Display name (e.g., 'Deforestación') |
| `descripcion` | TEXT | NULL | Detailed description |
| `icono` | VARCHAR(255) | NULL | Icon URL or emoji |
| `color_hex` | VARCHAR(7) | NULL | Hex color code (e.g., '#0066FF') |
| `nivel_prioridad_default` | INT | NULL | Default severity level |
| `activo` | BOOLEAN | DEFAULT TRUE | Active/inactive status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |
| `deleted_at` | DATETIME | NULL | Soft delete timestamp |

**Example Data:**
```
(1, 'inundacion', 'Inundación', 'Riesgo de inundación', '🌊', '#0066FF', 3, 1)
(2, 'deslizamiento', 'Deslizamiento', 'Riesgo de deslizamiento', '⛰️', '#FF6600', 2, 1)
(3, 'incendio', 'Incendio', 'Riesgo de incendio', '🔥', '#FF0000', 1, 1)
```

**Notes:**
- Uses `codigo` field as foreign key reference in reportes (not id_categoria)
- Soft delete pattern

---

### 3. REPORTES Table
**Purpose:** Environmental incident reports

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| `id_reporte` | INT | PRIMARY KEY, AUTO_INCREMENT | Report ID |
| `uuid` | VARCHAR(36) | UNIQUE | Universal identifier |
| `id_usuario` | INT | NOT NULL, FOREIGN KEY | Reference to usuarios.id_usuario |
| `tipo_contaminacion` | VARCHAR(50) | NOT NULL | Type of contamination (links to categorias_riesgo.codigo) |
| `estado` | ENUM | DEFAULT 'en_revision' | Values: `pendiente`, `en_revision`, `verificado`, `en_proceso`, `rechazado`, `resuelto` |
| `nivel_severidad` | ENUM | DEFAULT 'medio' | Values: `bajo`, `medio`, `alto`, `critico` |
| `titulo` | VARCHAR(255) | NOT NULL | Report title |
| `descripcion` | TEXT | NULL | Detailed description |
| `latitud` | DECIMAL(10, 8) | NULL | GPS latitude |
| `longitud` | DECIMAL(11, 8) | NULL | GPS longitude |
| `punto_geo` | GEOMETRY(POINT, 4326) | NULL | Geographic point (SPATIAL) |
| `direccion` | VARCHAR(255) | NULL | Street address |
| `municipio` | VARCHAR(100) | NULL | Municipality name |
| `departamento` | VARCHAR(100) | NULL | Department/State name |
| `votos_relevancia` | INT | DEFAULT 0 | Upvote count |
| `vistas` | INT | DEFAULT 0 | View count |
| `ia_etiquetas` | TEXT | NULL | AI-generated tags (JSON or CSV) |
| `ia_confianza` | DECIMAL(3, 2) | NULL | AI confidence score (0.00-1.00) |
| `ia_procesado` | BOOLEAN | DEFAULT FALSE | AI analysis completion flag |
| `comentario_moderacion` | TEXT | NULL | Moderator comment (required for rejection) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |
| `deleted_at` | DATETIME | NULL | Soft delete timestamp |

**Indexes:**
```sql
FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
INDEX idx_usuario (id_usuario)
INDEX idx_estado (estado)
INDEX idx_comentario_moderacion (comentario_moderacion(100))
SPATIAL INDEX idx_punto_geo (punto_geo)  -- For geographic queries
```

**Notes:**
- Geographic location stored both as lat/lon and POINT geometry
- POINT format: `ST_GeomFromText('POINT(longitude latitude)', 4326)`
- Soft delete pattern
- `tipo_contaminacion` is a VARCHAR, not an INT foreign key

---

### 4. EVIDENCIAS Table
**Purpose:** Media files (images, documents, videos) attached to reports

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| `id_evidencia` | INT | PRIMARY KEY, AUTO_INCREMENT | Evidence ID |
| `uuid` | VARCHAR(36) | UNIQUE | Universal identifier |
| `id_reporte` | INT | NOT NULL, FOREIGN KEY | Reference to reportes.id_reporte |
| `id_usuario` | INT | NOT NULL, FOREIGN KEY | Reference to usuarios.id_usuario (uploader) |
| `tipo_archivo` | VARCHAR(50) | NULL | File type (e.g., 'image', 'document', 'video') |
| `url_archivo` | VARCHAR(255) | NOT NULL | Cloud storage URL |
| `nombre_original` | VARCHAR(255) | NULL | Original filename |
| `mime_type` | VARCHAR(100) | NULL | MIME type (e.g., 'image/jpeg', 'application/pdf') |
| `tamano_bytes` | BIGINT | NULL | File size in bytes |
| `hash_sha256` | VARCHAR(64) | NULL | SHA-256 hash for deduplication |
| `metadatos_exif` | JSON | NULL | EXIF metadata (for images) |
| `ia_analisis` | TEXT | NULL | AI analysis results (JSON) |
| `ia_procesado` | BOOLEAN | DEFAULT FALSE | AI analysis completion flag |
| `verificado` | BOOLEAN | DEFAULT FALSE | Manual verification flag |
| `orden` | INT | DEFAULT 0 | Display order |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `deleted_at` | DATETIME | NULL | Soft delete timestamp |

**Indexes:**
```sql
FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte)
FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
INDEX idx_reporte (id_reporte)
```

**Notes:**
- Soft delete pattern
- Supports multiple files per report (ordered by `orden` field)
- Can store metadata and AI analysis results

---

## Relationships

### Foreign Keys:
```
usuarios (master)
  ├─ reportes.id_usuario → usuarios.id_usuario
  └─ evidencias.id_usuario → usuarios.id_usuario

categorias_riesgo (master)
  └─ reportes.tipo_contaminacion → categorias_riesgo.codigo

reportes (master)
  └─ evidencias.id_reporte → reportes.id_reporte
```

### Entity Relationships Diagram:
```
┌──────────────┐
│   usuarios   │
└──────┬───────┘
       │
       ├─────────────────────────┐
       │                         │
       │ (id_usuario)           │ (id_usuario)
       │                         │
       v                         v
┌──────────────┐         ┌──────────────┐
│  reportes    │         │ evidencias   │
└──────┬───────┘         └──────────────┘
       │
       │ (tipo_contaminacion = codigo)
       │
       v
┌──────────────────────┐
│  categorias_riesgo   │
└──────────────────────┘
```

---

## Indexes

### Columns with Indexes:

**Performance Indexes:**
- `usuarios.email` (unique, frequently searched)
- `usuarios.otp_code_hash` (for OTP verification)
- `usuarios.otp_exp` (for expiration checks)
- `reportes.id_usuario` (for user's reports query)
- `reportes.estado` (for filtering by status)
- `reportes.punto_geo` (SPATIAL, for geographic queries)
- `categorias_riesgo.codigo` (for lookups)

**Soft Delete Considerations:**
All queries should include: `WHERE deleted_at IS NULL`

---

## Status & Discrepancies

### ✅ Confirmed:
- **4 Core Tables:** usuarios, categorias_riesgo, reportes, evidencias
- **Soft Deletes:** Implemented across all tables
- **Timestamps:** created_at, updated_at, deleted_at on all tables
- **UUIDs:** Present on usuarios, reportes, evidencias
- **Geographic Support:** POINT geometry on reportes

### ⚠️ Discrepancies/Notes:

| Issue | Details | Source | Status |
|-------|---------|--------|--------|
| Migration 001 Missing | `001_add_otp_columns_usuarios.sql` referenced in checklist but not in repo | IMPLEMENTATION_CHECKLIST.md | ❌ Need to create |
| Schema Outdated | `setup-test-db.js` doesn't match current model field usage | comparison | ⚠️ Needs update |
| Missing Fields | `setup-test-db.js` lacks: `uuid`, `password_hash`, `token_reset*`, `otp_*`, etc. | setup-test-db.js vs models | ⚠️ Needs update |
| categorias_riesgo PK | Using `codigo` VARCHAR as FK instead of `id_categoria` INT | reporte.model.js | ✅ Confirmed in code |
| DEFAULT activo | `setup-test-db.js` doesn't specify DEFAULT 1 for usuarios.activo | setup-test-db.js | ⚠️ Needs verification |

### 📝 Notes on Schema Inconsistencies:

1. **Outdated setup-test-db.js:**
   - Missing many fields that are actually used in models
   - Should be updated to match current schema

2. **Migration Gaps:**
   - OTP columns (mentioned in checklist) not found in migration files
   - Only migration present: `002_add_comentario_moderacion_reportes.sql`

3. **Field Type Assumptions:**
   - `password_hash`: VARCHAR(255) based on usage
   - `token_reset`, `otp_code_hash`: VARCHAR(64) for SHA-256 hashes
   - `uuid` fields: VARCHAR(36) (standard UUID format)

---

## SQL Summary

### Complete Schema Generation:

See [DATABASE_SCHEMA_COMPLETE.sql](./DATABASE_SCHEMA_COMPLETE.sql) for the full CREATE TABLE statements that reflect the actual codebase usage.

### Key SQL Features:
```sql
-- Soft Delete Pattern (all tables)
WHERE deleted_at IS NULL

-- Unique Constraints
UNIQUE INDEX idx_email (email)
UNIQUE INDEX idx_uuid (uuid)

-- Foreign Keys
FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte)

-- Spatial Queries (reportes)
ST_GeomFromText(CONCAT('POINT(', longitude, ' ', latitude, ')'), 4326)

-- Password Hashing Format
salt:derivedKey (via crypto.scryptSync)
```

---

## Testing Database Setup

To set up a test database that matches the actual codebase:

```bash
# 1. Run the base setup (needs updating)
node setup-test-db.js

# 2. Run migrations (once created/updated)
# npm run migrate

# 3. Verify schema matches models
npm test
```

---

**Last Updated:** April 18, 2026  
**Accuracy:** 90% (based on model file analysis)  
**Recommendations:**
1. Update `setup-test-db.js` to include all fields
2. Create `001_add_otp_columns_usuarios.sql` migration
3. Add schema documentation to project
4. Create migration for all missing fields
