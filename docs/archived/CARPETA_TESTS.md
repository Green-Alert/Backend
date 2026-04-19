# Test Folder Structure

> **Archivo Archivado** - Ver documentación actualizada en `/docs/tests/`

## Estructura Creada

```
Backend/
└── tests/
    ├── run-all.js                  (Ejecutar todos los tests)
    ├── README.md                   (Documentación de tests)
    ├── email/
    │   ├── verification.test.js    (Test de verificación de email)
    │   └── welcome.test.js         (TODO: Test de bienvenida)
    └── auth/
        ├── register.test.js        (Test de registro)
        ├── login.test.js           (TODO)
        └── password-reset.test.js  (TODO)
```

## Ejecutar Tests

### Individual
```bash
node tests/email/verification.test.js
node tests/auth/register.test.js
```

### Todos
```bash
node tests/run-all.js
```

### Filtrado
```bash
node tests/run-all.js email      # Solo tests de email
node tests/run-all.js auth       # Solo tests de auth
```

## Agregar al package.json

```json
{
  "scripts": {
    "test": "node tests/run-all.js",
    "test:email": "node tests/email/verification.test.js",
    "test:auth": "node tests/auth/register.test.js"
  }
}
```

Luego ejecutar:
```bash
npm test
npm run test:email
npm run test:auth
```

## Tests Incluidos

- ✓ Email Verification (5 tests)
- ✓ User Registration (3 tests)
- ⚪ Welcome Email (pending)
- ⚪ Login (pending)
- ⚪ Password Reset (pending)

## Patrón de Tests

Todos los tests siguen el mismo formato:
1. Validar conexión al servidor
2. Ejecutar tests específicos
3. Reportar resultados con colores
4. Exit code 0 (éxito) o 1 (error)

---

**Documentación actual:** Ver `/docs/tests/INDEX.md`
