import { supabase } from './supabase';
import { CACHE_FOR_A_YEAR, smallCopyFor } from './small-photo';
import { smallPathOf } from '@shared/photo-paths';

// Where a work's file goes up. When Cloudflare R2 is set up the phone asks our server
// for a one-use permission and sends the file (and a photo's light copy) straight
// there; otherwise it goes to Supabase as it always has. Either way the caller gets
// back the address to publish.

interface SignedUpload {
  path: string;
  url: string;
  headers: Record<string, string>;
  publicUrl: string;
}

type Permission = { storage: 'supabase' } | { storage: 'r2'; uploads: SignedUpload[] };

async function askPermission(files: Array<{ path: string; file: Blob }>): Promise<Permission> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch('/api/publish-work?action=upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ files: files.map(({ path, file }) => ({ path, type: file.type || 'application/octet-stream', size: file.size })) }),
  });
  if (!response.ok) throw new Error(`upload permission ${response.status}`);
  return response.json();
}

async function put(upload: SignedUpload, file: Blob): Promise<void> {
  const response = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: file });
  if (!response.ok) throw new Error(`upload ${response.status}`);
}

async function toSupabase(file: Blob, path: string, small: Blob | null): Promise<string> {
  const works = supabase.storage.from('works');
  const [{ error }] = await Promise.all([
    works.upload(path, file, { upsert: true, cacheControl: CACHE_FOR_A_YEAR }),
    small
      ? works.upload(smallPathOf(path), small, { upsert: true, cacheControl: CACHE_FOR_A_YEAR, contentType: small.type || 'image/jpeg' })
        .then(({ error: smallError }) => smallError && console.warn('[work-storage] The light copy did not go up:', smallError.message))
      : undefined,
  ]);
  if (error) throw new Error(error.message);
  return supabase.storage.from('works').getPublicUrl(path).data.publicUrl;
}

/** Sends one file of a work and returns where it can be seen. */
export async function uploadWorkFile(file: File, path: string): Promise<string> {
  const small = await smallCopyFor(file, path);
  const files = [{ path, file }, ...(small ? [{ path: smallPathOf(path), file: small }] : [])];
  // If our server cannot be asked, the file still goes up, to Supabase.
  const permission = await askPermission(files).catch((err): Permission => {
    console.warn('[work-storage] No upload permission, using Supabase:', err);
    return { storage: 'supabase' };
  });
  if (permission.storage !== 'r2') return toSupabase(file, path, small);

  const [main, light] = permission.uploads;
  await Promise.all([
    put(main, file),
    // The light copy never stops a publish: without it the feed shows the full photo.
    light && small ? put(light, small).catch((err) => console.warn('[work-storage] The light copy did not go up:', err)) : undefined,
  ]);
  return main.publicUrl;
}
