# Corrección: Fix LIMIT/OFFSET en Prepared Statements

## ✅ Descripción
Se corrigió el error `Incorrect arguments to mysqld_stmt_execute` presente al usar LIMIT y OFFSET como bound parameters en mysql2 prepared statements. La solución valida e inserta estos valores directamente en la consulta SQL.

## 🎯 Cambios Realizados

### Backend

#### 1. Modelo de Usuarios (`src/models/usuario.model.js`)
**Método afectado:** `findAll()`

**Cambio:** 
- ANTES: Usaba `LIMIT ?` y `OFFSET ?` como parámetros preparados
- AHORA: Valida los valores y los inserta directamente en el SQL

```javascript
// ✅ Nueva validación
if (limit !== undefined && limit !== null) {
  const validLimit = parseInt(limit, 10);
  if (!Number.isInteger(validLimit) || validLimit < 0) {
    throw new Error('limit must be a non-negative integer');
  }
  query += ` LIMIT ${validLimit}`;
  
  if (offset !== undefined && offset !== null) {
    const validOffset = parseInt(offset, 10);
    if (!Number.isInteger(validOffset) || validOffset < 0) {
      throw new Error('offset must be a non-negative integer');
    }
    query += ` OFFSET ${validOffset}`;
  }
}
```

### Tests

#### 2. Suite de Pruebas (`tests/models/usuario.pagination.test.js`)
**Nuevo archivo** con 10 tests:

- ✅ Paginación sin límites
- ✅ LIMIT correcto
- ✅ LIMIT + OFFSET funcionando
- ✅ Rechaza LIMIT negativo
- ✅ Rechaza OFFSET negativo
- ✅ Rechaza LIMIT no-numérico
- ✅ LIMIT con filtro de búsqueda
- ✅ LIMIT con filtro de rol
- ✅ OFFSET sin LIMIT (ignorado)
- ✅ LIMIT 0 válido

## 🧪 Tests
```bash
# Ejecutar todos los tests
node tests/run-all.js

# Ejecutar solo tests de paginación
node tests/run-all.js pagination
```

## 📁 Archivos Modificados
1. `src/models/usuario.model.js` - Corrección de LIMIT/OFFSET
2. `tests/models/usuario.pagination.test.js` - Nueva suite (10 tests)

## 🔒 Seguridad
- Validación de valores numéricos con `parseInt()` y `Number.isInteger()`
- Rechazo de valores negativos
- Conversión segura en string interpolation (evita inyección porque ya son integers validados)

## 📝 Criterios de Aceptación

| Criterio | Estado |
|----------|--------|
| Se corrige error `Incorrect arguments to mysqld_stmt_execute` | ✅ |
| Paginación funciona correctamente | ✅ |
| limit y offset validados antes de agregarse | ✅ |
| Funciona con y sin paginación | ✅ |
| Filtrado y ordenamiento sin cambios | ✅ |
| Tests automatizados incluidos | ✅ |

## ⚠️ Notas
- **Retro-compatible:** Sí, no requiere cambios en callsites
- **Migración BD:** No requerida
- **Redeploy:** Recomendado

## 🔗 Referencias
- Issue: Incorrect arguments to mysqld_stmt_execute
- Modelo: usuario.model.js
- Método: findAll()
