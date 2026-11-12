import { describe, expect, it } from 'vitest';
import { keyOf, presign, publicUrlOf, r2Config, signedUpload } from './r2.js';

const config = {
  accountId: 'acc',
  accessKeyId: 'AK',
  secretAccessKey: 'SK',
  bucket: 'makwin-works',
  publicUrl: 'https://media.makwin.art',
};

describe('R2 storage', () => {
  it('signs exactly like the published AWS example', () => {
    const url = presign({
      method: 'GET',
      host: 'examplebucket.s3.amazonaws.com',
      path: '/test.txt',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1',
      expires: 86400,
      now: new Date('2013-05-24T00:00:00Z'),
    });
    expect(url).toContain('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
  });

  it('is off until every setting is there', () => {
    expect(r2Config({})).toBeNull();
    expect(r2Config({ R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b', R2_SECRET_ACCESS_KEY: 'c', R2_BUCKET: 'd' })).toBeNull();
    expect(r2Config({ R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b', R2_SECRET_ACCESS_KEY: 'c', R2_BUCKET: 'd', R2_PUBLIC_URL: 'https://m.x/' })?.publicUrl).toBe('https://m.x');
  });

  it('binds an upload to its size and type', () => {
    const url = new URL(signedUpload(config, 'u1/123-0.jpg', 'image/jpeg', 1000));
    expect(url.host).toBe('acc.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/makwin-works/u1/123-0.jpg');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('cache-control;content-length;content-type;host');
  });

  it('knows its own addresses and no others', () => {
    const url = publicUrlOf(config, 'u1/covers/a b.jpg');
    expect(url).toBe('https://media.makwin.art/u1/covers/a%20b.jpg');
    expect(keyOf(config, url)).toBe('u1/covers/a b.jpg');
    expect(keyOf(config, 'https://evil.example/u1/a.jpg')).toBeNull();
    expect(keyOf(null, url)).toBeNull();
  });
});
