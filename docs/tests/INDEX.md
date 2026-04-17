# 📧 Documentación de Tests - Backend

Índice centralizado de tests y documentación del Backend de GreenAlert.

---

## 📋 Tabla de Contenidos

1. [Pruebas Automatizadas](#pruebas-automatizadas)
2. [Pruebas Manuales](#pruebas-manuales)
3. [Cómo Ejecutar Tests](#cómo-ejecutar-tests)
4. [Cobertura](#cobertura)

---

## 🤖 Pruebas Automatizadas

### Tests de Configuración

#### [EMAIL_CONFIG.md](./EMAIL_CONFIG.md)
**Archivo:** `tests/config/email-config.test.js`  
**Descripción:** Valida configuración centralizada de email  
**Tests:**
- ✅ Obtener configuración sin errores
- ✅ Validar tipos de datos
- ✅ Validar rango de puerto SMTP
- ✅ Validar formato EMAIL_FROM
- ✅ Host SMTP válido
- ✅ Evitar valores de prueba
- ✅ Cache de configuración
- ✅ Estructura completa

**Ejecutar:**
```bash
node tests/config/email-config.test.js
```

---

### Tests de Email

#### [EMAIL_VERIFICATION.md](./EMAIL_VERIFICATION.md)
**Archivo:** `tests/email/verification.test.js`  
**Descripción:** Verifica que el sistema de verificación de email funciona correctamente  
**Tests:**
- ✅ Endpoint POST /auth/send-verification-email
- ✅ Endpoint GET /auth/verify-email
- ✅ Validación de tokens expirados
- ✅ Prevención de re-verificación

**Ejecutar:**
```bash
node tests/email/verification.test.js
```

#### [EMAIL_WELCOME.md](./EMAIL_WELCOME.md)
**Archivo:** `tests/email/welcome.test.js`  
**Descripción:** Verifica envío de correo de bienvenida  
**Tests:**
- ✅ Envío en registro de usuario
- ✅ Formato HTML válido
- ✅ Variables dinámicas en template

**Ejecutar:**
```bash
node tests/email/welcome.test.js
```

---

### Tests de Autenticación

#### [AUTH_REGISTER.md](./AUTH_REGISTER.md)
**Archivo:** `tests/auth/register.test.js`  
**Descripción:** Pruebas del endpoint de registro  
**Tests:**
- ✅ Registro válido de usuario
- ✅ Email inválido rechazado
- ✅ Contraseña corta rechazada
- ✅ Duplicado de email rechazado

**Ejecutar:**
```bash
node tests/auth/register.test.js
```

---

## 📝 Pruebas Manuales

### [MANUAL_EMAIL_CONFIG.md](./MANUAL_EMAIL_CONFIG.md)
Guía paso a paso para verificar configuración de email sin automatización.

**Escenarios:**
1. Verificar variables .env cargadas
2. Validar conexión SMTP
3. Enviar correo de prueba
4. Verificar recepción

---

## 🚀 Cómo Ejecutar Tests

### Ejecutar todos los tests
```bash
node tests/run-all.js
```

### Ejecutar tests específicos por patrón
```bash
# Solo tests de email
node tests/run-all.js email

# Solo tests de config
node tests/run-all.js config

# Solo tests de registro
node tests/run-all.js register

# Búsqueda específica
node tests/run-all.js verification
```

### Ejecutar test individual
```bash
node tests/config/email-config.test.js
node tests/email/verification.test.js
```

---

## 📊 Cobertura

| Componente | Tests | Estado |
|---|---|---|
| **Config Email** | 8 | ✅ |
| **Email Verification** | 5 | ✅ |
| **Email Welcome** | 1 | ✅ |
| **Auth Register** | 3 | ✅ |
| **Auth Login** | - | ⏳ Pendiente |
| **Password Reset** | - | ⏳ Pendiente |
| **TOTAL** | **17** | ✅ Implementados |

---

## 📁 Estructura de Carpetas

```
Backend/
├── tests/
│   ├── config/
│   │   └── email-config.test.js        (8 tests)
│   ├── email/
│   │   ├── verification.test.js        (5 tests)
│   │   └── welcome.test.js             (1 test)
│   ├── auth/
│   │   ├── register.test.js            (3 tests)
│   │   ├── login.test.js               (placeholder)
│   │   └── password-reset.test.js      (placeholder)
│   ├── run-all.js                      (test runner)
│   └── README.md
└── docs/
    └── tests/                          (📍 Documentación centralizada)
        ├── INDEX.md                    (este archivo)
        ├── EMAIL_CONFIG.md
        ├── EMAIL_VERIFICATION.md
        ├── EMAIL_WELCOME.md
        ├── AUTH_REGISTER.md
        └── MANUAL_EMAIL_CONFIG.md
```

---

## ⚙️ Requerimientos

- Node.js 18+
- Variables `.env` configuradas
- MySQL en ejecución (para algunos tests)

---

## 📞 Notas

- Los tests automatizados se ejecutan sin intervención
- Las pruebas manuales requieren verificación visual
- Todos los tests deben pasar antes de hacer commit
- Ver documentación individual para detalles técnicos

---

**Última actualización:** abril 17, 2026  
**Estados de tests:** ✅ 17 tests implementados

