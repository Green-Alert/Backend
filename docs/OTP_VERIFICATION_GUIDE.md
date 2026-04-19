# Guía de Implementación - Sistema de Verificación de Email con OTP

## Resumen de Cambios

Se ha implementado un sistema completo de verificación de email basado en OTP (One-Time Password) de 6 dígitos con las siguientes características:

- ✅ Código OTP de 6 dígitos numéricos aleatorios
- ✅ Hash SHA-256 para almacenamiento seguro en BD
- ✅ Expiración de 10 minutos
- ✅ Limitador de 1 reenvío por minuto
- ✅ Máximo 5 intentos fallidos
- ✅ Envío automático tras registro
- ✅ Plantillas HTML profesionales para emails
- ✅ Control de seguridad sin compartir código

## Archivos Modificados

### 1. **Backend/migrations/001_add_otp_columns_usuarios.sql**
Archivo de migración SQL con las nuevas columnas:
- `otp_code_hash VARCHAR(64)`: Hash SHA-256 del código OTP
- `otp_exp DATETIME`: Fecha de expiración del OTP
- `otp_attempts INT`: Contador de intentos fallidos
- `otp_last_request DATETIME`: Timestamp del último reenvío

**Instrucciones de ejecución:**
```bash
# Ejecutar la migración en MySQL
mysql -u [usuario] -p [base_de_datos] < Backend/migrations/001_add_otp_columns_usuarios.sql
```

### 2. **Backend/src/models/usuario.model.js**
Nuevos métodos agregados:
- `setOtp(id_usuario, otpCodeHash, otpExp)`: Guarda OTP hasheado
- `clearOtp(id_usuario)`: Limpia OTP del usuario
- `findByOtpHash(otpCodeHash)`: Busca usuario por OTP hasheado
- `incrementOtpAttempts(id_usuario)`: Incrementa intentos fallidos
- `verifyEmail(id_usuario)`: Marca email como verificado
- `getOtpLastRequest(id_usuario)`: Obtiene timestamp del último reenvío
- `updateOtpLastRequest(id_usuario)`: Actualiza timestamp del último reenvío

### 3. **Backend/src/controllers/auth.controller.js**
Nuevos handlers:

#### `sendVerificationOtp` (POST /auth/enviar-verificacion)
- Requiere: JWT válido en header `Authorization: Bearer <token>`
- Genera OTP de 6 dígitos
- Valida cooldown de 1 minuto entre reenvíos
- Envía email con plantilla HTML
- Retorna: 200 OK con mensaje de éxito

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Código OTP enviado correctamente.",
  "data": {
    "message": "Código de verificación enviado a usuario@example.com",
    "expiresIn": 600
  }
}
```

#### `verifyEmailOtp` (POST /auth/verificar-email)
- Requiere: JWT válido en header + código OTP en body
- Valida formato del OTP (6 dígitos)
- Verifica expiración del código
- Controla intentos fallidos (máximo 5)
- Marca email como verificado
- Retorna: 200 OK con datos del usuario verificado

**Body de solicitud:**
```json
{
  "otp_code": "123456"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Email verificado correctamente.",
  "data": {
    "user": {
      "id_usuario": 1,
      "uuid": "uuid-value",
      "nombre": "Juan",
      "apellido": "Doe",
      "email": "juan@example.com",
      "email_verificado": true,
      ...
    }
  }
}
```

### 4. **Backend/routes/auth.routes.js**
Nuevas rutas agregadas:
```javascript
authRouter.post('/enviar-verificacion', verifyToken, sendVerificationOtp);
authRouter.post('/verificar-email', verifyToken, verifyEmailOtp);
```

### 5. **Backend/src/controllers/auth.controller.js** (Modificado: register)
Al registrarse, ahora:
1. Crea la cuenta de usuario
2. Genera automáticamente un OTP
3. Envía email con el código
4. Retorna token + flag `pendingEmailVerification: true`

**Respuesta de registro:**
```json
{
  "success": true,
  "message": "Cuenta creada correctamente. Verifica tu email con el código enviado.",
  "data": {
    "token": "jwt-token-here",
    "user": { ... },
    "pendingEmailVerification": true
  }
}
```

## Flujo de Verificación

### 1. Registro Inicial
```
POST /auth/register
↓
Usuario creado + OTP generado
↓
Email enviado con código
↓
Retorna JWT + pendingEmailVerification: true
```

### 2. Verificación Inicial
```
POST /auth/verificar-email
+ JWT + { otp_code: "123456" }
↓
Valida OTP
↓
email_verificado = true
↓
OTP limpiado de BD
↓
Retorna usuario verificado
```

### 3. Reenvío de Código
```
POST /auth/enviar-verificacion
+ JWT
↓
Verifica cooldown (1 minuto)
↓
Genera nuevo OTP
↓
Email enviado
↓
Retorna confirmación
```

## Códigos de Error

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | "El código OTP debe ser un número de 6 dígitos." | Formato inválido |
| 400 | "Código OTP incorrecto." | OTP no coincide |
| 400 | "El código OTP ha expirado." | OTP expirado (> 10 min) |
| 401 | "No autorizado." | JWT faltante o inválido |
| 404 | "Usuario no encontrado." | Usuario no existe |
| 409 | "El email ya está verificado." | Email ya verificado previamente |
| 429 | "Por favor espera X segundos..." | Cooldown de reenvío activo |
| 429 | "Demasiados intentos fallidos..." | Máximo de intentos (5) alcanzado |

## Constantes Configurables

En `auth.controller.js`:
```javascript
const OTP_MINUTES = 10;                    // Expiración OTP
const OTP_RESEND_COOLDOWN_SECONDS = 60;   // Cooldown entre reenvíos
const MAX_OTP_ATTEMPTS = 5;               // Intentos máximos fallidos
```

## Variables de Entorno Requeridas

Asegúrate de que en tu `.env` estén configuradas:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-app
JWT_SECRET=tu-secret-key
FRONTEND_URL=http://localhost:5173
```

## Ejemplos de Uso (cURL)

### 1. Registrarse
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Doe",
    "email": "juan@example.com",
    "password": "SecurePass123!",
    "telefono": "+1234567890"
  }'
```

### 2. Solicitar OTP (Reenvío)
```bash
curl -X POST http://localhost:3000/auth/enviar-verificacion \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### 3. Verificar Email con OTP
```bash
curl -X POST http://localhost:3000/auth/verificar-email \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "otp_code": "123456"
  }'
```

## Testing Recomendado

1. **Test de Registro:**
   - Verificar que se recibe email con OTP
   - Verificar que `email_verificado = false` en BD

2. **Test de Verificación Correcta:**
   - Usar OTP correcto dentro del tiempo límite
   - Verificar que `email_verificado = true`
   - Verificar que OTP se limpia de BD

3. **Test de Casos de Error:**
   - OTP incorrecto → error 400
   - OTP expirado → error 400 + limpiar BD
   - 5 intentos fallidos → error 429 + limpiar BD
   - Email ya verificado → error 409
   - Reenvío < 60 segundos → error 429

4. **Test de Seguridad:**
   - Verificar que OTP nunca aparece en logs en texto plano
   - Verificar que `otp_code_hash` está hasheado en BD
   - Verificar que solo se devuelve con JWT válido

## Notas de Seguridad

✅ **Implementado:**
- OTP hasheado con SHA-256 en BD (nunca en texto plano)
- Expiración automática de OTP (10 minutos)
- Limitación de reenvíos (1 por minuto)
- Limitación de intentos (5 máximo)
- Requiere JWT válido para ambos endpoints
- Plantilla de email advierte al usuario sobre no compartir el código

⚠️ **Consideraciones Futuras:**
- Implementar captcha en formulario de verificación (prevenir fuerza bruta)
- Agregar logs de auditoría para intentos de verificación
- Enviar email de alerta si se detectan múltiples intentos fallidos
- Implementar blacklist de IPs con muchos intentos fallidos

## Soporte y Debugging

Si hay problemas:

1. **El email no se envía:**
   - Verificar configuración SMTP en `.env`
   - Revisar logs del servidor
   - Comprobar firewall/puertos (587, 465)

2. **OTP expirado prematuramente:**
   - Verificar zona horaria del servidor
   - Revisar valor de `OTP_MINUTES`

3. **Usuario no puede verificar:**
   - Verificar que JWT es válido
   - Revisar que OTP está correctamente hasheado
   - Comprobar BD que `otp_code_hash` existe

