-- Migracion: agregar metadata de Cloudinary a evidencias
-- Permite guardar URLs y public_id para futuras operaciones de limpieza.

ALTER TABLE evidencias
  MODIFY COLUMN url_archivo VARCHAR(512) NOT NULL,
  ADD COLUMN storage_provider ENUM('local', 'cloudinary') NOT NULL DEFAULT 'cloudinary' AFTER hash_sha256,
  ADD COLUMN cloudinary_public_id VARCHAR(255) NULL AFTER storage_provider,
  ADD COLUMN cloudinary_asset_id VARCHAR(255) NULL AFTER cloudinary_public_id,
  ADD COLUMN cloudinary_resource_type VARCHAR(50) NULL AFTER cloudinary_asset_id,
  ADD COLUMN cloudinary_metadata JSON NULL AFTER cloudinary_resource_type;

CREATE INDEX idx_storage_provider ON evidencias(storage_provider);
CREATE INDEX idx_cloudinary_public_id ON evidencias(cloudinary_public_id);
