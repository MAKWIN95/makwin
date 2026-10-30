import { VercelRequest, VercelResponse } from "@vercel/node";
import { redis } from "../server/lib/redis.js";
import { artistsEmail, sendEmail } from "../server/lib/email.js";
import type { EmailLanguage } from "../server/lib/email-layout.js";

function generateSubmissionId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000);
  return `${year}-obra-${random}`;
}

const WORK_TYPE_LABELS: Record<string, { es: string; en: string }> = {
  pintura: { es: 'Pintura', en: 'Painting' },
  fotografia: { es: 'Fotografía', en: 'Photography' },
  poema: { es: 'Poema', en: 'Poem' },
  cancion: { es: 'Canción', en: 'Song' },
  video: { es: 'Vídeo', en: 'Video' },
};

interface SubmissionEmail {
  artistName: string;
  email: string;
  title: string;
  description: string;
  workType: string;
  submissionId: string;
  fileUrl?: string | null;
  language?: string;
}

function sendArtistConfirmation(work: SubmissionEmail) {
  const lang: EmailLanguage = work.language === 'en' ? 'en' : 'es';
  const es = lang === 'es';
  return sendEmail({
    to: work.email,
    subject: es ? `Hemos recibido tu obra «${work.title}»` : `We have received your work "${work.title}"`,
    content: {
      language: lang,
      title: es ? 'Hemos recibido tu obra' : 'We have received your work',
      preheader: es ? 'La revisaremos y te contaremos el resultado.' : 'We will review it and let you know the outcome.',
      blocks: [
        { type: 'text', text: es ? `Hola, ${work.artistName}. Gracias por enviarnos «${work.title}». La revisaremos y te escribiremos con el resultado.` : `Hello ${work.artistName}. Thank you for sending us "${work.title}". We will review it and write back with the outcome.` },
        {
          type: 'details',
          rows: [
            [es ? 'Obra' : 'Work', work.title],
            [es ? 'Tipo' : 'Type', WORK_TYPE_LABELS[work.workType]?.[lang] || work.workType],
            [es ? 'Referencia' : 'Reference', work.submissionId],
          ],
        },
      ],
    },
  });
}

function sendTeamNotification(work: SubmissionEmail) {
  return sendEmail({
    to: artistsEmail(),
    replyTo: work.email,
    subject: `Nueva obra enviada: ${work.title}`,
    content: {
      language: 'es',
      title: 'Nueva obra enviada',
      preheader: `${work.artistName} ha enviado «${work.title}».`,
      blocks: [
        {
          type: 'details',
          rows: [
            ['Obra', work.title],
            ['Tipo', WORK_TYPE_LABELS[work.workType]?.es || work.workType],
            ['Artista', work.artistName],
            ['Correo', work.email],
            ['Referencia', work.submissionId],
          ],
        },
        { type: 'quote', text: work.description },
        ...(work.fileUrl ? [{ type: 'button' as const, label: 'VER ARCHIVO', url: work.fileUrl }] : []),
      ],
    },
  });
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
    const { artistName, email, workType, title, description, language, fileUrl, coverImageUrl, hashtags } =
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
      hashtags: Array.isArray(hashtags) ? hashtags : (typeof hashtags === 'string' && hashtags ? hashtags.split(',').map((h: string) => h.trim()) : []),
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    // Guardar en Upstash Redis (persistencia real)
    try {
      await redis.set(submissionId, JSON.stringify(submission));
      console.log(`[SUBMIT] ✅ Envío guardado en Upstash: ${submissionId}`);
    } catch (e: any) {
      console.error('[SUBMIT] Error al guardar en Upstash:', e?.name || 'Redis error');
      return res.status(503).json({ error: 'No se pudo guardar el envío. Inténtalo de nuevo.' });
    }

    const emailData = { artistName, email, title, description, workType, submissionId, fileUrl, language };
    await sendArtistConfirmation(emailData);
    await sendTeamNotification(emailData);

    // Responder con información útil
    res.status(200).json({
      success: true,
      message: "Obra enviada correctamente",
      submissionId,
    });
  } catch (error: any) {
    console.error("[API] Error:", error.message);
    res.status(500).json({ error: "No se pudo procesar el envío" });
  }
}

