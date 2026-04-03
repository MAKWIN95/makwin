# 🚨 SECURITY ALERT - Supabase Service Role JWT Exposed

**CRÍTICO**: GitGuardian detectó que tu **Supabase Service Role JWT** fue expuesto en GitHub.

**Riesgo**: Cualquiera con acceso al repositorio puede usar este JWT para:
- Acceder a TODA tu base de datos
- Crear/modificar/eliminar cualquier dato
- Bypassear RLS policies
- Hackear cuentas de usuarios

---

## 🔑 Regenera el JWT AHORA (10 minutos)

### Paso 1: Ve a Supabase Console

1. Open [app.supabase.com](https://app.supabase.com)
2. Selecciona proyecto MAKWIN
3. Ve a **Settings** (engranaje inferior izq)
4. Click en **API** tab

### Paso 2: Regenera Service Role Key

**EN LA SECCIÓN "Service Role key":**
1. Click el icono de "refresh" o "rotate" (si existe)
2. O busca un botón "Regenerate"
3. Confirma que quieres regenerar (dirá algo como "This will invalidate the old key")
4. **Copia la nueva key**

**Debería verse así:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 3: Actualiza .env Local

Abre `.env` en tu proyecto (si no existe, créalo):

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyxxxx...
```

**Reemplaza SUPABASE_SERVICE_ROLE_KEY con tu nueva key**

### Paso 4: Actualiza Vercel Environment Variables

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona proyecto MAKWIN
3. Settings → Environment Variables
4. Busca `SUPABASE_SERVICE_ROLE_KEY`
5. **Edita** la variable
6. Pega la **nueva key**
7. Click "Save"
8. Vercel **redeployará automáticamente** en 2-3 minutos

### Paso 5: Verifica que funciona

Cuando Vercel termine de desplegar:

1. Ve a Settings de MAKWIN
2. Intenta "Eliminar Cuenta"
3. Debería funcionar sin errores

---

## 🔒 Revisa que NO hay más secrets expuestos

```bash
# En terminal, en la raíz del proyecto:
git log --all --pretty=format: --name-only | sort -u | grep -E '\.env|secret'
```

Si ves archivos `.env` en los logs, **han sido commiteados**. Contactame para hacer un cleanup más agresivo.

---

## ✅ Después de terminar

Reporta aquí:
- ✅ Nueva Service Role Key generada en Supabase
- ✅ Vercel Environment Variable actualizada
- ✅ Vercel deployment completado
- ✅ "Eliminar Cuenta" funciona sin errores

**NO seguimos adelante hasta que esto esté DONE. Es crítico.**

---

**Última actualización**: 3 Abril 2026
**Criticidad**: 🔴 CRÍTICA - Seguridad de BD comprometida
