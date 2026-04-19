# 👤 AUTH_REGISTER - Tests del Endpoint de Registro

> Valida que el registro de usuarios funciona correctamente con validaciones

---

## 📌 Descripción

Tests del endpoint `POST /auth/register` que verifican:
- Registro válido de usuarios
- Validación de email
- Validación de contraseña
- Prevención de duplicados

---

## ✅ Tests Implementados

### 1️⃣ Registro Válido
```javascript
POST /auth/register
Body: {
  nombre: "Juan",
  apellido: "Pérez",
  email: "juan@ejemplo.com",
  contrasena: "SecurePass123!"
}
```
- ✅ Usuario creado en BD
- ✅ Email único
- ✅ Contraseña hasheada
- ✅ JWT generado
- ✅ Email de bienvenida enviado

### 2️⃣ Email Inválido Rechazado
- ❌ Email sin @ es rechazado
- ❌ Email sin dominio es rechazado
- ❌ Formato inválido retorna error 400

### 3️⃣ Contraseña Corta Rechazada
- ❌ Menos de 8 caracteres = error
- ❌ Sin mayúscula = error
- ❌ Sin número = error

### 4️⃣ Duplicado de Email Rechazado
- ❌ Email ya registrado retorna error 409 (Conflict)

---

## 🚀 Ejecutar

```bash
node tests/auth/register.test.js
```

---

## 📊 Resultado Esperado

```
✅ Registro válido de usuario
✅ Email inválido rechazado
✅ Contraseña corta rechazada
✅ Duplicado de email rechazado

Total: 4 | Pasado: 4 | Fallido: 0
✅ TODOS LOS TESTS PASARON
```

---

## 📋 Validaciones Implementadas

| Campo | Validación |
|---|---|
| **Email** | Formato válido, único |
| **Contraseña** | Min 8 chars, mayúscula, número |
| **Nombre** | No vacío |
| **Apellido** | No vacío |

---

**Archivo:** `tests/auth/register.test.js`

