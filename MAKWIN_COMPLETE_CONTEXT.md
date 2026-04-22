# MAKWIN - Contexto Completo de la Aplicación Web

**Creado:** Abril 22, 2026  
**Propósito:** Documento de referencia completo para cualquier cambio, mejora o bug fix  
**Para:** Usarlo con ChatGPT o como brief para el agente de IA  

---

## 📍 VISIÓN GENERAL

**MAKWIN** es una plataforma web de arte y creatividad tipo **galería + marketplace + merch** para artistas. Los usuarios pueden:
- Registrarse/autenticarse (email + password, o Google OAuth)
- Subir obras (pinturas, fotografías, poemas, canciones, vídeos)
- Ver galería de obras de otros artistas
- Dar like, guardar obras, seguir artistas
- Editar/eliminar sus propias obras
- Comprar/vender obras (marketplace)
- Acceder a sección de merch (tienda de productos)
- Enviar mensajes de ayuda (formulario de contacto)
- Panel administrativo para gestionar obras

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Completo
- **Frontend:** React 18.3.1 + React Router 6 (SPA)
- **Lenguaje:** TypeScript 5.9
- **Build Tool:** Vite 7.1.2
- **Estilos:** TailwindCSS 3 (utilidades) + CSS variables HSL
- **Backend:** Express (integrado, mismo servidor)
- **Package Manager:** PNPM 10.14.0
- **Base de Datos:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (buckets públicos)
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Animaciones:** GSAP 3.12.2 con ScrollTrigger
- **UI Components:** Radix UI + Lucide React Icons
- **Notifications:** Sonner (toast messages)
- **Multiidioma:** i18n personalizado (español/inglés)
- **Deployment:** Vercel (Hobby plan, máx 12 serverless functions)

### Estructura de Directorios (Relevante)
```
makwin.web/
├── client/
│   ├── pages/
│   │   ├── Landing.tsx              # Página de inicio (hero con estrellas, 4 secciones CTA)
│   │   ├── Index.tsx                # Galería /galeria (ruta por defecto)
│   │   ├── Merch.tsx                # Sección merch /merch
│   │   ├── Marketplace.tsx          # Marketplace /marketplace
│   │   ├── SubmitWork.tsx           # Formulario envío /enviar-obra
│   │   ├── Admin.tsx                # Panel admin /admin
│   │   ├── SubmittedWorks.tsx       # Obras enviadas (pendientes)
│   │   ├── RequestChange.tsx        # Formulario cambios
│   │   ├── WorkDetail.tsx           # Detalle de obra /work/:id
│   │   ├── SongDetail.tsx           # Detalle de canción
│   │   ├── landing.css              # Estilos landing (hero, liquid navbar, animations)
│   │   └── Landing.tsx              # Lógica landing (GSAP, scroll, state)
│   ├── components/
│   │   ├── Header.tsx               # Navbar global (sticky, con tema toggle)
│   │   ├── Footer.tsx               # Footer (links, ayuda)
│   │   ├── SubmitButton.tsx         # Botón flotante "Enviar obra" (solo en /galeria, /marketplace)
│   │   ├── ThemeBulb.tsx            # Toggle tema (en Header)
│   │   ├── LanguageSelector.tsx     # Selector idioma
│   │   ├── HelpModal.tsx            # Modal de ayuda/contacto
│   │   ├── AdminHelpMessages.tsx    # Panel de mensajes de ayuda (admin)
│   │   ├── Onboarding.tsx           # Onboarding modal (primera vez)
│   │   ├── LanguagePrompt.tsx       # Prompt seleccionar idioma
│   │   ├── PublishedWorks.tsx       # Lista obras publicadas
│   │   ├── WorkTypeBadge.tsx        # Badge tipo de obra
│   │   ├── WorkTypeIcon.tsx         # Icono tipo de obra
│   │   └── ui/                      # Librería UI (radix + tailwind)
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── textarea.tsx
│   │       ├── select.tsx
│   │       ├── tooltip.tsx
│   │       ├── alert-dialog.tsx
│   │       └── ... (20+ componentes)
│   ├── hooks/
│   │   ├── use-mobile.tsx           # Detectar vista móvil
│   │   ├── use-page-transition.tsx  # Transiciones entre páginas
│   │   └── use-stars-background.tsx # Generar estrellas aleatorias
│   ├── lib/
│   │   ├── AuthContext.tsx          # Context autenticación global
│   │   ├── utils.ts                 # Utilidades (cn(), formatters)
│   │   ├── songs.ts                 # Data estructurada canciones
│   │   └── i18n/
│   │       ├── index.ts             # i18n context
│   │       └── translations.ts      # Diccionarios ES/EN (46+ keys)
│   ├── App.tsx                      # Router SPA (React Router 6)
│   ├── global.css                   # CSS variables, temas, animations globales
│   └── vite-env.d.ts
├── server/
│   ├── index.ts                     # Express server setup + rutas /api/*
│   ├── node-build.ts
│   └── routes/
│       ├── demo.ts                  # GET /api/demo
│       └── submit-work.ts           # POST /api/submit-work
├── shared/
│   └── api.ts                       # Tipos compartidos (interfaces)
├── api/                             # Vercel serverless functions
│   ├── archive-work.ts              # POST /api/archive-work
│   ├── check-email-exists.ts        # POST /api/check-email-exists
│   ├── delete-account.ts            # POST /api/delete-account
│   ├── delete-work.ts               # POST /api/delete-work
│   ├── get-submissions.ts           # GET /api/get-submissions
│   ├── publish-work.ts              # POST /api/publish-work
│   ├── reject-work.ts               # POST /api/reject-work
│   ├── republish-work.ts            # POST /api/republish-work
│   ├── request-change.ts            # POST /api/request-change
│   ├── save-help-message.ts         # POST /api/save-help-message (nueva)
│   └── submit-work.ts               # POST /api/submit-work
├── public/
│   ├── manifest.json                # PWA manifest
│   ├── robots.txt
│   └── Portadas/                    # Imágenes portada (obras ejemplo)
├── netlify/
│   └── functions/
│       └── api.ts                   # Endpoint Netlify
├── submissions/                     # JSONs ejemplo (obras enviadas)
├── AGENTS.md                         # Tech stack documento principal
├── LEER_ANTES_PROYECTO_MAKWIN.md    # Guía desarrollo (cambios recientes)
├── SYSTEMS.md                        # Arquitectura sistemas (DB, auth, etc)
├── global.css                        # Theme variables + animaciones globales
├── tailwind.config.ts               # Tailwind configuration
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                    # Vite config (client)
├── vite.config.server.ts            # Vite config (server)
├── pnpm-workspace.yaml              # PNPM workspace config
├── pnpm-lock.yaml                   # Lock file
├── netlify.toml                      # Config Netlify deploy
├── vercel.json                       # Config Vercel deploy
└── package.json                      # Dependencies
```

---

## 🎨 DISEÑO Y ESTILOS

### Paleta de Colores
- **Fondo oscuro (hero):** `#0d0d0f` (casi negro)
- **Fondo claro (merch):** Gradiente `#f5f5f5 → #ffffff`
- **Primario:** Morado/violeta (Radix UI default)
- **Bordes:** `rgba(255,255,255,0.1)` a `rgba(255,255,255,0.2)` (modo oscuro)
- **Texto:** Blanco (#fff) en modo oscuro, negro en modo claro
- **Acentos:** Colores por tipo de obra (verde música, azul poesía, etc)

### Sistema de Temas
- **Variables CSS:** Definidas en `client/global.css`
  ```
  --background
  --foreground
  --muted
  --muted-foreground
  --border
  --ring
  --primary
  --secondary
  ```
- **Modo claro/oscuro:** Toggle en Header (bombilla → sustituida por menu de usuario)
- **Data attribute:** `data-theme="dark"` o `data-theme="light"`
- **Transición:** 0.5s cubic-bezier smooth entre temas

### Componentes Visuales Key

#### 1. **Hero Landing**
- Título grande (clamp 4rem-10rem) blanco sobre fondo oscuro
- Subtítulo semi-transparente (0.9 opacity)
- CTA button con efecto liquid glass (backdrop-filter blur)
- **Fondo:** Canvas con estrellas dispersas (generadas con GSAP)
- **Animación:** Fade-in staggered (1.2s title, 1s subtitle, 0.6s cta)
- **Scroll indicator:** Gota liquid glass (80x48px) con bounce animation, desaparece al scroll >80px

#### 2. **Navbar (Header)**
- Sticky top (z-index 50)
- Logo MAKWIN a la izquierda
- Buscador en middle (si logged in)
- Right: Tema toggle + Idioma + Avatar/Menu (si logged in)
- **Estilo:** Backdrop blur, borde sutil, ligera transparencia
- **En Landing:** Navbar separada `.liquid-navbar` aparece al scrollear (estilos en `landing.css`)

#### 3. **Botón Flotante "Enviar Obra"**
- Posición fixed bottom-right
- Solo visible en `/galeria` y `/marketplace`
- Efecto liquid: `backdrop-filter: blur(12px)`, `rgba(255,255,255,0.12)` background
- Shimmer animation en hover (keyframes `shimmer`)
- **Tooltip:** "Comparte tu obra con la comunidad"

#### 4. **Secciones Landing (Carousel)**
- 4 secciones (Galería, Marketplace, Merch, Comunidad)
- Cada sección: Imagen + Texto + CTA button
- Carousel scrollable horizontal (scroll snap)
- **Imagen placeholder:** Color pattern según sección (bgPattern)
- **Reveal effect:** Overflow expandido con blur en bordes
- **Indicadores:** Puntos debajo (active/inactive)

#### 5. **Tarjetas de Obras**
- Imagen cover (cuadrada)
- Nombre artista + avatar pequeño
- Título + descripción truncada
- Botones: Like ❤️ + Guardar 🔖 + Opciones ⋯
- **Estados:** Hover = overlay, publicado/archivado/rechazado badges
- **Colores tipo:** Música (verde), Poesía (azul), etc

#### 6. **Modal de Ayuda**
- Posiciónscentrada (fixed inset-0)
- Header con icono + título
- Campos: Categoría, Nombre, Email, Asunto, Mensaje
- 2 botones: Enviar + Cerrar
- **Mensaje éxito:** Check animado + "Gracias por tu mensaje"

#### 7. **Panel Admin Mensajes**
- Tabla: Nombre | Email | Tipo | Mensaje | Fecha | Estado | Acciones
- Dropdown estado: Nuevo → Leído → Resuelto
- Botón eliminar con confirmación
- Real-time desde Supabase

### Animaciones
- **Landing hero:** GSAP timeline (fade + translate)
- **Scroll indicator:** Bounce `yoyo: true, repeat: -1`
- **Shimmer btn:** `@keyframes shimmer` (translate x, opacity)
- **Glass reflect:** `@keyframes glassReflect` en hover
- **Página:** Fade-in 0.5s smooth
- **Dialog:** Scale 0.95→1 (0.4s)

---

## 🔐 AUTENTICACIÓN Y USUARIOS

### Flujo de Registro
1. Email + Password (O Google OAuth)
2. Si Google: Pide username + password adicionales (setup modal)
3. Crea auotmáticamente perfil en tabla `profiles`
4. Redirige a onboarding si primera vez

### Tipos de Usuario
- **Sin login:** Puede ver galería (públicamente)
- **Registrado:** Puede like, guardar, seguir, subir obras
- **Admin:** Acceso a `/admin` panel

### Operaciones Protegidas (Requieren Login)
- ❤️ Like en obras
- 🔖 Guardar/Favoritos
- 📤 Subir obra
- ✏️ Editar/eliminar propia obra
- ➕ Seguir artista
- 🚩 Reportar obra

---

## 🗄️ BASE DE DATOS (SUPABASE)

### Tablas Principales
```sql
-- Perfiles de usuarios
profiles
  id (UUID) ← references auth.users
  username (TEXT, UNIQUE)
  display_name (TEXT)
  bio (TEXT, ≤500 chars)
  avatar_url (TEXT)
  website (TEXT)
  is_verified (BOOLEAN)
  is_banned (BOOLEAN)
  google_setup_completed (BOOLEAN)
  instagram_url (TEXT)
  tiktok_url (TEXT)
  last_name_change (TIMESTAMP)
  last_username_change (TIMESTAMP)
  created_at (TIMESTAMPTZ)
  updated_at (TIMESTAMPTZ)

-- Obras
works
  id (UUID)
  user_id (UUID) → profiles
  title (TEXT)
  description (TEXT)
  work_type (TEXT: 'pintura'|'fotografia'|'poema'|'cancion'|'video')
  file_url (TEXT)
  cover_url (TEXT)
  hashtags (TEXT[])
  is_for_sale (BOOLEAN)
  price (NUMERIC)
  status (TEXT: 'draft'|'submitted'|'published'|'archived'|'rejected')
  like_count (INT)
  view_count (INT)
  created_at (TIMESTAMPTZ)
  updated_at (TIMESTAMPTZ)

-- Likes
likes
  user_id (UUID) → profiles
  work_id (UUID) → works
  created_at (TIMESTAMPTZ)
  PRIMARY KEY (user_id, work_id)

-- Guardados/Favoritos
saves
  user_id (UUID) → profiles
  work_id (UUID) → works
  created_at (TIMESTAMPTZ)
  PRIMARY KEY (user_id, work_id)

-- Seguimientos
follows
  follower_id (UUID) → profiles
  following_id (UUID) → profiles
  created_at (TIMESTAMPTZ)
  PRIMARY KEY (follower_id, following_id)
  CHECK (follower_id != following_id)

-- Mensajes de Ayuda
help_messages
  id (UUID)
  user_id (UUID) → profiles (nullable)
  email (TEXT)
  name (TEXT)
  category (TEXT)
  subject (TEXT)
  message (TEXT)
  status (TEXT: 'new'|'read'|'resolved')
  created_at (TIMESTAMPTZ)
  updated_at (TIMESTAMPTZ)

-- Reportes
policy_reports
  id (UUID)
  work_id (UUID) → works
  reporter_id (UUID) → profiles
  reason (TEXT: 'porno'|'gore'|'spam'|'acoso'|'otro')
  details (TEXT)
  reviewed (BOOLEAN)
  created_at (TIMESTAMPTZ)
```

### Row Level Security (RLS)
- Perfils: Públicos para lectura, owner puede editar
- Works: Publicadas visibles para todos, owner todo
- Likes/Saves: Privados del usuario
- Follows: Públicos para lectura
- Help messages: Anónimos pueden insertar, admin ve todoß

### Storage Buckets
- `avatars/` — Imágenes perfil (público)
- `works/` — Archivos obras (público)

---

## 📡 API ENDPOINTS

### Estructuuroa Rutas
- Todos prefijados con `/api/`
- Server Express integrado en mismo puerto (3002 dev, 3000 prod)
- Serverless functions en Vercel para `/api/*`

### Endpoints Principales

#### Auth (Supabase nativo)
- `POST /auth/v1/signup` — Registro
- `POST /auth/v1/token?grant_type=password` — Login
- `POST /auth/v1/token?grant_type=refresh_token` — Refresh
- `POST /auth/v1/logout` — Logout
- `POST /auth/v1/user` — Get perfil
- `POST /auth/v1/user` (PUT) — Update user
- `POST /auth/v1/recover` — Reset password

#### Custom Endpoints
- `GET /api/ping` — Health check
- `GET /api/demo` — Demo endpoint
- `POST /api/submit-work` — Submit obra (crea JSON + inserta en works table)
- `POST /api/check-email-exists` — Validar email real-time
- `POST /api/get-submissions` — Listar obras enviadas (pendientes)
- `POST /api/publish-work` — Aprobar obra
- `POST /api/reject-work` — Rechazar obra
- `POST /api/republish-work` — Re-publicar rechazada
- `POST /api/request-change` — Pedir cambios
- `POST /api/archive-work` — Archivar obra
- `POST /api/delete-work` — Eliminar obra
- `POST /api/delete-account` — Eliminar cuenta usuario
- `POST /api/save-help-message` — Guardar mensaje ayuda en BD

### Variables de Entorno (Vercel/Supabase)
```
SUPABASE_URL=https://vaompdhmnnvgzybhhqak.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://vaompdhmnnvgzybhhqak.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GOOGLE_PROJECT_ID=makwin-web
VITE_GOOGLE_CLIENT_ID=552878038782-a0m21tsttlmk5uu021lco8i3kvkov692.apps.googleusercontent.com
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

---

## 🌐 RUTAS (React Router 6)

```
/                    → Landing (página de inicio)
/galeria             → Index.tsx (galería obras)
/marketplace         → Marketplace.tsx (compra/venta)
/merch               → Merch.tsx (tienda productos)
/enviar-obra         → SubmitWork.tsx (formulario envío)
/work/:id            → WorkDetail.tsx (detalle obra)
/u/:username         → Perfil usuario (UserProfile?)
/saved               → Obras guardadas (SavedWorks?)
/submissions         → Mis obras enviadas (SubmittedWorks)
/request-change      → Formulario cambios (RequestChange)
/admin               → Admin panel (Admin.tsx)
/404 (*)             → NotFound.tsx
```

---

## 📜 INTERNACIONALIZACIÓN (i18n)

### Idiomas Soportados
- **es** — Español (defecto)
- **en** — Inglés

### Estructura Traducciones
Archivo: `client/lib/i18n/translations.ts`

Categorías:
- Navigation
- Authentication (login, registro, reset)
- Profile (editar, seguir, etc)
- Works (crear, editar, eliminar)
- Onboarding
- Error messages
- Validation messages
- Footer links
- Help system

### Cómo Usar
```typescript
import { useI18n } from '@/lib/i18n';

const { language, t } = useI18n();
// t('nav.gallery') → "Galería" o "Gallery"
// language → 'es' o 'en'
```

---

## 🐛 BUGS CONOCIDOS (Status Abril 2026)

### Arreglados ✅
- #1f: Error "es is not defined" en login (password incorrecto)
- #1h: Google Auth no pide username (ahora pide setup)
- #3a/3b: Obras no aparecen en galería (ahora se guardan en Supabase automáticamente)

### Pendientes ⏳ (11 bugs)
- #4: Email rate limit exceeded
- #5/#1b/#1i/#1j: Email reset & duplicate issues
- #6: Password validation real-time feedback
- #7: Block GIF upload en avatar
- #8: Hashtag array malformed error
- #9: i18n incomplete translations
- #10: Logout redirect behavior
- #11-14: UI/UX fixes (sorting, positioning, theme)

---

## 🚀 DESARROLLO Y DEPLOYMENT

### Comandos Locales
```bash
pnpm install         # Instalar deps
pnpm dev            # Iniciar dev (http://localhost:3002)
pnpm build          # Build production
pnpm start          # Iniciar producción local
pnpm typecheck      # Validar TypeScript
pnpm test           # Vitest tests (si existen)
```

### Deployment Vercel
- Hobby plan (máx 12 serverless functions)
- Auto-deploy en push a `main` branch
- Function count limit:  archive-work, check-email-exists, delete-account, delete-work, get-submissions, publish-work, reject-work, republish-work, request-change, **save-help-message**, submit-work = 11 funciones ✅

### Staging/Production
- URL dev: `localhost:3002`
- URL producción: `https://makwin.vercel.app`

---

## 📋 ESTADO ACTUAL (Abril 22, 2026)

### ✅ Completado
- Sistema de autenticación (Supabase auth)
- Galería de obras
- Marketplace  
- Página merch
- Formulario envío obras
- Panel admin
- Sistema de likes/guardados
- Diseño responsive
- Soporte multi-idioma
- **Sistema de ayuda (help messages en Supabase)**
- **Admin panel para gestionar mensajes de ayuda**
- **Eliminado:** Mensaje "tip: usa bombilla" del landing

### En Desarrollo / Pendiente
- Comentarios (sistema de chat)
- Notificaciones (follow, like)
- Messages privados (chat directo)
- Analytics
- Social sharing
- Search/filtros avanzados

---

##  🔧 COMO HACER CAMBIOS (IMPORTANTE)

### Para Cambios en Frontend
1. Editar en `client/components/`, `client/pages/`, etc
2. TypeScript validará en  `pnpm dev`
3. `pnpm typecheck` antes de commit
4. Commit con mensaje descriptivo
5. Git push → auto-deploy Vercel

### Para Cambios en BDD
1. Supabase SQL Editor
2. Crear migrations (ver SUPABASE_MIGRATIONS_REQUIRED.md)
3. Testear en staging
4. Aplicar en producción

### Para Cambios en API
1. Editar en `api/*.ts` o `server/routes/*`
2. Actualizar types en `shared/api.ts`
3. Testear endpoint
4. TypeScript validación
5. Commit + push

### Convenciones de Código
- Variables: `camelCase`
- Funciones: `camelCase`
- Componentes: `PascalCase`
- Constantes app: `UPPER_CASE`
- Imports: Usar path aliases (`@/`, `@shared/`)
- Tipos: `PascalCase`, exportar de `shared/api.ts`
- Estilos: TailwindCSS first, CSS variables para temas

---

## 📚 ARCHIVOS DOCUMENTACIÓN CLAVE

- **AGENTS.md** — Tech stack principal
- **LEER_ANTES_PROYECTO_MAKWIN.md** — Cambios recientes y convenciones
- **SYSTEMS.md** — Arquitectura sistemas DB, auth, etc
- **BUG_FIXES_STATUS.md** — Status bugs actuales
- **DATABASE_MIGRATION_v2.md** — SQL migrations requeridas
- **TESTING_GUIDE_COMPREHENSIVE.md** — 58 escenarios testing
- **DEPLOYMENT_CHECKLIST.md** — Pre-deploy checklist
- **COMO_INVESTIGAR_BUGS.md** — Guía debugging español

---

## 🎯 NOTAS FINALES

1. **Siempre leer docs antes de cambios grandes**
2. **Testear en local antes de push**  
3. **TypeScript debe validar sin errores**
4. **Supabase RLS importante: revisar policies antes de editar**
5. **Help system completo:** Modal + BD + Admin panel + i18n
6. **Vercel limit:** 12 funciones max (actualmente 11)
7. **Testing:** Ver TESTING_GUIDE para casos críticos
8. **Tema:** Eliminar references a bombilla cuando sea posible

---

**Documento actualizado: Abril 22, 2026**
