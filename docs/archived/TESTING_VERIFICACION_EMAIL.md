# Running Tests: Email Verification

> **Archivo Archivado** - Ver documentación actualizada en `/docs/tests/`

## Quick Start

### Opción 1: Tests Manuales (Recomendado para desarrollo)

Ver: [TEST_VERIFICACION_EMAIL.md](Backend/docs/TEST_VERIFICACION_EMAIL.md)

Pasos desde cero:
```bash
1. Configurar .env con SMTP
2. Asegurar BD con columnas requeridas
3. npm start (Backend corriendo)
4. Copiar-pegar los comandos curl en terminal
5. Revisar respuestas y estado en BD
```

### Opción 2: Tests Automatizados

```bash
cd Backend

# Instalar dependencia (si no está)
npm install node-fetch@2

# Ejecutar tests
node test-email-verification.js
```

El script automatizado:
- Registra usuario de prueba
- Envía correo de verificación
- Valida errores (sin auth, sin token, token inválido)
- Reporta resultados

## Que Verificar

### Respuestas HTTP
- 200 = Éxito
- 201 = Creado
- 400 = Error de validación
- 401 = No autorizado
- 404 = No encontrado
- 500 = Error del servidor

### Estado en BD
Después de cada operación:
```sql
SELECT id_usuario, email, email_verificado, 
       token_verificacion_email, token_verificacion_email_exp 
FROM usuarios 
WHERE email LIKE 'test%' 
ORDER BY created_at DESC LIMIT 5;
```

### Correos en Mailtrap
- Revisar inbox en https://mailtrap.io
- Validar HTML del correo
- Copiar y testar enlace de verificación

## Checklist de Verificación

- [ ] Registro crea usuario no verificado
- [ ] Envío de correo genera token (24h)
- [ ] Token se envía en correo
- [ ] Verificar con token correcto → email_verificado = 1
- [ ] Verificar dos veces → rechaza segunda
- [ ] Token expirado → rechaza
- [ ] Token inválido → rechaza
- [ ] Sin JWT → rechaza send-verification
- [ ] Sin token → rechaza verify-email

## Common Issues

### "Servidor no responde"
```bash
cd Backend
npm start
# Debe estar en http://localhost:3000
```

### "Token invalido"
- Asegurar que el token está correctamente copiado
- No debe tener espacios
- Es case-sensitive

### "Token expirado" inmediatamente
- Revisar zona horaria del servidor
- Token debe expirar en 24 horas
- Si está expirado al instante, revisar lógica de `getVerificationTokenExpiration()`

### "Correo no llega"
- Verificar .env tiene SMTP configurado
- Revisar credenciales en Mailtrap
- Revisar spam/junk mail
- Cola de envío en segundo plano (puede tardar segundos)

## Integración Continua

Para futuras CI/CD:
```bash
npm run test:email-verification
```

Agregar a package.json:
```json
{
  "scripts": {
    "test:email-verification": "node test-email-verification.js"
  }
}
```

## Documentación Completa

- [VERIFICACION_EMAIL.md](Backend/docs/VERIFICACION_EMAIL.md) - Implementación técnica
- [TEST_VERIFICACION_EMAIL.md](Backend/docs/TEST_VERIFICACION_EMAIL.md) - Tests detallados manuales

---

**Documentación actual:** Ver `/docs/tests/`
