import { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Endpoint de debug para ver qué variables de entorno están disponibles
  const envVars: Record<string, string | undefined> = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    KV_URL: process.env.KV_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY ? "SET" : "NOT_SET",
    RESEND_FROM: process.env.RESEND_FROM,
    NODE_ENV: process.env.NODE_ENV,
  };

  res.status(200).json({
    message: "Debug environment variables",
    variables: envVars,
  });
}
