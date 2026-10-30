import { createClient, type User } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

export type AdminRole = 'owner' | 'admin';

// How recent the sign-in must be to change who is an admin: a session left
// open or stolen days ago can use the panel, but not hand out access.
const RECENT_SIGN_IN_MS = 12 * 60 * 60 * 1000;

// Comma-separated list of Supabase Auth emails that own the panel.
// With no list configured nobody is an owner (fail closed).
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function bearerToken(authorization: string | string[] | undefined): string {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  return (header || '').replace(/^Bearer\s+/i, '').trim();
}

// Resolves the Supabase user behind an Authorization header, or null.
export async function getRequestUser(authorization: string | string[] | undefined): Promise<User | null> {
  const token = bearerToken(authorization);
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data?.user ?? null;
}

// Owners come from the server configuration. Other admins are marked in
// app_metadata, which only the service role can write; user_metadata is
// editable by the user and must never decide access.
export function roleOf(user: User | null): AdminRole | null {
  if (!user || !user.email_confirmed_at) return null;
  if (user.email && getAdminEmails().includes(user.email.toLowerCase())) return 'owner';
  return user.app_metadata?.makwin_admin === true ? 'admin' : null;
}

export async function getAdminRole(authorization: string | string[] | undefined): Promise<AdminRole | null> {
  return roleOf(await getRequestUser(authorization));
}

export async function isAdminRequest(authorization: string | string[] | undefined): Promise<boolean> {
  return (await getAdminRole(authorization)) !== null;
}

export function signedInRecently(user: User, now = Date.now()): boolean {
  const at = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  return now - at < RECENT_SIGN_IN_MS;
}
