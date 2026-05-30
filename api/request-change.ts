import { VercelRequest, VercelResponse } from "@vercel/node";

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

    const { Resend } = await import('resend');
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev';

    if (!resendApiKey) {
      console.error('[REQUEST_CHANGE] Resend key no configurada');
      res.status(500).json({ error: 'Email service not configured' });
      return;
    }

    const resend = new Resend(resendApiKey);

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; color: #111;">
        <h2>Solicitud de modificación / eliminación de obra</h2>
        <p><strong>Artista:</strong> ${artistName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>ID de obra:</strong> ${submissionId}</p>
        <p><strong>Mensaje:</strong></p>
        <div style="white-space:pre-wrap; background:#f7f7f7; padding:12px; border-radius:6px;">${message}</div>
      </div>
    `;

    const response = await resend.emails.send({
      from: fromAddress,
      to: 'sendtomakwin@gmail.com',
      subject: `[SOLICITUD] Cambio/Eliminación - ${submissionId} - ${artistName}`,
      html,
    });

    if ((response as any).error) {
      console.error('[REQUEST_CHANGE] Error sending:', (response as any).error);
      res.status(500).json({ error: 'Error sending email' });
      return;
    }

    res.status(200).json({ success: true, message: 'Solicitud enviada' });
  } catch (err: any) {
    console.error('[REQUEST_CHANGE] Exception:', err?.message || err);
    res.status(500).json({ error: 'Server error' });
  }
}
