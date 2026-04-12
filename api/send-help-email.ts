import type { VercelRequest, VercelResponse } from "@vercel/node";

// Este archivo se mantiene por compatibilidad pero ya no se usa
// El sistema de ayuda ahora se guarda en Supabase (save-help-message.ts)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    error: "Este endpoint ya no se usa. Los mensajes de ayuda se guardan en Supabase.",
  });
}
