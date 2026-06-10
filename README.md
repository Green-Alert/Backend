<div align="center">

  <h1>GreenAlert &mdash; Backend</h1>

  <p>API REST para la plataforma ciudadana de reportes ambientales.<br/>
  Gestiona autenticacion, reportes, evidencias, notificaciones, IA, entidades y administracion.</p>

  <p>
    <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
    <img src="https://img.shields.io/badge/Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Compose"/>
    <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 18+"/>
    <img src="https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white" alt="Express 4"/>
    <img src="https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL 8"/>
    <img src="https://img.shields.io/badge/License-MIT-red?style=flat-square" alt="License MIT"/>
  </p>

  <p>
    <img src="https://img.shields.io/badge/JWT-9-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT"/>
    <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socketdotio&logoColor=white" alt="Socket.IO"/>
    <img src="https://img.shields.io/badge/Cloudinary-1.41-3448C5?style=flat-square&logo=cloudinary&logoColor=white" alt="Cloudinary"/>
    <img src="https://img.shields.io/badge/Firebase-FCM-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase FCM"/>
    <img src="https://img.shields.io/badge/node:test-passing-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Tests"/>
    <img src="https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="CI/CD"/>
  </p>

</div>

---

## Tabla de contenidos

- [Descripcion](#descripcion)
- [Caracteristicas](#caracteristicas)
- [Stack tecnologico](#stack-tecnologico)
- [Arquitectura](#arquitectura)
- [Inicio rapido](#inicio-rapido)
  - [Prerrequisitos](#prerrequisitos)
  - [Instalacion local](#instalacion-local)
  - [Con Docker](#con-docker)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Base de datos](#base-de-datos)
- [Seguridad](#seguridad)
- [Prefijo de API](#prefijo-de-api)
- [Endpoints de la API](#endpoints-de-la-api)
- [OAuth](#oauth)
- [Uploads y evidencias](#uploads-y-evidencias)
- [Notificaciones](#notificaciones)
- [Pruebas](#pruebas)
- [Pipeline CI/CD](#pipeline-cicd)
- [Licencia](#licencia)

---

## Descripcion

GreenAlert Backend es el servicio central de la plataforma **GreenAlert**. Expone una API REST construida con Express para registrar usuarios, autenticar sesiones, administrar reportes ambientales georreferenciados, procesar evidencias, generar alertas, enviar notificaciones y conectar el frontend con servicios externos como Cloudinary, Firebase, Google OAuth, Facebook OAuth y proveedores de IA.

El proyecto usa MySQL como base de datos relacional, JWT con refresh tokens opacos para seguridad de sesiones y Socket.IO para eventos en tiempo real.

---

## Caracteristicas

- **Autenticacion completa** con email/contrasena, JWT, refresh tokens y OAuth Google/Facebook.
- **Verificacion de email** por OTP y enlaces de verificacion.
- **Recuperacion de contrasena** con tokens temporales y revocacion de sesiones.
- **Reportes ambientales** con ubicacion, estado, severidad, categorias y evidencias multimedia.
- **Analisis de evidencias** con score de confianza, hash SHA-256 y metadatos EXIF cuando estan disponibles.
- **Clasificacion y sugerencias por IA** para imagenes, titulo y descripcion del reporte.
- **Zonas de riesgo y alertas predictivas** basadas en actividad historica.
- **Likes, vistas y tendencias** para destacar reportes relevantes.
- **Notificaciones in-app y push** con Firebase Cloud Messaging.
- **Chatbot conversacional** con modo offline y proveedores externos opcionales.
- **Panel administrativo** para usuarios, roles, estados y metricas.
- **Gestion de entidades** responsables y alertas institucionales.
- **Seguridad HTTP** con Helmet, CORS, rate limiting y validaciones de entrada.
- **OpenAPI** disponible en `docs/openapi.yaml`.

---

## Stack tecnologico

| Tecnologia | Version | Rol |
|---|---|---|
| [Node.js](https://nodejs.org) | 18+ | Runtime del servidor |
| [Express](https://expressjs.com) | 4.19 | API REST, middlewares y enrutamiento |
| [MySQL](https://www.mysql.com) | 8+ | Base de datos relacional |
| [mysql2](https://github.com/sidorares/node-mysql2) | 3.9 | Driver MySQL con promesas |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9.0 | Firma y validacion de access tokens |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 8.4 | Proteccion de endpoints sensibles |
| [Helmet](https://helmetjs.github.io) | 7.1 | Cabeceras HTTP de seguridad |
| [Multer](https://github.com/expressjs/multer) | 2.1 | Recepcion de archivos multipart |
| [Cloudinary](https://cloudinary.com) | 1.41 | Almacenamiento externo de evidencias y avatares |
| [Nodemailer](https://nodemailer.com) | 8.0 | Envio de correos transaccionales |
| [Socket.IO](https://socket.io) | 4.8 | Eventos y notificaciones en tiempo real |
| [Firebase Admin / FCM](https://firebase.google.com) | Admin SDK | Push notifications |
| [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) | 10.6 | Login con Google |
| [ExcelJS](https://github.com/exceljs/exceljs) | 4.4 | Exportacion de datos |
| [node:test](https://nodejs.org/api/test.html) | Nativo | Suite de pruebas unitarias |
| [Nodemon](https://nodemon.io) | 3.1 | Recarga en desarrollo |

---

## Arquitectura

```text
+------------------------------------------------------------------+
|                         Cliente / Frontend                       |
|                                                                  |
|  React SPA / Vite  -->  /api/*  -->  Proxy  -->  Backend :3000   |
+-----------------------------------------------+------------------+
                                                |
                                                v
+------------------------------------------------------------------+
|                         GreenAlert Backend                       |
|                                                                  |
|  Express App                                                     |
|  +-- Helmet + CORS + JSON parser + URL encoded parser             |
|  +-- /uploads -> archivos estaticos locales                       |
|  +-- /health, /auth, /reportes, /categorias, /admin               |
|  +-- /chatbot, /notificaciones, /entidades                        |
|  +-- notFoundHandler + errorHandler                               |
|                                                                  |
|  HTTP Server + Socket.IO                                          |
+-----------+------------------+------------------+----------------+
            |                  |                  |
            v                  v                  v
       MySQL 8            Cloudinary        Firebase FCM
       reportes           evidencias        push tokens
       usuarios           avatares          notificaciones
```

En desarrollo, el frontend llama `/api/*` y Vite puede reescribir ese prefijo hacia el backend. En el backend, el prefijo se controla con `API_PREFIX`.

---

## Inicio rapido

### Prerrequisitos

| Herramienta | Version minima |
|---|---|
| Node.js | 18 LTS |
| npm | 9 |
| MySQL | 8 o compatible |
| Frontend GreenAlert | `http://localhost:5173` |
| Docker | 24, solo para despliegue containerizado |

### Instalacion local

```bash
# 1. Clonar el repositorio
git clone https://github.com/Green-Alert/Backend.git
cd Backend

# 2. Copiar variables de entorno
cp .env.example .env
# En Windows PowerShell: Copy-Item .env.example .env

# 3. Instalar dependencias
npm install

# 4. Crear la base de datos y aplicar el esquema
mysql -u root -p < scripts/sql/00_create_database.sql
mysql -u root -p green-alert < DATABASE_SCHEMA_COMPLETE.sql

# 5. Iniciar el servidor de desarrollo
npm run dev
```

El servidor queda disponible en `http://localhost:3000`.

### Con Docker

```bash
# Construir la imagen
docker build -t green-alert-backend:latest .

# Ejecutar el contenedor
docker run -d \
  --name green-alert-backend \
  -p 3000:3000 \
  --env-file .env \
  green-alert-backend:latest
```

Tambien puedes usar `docker-compose.yml` para levantar el servicio con la configuracion definida en el repositorio.

---

## Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores reales del entorno:

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `PORT` | Puerto HTTP del backend | `3000` |
| `NODE_ENV` | Entorno de ejecucion | `development` |
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contrasena de MySQL | `secret` |
| `DB_NAME` | Base de datos | `green-alert` |
| `JWT_SECRET` | Secreto para firmar JWT | `cambia_esto` |
| `JWT_EXPIRES_IN` | Vida del access token | `1h` |
| `REFRESH_TOKEN_EXPIRES_DAYS` | Dias de vida del refresh token | `7` |
| `OAUTH_CALLBACK_CODE_TTL_SECONDS` | Vida del codigo temporal OAuth | `120` |
| `RATE_LIMIT_LOGIN_MAX` | Intentos maximos de login | `5` |
| `RATE_LIMIT_AUTH_MAX` | Peticiones maximas para auth general | `20` |
| `RATE_LIMIT_PASSWORD_RESET_MAX` | Peticiones maximas para reset de contrasena | `5` |
| `UPLOAD_DIR` | Carpeta local de uploads | `./uploads` |
| `MAX_FILE_SIZE` | Tamano maximo de archivo en bytes | `10485760` |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary | `green-alert` |
| `CLOUDINARY_API_KEY` | API key de Cloudinary | `123456` |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary | `secret` |
| `CLOUDINARY_FOLDER` | Carpeta para evidencias | `green-alert/reportes` |
| `CLOUDINARY_AVATAR_FOLDER` | Carpeta para avatares | `green-alert/usuarios` |
| `APP_NAME` | Nombre usado en correos | `GreenAlert` |
| `EMAIL_HOST` / `SMTP_HOST` | Host SMTP | `smtp.gmail.com` |
| `EMAIL_PORT` / `SMTP_PORT` | Puerto SMTP | `587` |
| `EMAIL_USER` / `SMTP_USER` | Usuario SMTP | `correo@gmail.com` |
| `EMAIL_PASS` / `SMTP_PASS` | Contrasena o app password SMTP | `xxxx xxxx` |
| `EMAIL_FROM` / `SMTP_FROM` | Remitente de correos | `GreenAlert <correo@gmail.com>` |
| `EMAIL_TEST_TO` | Destinatario de prueba SMTP | `correo@gmail.com` |
| `LOG_LEVEL` | Nivel de logs | `info` |
| `CORS_ORIGIN` | Origen permitido por CORS | `http://localhost:5173` |
| `FRONTEND_URL` | URL del frontend para enlaces y callbacks | `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Client secret de Google OAuth | `secret` |
| `GOOGLE_CALLBACK_URL` | Callback backend de Google | `http://localhost:3000/api/auth/google/callback` |
| `FACEBOOK_APP_ID` | App ID de Facebook OAuth | `123456` |
| `FACEBOOK_APP_SECRET` | App secret de Facebook OAuth | `secret` |
| `FACEBOOK_CALLBACK_URL` | Callback backend de Facebook | `http://localhost:3000/api/auth/facebook/callback` |
| `FACEBOOK_GRAPH_API_VERSION` | Version Graph API | `v20.0` |
| `FACEBOOK_CALLBACK_RESPONSE` | Formato de respuesta del callback | `json` |
| `API_PREFIX` | Prefijo base opcional de la API | `/api` |
| `API_PUBLIC_URL` | URL publica del backend | `http://localhost:3000` |
| `HF_API_KEY` | Token opcional para clasificacion externa | `hf_...` |
| `HF_IMAGE_MODEL` | Modelo de imagen por HF Router | `zai-org/GLM-4.5V` |
| `EXIF_MAX_HORAS` | Ventana de metadata EXIF reciente | `72` |
| `GROQ_API_KEY` | API key opcional para chatbot | `gsk_...` |
| `GROQ_MODEL` | Modelo Groq del chatbot | `llama-3.1-8b-instant` |
| `GEMINI_API_KEY` | API key opcional de Gemini | `AIza...` |
| `GEMINI_MODEL` | Modelo Gemini fallback | `gemini-2.0-flash-exp` |
| `FIREBASE_PROJECT_ID` | Project ID de Firebase | `green-alert-1` |
| `FIREBASE_CLIENT_EMAIL` | Client email del service account | `firebase-adminsdk...` |
| `FIREBASE_PRIVATE_KEY` | Private key del service account | `-----BEGIN PRIVATE KEY-----` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON completo alternativo del service account | `{...}` |

> No versionar secretos reales. Para pruebas unitarias no se requieren credenciales reales de Firebase, IA ni Cloudinary.

---

## Scripts disponibles

| Script | Descripcion |
|---|---|
| `npm run dev` | Inicia el servidor con Nodemon usando `src/server.js` |
| `npm start` | Inicia el servidor con Node.js |
| `npm test` | Ejecuta la suite unitaria estable |
| `npm run test:unit` | Ejecuta `node --test tests/unit/*.test.js` |
| `npm run test:legacy` | Ejecuta el runner historico `tests/run-all.js` |
| `npm run test:email` | Ejecuta prueba SMTP; requiere configuracion real de email |

---

## Estructura del proyecto

```text
Backend/
+-- Dockerfile
+-- docker-compose.yml
+-- .env.example
+-- .env.docker.example
+-- DATABASE_SCHEMA_COMPLETE.sql       # Esquema consolidado de la base de datos
+-- package.json
+-- validate-facebook-credentials.js   # Validacion local de credenciales Facebook
+-- validate-google-credentials.js     # Validacion local de credenciales Google
|
+-- .github/
|   +-- workflows/
|       +-- backend-ci.yml             # Pipeline CI/CD del backend
|
+-- docs/
|   +-- README.md
|   +-- openapi.yaml                   # Especificacion OpenAPI
|   +-- integracion-frontend-entidades.md
|   +-- PREDICCION_ZONAS_RIESGO.md
|
+-- middlewares/
|   +-- auth.middleware.js             # JWT, roles y autenticacion opcional
|   +-- errorHandler.js                # 404 y errores centralizados
|   +-- rateLimit.middleware.js        # Limites por endpoint sensible
|   +-- upload.middleware.js           # Multer y validacion de archivos
|   +-- validate-id.middleware.js      # Validacion de IDs numericos
|
+-- migrations/                        # Migraciones incrementales SQL
|
+-- routes/
|   +-- admin.routes.js
|   +-- auth.routes.js
|   +-- categoria-riesgo.routes.js
|   +-- chatbot.routes.js
|   +-- entidad.routes.js
|   +-- health.routes.js
|   +-- notificacion.routes.js
|   +-- reporte.routes.js
|
+-- scripts/
|   +-- sql/
|       +-- 00_create_database.sql
|       +-- verify_schema.sql
|
+-- src/
|   +-- app.js                         # Configuracion Express y montaje de rutas
|   +-- server.js                      # HTTP server, MySQL check y Socket.IO
|   |
|   +-- config/                        # Database, seguridad, OAuth, uploads, socket
|   +-- controllers/                   # Controladores HTTP por dominio
|   +-- models/                        # Acceso a datos MySQL
|   +-- services/                      # Logica de negocio e integraciones externas
|   +-- utils/                         # Constantes y helpers de respuesta
|
+-- tests/
    +-- README.md
    +-- run-all.js
    +-- auth/
    +-- config/
    +-- email/
    +-- integration.test.js
    +-- integration-v2.test.js
    +-- models/
    +-- unit/
```

---

## Base de datos

El archivo `DATABASE_SCHEMA_COMPLETE.sql` contiene el esquema consolidado. Las migraciones incrementales estan en `migrations/` y deben aplicarse en orden sobre bases existentes.

Tablas principales:

| Tabla | Proposito |
|---|---|
| `usuarios` | Cuentas, roles, estado, perfil y preferencias |
| `reportes` | Reportes ambientales georreferenciados |
| `categorias_riesgo` | Catalogo de categorias y severidades |
| `evidencias` | Imagenes/videos asociados a reportes |
| `refresh_tokens` | Sesiones persistentes con tokens opacos hasheados |
| `reporte_likes` | Likes por usuario/reporte |
| `reporte_vistas` | Conteo de vistas |
| `notificaciones` | Notificaciones in-app |
| `fcm_tokens` | Tokens de dispositivos para push |
| `entidades` | Entidades institucionales responsables |
| `reporte_entidades` | Asignaciones de reportes a entidades |
| `alertas_entidad` | Alertas dirigidas a entidades |

---

## Seguridad

- JWT para rutas privadas.
- Refresh tokens opacos almacenados con hash.
- Rotacion de refresh token en `/auth/refresh`.
- Revocacion de refresh tokens en logout global, cambio de contrasena y reset de contrasena.
- Helmet para cabeceras HTTP de seguridad.
- CORS configurado con `CORS_ORIGIN`.
- Rate limiting para login, autenticacion y recuperacion de contrasena.
- Validacion de IDs numericos positivos en rutas con `:id`.
- Validacion de coordenadas geograficas en reportes.
- Validacion de enums de estado, severidad, prioridad y asignacion.
- OTP generado con `crypto.randomInt`.
- Tokens OAuth del backend enviados mediante codigo temporal, no por query string.

---

## Prefijo de API

El backend monta las rutas usando `API_PREFIX`.

| Valor | Ejemplo de ruta final | Uso recomendado |
|---|---|---|
| `API_PREFIX=/api` | `http://localhost:3000/api/auth/login` | Backend expuesto directamente con prefijo `/api` |
| `API_PREFIX=` | `http://localhost:3000/auth/login` | Desarrollo con proxy Vite que reescribe `/api/*` |

No se montan ambos prefijos al mismo tiempo. Alinea esta variable con la configuracion del frontend o del reverse proxy.

---

## Endpoints de la API

Las rutas siguientes se muestran sin `API_PREFIX`. Si `API_PREFIX=/api`, antepone `/api` a cada endpoint.

### Salud

| Metodo | Endpoint | Protegida | Descripcion |
|---|---|---|---|
| `GET` | `/health` | No | Verifica servidor y conexion a base de datos |

### Autenticacion

| Metodo | Endpoint | Protegida | Descripcion |
|---|---|---|---|
| `POST` | `/auth/register` | No | Registro de usuario |
| `POST` | `/auth/login` | No | Inicio de sesion con email y contrasena |
| `POST` | `/auth/refresh` | No | Renueva access token y rota refresh token |
| `POST` | `/auth/oauth/exchange` | No | Canjea codigo temporal OAuth por tokens backend |
| `POST` | `/auth/logout` | Parcial | Logout individual o global |
| `GET` | `/auth/verify-email` | No | Verifica email por token de enlace |
| `POST` | `/auth/forgot-password` | No | Solicita recuperacion de contrasena |
| `POST` | `/auth/reset-password` | No | Restablece contrasena con token |
| `GET` | `/auth/perfil` | Si | Obtiene perfil autenticado |
| `PATCH` | `/auth/perfil` | Si | Actualiza datos de perfil |
| `PATCH` | `/auth/avatar` | Si | Actualiza avatar con archivo `avatar` |
| `PATCH` | `/auth/cambiar-contrasena` | Si | Cambia contrasena y revoca sesiones |
| `PATCH` | `/auth/notificaciones` | Si | Actualiza preferencias de notificaciones |
| `POST` | `/auth/enviar-verificacion` | Si | Envia OTP de verificacion de email |
| `POST` | `/auth/verificar-email` | Si | Verifica OTP de email |
| `GET` | `/auth/google/url` | No | Genera URL de login con Google |
| `POST` | `/auth/google` | No | Login con access token de Google |
| `POST` | `/auth/google/login` | No | Login con `id_token` de Google |
| `GET` | `/auth/google/callback` | No | Callback OAuth de Google |
| `GET` | `/auth/facebook/url` | No | Genera URL de login con Facebook |
| `POST` | `/auth/facebook` | No | Login con Facebook |
| `GET` | `/auth/facebook/callback` | No | Callback OAuth de Facebook |

### Reportes

| Metodo | Endpoint | Protegida | Descripcion |
|---|---|---|---|
| `GET` | `/reportes/stats` | No | Estadisticas generales |
| `GET` | `/reportes/stats/categoria` | No | Estadisticas por categoria |
| `GET` | `/reportes/stats/timeline` | No | Serie temporal de reportes |
| `GET` | `/reportes/stats/heatmap` | No | Puntos para mapa de calor |
| `GET` | `/reportes/stats/ia` | Admin/moderador | Estadisticas de analisis IA |
| `GET` | `/reportes/zonas-riesgo` | Admin/moderador | Zonas de riesgo predictivas |
| `GET` | `/reportes/alertas-predictivas` | Opcional | Alertas predictivas con filtros |
| `GET` | `/reportes/trending` | Opcional | Reportes destacados por actividad |
| `GET` | `/reportes/export` | Admin/moderador | Exporta reportes |
| `GET` | `/reportes/mis-reportes` | Si | Reportes del usuario autenticado |
| `POST` | `/reportes/analizar-imagen` | Si | Clasifica una imagen en campo `imagen` |
| `POST` | `/reportes/sugerir-contenido` | Si | Sugiere titulo y descripcion desde evidencias |
| `GET` | `/reportes` | No | Lista reportes con filtros |
| `GET` | `/reportes/:id` | No | Obtiene un reporte por ID |
| `POST` | `/reportes` | Si | Crea reporte con evidencias opcionales |
| `PATCH` | `/reportes/:id` | Si | Actualiza reporte |
| `DELETE` | `/reportes/:id` | Si | Elimina reporte logicamente |
| `POST` | `/reportes/:id/like` | Si | Alterna like del usuario |
| `POST` | `/reportes/:id/asignaciones` | Admin/moderador | Asigna una entidad responsable |
| `GET` | `/reportes/:id/evidencias` | Si | Lista evidencias de un reporte |
| `POST` | `/reportes/:id/evidencias` | Si | Agrega evidencia |
| `DELETE` | `/reportes/:id/evidencias/:evidenciaId` | Si | Elimina evidencia logicamente |

Estados validos de reporte:

| Entrada API | Persistencia interna |
|---|---|
| `pendiente` | `pendiente` |
| `en proceso` | `en_proceso` |
| `en_proceso` | `en_proceso` |
| `resuelto` | `resuelto` |
| `rechazado` | `rechazado` |

### Categorias de riesgo

| Metodo | Endpoint | Protegida | Descripcion |
|---|---|---|---|
| `GET` | `/categorias/estadisticas/resumen` | No | Resumen por categorias |
| `GET` | `/categorias/estadisticas/por-severidad` | No | Estadisticas por severidad |
| `GET` | `/categorias` | No | Lista categorias activas |
| `POST` | `/categorias` | Admin | Crea categoria |
| `PATCH` | `/categorias/:codigo` | Admin | Actualiza categoria |
| `PATCH` | `/categorias/:codigo/estado` | Admin | Activa o desactiva categoria |
| `GET` | `/categorias/:codigo/reportes` | No | Reportes de una categoria |
| `GET` | `/categorias/:codigo` | No | Detalle de categoria |

### Entidades y alertas

| Metodo | Endpoint | Protegida | Descripcion |
|---|---|---|---|
| `GET` | `/entidades` | Admin/moderador/entidad | Lista entidades institucionales |
| `GET` | `/entidades/:id/reportes` | Admin/moderador/entidad | Lista reportes asignados a una entidad |
| `GET` | `/entidades/mis-reportes` | Entidad | Reportes de la entidad autenticada |
| `GET` | `/entidades/mis-reportes/:id` | Entidad | Detalle de reporte asignado |
| `PATCH` | `/entidades/mis-reportes/:id/atencion` | Entidad | Actualiza estado de atencion |
| `GET` | `/entidades/mis-alertas` | Entidad | Lista alertas propias |
| `GET` | `/entidades/mis-alertas/no-leidas` | Entidad | Lista alertas no leidas |
| `GET` | `/entidades/mis-alertas/no-leidas/count` | Entidad | Cuenta alertas no leidas |
| `PATCH` | `/entidades/mis-alertas/leer-todas` | Entidad | Marca todas como leidas |
| `PATCH` | `/entidades/mis-alertas/:id/leer` | Entidad | Marca una alerta como leida |
| `PATCH` | `/entidades/mis-alertas/:id` | Entidad | Alias para marcar como leida |

### Notificaciones

Todas las rutas de notificaciones requieren JWT.

| Metodo | Endpoint | Descripcion |
|---|---|---|
| `GET` | `/notificaciones/contador` | Cuenta notificaciones no leidas |
| `POST` | `/notificaciones/fcm-token` | Registra token FCM del dispositivo |
| `PATCH` | `/notificaciones/marcar-todas` | Marca todas como leidas |
| `GET` | `/notificaciones` | Lista notificaciones del usuario |
| `PATCH` | `/notificaciones/:uuid/leida` | Marca una notificacion como leida |
| `DELETE` | `/notificaciones/:uuid` | Elimina una notificacion |

### Chatbot

| Metodo | Endpoint | Protegida | Descripcion |
|---|---|---|---|
| `POST` | `/chatbot/mensaje` | Opcional | Envia mensaje al chatbot |
| `GET` | `/chatbot/faqs` | No | Lista preguntas frecuentes |

### Administracion

Todas las rutas de administracion requieren JWT con rol `admin`.

| Metodo | Endpoint | Descripcion |
|---|---|---|
| `GET` | `/admin/usuarios/stats` | Estadisticas de usuarios y reportes |
| `GET` | `/admin/usuarios` | Lista usuarios |
| `GET` | `/admin/usuarios/:id` | Obtiene usuario por ID |
| `PATCH` | `/admin/usuarios/:id/rol` | Cambia rol (`usuario`, `moderador`, `admin`, `entidad`) |
| `PATCH` | `/admin/usuarios/:id/estado` | Activa o desactiva usuario |
| `DELETE` | `/admin/usuarios/:id` | Elimina usuario logicamente |

---

## OAuth

El backend soporta Google y Facebook.

Flujo recomendado con callbacks:

1. El frontend solicita `/api/auth/google/url` o `/api/auth/facebook/url`.
2. El usuario autentica con el proveedor.
3. El proveedor redirige al callback backend.
4. El backend crea o vincula el usuario.
5. El backend redirige al frontend con un codigo temporal en el fragmento `#oauth_code=...`.
6. El frontend canjea ese codigo en `/api/auth/oauth/exchange`.

Los access tokens y refresh tokens del backend no se envian por query string.

Scripts de validacion:

```bash
node validate-google-credentials.js
node validate-facebook-credentials.js
```

---

## Uploads y evidencias

Los archivos se configuran con `UPLOAD_DIR` y `MAX_FILE_SIZE`. Tambien pueden enviarse a Cloudinary cuando las credenciales estan configuradas.

Tipos permitidos:

| MIME type | Uso |
|---|---|
| `image/jpeg` | Imagen |
| `image/jpg` | Imagen |
| `image/png` | Imagen |
| `image/webp` | Imagen |
| `image/gif` | Imagen |
| `video/mp4` | Video |
| `video/quicktime` | Video |

Al crear reportes con evidencias, el backend calcula `confianza_evidencia` entre 0 y 100 usando hashes SHA-256, presencia de contenido, metadata EXIF cuando esta disponible y senales basicas de archivos generados o editados. Si no hay evidencias, el campo queda `NULL`.

---

## Notificaciones

El backend maneja notificaciones in-app y push notifications.

| Modulo | Descripcion |
|---|---|
| `notificaciones` | Persistencia de eventos para usuarios |
| `fcm_tokens` | Tokens de dispositivos para Firebase Cloud Messaging |
| `usuarios.notification_preferences` | Preferencias por usuario |
| Socket.IO | Canal en tiempo real para clientes conectados |

Estructura soportada para `PATCH /auth/notificaciones`:

```json
{
  "email_alerts": true,
  "push_notifications": false,
  "report_updates": true,
  "weekly_summary": false
}
```

Firebase Admin se inicializa de forma lazy solo al enviar un push. Si faltan credenciales, el envio se omite sin romper la creacion de la notificacion.

---

## Pruebas

El proyecto usa el runner nativo **node:test** para la suite unitaria estable.

```bash
# Ejecutar suite unitaria estable
npm test

# Ejecutar pruebas unitarias directamente
npm run test:unit

# Ejecutar runner legacy
npm run test:legacy

# Ejecutar prueba SMTP
npm run test:email
```

### Suites destacadas

| Carpeta / archivo | Descripcion |
|---|---|
| `tests/unit/` | Tests unitarios de controladores, servicios, rutas y validaciones |
| `tests/auth/` | Flujos de login, registro y recuperacion |
| `tests/email/` | Plantillas, verificacion y SMTP |
| `tests/models/` | Pruebas de modelos y paginacion |
| `tests/integration.test.js` | Pruebas de integracion legacy |
| `tests/diagnose-routes.js` | Diagnostico de rutas |
| `tests/diagnose-frontend-contract.js` | Verificacion de contrato con frontend |

Las pruebas de integracion y algunos scripts legacy pueden requerir servidor, base de datos o servicios externos configurados.

---

## Pipeline CI/CD

Definido en `.github/workflows/backend-ci.yml`. El flujo esperado valida dependencias, pruebas y compatibilidad del backend antes de integrar cambios.

```text
push / PR a main
        |
        v
   +---------+
   | install |  npm install / npm ci
   +----+----+
        |
        v
   +---------+
   |  test   |  node:test sobre tests/unit
   +----+----+
        |
        v
   +---------+
   | checks  |  validaciones del backend
   +---------+
```

---

## Licencia

MIT. Consulta el archivo de licencia del repositorio si esta disponible.
