import type { VercelRequest, VercelResponse } from "@vercel/node";

// Retired: nothing links here any more and it accepted anonymous submissions.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({ error: 'Gone' });
}
