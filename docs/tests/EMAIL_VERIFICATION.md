# ✉️ EMAIL_VERIFICATION - Tests del Sistema de Verificación

> Tests automatizados para validar el flujo completo de verificación de email

---

## 📌 Descripción

Valida que el sistema de verificación de email (tokens, endpoints, database) funciona correctamente desde el registro hasta la verificación del email por el usuario.

---

## 🎯 Tests Implementados

### 1️⃣ Conexión a Base de Datos
Verifica que el servidor pueda conectar correctamente a MySQL.

### 2️⃣ POST /auth/send-verification-email
Valida que un usuario autenticado pueda solicitar un email de verificación.
- ✅ Usuario con JWT válido
- ✅ Email enviado
- ✅ Token generado en BD

### 3️⃣ GET /auth/verify-email?token=...
Verifica que el usuario pueda confirmar su email con el token del email.
- ✅ Token válido
- ✅ Email marcado como verificado
- ✅ Token limpiado de BD

### 4️⃣ Token Expirado
Valida que tokens con más de 24 horas sean rechazados.
- ✅ Error clara: "Token inválido o expirado"

### 5️⃣ Re-verificación Prevista
Evita que una cuenta ya verificada se verifique nuevamente.
- ✅ Error: "Email ya verificado"

---

## 🚀 Ejecutar

```bash
node tests/email/verification.test.js
```

---

## 📊 Resultado Esperado

```
✅ Conexión a base de datos
✅ Enviar correo de verificación (POST)
✅ Verificar email con token (GET)
✅ Rechazar token expirado
✅ Prevenir re-verificación

Total: 5 | Pasado: 5 | Fallido: 0
✅ TODOS LOS TESTS PASARON
```

---

**Archivo:** `tests/email/verification.test.js`

