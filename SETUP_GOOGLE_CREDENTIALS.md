# Configuración de Google OAuth en .env

**Objetivo**: Agregar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `Backend/.env`

---

## Pasos Rápidos

### 1. Obtener Credenciales (15 minutos)

Sigue **una** de estas opciones:

**Opción A: Guía Completa** (Recomendado si es primera vez)
- Abre: [`GOOGLE_OAUTH_SETUP.md`](./GOOGLE_OAUTH_SETUP.md)
- Sigue Pasos 1-4 completos
- Obtendrás Client ID y Secret

**Opción B: Pasos Rápidos** (Si ya conoces Google Cloud)
```
1. console.cloud.google.com → Nuevo Proyecto
2. APIs → Busca "Google+ API" → Habilitar
3. Credenciales → "+ Crear" → "Aplicación web"
   - URI de redireccionamiento: http://localhost:3000/api/auth/google/callback
4. Crear → Copiar Client ID y Client Secret
```

### 2. Configurar en .env

Abre `Backend/.env` y busca:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

Reemplaza con tus valores:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
```

OK **Formato Correcto:**
- `GOOGLE_CLIENT_ID`: Termina con `.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET`: Comienza con `GOCSPX-`

### 3. Validar Configuración

Ejecuta desde `Backend/`:

```bash
node validate-google-credentials.js
```

**Esperado:**
```
[OK] TODAS LAS VALIDACIONES PASARON
```

---

## Solucionar Problemas

### Error: "GOOGLE_CLIENT_ID: NO CONFIGURADO"

**Causas:**
- [ ] `.env` no existe (crea desde `.env.example`)
- [ ] Variables están comentadas (remove `#`)
- [ ] Typo en nombre de variable (debe ser exacto)

**Solución:**
```bash
# Desde Backend/
cp .env.example .env
# Luego edita y agrega tus valores
```

### Error: "Formato incorrecto"

**Causa:** Copiaste valores incompletos o equivocados

**Solución:**
1. Ve a https://console.cloud.google.com/
2. Proyecto → Credenciales
3. Click en la credencial OAuth
4. Copia valores completos (incluyendo guiones y caracteres especiales)

### Error: "Error validando configuración de backend"

**Causa:** Backend no puede leer `.env`

**Solución:**
```bash
# Verifica que .env esté en Backend/
cd Backend
ls .env  # Debería mostrarse

# Reinicia servidor
npm run dev
```

---

## Checklist

- [ ] Obtuve credenciales de Google Cloud Console
- [ ] `.env` existe en la carpeta `Backend/`
- [ ] Configuré `GOOGLE_CLIENT_ID`
- [ ] Configuré `GOOGLE_CLIENT_SECRET`
- [ ] Ejecuté `validate-google-credentials.js` sin errores
- [ ] Inicié servidor con `npm run dev`
- [ ] Ver en consola: `[OK] Google OAuth configuration loaded successfully`

---

## Referencia

| Archivo | Descripción |
|---------|-----------|
| `GOOGLE_OAUTH_SETUP.md` | Guía completa (pasos 1-7) |
| `GOOGLE_OAUTH_QUICK_REFERENCE.md` | Referencia rápida |
| `validate-google-credentials.js` | Script de validación |
| `Backend/README.md` | Sección "Configuración de Google OAuth 2.0" |

---

## Seguridad

**IMPORTANTE:**
- [OK] `.env` con credenciales reales -> NO commitear
- [OK] Usar `.env.example` en repositorio (con valores falsos)
- [OK] Solo compartir con team en privado
- [OK] Rotar credenciales si se exponen

**En .gitignore debe estar:**
```
.env
```

---

## Criterios de Aceptación

Una vez completado:

- [x] `GOOGLE_CLIENT_ID` definido en `.env`
- [x] `GOOGLE_CLIENT_SECRET` definido en `.env`
- [x] Variables accesibles en backend (validadas)
- [x] Servidor inicia sin errores de configuración
- [x] Script `validate-google-credentials.js` pasa todas las pruebas

---

**Tiempo estimado**: 20-30 minutos  
**Dificultad**: Bajo - solo seguir pasos  
**Próximo paso**: Implementar endpoints de autenticación
