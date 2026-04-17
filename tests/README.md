# 🧪 Tests - Backend GreenAlert

Tests automatizados y documentación centralizada para validar funcionalidades del Backend.

---

## 📁 Estructura

```
tests/
├── config/
│   └── email-config.test.js       (8 tests - Configuración de email)
├── email/
│   ├── verification.test.js       (5 tests - Verificación de email)
│   └── welcome.test.js            (1 test - Email de bienvenida)
├── auth/
│   ├── register.test.js           (3 tests - Registro de usuario)
│   ├── login.test.js              (placeholder)
│   └── password-reset.test.js     (placeholder)
├── run-all.js                     (Test runner)
└── README.md                       (Este archivo)

docs/tests/                         📍 DOCUMENTACIÓN CENTRALIZADA
├── INDEX.md                        (Índice de todos los tests)
├── EMAIL_CONFIG.md                 (Detalles - Config centralizada)
├── EMAIL_VERIFICATION.md           (Detalles - Verificación email)
├── EMAIL_WELCOME.md                (Detalles - Email bienvenida)
├── AUTH_REGISTER.md                (Detalles - Registro usuarios)
└── MANUAL_EMAIL_CONFIG.md          (Pruebas manuales)
```

---

## 🚀 Ejecutar Tests

### Todos los tests
```bash
node tests/run-all.js
```

### Tests específicos por categoría
```bash
# Solo tests de config
node tests/run-all.js config

# Solo tests de email
node tests/run-all.js email

# Solo tests de auth
node tests/run-all.js auth

# Búsqueda específica
node tests/run-all.js verification
node tests/run-all.js register
```

### Test individual
```bash
node tests/config/email-config.test.js
node tests/email/verification.test.js
node tests/auth/register.test.js
```

---

## 📊 Cobertura Actual

| Componente | Tests | Estado |
|---|---|---|
| **Config Email** | 8 | ✅ |
| **Email Verification** | 5 | ✅ |
| **Email Welcome** | 1 | ✅ |
| **Auth Register** | 3 | ✅ |
| **Auth Login** | - | ⏳ |
| **Password Reset** | - | ⏳ |
| **Total** | **17** | ✅ |

---

## 📚 Documentación Detallada

Cada test tiene documentación técnica completa en `docs/tests/`:

- **[INDEX.md](../docs/tests/INDEX.md)** - Índice global y guía completa de todos los tests

### Tests de Configuración
- **[EMAIL_CONFIG.md](../docs/tests/EMAIL_CONFIG.md)** - 8 tests detallados de validación de email

### Tests de Email
- **[EMAIL_VERIFICATION.md](../docs/tests/EMAIL_VERIFICATION.md)** - Flujo de verificación
- **[EMAIL_WELCOME.md](../docs/tests/EMAIL_WELCOME.md)** - Correo de bienvenida

### Tests de Autenticación
- **[AUTH_REGISTER.md](../docs/tests/AUTH_REGISTER.md)** - Validaciones de registro

### Pruebas Manuales
- **[MANUAL_EMAIL_CONFIG.md](../docs/tests/MANUAL_EMAIL_CONFIG.md)** - Verificaciones paso a paso

---

## ✅ Ejemplo de Ejecución

### Input
```bash
node tests/run-all.js config
```

### Output
```
🧪 TESTS: Configuración de Email (email.config.js)

============================================================

✅ Obtener configuración de email
✅ Validar tipos de datos
✅ Validar rango de puerto SMTP
✅ Validar formato de EMAIL_FROM
✅ Host SMTP válido o conocido
✅ No contiene valores de ejemplo sin cambiar
✅ Cache de configuración (singleton)
✅ Estructura de configuración completa

============================================================

📊 RESUMEN DE TESTS

Total: 8 | Pasado: 8 | Fallido: 0

✅ TODOS LOS TESTS PASARON
```

---

## 🔧 Requisitos

- Node.js 18+
- Archivo `.env` configurado con:
  ```env
  EMAIL_HOST=smtp.mailtrap.io
  EMAIL_PORT=587
  EMAIL_USER=tu_usuario@mailtrap.io
  EMAIL_PASS=tu_contraseña
  EMAIL_FROM=noreply@greenalert.com
  ```
- MySQL en ejecución (para tests de BD)

---

## 📋 Checklist Pre-Commit

Antes de hacer commit, ejecutar:

```bash
# 1. Tests automatizados
node tests/run-all.js

# 2. Verificar sin errores
npm start

# 3. Si todo está ✅, hacer commit
git add .
git commit -m "Feature: descripción"
```

---

## 🤖 Test Runner Features

El archivo `run-all.js` proporciona:
- ✅ Búsqueda recursiva de `.test.js`
- ✅ Filtrado por patrón
- ✅ Salida con colores
- ✅ Resumen de resultados
- ✅ Exit codes correctos (0 = éxito, 1 = fallo)

---

## 🐛 Problemas Comunes

### ❌ "Cannot find module 'assert'"
→ Usar `node` con módulos nativo (ya incluido)

### ❌ "SMTP config incompleta"
→ Verificar `.env` tiene EMAIL_* configuradas

### ❌ "Cannot connect to MySQL"
→ Iniciar MySQL server antes de tests de BD

---

## 📝 Agregar Nuevo Test

1. Crear archivo: `tests/categoria/nombre.test.js`
2. Usar formato de assert nativo
3. Seguir estructura de tests existentes
4. Actualizar documentación en `docs/tests/`
5. Ejecutar: `node tests/run-all.js`

---

**Última actualización:** abril 17, 2026  
**Total Tests:** 17 implementados  
**Estado:** ✅ Todos pasando
    "test:email": "node tests/email/verification.test.js",
    "test:auth": "node tests/auth/register.test.js"
  }
}
```

### Requisitos
- Node.js 14+
- Backend corriendo en http://localhost:3000
- .env configurado con SMTP (para tests de email)
- BD con tablas requeridas

## Test Scripts incluidos

### Email
- `verification.test.js` - Verificación de email (5 tests)
- `welcome.test.js` - Email de bienvenida

### Auth
- `register.test.js` - Registro de usuario
- `login.test.js` - Login
- `password-reset.test.js` - Reseteo de contraseña

## Reportes

Los tests reportan:
- Status HTTP
- Validaciones funcionales
- Errores esperados
- Estado final en BD

Formato:
```
✓ Test passed
✗ Test failed

Results:
Total: 20
Passed: 18
Failed: 2
```

## Agregar Nuevos Tests

1. Crear archivo en la carpeta correspondiente: `tests/{feature}/{action}.test.js`
2. Usar el mismo patrón de colores y logging
3. Exportar función de test para `run-all.js`
4. Documentar en README
5. Agregar a package.json scripts

## Documentación Detallada

Ver archivos en [Backend/docs/](../docs/):
- `TEST_VERIFICACION_EMAIL.md` - Tests manuales paso a paso
- `VERIFICACION_EMAIL.md` - Implementación técnica
