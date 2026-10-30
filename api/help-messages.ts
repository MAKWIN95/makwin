import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAdminRequest } from '../server/lib/admin-auth.js';
import { HELP_ADDRESS, HELP_SENDER, sendEmail } from '../server/lib/email.js';

// help_messages has no SELECT/UPDATE/DELETE RLS policies (they contain
// user emails), so the admin panel manages them through this endpoint.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

const STATUSES = ['new', 'read', 'resolved'];
const MAX_REPLY_LENGTH = 5000;

async function replyLanguage(userId: string | null): Promise<'es' | 'en'> {
  if (!userId) return 'es';
  const { data } = await supabaseAdmin.from('profiles').select('language_preference').eq('id', userId).maybeSingle();
  return data?.language_preference === 'en' ? 'en' : 'es';
}

async function replyToMessage(req: VercelRequest, res: VercelResponse) {
  const { id, reply } = (req.body || {}) as { id?: string; reply?: string };
  const text = String(reply ?? '').trim();
  if (!id || !text || text.length > MAX_REPLY_LENGTH) return res.status(400).json({ error: 'Datos no válidos' });

  const { data: message, error } = await supabaseAdmin
    .from('help_messages')
    .select('email, name, subject, message, user_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!message) return res.status(404).json({ error: 'Mensaje no encontrado' });

  const language = await replyLanguage(message.user_id);
  const es = language === 'es';
  const sent = await sendEmail({
    to: message.email,
    from: HELP_SENDER,
    replyTo: HELP_ADDRESS,
    // The panel does not keep replies yet: the help inbox receives a copy.
    bcc: HELP_ADDRESS,
    subject: `Re: ${message.subject}`,
    content: {
      language,
      personal: true,
      title: es ? 'Respuesta a tu mensaje' : 'A reply to your message',
      preheader: text.slice(0, 120),
      blocks: [
        { type: 'text', text: es ? `Hola, ${message.name}:` : `Hi ${message.name},` },
        { type: 'text', text },
        { type: 'note', text: es ? 'Tu mensaje:' : 'Your message:' },
        { type: 'quote', text: message.message },
      ],
    },
  });
  if (!sent.ok) return res.status(502).json({ error: 'No se pudo enviar el correo' });

  const { error: updateError } = await supabaseAdmin
    .from('help_messages')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (updateError) console.error('[HELP-MESSAGES] Reply sent but status not updated:', updateError.message);
  return res.status(200).json({ success: true, status: 'resolved' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!(await isAdminRequest(req.headers.authorization))) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('help_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ messages: data || [] });
    }

    if (req.method === 'POST') return await replyToMessage(req, res);

    const { id, status } = (req.body || {}) as { id?: string; status?: string };
    if (!id) return res.status(400).json({ error: 'id requerido' });

    if (req.method === 'PATCH') {
      if (!STATUSES.includes(status || '')) return res.status(400).json({ error: 'Estado inválido' });
      const { error } = await supabaseAdmin
        .from('help_messages')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabaseAdmin.from('help_messages').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[HELP-MESSAGES] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
