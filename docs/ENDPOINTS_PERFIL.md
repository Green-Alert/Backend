# Endpoints de Perfil

Este documento describe los endpoints de perfil disponibles en el modulo de autenticacion.

## GET /auth/perfil

### Autenticacion
Requiere JWT en el header:

```http
Authorization: Bearer <token>
```

### Request
Sin body.

### Response 200 (exito)

```json
{
  "status": "success",
  "message": "Perfil obtenido correctamente.",
  "data": {
    "user": {
      "id_usuario": 1,
      "uuid": "9f3d0c5a-0f95-4e16-b9d8-7b8d0f117c11",
      "nombre": "Juan",
      "apellido": "Perez",
      "email": "juan@example.com",
      "rol": "ciudadano",
      "activo": true,
      "email_verificado": false,
      "avatar_url": "https://example.com/avatar.jpg",
      "telefono": "+573001112233",
      "created_at": "2026-04-05T17:40:31.000Z",
      "updated_at": "2026-04-05T17:40:31.000Z"
    }
  }
}
```

### Errores
- `401` no autenticado.
- `404` usuario no encontrado.
- `500` error de servidor.

Ejemplo de error:

```json
{
  "status": "error",
  "message": "Usuario no encontrado."
}
```

## PATCH /auth/perfil

### Autenticacion
Requiere JWT en el header:

```http
Authorization: Bearer <token>
```

### Request body
Todos los campos son opcionales a nivel de payload, pero si se envian deben cumplir validacion.

```json
{
  "nombre": "Juan",
  "apellido": "Perez",
  "telefono": "+573001112233",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

### Response 200 (exito)

```json
{
  "status": "success",
  "message": "Perfil actualizado",
  "data": {
    "user": {
      "id_usuario": 1,
      "uuid": "9f3d0c5a-0f95-4e16-b9d8-7b8d0f117c11",
      "nombre": "Juan",
      "apellido": "Perez",
      "email": "juan@example.com",
      "rol": "ciudadano",
      "activo": true,
      "email_verificado": false,
      "avatar_url": "https://example.com/avatar.jpg",
      "telefono": "+573001112233",
      "created_at": "2026-04-05T17:40:31.000Z",
      "updated_at": "2026-04-05T18:10:02.000Z"
    }
  }
}
```

### Errores
- `400` validacion fallida.
- `401` no autenticado.
- `404` usuario no encontrado.
- `500` error de servidor.

Ejemplo de error de validacion:

```json
{
  "status": "error",
  "message": "El telefono no tiene un formato valido."
}
```

## PATCH /auth/cambiar-contrasena

### Autenticacion
Requiere JWT en el header:

```http
Authorization: Bearer <token>
```

### Request body (requerido)

```json
{
  "currentPassword": "Actual123",
  "newPassword": "NuevaClave123",
  "confirmPassword": "NuevaClave123"
}
```

### Response 200 (exito)

```json
{
  "status": "success",
  "message": "Contrasena actualizada",
  "data": null
}
```

### Errores
- `400` validacion fallida o contrasenas no coinciden.
- `401` no autenticado o contrasena actual incorrecta.
- `404` usuario no encontrado.
- `500` error de servidor.

Ejemplo de error por contrasena actual incorrecta:

```json
{
  "status": "error",
  "message": "La contrasena actual es incorrecta."
}
```
