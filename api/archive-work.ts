import { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

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
    const { submissionId } = req.body;

    if (!submissionId) {
      res.status(400).json({ error: "submissionId requerido" });
      return;
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });

    // Leer la obra
    const data = await redis.get(submissionId);
    if (!data) {
      res.status(400).json({ error: "Obra no encontrada" });
      return;
    }

    const work = typeof data === "string" ? JSON.parse(data) : data;

    // Actualizar status a archived
    const archivedWork = {
      ...work,
      status: "archived",
      archivedAt: new Date().toISOString(),
    };

    // Guardar en Redis
    await redis.set(submissionId, JSON.stringify(archivedWork));
    console.log(`[ARCHIVE] ✅ Obra archivada: ${submissionId}`);

    res.status(200).json({
      success: true,
      message: "Obra archivada correctamente",
    });
  } catch (error: any) {
    console.error("[ARCHIVE] Error:", error.message);
    res.status(500).json({
      error: "Error al archivar la obra",
      details: error.message,
    });
  }
}
