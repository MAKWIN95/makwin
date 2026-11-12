import { describe, expect, it } from 'vitest';
import { isPhotoPath, smallPathOf, smallUrl } from './small-photo';

const BASE = 'https://example.supabase.co/storage/v1/object/public';

describe('small-photo', () => {
  it('puts the light copy next to the photo', () => {
    expect(smallPathOf('user/1700000000000-0.jpg')).toBe('user/1700000000000-0.sm.jpg');
    expect(smallPathOf('user/covers/1700000000000.png')).toBe('user/covers/1700000000000.sm.jpg');
  });

  it('points published photos at their light copy', () => {
    expect(smallUrl(`${BASE}/works/u/1-0.jpg`)).toBe(`${BASE}/works/u/1-0.sm.jpg`);
    expect(smallUrl(`${BASE}/works/u/1-0.JPEG?t=5`)).toBe(`${BASE}/works/u/1-0.sm.jpg?t=5`);
  });

  it('does the same for photos kept in R2', () => {
    expect(smallUrl('https://media.makwin.art/u/1-0.png')).toBe('https://media.makwin.art/u/1-0.sm.jpg');
    expect(smallUrl('https://media.makwin.art/u/1.mp4')).toBe('https://media.makwin.art/u/1.mp4');
  });

  it('leaves everything else alone', () => {
    expect(smallUrl(`${BASE}/works/u/1-0.sm.jpg`)).toBe(`${BASE}/works/u/1-0.sm.jpg`);
    expect(smallUrl(`${BASE}/works/u/1.mp4`)).toBe(`${BASE}/works/u/1.mp4`);
    expect(smallUrl(`${BASE}/avatars/u/avatar.jpg`)).toBe(`${BASE}/avatars/u/avatar.jpg`);
    expect(smallUrl('https://lh3.googleusercontent.com/a/photo.jpg')).toBe('https://lh3.googleusercontent.com/a/photo.jpg');
    expect(smallUrl(null)).toBeNull();
    expect(smallUrl(undefined)).toBeUndefined();
  });

  it('knows which files are photos', () => {
    expect(isPhotoPath('u/1-0.webp')).toBe(true);
    expect(isPhotoPath('u/1-0.sm.jpg')).toBe(false);
    expect(isPhotoPath('u/1.m4a')).toBe(false);
  });
});
