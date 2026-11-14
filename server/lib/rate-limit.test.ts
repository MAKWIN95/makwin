import { afterEach, describe, expect, it } from 'vitest';
import { allow, clientIp, useCounter } from './rate-limit.js';

const limit = { name: 'test', max: 2, seconds: 60 };

function memoryCounter() {
  const counts = new Map<string, number>();
  return {
    incr: async (key: string) => { const n = (counts.get(key) ?? 0) + 1; counts.set(key, n); return n; },
    expire: async () => 1,
  } as any;
}

afterEach(() => useCounter(undefined));

describe('rate limit', () => {
  it('lets the first requests through and stops the next ones, per person', async () => {
    useCounter(memoryCounter());
    expect(await allow(limit, 'a')).toBe(true);
    expect(await allow(limit, 'a')).toBe(true);
    expect(await allow(limit, 'a')).toBe(false);
    expect(await allow(limit, 'b')).toBe(true);
  });

  it('stays open when Redis is missing or failing', async () => {
    useCounter(null);
    expect(await allow(limit, 'a')).toBe(true);
    useCounter({ incr: async () => { throw new Error('down'); }, expire: async () => 1 } as any);
    expect(await allow(limit, 'a')).toBe(true);
  });

  it('reads the address Vercel saw first', () => {
    expect(clientIp({ 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' })).toBe('1.1.1.1');
    expect(clientIp({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' })).toBe('2.2.2.2');
    expect(clientIp({})).toBe('unknown');
  });
});
