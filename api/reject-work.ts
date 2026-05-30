import { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

async function sendRejectionEmail(
  email: string,
  artistName: string,
  title: string,
  reason?: string
): Promise<boolean> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.error("[RESEND] API Key no configurada");
      return false;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .title { font-size: 18px; font-weight: bold; margin: 15px 0; }
    .reason { background: #fff; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>Sobre tu obra "` + title + `"</h2></div>
    <div class="content">
      <p>¡Hola ${artistName}!</p>
      <p>Lamentablemente, tu obra <strong>"${title}"</strong> no ha sido aceptada para publicación en esta ocasión.</p>
      ${reason ? `<div class="reason"><p><strong>Motivo:</strong></p><p>${reason}</p></div>` : ""}
      <p>No te desanimes, cada obra tiene su valor. Puedes intentar enviar otras obras en el futuro.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #999;">
        Gracias por tu interés en Makwin. 🎨
      </p>
    </div>
  </div>
</body>
</html>`;

    const response = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `[DENEGADA] Obra "${title}" por ${artistName}`,
      html: emailHTML,
    });

    if (response.error) {
      console.error("[RESEND] Error en respuesta:", JSON.stringify(response.error, null, 2));
      return false;
    }

    console.log("[RESEND] ✅ Email de rechazo enviado:", (response as any)?.id);
    return true;
  } catch (error: any) {
    console.error("[RESEND] Error enviando email:", error.message);
    return false;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    const { submissionId, reason } = req.body || {};

    if (!submissionId) {
      res.status(400).json({ error: "submissionId requerido" });
      return;
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });

    // Leer desde Redis
    const data = await redis.get(submissionId);
    if (!data) {
      res.status(400).json({ error: "Obra no encontrada" });
      return;
    }

    const submission = typeof data === "string" ? JSON.parse(data) : data;

    // Actualizar con status rejected
    const rejectedData = {
      ...submission,
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || null,
    };

    // Guardar cambios en Redis
    await redis.set(submissionId, JSON.stringify(rejectedData));
    console.log(`[REJECT] ✅ Obra denegada: ${submissionId}`);

    // Enviar email al artista
    const emailSent = await sendRejectionEmail(
      submission.email,
      submission.artistName,
      submission.title,
      reason
    );

    res.status(200).json({
      success: true,
      message: "Obra denegada correctamente",
      emailSent,
    });
  } catch (error: any) {
    console.error("[REJECT] Error:", error.message);
    res.status(500).json({
      error: "Error al denegar la obra",
      details: error.message,
    });
  }
}
