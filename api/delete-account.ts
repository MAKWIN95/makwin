import { createClient } from "@supabase/supabase-js";
import * as jwt from "jsonwebtoken";

const supabaseAdminUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseAdminUrl) {
  console.error("[DELETE-ACCOUNT] Missing SUPABASE_URL or VITE_SUPABASE_URL");
}

if (!supabaseAdminKey) {
  console.error("[DELETE-ACCOUNT] Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(
  supabaseAdminUrl || "",
  supabaseAdminKey || ""
);

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("[DELETE-ACCOUNT] ============================================");
    console.log("[DELETE-ACCOUNT] New delete request received");
    
    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[DELETE-ACCOUNT] ❌ Missing or invalid Authorization header");
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.substring(7);
    console.log("[DELETE-ACCOUNT] Token received, length:", token.length);

    // Verify env vars
    if (!supabaseAdminUrl) {
      console.error("[DELETE-ACCOUNT] ❌ SUPABASE_URL not configured");
      return res.status(500).json({ error: "Server configuration error: missing SUPABASE_URL" });
    }

    if (!supabaseAdminKey) {
      console.error("[DELETE-ACCOUNT] ❌ SUPABASE_SERVICE_ROLE_KEY not configured");
      return res.status(500).json({ error: "Server configuration error: missing SUPABASE_SERVICE_ROLE_KEY" });
    }

    // Decode JWT to get user_id
    let userId: string;
    try {
      const decoded: any = jwt.decode(token);
      userId = decoded?.sub;
      if (!userId) {
        console.error("[DELETE-ACCOUNT] ❌ Invalid token - no user ID");
        return res.status(401).json({ error: "Invalid token - no user ID" });
      }
      console.log("[DELETE-ACCOUNT] ✅ Extracted userId from token:", userId);
    } catch (err) {
      console.error("[DELETE-ACCOUNT] ❌ Error decoding token:", err);
      return res.status(401).json({ error: "Invalid token format" });
    }

    console.log(`[DELETE-ACCOUNT] Starting deletion for user: ${userId}`);
    console.log(`[DELETE-ACCOUNT] Supabase URL: ${supabaseAdminUrl}`);

    // Step 1: Verify the auth user exists
    console.log(`[DELETE-ACCOUNT] STEP 1: Verifying auth user exists...`);
    const { data: getUserResponse, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError) {
      console.error("[DELETE-ACCOUNT] ❌ Error fetching auth user:", getUserError);
      return res.status(500).json({ error: `Failed to verify auth user: ${getUserError.message}` });
    }

    const existingUser = getUserResponse?.user;
    if (!existingUser) {
      console.error("[DELETE-ACCOUNT] ❌ Auth user not found for ID:", userId);
      return res.status(500).json({ error: "Auth user not found - already deleted?" });
    }

    console.log("[DELETE-ACCOUNT] ✅ Found auth user:", existingUser.email || userId);

    // Step 2: Delete the Auth user from Supabase
    console.log(`[DELETE-ACCOUNT] STEP 2: Deleting auth user from Supabase...`);
    const { data: deleteAuthData, error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("[DELETE-ACCOUNT] ❌ Error deleting auth user:", deleteAuthError);
      return res.status(500).json({ error: `Failed to delete auth user: ${deleteAuthError.message}` });
    }

    console.log(`[DELETE-ACCOUNT] ✅ Successfully deleted auth user: ${deleteAuthData?.user?.id || userId}`);

    // Step 3: Clean up database records
    console.log(`[DELETE-ACCOUNT] STEP 3: Cleaning up database records...`);
    const cleanupTargets = [
      { table: "works", column: "user_id" },
      { table: "likes", column: "user_id" },
      { table: "saves", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    for (const target of cleanupTargets) {
      console.log(`[DELETE-ACCOUNT] Deleting from ${target.table}...`);
      const { error } = await supabaseAdmin
        .from(target.table)
        .delete()
        .eq(target.column, userId);

      if (error) {
        console.error(`[DELETE-ACCOUNT] ⚠️  Error deleting ${target.table}:`, error);
        // Don't return error - we already deleted the auth user
      } else {
        console.log(`[DELETE-ACCOUNT] ✅ Deleted ${target.table} for user: ${userId}`);
      }
    }

    console.log(`[DELETE-ACCOUNT] ============================================`);
    console.log(`[DELETE-ACCOUNT] ✅✅✅ ACCOUNT DELETION COMPLETE FOR: ${userId}`);
    console.log(`[DELETE-ACCOUNT] ============================================`);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("[DELETE-ACCOUNT] ❌ Unhandled error:", err);
    return res.status(500).json({ 
      error: err instanceof Error ? err.message : "Server error during account deletion" 
    });
  }
}
