import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { HelpMessage } from "@shared/api";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

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
