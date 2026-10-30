import { VercelRequest, VercelResponse } from "@vercel/node";
import { redis } from "../server/lib/redis.js";
import { isAdminRequest } from "../server/lib/admin-auth.js";
import { sendEmail } from "../server/lib/email.js";
import type { EmailLanguage } from "../server/lib/email-layout.js";

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

const WORK_TYPE_LABELS: Record<string, { es: string; en: string }> = {
  pintura: { es: 'Pintura', en: 'Painting' },
  fotografia: { es: 'Fotografía', en: 'Photography' },
  poema: { es: 'Poema', en: 'Poem' },
  cancion: { es: 'Canción', en: 'Song' },
  video: { es: 'Vídeo', en: 'Video' },
};

const emailLanguage = (language?: string): EmailLanguage => (language === 'en' ? 'en' : 'es');

async function sendPublicationEmail(work: PublishedWork, language?: string): Promise<boolean> {
  const lang = emailLanguage(language);
  const es = lang === 'es';
  const result = await sendEmail({
    to: work.email,
    subject: es ? `Tu obra «${work.title}» ya está publicada` : `Your work "${work.title}" has been published`,
    content: {
      language: lang,
      title: es ? 'Tu obra ya está publicada' : 'Your work has been published',
      preheader: es ? `«${work.title}» ya está en MAKWIN.` : `"${work.title}" is now on MAKWIN.`,
      blocks: [
        { type: 'text', text: es ? `Hola, ${work.artistName}. Nos alegra contarte que «${work.title}» ya forma parte de MAKWIN.` : `Hello ${work.artistName}. We are happy to tell you that "${work.title}" is now part of MAKWIN.` },
        {
          type: 'details',
          rows: [
            [es ? 'Obra' : 'Work', work.title],
            [es ? 'Tipo' : 'Type', WORK_TYPE_LABELS[work.workType]?.[lang] || work.workType],
          ],
        },
        ...(work.fileUrl ? [{ type: 'button' as const, label: es ? 'VER LA OBRA' : 'VIEW THE WORK', url: work.fileUrl }] : []),
        { type: 'note', text: es ? 'Gracias por compartir tu trabajo con nosotros.' : 'Thank you for sharing your work with us.' },
      ],
    },
  });
  return result.ok;
}

async function sendRejectionEmail(
  email: string,
  artistName: string,
  title: string,
  reason?: string,
  language?: string
): Promise<boolean> {
  const lang = emailLanguage(language);
  const es = lang === 'es';
  const result = await sendEmail({
    to: email,
    subject: es ? `Sobre tu obra «${title}»` : `About your work "${title}"`,
    content: {
      language: lang,
      title: es ? 'Sobre tu obra' : 'About your work',
      preheader: es ? `Hemos revisado «${title}».` : `We have reviewed "${title}".`,
      blocks: [
        { type: 'text', text: es ? `Hola, ${artistName}. Hemos revisado «${title}» y esta vez no vamos a publicarla.` : `Hello ${artistName}. We have reviewed "${title}" and will not be publishing it this time.` },
        ...(reason ? [{ type: 'quote' as const, text: reason }] : []),
        { type: 'text', text: es ? 'Puedes enviarnos otras obras cuando quieras.' : 'You are welcome to send us other works at any time.' },
      ],
    },
  });
  return result.ok;
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
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Authorization, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
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
    if (!(await isAdminRequest(req.headers.authorization))) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

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
        reason,
        submission.language
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

    const emailSent = await sendPublicationEmail(publishResult.work!, submission.language);
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
