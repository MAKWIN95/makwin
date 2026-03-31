# MAKWIN — Guía de instalación del nuevo sistema de cuentas

## PASO 1 — Crear proyecto en Supabase (5 min)

1. Ve a https://supabase.com → "New project"
2. Nombre: `makwin` | Región: `eu-west-1` (Frankfurt, más cercano)
3. Pon una contraseña segura para la BD y guárdala
4. Espera ~2 minutos a que el proyecto esté listo

---

## PASO 2 — Ejecutar el schema SQL

1. En el dashboard de Supabase → **SQL Editor** → "New query"
2. Pega todo el contenido de `supabase_schema.sql`
3. Haz clic en **Run**
4. Verifica que no haya errores (debe decir "Success")

---

## PASO 3 — Activar Google OAuth

1. Supabase → **Authentication** → **Providers** → Google → Enable
2. Necesitas credenciales de Google OAuth:
   - Ve a https://console.cloud.google.com
   - Crea un proyecto → "APIs & Services" → "Credentials"
   - Crear "OAuth 2.0 Client ID" → Web application
   - Authorized redirect URIs: `https://xxxx.supabase.co/auth/v1/callback`
     (la URL de tu proyecto Supabase, se ve en Settings → API)
3. Copia Client ID y Client Secret → pégalos en Supabase → Google provider
4. En Google Console, también añade: `http://localhost:3002` en "Authorized JavaScript origins"

---

## PASO 4 — Instalar dependencias

```bash
pnpm add @supabase/supabase-js
```

---

## PASO 5 — Variables de entorno

En el archivo `.env` (local) y en **Vercel → Settings → Environment Variables**:

```env
# Supabase (público — pueden ir en VITE_)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# NO añadir a .env público (solo en Vercel, sin VITE_)
# SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← para funciones server-side futuras
```

Las keys las encuentras en: Supabase → **Settings** → **API**

---

## PASO 6 — Copiar los archivos nuevos al proyecto

Estructura de archivos a copiar/reemplazar:

```
client/
  App.tsx                          ← REEMPLAZAR
  lib/
    supabase.ts                    ← NUEVO
    AuthContext.tsx                ← NUEVO
  pages/
    Gallery.tsx                    ← REEMPLAZAR Index.tsx (renombrar)
    Login.tsx                      ← NUEVO
    Register.tsx                   ← NUEVO
    UserProfile.tsx                ← NUEVO
    UploadWork.tsx                 ← NUEVO (reemplaza SubmitWork)
    Saved.tsx                      ← NUEVO
  components/
    Header.tsx                     ← REEMPLAZAR
    WorkCard.tsx                   ← NUEVO
```

**IMPORTANTE**: En `App.tsx`, la ruta `/galeria` ahora apunta a `Gallery.tsx` en vez de `Index.tsx`.
Puedes borrar o conservar `Index.tsx` — ya no se usa.

---

## PASO 7 — Actualizar vercel.json

Añadir las nuevas rutas en los rewrites:

```json
{
  "rewrites": [
    { "source": "/galeria", "destination": "/index.html" },
    { "source": "/login", "destination": "/index.html" },
    { "source": "/registro", "destination": "/index.html" },
    { "source": "/subir-obra", "destination": "/index.html" },
    { "source": "/favoritos", "destination": "/index.html" },
    { "source": "/u/:username", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## PASO 8 — Probar en local

```bash
pnpm dev
```

Flujo de prueba:
1. Abre `http://localhost:3002`
2. Haz clic en "Entrar" en el header
3. Regístrate con email → revisa tu bandeja → confirma
4. Login → deberías ver tu avatar en el header
5. Ve a `/subir-obra` → sube una obra → debería aparecer en `/galeria`
6. Haz clic en el corazón de una obra → like registrado
7. Haz clic en el marcador → obra guardada en `/favoritos`
8. Ve a `/u/tu-username` → tu perfil

---

## PASO 9 — Deploy en Vercel

```bash
vercel --prod
```

O simplemente haz push a `main` si tienes CI/CD configurado.

Recuerda añadir las variables de entorno en Vercel Dashboard antes del deploy.

---

## Qué quedó sin implementar (para próximas fases)

- **Reset de contraseña** — la lógica está en `AuthContext.tsx` y `Login.tsx`, pero necesitas configurar el email template en Supabase → Authentication → Email Templates
- **Página `/reset-password`** — tras hacer clic en el link del email, necesita una página simple con el nuevo campo de contraseña
- **Reportar obra** — botón de "Reportar" en `WorkCard` y `WorkDetail` (la tabla existe, falta la UI)
- **Feed de "Siguiendo"** — ruta `/siguiendo` que filtra `get_feed` por autores que sigues
- **Configuración de cuenta** — `/configuracion` para cambiar email/contraseña, borrar cuenta
- **Notificaciones** — Supabase Realtime puede hacer esto en tiempo real
- **WorkDetail actualizado** — el actual (`WorkDetail.tsx`) usa la API antigua de Redis; hay que adaptarlo para leer de Supabase por `work.id`
