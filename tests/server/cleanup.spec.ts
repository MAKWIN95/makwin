import { describe, expect, it } from 'vitest';
import { cleanPortfolio } from '../../shared/portfolio';
import { withoutWork } from '../../server/lib/forget-work';
import { addressesIn, orphanKeys, ORPHAN_MIN_AGE_MS } from '../../server/lib/orphan-files';

const USER = '11111111-1111-4111-8111-111111111111';
const GONE = '22222222-2222-4222-8222-222222222222';
const KEPT = '33333333-3333-4333-8333-333333333333';
const ORIGIN = 'https://media.makwin.art';

describe('withoutWork', () => {
  it('takes a deleted work out of the cover and every list, and nothing else', () => {
    const content = cleanPortfolio({
      info: { headline: 'Pintora', heroWork: GONE },
      sections: [
        { id: 's1', type: 'works', title: 'Obras', items: [{ id: GONE, note: 'a' }, { id: KEPT, note: 'b' }] },
        { id: 's2', type: 'about', title: 'Sobre mí', text: 'Hola' },
      ],
    }, { ownFile: () => true });
    const after = withoutWork(content, GONE);
    expect(after.info.heroWork).toBeNull();
    expect(after.info.headline).toBe('Pintora');
    const works = after.sections.find((section) => section.type === 'works');
    expect(works && 'items' in works ? works.items.map((item) => item.id) : []).toEqual([KEPT]);
    expect(after.sections).toHaveLength(2);
  });

  it('leaves a portfolio that never had it exactly as it was', () => {
    const content = cleanPortfolio({ info: { heroWork: KEPT }, sections: [] }, { ownFile: () => true });
    expect(withoutWork(content, GONE)).toEqual(content);
  });
});

describe('orphanKeys', () => {
  const now = Date.UTC(2026, 10, 21);
  const old = now - ORPHAN_MIN_AGE_MS - 1;
  const files = [
    { key: `${USER}/1.jpg`, modified: old },
    { key: `${USER}/1.sm.jpg`, modified: old },
    { key: `${USER}/portfolio/gone.jpg`, modified: old },
    { key: `${USER}/portfolio/gone.sm.jpg`, modified: old },
    { key: `${USER}/portfolio/new.jpg`, modified: now - 60_000 },
    { key: 'db/2026-11-20.json.gz', modified: old },
    { key: 'anything-else/file.jpg', modified: old },
  ];

  it('removes only old, unused files inside an artist folder, with their light copies', () => {
    expect(orphanKeys(files, [`${USER}/1.jpg`], now)).toEqual([`${USER}/portfolio/gone.jpg`, `${USER}/portfolio/gone.sm.jpg`]);
  });

  it('never touches backups, other folders or anything recent', () => {
    const removed = orphanKeys(files, [], now);
    expect(removed).not.toContain('db/2026-11-20.json.gz');
    expect(removed).not.toContain('anything-else/file.jpg');
    expect(removed).not.toContain(`${USER}/portfolio/new.jpg`);
  });
});

describe('addressesIn', () => {
  it('finds every file address inside a stored portfolio', () => {
    const stored = { info: { heroImage: `${ORIGIN}/${USER}/portfolio/a.jpg` }, sections: [{ files: [{ url: `${ORIGIN}/${USER}/portfolio/b.pdf` }] }] };
    expect(addressesIn(stored, ORIGIN).sort()).toEqual([`${ORIGIN}/${USER}/portfolio/a.jpg`, `${ORIGIN}/${USER}/portfolio/b.pdf`]);
    expect(addressesIn(null, ORIGIN)).toEqual([]);
  });
});
