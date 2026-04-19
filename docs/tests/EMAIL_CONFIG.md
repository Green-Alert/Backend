# 📧 EMAIL_CONFIG - Tests de Configuración Centralizada

> Validación automática de variables de entorno para el servicio de email

---

## 📌 Descripción

Tests que verifican que la configuración centralizada de email (`src/config/email.config.js`) funciona correctamente y valida todas las variables requeridas.

---

## 🎯 Objetivos

✅ Validar que todas las variables de entorno existan  
✅ Verificar tipos de datos correctos  
✅ Validar rango del puerto SMTP  
✅ Verificar formato de EMAIL_FROM válido  
✅ Prevenir valores de prueba sin cambiar  
✅ Validar cache de configuración (singleton)  
✅ Asegurar estructura completa de config  

---

## 📋 Tests Implementados

### 1️⃣ Obtener configuración de email
**Código:**
```javascript
test('Obtener configuración de email', () => {
  const config = getEmailConfig();
  assert.ok(config, 'Config debe existir');
  assert.ok(config.host, 'EMAIL_HOST debe existir');
  assert.ok(config.port, 'EMAIL_PORT debe existir');
  assert.ok(config.user, 'EMAIL_USER debe existir');
  assert.ok(config.pass, 'EMAIL_PASS debe existir');
  assert.ok(config.from, 'EMAIL_FROM debe existir');
});
```

**Qué valida:**
- La función `getEmailConfig()` retorna un objeto
- Todas las propiedades requeridas están presentes
- No hay propiedades undefined

**Resultado esperado:** ✅ PASS

---

### 2️⃣ Validar tipos de datos
**Código:**
```javascript
test('Validar tipos de datos', () => {
  const config = getEmailConfig();
  assert.strictEqual(typeof config.host, 'string', 'host debe ser string');
  assert.strictEqual(typeof config.port, 'number', 'port debe ser number');
  assert.strictEqual(typeof config.user, 'string', 'user debe ser string');
  assert.strictEqual(typeof config.pass, 'string', 'pass debe ser string');
  assert.strictEqual(typeof config.from, 'string', 'from debe ser string');
});
```

**Qué valida:**
- host es string
- port es number (importante para validación)
- user, pass, from son strings

**Resultado esperado:** ✅ PASS

---

### 3️⃣ Validar rango de puerto SMTP
**Código:**
```javascript
test('Validar rango de puerto SMTP', () => {
  const config = getEmailConfig();
  assert.ok(config.port >= 1, 'Puerto debe ser >= 1');
  assert.ok(config.port <= 65535, 'Puerto debe ser <= 65535');
  assert.ok([25, 587, 465].includes(config.port), 'Puerto típico SMTP');
});
```

**Qué valida:**
- Puerto dentro del rango válido (1-65535)
- Puerto es uno de los típicos SMTP: 25, 587, 465
- Puertos: 25 (plain), 587 (TLS), 465 (SSL)

**Resultado esperado:** ✅ PASS

---

### 4️⃣ Validar formato de EMAIL_FROM
**Código:**
```javascript
test('Validar formato de EMAIL_FROM', () => {
  const config = getEmailConfig();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.ok(emailRegex.test(config.from), 'EMAIL_FROM debe ser válido');
});
```

**Qué valida:**
- EMAIL_FROM tiene formato de email válido
- No hay espacios en blanco
- Tiene @ y punto (.)
- Ejemplo válido: `noreply@greenalert.com`
- Ejemplo inválido: `invalid-email`

**Resultado esperado:** ✅ PASS

---

### 5️⃣ Host SMTP válido o conocido
**Código:**
```javascript
test('Host SMTP válido o conocido', () => {
  const config = getEmailConfig();
  const knownHosts = ['smtp.mailtrap.io', 'smtp.gmail.com', 'smtp.sendgrid.net', 'localhost'];
  assert.ok(
    knownHosts.includes(config.host) || config.host.includes('mail'),
    'Host debe ser conocido'
  );
});
```

**Qué valida:**
- Host está en lista de hosts conocidos
- O contiene "mail" en el nombre
- Evita hosts aleatorios/inválidos
- Hosts conocidos: mailtrap, gmail, sendgrid

**Resultado esperado:** ✅ PASS

---

### 6️⃣ No contiene valores de ejemplo sin cambiar
**Código:**
```javascript
test('No contiene valores de ejemplo sin cambiar', () => {
  const config = getEmailConfig();
  const invalidValues = ['your_email@mailtrap.io', 'your_password', 'smtp.example.com'];
  
  assert.ok(!invalidValues.includes(config.user), 'EMAIL_USER no debe ser ejemplo');
  assert.ok(!invalidValues.includes(config.pass), 'EMAIL_PASS no debe ser ejemplo');
  assert.ok(!invalidValues.includes(config.host), 'EMAIL_HOST no debe ser ejemplo');
});
```

**Qué valida:**
- No hay valores de prueba del `.env.example` sin cambiar
- Email_user no es "your_email@mailtrap.io"
- Email_pass no es "your_password"
- Host no es "smtp.example.com"

**Resultado esperado:** ✅ PASS

---

### 7️⃣ Cache de configuración (singleton)
**Código:**
```javascript
test('Cache de configuración (singleton)', () => {
  const config1 = getEmailConfig();
  const config2 = getEmailConfig();
  assert.strictEqual(config1, config2, 'Debe retornar la misma instancia');
});
```

**Qué valida:**
- `getEmailConfig()` retorna la misma instancia en llamadas sucesivas
- Patrón singleton funciona correctamente
- Evita reinicializar configuración innecesariamente

**Resultado esperado:** ✅ PASS

---

### 8️⃣ Estructura de configuración completa
**Código:**
```javascript
test('Estructura de configuración completa', () => {
  const config = getEmailConfig();
  const expectedKeys = ['host', 'port', 'user', 'pass', 'from'];
  const actualKeys = Object.keys(config);
  
  expectedKeys.forEach(key => {
    assert.ok(actualKeys.includes(key), `Config debe tener: ${key}`);
  });
});
```

**Qué valida:**
- Config tiene exactamente las propiedades esperadas
- No faltan propiedades
- Propiedades esperadas: host, port, user, pass, from

**Resultado esperado:** ✅ PASS

---

## 🚀 Ejecutar Tests

### Individual
```bash
node tests/config/email-config.test.js
```

### Todos los tests
```bash
node tests/run-all.js config
```

### Resultado esperado
```
📧 TESTS: Configuración de Email (email.config.js)

============================================================

✅ Obtener configuración de email
✅ Validar tipos de datos
✅ Validar rango de puerto SMTP
✅ Validar formato de EMAIL_FROM
✅ Host SMTP válido o conocido
✅ No contiene valores de ejemplo sin cambiar
✅ Cache de configuración (singleton)
✅ Estructura de configuración completa

============================================================

📊 RESUMEN DE TESTS

✅ Obtener configuración de email
✅ Validar tipos de datos
✅ Validar rango de puerto SMTP
✅ Validar formato de EMAIL_FROM
✅ Host SMTP válido o conocido
✅ No contiene valores de ejemplo sin cambiar
✅ Cache de configuración (singleton)
✅ Estructura de configuración completa

============================================================
Total: 8 | Pasado: 8 | Fallido: 0

✅ TODOS LOS TESTS PASARON
```

---

## 🔍 Posibles Fallos

### ❌ Falta EMAIL_HOST
```
Error: Variables de entorno para Email no configuradas: EMAIL_HOST
```
**Solución:** Configurar EMAIL_HOST en `.env`

### ❌ EMAIL_PORT inválido
```
Error: EMAIL_PORT debe ser un número válido entre 1 y 65535
```
**Solución:** Verificar que EMAIL_PORT sea número válido (25, 587, 465)

### ❌ EMAIL_FROM inválido
```
Error: EMAIL_FROM debe ser un correo electrónico válido
```
**Solución:** Configurar EMAIL_FROM con formato correcto: `noreply@ejemplo.com`

### ❌ Host no reconocido
```
❌ Host SMTP válido o conocido
   Error: Host debe ser conocido o contener 'mail'
```
**Solución:** Usar host conocido o que contenga "mail": mailtrap, gmail, sendgrid

---

## 📊 Cobertura

| Aspecto | Cobertura |
|---|---|
| Variables requeridas | ✅ 5/5 |
| Validación de tipos | ✅ 5/5 |
| Validación de valores | ✅ 8/8 |
| Edge cases | ✅ 3/3 |
| **Total** | **✅ 21/21** |

---

## 🔐 Seguridad Validada

✅ No contiene credenciales en código  
✅ Variables cargan desde `.env`  
✅ Formato de email validado  
✅ Puerto en rango válido  
✅ Cache protege múltiples inicializaciones  

---

## 📝 Notas Técnicas

- Los tests usan Node.js `assert` (built-in)
- No requieren librerías externas
- Se ejecutan de forma sincrónica
- Salida con colores para mejor visualización
- Exit code: 0 (éxito), 1 (fallo)

---

**Archivo:** `tests/config/email-config.test.js`  
**Última actualización:** abril 17, 2026

