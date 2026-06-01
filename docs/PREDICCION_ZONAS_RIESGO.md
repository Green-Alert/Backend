# Prediccion de zonas de riesgo

La prediccion usa reportes historicos moderados para agrupar eventos ambientales en celdas geograficas y producir zonas de riesgo consultables por el dashboard y las alertas.

## Datos de entrada

Solo se consideran reportes que cumplan estas condiciones:

- `deleted_at IS NULL`
- `latitud` y `longitud` no nulas
- `estado IN ('en_proceso', 'resuelto')`
- `created_at >= desde`, cuando se envia filtro por dias
- `tipo_contaminacion = tipo`, cuando se envia filtro por tipo

Los estados `pendiente` y `rechazado` no alimentan la prediccion.

## Agrupacion

Cada reporte se asigna a una celda de `0.05` grados por latitud/longitud. La zona expone el centro de la celda, no coordenadas individuales de usuarios.

## Score

Para cada celda:

```text
score = min(100, round((cantidad_reportes * 16) + (severidad_promedio * 14) + recencia_promedio))
```

Donde:

- `cantidad_reportes`: numero de reportes dentro de la celda.
- `severidad_promedio`: promedio de severidad mapeada como `bajo=1`, `medio=2`, `alto=3`, `critico=4`.
- `recencia_promedio`: promedio por reporte de `max(0, 30 - dias_desde_creacion)`.

## Niveles

- `critico`: score >= 80
- `alto`: score >= 60
- `medio`: score >= 35
- `bajo`: score >= 0

## Cache

Las zonas y alertas se cachean por parametros durante 5 minutos. La cache se invalida al crear reportes, al eliminar reportes y cuando una actualizacion cambia `estado` o `nivel_severidad`.

## Parametros

`/reportes/zonas-riesgo`:

- `dias`: entero entre 1 y 365. Default: 30.
- `tipo`: categoria opcional.
- `min_score`: numero entre 0 y 100. Default: 30.

`/reportes/alertas-predictivas`:

- Incluye los parametros anteriores.
- `limite`: entero entre 1 y 50. Default: 10.
- `nivel_min`: `bajo`, `medio`, `alto` o `critico`. Default: `medio`.
- `lat` y `lng`: deben enviarse juntos.
- `radio_km`: numero mayor a 0 y menor o igual a 500. Requiere `lat` y `lng`.
