# 🔧 Lista Completa de Bugs - MAKWIN Testing Session

**Fecha**: 3 de Abril 2025  
**Tester**: Usuario Aleix  
**Estado**: En Reparación | **Código Desplegado**: ✅ Commit e628674 en main

---

## ⚠️ MIGRACIONES SQL REQUERIDAS (EJECUTA EN SUPABASE SQL EDITOR)

Estos cambios en base de datos son necesarios para que los 3 bugs arreglados funcionen correctamente.

```sql
-- Para Bug #2: Google Auth setup detection
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_setup_completed BOOLEAN DEFAULT false;

-- Opcional: Actualiza usuarios Google existentes a completed status
UPDATE profiles 
SET google_setup_completed = true 
WHERE (user_metadata->>'provider')::text = 'google' AND google_setup_completed = false;
```

**Cómo ejecutar**:
1. Ve a [Supabase Dashboard](https://app.supabase.com) → Proyecto MAKWIN
2. Ve a SQL Editor (icono de código)
3. Copia y pega el código arriba
4. Click en "Run" o presiona Ctrl+Enter
5. Espera confirmar que se ejecutó sin errores
6. Los 3 bugs ya estarán función operativa

---

## ✅ BUGS ARREGLADOS (3)

### ✅ Bug #1: "es is not defined" 
- **Línea de Error**: `1f, 1g, 7d` (Login con contraseña incorrecta/email inadecuado)
- **Causa**: AuthContext usaba variable `es` sin definirla
- **Solución**: Cambié a códigos de error ('USER_NOT_FOUND', 'INVALID_PASSWORD') y Login.tsx traduce
- **Archivos Modificados**: 
  - `client/lib/AuthContext.tsx` 
  - `client/pages/Login.tsx`
- **Commit**: bda1e01

### ✅ Bug #2: Google Auth no pide username (1h)
- **Línea de Error**: `1h` (Usuario se crea sin pedir datos)
- **Causa**: AuthContext revisaba objeto `needs_setup_completed` que no existe en la tabla
- **Solución**: Cambié a revisar `google_setup_completed === false` en el listener onAuthStateChange
- **Detalles del Fix**:
  - Línea 155-162 en AuthContext.tsx: Cambié condición de Google user detection
  - Línea 328 en AuthContext.tsx: Added `google_setup_completed: true` al completar setup
  - **REQUIERE MIGRACIÓN SQL** (ver abajo)
- **Archivos Modificados**: `client/lib/AuthContext.tsx`
- **Commit**: e628674
- **Pre-requisito**: Ejecutar SQL (ver sección Migraciones Requeridas)

### ✅ Bug #3: "Obra no encontrada" tras crear (3a, 3b, 3c)
- **Línea de Error**: `3a, 3b, 3c` (Redirige a work detail que no existe en BD)
- **Causa Raíz**: `/api/submit-work` solo guardaba en logs/JSON, NO en tabla `works` de Supabase
  - Gallery.tsx queries `get_feed()` RPC que busca en tabla `works`
  - Work nunca llegaba a tabla → 404 en gallery
- **Solución**: Dual-write system - ahora SubmitWork.tsx escribe directamente en `works` tabla
- **Detalles del Fix**:
  - Línea 4: Importé `import { supabase } from '@/lib/supabase';`
  - Línea 200-228: Nuevo bloque que genera work_id y hace INSERT a `works` table
  - Esto ocurre DESPUÉS de `fetch(/api/submit-work)` exitoso
  - Incluye: id, title, description, type, artist_name, file_url, cover_url, lyrics, hashtags, status, created_at, etc
  - Try-catch para no bloquear si Supabase falla (API ya tuvo éxito)
- **Archivos Modificados**: `client/pages/SubmitWork.tsx`
- **Commit**: e628674
- **Resultado Esperado**: Works aparecen en galería dentro de 2-3 segundos

---

## 🔴 BUGS CRÍTICOS (7) - EN PROGRESO

### 🟡 Bug #4: Email Rate Limit (1a)
**Reporte**: "Email rate limit exceeded" al crear cuenta con email nuevo
**Causa Probable**: Supabase tiene rate limiting activado
**Solución**: 
- [ ] Ir a Supabase Dashboard > Settings > Rate Limiting
- [ ] Aumentar límite de email signups a 10-20 por hora
- [ ] O desactivalor temporalmente para testing

**Alternativa**: Usar emails de prueba diferentes (test1@test.com, test2@test.com, etc)

---

### 🟡 Bug #5: Email Duplicado y Reset Password Rotos (1b, 1i, 1j)
**Reporte**: 
- 1b: Email duplicado devuelve "se ha enviado email" en lugar de error
- 1i: "Error al enviar el correo" al restablecer contraseña
- 1j: Funciona con email inexistente pero falla con válido

**Causa**: Probable problema con las keys de SendGrid o Resend
**Solución Necesaria**:
- [ ] Verificar que SENDGRID_API_KEY o RESEND_API_KEY está configurada
- [ ] Probar endpoint manualmente: `GET /api/check-email-exists`
- [ ] Ver logs de Vercel/servidor para errores reales

**Paso a Paso**:
1. Ve a Vercel Dashboard > Logs
2. Busca "resetPassword" o "sendEmail" 
3. Ve qué error real está ocurriendo
4. Configura la key correcta en Vercel > Settings > Environment Variables

---

### 🟡 Bug #6: Validación de Usuario (1c) - FEATURE REQUEST
**Reporte**: Quiere validación en tiempo real de usuario mientras lo escribes
**Necesitas Agregar**:
- [ ] Mensaje en vivo: "No puede empezar con punto"
- [ ] Validación regex en tiempo real: `/^[a-z0-9]([a-z0-9_.]*[a-z0-9])?$/`
- [ ] Mostrar errores mientras escribes, no al hacer submit

**Indicador de Fuerza de Contraseña**:
- [ ] Una barra que vaya de rojo a verde
- [ ] Mostrar mensajes: "Añade mayúsculas", "Añade número", etc.
- [ ] Basarse en: longitud, mayúsculas, números, caracteres especiales

**Archivos a Modificar**: `client/pages/Register.tsx`

---

### 🟡 Bug #7: GIFs en Avatar (2h) - FEATURE REQUEST
**Reporte**: Permite subir GIFs que pueden contener +18
**Solución**:
- [ ] En el input de avatar, bloquear `.gif` files
- [ ] Permitir solo: `.jpg, .jpeg, .png, .webp`

**Código a Agregar**:
```typescript
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
const fileName = file.name.toLowerCase();
const hasInvalidExt = allowedExtensions.every(ext => !fileName.endsWith(ext));
if (hasInvalidExt) {
  setError('Solo se permiten PNG, JPG o WebP. Los GIFs no están permitidos.');
}
```

**Archivo**: `client/components/` (dónde está el uploader de avatar)

---

### 🟡 Bug #8: Error de Hashtags  (3d)
**Reporte**: "malformed array literal: 'mcqueen,poema'" al editar hashtags
**Causa**: Problema al parsear array de hashtags en el backend
**Solución**:
- [ ] Arreglar parsing de hashtags en `/api/submit-work.ts`
- [ ] Asegurarse de que los hashtags se están convirtiendo a array JSON correctamente

**Código Problemático** Probablemente:
```typescript
const tagsArray = formData.hashtags
  .split(/[,\s]+/)
  .map(s => s.replace(/^#/, '').trim())
  .filter(Boolean);
```

**Solución**: Verificar que se está guardando como JSON array en BD, no string

---

### 🟡 Bug #9: i18n Incompleto (7a, 7c)
**Reporte**: 
- 7a: Menú de perfil sigue en español aunque selecciones inglés
- 7c: Persista en inglés aunque cuenta estaba en español

**Items sin Traducir**:
- Menú de perfil (Mi perfil, Guardados, Siguiendo, etc)
- Home/Landing page
- Botones varios

**Solución**: Añadir traducción para:
- [ ] Profile dropdown menu
- [ ] Landing page
- [ ] Navbar
- [ ] Footer

**Archivo**: `client/lib/i18n/` (archivo de traducciones)

---

### 🟡 Bug #10: Logout Redirect (Contexto General)
**Reporte**: Al logout desde /galeria, debería redirigir a /galeria (no home)
**Solución**:
- [ ] Hacer que logout guarde la ruta actual
- [ ] Después de logout, redirigir a esa ruta (o similar)

**Código**:
```typescript
const handleLogout = async () => {
  const currentPath = window.location.pathname;
  await signOut();
  navigate(currentPath === '/galeria' ? '/galeria' : '/');
}
```

---

## 🟠 BUGS UI (5) - DESPUÉS

### Bug #11: Filtro de Galería Mal Posicionado (4b)
**Reporte**: Caja de filtro aparece a la derecha en lugar de debajo del ícono
**Solución**: Arreglar CSS del dropdown del filtro

---

### Bug #12: Falta Ordenar por Recientes/Antiguas (4c, 4d)
**Reporte**: Los botones "Más recientes" y "Más antiguos" no existen
**Solución**: Agregar esos botones y la lógica de ordenamento

---

### Bug #13: Modales se Salen de Pantalla (5c, 5d, 5e)
**Reporte**: 
- 5c: Módal de reporte se va hacia arriba
- 5d: Modal de auth se corta en móvil
**Solución**: Hacer modales centrados con overlay blur

---

### Bug #14: Bombilla de Tema (10d) - FEATURE CHANGE
**Reporte**: Quita la bombilla, agrega switch EN EL MENÚ DE PERFIL
**Solución**:
- [ ] Quitar componente ThemeBulb del header
- [ ] Agregar en el menú de perfil (arriba de Cerrar Sesión)
- [ ] Hacer un switch (toggle) para claro/oscuro

---

## 📋 RESUMEN DE TAREAS

**Completadas**: 3/13  
**En Progreso**: 7/13  
**Pendientes**: 3/13  

**Próximo**: Esperar a que Vercel depliegue (2-3 min), luego testear bugs 1-3 nuevamente

---

## 🔍 CÓMO BUSCAR INFORMACIÓN PARA BUGS (Respuestas a "No Sé Hacerlo")

### Para Bug #1a (Email Rate Limit)
**Lugar 1**: Supabase Console
1. https://app.supabase.com → Tu proyecto
2. Settings → Database
3. Buscar "Rate Limiting" o "Email"

**Lugar 2**: Logs en Vercel
1. https://vercel.com/dashboard
2. Tu proyecto MAKWIN
3. Logs → Buscaí "rate limit"

### Para Bug #1i/1j (Email Reset)
**Paso 1**: Buscar la configuración de email
- Ve a Supabase > Settings > Email
- Verifica que SendGrid/Resend está conectado

**Paso 2**: Activar debugging
- En browser: DevTools > Console
- Realiza un login fallido
- Ve qué error sale en la consola

**Paso 3**: Ver logs del servidor
- Ve a Vercel > Logs
- Ejecuta un reset password
- Busca el error en los logs

### Para Bug #1c (Indicador de Fuerza)
**Buscar ejemplo online**:
- "password strength meter react"
- Lib recomendada: `zxcvbn` o `password-strength-meter`

### Para Bug #4b (Filtro Posicionado)
**Inspeccionar elemento**:
1. Abre el sitio
2. Click derecho > Inspeccionar
3. Haz click en el filtro
4. En DevTools, busca la clase CSS
5. Edita el CSS para posicionarlo debajo

---

## ⏭️ PRÓXIMOS PASOS

1. ✅ **Commit & Deploy**: YA HECHO
2. 🔄 **Testear bugs 1-3**: Cuando Vercel termine (2 min)
3. 🔧 **Resolver bugs 4-10**: Requiere investigación
4. 🎨 **Arreglar UI (11-14)**: Después de funcionalidad

---

