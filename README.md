# GreenAlert - Backend API

API REST para la plataforma de monitoreo ambiental ciudadano GreenAlert. Construida con Node.js, Express y MySQL.

---

##  Tabla de Contenidos

- [Stack Tecnológico](#stack-tecnológico)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Scripts Disponibles](#scripts-disponibles)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Endpoints Disponibles](#endpoints-disponibles)
- [Autenticación](#autenticación)
- [Base de Datos](#base-de-datos)
- [Testing](#testing)
- [Deploy](#deploy)

---

##  Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| **Runtime** | Node.js 18+ (ES Modules) |
| **Framework** | Express.js |
| **Base de Datos** | MySQL 8.0+ |
| **Driver MySQL** | mysql2/promise |
| **Autenticación** | JWT (JSON Web Tokens) |
| **Hash de Contraseña** | crypto (scrypt) |
| **Variables de Entorno** | dotenv |
| **Desarrollo** | Nodemon |

---

##  Requisitos Previos

- **Node.js** 18.0.0 o superior ([descargar](https://nodejs.org/))
- **npm** 9.0.0 o superior
- **MySQL** 8.0 o superior ([descargar](https://www.mysql.com/downloads/))
- **Git** para versionamiento

### Verificar versiones instaladas:

```bash
node --version    # v18.0.0 o superior
npm --version     # 9.0.0 o superior
mysql --version   # Ver. 8.0 o superior
```

---

##  Base de Datos

### Crear la base de datos

1. Abre tu cliente MySQL (MySQL Workbench, MySQL CLI, etc.)
2. Ejecuta el script SQL disponible en la raíz del proyecto:

```bash
mysql -u tu_usuario -p tu_password < ../green-alert.sql
```

O importa manualmente el archivo `green-alert.sql` desde tu cliente MySQL.

### Tablas principales

- `usuarios` - Registros de usuarios
- `reportes` - Reportes ambientales
- `categorias_riesgo` - Tipos de contaminación
- `evidencias` - Archivos adjuntos a reportes

---

##  Instalación

1. **Clonar el repositorio** (o descargar el código):

```bash
git clone https://github.com/tu-usuario/greenalert-backend.git
cd greenalert-backend
```

2. **Instalar dependencias**:

```bash
npm install
```

3. **Crear archivo `.env`** en la raíz del proyecto:

```bash
cp .env.example .env
```

---

##  Configuración

### Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz de la carpeta `backend/` con las siguientes variables:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=green_alert

# Autenticación
JWT_SECRET=tu_clave_secreta_muy_segura_aqui_12345678
JWT_EXPIRES_IN=7d

# Archivos
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Email (opcional para futuro)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password

# Frontend
FRONTEND_URL=http://localhost:5173
```

### `.env.example`

Se incluye archivo `env.example` con variables requeridas como referencia.

### Servicio de correo

Se agrego el servicio `src/services/email.service.js` para envio de correos con Nodemailer.
Usa las variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y expone `enviarCorreo(to, subject, html)`.
Para recuperacion de contrasena se usa `FRONTEND_URL` para construir el enlace.

---

##  Ejecución

### Desarrollo (con hot-reload)

```bash
npm run dev
```

El servidor iniciará en `http://localhost:3000`

### Producción

```bash
npm start
```

---

##  Scripts Disponibles

```bash
npm run dev          # Inicia servidor con nodemon (desarrollo)
npm start            # Inicia servidor con node (producción)
npm run test         # Ejecuta pruebas (si existen)
npm run lint         # Verifica código (si está configurado)
```

---

##  Estructura del Proyecto

```
backend/
├── .env                          # Variables de entorno (NO commitear)
├── .env.example                  # Plantilla de variables
├── .gitignore                    # Archivos a ignorar en git
├── node_modules/                 # Dependencias instaladas
├── package.json                  # Definición de proyecto y dependencias
├── package-lock.json             # Lock de versiones
├── README.md                     # Este archivo
│
├── src/
│   ├── app.js                    # Configuración de Express
│   ├── server.js                 # Punto de entrada
│   │
│   ├── config/
│   │   └── database.js           # Pool de conexiones MySQL
│   │
│   ├── controllers/              # Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── admin.controller.js
│   │   ├── reporte.controller.js
│   │   ├── categoria-riesgo.controller.js
│   │   ├── health.controller.js
│   │   └── usuario.controller.js
│   │
│   ├── models/                   # Acceso a datos
│   │   ├── usuario.model.js
│   │   ├── reporte.model.js
│   │   ├── evidencia.model.js
│   │   ├── categoria-riesgo.model.js
│   │   └── notificacion.model.js
│   │
│   ├── services/                 # Servicios reutilizables
│   │   ├── email.service.js      # Envío de emails
│   │   └── ia.service.js         # Integración con IA
│   │
│   └── utils/
│       └── response.js           # Formato de respuestas
│
├── middlewares/                  # Middleware de Express
│   ├── auth.middleware.js        # Verificación de JWT
│   ├── errorHandler.js           # Manejo de errores
│   ├── upload.middleware.js      # Carga de files
│   └── logger.middleware.js      # Logging
│
├── routes/                       # Definición de endpoints
│   ├── auth.routes.js
│   ├── admin.routes.js
│   ├── reporte.routes.js
│   ├── categoria-riesgo.routes.js
│   ├── usuario.routes.js
│   └── health.routes.js
│
├── uploads/                      # Archivos subidos (gitignored)
│
└── docs/                         # Documentación
    ├── CONSTANTES_VALIDACION.js
    └── ENDPOINTS_PERFIL.md
```

---

##  Endpoints Disponibles

### Autenticación (`/auth`)

| Método | Ruta | Protegida | Descripción |
|--------|------|-----------|-------------|
| `POST` | `/auth/register` | No | Registro de nuevo usuario |
| `POST` | `/auth/login` | No | Login de usuario |
| `POST` | `/auth/forgot-password` | No | Solicitar recuperacion de contrasena |
| `POST` | `/auth/reset-password` | No | Restablecer contrasena con token |
| `GET` | `/auth/perfil` | Si | Obtener perfil del usuario |
| `PATCH` | `/auth/perfil` | Si | Actualizar perfil |
| `PATCH` | `/auth/cambiar-contrasena` | Si | Cambiar contraseña |

### Reportes (`/reportes`)

| Método | Ruta | Protegida | Descripción |
|--------|------|-----------|-------------|
| `GET` | `/reportes` | No | Listar todos los reportes |
| `GET` | `/reportes/stats` | No | Estadísticas generales |
| `GET` | `/reportes/:id` | No | Obtener detalle de reporte |
| `POST` | `/reportes` | Si | Crear nuevo reporte |
| `PATCH` | `/reportes/:id` | Si | Actualizar reporte |
| `DELETE` | `/reportes/:id` | Si | Eliminar reporte |

### Categorías (`/categorias`)

| Método | Ruta | Protegida | Descripción |
|--------|------|-----------|-------------|
| `GET` | `/categorias` | No | Listar todas las categorías |
| `GET` | `/categorias/:codigo` | No | Obtener detalle de categoría |
| `GET` | `/categorias/:codigo/reportes` | No | Reportes por categoría |
| `GET` | `/categorias/estadisticas/resumen` | No | Estadísticas por categoría |
| `GET` | `/categorias/estadisticas/por-severidad` | No | Estadísticas por severidad |

### Administracion (`/admin`)

Todas las rutas usan `verifyToken` y `requireRoles('admin')` aplicados en el router.

| Metodo | Ruta | Protegida | Descripcion |
|--------|------|-----------|-------------|
| `GET` | `/admin/usuarios/stats` | Si | Estadisticas de usuarios y reportes |
| `GET` | `/admin/usuarios` | Si | Listar usuarios con filtros y paginacion |
| `GET` | `/admin/usuarios/:id` | Si | Obtener usuario por id |
| `PATCH` | `/admin/usuarios/:id/rol` | Si | Cambiar rol del usuario |
| `PATCH` | `/admin/usuarios/:id/estado` | Si | Activar o desactivar usuario |
| `DELETE` | `/admin/usuarios/:id` | Si | Eliminar usuario (soft delete) |

### Administracion (`/admin`)

Todas las rutas usan `verifyToken` y `requireRoles('admin')` aplicados en el router.

| Metodo | Ruta | Protegida | Descripcion |
|--------|------|-----------|-------------|
| `GET` | `/admin/usuarios/stats` | ✅ | Estadisticas de usuarios y reportes |
| `GET` | `/admin/usuarios` | ✅ | Listar usuarios con filtros y paginacion |
| `GET` | `/admin/usuarios/:id` | ✅ | Obtener usuario por id |
| `PATCH` | `/admin/usuarios/:id/rol` | ✅ | Cambiar rol del usuario |
| `PATCH` | `/admin/usuarios/:id/estado` | ✅ | Activar o desactivar usuario |
| `DELETE` | `/admin/usuarios/:id` | ✅ | Eliminar usuario (soft delete) |

### Administracion (`/admin`)

Todas las rutas usan `verifyToken` y `requireRoles('admin')` aplicados en el router.

| Metodo | Ruta | Protegida | Descripcion |
|--------|------|-----------|-------------|
| `GET` | `/admin/usuarios/stats` | ✅ | Estadisticas de usuarios y reportes |
| `GET` | `/admin/usuarios` | ✅ | Listar usuarios con filtros y paginacion |
| `GET` | `/admin/usuarios/:id` | ✅ | Obtener usuario por id |
| `PATCH` | `/admin/usuarios/:id/rol` | ✅ | Cambiar rol del usuario |
| `PATCH` | `/admin/usuarios/:id/estado` | ✅ | Activar o desactivar usuario |
| `DELETE` | `/admin/usuarios/:id` | ✅ | Eliminar usuario (soft delete) |

### Health

| Método | Ruta | Protegida | Descripción |
|--------|------|-----------|-------------|
| `GET` | `/health` | No | Estado del servidor |

---

##  Autenticación

### JWT Token

Se utiliza **JWT (JSON Web Tokens)** para autenticación:

1. Usuario se autentica con `POST /auth/login`
2. Backend retorna un token JWT válido por 7 días
3. Cliente incluye token en header: `Authorization: Bearer <token>`
4. Servidor verifica token en cada request protegido

### Headers Requeridos

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Middleware de Autenticación

El middleware `verifyToken` valida JWT en rutas protegidas.
Para control de acceso por rol se usa `requireRoles(...)` y debe declararse despues de `verifyToken`.

---

## Cambios recientes

- Middleware `requireRoles` para control por rol en rutas protegidas.
- Modelo de usuario con listados, conteos, cambios de rol/estado y estadisticas para administracion.
- Controlador y router de administracion con proteccion global de `verifyToken` y `requireRoles('admin')`.
- Servicio de correo con Nodemailer y funcion `enviarCorreo`.
- Flujo de recuperacion de contrasena con tokens de corta expiracion y envio por correo.

---

##  Base de Datos

### Conexión

El archivo `src/config/database.js` configura un pool de conexiones para mejor performance.

### Migrations

No se usa herramienta de migrations. El schema se manage manualmente con `green-alert.sql`.
Para recuperacion de contrasena se requieren las columnas `token_reset` y `token_reset_exp` en `usuarios`.

### Backup

Para hacer backup de la BD:

```bash
mysqldump -u usuario -p base_datos > backup.sql
```

---

##  Testing

Actualmente no hay suite de tests. Para futuro se sugiere usar:
- **Jest** para unit tests
- **Supertest** para tests de API
- **Newman** para tests de Postman

---

##  Deploy

### En Servidor Linux (DigitalOcean, Linode, etc.)

1. Conectar a servidor por SSH
2. Clonar repositorio
3. Instalar Node.js
4. Instalar MySQL
5. Ejecutar `npm install`
6. Configurar `.env`
7. Usar **PM2** para gestionar proceso:

```bash
npm install -g pm2
pm2 start src/server.js --name greenalert-api
pm2 save
pm2 startup
```

### Usando Docker

Se sugiere crear `Dockerfile` y `docker-compose.yml` para deployment containerizado.

---

##  Documentación Adicional

- [Endpoints Detallados](./docs/ENDPOINTS_PERFIL.md)
- [Constantes de Validación](./docs/CONSTANTES_VALIDACION.js)

---

##  Troubleshooting

### Error: `Cannot find module 'express'`

```bash
npm install
```

### Error: `ER_HOST_NOT_KNOWN`

Verifica que MySQL esté corriendo y que host/puerto en `.env` sean correctos.

### Error: `ER_BAD_DB_ERROR`

La base de datos no existe. Ejecuta:

```bash
mysql -u root -p < green-alert.sql
```

### Puerto 3000 ya en uso

Cambia el puerto en `.env` o cierra la aplicación que lo usa:

```bash
# En Windows
netstat -ano | findstr :3000

# En Linux/Mac
lsof -i :3000
```

---

##  Contacto y Soporte

Para reportar bugs o sugerencias, abre un **Issue** en GitHub.

---

##  Licencia

Este proyecto es parte de un trabajo académico. Ver licencia en el repositorio principal.

---

##  Cambios Recientes

### v2.0

- ✅ Agregar 4 nuevas categorías de riesgo ambiental
- ✅ Implementar endpoints de perfil de usuario
- ✅ Mejorar manejo de errores

### v1.0

- ✅ Setup inicial del proyecto
- ✅ Autenticación JWT
- ✅ CRUD de reportes
- ✅ Gestión de categorías

---

**Última actualización**: March 28, 2026
|-----------|--------|-----------|-------------|
| 🌲 Deforestación | `deforestacion` | Alto | Tala o pérdida de cobertura forestal |
| 🔥 Incendios Forestales | `incendios_forestales` | Crítico | Fuegos descontrolados en bosques |
| ⚠️ Deslizamientos | `deslizamientos` | Alto | Movimientos en masa del terreno |
| 💧 Avalanchas Fluviotorrenciales | `avalanchas_fluviotorrenciales` | Crítico | Crecidas súbitas de ríos/quebradas |

### Archivos Nuevos

```
backend/
├── src/
│   ├── models/
│   │   └── categoria-riesgo.model.js    ← Consultas a BD de categorías
│   └── controllers/
│       └── categoria-riesgo.controller.js ← Lógica de categorías
├── routes/
│   └── categoria-riesgo.routes.js       ← Endpoints de categorías
└── docs/
    └── CONSTANTES_VALIDACION.js         ← Constantes para validaciones
```

### Integración Requerida

**Paso 1:** Agregar router en `backend/src/app.js`

```javascript
import categoriaRouter from '../routes/categoria-riesgo.routes.js';

// En la sección de rutas
app.use('/api/categorias', categoriaRouter);
```

### Base de Datos

Ejecutar el script `DATABASE_COMPLETA.sql` en tu cliente MySQL/HeidiSQL:
- Crea tablas: usuarios, reportes, evidencias, categorias_riesgo
- Inserta 11 categorías (7 existentes + 4 nuevas)
- Configura índices optimizados

## Endpoints principales

### Autenticación
- `POST /auth/register`: registro de usuario
- `POST /auth/login`: inicio de sesion

### Reportes
- `GET /reportes`: lista de reportes
- `GET /reportes/:id`: detalle de reporte
- `POST /reportes`: crear reporte (requiere token)
- `PATCH /reportes/:id`: actualizar reporte (requiere token)
- `DELETE /reportes/:id`: eliminar reporte logico (requiere token)

### 🆕 Categorías de Riesgo
- `GET /api/categorias`: obtener todas las categorías con estadísticas
- `GET /api/categorias/:codigo`: obtener detalle de una categoría (ej: `deforestacion`)
- `GET /api/categorias/:codigo/reportes`: listar reportes de una categoría con filtros opcionales
  - Parámetros: `estado`, `nivel_severidad`, `municipio`, `limit`, `offset`
- `GET /api/categorias/estadisticas/resumen`: estadísticas de reportes por categoría
- `GET /api/estadisticas/por-severidad`: estadísticas agrupadas por severidad

### Salud
- `GET /health`: estado del servidor y conexion a base de datos

##  Crear un Reporte

Todos los tipos de contaminación ahora disponibles:

```javascript
POST /api/reportes
Content-Type: application/json
Authorization: Bearer {token}

{
  "tipo_contaminacion": "deforestacion",  // agua, aire, suelo, ruido, residuos, luminica, 
                                            // deforestacion, incendios_forestales, 
                                            // deslizamientos, avalanchas_fluviotorrenciales, otro
  "nivel_severidad": "alto",              // bajo, medio, alto, critico
  "titulo": "Tala masiva en sector X",
  "descripcion": "Descripción detallada del problema...",
  "direccion": "Dirección exacta",
  "municipio": "Mocoa",
  "latitud": 1.1506,
  "longitud": -76.6451
}
```

##  Estructura de Capas

```
backend/
├── src/
│   ├── app.js                      Configuración de Express
│   ├── server.js                   Punto de entrada
│   ├── config/
│   │   └── database.js             Conexión MySQL
│   ├── models/                     Acceso a datos (BD)
│   │   ├── usuario.model.js
│   │   ├── reporte.model.js
│   │   ├── evidencia.model.js
│   │   └── categoria-riesgo.model.js
│   ├── controllers/                Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── health.controller.js
│   │   ├── reporte.controller.js
│   │   └── categoria-riesgo.controller.js
│   ├── services/                   Servicios especializados
│   └── utils/
│       └── response.js             Formato de respuestas
├── routes/                         Definición de rutas
│   ├── auth.routes.js
│   ├── health.routes.js
│   ├── reporte.routes.js
│   └── categoria-riesgo.routes.js
├── middlewares/                    Middleware personalizado
│   ├── auth.middleware.js
│   └── errorHandler.js
└── docs/
    └── CONSTANTES_VALIDACION.js    Constantes y validadores
```

##  Documentación Disponible

- `GUIA_IMPLEMENTACION.md` - Guía completa de integración
- `INICIO_RAPIDO.md` - Pasos rápidos (5 minutos)
- `EJEMPLOS_REPORTES.json` - Ejemplos JSON de reportes
- `TAREA_GITHUB_FormularioReporte.md` - Tarea para el frontend
- `DATABASE_COMPLETA.sql` - Script completo de BD (compatible HeidiSQL)

##  Ejemplo de Uso

**Crear un reporte de deforestación:**

```bash
curl -X POST http://localhost:3000/api/reportes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "tipo_contaminacion": "deforestacion",
    "nivel_severidad": "alto",
    "titulo": "Tala masiva de árboles en Mocoapamba",
    "descripcion": "Se observa pérdida forestal de 50 hectáreas...",
    "direccion": "Vereda Mocoapamba",
    "municipio": "Mocoa",
    "latitud": 1.1506,
    "longitud": -76.6451
  }'
```

**Obtener reportes de deforestación:**

```bash
curl http://localhost:3000/api/categorias/deforestacion/reportes?nivel_severidad=alto&limit=10
```

**Ver estadísticas:**

```bash
curl http://localhost:3000/api/categorias/estadisticas/resumen
```

##  Próximos Pasos

1. **Frontend:** Implementar formulario para crear reportes (ver `TAREA_GITHUB_FormularioReporte.md`)
2. **Testing:** Crear pruebas unitarias para los nuevos endpoints
3. **Validaciones:** Considerar validaciones adicionales por categoría
4. **Notificaciones:** Alertas en tiempo real para reportes críticos

## Estructura principal

```
backend/
  src/
    app.js                # Configuracion de Express y middlewares
    server.js             # Arranque del servidor
    config/
      database.js         # Pool de conexion MySQL
    controllers/          # Logica de endpoints
    models/               # Consultas a base de datos
    utils/
      response.js         # Respuestas estandar
  routes/                 # Definicion de rutas
  middlewares/            # Auth y manejo de errores
```

## Notas utiles

- Si falta `JWT_SECRET`, las rutas de autenticacion devolveran error 500 al generar token.
- Si la conexion a MySQL falla, el servidor se detiene al iniciar.
