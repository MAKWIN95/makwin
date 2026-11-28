import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import middleware, { COOKIE, ENTRY_PATH, makePass, normalise, rightPassword, validPass } from '../../middleware';

// The waiting room must let nobody in without the password: no page, no code, no API, no file.
const SECRET = 'secreto-de-prueba-para-firmar-pases-0123456789';
const PASSWORD = 'Lienzo Azul';
const CRON = 'cron-de-prueba';

const site = 'https://www.makwin.art';
const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(site + path, { headers: { accept: 'text/html', ...headers } });
const passes = (res: Response) => res.headers.get('x-middleware-next') === '1';

let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = { ...process.env };
  process.env.GATE_SECRET = SECRET;
  process.env.EARLY_ACCESS_PASSWORD = PASSWORD;
  process.env.CRON_SECRET = CRON;
  delete process.env.STORAGE_KV_REST_API_URL;
  delete process.env.STORAGE_KV_REST_API_TOKEN;
});
afterEach(() => { process.env = saved; });

async function enter(clave: unknown) {
  return middleware(new Request(site + ENTRY_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave }) }));
}

describe('sin contraseña no se ve nada', () => {
  it.each(['/', '/galeria', '/u/alguien', '/work/123', '/beats', '/beats/index.html', '/index.html', '/subir-obra', '/portfolio/x?t=c1'])(
    '%s enseña la página de espera',
    async (path) => {
      const res = await middleware(get(path));
      expect(passes(res)).toBe(false);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toContain('no-store');
      const html = await res.text();
      expect(html).toContain('Acceso anticipado');
      expect(html).not.toContain('/assets/');
    },
  );

  it.each(['/assets/index-abc.js', '/assets/index.css', '/submissions/x.jpg', '/version.json', '/sitemap.xml', '/mkwn-beats.html.map'])(
    '%s no se sirve',
    async (path) => {
      const res = await middleware(get(path, { accept: '*/*' }));
      expect(passes(res)).toBe(false);
      expect(res.status).toBe(401);
    },
  );

  it.each([['GET', '/api/get-submissions'], ['POST', '/api/publish-work'], ['GET', '/api/reports?action=backup']])('%s %s queda cerrada', async (method, path) => {
    const res = await middleware(new Request(site + path, { method }));
    expect(passes(res)).toBe(false);
    expect(res.status).toBe(401);
  });

  it('solo abre los archivos exactos de la página de espera, no lo que cuelga de ellos', async () => {
    expect(passes(await middleware(get('/espera/espera.js')))).toBe(true);
    expect(passes(await middleware(get('/favicon.svg')))).toBe(true);
    for (const trick of ['/espera/..%2fassets/index.js', '/espera/espera.js/../../assets/a.js', '/espera/otra.js', '/espera/', '/%65spera/espera.js', '/favicon.svg%00.js']) {
      expect(passes(await middleware(get(trick))), trick).toBe(false);
    }
    expect(passes(await middleware(new Request(site + '/espera/espera.js', { method: 'POST' })))).toBe(false);
  });
});

describe('el pase', () => {
  it('la contraseña buena da un pase que abre toda la web', async () => {
    const res = await enter('lienzo-azul');
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') || '';
    expect(cookie).toContain(`${COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    const value = cookie.split(';')[0];
    for (const path of ['/', '/u/alguien', '/assets/index.js', '/api/get-submissions']) {
      expect(passes(await middleware(get(path, { cookie: `otra=1; ${value}` }))), path).toBe(true);
    }
  });

  it('una contraseña mala no da pase', async () => {
    for (const clave of ['lienzo', 'lienzo azul!', '', '   ', null, 42, { a: 1 }, 'x'.repeat(500)]) {
      const res = await enter(clave);
      expect(res.status, String(clave)).toBe(401);
      expect(res.headers.get('set-cookie')).toBeNull();
    }
  });

  it('un pase inventado, cambiado o caducado no vale', async () => {
    const good = await makePass(SECRET);
    const [until, sig] = good.split('.');
    const fakes = [
      'si',
      '1',
      `${until}.${'A'.repeat(43)}`,
      `${Number(until) + 999}.${sig}`,
      `${until}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`,
      await makePass('otro-secreto'),
      await makePass(SECRET, Date.now() - 200 * 86400 * 1000),
    ];
    for (const fake of fakes) {
      expect(await validPass(fake, SECRET), fake).toBe(false);
      expect(passes(await middleware(get('/', { cookie: `${COOKIE}=${fake}` }))), fake).toBe(false);
    }
    expect(await validPass(good, SECRET)).toBe(true);
  });

  it('sin secreto en el servidor no entra nadie, ni con la contraseña', async () => {
    delete process.env.GATE_SECRET;
    expect((await enter(PASSWORD)).status).toBe(401);
    expect(await validPass(await makePass(SECRET), undefined)).toBe(false);
  });

  it('sin contraseña configurada no entra nadie', async () => {
    delete process.env.EARLY_ACCESS_PASSWORD;
    expect((await enter('')).status).toBe(401);
    expect((await enter('lienzo azul')).status).toBe(401);
  });

  it('la entrada solo acepta el formulario', async () => {
    expect((await middleware(get(ENTRY_PATH))).status).toBe(405);
  });
});

describe('la copia nocturna sigue funcionando', () => {
  it('pasa con la clave del programador de Vercel y con nada más', async () => {
    const at = (auth: string, path = '/api/reports?action=backup') => middleware(new Request(site + path, { headers: { authorization: auth } }));
    expect(passes(await at(`Bearer ${CRON}`))).toBe(true);
    expect(passes(await at('Bearer otra'))).toBe(false);
    expect(passes(await at(`Bearer ${CRON}`, '/api/publish-work'))).toBe(false);
    delete process.env.CRON_SECRET;
    expect(passes(await at('Bearer undefined'))).toBe(false);
  });
});

describe('contraseñas', () => {
  it('perdona mayúsculas, tildes, espacios y guiones', async () => {
    expect(normalise('  Lienzo-Azúl ')).toBe('lienzoazul');
    expect(await rightPassword('LIENZOAZUL', PASSWORD)).toBe(true);
    expect(await rightPassword('otra', 'una, otra')).toBe(true);
    expect(await rightPassword('', 'una, ,otra')).toBe(false);
  });
});
