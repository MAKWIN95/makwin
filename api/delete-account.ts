import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

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
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
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
    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.substring(7);

    // Decode JWT to get user_id
    let userId: string;
    try {
      const decoded: any = jwt.decode(token);
      userId = decoded?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Invalid token - no user ID" });
      }
    } catch {
      return res.status(401).json({ error: "Invalid token format" });
    }

    console.log(`[DELETE-ACCOUNT] Starting deletion for user: ${userId}`);

    // Delete user's works
    const { error: deleteWorksError } = await supabaseAdmin
      .from("works")
      .delete()
      .eq("user_id", userId);

    if (deleteWorksError) {
      console.error("[DELETE-ACCOUNT] Error deleting works:", deleteWorksError);
      return res.status(500).json({ error: "Failed to delete works" });
    }
    console.log(`[DELETE-ACCOUNT] ✅ Deleted works for user: ${userId}`);

    // Delete user's likes
    const { error: deleteLikesError } = await supabaseAdmin
      .from("likes")
      .delete()
      .eq("user_id", userId);

    if (deleteLikesError) {
      console.error("[DELETE-ACCOUNT] Error deleting likes:", deleteLikesError);
      return res.status(500).json({ error: "Failed to delete likes" });
    }
    console.log(`[DELETE-ACCOUNT] ✅ Deleted likes for user: ${userId}`);

    // Delete user's saves
    const { error: deleteSavesError } = await supabaseAdmin
      .from("saves")
      .delete()
      .eq("user_id", userId);

    if (deleteSavesError) {
      console.error("[DELETE-ACCOUNT] Error deleting saves:", deleteSavesError);
      return res.status(500).json({ error: "Failed to delete saves" });
    }
    console.log(`[DELETE-ACCOUNT] ✅ Deleted saves for user: ${userId}`);

    // Delete profile
    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) {
      console.error("[DELETE-ACCOUNT] Error deleting profile:", deleteProfileError);
      return res.status(500).json({ error: "Failed to delete profile" });
    }
    console.log(`[DELETE-ACCOUNT] ✅ Deleted profile for user: ${userId}`);

    // Delete auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("[DELETE-ACCOUNT] Error deleting auth user:", deleteUserError);
      return res.status(500).json({ error: "Failed to delete auth user" });
    }
    console.log(`[DELETE-ACCOUNT] ✅ Deleted auth user: ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("[DELETE-ACCOUNT] Server error:", err);
    return res.status(500).json({ error: "Server error during account deletion" });
  }
}
