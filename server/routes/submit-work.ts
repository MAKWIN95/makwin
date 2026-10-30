import { RequestHandler } from "express";
import fs from "fs";
import path from "path";
import { artistsEmail, sendEmail } from "../lib/email";

interface SubmissionData {
  artistName: string;
  email: string;
  workType: string;
  title: string;
  description: string;
  language: string;
  fileUrl?: string | null;
  coverImageUrl?: string | null;
  hashtags?: string[];
  lyrics?: string | null;
  isForSale?: boolean;
  price?: number | null;
  status?: string;
  timestamp: string;
}

function getSubmissionsDir() {
  return path.join(process.cwd(), "submissions");
}

function ensureSubmissionsDir() {
  const dir = getSubmissionsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateSubmissionId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${year}-obra-${random}`;
}

async function sendEmailNotification(submissionData: SubmissionData, submissionId: string) {
  const result = await sendEmail({
    to: artistsEmail(),
    replyTo: submissionData.email,
    subject: `Nueva obra enviada: ${submissionData.title}`,
    content: {
      language: 'es',
      title: 'Nueva obra enviada',
      preheader: `${submissionData.artistName} ha enviado «${submissionData.title}».`,
      blocks: [
        {
          type: 'details',
          rows: [
            ['Obra', submissionData.title],
            ['Artista', submissionData.artistName],
            ['Correo', submissionData.email],
            ['Referencia', submissionId],
          ],
        },
        { type: 'quote', text: submissionData.description },
      ],
    },
  });
  return result.ok;
}

export const handleSubmitWork: RequestHandler = async (req, res) => {
  try {
    ensureSubmissionsDir();

    const { artistName, email, workType, title, description, language, fileUrl, coverImageUrl, hashtags, lyrics, isForSale, price } = req.body;

    // Validate required fields
    if (
      !artistName ||
      !email ||
      !workType ||
      !title ||
      !description ||
      !language
    ) {
      res.status(400).json({ error: "Faltan campos requeridos" });
      return;
    }

    // Create submission data (extend with marketplace fields)
    const submissionData: SubmissionData = {
      artistName,
      email,
      workType,
      title,
      description,
      language,
      fileUrl: fileUrl || null,
      coverImageUrl: coverImageUrl || null,
      hashtags: Array.isArray(hashtags) ? hashtags : (typeof hashtags === 'string' ? [hashtags] : []),
      lyrics: lyrics || null,
      isForSale: !!isForSale,
      price: typeof price === 'number' ? price : (price ? Number(price) : null),
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    // Generate submission ID and file path
    const submissionId = generateSubmissionId();
    const submissionsDir = getSubmissionsDir();
    const filePath = path.join(submissionsDir, `${submissionId}.json`);

    // Save JSON file
    fs.writeFileSync(filePath, JSON.stringify(submissionData, null, 2));

    // Send email notification (non-blocking)
    sendEmailNotification(submissionData, submissionId).catch(err => {
      console.error("Fallo al enviar email:", err);
    });

    console.log(`✅ Obra guardada: ${submissionId} de ${artistName}`);

    res.json({
      success: true,
      submissionId,
      message: "Obra enviada exitosamente",
    });
  } catch (error) {
    console.error("Error procesando envío:", error);
    res
      .status(500)
      .json({ error: "Error al procesar el envío. Por favor intenta de nuevo." });
  }
};
