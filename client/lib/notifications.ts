import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  kind: 'work_held' | 'work_approved' | 'work_rejected' | 'admin_granted' | 'admin_revoked' | 'new_follower' | 'work_liked' | 'work_milestone';
  work_id: string | null;
  title: string | null;
  read_at: string | null;
  created_at: string;
  amount?: number | null;
  actor: { username: string; display_name: string | null } | null;
  work: { title: string; work_type: string; cover_url: string | null; file_url: string | null } | null;
}

const CHECK_EVERY_MS = 2 * 60 * 1000;
const NOT_AGAIN_WITHIN_MS = 30 * 1000;

// One count for the whole app, however many headers are alive.
let unread = 0;
let forUser: string | null = null;
let timesAsked = 0;
let askedAt = 0;
const listeners = new Set<() => void>();

function setUnread(count: number) {
  if (count === unread) return;
  unread = count;
  listeners.forEach((listener) => listener());
}

export async function refreshUnread(userId: string | null) {
  forUser = userId;
  const asked = ++timesAsked;
  askedAt = Date.now();
  if (!userId) {
    setUnread(0);
    return;
  }
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (!error && asked === timesAsked) setUnread(count ?? 0);
}

export async function loadNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(username, display_name), work:works!notifications_work_id_fkey(title, work_type, cover_url, file_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as AppNotification[];
}

export async function markAllRead(userId: string) {
  setUnread(0);
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) console.error('[Notifications] Could not mark as read:', error.message);
}

// Going from page to page is also a good moment to look, without asking every time.
export function useUnreadNotifications(userId: string | null | undefined, page: string): number {
  const id = userId ?? null;

  useEffect(() => {
    if (id && forUser === id && Date.now() - askedAt > NOT_AGAIN_WITHIN_MS) void refreshUnread(id);
  }, [id, page]);

  useEffect(() => {
    if (forUser !== id) void refreshUnread(id);
    if (!id) return;
    const check = () => {
      if (document.visibilityState === 'visible') void refreshUnread(id);
    };
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [id]);

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => unread,
  );
}
