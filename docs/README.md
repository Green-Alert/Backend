# 📚 Documentación - Backend GreenAlert

Índice centralizado de documentación técnica del Backend.

---

## 📁 Estructura

```
docs/
├── tests/                       📍 DOCUMENTACIÓN ACTUAL
│   ├── INDEX.md                 Índice global de tests
│   ├── EMAIL_CONFIG.md          Tests de configuración (8 tests)
│   ├── EMAIL_VERIFICATION.md    Verificación de email
│   ├── EMAIL_WELCOME.md         Email de bienvenida
│   ├── AUTH_REGISTER.md         Registro de usuarios
│   ├── MANUAL_EMAIL_CONFIG.md   Pruebas manuales
│   └── RESUMEN_FINAL.md         Estado actual
│
├── archived/                    📦 HISTÓRICO
│   ├── README.md
│   ├── CARPETA_TESTS.md
│   ├── IMPLEMENTACION_CORREOS.md
│   ├── IMPLEMENTACION_VERIFICACION_EMAIL.md
│   └── TESTING_VERIFICACION_EMAIL.md
│
├── ENDPOINTS_PERFIL.md          Endpoints de perfil de usuario
├── VERIFICACION_EMAIL.md        Verificación de email (original)
├── TEST_VERIFICACION_EMAIL.md   Tests manuales (original)
└── ENVIO_CORREOS.md             Envío de correos (original)
```

---

## 🎯 Inicio Rápido

### Para Tests
→ Ver: [tests/INDEX.md](tests/INDEX.md)

**Ejecutar tests:**
```bash
node tests/run-all.js config
```

### Para Configuración de Email
→ Ver: [tests/EMAIL_CONFIG.md](tests/EMAIL_CONFIG.md)

### Para Endpoints API
→ Ver: [ENDPOINTS_PERFIL.md](ENDPOINTS_PERFIL.md)

### Para Verificación de Email
→ Ver: [tests/EMAIL_VERIFICATION.md](tests/EMAIL_VERIFICATION.md)

---

## 📊 Contenido por Categoría

### 🧪 Tests Automatizados
- `tests/EMAIL_CONFIG.md` - 8 tests de configuración
- `tests/EMAIL_VERIFICATION.md` - Tests de verificación
- `tests/EMAIL_WELCOME.md` - Tests de bienvenida
- `tests/AUTH_REGISTER.md` - Tests de registro

### 📧 Sistema de Email
- `tests/EMAIL_CONFIG.md` - Configuración centralizada
- `tests/MANUAL_EMAIL_CONFIG.md` - Pruebas manuales paso a paso
- `ENVIO_CORREOS.md` - Envío de correos
- `VERIFICACION_EMAIL.md` - Verificación de email

### 👤 Usuarios y Autenticación
- `ENDPOINTS_PERFIL.md` - Endpoints de perfil
- `tests/AUTH_REGISTER.md` - Registro de usuarios

### 📦 Histórico
- `archived/` - Documentación anterior (para referencia)

---

## ✅ Estado Actual

| Componente | Tests | Documentación | Status |
|---|---|---|---|
| Config Email | 8 ✅ | ✅ | ✅ |
| Email Verification | 5 | ✅ | ✅ |
| Email Welcome | 1 | ✅ | ✅ |
| Auth Register | 3 | ✅ | ✅ |
| **TOTAL** | **17** | **6 archivos** | ✅ |

---

## 🚀 Próximos Pasos

1. **Tests adicionales:**
   - Login tests
   - Password reset tests
   - Reportes tests

2. **Documentación:**
   - API OpenAPI/Swagger
   - Database schema
   - Architecture diagram

3. **CI/CD:**
   - GitHub Actions workflow
   - Automatic test execution

---

**Última actualización:** Abril 17, 2026  
**Responsable:** Equipo de Backend

