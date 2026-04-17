# 🧪 MANUAL_EMAIL_CONFIG - Pruebas Manuales de Configuración

> Guía paso a paso para verificar configuración de email sin automatización

---

## 📌 Descripción

Procedimiento manual para validar que las variables de email están correctamente configuradas y el servicio funciona de extremo a extremo.

---

## ✅ Prueba 1: Verificar Variables .env

### Pasos
1. Abrir archivo `Backend/.env`
2. Verificar que existen estas variables:
   ```env
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=587
   EMAIL_USER=tu_usuario@mailtrap.io
   EMAIL_PASS=tu_contraseña
   EMAIL_FROM=noreply@greenalert.com
   ```

### Validación ✓
- [ ] EMAIL_HOST existe
- [ ] EMAIL_PORT es número (587 o 465)
- [ ] EMAIL_USER no es "your_email@mailtrap.io"
- [ ] EMAIL_PASS no es "your_password"
- [ ] EMAIL_FROM tiene formato válido

---

## ✅ Prueba 2: Validar Carga de Variables

### Pasos
1. Iniciar servidor:
   ```bash
   npm start
   ```

2. Verificar en consola:
   ```
   ✓ Configuración de email validada correctamente
   ```

### Validación ✓
- [ ] Aparece mensaje de validación ✓
- [ ] Servidor no muestra errores de email
- [ ] No dice "Variables de entorno para Email no configuradas"

---

## ✅ Prueba 3: Verificar Estructura de Config

### Pasos
1. Abrir DevTools o Node REPL
2. Ejecutar:
   ```javascript
   import { getEmailConfig } from './src/config/email.config.js';
   const config = getEmailConfig();
   console.log(config);
   ```

3. Verificar output:
   ```javascript
   {
     host: 'smtp.mailtrap.io',
     port: 587,
     user: 'usuario@mailtrap.io',
     pass: 'abc123xyz',
     from: 'noreply@greenalert.com'
   }
   ```

### Validación ✓
- [ ] Config tiene 5 propiedades
- [ ] port es número (no string)
- [ ] from tiene formato email válido

---

## ✅ Prueba 4: Enviar Correo de Prueba

### Pasos
1. Registrase como usuario en la app
2. Ir a verificación de email
3. Hacer click en "Enviar email de verificación"
4. Revisar correo en Mailtrap (o proveedor SMTP)

### Validación ✓
- [ ] Correo recibido en 2-5 segundos
- [ ] Asunto: "Verifica tu correo electronico en GreenAlert"
- [ ] Contiene nombre del usuario
- [ ] Contiene enlace de verificación
- [ ] Enlace tiene formato: `/auth/verify-email?token=...`
- [ ] Email viene de "noreply@greenalert.com" (EMAIL_FROM)

---

## ✅ Prueba 5: Hacer Click en Enlace

### Pasos
1. Copiar enlace del correo
2. Abrir en navegador
3. Esperar respuesta

### Validación ✓
- [ ] Aparece mensaje: "Email verificado exitosamente"
- [ ] Puede iniciar sesión
- [ ] Perfil muestra email_verificado: true

---

## ✅ Prueba 6: Template HTML Válido

### Pasos
1. En Mailtrap, ver correo recibido
2. Expandir "View raw" o "Source"
3. Verificar HTML

### Validación ✓
- [ ] Contiene `<html>` y `</html>`
- [ ] Tiene estilos CSS
- [ ] Contiene nombre dinámico
- [ ] Botón "Verificar mi correo" presente
- [ ] Footer con copyright y links

---

## ✅ Prueba 7: Cambiar Config y Validar Error

### Pasos
1. Abrir `.env`
2. Modificar `EMAIL_PORT="invalid"`
3. Reiniciar servidor: `npm start`
4. Ver error en consola

### Validación ✓
- [ ] Aparece error: "EMAIL_PORT debe ser un número válido"
- [ ] Servidor no inicia
- [ ] Error es claro y útil

---

## 📊 Checklist Completo

```
✅ Variables .env presentes
✅ Mensaje de validación al iniciar
✅ Estructura de config correcta
✅ Correo recibido en Mailtrap
✅ Enlace funciona
✅ Email verificado en BD
✅ Template HTML válido
✅ Errores claros cuando falla config
```

---

## 🔍 Solución de Problemas

### ❌ "No aparece mensaje de validación"
→ Verificar que `.env` existe  
→ Ejecutar: `npm install dotenv`

### ❌ "Puerto inválido"
→ Usar puerto típico: 25, 587 o 465  
→ 587 es el más común para TLS

### ❌ "Correo no llega"
→ Verificar credenciales en Mailtrap  
→ Revisar carpeta Spam  
→ Ver logs del servidor

### ❌ "EMAIL_FROM inválido"
→ Debe incluir @ y dominio  
→ Ejemplo ✓: `noreply@greenalert.com`  
→ Ejemplo ❌: `invalid-email`

---

**Última actualización:** abril 17, 2026

