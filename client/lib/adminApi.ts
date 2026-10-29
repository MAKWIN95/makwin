import { supabase } from '@/lib/supabase';

// The API decides who is an admin (ADMIN_EMAILS); the client only forwards the session.
export async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}
