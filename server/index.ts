import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSubmitWork } from "./routes/submit-work";
import { checkEmailExists } from "../api/check-email-exists";
import { handleSendHelpEmail } from "../api/send-help-email";
import { handleSaveHelpMessage } from "../api/save-help-message";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  // Send help email
  app.post("/api/send-help-email", handleSendHelpEmail);

  // Save help message to database
  app.post("/api/save-help-message", handleSaveHelpMessage);

  return app;
}
