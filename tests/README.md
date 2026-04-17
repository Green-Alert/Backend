# Tests

Estructura automatizada de testing para GreenAlert.

## Estructura

```
tests/
├── email/
│   ├── verification.test.js       (Test de verificación de email)
│   └── welcome.test.js            (Test de email de bienvenida)
├── auth/
│   ├── register.test.js           (Test de registro)
│   ├── login.test.js              (Test de login)
│   └── password-reset.test.js     (Test de reseteo de contraseña)
└── README.md                       (Este archivo)
```

## Ejecutar Tests

### Individual
```bash
# Test de verificación de email
node tests/email/verification.test.js

# Test de bienvenida
node tests/email/welcome.test.js

# Test de registro
node tests/auth/register.test.js
```

### Todos los tests
```bash
npm run test
```

### Con patrón
```bash
npm run test -- email
npm run test -- auth
```

## Configuración

### package.json
```json
{
  "scripts": {
    "test": "node tests/run-all.js",
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
