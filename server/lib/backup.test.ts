import { describe, expect, it } from 'vitest';
import { backupKey, expiredKeys } from './backup.js';

describe('daily backup', () => {
  it('names each copy after its day', () => {
    expect(backupKey(new Date('2026-11-12T03:10:00Z'))).toBe('db/2026-11-12.json.gz');
  });

  it('only removes copies older than the time kept', () => {
    const now = new Date('2026-12-15T04:00:00Z');
    const keys = ['db/2026-11-14.json.gz', 'db/2026-11-15.json.gz', 'db/2026-12-14.json.gz', 'db/notes.txt'];
    expect(expiredKeys(keys, now, 30)).toEqual(['db/2026-11-14.json.gz']);
  });
});
