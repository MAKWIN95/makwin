import { RequestHandler } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import type { HelpMessage } from "@shared/api";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

export const handleSaveHelpMessage: RequestHandler = async (req, res, _next) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name, category, subject, message, user_id } = req.body as HelpMessage & { user_id?: string };

    // Validar campos
    if (!email || !name || !category || !subject || !message) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // Validar longitud de campo
    if (subject.length < 5 || subject.length > 100) {
      return res.status(400).json({ error: "El asunto debe tener entre 5 y 100 caracteres" });
    }

    if (message.length < 10 || message.length > 2000) {
      return res.status(400).json({ error: "El mensaje debe tener entre 10 y 2000 caracteres" });
    }

    console.log("[HelpMessage] Guardando mensaje:", { email, name, category, user_id });

    // Guardar en Supabase
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
      return res.status(500).json({
        error: "No se pudo guardar el mensaje. Intenta más tarde.",
      });
    }

    console.log("[HelpMessage] ✓ Mensaje guardado exitosamente:", data?.id);

    return res.status(200).json({
      success: true,
      message: "Mensaje guardado exitosamente",
      id: data?.id,
    });
  } catch (error) {
    console.error("[API Error]", error);
    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
};

// Vercel serverless function export
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleSaveHelpMessage(req as any, res as any, () => {});
}
