import { createClient } from '@supabase/supabase-js';
import { getAdminEmails } from './admin-auth.js';
import { sendEmail } from './email.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

// Everything happens in the panel. The only email is this one: a nudge when
// the things waiting for a decision reach this number.
export const BACKLOG_ALERT_AT = 5;

export async function countPendingItems(): Promise<number> {
  const [messages, reports, held] = await Promise.all([
    supabaseAdmin.from('help_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabaseAdmin.from('policy_reports').select('id', { count: 'exact', head: true }).eq('reviewed', false),
    supabaseAdmin.from('works').select('id', { count: 'exact', head: true }).contains('policy_flags', ['pending_review']),
  ]);
  const failed = messages.error || reports.error || held.error;
  if (failed) throw failed;
  return (messages.count ?? 0) + (reports.count ?? 0) + (held.count ?? 0);
}

// Fires only when one new item crosses the line, so a long queue sends one email.
export function crossedBacklogLine(pending: number, added = 1): boolean {
  return pending >= BACKLOG_ALERT_AT && pending - added < BACKLOG_ALERT_AT;
}

// Call right after saving a new item. Never throws: the item is already saved.
export async function alertIfBacklogReached(baseUrl: string): Promise<void> {
  try {
    const pending = await countPendingItems();
    if (!crossedBacklogLine(pending)) return;
    await Promise.all(
      getAdminEmails().map((to) =>
        sendEmail({
          to,
          subject: `Tienes ${pending} cosas por revisar en MAKWIN`,
          content: {
            language: 'es',
            title: `Tienes ${pending} cosas por revisar`,
            preheader: 'Entra en el panel de administración y pon orden.',
            blocks: [
              { type: 'text', text: 'Se han acumulado obras retenidas, mensajes de ayuda o reportes que necesitan tu decisión.' },
              ...(baseUrl ? [{ type: 'button' as const, label: 'ABRIR EL PANEL', url: `${baseUrl}/admin` }] : []),
            ],
          },
        }),
      ),
    );
  } catch (error: any) {
    console.error('[BACKLOG] Could not check the pending items:', error?.message || error);
  }
}
