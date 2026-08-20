import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-flash-latest"];
const RETRYABLE_STATUSES = new Set([429, 503, 504]);

async function callGemini(model: string, apiKey: string, prompt: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
    }),
  });

  const data = await response.json();
  return { response, data, model };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body as { prompt?: string };
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[API /api/analyze] Missing GEMINI_API_KEY");
    return res.status(500).json({ error: "Gemini API key not configured" });
  }

  const requestedModel = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const models = Array.from(new Set([requestedModel, ...FALLBACK_MODELS]));
  let lastError: any = null;

  for (const model of models) {
    try {
      const { response, data } = await callGemini(model, apiKey, prompt);
      if (!response.ok) {
        lastError = { status: response.status, data, model };
        const retryable = RETRYABLE_STATUSES.has(response.status);
        if (retryable && model !== models[models.length - 1]) {
          console.warn(`[API /api/analyze] Model ${model} failed with ${response.status}; trying fallback.`);
          continue;
        }
        console.error("[API /api/analyze] Gemini error", data);
        return res.status(response.status).json({
          error: data.error?.message || data.message || "Gemini request failed",
          details: data,
          model,
        });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string" || !text) {
        console.error("[API /api/analyze] Missing text in Gemini response", data);
        return res.status(500).json({
          error: "Gemini response missing text",
          details: data,
          model,
        });
      }

      return res.status(200).json({ text });
    } catch (error) {
      console.error(`[API /api/analyze] Error calling Gemini model ${model}`, error);
      lastError = error;
      if (model !== models[models.length - 1]) continue;
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(503).json({
    error: "All Gemini models are currently unavailable. Try again later.",
    details: lastError,
  });
}
