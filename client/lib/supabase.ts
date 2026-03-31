import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env variables.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    storageKey: 'sb-token',
  }
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  is_verified: boolean;
  is_banned: boolean;
  created_at: string;
}

export interface Work {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  work_type: string;
  file_url: string | null;
  cover_url: string | null;
  lyrics: string | null;
  hashtags: string[];
  is_for_sale: boolean;
  price: number | null;
  status: 'published' | 'removed_policy' | 'removed_user';
  like_count: number;
  view_count: number;
  language: string;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: Profile;
  liked_by_me?: boolean;
  saved_by_me?: boolean;
}

export interface Like {
  user_id: string;
  work_id: string;
  created_at: string;
}

export interface Save {
  user_id: string;
  work_id: string;
  created_at: string;
}
