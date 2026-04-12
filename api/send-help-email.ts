import sgMail from "@sendgrid/mail";
import { RequestHandler } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";

async function sendHelpEmailWithSendGrid(
  userEmail: string,
  userName: string,
  subject: string,
  message: string,
  category: string
): Promise<boolean> {
  try {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;
    const helpEmail = process.env.HELP_EMAIL || "makwin.help@gmail.com";

    console.log("[SendGrid Debug] Starting email send process");
    console.log("[SendGrid Debug] Has API Key:", !!sendgridApiKey);
    console.log("[SendGrid Debug] From Email:", sendgridFromEmail);
    console.log("[SendGrid Debug] Help Email:", helpEmail);
    console.log("[SendGrid Debug] User Email:", userEmail);

    if (!sendgridApiKey || !sendgridFromEmail) {
      console.error("[SendGrid] API Key o From Email no configurados");
      return false;
    }

    sgMail.setApiKey(sendgridApiKey);

    // Email al usuario confirmando que se recibió
    const userEmailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .title { font-size: 18px; font-weight: bold; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>✓ Mensaje recibido</h2></div>
    <div class="content">
      <p>¡Hola ${userName}!</p>
      <p>Hemos recibido tu mensaje y nos pondremos en contacto pronto.</p>
      <p><strong>Categoría:</strong> ${category}</p>
      <p style="margin-top: 30px; font-size: 12px; color: #999;">
        Equipo MAKWIN 🎨
      </p>
    </div>
  </div>
</body>
</html>`;

    // Email al equipo de ayuda
    const adminEmailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .meta { background: #e8e8e8; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 13px; }
    .message-box { background: #fff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>📨 Nuevo mensaje de ayuda</h2></div>
    <div class="content">
      <div class="meta">
        <p><strong>De:</strong> ${userName} (${userEmail})</p>
        <p><strong>Categoría:</strong> ${category}</p>
        <p><strong>Asunto:</strong> ${subject}</p>
      </div>
      <div class="message-box">
        ${message.replace(/\n/g, "<br>")}
      </div>
      <p style="margin-top: 30px; font-size: 12px; color: #999;">
        Este es un mensaje del formulario de contacto de MAKWIN
      </p>
    </div>
  </div>
</body>
</html>`;

    // Enviar email al usuario
    console.log("[SendGrid Debug] Enviando email al usuario:", userEmail);
    try {
      await sgMail.send({
        to: userEmail,
        from: sendgridFromEmail,
        subject: "✓ Tu mensaje ha sido recibido - MAKWIN",
        html: userEmailHTML,
      });
      console.log("[SendGrid] ✓ Email al usuario enviado exitosamente");
    } catch (emailError) {
      console.error("[SendGrid] Error enviando email al usuario:", emailError);
      throw emailError;
    }

    // Enviar email al equipo de ayuda
    console.log("[SendGrid Debug] Enviando email al equipo:", helpEmail);
    try {
      await sgMail.send({
        to: helpEmail,
        from: sendgridFromEmail,
        subject: `📨 [${category.toUpperCase()}] ${subject}`,
        html: adminEmailHTML,
        replyTo: userEmail,
      });
      console.log("[SendGrid] ✓ Email al equipo enviado exitosamente");
    } catch (adminEmailError) {
      console.error("[SendGrid] Error enviando email al equipo:", adminEmailError);
      throw adminEmailError;
    }

    return true;
  } catch (error) {
    console.error("[SendGrid Error]", error);
    return false;
  }
}

export const handleSendHelpEmail: RequestHandler = async (req, res, _next) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userEmail, userName, subject, message, category } = req.body;

    // Validar campos
    if (!userEmail || !userName || !subject || !message || !category) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // Validar longitud de campo
    if (subject.length < 5 || subject.length > 100) {
      return res.status(400).json({ error: "El asunto debe tener entre 5 y 100 caracteres" });
    }

    if (message.length < 10 || message.length > 2000) {
      return res.status(400).json({ error: "El mensaje debe tener entre 10 y 2000 caracteres" });
    }

    const success = await sendHelpEmailWithSendGrid(
      userEmail,
      userName,
      subject,
      message,
      category
    );

    if (success) {
      return res.status(200).json({ 
        success: true, 
        message: "Mensaje enviado exitosamente" 
      });
    } else {
      return res.status(500).json({ 
        error: "No se pudo enviar el mensaje. Intenta más tarde." 
      });
    }
  } catch (error) {
    console.error("[API Error]", error);
    return res.status(500).json({ 
      error: "Error interno del servidor" 
    });
  }
};

// Vercel serverless function export
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleSendHelpEmail(req as any, res as any, () => {});
}
