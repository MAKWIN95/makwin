import "dotenv/config";
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

  // Delete user account and associated data
  app.post("/api/delete-account", handleDeleteAccount);

  return app;
}
