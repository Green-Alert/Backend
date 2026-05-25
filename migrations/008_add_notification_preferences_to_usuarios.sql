-- Migracion: Persistir preferencias de notificaciones del usuario
-- Descripcion: Agrega una columna JSON para guardar preferencias configurables.

ALTER TABLE usuarios
  ADD COLUMN notification_preferences JSON NULL AFTER telefono;
