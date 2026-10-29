import { createClient, type User } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

// Comma-separated list of Supabase Auth emails allowed to moderate submissions.
// With no list configured nobody is an admin (fail closed).
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

export async function isAdminRequest(authorization: string | string[] | undefined): Promise<boolean> {
  const admins = getAdminEmails();
  if (!bearerToken(authorization) || admins.length === 0) return false;

  const email = (await getRequestUser(authorization))?.email?.toLowerCase();
  return !!email && admins.includes(email);
}
