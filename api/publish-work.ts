import { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

interface PublishedWork {
  submissionId: string;
  artistName: string;
  email: string;
  workType: string;
  title: string;
  description: string;
  language: string;
  timestamp: string;
  fileUrl?: string | null;
  publishedAt: string;
  status: "published";
}

async function publishSubmission(
  submissionId: string
): Promise<{ success: boolean; work?: PublishedWork; error?: string }> {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });

    // Leer desde Redis
    const data = await redis.get(submissionId);
    if (!data) {
      return { success: false, error: "Obra no encontrada" };
    }

    const submissionData = typeof data === "string" ? JSON.parse(data) : data;

    // Crear objeto de obra publicada
    const publishedWork: PublishedWork = {
      ...submissionData,
      publishedAt: new Date().toISOString(),
      status: "published",
    };

    // Actualizar en Redis
    await redis.set(submissionId, JSON.stringify(publishedWork));
    console.log(`[PUBLISH] ✅ Obra publicada: ${submissionId}`);

    return { success: true, work: publishedWork };
  } catch (error: any) {
    console.error("[PUBLISH] ❌ Error:", error.message);
    return { success: false, error: error.message };
  }
}

async function sendPublicationEmail(
  work: PublishedWork
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
    .header { background: #28a745; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .title { font-size: 24px; font-weight: bold; margin: 20px 0; color: #28a745; }
    .cta-button { 
      display: inline-block; 
      background: #28a745; 
      color: #fff; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>🎉 ¡Tu obra está publicada!</h2></div>
    <div class="content">
      <p>¡Hola ${work.artistName}!</p>
      <p class="title">"${work.title}" ha sido aceptada y publicada en Makwin</p>
      <p>Nos complace informarte que tu obra ha sido seleccionada para ser publicada en nuestra plataforma. ¡Felicidades!</p>
      <p><strong>Tipo de obra:</strong> ${work.workType}</p>
      <p><strong>Descripción:</strong> ${work.description}</p>
      ${work.fileUrl ? `<p style="text-align: center;"><a href="${work.fileUrl}" class="cta-button">Ver tu obra publicada</a></p>` : ""}
      <p style="margin-top: 30px; font-size: 12px; color: #999;">
        Gracias por ser parte de Makwin. Puedes compartir este enlace con tus amigos. 🎨
      </p>
    </div>
  </div>
</body>
</html>`;

    const response = await resend.emails.send({
      from: fromAddress,
      to: work.email,
      subject: `[PUBLICADA] Obra "${work.title}" por ${work.artistName}`,
      html: emailHTML,
    });

    if (response.error) {
      console.error("[RESEND] Error en respuesta:", JSON.stringify(response.error, null, 2));
      return false;
    }

    console.log("[RESEND] ✅ Email de publicación enviado:", (response as any)?.id);
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
    const { submissionId } = req.body;

    if (!submissionId) {
      res.status(400).json({ error: "submissionId requerido" });
      return;
    }

    // Publicar la obra
    const publishResult = await publishSubmission(submissionId);

    if (!publishResult.success) {
      res.status(400).json({ error: publishResult.error });
      return;
    }

    // Enviar email al artista
    const emailSent = await sendPublicationEmail(publishResult.work!);

    res.status(200).json({
      success: true,
      message: "Obra publicada exitosamente",
      work: publishResult.work,
      emailSent,
    });
  } catch (error: any) {
    console.error("[API] Error:", error.message);
    res.status(500).json({
      error: "Error al publicar la obra",
      details: error.message,
    });
  }
}
