import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

export async function getUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
  const normalized = String(username || '').trim().toLowerCase();
  if (!normalized) throw new Error('Username is required.');

  let query = supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', normalized);
  if (excludeUserId) query = query.neq('id', excludeUserId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return !data;
}

export async function getUsernameAvailabilityUserId(accessToken: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user?.id) throw new Error('Invalid authentication token.');
  return data.user.id;
}
