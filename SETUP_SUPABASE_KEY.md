# ⚙️ Configuración de Supabase Service Role Key

## 🔑 ¿Dónde obtener SUPABASE_SERVICE_ROLE_KEY?

La variable `SUPABASE_SERVICE_ROLE_KEY` se necesita para operaciones del servidor (como validar emails).

### Pasos:

1. Ve a **[Supabase Dashboard](https://app.supabase.com)**
2. Selecciona tu proyecto (**vaompdhmnnvgzybhhqak**)
3. Ve a **Settings** (ícono de engranaje abajo a la izquierda)
4. Selecciona **API**
5. Bajo "Project API keys", copia el valor de **Service Role Secret** (es la key más larga)

### Actualizar .env

Una vez obtengas la key, abre tu archivo `.env` en la raíz del proyecto:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cC... (pega tu key aquí)
```

⚠️ **IMPORTANTE**: 
- No compartas esta key (es como una contraseña de admin)
- No la comitas a git
- `.env` está en `.gitignore`, así que está protegida

## ✅ Una vez configurado:

```bash
pnpm dev
```

El servidor debería iniciar correctamente en `http://localhost:8080`

## 🔗 Variables de Supabase en tu .env actual

```
VITE_SUPABASE_URL=https://vaompdhmnnvgzybhhqak.supabase.co
VITE_SUPABASE_ANON_KEY=[tu anon key]
SUPABASE_SERVICE_ROLE_KEY=[RELLENAR - cópiala de Supabase Settings > API > Service Role Secret]
```

---

**Necesitas solo esta variable para que `pnpm dev` funcione.** Los otros servicios (SendGrid, Google OAuth, Cloudinary) son opcionales y pueden configurarse después.
