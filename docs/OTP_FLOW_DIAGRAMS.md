# Diagramas de Flujo - Sistema OTP

## Diagrama 1: Flujo de Registro con OTP Automático

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. POST /auth/register
                              │ (nombre, apellido, email, password)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND - Auth Controller                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 2. Validar datos de entrada                                      │
│    - Nombre (> 2 caracteres)                                     │
│    - Apellido (> 2 caracteres)                                   │
│    - Email válido                                                │
│    - Password (> 8 caracteres)                                   │
│                                                                   │
│ 3. Verificar email no registrado                                 │
│                                                                   │
│ 4. Hash password con scrypt                                      │
│                                                                   │
│ 5. INSERT usuario en BD                                          │
│    - email_verificado = FALSE                                    │
│    - otp_code_hash = NULL                                        │
│    - otp_exp = NULL                                              │
│                                                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 6. ENVÍO AUTOMÁTICO DE OTP                                 │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │                                                              │  │
│ │ a. Generar código: Math.random() → "123456" (6 dígitos)    │  │
│ │                                                              │  │
│ │ b. Hashear: SHA256("123456") → "abc123def456..." (64 char) │  │
│ │                                                              │  │
│ │ c. UPDATE usuario:                                          │  │
│ │    - otp_code_hash = "abc123def456..."                      │  │
│ │    - otp_exp = NOW() + 10 minutos                           │  │
│ │    - otp_attempts = 0                                       │  │
│ │    - otp_last_request = NOW()                               │  │
│ │                                                              │  │
│ │ d. Generar plantilla HTML con código                        │  │
│ │                                                              │  │
│ │ e. Enviar email vía Nodemailer                              │  │
│ │    - TO: juan@example.com                                   │  │
│ │    - SUBJECT: "Verifica tu Correo - Green Alert"            │  │
│ │    - BODY: HTML con código "123456"                         │  │
│ │                                                              │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ 7. Generar JWT (válido 7 días)                                   │
│                                                                   │
│ 8. Retornar 201 CREATED con:                                     │
│    - token: "eyJhbGc..." (JWT)                                   │
│    - user: { id, nombre, email, email_verificado: false, ... }  │
│    - pendingEmailVerification: true (flag para frontend)         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 9. Respuesta 201 OK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 10. Mostrar Modal OTP Verification                               │
│     - Input numérico (6 dígitos)                                 │
│     - Mostrar email: "juan@example.com"                          │
│     - Countdown: 10 minutos (expiración)                         │
│                                                                   │
│ 11. Usuario recibe email con código: "123456"                    │
│                                                                   │
│ 12. Usuario ingresa código en modal                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagrama 2: Flujo de Verificación de Email

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                           │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Usuario ingresa "123456" en modal OTP                          │
│         ↓                                                       │
│ POST /auth/verificar-email                                     │
│ Headers: Authorization: Bearer <token>                         │
│ Body: { otp_code: "123456" }                                   │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│               BACKEND - verifyEmailOtp Handler                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ 1. Validar JWT                                                 │
│    ✓ Extraer user ID del token                                │
│    ✗ Error 401: No autorizado                                 │
│                                                                │
│ 2. Validar formato OTP                                         │
│    ✓ Es string de 6 dígitos numéricos: "123456"              │
│    ✗ Error 400: "El código OTP debe ser 6 dígitos"           │
│                                                                │
│ 3. Buscar usuario en BD por ID                                 │
│    ✗ Error 404: Usuario no encontrado                         │
│                                                                │
│ 4. Validar que email NO está verificado                        │
│    ✓ email_verificado = FALSE                                 │
│    ✗ Error 409: "El email ya está verificado"                │
│                                                                │
│ 5. Hashear OTP ingresado                                       │
│    SHA256("123456") → "abc123def456..."                       │
│                                                                │
│ 6. Buscar en BD por otp_code_hash                             │
│    ┌─────────────────────────────────────────────┐            │
│    │ SELECT * FROM usuarios                       │            │
│    │ WHERE otp_code_hash = "abc123def456..."     │            │
│    │ AND id_usuario = <user_id>                   │            │
│    └─────────────────────────────────────────────┘            │
│                                                                │
│    ✓ Encontrado: continuar a paso 7                            │
│    ✗ No encontrado: Error 400 + incrementar intentos           │
│                                                                │
│ 7. Validar expiración                                          │
│    Leer otp_exp de BD (ej: 2026-04-18 14:35:00)              │
│    ✓ NOW() <= otp_exp (no ha expirado)                        │
│    ✗ NOW() > otp_exp: Error 400 + limpiar OTP                │
│                                                                │
│ 8. Validar intentos fallidos                                   │
│    Leer otp_attempts de BD (contador)                         │
│    ✓ otp_attempts < 5 (aún hay intentos)                      │
│    ✗ otp_attempts >= 5: Error 429 + limpiar OTP              │
│                                                                │
│ 9. TODO VALIDADO ✓                                             │
│    Ejecutar:                                                   │
│                                                                │
│    a. UPDATE usuarios:                                         │
│       - email_verificado = 1 (TRUE)                            │
│       - updated_at = NOW()                                     │
│                                                                │
│    b. LIMPIAR OTP:                                             │
│       - otp_code_hash = NULL                                   │
│       - otp_exp = NULL                                         │
│       - otp_attempts = 0                                       │
│                                                                │
│    c. Recuperar usuario actualizado                            │
│                                                                │
│ 10. Retornar 200 OK:                                           │
│     {                                                          │
│       "success": true,                                         │
│       "message": "Email verificado correctamente.",            │
│       "data": {                                                │
│         "user": {                                              │
│           "id_usuario": 1,                                     │
│           "email": "juan@example.com",                         │
│           "email_verificado": true,    ← CAMBIÓ               │
│           ...                                                  │
│         }                                                      │
│       }                                                        │
│     }                                                          │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                           │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Modal cierra                                                   │
│ Usuario redirigido a /dashboard                                │
│ Toast: "Email verificado correctamente"                        │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Diagrama 3: Flujo de Reenvío de OTP (Con Cooldown)

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                           │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Usuario hace clic en "Reenviar Código"                         │
│         ↓                                                       │
│ POST /auth/enviar-verificacion                                 │
│ Headers: Authorization: Bearer <token>                         │
│ Body: {} (vacío)                                               │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              BACKEND - sendVerificationOtp Handler             │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ 1. Validar JWT                                                 │
│    ✗ Error 401: No autorizado                                 │
│                                                                │
│ 2. Buscar usuario en BD                                        │
│    ✗ Error 404: Usuario no encontrado                         │
│                                                                │
│ 3. Validar que email NO está verificado                        │
│    ✗ Error 409: "El email ya está verificado"                │
│                                                                │
│ 4. VERIFICAR COOLDOWN (prevenir spam)                          │
│    ┌─────────────────────────────────────────────┐            │
│    │ SELECT otp_last_request                      │            │
│    │ FROM usuarios WHERE id_usuario = <user_id>  │            │
│    └─────────────────────────────────────────────┘            │
│                                                                │
│    Calcular: tiempo_pasado = NOW() - otp_last_request        │
│                                                                │
│    ✓ tiempo_pasado >= 60 segundos: Continuar (OK)            │
│    ✗ tiempo_pasado < 60 segundos:                            │
│       Error 429: "Espera X segundos antes de reenviar"         │
│       Retorna: segundos_restantes = 60 - tiempo_pasado        │
│       (Ejemplo: "Espera 35 segundos antes de reenviar")       │
│                                                                │
│ 5. Generar NUEVO OTP                                           │
│    random_number = Math.floor(Math.random() * 900000) + 100000│
│    otp_code = "654321" (ejemplo)                              │
│                                                                │
│ 6. Hashear nuevo OTP                                           │
│    otp_hash = SHA256("654321") → "xyz789abc..." (64 chars)    │
│                                                                │
│ 7. UPDATE usuario en BD:                                       │
│    ┌─────────────────────────────────────────────┐            │
│    │ UPDATE usuarios SET                          │            │
│    │   otp_code_hash = "xyz789abc...",            │            │
│    │   otp_exp = NOW() + 10 MINUTES,              │            │
│    │   otp_attempts = 0,                          │ ← Reset    │
│    │   otp_last_request = NOW()     ← Actualizar  │            │
│    │ WHERE id_usuario = <user_id>                 │            │
│    └─────────────────────────────────────────────┘            │
│                                                                │
│ 8. Generar plantilla HTML con nuevo código                     │
│    - Mostrar código: "654321"                                  │
│    - Mostrar expiración: "10 minutos"                          │
│    - Advertencia de seguridad                                  │
│                                                                │
│ 9. Enviar email vía Nodemailer                                 │
│    TO: juan@example.com                                        │
│    SUBJECT: "Código de Verificación de Correo - Green Alert"  │
│    BODY: HTML con nuevo código                                 │
│                                                                │
│ 10. Retornar 200 OK:                                           │
│     {                                                          │
│       "success": true,                                         │
│       "message": "Código OTP enviado correctamente.",          │
│       "data": {                                                │
│         "message": "Código enviado a juan@example.com",        │
│         "expiresIn": 600  ← 10 minutos en segundos             │
│       }                                                        │
│     }                                                          │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                           │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Recibir respuesta 200 OK                                       │
│         ↓                                                       │
│ Toast: "Nuevo código enviado"                                  │
│ Modal: Limpiar input OTP anterior                              │
│ Modal: Iniciar countdown: 60 segundos                          │
│         ↓                                                       │
│ [Countdown: 59, 58, 57, ...]                                   │
│ Botón "Reenviar" deshabilitado                                 │
│         ↓                                                       │
│ [Countdown: 0]                                                 │
│ Botón "Reenviar" habilitado nuevamente                         │
│         ↓                                                       │
│ Usuario puede ingresar nuevo código                            │
│ y hacer clic en "Verificar"                                    │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Diagrama 4: Estados de Base de Datos

### Antes del Registro
```
Tabla usuarios (vacía o usuarios existentes)
```

### Después del Registro (Antes de Verificar)
```
┌─────────────────────────────────────────────────────────────┐
│ Tabla usuarios                                               │
├─────────────────────────────────────────────────────────────┤
│ id_usuario │ email              │ email_verificado │        │
├────────────┼────────────────────┼──────────────────┤        │
│ 1          │ juan@example.com   │ 0 (FALSE)        │        │
├────────────┼────────────────────┼──────────────────┤        │
│            │ otp_code_hash      │ otp_exp          │        │
│            │ "abc123..."(SHA256)│ 2026-04-18 14:35 │        │
│            │ otp_attempts       │ otp_last_request │        │
│            │ 0                  │ 2026-04-18 14:25 │        │
└─────────────────────────────────────────────────────────────┘
```

### Después de Verificar Correctamente
```
┌─────────────────────────────────────────────────────────────┐
│ Tabla usuarios                                               │
├─────────────────────────────────────────────────────────────┤
│ id_usuario │ email              │ email_verificado │        │
├────────────┼────────────────────┼──────────────────┤        │
│ 1          │ juan@example.com   │ 1 (TRUE) ✓       │        │
├────────────┼────────────────────┼──────────────────┤        │
│            │ otp_code_hash      │ otp_exp          │        │
│            │ NULL (limpiado)    │ NULL (limpiado)  │        │
│            │ otp_attempts       │ otp_last_request │        │
│            │ 0 (reseteado)      │ 2026-04-18 14:25 │        │
└─────────────────────────────────────────────────────────────┘
```

### Después de 5 Intentos Fallidos
```
┌─────────────────────────────────────────────────────────────┐
│ Tabla usuarios                                               │
├─────────────────────────────────────────────────────────────┤
│ id_usuario │ email              │ email_verificado │        │
├────────────┼────────────────────┼──────────────────┤        │
│ 1          │ juan@example.com   │ 0 (FALSE)        │        │
├────────────┼────────────────────┼──────────────────┤        │
│            │ otp_code_hash      │ otp_exp          │        │
│            │ NULL (limpiado)    │ NULL (limpiado)  │        │
│            │ otp_attempts       │                  │        │
│            │ 5 (MÁXIMO)         │ ← Bloqueo        │        │
│            │ Usuario debe resolicitar OTP          │        │
└─────────────────────────────────────────────────────────────┘
```

---

## Diagrama 5: Árbol de Decisión - Verificación

```
                            Inicio: POST /auth/verificar-email
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                ¿JWT válido?                        │
                 /          \                       │
               ✓/            \✗ → Error 401        │
              /                \                    │
        Continuar            Retornar             │
            │
        ¿Formato OTP válido?
         (6 dígitos)
         /         \
       ✓/           \✗ → Error 400
      /              \
   Continuar          Retornar
    │
    ├─ Hashear OTP (SHA256)
    │
    ├─ ¿OTP existe en BD?
    │  /        \
    ✓/          \✗ → Error 400 + Incrementar intentos
   /             \
Continuar        Retornar
  │
  ├─ ¿Email ya verificado?
  │  /             \
  /\✗               \✓ → Error 409
 /  \                \
✓/   Retornar    Retornar
Continuar
  │
  ├─ ¿OTP expirado?
  │  /             \
  /✓               \✗ → Error 400 + Limpiar OTP
  \                 \
   Retornar      Continuar
                    │
                    ├─ ¿Intentos >= 5?
                    │  /              \
                    ✓/                \✗ → Error 429 + Limpiar OTP
                   /                   \
              Retornar             Continuar
                                       │
                                   ✓ VERIFICACIÓN EXITOSA
                                       │
                                  ├─ UPDATE email_verificado = 1
                                  ├─ LIMPIAR otp_code_hash
                                  ├─ LIMPIAR otp_exp
                                  ├─ RESETEAR otp_attempts = 0
                                       │
                                   200 OK
                                   Retornar usuario verificado
```

---

## Diagrama 6: Línea de Tiempo - Expiración OTP

```
TIEMPO REAL                        ESTADO DEL OTP
─────────────────────────────────────────────────────

14:25:00  ← OTP Generado           ✓ Válido
          otp_exp = 14:35:00        Tiempo restante: 10 min

14:27:30  ← Usuario intenta        ✓ Válido (dentro de 10 min)
          POST /verify               Tiempo restante: 7:30 min

14:32:00  ← Otro intento           ✓ Válido (dentro de 10 min)
          POST /verify               Tiempo restante: 3 min

14:34:59  ← Último intento posible ✓ Válido (dentro de 10 min)
          POST /verify               Tiempo restante: 1 segundo

14:35:00  ← Timestamp de exp.      ✗ EXPIRADO
          OTP ahora inválido        Retorna: Error 400
                                    BD: Limpia OTP automáticamente

14:35:01  ← Intento después        ✗ EXPIRADO
          POST /verify               Retorna: Error 400
                                    Usuario debe reenviar
```

---

## Diagrama 7: Flujo de Límite de Intentos

```
INTENTO #  │ ESTADO         │ ACCIÓN
───────────┼────────────────┼─────────────────────────────────
1          │ Fallido        │ Error 400 + otp_attempts = 1
2          │ Fallido        │ Error 400 + otp_attempts = 2
3          │ Fallido        │ Error 400 + otp_attempts = 3
4          │ Fallido        │ Error 400 + otp_attempts = 4
           │                │ (Mostrar al usuario: "4/5 intentos")
5          │ Fallido        │ Error 400 + otp_attempts = 5
           │                │ (Mostrar: "último intento")
6+         │ BLOQUEADO      │ Error 429 + LIMPIAR OTP
           │                │ Usuario debe solicitar nuevo código
```

