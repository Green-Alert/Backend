# Sistema de Verificación de Email

## Descripción
Sistema de verificación de email mediante enlace enviado por correo. El usuario debe hacer click en el enlace para activar su cuenta completamente.

## Características Implementadas

### 1. Generación de Token
- Token único por usuario con expiración de 24 horas
- Almacenado en BD hasheado (SHA-256)
- Solo un token activo por usuario a la vez

### 2. Envío de Correo
- Template HTML profesional con botón de verificación
- Enlace directo con token incluido
- Advertencia sobre expiración del token
- Enlace alternativo para copiar y pegar

### 3. Validación
- Verifica token válido y no expirado
- Previene verificación doble (idempotente)
- Limpiar token después de verificación exitosa
- Soporte para reenvío de correo

### 4. Manejo de Errores
- Email ya verificado
- Token expirado (con opción de reenviar)
- Token inválido
- Usuario no encontrado

## Endpoints

### POST /auth/send-verification-email
Enviar (o reenviar) correo de verificación.

Requiere: Token JWT (usuario autenticado)
```bash
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Respuestas:
- 200: Correo enviado exitosamente
- 400: Email ya verificado
- 401: No autorizado
- 404: Usuario no encontrado

### GET /auth/verify-email
Verificar email mediante token.

Parámetros:
- `token` (query) - Token de verificación

```bash
curl -X GET "http://localhost:3000/api/auth/verify-email?token=TOKEN_HERE"
```

Respuestas:
- 200: Email verificado correctamente
- 400: Token inválido, expirado, o email ya verificado

## Flujo de Verificación

```
1. Usuario se registra
   |
2. Se genera token de verificación (24 horas)
   |
3. Se guarda en BD (hasheado)
   |
4. Se envía correo con enlace
   |
5. Usuario hace click en enlace del correo
   |
6. Se valida token:
   - No expirado
   - Válido
   - Usuario no verificado aún
   |
7. Se marca email_verificado = TRUE
   |
8. Se limpia token de BD
   |
9. Cuenta completamente activada
```

## Cambios en BD Requeridos

Se necesitan dos campos en tabla `usuarios`:

```sql
ALTER TABLE usuarios ADD COLUMN token_verificacion_email VARCHAR(255) NULL UNIQUE;
ALTER TABLE usuarios ADD COLUMN token_verificacion_email_exp DATETIME NULL;
```

Si ya existen, no es necesario hacer nada.

## Configuración

No requiere configuración adicional. Usa las mismas variables SMTP que el sistema de correos.

## Validaciones

- Token expira después de 24 horas
- No permite verificación doble
- Un token activo por usuario
- Token se limpia después de verificar

## Flujo Frontend Sugerido

### En registro:
1. User completa formulario
2. Backend confirma registro y genera token
3. Se envía correo automáticamente
4. Frontend redirige a página de "verifica tu email"

### En pantalla de verificación:
- Opción 1: Usuario recibe enlace en correo y lo abre (verifica automáticamente)
- Opción 2: Mostrar opción "Reenviar correo" si está expirado (POST /auth/send-verification-email)

### Después de verificación:
- Redirigir a página de éxito
- Mostrar mensaje "Tu cuenta está lista"
- Opción para ir al dashboard o login

## Seguridad

- Tokens hasheados en BD (SHA-256)
- URLs con token incluido (seguro en HTTPS)
- Expiración automática
- No se exponen tokens en logs
- Función idempotente (no rompe si ya verificado)

## Pruebas

### Test Manual

1. Registrar usuario:
```bash
POST http://localhost:3000/api/auth/register
{
  "nombre": "Test",
  "apellido": "Usuario",
  "email": "test@ejemplo.com",
  "password": "Password123!"
}
```

2. Obtener token JWT de la respuesta

3. Enviar correo de verificación:
```bash
POST http://localhost:3000/api/auth/send-verification-email
Headers: Authorization: Bearer {JWT_TOKEN}
```

4. Recuperar token de la BD o logs
5. Verificar email:
```bash
GET http://localhost:3000/api/auth/verify-email?token={TOKEN}
```

### Test con Mailtrap
1. Configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS en .env
2. Ejecutar pasos anteriores
3. Revisar inbox en Mailtrap
4. Hacer click en enlace o copiar token

## Próximas Mejoras (Opcional)

- [ ] Rate limiting en reenvío de correos
- [ ] Cooldown de X minutos entre reenvíos
- [ ] Analytics de aperturas
- [ ] Resend automático si no se abre en X días
- [ ] Opción de cambiar email durante verificación
