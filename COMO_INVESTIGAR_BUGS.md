# 🔍 Cómo Investigar Bugs Complejos - MAKWIN

Guía para diagnosticar bugs que requieren acceso a logs, base de datos, o APIs externas.

---

## 📋 Tabla de Contents

1. [Bugs de Email (SendGrid/Resend)](#bugs-de-email)
2. [Bugs de Base de Datos](#bugs-de-base-de-datos)
3. [Bugs de Validación & Frontend](#bugs-de-validación--frontend)
4. [Cómo Leer Logs en Vercel](#cómo-leer-logs-en-vercel)
5. [Cómo Revisar Supabase](#cómo-revisar-supabase)
6. [Herramientas de Debugging Útiles](#herramientas-de-debugging-útiles)

---

## Bugs de Email

### Bug #4: "Email Rate Limit Exceeded" (1a)

**Síntoma**: Al crear cuenta nueva, error "Email rate limit exceeded"

**Raíz Probable**: Supabase tiene rate limiting activado

**Cómo Investigar**:

### Opción 1: Desactivar Rate Limiting en Supabase (Rápido)
```
1. Ve a https://app.supabase.com → Proyecto MAKWIN
2. Settings (engranaje) → Auth → Rate Limiting & Security
3. Busca "Email Verification" o "Email Signup"
4. Establece límite en 100 intentos por hora (o desactiva para testing)
5. Espera 5 minutos y vuelve a probar
```

### Opción 2: Usar Diferentes Emails (Workaround)
Cada email puede tener un límite. Si ya probaste con `aleix@test.com`, intenta:
- test1@test.com
- test2@test.com
- test3@test.com
- etc (cada uno es un usuario nuevo)

### Opción 3: Ver Logs de Supabase
```
1. Ve a Supabase > Logs
2. Filtra por "auth" o "signup"
3. Busca mensajes que mencionen "rate", "exceed", "limit"
4. Verifica el timestamp vs tus intentos
```

**Checklist**:
- [ ] Rate limiting desactivado o aumentado
- [ ] Probó con emails diferentes (test1@test.com, test2@test.com)
- [ ] Esperó 5 minutos entre intentos si el límite está bajo

---

### Bug #5 & #1b: Email Reset & Duplicado (1b, 1i, 1j)

**Síntoma Múltiple**:
- **1b**: Email duplicado devuelve "se ha enviado email" en lugar de error
- **1i**: "Error al enviar el correo" al hacer reset password
- **1j**: Reset funciona con email inexistente pero falla con válido

**Raíz Probable**: SendGrid/Resend API key no está configurada o es incorrecta

**Cómo Investigar - Paso 1: Verificar Variables de Entorno**

```
1. Ve a Vercel Dashboard: https://vercel.com/dashboard
2. Busca proyecto MAKWIN
3. Settings → Environment Variables
4. Busca estas keys:
   - SENDGRID_API_KEY
   - RESEND_API_KEY
   - SUPABASE_SERVICE_ROLE_KEY
5. Verifica que haya al menos UNA key de email configurada
```

**¿No ves las keys?**
```
Pasos para agregar SendGrid:
1. Ve a https://sendgrid.com → Account
2. API Keys → Create API Key (Full Access)
3. Copia la key (se ve algo como: SG.xxxxxxxxxxxxxxxxxxx)
4. Ve a Vercel Settings → Environment Variables
5. Agrega: 
   - KEY: SENDGRID_API_KEY
   - VALUE: {tu key copiada}
6. Click Redeploy para activar
7. Espera 2-3 minutos a que Vercel redeploy
```

**Cómo Investigar - Paso 2: Ver Logs de Email**

```
1. Ve a Vercel Dashboard > Project > Logs
2. Copia este texto en la búsqueda:
   sendEmail OR resetPassword OR "Email sent" OR "Error sending"
3. Filtra por TIME: "Last 24 hours"
4. Mira los últimos intentos
```

**¿Qué buscar en los logs?**

```
✅ EXITOSO:
"Email sent successfully to test@test.com"
"Reset password email queued"

❌ FALLIDO:
"SENDGRID_API_KEY is not configured"
"Invalid API key"
"Email service returned 401"
"Rate limit exceeded on email sending"
```

**Cómo Investigar - Paso 3: Test Manual de Email**

Si los logs no muestran mensaje de error claro:

1. Abre DevTools (F12) en navegador
2. Ve a Network tab
3. Intenta hacer POST a `/api/send-password-reset` o similar
4. Busca la solicitud en Network
5. Ve Response y Status

**Respuestas esperadas**:
```
✅ 200 OK: Email enviado
❌ 401: API key incorrecta/faltante
❌ 429: Rate limit del email service
❌ 400: Email inválido o ya existe
```

**Checklist**:
- [ ] SENDGRID_API_KEY o RESEND_API_KEY está en Vercel Environment Variables
- [ ] Vercel fue redeployado después de agregar key
- [ ] Logs en Vercel muestra "Email sent successfully"
- [ ] Network tab muestra 200 OK, no 401/429

---

## Bugs de Base de Datos

### Bug #8: "malformed array literal" (3d)

**Síntoma**: Al subir obra, error: `malformed array literal: 'mcqueen,poema'`

**Raíz Probable**: Hashtags se están guardando como string, no como array JSON

**Cómo Investigar**:

### Paso 1: Verifica qué se está guardando

```
1. Ve a Supabase > SQL Editor
2. Ejecuta esta query:

SELECT id, title, hashtags, hashtags::TEXT 
FROM works 
WHERE created_at > NOW() - INTERVAL '24 hours'
LIMIT 5;

3. Mira la columna 'hashtags' - ¿Qué ves?
```

**¿Qué debería ver?**

```
✅ CORRECTO (array): ["mcqueen", "poema"]
❌ INCORRECTO (string): "mcqueen,poema"
❌ INCORRECTO (string con #): "#mcqueen,#poema"
```

### Paso 2: Revisa el backend

Ve a `server/routes/` o `api/` folder:

```typescript
// ❌ INCORRECTO - guarda como string:
const hashtags = req.body.hashtags; // "mcqueen,poema"
await supabase.from('works').insert({ hashtags });

// ✅ CORRECTO - convierte a array:
const hashtags = req.body.hashtags
  .split(',')
  .map(tag => tag.trim())
  .filter(Boolean); // ["mcqueen", "poema"]
await supabase.from('works').insert({ hashtags });

// ✅ MÁS SEGURO - maneja ambos formatos:
let hashtags = req.body.hashtags;
if (typeof hashtags === 'string') {
  hashtags = hashtags.split(',').map(t => t.trim()).filter(Boolean);
}
// Ahora es array: ["mcqueen", "poema"]
await supabase.from('works').insert({ hashtags });
```

### Paso 3: Verifica el tipo de columna en Supabase

```
1. Ve a Supabase > Database > Tables > works
2. Busca columna "hashtags"
3. ¿Cuál es el Type?

✅ CORRECTO: text[] o text[]
❌ INCORRECTO: text
```

**¿Es text cuando debería ser text[]?**

Ejecuta en SQL Editor:
```sql
-- Convierte la columna
ALTER TABLE works 
ALTER COLUMN hashtags TYPE text[] USING string_to_array(hashtags, ',');
```

**Checklist**:
- [ ] Supabase columna hashtags es tipo `text[]` (array)
- [ ] Backend convierte string a array antes de guardar
- [ ] Query SQL confirma que se guardan como arrays `["tag1", "tag2"]`
- [ ] Próxima subida de obra ya guarda correctamente

---

## Bugs de Validación & Frontend

### Bug #6: Validación de Username Sin Feedback en Tiempo Real (1c)

**Síntoma**: Usuario escribe "..username" y no ve error hasta hacer submit

**Raíz Probable**: Validación solo ocurre onSubmit, no onChange

**Cómo Investigar**:

1. Abre `client/pages/Register.tsx`
2. Busca el input de username
3. Verifica si tiene `onChange` handler que revisa validación

```typescript
// ❌ INCORRECTO - valida solo al submit:
const handleSubmit = () => {
  if (!isValidUsername(username)) {
    setError('...');
  }
};

// ✅ CORRECTO - valida mientras escribes:
const handleUsernameChange = (e) => {
  const value = e.target.value;
  setUsername(value);
  
  if (value && !isValidUsername(value)) {
    setError('El usuario no puede empezar con punto');
  } else {
    setError('');
  }
};
```

**Patrón de Validación de Username**:
```typescript
const isValidUsername = (str) => {
  // Reglas:
  // - No debe empezar con punto
  // - No debe terminar con punto
  // - Solo letras, números, guiones, puntos
  // - Mínimo 3 caracteres
  
  const isValid = /^[a-z0-9]([a-z0-9_.]*[a-z0-9])?$/.test(str);
  return isValid && str.length >= 3;
};
```

### Bug #7: Allow GIF Upload en Avatar (2h)

**Síntoma**: Puedes subir GIF en avatar (problema de contenido +18)

**Raíz Probable**: Input de file no tiene validación de extensión

**Cómo Investigar**:

1. Abre el componente de avatar upload
2. Busca el input file
3. Verifica si tiene `accept` attribute

```typescript
// ❌ INCORRECTO - permite todo:
<input type="file" onChange={handleUpload} />

// ✅ CORRECTO - solo imágenes estáticas:
<input 
  type="file" 
  accept=".jpg,.jpeg,.png,.webp"
  onChange={handleUpload}
/>

// ✅ MÁS SEGURO - valida en código también:
const handleFileSelect = (file) => {
  const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileName = file.name.toLowerCase();
  const hasValidExt = validExts.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExt) {
    alert('Solo PNG, JPG, WebP. No GIFs.');
    return;
  }
  
  // Procede a upload
  uploadToCloudinary(file);
};
```

**Checklist**:
- [ ] Input file tiene `accept=".jpg,.jpeg,.png,.webp"`
- [ ] Código valida extensión antes de upload
- [ ] Intentas subir GIF → ves error "No permitido"

---

## Cómo Leer Logs en Vercel

**Logs son tu mejor amigo para entender qué está fallando**

### Acceder a Logs:

```
1. Ve a https://vercel.com/dashboard
2. Busca proyecto MAKWIN
3. Click en proyecto
4. Botón "Logs" (parte superior)
5. Ves logs en tiempo real
```

### Filtrar Logs:

```
Por palabra clave: sendEmail, error, auth, reset, rate limit
Por timestamp: Last 1h, Last 24h, Last 7d
```

### Leer Formato de Logs:

```
[timestamp] [nivel] [mensaje]

Niveles:
- INFO ✅ Normal
- WARN ⚠️ Algo extraño
- ERROR ❌ Falló algo
- DEBUG 🔧 Información de debugging

Ejemplo:
2025-04-03T14:32:15 ERROR sendEmail failed: SENDGRID_API_KEY not set in env
```

### Tips Pro:

1. **Busca por método HTTP**:
   - `POST /api/send-password-reset`
   - `POST /api/submit-work`

2. **Busca por strings de error**:
   - "Email rate limit"
   - "Invalid API key"
   - "malformed array"
   - "undefined"

3. **Abre última hora, no días**:
   - Vercel logs tiene límite de datos
   - Busca en "Last 1h" si hiciste el test hace poco

---

## Cómo Revisar Supabase

### SQL Editor (Mi Herramienta Favorita)

```
1. Ve a https://app.supabase.com 
2. Proyecto MAKWIN
3. SQL Editor (icono de código)
4. Copia query abajo, presiona Ctrl+Enter
```

### Query Útiles Básicas:

```sql
-- Ver Works recientes
SELECT id, title, artist_name, status, created_at 
FROM works 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver usuarios con Google Auth
SELECT id, email, user_metadata 
FROM auth.users 
WHERE (user_metadata->>'provider')::text = 'google' 
LIMIT 5;

-- Ver si column existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'google_setup_completed';

-- Contar errors en tabla de logs (si existe)
SELECT error_code, COUNT(*) as cantidad
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_code;
```

### Debugar Problemas Específicos:

```sql
-- Problema: Works no aparecen en gallery después de upload
-- Query lo que gallery ve:
SELECT id, title, artist_name, status 
FROM works 
WHERE status = 'published' AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Problema: Email reset password no funciona
-- Verifica si tabla de tokens existe:
SELECT * FROM auth.reset_tokens 
WHERE created_at > NOW() - INTERVAL '1 hour'
LIMIT 5;

-- Problema: Hashtags guardando incorrecto
-- Ver tipos reales:
SELECT id, hashtags, pg_typeof(hashtags) as tipo
FROM works 
LIMIT 5;
```

---

## Herramientas de Debugging Útiles

### 1. DevTools del Navegador (F12)

**Network Tab**:
```
1. F12 → Network
2. Intenta crear cuenta o subir obra
3. Mira las requests
4. Busca status 200, 400, 401, 429, 500
5. Mira Response para ver mensaje de error real
```

**Console Tab**:
```
1. F12 → Console
2. Busca errores rojos (errors)
3. Busca logs amarillos (warnings)
4. Si ves "undefined", busca dónde se define esa variable
```

### 2. Supabase Dashboard

**Realtime Tab**:
```
Puedes ver cambios en BD en VIVO:
1. Ve a "Realtime" en Supabase
2. Selecciona tabla (works, profiles, etc)
3. Haz una acción en la app
4. Ves el cambio en tiempo real aquí
```

### 3. Vercel Logs Dashboard

Como mencioné arriba, ver logs en tiempo real.

### 4. VSCode Debugging (Local)

Si ejecutas `pnpm dev` localmente:
```
1. Abre VSCode debugger (Ctrl+Shift+D)
2. Crea .vscode/launch.json si no existe
3. Agrega breakpoints (click en número de línea)
4. Ejecuta código paso a paso
```

---

## Workflow Recomendado para Investigar Bug

**Paso 1**: ¿Qué error ves exactamente? (copia el mensaje completo)

**Paso 2**: ¿Dónde falla? (frontend, backend, BD, email?)

**Paso 3**: Según tipo, investiga así:
- Email falla → Ver Vercel logs
- BD error (malformed) → Ver Supabase SQL
- Frontend error (undefined) → Ver Console tab
- Rate limit → Ver Supabase Auth settings

**Paso 4**: Una vez identificado, arregla código, commit, deploy

**Paso 5**: Vuelve a probar

---

## Contacto & Escalación

Si investigaste y no encuentras solución:

1. **Documenta exactamente**:
   - Mensajes de error (completos)
   - Steps to reproduce
   - Qué investigaste y qué encontraste

2. **Crea issue en GitHub** con esta información

3. **Contacta support de Supabase/Vercel** si es config problema

---

**Última actualización**: 3 de Abril 2025  
**Casos cubiertos**: Email, BD arrays, validación, frontend  
**Herramientas usadas**: Vercel Logs, Supabase SQL, DevTools
