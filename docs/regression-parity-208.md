# Regression tests y paridad interna

## Estado inicial

Antes de agregar artefactos para esta tarea se ejecuto:

```bash
npm run test:unit
```

Resultado: verde, `112/112`.

## Cobertura automatizada

- Rutas publicas sin `/api`: `tests/unit/route-prefix.test.js`.
- `optionalAuth`: `tests/unit/optional-auth.test.js`.
- Likes, vistas y trending: `tests/unit/likes-vistas-trending.test.js`.
- IA y upload multiple: `tests/unit/clasificacion-ia.test.js`, `tests/unit/ia-service.test.js`, `tests/unit/reporte-upload-evidencias.test.js`.
- Prediccion: `tests/unit/prediccion-service.test.js`.
- Chatbot: `tests/unit/chatbot-conversacional.test.js`.
- Notificaciones: `tests/unit/notificacion.controller.test.js`.
- Contrato de endpoints usados por el frontend: `tests/unit/frontend-api-contract.test.js`.

## Checklist de endpoints frontend

El frontend consume `/api` como base URL. En desarrollo, Vite reescribe `/api` hacia el backend sin prefijo interno; por eso el backend debe responder rutas como `/reportes`, `/auth`, `/chatbot`, etc. cuando `API_PREFIX` esta vacio.

Endpoints principales cubiertos por el contrato:

- `GET /health`
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/google`
- `POST /auth/facebook`
- `GET /categorias`
- `GET /categorias/:codigo`
- `GET /reportes`
- `POST /reportes`
- `GET /reportes/:id`
- `PATCH /reportes/:id`
- `DELETE /reportes/:id`
- `POST /reportes/:id/like`
- `GET /reportes/trending`
- `GET /reportes/stats`
- `GET /reportes/stats/categoria`
- `GET /reportes/stats/timeline`
- `GET /reportes/stats/heatmap`
- `GET /reportes/stats/ia`
- `POST /reportes/analizar-imagen`
- `GET /reportes/export`
- `GET /reportes/mis-reportes`
- `GET /reportes/zonas-riesgo`
- `GET /reportes/alertas-predictivas`
- `GET /auth/perfil`
- `PATCH /auth/perfil`
- `PATCH /auth/avatar`
- `PATCH /auth/cambiar-contrasena`
- `PATCH /auth/notificaciones`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/enviar-verificacion`
- `POST /auth/verificar-email`
- `GET /admin/usuarios/stats`
- `GET /admin/usuarios`
- `GET /admin/usuarios/:id`
- `PATCH /admin/usuarios/:id/rol`
- `PATCH /admin/usuarios/:id/estado`
- `DELETE /admin/usuarios/:id`
- `POST /chatbot/mensaje`
- `GET /chatbot/faqs`
- `GET /notificaciones`
- `GET /notificaciones/contador`
- `PATCH /notificaciones/:uuid/leida`
- `PATCH /notificaciones/marcar-todas`
- `DELETE /notificaciones/:uuid`

## Diagnostico manual

Para listar el contrato exportado por el frontend:

```bash
node tests/diagnose-frontend-contract.js
```

Para diagnosticar rutas contra un servidor levantado, usar `tests/diagnose-routes.js` ajustando `BASE_URL` si hace falta.

## Diferencias intencionales

- El backend no fuerza `/api` internamente por defecto. Esto permite que el proxy de Vite quite `/api` y mantenga compatibilidad local.
- `API_PREFIX=/api` sigue disponible para despliegues que quieran montar el backend con prefijo real.
