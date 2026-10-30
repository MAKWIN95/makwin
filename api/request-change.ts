import { VercelRequest, VercelResponse } from "@vercel/node";
import { artistsEmail, sendEmail } from "../server/lib/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { artistName, email, submissionId, message } = req.body || {};

    if (!artistName || !email || !submissionId || !message) {
      res.status(400).json({ error: "Campos requeridos faltantes" });
      return;
    }

    const result = await sendEmail({
      to: artistsEmail(),
      replyTo: email,
      subject: `Solicitud de cambio: ${submissionId}`,
      content: {
        language: 'es',
        title: 'Solicitud de cambio en una obra',
        preheader: `${artistName} pide un cambio en ${submissionId}`,
        blocks: [
          { type: 'details', rows: [['Artista', artistName], ['Correo', email], ['Obra', submissionId]] },
          { type: 'quote', text: message },
        ],
      },
    });

    if (!result.ok) {
      res.status(500).json({ error: 'Error sending email' });
      return;
    }

    res.status(200).json({ success: true, message: 'Solicitud enviada' });
  } catch (err: any) {
    console.error('[REQUEST_CHANGE] Exception:', err?.message || err);
    res.status(500).json({ error: 'Server error' });
  }
}
