import { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

function generateSubmissionId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000);
  return `${year}-obra-${random}`;
}

async function sendEmailWithResend(
  toEmail: string,
  artistName: string,
  title: string,
  submissionId: string,
  description: string,
  fileUrl?: string,
  isConfirmation: boolean = false,
  workType?: string
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

    let emailHTML: string;
    let subject: string;

    if (isConfirmation) {
      // Email al artista
      subject = `✓ Obra recibida: ${title}`;
      emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .title { font-size: 20px; font-weight: bold; margin: 15px 0; }
    .cta-button { 
      display: inline-block; 
      background: #000; 
      color: #fff; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>✓ Confirmación de envío</h2></div>
    <div class="content">
      <p>¡Hola ${artistName}!</p>
      <p>Tu obra <strong>"${title}"</strong> ha sido recibida correctamente por el equipo de Makwin.</p>
      <p>La revisaremos y te notificaremos en el plazo de <strong>5-7 días hábiles</strong> si ha sido aceptada o denegada.</p>
      <p>ID de envío: <code>${submissionId}</code></p>
      ${fileUrl ? `<p><a href="${fileUrl}" class="cta-button">Ver tu archivo</a></p>` : ""}
      <p style="margin-top: 30px; font-size: 12px; color: #999;">
        Gracias por confiar en Makwin. 🎨
      </p>
    </div>
  </div>
</body>
</html>`;
    } else {
      // Email al admin
      subject = `[NUEVA OBRA] ${title} - ${workType} - ${artistName}`;
      emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #000 0%, #333 100%); color: #fff; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h2 { margin: 0; font-size: 24px; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
    .info-group { margin: 20px 0; padding: 15px; background: #f8f8f8; border-left: 4px solid #000; border-radius: 4px; }
    .info-label { font-weight: bold; color: #000; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 16px; color: #333; margin-top: 5px; word-break: break-word; }
    .file-link { color: #000; text-decoration: none; padding: 10px 15px; background: #f0f0f0; border-radius: 4px; display: inline-block; margin-top: 5px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
    .submission-id { background: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎨 Nueva Obra Recibida</h2>
    </div>
    <div class="content">
      <div class="info-group">
        <div class="info-label">Artista</div>
        <div class="info-value">${artistName}</div>
      </div>
      
      <div class="info-group">
        <div class="info-label">Email del Artista</div>
        <div class="info-value">${toEmail}</div>
      </div>
      
      <div class="info-group">
        <div class="info-label">Tipo de Obra</div>
        <div class="info-value">${workType}</div>
      </div>
      
      <div class="info-group">
        <div class="info-label">Título</div>
        <div class="info-value"><strong>${title}</strong></div>
      </div>
      
      <div class="info-group">
        <div class="info-label">Descripción</div>
        <div class="info-value">${description}</div>
      </div>
      
      ${fileUrl ? `
      <div class="info-group">
        <div class="info-label">Archivo</div>
        <div class="info-value"><a href="${fileUrl}" class="file-link">Ver Archivo →</a></div>
      </div>
      ` : ''}
      
      <div class="info-group">
        <div class="info-label">ID de Envío</div>
        <div class="submission-id">${submissionId}</div>
      </div>
      
      <div class="footer">
        <p>Fecha de envío: ${new Date().toLocaleString('es-ES')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
    }

    const response = await resend.emails.send({
      from: fromAddress,
      to: toEmail,
      subject,
      html: emailHTML,
    });

    if (response.error) {
      console.error("[RESEND] Error en respuesta:", JSON.stringify(response.error, null, 2));
      return false;
    }

    console.log("[RESEND] ✅ Email ${isConfirmation ? 'de confirmación' : 'de admin'} enviado:", (response as any)?.id);
    return true;
  } catch (error: any) {
    console.error("[RESEND] ❌ Excepción:", {
      message: error?.message,
      status: error?.status,
      response: error?.response,
    });
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
    const { artistName, email, workType, title, description, language, fileUrl, coverImageUrl } =
      req.body;

    // Validación
    if (!artistName || !email || !workType || !title || !description) {
      res.status(400).json({ error: "Campos requeridos faltantes" });
      return;
    }

    // Generar ID único
    const submissionId = generateSubmissionId();

    // Crear objeto de envío
    const submission = {
      submissionId,
      artistName,
      email,
      workType,
      title,
      description,
      language,
      fileUrl: fileUrl || null,
      coverImageUrl: coverImageUrl || null,
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    // Guardar en Upstash Redis (persistencia real)
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL || "",
        token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
      });

      await redis.set(submissionId, JSON.stringify(submission));
      console.log(`[SUBMIT] ✅ Envío guardado en Upstash: ${submissionId}`);
    } catch (e: any) {
      console.error('[SUBMIT] ⚠️ Error al guardar en Upstash:', e?.message || e);
    }

    // Enviar email de confirmación al artista
    await sendEmailWithResend(email, artistName, title, submissionId, description, fileUrl, true, workType);
    
    // Enviar email de notificación al admin
    await sendEmailWithResend("sendtomakwin@gmail.com", artistName, title, submissionId, description, fileUrl, false, workType);

    // Responder con información útil
    res.status(200).json({
      success: true,
      message: "Obra enviada correctamente",
      submissionId,
    });
  } catch (error: any) {
    console.error("[API] Error:", error.message);
    res.status(500).json({
      error: "Error al enviar la obra",
      details: error.message,
    });
  }
}

