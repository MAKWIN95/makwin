// The waiting-room page, served by middleware.ts at every address while the site is closed.
// No inline script or style (the site's security rules forbid them): the look is in
// /espera/espera.css and the countdown and password box in /espera/espera.js.

const BOLT =
  '<svg class="bolt" viewBox="0 0 100 100" aria-hidden="true"><path d="M12.91 84 L33.61 31.3 L54.62 73.32 L66.99 45.5 L60.91 100 L60.91 100 L87.09 0 L77.67 0 L55.19 38.68 L35.85 0 L25.85 0 L12.91 84 Z" fill="currentColor" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" transform="translate(50 50) scale(0.9) translate(-50.3 -42.8)"/></svg>';

const DESCRIPTION = 'MAKWIN, la red social para artistas, abre muy pronto. Todo tu arte, en un enlace.';

export function paginaEspera(launchIso: string): string {
  const unit = (name: string, label: string) =>
    `<div class="unit"><div class="digits" data-u="${name}"><span class="d">00</span></div><div class="label">${label}</div></div>`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>makwin · Abrimos muy pronto</title>
<meta name="description" content="${DESCRIPTION}" />
<meta name="robots" content="noindex" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fbfaf8" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b0b0c" />
<meta property="og:site_name" content="MAKWIN" />
<meta property="og:title" content="MAKWIN · Abrimos muy pronto" />
<meta property="og:description" content="${DESCRIPTION}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.makwin.art/" />
<meta property="og:locale" content="es_ES" />
<meta property="og:image" content="https://www.makwin.art/compartir.png?v=2" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://www.makwin.art/compartir.png?v=2" />
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
<link rel="preload" href="/espera/inter-800.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/espera/espera.css" />
<script src="/theme-boot.js"></script>
</head>
<body>
<main class="room" data-launch="${launchIso}">
  <header class="brand">${BOLT}<span class="name">makwin</span></header>

  <section class="count" aria-live="off">
    <p class="kicker">Abrimos en</p>
    <div class="clock" role="timer" aria-label="Cuenta atrás hasta la apertura">
      ${unit('d', 'días')}<span class="sep">:</span>${unit('h', 'horas')}<span class="sep">:</span>${unit('m', 'min')}<span class="sep">:</span>${unit('s', 'seg')}
    </div>
    <p class="soon" hidden>Ya casi. Abrimos en nada.</p>
    <p class="slogan">Todo tu arte, en un enlace.</p>
  </section>

  <section class="early">
    <h1>Acceso anticipado</h1>
    <p class="hint">Hay una contraseña escondida en nuestros vídeos. Quien la encuentre entra antes que nadie.</p>
    <form class="pass" novalidate>
      <label class="sr" for="clave">Contraseña</label>
      <input id="clave" name="clave" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Contraseña" maxlength="200" required />
      <button type="submit"><span class="txt">Entrar</span></button>
    </form>
    <p class="msg" role="status" aria-live="polite"></p>
    <a class="tiktok" href="https://www.tiktok.com/@makwin.art" target="_blank" rel="noopener">Ver los vídeos en TikTok · @makwin.art</a>
  </section>
</main>
<script src="/espera/espera.js" defer></script>
</body>
</html>`;
}
