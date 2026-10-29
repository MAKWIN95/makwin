import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const relativeImport = /^\s*(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm;

// Every file under api/ becomes a Vercel function; the Hobby plan rejects
// deployments with more than 12, so tests must live outside api/.
const MAX_FUNCTIONS = 12;

describe('serverless functions', () => {
  it('keep api/ within the Vercel function limit and free of test files', () => {
    const files = fs.readdirSync(path.join(root, 'api')).filter((file) => /\.(ts|js|mjs)$/.test(file));
    expect(files.filter((file) => /\.(spec|test)\./.test(file))).toEqual([]);
    expect(files.length).toBeLessThanOrEqual(MAX_FUNCTIONS);
  });

  // Vercel runs api/ functions as native ESM, which cannot resolve relative
  // imports without a file extension (ERR_MODULE_NOT_FOUND at cold start).
  it('use explicit .js extensions for relative modules', () => {
    const missing: string[] = [];
    for (const dir of ['api', 'server/lib', 'shared']) {
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
