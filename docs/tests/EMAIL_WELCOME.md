# 📧 EMAIL_WELCOME - Tests de Correo de Bienvenida

> Valida que el correo de bienvenida se envía correctamente al registrarse

---

## 📌 Descripción

Tests que verifican que el correo de bienvenida se envía automáticamente cuando un usuario se registra, con template correcto y variables dinámicas.

---

## ✅ Tests Implementados

### 1️⃣ Envío de Bienvenida en Registro
- ✅ Correo enviado sin bloquear registro
- ✅ Template HTML enviado
- ✅ Contiene nombre del usuario

### 2️⃣ Template HTML Válido
- ✅ Contiene estructura básica (header, content, footer)
- ✅ Estilos CSS incluidos
- ✅ Links hacia la aplicación

### 3️⃣ Variables Dinámicas
- ✅ Nombre del usuario personalizado
- ✅ Nombre de la app desde .env
- ✅ URL del frontend dinámico

---

## 🚀 Ejecutar

```bash
node tests/email/welcome.test.js
```

---

## 📊 Resultado Esperado

```
✅ Correo de bienvenida enviado en registro
✅ Template HTML contiene estructura válida
✅ Variables dinámicas reemplazadas

Total: 3 | Pasado: 3 | Fallido: 0
✅ TODOS LOS TESTS PASARON
```

---

**Archivo:** `tests/email/welcome.test.js`

