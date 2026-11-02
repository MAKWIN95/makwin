import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationKind = 'work_held' | 'work_approved' | 'work_rejected' | 'admin_granted' | 'admin_revoked';

// News that waits in the app instead of spending an email. It never throws: what
// it tells about has already happened, and cannot be undone by this failing.
export async function notify(
  supabaseAdmin: SupabaseClient,
  userId: string,
  kind: NotificationKind,
  work?: { id: string | null; title: string },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, kind, work_id: work?.id ?? null, title: work?.title ?? null });
  if (error) console.error('[NOTIFY] Could not save the notification:', kind, error.message);
}
