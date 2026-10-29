import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Vercel runs api/ functions as native ESM, which cannot resolve relative
// imports without a file extension (ERR_MODULE_NOT_FOUND at cold start).
const root = path.resolve(__dirname, '..');
const dirs = ['api', 'server/lib', 'shared'];
const relativeImport = /^\s*(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm;

describe('serverless function imports', () => {
  it('use explicit .js extensions for relative modules', () => {
    const missing: string[] = [];
    for (const dir of dirs) {
      for (const file of fs.readdirSync(path.join(root, dir))) {
        if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
        const source = fs.readFileSync(path.join(root, dir, file), 'utf8');
        for (const [, specifier] of source.matchAll(relativeImport)) {
          if (!specifier.endsWith('.js')) missing.push(`${dir}/${file} -> ${specifier}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
