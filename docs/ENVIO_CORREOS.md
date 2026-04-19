# Sistema de Envío de Correos de Bienvenida

## Descripción
Sistema de correo de bienvenida enviado automáticamente cuando un usuario se registra correctamente. El envío es **no-bloqueante** para no afectar la UX.

## Características Implementadas

### 1. **Envío No-Bloqueante**
- El correo se envía en background (fire-and-forget)
- La respuesta de registro llega sin esperar la confirmación de envío
- Los errores de envío se loguean pero no rompen el flujo

### 2. **Template HTML Profesional**
- Diseño responsivo y moderno
- Colores en línea con la marca de GreenAlert (verde)
- Información clara sobre funcionalidades
- Enlaces a la plataforma

### 3. **Manejo Robusto de Errores**
- Los errores de SMTP no impieden el registro
- Se loguean en consola para debugging
- La función retorna `false` si falla sin lanzar excepciones

## Configuración Requerida

Asegúrate de tener estas variables en tu `.env`:

```env
# SMTP Configuration
SMTP_HOST=tu-servidor-smtp.com
SMTP_PORT=587        # o 465 para SSL
SMTP_USER=tu-email@ejemplo.com
SMTP_PASS=tu-contraseña-app

# URLs
FRONTEND_URL=http://localhost:5173     # o tu dominio en producción

# App Name (opcional, por defecto es "GreenAlert")
APP_NAME=GreenAlert
```

### Proveedores Recomendados:
- **Gmail**: uses `smtp.gmail.com:587` (requiere contraseña de aplicación)
- **SendGrid**: SMTP elegante configurado desde su panel
- **Resend**: Alternative moderno con SPA
- **Mailtrap**: Para testing en desarrollo

## Función de Envío de Bienvenida

Ubicada en: `src/services/email.service.js`

```javascript
export const enviarCorreoBienvenida = async (email, nombre, apellido) => {
  // Genera template HTML personalizado
  // Envía correo sin lanzar excepciones
  // Loguea errores en consola
  // Retorna true/false
}
```

## Pruebas

### Test Local (Desarrollo)

1. **Con Mailtrap** (Recomendado para desarrollo):
   ```bash
   # Crear cuenta gratuita en https://mailtrap.io
   # Copiar credenciales y agregar a .env
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=465
   SMTP_USER=tu-user@mailtrap.io
   SMTP_PASS=tu-token
   ```

2. **Registrar usuario de prueba**:
   ```bash
   POST http://localhost:3000/api/auth/register
   {
     "nombre": "Test",
     "apellido": "Usuario",
     "email": "test@ejemplo.com",
     "password": "Password123!",
     "telefono": "+1234567890"
   }
   ```

3. **Verificar en Mailtrap**: El correo debería llegar en segundos

### Test en Producción

1. Configura un proveedor SMTP verdadero (SendGrid, Gmail, etc.)
2. Verifica logs: `console.error()` para cualquier error
3. Monitorea tráfico SMTP en el proveedor

## Flujo de Registro Actualizado

```
1. Usuario envía datos
        ↓
2. Validaciones (nombre, email, contraseña, etc.)
        ↓
3. Crear usuario en BD
        ↓
4. Generar JWT token
        ↓
5. Enviar respuesta exitosa (sin esperar correo)
        ↓
6. En background: Enviar correo de bienvenida
        ↓
7. Loguear errores si fallan
```

## Personalización del Template

Para cambiar el contenido del correo, edita `generarTemplateBienvenida()` en:
- Archivo: `src/services/email.service.js`
- Modifica HTML, texto, colores, enlaces

## Seguridad

- Variables SMTP en `.env` (nunca en código)
- Contraseñas de app del proveedor (no contraseña principal)
- Errores no exponen credenciales en logs públicos
- Template valida caracteres especiales automáticamente

## Logging

El sistema loguea automáticamente:
- Errores de conexión SMTP
- Errores de envío de correo
- Información de intentos de envío (opcional, habilitar en email.service.js)

## Próximas Mejoras (Opcional)

- [ ] Agregar cola de envío (Bull queue) para reintentos
- [ ] Template multilengua
- [ ] Correos de confirmación de email
- [ ] Correos de recuperación de contraseña
- [ ] Analytics de aperturas (pixels de tracking)
- [ ] Unsubscribe links
