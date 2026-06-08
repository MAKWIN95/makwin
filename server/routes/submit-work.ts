import { RequestHandler } from "express";
import fs from "fs";
import path from "path";
import { Resend } from "resend";

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
  try {
    const recipientEmail = 'sendtomakwin@gmail.com';
    const resendApiKey = process.env.RESEND_API_KEY;
    
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
    .field { margin-bottom: 10px; }
    .field-label { font-weight: 600; color: #666; }
    .field-value { color: #333; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎨 Nueva obra enviada a Makwin</h2>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">📋 DATOS DEL ARTISTA</div>
        <div class="field">
          <div class="field-label">Nombre:</div>
          <div class="field-value">${escapeHtml(submissionData.artistName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Email:</div>
          <div class="field-value"><a href="mailto:${submissionData.email}">${submissionData.email}</a></div>
        </div>
        <div class="field">
          <div class="field-label">Idioma:</div>
          <div class="field-value">${submissionData.language === 'es' ? 'Español' : 'English'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🎭 DATOS DE LA OBRA</div>
        <div class="field">
          <div class="field-label">Tipo:</div>
          <div class="field-value">${getTipoObra(submissionData.workType)}</div>
        </div>
        <div class="field">
          <div class="field-label">Título:</div>
          <div class="field-value"><strong>${escapeHtml(submissionData.title)}</strong></div>
        </div>
        <div class="field">
          <div class="field-label">Descripción:</div>
          <div class="field-value">${escapeHtml(submissionData.description).replace(/\n/g, '<br>')}</div>
        </div>
      </div>

      <div class="section">
        <div class="field">
          <div class="field-label">ID de Envío:</div>
          <div class="field-value"><code>${submissionId}</code></div>
        </div>
        <div class="field">
          <div class="field-label">Fecha/Hora:</div>
          <div class="field-value">${new Date(submissionData.timestamp).toLocaleString('es-ES')}</div>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Este es un email automatizado de la plataforma Makwin</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Try to send with Resend if API key is configured
    if (resendApiKey && resendApiKey !== 're_test123456789') {
      try {
        const resend = new Resend(resendApiKey);
        const fromAddress = process.env.RESEND_FROM || 'no-reply@makwin.art';
        const response = await resend.emails.send({
          from: fromAddress,
          to: recipientEmail,
          subject: `Nueva obra enviada: ${submissionData.title}`,
          html: emailHTML,
        });

        // Resend may return metadata or throw - log success
        console.log(`   ✅ Email request submitted to Resend (from: ${fromAddress})`);
        if ((response as any)?.id) {
          console.log(`   ✅ Email enviado exitosamente (ID: ${(response as any).id})`);
        }
      } catch (resendError: any) {
        console.error('   ❌ Error de Resend:', resendError);
        if (resendError?.message && resendError.message.includes('domain is not verified')) {
          console.log('   ⚠️  Dominio no verificado en Resend. Verifica tu dominio en https://resend.com/domains.');
        } else if (resendError?.statusCode === 403) {
          console.log('   ⚠️  Error 403 de Resend - revisa la API key y la configuración en https://resend.com');
        }
      }
    } else {
      console.warn('   ⚠️  RESEND_API_KEY no configurada - email en modo simulación');
    }

    return true;
  } catch (error) {
    console.error("Error preparing email:", error);
    // Don't fail the submission if email fails
    return false;
  }
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function getTipoObra(type: string): string {
  const tipos: { [key: string]: string } = {
    pintura: '🎨 Pintura',
    fotografia: '📸 Fotografía',
    poema: '✍️ Poema',
    cancion: '🎵 Canción',
  };
  return tipos[type] || type;
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
