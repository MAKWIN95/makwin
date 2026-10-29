import { createClient } from '@supabase/supabase-js';

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

export async function isAdminRequest(authorization: string | string[] | undefined): Promise<boolean> {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  const token = (header || '').replace(/^Bearer\s+/i, '').trim();
  const admins = getAdminEmails();
  if (!token || admins.length === 0) return false;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  return !error && !!email && admins.includes(email);
}
