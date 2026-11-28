// The waiting room: countdown, early-access password, and the visit statistics
// (Umami: no cookies, nothing about who visits). The password is checked only on the server.
(function () {
  var room = document.querySelector('.room');
  if (!room) return;

  /* ---------- countdown ---------- */
  var launch = Date.parse(room.getAttribute('data-launch') || '');
  var shown = {};

  function roll(box, text) {
    var current = box.querySelector('.d:not(.leaving)');
    if (current && current.textContent === text) return;
    var next = document.createElement('span');
    next.className = 'd coming';
    next.textContent = text;
    box.appendChild(next);
    // two frames so the browser sees the start position before moving
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        next.classList.remove('coming');
        if (current) {
          current.classList.add('leaving');
          setTimeout(function () { current.remove(); }, 600);
        }
      });
    });
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function tick() {
    var left = Math.max(0, Math.floor((launch - Date.now()) / 1000));
    var parts = {
      d: Math.floor(left / 86400),
      h: Math.floor((left % 86400) / 3600),
      m: Math.floor((left % 3600) / 60),
      s: left % 60,
    };
    Object.keys(parts).forEach(function (k) {
      var text = pad(parts[k]);
      if (shown[k] === text) return;
      shown[k] = text;
      var box = room.querySelector('[data-u="' + k + '"]');
      if (box) roll(box, text);
    });
    var soon = room.querySelector('.soon');
    if (soon) soon.hidden = left > 0;
    if (left > 0) setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  if (!isNaN(launch)) tick();

  /* ---------- statistics (only on the real site) ---------- */
  var HOSTS = ['www.makwin.art', 'makwin.art', 'makwin.vercel.app'];
  var counted = HOSTS.indexOf(location.hostname) !== -1;
  function track(name, data) {
    try { if (window.umami) window.umami.track(name, data); } catch (e) { /* never break the page */ }
  }
  function whenReady(fn, tries) {
    if (window.umami) return fn();
    if ((tries || 0) < 30) setTimeout(function () { whenReady(fn, (tries || 0) + 1); }, 500);
  }
  if (counted) {
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://cloud.umami.is/script.js';
    s.setAttribute('data-website-id', '637ee074-4b15-4ec8-bef0-38aba142b482');
    s.setAttribute('data-domains', HOSTS.join(','));
    document.head.appendChild(s);
  }

  // Business cards (printed QR codes ?t=c1, ?t=c2): count the scan here, keep it for a sign-up
  // later in this visit, and tidy the address so the site doesn't count it twice after entering.
  var card = null;
  try {
    var t = new URLSearchParams(location.search).get('t');
    card = t && /^[a-z0-9-]{1,24}$/.test(t) ? t : null;
  } catch (e) { card = null; }
  if (card) {
    try { sessionStorage.setItem('makwin-tarjeta', card); } catch (e) { /* private mode */ }
    if (counted) whenReady(function () { track('tarjeta', { modelo: card }); });
    try {
      var clean = new URL(location.href);
      clean.searchParams.delete('t');
      history.replaceState(history.state, '', clean.pathname + clean.search + clean.hash);
    } catch (e) { /* keep the address */ }
  }

  /* ---------- early access ---------- */
  var form = room.querySelector('.pass');
  var input = room.querySelector('#clave');
  var button = form && form.querySelector('button');
  var msg = room.querySelector('.msg');
  var busy = false;

  function say(text, bad) {
    msg.classList.remove('show');
    setTimeout(function () {
      msg.textContent = text;
      msg.classList.toggle('bad', !!bad);
      if (text) msg.classList.add('show');
    }, text && msg.textContent ? 180 : 0);
  }

  function wrong(text) {
    form.classList.remove('wrong');
    void form.offsetWidth; // restart the shake
    form.classList.add('wrong');
    say(text, true);
    input.select();
  }

  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var clave = (input.value || '').trim();
    if (!clave) { wrong('Escribe la contraseña.'); return; }
    busy = true;
    button.disabled = true;
    say('Comprobando…');
    fetch('/__acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ clave: clave }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; });
      })
      .then(function (r) {
        if (r.ok && r.body && r.body.ok) {
          say('Dentro. Bienvenido.');
          if (counted) track('acceso-anticipado');
          setTimeout(function () { room.classList.add('opening'); }, 350);
          // same address, so a link to a work or a profile opens right where it pointed
          setTimeout(function () { location.reload(); }, 900);
          return;
        }
        wrong((r.body && r.body.error) || 'Esa no es. Sigue buscando.');
      })
      .catch(function () { wrong('No hay conexión. Prueba otra vez.'); })
      .then(function () { busy = false; button.disabled = false; });
  });
})();
