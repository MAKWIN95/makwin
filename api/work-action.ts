import { VercelRequest, VercelResponse } from "@vercel/node";
import { redis } from "../server/lib/redis";

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

type WorkAction = "publish" | "reject" | "archive" | "delete" | "republish";

async function publishSubmission(
  submissionId: string
): Promise<{ success: boolean; work?: PublishedWork; error?: string; serviceUnavailable?: boolean }> {
  try {
    const data = await redis.get(submissionId);

    if (!data) {
      return { success: false, error: "Obra no encontrada" };
    }

    const submissionData = typeof data === "string" ? JSON.parse(data) : data;
    const publishedWork: PublishedWork = {
      ...submissionData,
      publishedAt: new Date().toISOString(),
      status: "published",
    };

    await redis.set(submissionId, JSON.stringify(publishedWork));
    console.log(`[PUBLISH] ✅ Obra publicada: ${submissionId}`);

    return { success: true, work: publishedWork };
  } catch (error: any) {
    console.error("[PUBLISH] ❌ Error:", error.message);
    return { success: false, error: "Servicio temporalmente no disponible", serviceUnavailable: true };
  }
}

async function sendPublicationEmail(work: PublishedWork): Promise<boolean> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM || "no-reply@makwin.art";

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

async function sendRejectionEmail(
  email: string,
  artistName: string,
  title: string,
  reason?: string
): Promise<boolean> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM || "no-reply@makwin.art";

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
    <div class="header"><h2>Sobre tu obra "${title}"</h2></div>
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { action, submissionId, reason } = req.body || {};

    if (!submissionId) {
      res.status(400).json({ error: "submissionId requerido" });
      return;
    }

    const validActions: WorkAction[] = ["publish", "reject", "archive", "delete", "republish"];
    if (!action || !validActions.includes(action)) {
      res.status(400).json({ error: "Acción no válida" });
      return;
    }

    if (action === "delete") {
      await redis.del(submissionId);
      console.log(`[DELETE] ✅ Obra eliminada: ${submissionId}`);
      res.status(200).json({
        success: true,
        message: "Obra eliminada correctamente",
      });
      return;
    }

    const data = await redis.get(submissionId);
    if (!data) {
      res.status(400).json({ error: "Obra no encontrada" });
      return;
    }

    const submission = typeof data === "string" ? JSON.parse(data) : data;

    if (action === "archive") {
      const archivedWork = {
        ...submission,
        status: "archived",
        archivedAt: new Date().toISOString(),
      };

      await redis.set(submissionId, JSON.stringify(archivedWork));
      console.log(`[ARCHIVE] ✅ Obra archivada: ${submissionId}`);

      res.status(200).json({
        success: true,
        message: "Obra archivada correctamente",
      });
      return;
    }

    if (action === "republish") {
      const republishedWork = {
        ...submission,
        status: "published",
        publishedAt: new Date().toISOString(),
        archivedAt: undefined,
      };

      await redis.set(submissionId, JSON.stringify(republishedWork));
      console.log(`[REPUBLISH] ✅ Obra republicada: ${submissionId}`);

      res.status(200).json({
        success: true,
        message: "Obra republicada correctamente",
        work: republishedWork,
      });
      return;
    }

    if (action === "reject") {
      const rejectedData = {
        ...submission,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || null,
      };

      await redis.set(submissionId, JSON.stringify(rejectedData));
      console.log(`[REJECT] ✅ Obra denegada: ${submissionId}`);

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
      return;
    }

    const publishResult = await publishSubmission(submissionId);
    if (!publishResult.success) {
      res.status(publishResult.serviceUnavailable ? 503 : 400).json({ error: publishResult.error });
      return;
    }

    const emailSent = await sendPublicationEmail(publishResult.work!);
    res.status(200).json({
      success: true,
      message: "Obra publicada exitosamente",
      work: publishResult.work,
      emailSent,
    });
  } catch (error: any) {
    console.error("[WORK_ACTION] Error:", error.message);
    res.status(503).json({ error: "Servicio temporalmente no disponible" });
  }
}
