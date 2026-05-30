# 🔧 Ejecuta Esta SQL AHORA - Bug 1h Google Auth

**CRÍTICO**: Sin esta migración, Google Auth **NUNCA** funcionará.

## El Problema

Cuando creas cuenta con Google, no pide username/password porque:
- Código busca columna `google_setup_completed` en tabla `profiles`
- Esa columna **NO EXISTE** en tu BD
- Sin esa columna, el detector de Google users no funciona

## La Solución (2 minutos)

### Paso 1: Abre Supabase SQL Editor

1. Ve a [app.supabase.com](https://app.supabase.com)
2. Selecciona proyecto **MAKWIN**
3. Click en **SQL Editor** (icono de código abajo a la izquierda)

### Paso 2: Copia y Pega Esta SQL

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_setup_completed BOOLEAN DEFAULT false;
```

### Paso 3: Click "Run" o Ctrl+Enter

**Espera a ver**:
```
✅ Success. One row affected.
```

### Paso 4: Listo

Cierra VS Code y vuelve a [makwin.vercel.app](https://makwin.vercel.app)

---

## Test Inmediato

Después de ejecutar SQL:

1. **Borra cookies de navegador** para Google (o usa navegador diferente)
2. Ve a makwin.vercel.app
3. Click "Sign in with Google"
4. **DEBERÍA pedirte**:
   - Username
   - Password
   - Display Name

Si sigue sin pedir → avísame, hay otro problema.

---

**Ejecuta esto AHORA.** Es bloqueador para Bug 1h. 🚀
