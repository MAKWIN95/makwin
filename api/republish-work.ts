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

    // Leer la obra archivada
    const data = await redis.get(submissionId);
    if (!data) {
      res.status(400).json({ error: "Obra no encontrada" });
      return;
    }

    const work = typeof data === "string" ? JSON.parse(data) : data;

    // Cambiar status de vuelta a published
    const republishedWork = {
      ...work,
      status: "published",
      publishedAt: new Date().toISOString(),
      // Remover archivedAt si existe
      archivedAt: undefined,
    };

    // Guardar en Redis
    await redis.set(submissionId, JSON.stringify(republishedWork));
    console.log(`[REPUBLISH] ✅ Obra republicada: ${submissionId}`);

    res.status(200).json({
      success: true,
      message: "Obra republicada correctamente",
      work: republishedWork,
    });
  } catch (error: any) {
    console.error("[REPUBLISH] Error:", error.message);
    res.status(500).json({
      error: "Error al republicar la obra",
      details: error.message,
    });
  }
}
