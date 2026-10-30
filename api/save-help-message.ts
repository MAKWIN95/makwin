import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { HelpMessage } from "@shared/api";
import { getRequestUser } from "../server/lib/admin-auth.js";
import { alertIfBacklogReached } from "../server/lib/admin-backlog.js";
import { requestBaseUrl } from "../server/lib/email.js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function saveHelpMessage(
  email: string,
  name: string,
  category: string,
  subject: string,
  message: string,
  user_id?: string | null,
  baseUrl = ""
) {
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Email inválido", code: "invalid_email", status: 400 };
  }

  // Validar longitud de campo
  if (name.length > 100 || category.length > 50) {
    return { error: "Nombre o categoría demasiado largos", code: "invalid_name", status: 400 };
  }

  if (subject.length < 5 || subject.length > 100) {
    return { error: "El asunto debe tener entre 5 y 100 caracteres", code: "invalid_subject", status: 400 };
  }

  if (message.length < 10 || message.length > 2000) {
    return { error: "El mensaje debe tener entre 10 y 2000 caracteres", code: "invalid_message", status: 400 };
  }

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
    return { error: "No se pudo guardar el mensaje. Intenta más tarde.", code: "save_failed", status: 500 };
  }

  // Awaited: serverless functions may be frozen as soon as the response is sent.
  await alertIfBacklogReached(baseUrl);

  return { success: true, id: data?.id, status: 200 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name, category, subject, message, website } = req.body as HelpMessage & { website?: string };

    // Bots fill the hidden field; answer as usual so they do not adapt.
    if (website) {
      return res.status(200).json({ success: true, message: "Mensaje guardado exitosamente" });
    }

    // Validar campos
    if (!email || !name || !category || !subject || !message) {
      return res.status(400).json({ error: "Faltan campos requeridos", code: "missing_fields" });
    }

    // Link the message to an account only from a verified session, never from the body.
    const user = await getRequestUser(req.headers.authorization);
    const result = await saveHelpMessage(email, name, category, subject, message, user?.id ?? null, requestBaseUrl(req.headers));

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error, code: result.code });
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
