-- Migración: Agregar columnas OTP para verificación de email
-- Descripción: Añade soporte para verificación de email mediante OTP de 6 dígitos

ALTER TABLE usuarios
ADD COLUMN otp_code_hash VARCHAR(64) NULL DEFAULT NULL COMMENT 'Hash SHA-256 del código OTP',
ADD COLUMN otp_exp DATETIME NULL DEFAULT NULL COMMENT 'Fecha de expiración del OTP (10 minutos)',
ADD COLUMN otp_attempts INT DEFAULT 0 COMMENT 'Contador de intentos fallidos',
ADD COLUMN otp_last_request DATETIME NULL DEFAULT NULL COMMENT 'Timestamp del último reenvío solicitado';

-- Crear índice para búsquedas rápidas de OTP
CREATE INDEX idx_otp_code_hash ON usuarios(otp_code_hash);
CREATE INDEX idx_otp_exp ON usuarios(otp_exp);
