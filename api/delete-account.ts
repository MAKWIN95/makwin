import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteAccountForUser, getUserIdFromAuthorizationHeader } from "../server/lib/delete-account.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = await getUserIdFromAuthorizationHeader(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: "Invalid session" });

    await deleteAccountForUser(userId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[DELETE-ACCOUNT] Error:", error);
    return res.status(500).json({ error: "Could not delete the account" });
  }
}
