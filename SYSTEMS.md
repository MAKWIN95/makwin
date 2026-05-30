# MAKWIN - Sistemas y Arquitectura

## 🎨 Estética y Diseño

### Colores de Brand
- **Primario**: Negro (#000000) - Botones, textos principales
- **Acentos**: Azul oscuro (#1e3a8a) - Hoversmétodos
- **Fondos**: #0f172a (oscuro) a #1e293b (degradado)
- **Bordes**: #e2e8f0 (claro)

### Componentes y Hovers
Todos los botones deben tener transiciones suaves:
```css
transition-all duration-200
hover:scale-102
hover:shadow-lg
hover:bg-[color-with-opacity-increase]
```

### Modales y Pop-ups
- Centro de pantalla con `fixed inset-0 flex items-center justify-center z-50`
- Fondo oscuro: `bg-black/50`
- Cards con `border border-[hsl(var(--border))] rounded-lg`
- Animación: `animate-in fade-in zoom-in-95 duration-200`

---

## 🔐 Sistema de Autenticación y Autorización

### Estados de Usuario
1. **No autenticado**: Sin sesión
2. **Logrado**: Sesión activa con perfil cargado
3. **Cargando**: Auth context loading = true

### Acciones Protegidas (Requieren Login)
- ❤️ Like en obras
- 🔖 Favoritos/Guardados
- 📤 Subir obra
- 🚩 Reportar obra
- ➕ Seguir artista
- 💬 Comentar (si se implementa)

### Modalidad de Protección
Cuando un usuario sin sesión intenta una acción protegida:
1. Mostrar modal centrado:
   - Título: "Inicia sesión para continuar"
   - Descripción: Descripción de la acción que requiere login
   - Botones: "Iniciar sesión" y "Crear cuenta"
2. Al hacer click:
   - Guardar `returnUrl` en sessionStorage
   - Navegar a `/login` o `/registro`
   - Después de login, regresar a `returnUrl`

```typescript
const handleProtectedAction = async (action: () => Promise<void>) => {
  if (!user) {
    showAuthModal({
      title: 'Inicia sesión para continuar',
      description: 'Necesitas estar registrado para hacer esto',
      onLogin: () => navigate('/login', { state: { returnUrl: location.pathname } }),
      onRegister: () => navigate('/registro', { state: { returnUrl: location.pathname } })
    });
    return;
  }
  await action();
};
```

---

## 🎯 Sistema de Búsqueda

### Búsqueda Global
- Busca por: título, artista, hashtags, username
- Debounce: 400ms
- Resultados en tiempo real en Gallery/Index
- **Si no hay resultados**: Mostrar mensaje "No hay resultados para 'X'". Try another search term"
- Botón "Limpiar búsqueda"

### Búsqueda de Perfiles
- `/u/@username` - Perfil del artista
- Perfil debe mostrar: avatar, bio, works count, followers
- Botón "Seguir" si es otro usuario

---

## 📝 Sistema de Comentarios/Reportes

### Reporte de Obras (🚩)
Flujo:
1. User hace click en bandera en WorkCard/WorkDetail
2. Si no está logado → Modal de auth
3. Si está logado → Modal de reporte con opciones:
   - Derechos de autor (copyright infringement)
   - Contenido +18
   - Contenido ofensivo
   - Spam
   - Otro (abre textarea para motivo personalizado)
4. Al enviar:
   - Insertar en tabla `reports` con `work_id`, `user_id`, `reason`
   - Mostrar toast: "Tu denuncia está siendo revisada por nuestro equipo"
   - Deshabilitar botón de reporte

```typescript
interface Report {
  id: string;
  work_id: string;
  user_id: string;
  reason: 'copyright' | 'adult' | 'offensive' | 'spam' | 'other';
  custom_reason?: string;
  created_at: string;
  status: 'pending' | 'reviewed' | 'dismissed';
}
```

---

## 👥 Sistema de Perfiles y Seguimiento

### Perfil de Usuario
Campos:
- `id` (UUID)
- `username` (UNIQUE, @handle, 3-32 caracteres)
- `display_name` (nombre visible)
- `bio` (hasta 500 caracteres)
- `avatar_url` (imagen de perfil)
- `language_preference` ('es' | 'en')
- `is_verified` (boolean)
- `is_banned` (boolean)
- `created_at`

### Validación de Username
- **UNIQUE**: No permitir dos usuarios con mismo @
- Formato: alfanuméricos + guiones/puntos
- Longitud: 3-32 caracteres
- Validar en cliente Y servidor (Supabase constraint)
- Mostrar error si existe: "Este @ ya está en uso"

### Seguimiento (Follows)
```typescript
interface Follow {
  id: string;
  follower_id: string; // Quien sigue
  following_id: string; // A quien sigue
  created_at: string;
}
```

Páginas relacionadas:
- `/siguiendo` → Feed de obras de usuarios que sigues
- `/u/:username` → Perfil incluye botón "Seguir/Dejar de seguir"

---

## 📱 Sistema de Obras (Works)

### Estructura de Obra
```typescript
interface Work {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  work_type: 'pintura' | 'fotografia' | 'poema' | 'cancion' | 'video';
  file_url: string | null;
  cover_url: string | null;
  lyrics: string | null;
  hashtags: string[];
  is_for_sale: boolean;
  price: number | null;
  status: 'published' | 'removed_policy' | 'removed_user';
  like_count: number;
  view_count: number;
  language: 'es' | 'en';
  created_at: string;
  updated_at: string;
}
```

### Interacciones con Obras
- **Like**: Tabla `likes(user_id, work_id)` - debe contar hacia `works.like_count`
- **Save/Favorito**: Tabla `saves(user_id, work_id)`
- **View**: Incrementar `works.view_count`
- **Report**: Tabla `reports(work_id, user_id, reason)`

### Persistencia de Likes
- Al hacer like/unlike:
  1. Insert/delete en tabla `likes`
  2. Actualizar `work.like_count` INMEDIATAMENTE en cliente
  3. Verificar con SQL trigger que sincronice contador (RLS)

### Edición y Eliminación de Obras
- **Editar**: Solo título, descripción, hashtags
- **Eliminar**: Solo propietario
- Opciones aparecen en:
  - `/u/:username` (tu propio perfil)
  - `/work/:id` (detalles, si eres propietario)

UI para propietario:
```
[Editar] [Eliminar]
```

Al eliminar → Modal con confirmación → Cambiar status a 'removed_user'

---

## 📤 Sistema de Upload

### Flujo de Subida
1. Form con validaciones
2. Upload archivo → `storage/works/{user_id}/{timestamp}.ext`
3. Upload cover (opcional) → `storage/works/{user_id}/covers/{timestamp}.ext`
4. Insert en tabla `works` con `status: 'published'`
5. **Redirigir a `/work/{id}`** - NO a una página de éxito

### Manejo de Errores de Carga
- Si work no existe inmediatamente:
  - Mostrador "Cargando obra…"
  - Reintentar cada 2 segundos (máximo 3 intentos)
  - Si falla: "Obra no encontrada. Vuelve a intenestilo"

---

## 🌐 Sistema de Idiomas

### Soporte de Idiomas
- **ES** (Español)
- **EN** (English)

### Selección de Idioma
1. **Onboarding**: Primer acceso, presenter selector
2. **Header**: Dropdown con banderas/códigos
3. **Perfil**: Preferencia guardada en `profiles.language_preference`
4. **Persistencia**: 
   - LocalStorage para anónimos
   - DB para usuarios logados

### Traducciones Inteligentes
- Al cambiar idioma:
  - TODO debe cambiar inmediatamente
  - Descripciones de obras MÁS se guardan en idioma original
  - Mostrar badge: "Traducido de [idioma]"

---

## 🎧 Canciones (Songs)

### Fuente de Datos
- Canciones están en `lib/songs.ts` como array estático
- Se combinan con Works del usuario en el feed
- Autor: siempre "MAKWIN"

### Campos de Canción
```typescript
interface Song {
  id: string;
  title: string;
  artist: string; // "MAKWIN"
  description: string;
  coverUrl: string;
  releaseDate: string;
  originalLanguage: 'es' | 'en';
  slug?: string;
}
```

---

## 📊 Sistema de Favoritos/Guardados

### Página `/favoritos`
- Mostrar todas las obras guardadas por el usuario
- Same layout como Gallery
- Si no hay favoritos: Mensaje "Aún no tienes obras guardadas"
- Botón para guardar desde cualquier obra

---

## ⚙️ Configuración de Perfil

### Página `/configuracion`
Secciones:
1. **Email** (solo mostrar)
2. **Cambiar Contraseña** - Campos para nueva contraseña + confirmar
3. **Preferencia de Idioma** - Selector ES/EN
4. **Resetear vía Email** - Botón para enviar link
5. **Cerrar Sesión** - Botón
6. **Eliminar Cuenta** (Zona de Peligro)
   - Modal con confirmación
   - Countdown de 5 segundos antes de poder eliminar
   - Explicar qué se borra: perfil, obras, historial

### Validaciones
- Contraseña mínimo 6 caracteres
- Las contraseñas deben coincidir
- Errores/éxito: Mostrar debajo de cada sección
- Spinner mientras procesa

---

## 🔌 APIs y Funciones Supabase

### RPC Functions (server-side logic)
- `get_feed(p_user_id, p_limit, p_offset)` → Works + ranking
- `get_user_works(p_user_id, p_limit)` → Works de un usuario
- `get_saved_works(p_user_id, p_limit)` → Obras guardadas

### Row Level Security (RLS)
- Solo propietario puede editar/eliminar su obra
- Solo propietario puede ver reports de su obra
- Likes/saves son privadas del usuario

---

## 📧 Email Templates

### Reset Password Email
Usar html/css professional con:
- Logo/branding MAKWIN (colores negros)
- CTA prominente "Resetear Contraseña"
- Link es válido 24 horas
- Es de UN SOLO USO
- Incluir email del usuario en plantilla

---

## 🧪 Testing Checklist

Ver `TESTING_GUIDE.md` para guía completa.

---

## 📝 Notas para Futuros Agentes IA

### Convenciones de Código
- TypeScript con tipos explícitos
- Components en `client/components/`
- Pages en `client/pages/`
- Hooks en `client/hooks/`
- Utilities en `client/lib/`
- Styles: TailwindCSS + CSS variables HSL

### Estado Global Necesario
- Auth context: `user`, `profile`, `loading`, `signOut`, `resetPassword`
- I18n context: `language`, `t(key)`

### Databases/Tablas Principales
- `profiles` - Usuarios
- `works` - Obras
- `likes` - Me gusta
- `saves` - Favoritos
- `follows` - Seguimiento
- `reports` - Denuncias

### URLs Importantes
- Staging: `makwin.vercel.app` (auto-deploy desde main)
- Supabase: proyecto privado del equipo
- GitHub: `MAKWIN95/makwin` (rama main)

---

## 📧 Infraestructura de Email (OFICIAL Y OPERATIVA)

### Estado
✅ **Completamente funcional y desplegado en producción**

### Stack Utilizado
```
DNS Provider:          Cloudflare (primario, DNSSEC desactivado)
Envío SMTP:            Resend (verificado con makwin.art)
Recepción:             Cloudflare Email Routing
Cliente Manual:        Gmail (alias SMTP - NO es arquitectura)
```

### Direcciones de Email Activas
```
help@makwin.art        ← Soporte general
contact@makwin.art     ← Contacto general
business@makwin.art    ← Consultas comerciales
press@makwin.art       ← Relaciones con prensa
no-reply@makwin.art    ← Transaccional automatizado (futuro backend)
```

### Flujo Arquitectónico (Production)
```
INBOUND:
└─ Email externo → makwin.art
   ├─ DNS MX: Cloudflare
   └─ Email Routing: Reenvía a Gmail central

OUTBOUND (Manual):
└─ Respuesta desde Gmail
   ├─ Using: Gmail SMTP alias
   └─ From: help@makwin.art / contact@ / business@ / press@

OUTBOUND (Automatizado - Futuro):
└─ Cuando backend/auth esté implementado
   ├─ From: no-reply@makwin.art
   ├─ Via: Resend API
   ├─ Usecase: Auth emails, password reset, notifications
   └─ Config: Env vars en Vercel/Supabase
```

### Configuración DNS (Cloudflare)
```
MX Records:           ✓ Configurados
SPF Record:           ✓ Configurado (include:resend.com)
DKIM Record:          ✓ Configurado (resend._domainkey)
DMARC Policy:         ✓ Configurado (p=none)
Email Routing Rules:  ✓ 5 direcciones activas
```

### Environment Variables (Vercel)
```
RESEND_API_KEY        ✓ Configurado
RESEND_FROM           ✓ Configurado (help@makwin.art por defecto)
RECIPIENT_EMAIL       ✓ Configurado (Gmail central)
```

### Importante: Arquitectura Oficial
⚠️ **Gmail es CLIENTE, NO ARQUITECTURA**
```
❌ No confundir Gmail como dependencia del backend
✅ Gmail solo es cliente operativo para gestión manual
✅ La arquitectura real es: Cloudflare + Resend + dominio propio
```

### Integración Backend (Futuro Próximo)
Cuando se implementen:
- Autenticación/signup
- Password reset
- Email verification
- Notificaciones transaccionales
- Newsletters automáticas

**Utilizar obligatoriamente:**
```
From: no-reply@makwin.art
Provider: Resend API
Method: POST endpoint en /api/send-email o serverless function
Config: Variables env en Vercel
Auth: API key from environment
```

### Ejemplo de Uso Futuro (Pseudocódigo)
```typescript
// En /api/send-email o serverless function
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'no-reply@makwin.art',  // Dominio verificado
  to: user.email,
  subject: 'Verify your email',
  html: emailTemplate,
  // headers, tags, etc
});
```

### Directrices para Desarrollo Futuro
Cuando implementes cualquier funcionalidad relacionada con:
- Formularios de contacto
- Authentication
- Password reset
- Email verification
- Transactional emails
- Notificaciones
- Automatizaciones

**DEBES asumir esta infraestructura como la oficial:**
✅ Usar Resend API con no-reply@makwin.art
✅ Configurar en environment variables
✅ Seguir best practices (no hacks, no dependencias Gmail)
✅ Documentar integración en código

**NO debes:**
❌ Crear dependencias en Gmail SMTP manual
❌ Usar soluciones temporales/hacks
❌ Agregar providers redundantes
❌ Implementar sin documentar

### Referencias
- Dominio: makwin.art (Cloudflare DNS)
- Resend Dashboard: https://resend.com/domains
- Cloudflare Email Routing: Dashboard → makwin.art → Email Routing
- Docs: Ver EMAIL_INFRASTRUCTURE_GUIDE.md para detalles técnicos
