# Resumen Técnico de Cambios - Implementación OTP

## 1. Nuevo Archivo: Backend/migrations/001_add_otp_columns_usuarios.sql

**Cambios:**
- ALTER TABLE usuarios
  - ADD COLUMN otp_code_hash VARCHAR(64) - Hash SHA-256 del OTP
  - ADD COLUMN otp_exp DATETIME - Expiración del OTP (10 minutos)
  - ADD COLUMN otp_attempts INT DEFAULT 0 - Contador de intentos fallidos
  - ADD COLUMN otp_last_request DATETIME - Timestamp del último reenvío
- Índices: idx_otp_code_hash, idx_otp_exp

**Ejecución:**
```sql
mysql -u usuario -p base_de_datos < Backend/migrations/001_add_otp_columns_usuarios.sql
```

---

## 2. Modificado: Backend/src/models/usuario.model.js

**Nuevos Métodos:**

```javascript
// Guarda OTP hasheado con expiración
setOtp(id_usuario, otpCodeHash, otpExp)

// Limpia OTP del usuario
clearOtp(id_usuario)

// Busca usuario por OTP hasheado
findByOtpHash(otpCodeHash)

// Incrementa intentos fallidos
incrementOtpAttempts(id_usuario)

// Marca email como verificado
verifyEmail(id_usuario)

// Obtiene timestamp del último reenvío
getOtpLastRequest(id_usuario)

// Actualiza timestamp del último reenvío
updateOtpLastRequest(id_usuario)
```

---

## 3. Modificado: Backend/src/controllers/auth.controller.js

**Nuevas Funciones Auxiliares:**
- `generateOtpCode()` - Genera 6 dígitos aleatorios
- `hashOtpCode(otpCode)` - Hashea con SHA-256

**Nuevos Handlers (Exportados):**

### `sendVerificationOtp`
- **Ruta:** POST /auth/enviar-verificacion
- **Autenticación:** Requiere JWT (verifyToken middleware)
- **Lógica:**
  1. Valida que usuario existe y no está verificado
  2. Verifica cooldown de 1 minuto
  3. Genera nuevo OTP (6 dígitos)
  4. Hashea OTP
  5. Guarda en BD con expiration = NOW() + 10 min
  6. Envía email con plantilla HTML profesional
  7. Retorna 200 OK con confirmación
- **Errores:** 401 (no auth), 404 (no user), 409 (ya verificado), 429 (cooldown activo)

### `verifyEmailOtp`
- **Ruta:** POST /auth/verificar-email
- **Autenticación:** Requiere JWT + body: { otp_code: "123456" }
- **Lógica:**
  1. Valida formato OTP (6 dígitos numéricos)
  2. Valida que usuario existe y no está verificado
  3. Hashea OTP ingresado
  4. Busca por otp_code_hash en BD
  5. Verifica expiración (NOW() vs otp_exp)
  6. Verifica intentos fallidos (< 5)
  7. Si todo ok: marca email_verificado = 1, limpia OTP
  8. Si error: incrementa otp_attempts
  9. Retorna usuario verificado o error
- **Errores:** 400 (formato, incorrecto, expirado), 404 (no user), 409 (ya verificado), 429 (muchos intentos)

**Modificación: Función `register`**
- Después de crear usuario:
  1. Genera OTP automáticamente
  2. Hashea el código
  3. Guarda en BD (expiration = NOW() + 10 min)
  4. Envía email con plantilla bienvenida + OTP
  5. Retorna token + `pendingEmailVerification: true` (flag para frontend)
- Manejo de errores: Si email falla, no rompe el registro (log solamente)

**Constantes Configurables:**
```javascript
const OTP_MINUTES = 10;                    // Expiración
const OTP_RESEND_COOLDOWN_SECONDS = 60;   // Cooldown reenvío
const MAX_OTP_ATTEMPTS = 5;               // Intentos máximos
```

---

## 4. Modificado: Backend/routes/auth.routes.js

**Importaciones nuevas:**
```javascript
import { sendVerificationOtp, verifyEmailOtp } from '../src/controllers/auth.controller.js'
```

**Nuevas Rutas:**
```javascript
authRouter.post('/enviar-verificacion', verifyToken, sendVerificationOtp)
authRouter.post('/verificar-email', verifyToken, verifyEmailOtp)
```

---

## 5. Nuevo Archivo: Backend/docs/OTP_VERIFICATION_GUIDE.md

Documentación completa con:
- Resumen de cambios
- Instrucciones de ejecución SQL
- Descripción de cada método/handler
- Flujo de verificación paso a paso
- Códigos de error y causas
- Ejemplos de cURL
- Testing recomendado
- Notas de seguridad

---

## Flujo de Datos - Registro y Verificación

### 1. Registro
```
POST /auth/register
    ↓
    Validar datos
    ↓
    Crear usuario (email_verificado = false)
    ↓
    Generar OTP (6 dígitos aleatorios)
    ↓
    otpHash = SHA256(OTP)
    ↓
    INSERT INTO usuarios: otp_code_hash, otp_exp, otp_attempts
    ↓
    Enviar email con OTP (plantilla HTML)
    ↓
    201 CREATED + JWT + pendingEmailVerification: true
```

### 2. Verificación
```
POST /auth/verificar-email + JWT + { otp_code }
    ↓
    Validar JWT
    ↓
    Validar formato (6 dígitos)
    ↓
    otpHash = SHA256(otp_code)
    ↓
    SELECT usuario WHERE otp_code_hash = otpHash
    ↓
    ¿Existe? NO → error 400 + incrementar intentos
    ↓
    ¿Expirado? (NOW() > otp_exp) → error 400 + limpiar OTP
    ↓
    ¿Intentos >= 5? → error 429 + limpiar OTP
    ↓
    UPDATE usuario: email_verificado = 1, limpiar OTP
    ↓
    200 OK + usuario actualizado
```

### 3. Reenvío
```
POST /auth/enviar-verificacion + JWT
    ↓
    Validar JWT
    ↓
    ¿Cooldown < 60 segundos? → error 429 + tiempo restante
    ↓
    ¿Email ya verificado? → error 409
    ↓
    Generar nuevo OTP
    ↓
    otpHash = SHA256(OTP)
    ↓
    UPDATE usuario: otp_code_hash, otp_exp, otp_attempts = 0, otp_last_request
    ↓
    Enviar email con OTP
    ↓
    200 OK + confirmación
```

---

## Seguridad Implementada

✅ **OTP hasheado:** Nunca almacenado en texto plano
✅ **Expiración automática:** 10 minutos
✅ **Cooldown reenvío:** 1 minuto
✅ **Rate limiting:** Máximo 5 intentos fallidos
✅ **Requiere JWT:** Para ambos endpoints
✅ **Plantilla de email:** Advierte no compartir código
✅ **Hash SHA-256:** Estándar de seguridad

---

## Variables de Entorno Necesarias

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-app
JWT_SECRET=tu-secret-key
FRONTEND_URL=http://localhost:5173
```

---

## Testing Checklist

- [ ] Ejecutar migración SQL sin errores
- [ ] Registrarse recibe email con OTP
- [ ] Verificar OTP correcto → email_verificado = true
- [ ] Verificar OTP incorrecto → error 400
- [ ] Verificar OTP expirado → error 400
- [ ] 5 intentos fallidos → error 429
- [ ] Email ya verificado → error 409
- [ ] Reenvío < 60s → error 429 + tiempo
- [ ] OTP nunca en logs en texto plano
- [ ] OTP hasheado en BD

---

## Notas Importantes

1. **Migración SQL obligatoria:** Ejecutar antes de deploying
2. **Compatibilidad:** No rompe endpoints existentes
3. **Email opcional en registro:** Si falla, no detiene el registro
4. **Frontend:** Agregar UI para ingresar OTP en post-registro
5. **Limpieza:** Los OTPs expirados se limpian automáticamente al verificar

