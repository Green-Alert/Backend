# Integracion frontend para entidades, reportes y alertas

Esta guia documenta los contratos actuales del backend para construir el panel de usuario entidad en Green Alert. No se debe enviar `id_entidad` desde el frontend para consultar datos propios: el backend siempre toma la entidad desde el JWT (`id_entidad` o `entidad_id`).

## Base URL

El backend monta las rutas con `API_PREFIX`. Si `API_PREFIX` esta vacio, las rutas reales son `/entidades/...`. En el frontend actual puede usarse `/api` si Vite esta configurado como proxy hacia el backend.

Ejemplo:

```js
const API_BASE = '/api';
const token = localStorage.getItem('token');

const response = await fetch(`${API_BASE}/entidades/mis-reportes`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

## Entidades activas

Las entidades institucionales disponibles para esta fase son:

| Codigo | Nombre |
| --- | --- |
| `bomberos` | Bomberos |
| `corpoamazonia` | Corpoamazonia |
| `gestion_riesgo` | Gestion del Riesgo |
| `secretaria_salud` | Secretaria de Salud |
| `alcaldia_servicios_publicos` | Alcaldia / Servicios Publicos |

## Reglas funcionales generales

| Caso reportado | Entidad esperada |
| --- | --- |
| Incendios activos, rescates, accidentes con derrame, derrames peligrosos, personas atrapadas o riesgo directo a personas | Bomberos |
| Impacto ambiental, deforestacion, vertimientos, contaminacion, fauna o flora | Corpoamazonia |
| Avalanchas, crecientes, inundaciones, deslizamientos y amenazas naturales | Gestion del Riesgo |
| Riesgo sanitario, agua de consumo contaminada, residuos hospitalarios o salud publica | Secretaria de Salud |
| Basuras comunes, escombros, alcantarillado y servicios publicos | Alcaldia / Servicios Publicos |
| Casos ambiguos o sin regla clara | Revision manual |

Las asignaciones pueden tener prioridad `baja`, `media`, `alta` o `critica`. Las alertas persistentes por entidad se crean solo para asignaciones `alta` y `critica`.

## Seguridad

Todos los endpoints de `mis-reportes` y `mis-alertas` requieren:

- Header `Authorization: Bearer <jwt>`.
- Rol `entidad`.
- Usuario entidad con `id_entidad` o `entidad_id` en el token.

El frontend no debe enviar ni confiar en `id_entidad` para estos endpoints. Si el usuario intenta manipular query params o body con otra entidad, el backend los ignora en los endpoints propios.

Errores comunes:

| Estado | Caso | Mensaje esperado |
| --- | --- | --- |
| `401` | Token ausente | `acceso denegado. token no proporcionado.` |
| `403` | Token invalido o expirado | `token invalido o expirado.` |
| `403` | Rol distinto de `entidad` | `acceso denegado. rol no autorizado.` |
| `403` | Usuario entidad sin entidad asociada | `Usuario entidad sin entidad asignada.` |
| `404` | Alerta o reporte no pertenece a la entidad | `Alerta de entidad no encontrada.` o `Reporte asignado no encontrado.` |

## Reportes asignados

### GET `/entidades/mis-reportes`

Lista reportes asignados a la entidad autenticada.

Query params soportados:

- `prioridad`
- `estado_atencion`
- `tipo_asignacion`
- `categoria`
- `severidad`
- `limit`
- `offset`

Respuesta esperada:

```json
{
  "status": "success",
  "message": "Reportes asignados obtenidos correctamente.",
  "data": {
    "reportes": [
      {
        "id_reporte": 101,
        "uuid": "uuid-reporte",
        "titulo": "Derrame de combustible",
        "descripcion": "Derrame cerca al rio",
        "categoria": "suelo",
        "tipo_contaminacion": "suelo",
        "subcategoria": "derrame_de_combustible",
        "severidad": "critico",
        "nivel_severidad": "critico",
        "estado": "pendiente",
        "latitud": 1.15,
        "longitud": -76.65,
        "direccion": "Via principal",
        "municipio": "Mocoa",
        "departamento": "Putumayo",
        "created_at": "2026-06-01T10:00:00.000Z",
        "updated_at": "2026-06-01T10:00:00.000Z",
        "asignacion": {
          "id_reporte_entidad": 70,
          "tipo_asignacion": "principal",
          "prioridad": "critica",
          "estado_atencion": "pendiente",
          "comentario": null,
          "asignado_at": "2026-06-01T10:05:00.000Z",
          "actualizado_at": null
        },
        "entidad": {
          "id_entidad": 1,
          "codigo": "bomberos",
          "nombre": "Bomberos"
        }
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

Ejemplo frontend:

```js
export async function getMisReportesEntidad(token, filtros = {}) {
  const params = new URLSearchParams(filtros);
  const response = await fetch(`/api/entidades/mis-reportes?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw await response.json();
  return response.json();
}
```

### GET `/entidades/mis-reportes/:id`

Obtiene el detalle de un reporte asignado a la entidad autenticada e incluye evidencias.

### PATCH `/entidades/mis-reportes/:id/atencion`

Actualiza el estado de atencion de la asignacion de la entidad autenticada.

Body:

```json
{
  "estado_atencion": "en_atencion",
  "comentario": "Equipo en desplazamiento."
}
```

Estados aceptados: `pendiente`, `en_atencion`, `atendido`, `cerrado`.

## Alertas persistentes por entidad

Las alertas se crean automaticamente cuando una asignacion de reporte tiene prioridad `alta` o `critica`.

- `critica` crea `tipo_alerta: reporte_critico_asignado`.
- `alta` crea `tipo_alerta: reporte_prioritario_asignado`.
- `media` y `baja` no crean alerta persistente.

### GET `/entidades/mis-alertas`

Lista todas las alertas de la entidad autenticada.

Query params:

- `limit`
- `offset`

Respuesta esperada:

```json
{
  "status": "success",
  "message": "Alertas de entidad obtenidas correctamente.",
  "data": {
    "alertas": [
      {
        "id_alerta_entidad": 12,
        "uuid": "uuid-alerta",
        "id_reporte_entidad": 70,
        "id_reporte": 101,
        "id_entidad": 1,
        "tipo_alerta": "reporte_critico_asignado",
        "prioridad": "critica",
        "titulo": "Reporte critico asignado",
        "mensaje": "Se asigno un reporte critico a tu entidad: suelo.",
        "leida": false,
        "leida_at": null,
        "leida_por": null,
        "metadata": {
          "reporte_uuid": "uuid-reporte",
          "tipo_asignacion": "principal",
          "entidad_codigo": "bomberos",
          "entidad_nombre": "Bomberos"
        },
        "created_at": "2026-06-01T10:05:00.000Z",
        "updated_at": "2026-06-01T10:05:00.000Z",
        "reporte": {
          "titulo": "Derrame de combustible",
          "descripcion": "Derrame cerca al rio",
          "categoria": "suelo",
          "subcategoria": "derrame_de_combustible",
          "nivel_severidad": "critico",
          "estado": "pendiente",
          "municipio": "Mocoa",
          "departamento": "Putumayo",
          "latitud": 1.15,
          "longitud": -76.65
        }
      }
    ],
    "meta": {
      "total": 1,
      "no_leidas": 1,
      "limit": 20,
      "offset": 0
    }
  }
}
```

### GET `/entidades/mis-alertas/no-leidas`

Lista solo alertas no leidas de la entidad autenticada. Usa la misma estructura de respuesta que `/mis-alertas`, filtrando `leida: false`.

### GET `/entidades/mis-alertas/no-leidas/count`

Devuelve el contador de alertas no leidas.

```json
{
  "status": "success",
  "message": "ok",
  "data": {
    "no_leidas": 3
  }
}
```

### PATCH `/entidades/mis-alertas/:id/leer`

Marca una alerta propia como leida. `:id` es `id_alerta_entidad`, no `uuid`.

Respuesta:

```json
{
  "status": "success",
  "message": "Alerta marcada como leida.",
  "data": {
    "id_alerta_entidad": 12
  }
}
```

Si la alerta no pertenece a la entidad autenticada, el backend responde `404`.

### PATCH `/entidades/mis-alertas/leer-todas`

Marca todas las alertas no leidas de la entidad autenticada.

Respuesta:

```json
{
  "status": "success",
  "message": "Alertas de entidad marcadas como leidas.",
  "data": {
    "actualizadas": 4
  }
}
```

Ejemplo frontend para marcar:

```js
export async function marcarAlertaLeida(token, idAlerta) {
  const response = await fetch(`/api/entidades/mis-alertas/${idAlerta}/leer`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw await response.json();
  return response.json();
}
```

## Socket.IO

El backend usa Socket.IO para eventos en tiempo real. El frontend debe enviar el JWT al conectar y no debe elegir sala manualmente.

Instalacion sugerida en frontend:

```bash
npm install socket.io-client
```

Conexion:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token },
});

socket.on('connect_error', (error) => {
  console.error(error.message);
});
```

Reglas:

- El backend valida el JWT.
- Si el token falta, la conexion falla con `token requerido`.
- Si el token es invalido, la conexion falla con `token invalido`.
- Si el usuario tiene rol `entidad`, el backend lo une automaticamente a `entidad:<id>`.
- El frontend no debe emitir eventos para unirse a salas ni enviar `id_entidad`.

Evento recibido:

```js
socket.on('reporte:critico_asignado', (payload) => {
  // Actualizar contador, mostrar alerta visual y recargar datos si aplica.
});
```

Payload esperado:

```json
{
  "reporte": {
    "id_reporte": 101,
    "uuid": "uuid-reporte",
    "titulo": "Derrame de combustible",
    "descripcion": "Derrame cerca al rio",
    "categoria": "suelo",
    "subcategoria": "derrame_de_combustible",
    "nivel_severidad": "critico",
    "estado": "pendiente",
    "created_at": "2026-06-01T10:00:00.000Z",
    "latitud": 1.15,
    "longitud": -76.65,
    "municipio": "Mocoa",
    "departamento": "Putumayo",
    "direccion": "Via principal"
  },
  "asignacion": {
    "tipo_asignacion": "principal",
    "prioridad": "critica",
    "asignado_at": "2026-06-01T10:05:00.000Z"
  },
  "entidad": {
    "id_entidad": 1,
    "codigo": "bomberos",
    "nombre": "Bomberos"
  }
}
```

Socket.IO solo emite para prioridad `critica`. Las alertas persistentes se crean para `alta` y `critica`, incluso si no hay clientes conectados.

## Flujo recomendado para frontend

1. Al iniciar sesion como usuario entidad, guardar el JWT con el patron actual del frontend.
2. Cargar reportes con `GET /entidades/mis-reportes`.
3. Cargar contador con `GET /entidades/mis-alertas/no-leidas/count`.
4. Cargar alertas con `GET /entidades/mis-alertas/no-leidas` o `GET /entidades/mis-alertas`.
5. Conectar Socket.IO usando el JWT.
6. Escuchar `reporte:critico_asignado`.
7. Cuando llegue el evento, actualizar badge, mostrar alerta visual y recargar reportes/alertas si aplica.
8. Marcar una alerta como leida cuando el usuario la abra.
9. Permitir marcar todas como leidas desde el panel.

## Recomendaciones de UI

- Mostrar un badge con el numero de alertas no leidas.
- Crear un panel de alertas separado del listado de reportes.
- Diferenciar visualmente reportes `critica`, `alta` y normales.
- Mostrar prioridad, categoria, subcategoria, ubicacion, fecha y estado de atencion.
- No exponer filtros por `id_entidad` en la UI de usuario entidad.
- Si el backend devuelve `403`, cerrar sesion o mostrar que el usuario no tiene permisos.
- Si el backend devuelve `Usuario entidad sin entidad asignada.`, mostrar un mensaje operativo para contactar al administrador.

## Puntos pendientes

- Implementar las vistas frontend del panel de entidad.
- Validar visualmente los nombres finales de campos que usara cada componente.
- Ajustar el diseno del panel de alertas y badges.
- Probar manualmente login, carga inicial, lectura de alertas y evento Socket.IO contra backend local.
