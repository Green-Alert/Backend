📋 QUICK REFERENCE: Google OAuth Setup
=====================================

✅ CHECKLIST RÁPIDO

- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar Google+ API
- [ ] Configurar pantalla de consentimiento OAuth
- [ ] Crear credenciales (Client ID + Secret)
- [ ] Copiar credenciales a Backend/.env
- [ ] Verificar configuración con npm run dev

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 VARIABLES REQUERIDAS EN .env

GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 DOCUMENTACIÓN COMPLETA

Ver: ../GOOGLE_OAUTH_SETUP.md

Para instrucciones paso a paso sobre cómo:
- Acceder a Google Cloud Console
- Crear proyecto
- Habilitar APIs
- Generar credenciales
- Configurar URIs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 VALIDAR CONFIGURACIÓN

1. Asegúrate que Backend/.env contiene las 3 variables
2. Ejecuta: npm run dev
3. Deberías ver: ✓ Google OAuth configuration loaded successfully

Si ves advertencia: ⚠ Google OAuth not yet configured
  → Completa las variables en .env y reinicia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 ARCHIVOS RELACIONADOS

Backend/src/config/google.config.js
  ↳ Configuración centralizada y validación

Backend/.env.example
  ↳ Template con todas las variables

Backend/README.md (sección "Configuración de Google OAuth")
  ↳ Documentación en el README

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANTE

- NUNCA commitees Backend/.env con credenciales reales
- Solo GOOGLE_CLIENT_ID puede ser público
- GOOGLE_CLIENT_SECRET debe mantenerse secreto
- En producción, usa variables de entorno del servidor (Heroku, GCP, AWS, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 NEXT STEPS

1. Completar credenciales de Google en Backend/.env
2. Implementar endpoints en Backend/routes/auth.routes.js:
   - GET /api/auth/google/callback
   - POST /api/auth/google/login
3. Integración con frontend (sin tocar archivos del frontend)
