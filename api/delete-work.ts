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

    // Eliminar de Redis
    await redis.del(submissionId);
    console.log(`[DELETE] ✅ Obra eliminada: ${submissionId}`);

    res.status(200).json({
      success: true,
      message: "Obra eliminada correctamente",
    });
  } catch (error: any) {
    console.error("[DELETE] Error:", error.message);
    res.status(500).json({
      error: "Error al eliminar la obra",
      details: error.message,
    });
  }
}
