import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { HelpMessage } from "@shared/api";
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

function escapeHtml(text: string) {
  if (!text) return '';
  return String(text).replace(/[&<>"]+/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return m;
    }
  });
}

async function saveHelpMessage(
  email: string,
  name: string,
  category: string,
  subject: string,
  message: string,
  user_id?: string | null
) {
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Email inválido", status: 400 };
  }

  // Validar longitud de campo
  if (subject.length < 5 || subject.length > 100) {
    return { error: "El asunto debe tener entre 5 y 100 caracteres", status: 400 };
  }

  if (message.length < 10 || message.length > 2000) {
    return { error: "El mensaje debe tener entre 10 y 2000 caracteres", status: 400 };
  }

  console.log("[HelpMessage] Guardando mensaje:", { email, name, category, user_id });

  const { data, error } = await supabase
    .from("help_messages")
    .insert({
      email,
      name,
      category,
      subject,
      message,
      user_id: user_id || null,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[HelpMessage] Error guardando en Supabase:", error);
    return { error: "No se pudo guardar el mensaje. Intenta más tarde.", status: 500 };
  }

  console.log("[HelpMessage] ✓ Mensaje guardado exitosamente:", data?.id);
  // Prepare and send notification email to HELP_EMAIL or default recipient
  (async () => {
    try {
      // Route recipient based on category
      const categoryLower = (category || '').toLowerCase();
      const helpTo = process.env.HELP_EMAIL || 'help@makwin.art';
      const artistsTo = process.env.ARTISTS_EMAIL || 'artists@makwin.art';
      const recipient =
        categoryLower.includes('report') ||
        categoryLower.includes('bug') ||
        categoryLower.includes('problema') ||
        categoryLower.includes('cuenta') ||
        categoryLower.includes('help') ||
        categoryLower.includes('soporte') ||
        categoryLower.includes('support')
          ? helpTo
          : artistsTo;

      const from = process.env.RESEND_FROM || 'no-reply@makwin.art';

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;color:#111;">
          <h2>Nueva solicitud de ayuda / contacto</h2>
          <p><strong>Categoria:</strong> ${escapeHtml(category)}</p>
          <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
          <p><strong>Usuario ID:</strong> ${escapeHtml(user_id || 'N/A')}</p>
          <p><strong>Asunto:</strong> ${escapeHtml(subject)}</p>
          <div style="margin-top:12px;white-space:pre-wrap;">${escapeHtml(message)}</div>
          <hr/>
          <p style="font-size:12px;color:#666">Mensaje guardado en la base de datos. ID: ${escapeHtml(String(data?.id))}</p>
        </div>
      `;

      if (!process.env.RESEND_API_KEY) {
        console.error('[HelpMessage] RESEND_API_KEY no configurada. No se puede enviar notificación.');
      } else {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const fromAddr = process.env.RESEND_FROM || from;
          await resend.emails.send({
            from: fromAddr,
            to: recipient,
            subject: `[Makwin] Nuevo mensaje: ${subject}`,
            html,
          });
        } catch (resErr: any) {
          console.error('[HelpMessage] Error enviando email via Resend:', resErr?.message || resErr);
        }
      }
    } catch (err) {
      console.error('[HelpMessage] Error preparador de email:', err);
    }
  })();

  return { success: true, id: data?.id, status: 200 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name, category, subject, message, user_id } = req.body as HelpMessage & { user_id?: string };

    // Validar campos
    if (!email || !name || !category || !subject || !message) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const result = await saveHelpMessage(email, name, category, subject, message, user_id);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      message: "Mensaje guardado exitosamente",
      id: result.id,
    });
  } catch (error) {
    console.error("[API Error]", error);
    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}

export { saveHelpMessage };
