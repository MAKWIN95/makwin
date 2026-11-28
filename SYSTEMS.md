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

## 🧭 Navegación (desde v1.1.36; v1.1.37)

- **Móvil y pantallas táctiles** (la misma regla que `phone:`): `client/components/TabBar.tsx` es una barra flotante de cristal abajo con cinco botones: Inicio, Siguiendo, **Subir obra en el centro**, Notificaciones (con la cifra en rojo) y Mi perfil (la foto).
  - Una gota de cristal se desliza hasta la pestaña de la página en la que estás. Solo se mueve con `transform` (sin rebote ni pasarse) y empieza a moverse al tocar, antes de que cargue la página nueva, para que nunca se entrecorte.
  - Al bajar por la página la barra se encoge un poco y al subir vuelve a su tamaño.
  - Tocar la pestaña en la que ya estás sube al principio de la página.
  - Se esconde deslizándose en las páginas que tienen su propia barra abajo o que se envían a otros: el inicio de sesión, `/p/`, `/beats`. En `/subir-obra` se queda.
  - Mientras está visible, `html.has-tabbar` deja espacio debajo.
  - **Guardados** no está en la barra: está en tu propio perfil (botón «Guardados» junto al portfolio) y en el menú de la foto.
- **Ordenador:** las tres líneas, a la izquierda de la flecha de volver, abren `client/components/NavDrawer.tsx`, un panel de cristal que entra desde la izquierda con todo agrupado (Explorar, Lo tuyo, Cuenta). Se cierra con Esc, al pulsar fuera, con la X o al elegir una página. Su estado está en `client/lib/nav-drawer.ts`, fuera de las páginas, para que se cierre con su propia animación aunque cambie la página.

## 📤 Subir obra (desde v1.1.37)

`client/pages/UploadWork.tsx`, como «nueva publicación» en una red social:

- **Inicio:** «Nueva obra». Una tarjeta grande de Galería (hasta 10 fotos o un vídeo) y debajo Cámara (solo móvil), Poema y Audio. En el ordenador también se pueden arrastrar archivos.
- **Móvil, en dos pasos:** primero la obra (encuadre, formato, orden) con «Siguiente»; luego «Detalles» (miniatura, título, descripción, tipo) con «Publicar». Si falta algo, «Publicar» vuelve al paso donde falta.
- **Ordenador:** la obra a la izquierda y los detalles a la derecha, en una sola pantalla.
- **Hashtags:** se escriben dentro de la descripción («… #retrato #oleo»). Al publicar, `splitHashtags` (`client/lib/utils.ts`) los saca del texto y los guarda aparte, y la obra los enseña separados. Mientras escribes se ven como etiquetas debajo. Los poemas mantienen su campo propio de hashtags, para no tocar los versos.

## ⏳ Sala de espera (acceso anticipado, desde v1.1.33)

Mientras `ESPERA_ACTIVA` sea `true` en `middleware.ts`, makwin.art está cerrada. Cualquier dirección (páginas, `/beats`, portfolios, obras) enseña la cuenta atrás y la caja de contraseña de acceso anticipado.

- **Dónde está:**
  - `middleware.ts` (Vercel Routing Middleware, corre antes de servir o cachear nada);
  - la página en `server/espera/pagina.ts`;
  - su aspecto y comportamiento en `public/espera/` (sin scripts en línea, por la CSP).
- **Por qué no se puede saltar:**
  - Sin pase no se sirve nada de la web: ni HTML, ni `/assets`, ni `/api` (401), ni archivos.
  - El pase es una cookie `makwin_acceso`: HttpOnly, Secure, SameSite=Lax, válida 120 días y firmada con HMAC-SHA256 con `GATE_SECRET`.
  - La contraseña solo se compara en el servidor, con un máximo de 8 intentos cada 10 min por dirección (Redis).
  - Sin `GATE_SECRET` o sin `EARLY_ACCESS_PASSWORD` no entra nadie.
- **Contraseña:** `EARLY_ACCESS_PASSWORD` en Vercel. Admite varias separadas por comas y no distingue mayúsculas, tildes, espacios ni guiones. Cambiarla exige volver a publicar; los pases ya dados siguen valiendo.
- **Qué sigue abierto:**
  - solo los archivos exactos de `OPEN_FILES` (iconos, imagen para compartir, `theme-boot.js` y `/espera/*`);
  - la copia nocturna (`/api/reports` con `CRON_SECRET`).
- **Contador:** `LANZAMIENTO` en `middleware.ts`. Solo se enseña; la web sigue cerrada hasta poner `ESPERA_ACTIVA = false`.
- **Tarjetas QR** (`?t=c1`, `?t=c2`): la página de espera cuenta la visita en Umami y la guarda para el registro de esa visita.
- **Límite conocido:** la base de datos (Supabase) se consulta desde el navegador con la clave pública. Quien ya la tuviera de antes podría leer datos públicos directamente. Cerrarlo del todo exige cambiar esa clave (decisión del dueño).

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

### Solo obras
MAKWIN es para obras, no para el día a día (no es Instagram). La regla vive en un solo sitio, `client/lib/what-to-upload.ts`, y se repite igual en:
- la ventana «MAKWIN es para obras» (`WhatToUploadSheet`), que sale una vez por cuenta y dispositivo al entrar a subir, y siempre desde «¿Qué puedo subir?»
- el aviso del carrusel al elegir varias fotos: todas de la misma obra, serie, detalles o proceso
- el punto 5 de las Condiciones, «Solo obras»
- el motivo de denuncia «No es una obra» (`no_obra`, viaja en los detalles como los demás motivos nuevos)

### Actualizar con gente dentro
Cada versión sale entera de golpe (Vercel) y quien tiene la web abierta sigue con la suya: nada de lo que está haciendo se corta. Para que nadie se quede atrás ni pierda nada:
- Cada build deja `/version.json` con su nombre (commit). La página abierta lo mira al volver a ella y cada 10 minutos (`client/lib/app-update.ts`).
- Si hay una versión nueva, se carga **al cambiar de página**, nunca a mitad de algo (subir obra, una ventana abierta, colocar una foto). Volver atrás a la galería no recarga, para no perder por dónde ibas.
- Reglas para cada cambio:
  - Base de datos: solo **añadir** (columnas nuevas con valor por defecto, tablas nuevas). Nada que la versión anterior aún abierta necesite se borra o renombra en la misma versión; se quita en una posterior, cuando ya nadie la usa.
  - API: aceptar lo que mandaba la versión anterior (campos nuevos siempre opcionales). Los motivos de denuncia nuevos ya van en los detalles por esto.
  - Archivos de los usuarios: nunca se borran ni se mueven en una actualización.

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

## 💼 Portfolio (`/p/:username`)

- **Qué es**: cada artista puede montar un portfolio desde su perfil («Crear mi portfolio»). Al elegir disciplina sale un borrador ya hecho con sus obras, su bio y sus enlaces. Objetivo de fondo: que enviar «tu portfolio MAKWIN» sea lo normal en el mundo del arte, así que tiene que ser cómodo y útil de verdad.
- **Partes**: Sobre mí, Obras (de su perfil, con nota «año · técnica · medidas»), Trayectoria (exposiciones, créditos, premios…), Archivos (audio con reproductor propio, vídeo, fotos y PDF), Enlaces (Spotify y YouTube se ven dentro), Prensa y Texto libre. Se mueven, se ocultan y se borran con «Deshacer».
- **Diseño**: Clásico / Galería / Moderno, 5 fondos cerrados (Claro, Papel y Piedra con textura de papel dibujada, Oscuro, Pizarra con textura) y 6 colores. Nada de color libre: así todos los portfolios mantienen la identidad.
- **PDF** («Descargar PDF»): sale con el mismo fondo, de borde a borde (cada fondo nombra su hoja con `@page pf-<fondo>`). Página 1 = portada (imagen, nombre, contacto; un statement corto de hasta 650 caracteres entra en ella). Ninguna parte se corta entre páginas (`data-print="whole"`, regla `keepsTogetherOnPaper`); solo las muy largas continúan, y entonces entre obras, fechas, citas o párrafos, nunca por en medio. Al pie, la marca «MAKWIN | portfolio».
- **Quién lo ve**: Solo yo / Con enlace (`?k=`; se puede crear un enlace nuevo y el viejo deja de ir) / Público (sale en el perfil). «Vista previa» (`?vista=visitante`) enseña al dueño exactamente lo que ven los demás.
- **Datos**: tabla `portfolios` (una fila por artista). Nadie lee la tabla directamente salvo el dueño; los demás pasan por `get_portfolio(username, key)`, que solo devuelve `public_content`.
- **Guardar**: todo pasa por `api/publish-work.ts` (`?action=portfolio` PUT/DELETE, `?action=portfolio-key` POST), sin función nueva (Vercel Hobby tiene 12 como máximo). El servidor limpia todo (`cleanPortfolio` en `shared/portfolio.ts`): solo obras propias, solo archivos de su carpeta, solo enlaces web, palabras prohibidas fuera.
- **Revisión**: fotos y vídeos nuevos se revisan solos en segundo plano; hasta que pasan, solo los ve el dueño («Revisando…»). `public_content` se recalcula al terminar.
- **Autoguardado**: 0,5 s después del último cambio y, como mínimo, cada 2,5 s mientras se escribe sin parar; no reenvía si no cambió nada. Al cambiar de app, bloquear el móvil o cerrar, envía al momento (`keepalive`). Cada cambio se guarda también en el dispositivo (`localStorage`, `makwin:portfolio-draft:<id>`): si no llegó al servidor, se recupera y se envía al abrir de nuevo. Si falla, reintenta a los 3, 6, 12… s (máx. 30 s) y al volver la conexión, con un solo aviso.
- **Espacio**: se guarda sin partes vacías (`compactPortfolio` / `expandPortfolio`), y cuando lo que ven los demás es igual que el portfolio entero, `public_content` es solo `{"same": true}` y `get_portfolio` devuelve `content` (migración `20261121120000_portfolio_compact.sql`). Más o menos la mitad de espacio.
- **Archivos**: van a `<id>/portfolio/` en la carpeta del artista. Borrar el portfolio no borra los archivos.

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
