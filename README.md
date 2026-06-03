# Green Alert Backend

API REST para autenticacion, reportes ambientales, categorias de riesgo, administracion de usuarios, evidencias y salud del servicio.

## Requisitos

- Node.js 18 o superior
- MySQL 8 o compatible
- npm

## Instalacion

```bash
npm install
```

Copia `.env.example` a `.env` y ajusta las variables de entorno segun tu entorno local.

```bash
copy .env.example .env
```

## Comandos

```bash
npm run dev          # Inicia el servidor con nodemon
npm start            # Inicia el servidor con node
npm test             # Ejecuta la suite unitaria estable
npm run test:unit    # Ejecuta pruebas unitarias con node:test
npm run test:legacy  # Ejecuta el runner historico tests/run-all.js
npm run test:email   # Ejecuta prueba SMTP, requiere configuracion de email
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto del servidor. |
| `NODE_ENV` | Entorno de ejecucion. |
| `DB_HOST` | Host de MySQL. |
| `DB_PORT` | Puerto de MySQL. |
| `DB_USER` | Usuario de MySQL. |
| `DB_PASSWORD` | Contrasena de MySQL. |
| `DB_NAME` | Nombre de la base de datos. |
| `JWT_SECRET` | Secreto para firmar JWT. |
| `JWT_EXPIRES_IN` | Duracion del access token. |
| `REFRESH_TOKEN_EXPIRES_DAYS` | Dias de vida del refresh token. |
| `OAUTH_CALLBACK_CODE_TTL_SECONDS` | Vida del codigo temporal usado por callbacks OAuth. |
| `RATE_LIMIT_LOGIN_MAX` | Maximo de intentos para login. |
| `RATE_LIMIT_AUTH_MAX` | Maximo de peticiones para endpoints de auth generales. |
| `RATE_LIMIT_PASSWORD_RESET_MAX` | Maximo de peticiones para recuperacion de contrasena. |
| `UPLOAD_DIR` | Carpeta donde se guardan archivos subidos. |
| `MAX_FILE_SIZE` | Tamano maximo de archivo en bytes. |
| `EMAIL_HOST` | Host SMTP. |
| `EMAIL_PORT` | Puerto SMTP. |
| `EMAIL_USER` | Usuario SMTP. |
| `EMAIL_PASS` | Contrasena SMTP. |
| `EMAIL_FROM` | Remitente de correos. |
| `EMAIL_TEST_TO` | Destinatario para prueba SMTP. |
| `LOG_LEVEL` | Nivel de logs. |
| `CORS_ORIGIN` | Origen permitido por CORS. |
| `FRONTEND_URL` | URL del frontend para enlaces y callbacks. |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth. |
| `GOOGLE_CLIENT_SECRET` | Client secret de Google OAuth. |
| `GOOGLE_CALLBACK_URL` | Callback backend de Google OAuth. |
| `FACEBOOK_APP_ID` | App ID de Facebook OAuth. |
| `FACEBOOK_APP_SECRET` | App secret de Facebook OAuth. |
| `FACEBOOK_CALLBACK_URL` | Callback backend de Facebook OAuth. |
| `FACEBOOK_GRAPH_API_VERSION` | Version de Facebook Graph API. |
| `FACEBOOK_CALLBACK_RESPONSE` | Modo de respuesta del callback de Facebook. |
| `API_PREFIX` | Prefijo base opcional de la API. Por defecto vacio para desarrollo con Vite. |
| `API_PUBLIC_URL` | URL publica del backend para enlaces enviados por email. |
| `HF_API_KEY` | Token opcional para servicios IA externos. No es requerido para `npm test`. |
| `HF_IMAGE_MODEL` | Modelo usado por clasificacion de imagen cuando se configura proveedor externo. |
| `EXIF_MAX_HORAS` | Ventana en horas para considerar reciente la metadata EXIF usada en scoring de evidencias. |
| `FIREBASE_PROJECT_ID` | Project ID de Firebase para FCM. Opcional en desarrollo/test. |
| `FIREBASE_CLIENT_EMAIL` | Client email del service account de Firebase. Opcional en desarrollo/test. |
| `FIREBASE_PRIVATE_KEY` | Private key del service account de Firebase. Opcional en desarrollo/test. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Alternativa opcional para configurar Firebase con el JSON completo del service account. |

## Estructura real

```text
Backend/
  .env.example
  DATABASE_SCHEMA_COMPLETE.sql
  package.json
  validate-facebook-credentials.js
  validate-google-credentials.js
  docs/
    README.md
    openapi.yaml
    integracion-frontend-entidades.md
    PREDICCION_ZONAS_RIESGO.md
  middlewares/
    auth.middleware.js
    errorHandler.js
    rateLimit.middleware.js
    upload.middleware.js
    validate-id.middleware.js
  migrations/
    001_add_otp_columns_usuarios.sql
    002_add_comentario_moderacion_reportes.sql
    003_add_google_oauth_support.sql
    004_add_facebook_oauth_support.sql
    005_add_email_verification_token.sql
    006_create_refresh_tokens.sql
    007_set_reportes_estado_default_pendiente.sql
    008_add_notification_preferences_to_usuarios.sql
  routes/
    admin.routes.js
    auth.routes.js
    categoria-riesgo.routes.js
    chatbot.routes.js
    entidad.routes.js
    health.routes.js
    notificacion.routes.js
    reporte.routes.js
  src/
    app.js
    server.js
    config/
      database.js
      email.config.js
      facebook.config.js
      google.config.js
      security.config.js
      upload.config.js
    controllers/
      admin.controller.js
      auth.controller.js
      categoria-riesgo.controller.js
      health.controller.js
      reporte.controller.js
    models/
      categoria-riesgo.model.js
      evidencia.model.js
      refresh-token.model.js
      reporte.model.js
      usuario.model.js
    services/
      email.service.js
      facebook-oauth.service.js
      google-oauth.service.js
      oauth-callback-code.service.js
    utils/
      constantes-validacion.js
      response.js
  tests/
    run-all.js
    unit/
    auth/
    config/
    email/
    models/
```

## Base de datos

El archivo `DATABASE_SCHEMA_COMPLETE.sql` contiene el esquema consolidado. Las migraciones incrementales estan en `migrations/`.

Tablas principales:

- `usuarios`
- `reportes`
- `categorias_riesgo`
- `evidencias`
- `refresh_tokens`

Para aplicar cambios en una base existente, ejecuta las migraciones pendientes en orden.

## Seguridad

El backend incluye:

- JWT para rutas privadas.
- Refresh tokens opacos almacenados con hash.
- Rotacion de refresh token en `/auth/refresh`.
- Revocacion de refresh tokens en logout global, cambio de contrasena y reset de contrasena.
- Helmet para cabeceras HTTP de seguridad.
- CORS configurado con `CORS_ORIGIN`.
- Rate limiting para autenticacion y recuperacion de contrasena.
- Validacion de IDs numericos positivos en rutas con `:id`.
- Validacion de coordenadas geograficas en reportes.
- Validacion de enums de estado y severidad.
- OTP generado con `crypto.randomInt`.

## Prefijo de API

Por defecto `API_PREFIX` es vacio y las rutas se montan sin prefijo:

Ejemplo:

```text
http://localhost:3000/auth/login
```

En desarrollo, el frontend puede seguir llamando `/api/*` porque Vite reescribe ese prefijo antes de enviar la peticion al backend. Por ejemplo, `/api/reportes` en el navegador llega al backend como `/reportes`.

Si necesitas publicar el backend directamente bajo `/api`, define `API_PREFIX=/api`. No se montan ambos prefijos al mismo tiempo.

## OpenAPI

La especificacion inicial esta disponible en [`docs/openapi.yaml`](docs/openapi.yaml). No se monta Swagger UI en runtime; el archivo queda listo para validarse con herramientas externas o integrarse en una etapa posterior.

## Rutas

### Salud

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/health` | Verifica servidor y conexion a base de datos. |

### Autenticacion

| Metodo | Ruta | Protegida | Descripcion |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | No | Registro de usuario. |
| `POST` | `/auth/login` | No | Inicio de sesion con email y contrasena. |
| `POST` | `/auth/refresh` | No | Renueva access token y rota refresh token. |
| `POST` | `/auth/oauth/exchange` | No | Canjea codigo temporal OAuth por tokens backend. |
| `POST` | `/auth/logout` | Parcial | Logout individual con refresh token; logout global requiere JWT. |
| `GET` | `/auth/verify-email` | No | Verifica email por token de enlace. |
| `POST` | `/auth/forgot-password` | No | Solicita recuperacion de contrasena. |
| `POST` | `/auth/reset-password` | No | Restablece contrasena con token. |
| `GET` | `/auth/perfil` | Si | Obtiene perfil del usuario autenticado. |
| `PATCH` | `/auth/perfil` | Si | Actualiza perfil. |
| `PATCH` | `/auth/avatar` | Si | Actualiza avatar con archivo `avatar`. |
| `PATCH` | `/auth/cambiar-contrasena` | Si | Cambia contrasena y revoca refresh tokens. |
| `PATCH` | `/auth/notificaciones` | Si | Actualiza preferencias de notificaciones. |
| `POST` | `/auth/enviar-verificacion` | Si | Envia OTP de verificacion de email. |
| `POST` | `/auth/verificar-email` | Si | Verifica OTP de email. |
| `GET` | `/auth/google/url` | No | Genera URL de login con Google. |
| `POST` | `/auth/google` | No | Login con access token de Google. |
| `POST` | `/auth/google/login` | No | Login con `id_token` de Google. |
| `GET` | `/auth/google/callback` | No | Callback OAuth de Google. |
| `GET` | `/auth/facebook/url` | No | Genera URL de login con Facebook. |
| `POST` | `/auth/facebook` | No | Login con Facebook. |
| `GET` | `/auth/facebook/callback` | No | Callback OAuth de Facebook. |

### Reportes

| Metodo | Ruta | Protegida | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/reportes/stats` | No | Estadisticas generales de reportes. |
| `GET` | `/reportes/stats/categoria` | No | Estadisticas por categoria. |
| `GET` | `/reportes/stats/timeline` | No | Serie temporal de reportes. |
| `GET` | `/reportes/stats/heatmap` | No | Puntos para heatmap. |
| `GET` | `/reportes/stats/ia` | Si, admin o moderador | Estadisticas de analisis IA. |
| `GET` | `/reportes/zonas-riesgo` | Si, admin o moderador | Zonas de riesgo predictivas. |
| `GET` | `/reportes/alertas-predictivas` | Autenticacion opcional | Alertas predictivas con filtros. |
| `GET` | `/reportes/trending` | Autenticacion opcional | Reportes destacados por actividad. |
| `GET` | `/reportes/export` | Si, admin o moderador | Exporta reportes. |
| `GET` | `/reportes/mis-reportes` | Si | Lista reportes del usuario autenticado. |
| `POST` | `/reportes/analizar-imagen` | Si | Clasifica una imagen en campo `imagen`. |
| `POST` | `/reportes/sugerir-contenido` | Si | Sugiere titulo y descripcion desde evidencias. |
| `GET` | `/reportes` | No | Lista reportes con filtros. |
| `GET` | `/reportes/:id` | No | Obtiene un reporte por ID. |
| `POST` | `/reportes` | Si | Crea reporte con evidencias opcionales en `file` o `files`. |
| `POST` | `/reportes/:id/like` | Si | Alterna like del usuario autenticado. |
| `POST` | `/reportes/:id/asignaciones` | Si, admin o moderador | Asigna manualmente una entidad responsable. |
| `GET` | `/reportes/:id/evidencias` | Si | Lista evidencias de un reporte. |
| `POST` | `/reportes/:id/evidencias` | Si | Agrega una evidencia al reporte. |
| `DELETE` | `/reportes/:id/evidencias/:evidenciaId` | Si | Elimina logicamente una evidencia. |
| `PATCH` | `/reportes/:id` | Si | Actualiza reporte. |
| `DELETE` | `/reportes/:id` | Si | Elimina reporte logicamente. |

Estados validos de reporte:

- Entrada API: `pendiente`, `en proceso`, `en_proceso`, `resuelto`, `rechazado`.
- Persistencia interna: `pendiente`, `en_proceso`, `resuelto`, `rechazado`.
- `en proceso` se normaliza a `en_proceso`.

Valores validos para asignacion manual:

- `tipo_asignacion`: `principal`, `apoyo`.
- `prioridad`: `baja`, `media`, `alta`, `critica`.

### Categorias de riesgo

| Metodo | Ruta | Protegida | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/categorias/estadisticas/resumen` | No | Resumen por categorias. |
| `GET` | `/categorias/estadisticas/por-severidad` | No | Estadisticas por severidad. |
| `GET` | `/categorias` | No | Lista categorias activas. |
| `POST` | `/categorias` | Si, admin | Crea categoria. |
| `PATCH` | `/categorias/:codigo` | Si, admin | Actualiza categoria. |
| `PATCH` | `/categorias/:codigo/estado` | Si, admin | Activa o desactiva categoria. |
| `GET` | `/categorias/:codigo/reportes` | No | Reportes de una categoria. |
| `GET` | `/categorias/:codigo` | No | Detalle de categoria. |

### Entidades y alertas de entidad

| Metodo | Ruta | Protegida | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/entidades` | Si, admin/moderador/entidad | Lista entidades institucionales. |
| `GET` | `/entidades/:id/reportes` | Si, admin/moderador/entidad | Lista reportes asignados a una entidad. |
| `GET` | `/entidades/mis-reportes` | Si, entidad | Lista reportes de la entidad autenticada. |
| `GET` | `/entidades/mis-reportes/:id` | Si, entidad | Detalle de reporte asignado propio. |
| `PATCH` | `/entidades/mis-reportes/:id/atencion` | Si, entidad | Actualiza estado de atencion. |
| `GET` | `/entidades/mis-alertas` | Si, entidad | Lista alertas propias. |
| `GET` | `/entidades/mis-alertas/no-leidas` | Si, entidad | Lista alertas propias no leidas. |
| `GET` | `/entidades/mis-alertas/no-leidas/count` | Si, entidad | Cuenta alertas propias no leidas. |
| `PATCH` | `/entidades/mis-alertas/leer-todas` | Si, entidad | Marca todas las alertas propias como leidas. |
| `PATCH` | `/entidades/mis-alertas/:id/leer` | Si, entidad | Marca una alerta propia como leida. |
| `PATCH` | `/entidades/mis-alertas/:id` | Si, entidad | Alias para marcar una alerta propia como leida. |

### Notificaciones

Todas las rutas de notificaciones requieren JWT.

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/notificaciones/contador` | Cuenta notificaciones no leidas. |
| `POST` | `/notificaciones/fcm-token` | Registra token FCM del dispositivo. |
| `PATCH` | `/notificaciones/marcar-todas` | Marca todas las notificaciones como leidas. |
| `GET` | `/notificaciones` | Lista notificaciones del usuario autenticado. |
| `PATCH` | `/notificaciones/:uuid/leida` | Marca una notificacion como leida. |
| `DELETE` | `/notificaciones/:uuid` | Elimina una notificacion. |

### Chatbot

| Metodo | Ruta | Protegida | Descripcion |
| --- | --- | --- | --- |
| `POST` | `/chatbot/mensaje` | Autenticacion opcional | Envia mensaje al chatbot. |
| `GET` | `/chatbot/faqs` | No | Lista preguntas frecuentes. |

### Administracion

Todas las rutas de administracion requieren JWT con rol `admin`.

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/admin/usuarios/stats` | Estadisticas de usuarios y reportes. |
| `GET` | `/admin/usuarios` | Lista usuarios. |
| `GET` | `/admin/usuarios/:id` | Obtiene usuario por ID. |
| `PATCH` | `/admin/usuarios/:id/rol` | Cambia rol de usuario. |
| `PATCH` | `/admin/usuarios/:id/estado` | Activa o desactiva usuario. |
| `DELETE` | `/admin/usuarios/:id` | Elimina usuario logicamente. |

## OAuth

El backend soporta Google y Facebook.

Flujo recomendado con callbacks:

1. El frontend solicita `/api/auth/google/url` o `/api/auth/facebook/url` en desarrollo con Vite, que reescribe a `/auth/google/url` o `/auth/facebook/url` en el backend.
2. El usuario autentica con el proveedor.
3. El proveedor redirige al callback backend.
4. El backend crea o vincula el usuario.
5. El backend redirige al frontend con un codigo temporal en el fragmento `#oauth_code=...`.
6. El frontend canjea ese codigo en `/api/auth/oauth/exchange`; Vite lo reescribe a `/auth/oauth/exchange`.

Los access tokens y refresh tokens del backend no se envian por query string.

## Uploads

Los archivos se configuran con:

- `UPLOAD_DIR`: carpeta de almacenamiento.
- `MAX_FILE_SIZE`: tamano maximo en bytes.

Tipos permitidos:

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`
- `image/gif`
- `video/mp4`
- `video/quicktime`

Los archivos se sirven desde `/uploads`.

## Scoring de evidencias

Al crear reportes con evidencias, el backend calcula un score `confianza_evidencia` entre 0 y 100 usando hashes SHA-256, presencia de contenido, metadata EXIF cuando esta disponible y senales basicas de archivos generados o editados. Si no hay evidencias, el campo queda `NULL`.

La lectura EXIF usa `exifr`, pero el servicio tolera metadata ausente y no depende de llamadas externas para pasar pruebas. En `NODE_ENV=test` no se fuerza analisis EXIF salvo que se configure `ENABLE_EXIF_IN_TESTS`.

## Push FCM

Las notificaciones in-app pueden enviar push por Firebase Cloud Messaging cuando el usuario tiene `push_notifications` activado y existen tokens activos en `fcm_tokens`. Firebase Admin se inicializa de forma lazy solo al enviar un push; si faltan credenciales, el envio se omite sin romper la creacion de la notificacion.

No se deben versionar secretos reales. Para CI y tests no se requieren variables Firebase reales.

## Preferencias de notificaciones

El endpoint `PATCH /auth/notificaciones` persiste las preferencias en `usuarios.notification_preferences`.

Estructura soportada:

```json
{
  "email_alerts": true,
  "push_notifications": false,
  "report_updates": true,
  "weekly_summary": false
}
```

## Testing

Suite unitaria estable:

```bash
npm test
```

Runner legacy:

```bash
npm run test:legacy
```

Prueba SMTP:

```bash
npm run test:email
```

Las pruebas de integracion y algunos scripts legacy pueden requerir servidor, base de datos o servicios externos configurados.

## Scripts de validacion OAuth

```bash
node validate-google-credentials.js
node validate-facebook-credentials.js
```

Estos scripts revisan que las variables de entorno OAuth esten configuradas y no tengan valores de ejemplo.
