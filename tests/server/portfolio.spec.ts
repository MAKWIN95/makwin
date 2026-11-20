import { describe, expect, it } from 'vitest';
import { cleanPortfolio, compactPortfolio, expandPortfolio, mediaToCheck, publicView, safeWebUrl, textsOf } from '../../shared/portfolio';

const USER = '11111111-1111-4111-8111-111111111111';
const WORK = '22222222-2222-4222-8222-222222222222';
const OWN = `https://media.makwin.art/${USER}/portfolio/a.jpg`;
const OWN_VIDEO = `https://media.makwin.art/${USER}/portfolio/reel.mp4`;
const OWN_PDF = `https://media.makwin.art/${USER}/portfolio/dossier.pdf`;
const ownFile = (url: string) => url.startsWith(`https://media.makwin.art/${USER}/`);

describe('cleanPortfolio', () => {
  it('keeps only known parts, cut to size, with safe defaults', () => {
    const clean = cleanPortfolio({
      discipline: 'hacker',
      design: { style: 'clasico', tone: 'neon', accent: 'vino' },
      info: { headline: 'x'.repeat(500), email: 'not-an-email', available: 'yes', heroWork: 'nope', heroImage: 'https://evil.example/a.jpg' },
      sections: [{ type: 'script', title: 'x' }, { type: 'about', title: ' Sobre   mí ', text: '  Hola\nmundo \u0007' }],
      extra: 'ignored',
    }, { ownFile });
    expect(clean.discipline).toBe('otro');
    expect(clean.design).toEqual({ style: 'clasico', tone: 'claro', accent: 'vino' });
    expect(clean.info.headline).toHaveLength(120);
    expect(clean.info.email).toBe('');
    expect(clean.info.available).toBe(false);
    expect(clean.info.heroWork).toBeNull();
    expect(clean.info.heroImage).toBeNull();
    expect(clean.sections).toHaveLength(1);
    expect(clean.sections[0]).toMatchObject({ type: 'about', title: 'Sobre mí', text: 'Hola\nmundo' });
    expect('extra' in clean).toBe(false);
  });

  it('only lets files from the artist’s own folder in', () => {
    const clean = cleanPortfolio({
      sections: [{
        type: 'files',
        title: 'Temas',
        items: [
          { url: OWN_PDF, kind: 'pdf', name: 'Dossier' },
          { url: 'https://media.makwin.art/someone-else/x.mp3', kind: 'audio' },
          { url: OWN, kind: 'executable' },
        ],
      }],
    }, { ownFile });
    const files = clean.sections[0];
    expect(files.type === 'files' && files.items.map((file) => file.url)).toEqual([OWN_PDF]);
  });

  it('turns links into web pages only', () => {
    expect(safeWebUrl('javascript:alert(1)')).toBe('');
    expect(safeWebUrl('data:text/html,hi')).toBe('');
    expect(safeWebUrl('open.spotify.com/track/abc')).toBe('https://open.spotify.com/track/abc');
    expect(safeWebUrl('localhost')).toBe('');
    const clean = cleanPortfolio({ sections: [{ type: 'links', items: [{ url: 'javascript:alert(1)' }, { url: 'https://youtu.be/abcdefg' }] }] }, { ownFile });
    const links = clean.sections[0];
    expect(links.type === 'links' && links.items.map((link) => link.url)).toEqual(['https://youtu.be/abcdefg']);
  });

  it('drops repeated works and empty rows, and gives every part its own id', () => {
    const clean = cleanPortfolio({
      sections: [
        { id: 'same', type: 'works', items: [{ id: WORK }, { id: WORK }, { id: 'not-a-uuid' }] },
        { id: 'same', type: 'entries', items: [{ year: '', title: '' }, { year: '2024', title: 'Expo' }] },
      ],
    }, { ownFile });
    expect(clean.sections[0].id).not.toBe(clean.sections[1].id);
    const [works, entries] = clean.sections;
    expect(works.type === 'works' && works.items).toEqual([{ id: WORK, note: '' }]);
    expect(entries.type === 'entries' && entries.items.map((entry) => entry.title)).toEqual(['Expo']);
  });
});

describe('what others see', () => {
  const content = cleanPortfolio({
    info: { heroImage: OWN },
    sections: [
      { type: 'files', title: 'Media', items: [{ url: OWN, kind: 'image' }, { url: OWN_VIDEO, kind: 'video' }, { url: OWN_PDF, kind: 'pdf' }] },
      { type: 'text', title: 'Borrador', text: 'secreto', hidden: true },
    ],
  }, { ownFile });

  it('asks for the check of uploaded pictures and videos only', () => {
    expect(mediaToCheck(content)).toEqual([{ url: OWN, kind: 'image' }, { url: OWN_VIDEO, kind: 'video' }]);
  });

  it('shows pictures and videos only once checked, and never hidden parts', () => {
    const before = publicView(content, []);
    expect(before.info.heroImage).toBeNull();
    expect(before.sections).toHaveLength(1);
    const files = before.sections[0];
    expect(files.type === 'files' && files.items.map((file) => file.kind)).toEqual(['pdf']);

    const after = publicView(content, [OWN]);
    expect(after.info.heroImage).toBe(OWN);
    const checkedFiles = after.sections[0];
    expect(checkedFiles.type === 'files' && checkedFiles.items.map((file) => file.kind)).toEqual(['image', 'pdf']);
  });

  it('gives every text to the word check, hidden ones too', () => {
    expect(textsOf(content)).toContain('secreto');
  });
});

describe('stored small', () => {
  const full = cleanPortfolio({
    discipline: 'musica',
    design: { style: 'moderno', tone: 'oscuro', accent: 'oro' },
    info: { headline: 'Productora', email: 'a@example.com', available: true, heroImage: OWN },
    sections: [
      { type: 'about', title: 'Sobre mí', text: '' },
      { type: 'works', title: 'Obras', items: [{ id: WORK, note: '' }] },
      { type: 'entries', title: 'Créditos', items: [{ year: '2025', title: 'Disco', detail: '', link: '' }] },
      { type: 'files', title: 'Temas', items: [{ url: OWN_PDF, kind: 'pdf', name: '', note: '' }] },
      { type: 'quotes', title: '', items: [], hidden: true },
    ],
  }, { ownFile });

  it('leaves out every empty part and gets it back exactly', () => {
    const small = compactPortfolio(full);
    const text = JSON.stringify(small);
    expect(text).not.toContain('""');
    expect(text).not.toContain('false');
    expect(text).not.toContain('null');
    expect(text.length).toBeLessThan(JSON.stringify(full).length);
    expect(expandPortfolio(small)).toEqual(full);
  });

  it('reads portfolios saved before, in their full shape, the same way', () => {
    expect(expandPortfolio(JSON.parse(JSON.stringify(full)))).toEqual(full);
  });
});
