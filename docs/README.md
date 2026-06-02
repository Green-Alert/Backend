# Documentacion publica del backend

Indice de documentacion tecnica y publica del Backend de Green Alert.

## Documentos principales

| Archivo | Proposito |
| --- | --- |
| [`../README.md`](../README.md) | Guia principal del backend, comandos, variables, seguridad y rutas reales. |
| [`openapi.yaml`](openapi.yaml) | Especificacion OpenAPI inicial de los modulos principales. |
| [`integracion-frontend-entidades.md`](integracion-frontend-entidades.md) | Contrato de entidades, reportes asignados, asignacion manual y alertas persistentes. |
| [`PREDICCION_ZONAS_RIESGO.md`](PREDICCION_ZONAS_RIESGO.md) | Reglas de zonas de riesgo y alertas predictivas. |
| [`regression-parity-208.md`](regression-parity-208.md) | Nota de paridad/regresion historica conservada para referencia. |

## OpenAPI

La especificacion inicial cubre:

- Autenticacion y OAuth.
- Usuarios y perfil.
- Reportes y evidencias.
- Entidades responsables y alertas de entidad.
- Notificaciones.
- Categorias de riesgo.
- Estadisticas, tendencias, zonas de riesgo y alertas predictivas.
- Chatbot.
- Administracion de usuarios.

No se monta Swagger UI desde el backend en esta etapa. El archivo queda listo para validacion externa o integracion futura.

## Contratos relevantes

### Estados de reporte

Valores aceptados por la API:

- `pendiente`
- `en proceso`
- `en_proceso`
- `resuelto`
- `rechazado`

El valor `en proceso` se normaliza internamente a `en_proceso`.

### Asignacion de entidades responsables

Valores validos de `tipo_asignacion`:

- `principal`
- `apoyo`

Valores validos de `prioridad`:

- `baja`
- `media`
- `alta`
- `critica`

### Evidencias

El backend acepta evidencias en memoria con:

- Maximo 10 evidencias por reporte.
- Maximo 1 video por reporte.
- Limite de tamano configurable con `MAX_FILE_SIZE`.
- Tipos MIME permitidos: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/quicktime`.
- Validacion de firma real del archivo para evitar contenido falsificado.
- Carga a Cloudinary, metadata, hash SHA-256 y soft delete.

## Seguridad por rutas

La documentacion publica debe conservar esta regla general:

- Rutas publicas: salud, login/registro, estadisticas publicas, listado publico de reportes, categorias publicas y FAQs.
- Rutas con autenticacion opcional: algunos listados de reportes, tendencias, alertas predictivas y chatbot.
- Rutas privadas: perfil, creacion/edicion de reportes, evidencias, notificaciones.
- Rutas restringidas por rol: administracion, estadisticas IA, zonas de riesgo, exportacion, asignacion manual y panel de entidad.

## Mantenimiento

Antes de cerrar cambios documentales:

1. Revisar `routes/*.routes.js`.
2. Confirmar middlewares de autenticacion y roles.
3. Verificar que no se documenten rutas inexistentes.
4. Ejecutar `npm test`.
5. Ejecutar la validacion de sintaxis equivalente al workflow con `node --check`.
