import { VercelRequest, VercelResponse } from "@vercel/node";
import { redis } from "../server/lib/redis";

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

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const keys = (await redis.keys("*-obra-*"))
      .filter((key) => /^\d{4}-obra-\d+$/.test(key));
    console.log(`[GET-SUBMISSIONS] Found ${keys.length} submissions`);

    if (!keys || keys.length === 0) {
      res.status(200).json({ submissions: [] });
      return;
    }

    // Leer cada submission desde Redis
    const submissions = [];
    for (const key of keys) {
      try {
        const data = await redis.get(key);
        if (data) {
          const parsed = typeof data === "string" ? JSON.parse(data) : data;
          submissions.push({
            ...parsed,
            fileUrl: parsed.fileUrl || null,
            hasFile: !!parsed.fileUrl,
            fileName: parsed.fileUrl ? String(parsed.fileUrl).split("/").pop() : null,
          });
        }
      } catch (e) {
        console.error(`Error parsing ${key}:`, e);
      }
    }

    // Ordenar por timestamp descendente (más recientes primero)
    submissions.sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.status(200).json({ submissions });
  } catch (error: any) {
    console.error("[API] Error al leer Redis:", error?.name || "Redis error");
    res.status(503).json({ error: "Servicio temporalmente no disponible" });
  }
}
