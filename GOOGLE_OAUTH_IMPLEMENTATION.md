Implementación: Google OAuth 2.0 - Estrategia de Autenticación Social

CAMBIOS REALIZADOS:

1. Servicio de Google OAuth (google-oauth.service.js)
   - Verificación de ID tokens de Google
   - Intercambio de códigos de autorización
   - Obtención de información del usuario desde Google

2. Modelo de Usuario (usuario.model.js)
   - Búsqueda por google_id
   - Creación de usuarios desde Google
   - Actualización de google_id en usuarios existentes

3. Controlador de Autenticación (auth.controller.js)
   - googleLogin: Verifica id_token y autentica usuario
   - googleCallback: Maneja callback de Google con código de autorización

4. Rutas (auth.routes.js)
   - POST /api/auth/google/login - Autenticación con id_token
   - GET /api/auth/google/callback - Callback de Google

5. Base de Datos (DATABASE_SCHEMA_COMPLETE.sql)
   - Agregada columna google_id a tabla usuarios
   - Índice único para google_id

6. Migración (003_add_google_oauth_support.sql)
   - Script para agregar soporte de Google OAuth a BD existente

7. Documentación (README.md)
   - Sección "Autenticación Social: Google OAuth 2.0"
   - Explicación de flujos de autenticación
   - Ejemplos de integración con frontend
   - Detalles de seguridad

FLUJOS DE AUTENTICACIÓN:

Flujo 1: ID Token (Recomendado para SPAs)
1. Frontend usa Google Sign-In Button
2. Obtiene id_token
3. POST /api/auth/google/login con { id_token }
4. Backend verifica y crea/actualiza usuario
5. Retorna JWT de GreenAlert

Flujo 2: Authorization Code
1. Frontend redirige a Google OAuth consent screen
2. Usuario autoriza
3. Google redirige a GET /api/auth/google/callback?code=...
4. Backend intercambia código por tokens
5. Backend crea/actualiza usuario
6. Redirige al frontend con JWT en URL

DATOS GUARDADOS:

- google_id: ID único de Google (sub claim)
- email: Email verificado automáticamente
- nombre, apellido: Información del perfil de Google
- avatar_url: Foto de perfil de Google
- password_hash: NULL (no se requiere para cuentas de Google)

SEGURIDAD:

- Tokens de Google se verifican en servidor
- Email se marca como verificado automáticamente
- google_id se guarda para rastrear origen
- JWT tiene expiración de 7 días
- google_id es único (no permite cuentas duplicadas)

PRÓXIMOS PASOS:

1. Ejecutar migración: mysql -u root < migrations/003_add_google_oauth_support.sql
2. Probar endpoints con Postman o curl
3. Integrar Google Sign-In Button en frontend
4. Verificar flujo de callback en producción

VERIFICACIÓN:

Ejecutar script de validación:
  node validate-google-credentials.js

Probar login con Google:
  curl -X POST http://localhost:3000/api/auth/google/login \
    -H "Content-Type: application/json" \
    -d '{"id_token":"google_id_token_aqui"}'
