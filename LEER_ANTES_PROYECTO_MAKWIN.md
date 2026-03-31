# LEER ANTES DE HACER CUALQUIER CAMBIO: CONTEXTO COMPLETO DEL PROYECTO MAKWIN (IMPORTANTE)

Este documento está pensado para la próxima IA o desarrollador que llegue al proyecto. DEBES leerlo completamente antes de tocar cualquier archivo o ejecutar cambios. Aquí explico en detalle cómo funciona la web ahora, qué cambios se han aplicado, las animaciones, estilos, rutas, dependencias, y dónde buscar cada cosa.

---

## Resumen rápido
- Proyecto: makwin (plantilla Full-stack con frontend React + Vite y backend Express integrado).
- Propósito: landing premium para MAKWIN con galería, marketplace y merch, plus sistema de envío de obras.
- Tecnologías: React 18 + TypeScript, Vite, TailwindCSS (config propia + `global.css`), GSAP con ScrollTrigger, Express (server integrado), PNPM.
- Punto de entrada dev: `pnpm dev` (arranca Vite + servidor integrado en modo dev).

---

## Estructura principal (relevante)
- `client/` — SPA frontend (React + TS)
  - `App.tsx` — Router y bootstrap de la SPA. Importante: contiene `SubmitButton` fijado fuera de `Routes` (se oculta por ruta ahora).
  - `global.css` — variables de tema y utilidades globales.
  - `pages/` — páginas:
    - `Landing.tsx` — página de inicio (hero con estrellas, navbar líquido, 4 secciones con CTA y scroll indicator). Archivo donde se aplican GSAP y lógica de scroll del hero.
    - `Index.tsx` — Galería (ruta `/galeria`).
    - `Merch.tsx` — Merch (ruta `/merch`).
    - `Marketplace.tsx` — Marketplace (ruta `/marketplace`).
    - `SubmitWork.tsx` — Formulario de envío de obras (ruta `/enviar-obra`).
    - `SubmittedWorks.tsx`, `Admin.tsx`, `RequestChange.tsx`, `WorkDetail.tsx` — otras páginas administrativas/CRUD.
  - `components/` — UI components reutilizables
    - `Header.tsx` — Header global (sticky, busca, logo). Se agregó CSS liquid glass en `landing.css` para la navbar de landing; hay posibilidad de aplicar estilos al `header` global si quieres que el `Header` se vea idéntico.
    - `SubmitButton.tsx` — botón flotante para "Enviar obra" (antes aparecía en landing; ahora se condicionaliza para que solo se muestre en rutas `/galeria` o `/marketplace`).
    - `ThemeBulb`, `LanguageSelector`, `Onboarding`, `LanguagePrompt`, `PublishedWorks`, etc.
  - `components/ui/` — librería UI local (tooltip, dialog, toasts, etc.).
  - `hooks/`, `lib/`, `i18n/` — utilidades y traducciones.

- `server/` — Express server + rutas API (prefijo `/api/*`).
- `shared/api.ts` — tipos compartidos entre client y server.
- `public/` — assets estáticos (manifest, robots, portadas).
- `submissions/` — JSONs de ejemplo de obras enviadas.

---

## Rutas importantes
- `/` — Landing (`client/pages/Landing.tsx`)
- `/galeria` — Galería (`client/pages/Index.tsx`)
- `/merch` — Merch (`client/pages/Merch.tsx`)
- `/marketplace` — Marketplace (`client/pages/Marketplace.tsx`)
- `/enviar-obra` — Enviar obra (formulario) (`client/pages/SubmitWork.tsx`)
- `/work/:id` — Detalle de obra
- `/api/*` — Endpoints server

---

## Estado actual: cambios recientes y decisiones importantes
- El hero background se oscureció: color base usado en hero/estrellas ahora es `#0d0d0f` (muy oscuro, casi negro). Antes se usaba `#1a1a1f`.
- Se añadieron más estrellas con sesgo a la izquierda para equilibrio visual.
- Scroll indicator: ahora es una "gota" liquid glass (80x48px) con `backdrop-filter: blur(12px)`, `background: rgba(255,255,255,0.12)` y SVG de flecha. Implementado en `landing.css` y JSX en `Landing.tsx`.
- Indicador desaparece al hacer scroll (GSAP) — lógica añadida en `Landing.tsx`: escucha `scroll` y oculta la clase `.scroll-indicator` cuando `window.scrollY > 80`.
- Botón "Enviar obra" (flotante) fue movido a `client/components/SubmitButton.tsx` y ahora usa `useLocation()` para mostrarse solo en rutas que empiezan por `/galeria` o `/marketplace`. Se quitó de la landing.
- Merch: sección con fondo blanco/gradient (`linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)`) para mejorar contraste con navbar.
- Botones tipo "liquid": `.btn-liquid` con `backdrop-filter` y `::before` shimmer; se añadió `@keyframes glassReflect` para el efecto reflejo en hover y se aplicó a `.btn-primary:hover`.
- Navbar líquido (`.liquid-navbar`) en `landing.css`: posicionada fija, backdrop blur, borde sutil y sombra. Se añadieron reglas `[data-theme="light"]` para mejorar contraste en secciones claras.
- Se corrigió un error de CSS (llaves sobrantes) en `landing.css` alrededor del bloque de `@keyframes` (PostCSS arrojaba "Unexpected }" y fue arreglado).
- Se actualizaron los textos de Merch y Marketplace en `Landing.tsx` (eliminada mención a YEEZY y mejor copy de venta).

---

## Animaciones y lógica front-end
- GSAP + ScrollTrigger en `Landing.tsx`:
  - Animaciones del hero, paralaje de elementos y trigger para mostrar/ocultar `.liquid-navbar` según scroll.
  - Scroll indicator tiene `gsap.to(... repeat: -1, yoyo: true)` para el "bounce" y un listener que lo oculta cuando se baja.
- Botones: `::before` shimmer animado (keyframes `shimmer`) y `glassReflect` para hover.
- Header: sticky/top con `backdrop-blur` y `border` sutil; en landing hay una `liquid-navbar` separada que aparece con transición al scrollear.

---

## Estilos, variables y paleta
- Sistema de theming: CSS variables en `global.css` (ej. `--background`, `--muted`, `--foreground`, `--border`, `--ring`). Se usan junto a `data-theme="dark"` / `data-theme="light"`.
- Colores clave utilizados recientemente:
  - Hero / fondo oscuro: `#0d0d0f` (casi negro)
  - Sección Merch (fondo claro): `#f5f5f5` → `#ffffff` (gradiente claro)
  - Botones liquid: blanco semi-transparente `rgba(255,255,255,0.12)` en modo oscuro; en `data-theme="light"` usan `rgba(0,0,0,0.08)` para contraste.
  - Borde y reflejos: `rgba(255,255,255,0.2..0.5)` para luz; en modo claro se invierten a valores negros semi-trans.
- Tipografías y espaciado siguen utilidades Tailwind pero muchas reglas CSS se han aplicado directamente en `landing.css` para control fino del hero.

---

## Archivos que cambié/modifiqué recientemente (importante)
- `client/pages/landing.css` — muchas reglas nuevas (liquid navbar, scroll indicator, btn-liquid, glassReflect) y corrección de llaves.
- `client/pages/Landing.tsx` — textos de secciones, scroll indicator JSX y lógica para esconderlo, botón text props para secciones.
- `client/components/SubmitButton.tsx` — uso de `useLocation()` y lógica para ocultar el botón en la landing.

Si necesitas saber el diff exacto, revisa el control de versiones en Git (branch `main`) o inspecciona estos archivos.

---

## Errores y fallos conocidos (y cómo se resolvieron)
- Error PostCSS: `Unexpected }` en `landing.css` (línea ~632) — resultado de propiedades sueltas sin selector y una llave sobrante. Arreglado moviendo esas propiedades a `.btn-primary:hover` y cerrando correctamente el bloque; `@keyframes glassReflect` quedó en su lugar.
- Comportamiento navbar sobre fondo blanco: la navbar principal se "camuflaba" sobre la sección Merch. Mitigado añadiendo reglas `[data-theme="light"] .liquid-navbar { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.08); color: #000 }` y ajustar `btn-navbar` en modo claro.

---

## Dónde ajustar cosas (guía rápida)
- Si quieres oscurecer el fondo de estrellas: editar `client/pages/landing.css` > `.hero-bg` o variables `--background` en `global.css`. Actualmente el gradiente del hero usa `#0d0d0f` y `#1a1a1d`.
- Añadir más estrellas / cambiar densidad: buscar la parte en `Landing.tsx` que genera elementos `.star` o el canvas/elementos SVG que pintan las estrellas.
- Ajustar comportamiento del submit button: `client/components/SubmitButton.tsx`.
- Cambiar textos de CTA en la landing: `client/pages/Landing.tsx`, `sections` array.
- Navbar global (Header): `client/components/Header.tsx` y estilos globales en `landing.css` (ya añadí un bloque `header { backdrop-filter: blur(12px) }` pero si quieres que el `Header` comparta exactamente la apariencia de `.liquid-navbar`, aplica las mismas clases o extrae estilos a `global.css`.

---

## Comandos útiles
- Instalar dependencias (si hace falta):
```powershell
pnpm install
```
- Ejecutar en dev (hot-reload):
```powershell
pnpm dev
# abre http://localhost:3002/
```
- Typecheck (rápido):
```powershell
pnpm typecheck
```
- Ejecutar tests (si existen):
```powershell
pnpm test
```

---

## Recomendaciones para la próxima IA (o desarrollador)
1. **Lee este archivo entero** antes de aplicar cambios.
2. Antes de editar CSS grande, ejecuta `pnpm dev` y observa el terminal por errores PostCSS (está configurado y fallos son inmediatos). Si hay `Unexpected }` revisa llaves y bloques `@keyframes` primero.
3. Si tocas la `liquid-navbar`, sincroniza cambios entre `landing.css` y `Header.tsx` (o extrae a un archivo de estilos compartidos) para evitar inconsistencias entre landing y resto del sitio.
4. Para cambiar visibilidad de componentes globales (ej. `SubmitButton`), revisa `App.tsx` porque el botón está montado fuera de `Routes`.
5. Mantén pruebas manuales: abrir `/`, `/galeria`, `/merch` y revisar contraste y comportamiento del navbar cuando entras en la sección Merch (blanca).
6. Antes de un commit grande, lanza `pnpm typecheck`.

---

## Contacto del historial (lo que este repo ya contiene)
- El repo contiene archivos de configuración para Netlify y Vercel (`netlify.toml`, `vercel.json`) y guías de integración para Cloudinary y Vercel KV.
- Hay un directorio `api/` con funciones serverless (en la raíz) y `server/routes` con endpoints Express.

---

## Notas finales — pasos sugeridos a continuar (prioridad)
- Ajustar la oscuridad de las estrellas si el usuario lo siente aún muy gris.
- Test cross-theme (light/dark) para garantizar legibilidad del navbar sobre fondos claros.

---

Archivo creado por el agente local. Cualquier cambio que hagas en el CSS o en `Landing.tsx` puede afectar estilos globales; revisa en modo dev y confirma visualmente.

FIN DEL DOCUMENTO.

---

**REGLAS VISUALES IMPORTANTES (OBLIGATORIO LEER ANTES DE CAMBIAR ESTILOS)**

- Evitar bordes afilados: todas las cajas, imágenes y botones deben usar esquinas redondeadas suaves (mínimo `border-radius: 8px`, preferible `12px` o más para elementos grandes).
- Prefiere transiciones y animaciones suaves: `ease-out` y duraciones cortas (0.18s-1.2s según contexto). Evitar animaciones bruscas o saltos.
- Liquid glass: elementos flotantes (navbar, botones importantes, bombilla) deben usar `backdrop-filter: blur(...)`, fondos semi-transparente y bordes sutiles. No usar colores planos y afilados para estos elementos.
- Reflejos: usar `box-shadow` inset para reflejo suave en hover, no líneas duras. `glassReflect` y `shimmer` ya implementados — sigue ese patrón.
- Imágenes: cuando aparezcan con reveal, la máscara/borde debe estar ligeramente blurreada para evitar sensación tallada. Implementar overlay `.reveal-edge` con `backdrop-filter: blur(6-10px)` y animar su anchura para producir borde soft durante revelado.
- Contraste: en secciones claras, oscurecer ligeramente el fondo (no dejar blanco puro) si encima circulan elementos blancos o translucidos (ej. navbar) para mantener legibilidad.
- Consistencia de etiquetas: evitar duplicar textos para acciones diferentes (no dos botones “Explorar” con funciones distintas). Usa textos específicos: `Galería`, `Descubrir obras`, `Descubrir el merch`, `Explorar` (como scroll CTA).

Lee estas reglas antes de tocar CSS y añade cambios explotables en el README local o en una RFC de PR si rompes alguna de estas reglas.

---

**INSTRUCCIÓN PARA LA PRÓXIMA IA / DESARROLLADOR**

Cuando realices cambios importantes en el proyecto, agrega en este mismo documento (arriba o al final) un resumen claro de los cambios que hiciste. Cada entrada debe incluir:

- **Qué**: resumen breve del cambio (archivo(s) modificados y qué se cambió).
- **Por qué**: motivo / feedback del usuario que motivó el cambio.
- **Cómo probar**: pasos rápidos para verificar que el cambio funciona (comandos y rutas). 
- **Posibles riesgos**: qué podría romperse o qué se debe revisar (por ejemplo, PostCSS errors, incompatibilidades con temas).

Este documento es la única fuente de contexto que la próxima IA debe leer antes de aplicar cambios. No asumas historial adicional fuera de este archivo.
