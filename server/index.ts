import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import express from "express";
import path from "path";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSubmitWork } from "./routes/submit-work";
import { handleDeleteAccount } from "./routes/delete-account";
import { checkEmailExists } from "../api/check-email-exists";
import { saveHelpMessage } from "../api/save-help-message";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Beats page route: serve the standalone HTML file directly from project root
  app.get(["/beats", "/beats/"], (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), "mkwn-beats.html"));
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // New submission endpoint
  app.post("/api/submit-work", handleSubmitWork);

  // Check if email exists
  app.post("/api/check-email-exists", async (req, res) => {
    const result = await checkEmailExists({ body: JSON.stringify(req.body) });
    const statusCode = result.statusCode;
    const body = JSON.parse(result.body);
    res.status(statusCode).json(body);
  });

  // Save help message to database
  app.post("/api/save-help-message", async (req, res) => {
    try {
      const { email, name, category, subject, message, user_id } = req.body;

      if (!email || !name || !category || !subject || !message) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }

      const result = await saveHelpMessage(email, name, category, subject, message, user_id);

      if ("error" in result) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.status(200).json({
        success: true,
        message: "Mensaje guardado exitosamente",
        id: result.id,
      });
    } catch (error) {
      console.error("[API Error]", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Gemini proxy endpoint to avoid browser CORS issues
  app.post("/api/analyze", async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt" });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[API /api/analyze] Missing GEMINI_API_KEY");
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
          }),
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return res.status(response.status).json({ text, details: data });
    } catch (error) {
      console.error("[API /api/analyze] Error forwarding request", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete user account and associated data
  app.post("/api/delete-account", handleDeleteAccount);

  return app;
}

