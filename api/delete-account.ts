import { createClient } from "@supabase/supabase-js";
import * as jwt from "jsonwebtoken";

// Check environment variables at module load time
console.log("[DELETE-ACCOUNT] Module loaded");
console.log("[DELETE-ACCOUNT] process.env.SUPABASE_URL:", process.env.SUPABASE_URL ? "✅ SET" : "❌ MISSING");
console.log("[DELETE-ACCOUNT] process.env.VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL ? "✅ SET" : "❌ MISSING");
console.log("[DELETE-ACCOUNT] process.env.SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ SET (length: " + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ")" : "❌ MISSING");

const supabaseAdminUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  console.log("\n=== DELETE ACCOUNT REQUEST ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Client IP:", req.headers["x-forwarded-for"] || req.socket.remoteAddress);
  
  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    console.log("[1] Authorization header present:", !!authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ FAIL: Missing or invalid Authorization header");
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.substring(7);
    console.log("[2] Token extracted, length:", token.length);

    // Verify env vars are configured
    console.log("[3] Checking environment configuration...");
    if (!supabaseAdminUrl) {
      console.error("❌ FAIL: SUPABASE_URL not configured");
      return res.status(500).json({ error: "Server config: missing SUPABASE_URL" });
    }
    console.log("[3a] ✅ SUPABASE_URL configured:", supabaseAdminUrl.substring(0, 20) + "...");

    if (!supabaseAdminKey) {
      console.error("❌ FAIL: SUPABASE_SERVICE_ROLE_KEY not configured");
      return res.status(500).json({ error: "Server config: missing SUPABASE_SERVICE_ROLE_KEY" });
    }
    console.log("[3b] ✅ SUPABASE_SERVICE_ROLE_KEY configured");

    // Decode JWT to get user_id
    console.log("[4] Decoding JWT...");
    let userId: string;
    try {
      const decoded: any = jwt.decode(token);
      console.log("[4a] JWT decoded, payload keys:", Object.keys(decoded || {}).join(", "));
      userId = decoded?.sub;
      if (!userId) {
        console.error("❌ FAIL: JWT decoded but no 'sub' claim found");
        return res.status(401).json({ error: "Invalid token - no user ID" });
      }
      console.log("[4b] ✅ User ID extracted:", userId);
    } catch (err) {
      console.error("❌ FAIL: Error decoding token:", err);
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Step 1: Verify the auth user exists
    console.log("[5] Verifying auth user exists in Supabase...");
    console.log("[5a] Calling supabaseAdmin.auth.admin.getUserById()...");
    
    let getUserResponse, getUserError;
    try {
      const result = await supabaseAdmin.auth.admin.getUserById(userId);
      getUserResponse = result.data;
      getUserError = result.error;
      console.log("[5b] Admin API response received");
      console.log("[5c] Error present:", !!getUserError);
      console.log("[5d] User data present:", !!getUserResponse?.user);
    } catch (err) {
      console.error("[5e] ❌ EXCEPTION calling getUserById:", err);
      return res.status(500).json({ error: `Admin API error: ${err instanceof Error ? err.message : String(err)}` });
    }

    if (getUserError) {
      console.error("[5f] ❌ FAIL: Error fetching auth user:", getUserError);
      return res.status(500).json({ error: `Failed to verify auth user: ${getUserError.message}` });
    }

    const existingUser = getUserResponse?.user;
    if (!existingUser) {
      console.error("[5g] ❌ FAIL: Auth user not found");
      return res.status(404).json({ error: "Auth user not found" });
    }

    console.log("[5h] ✅ Auth user found:", existingUser.email);

    // Step 2: Delete the Auth user
    console.log("[6] Deleting auth user from Supabase...");
    console.log("[6a] Calling supabaseAdmin.auth.admin.deleteUser()...");
    
    let deleteAuthData, deleteAuthError;
    try {
      const result = await supabaseAdmin.auth.admin.deleteUser(userId);
      deleteAuthData = result.data;
      deleteAuthError = result.error;
      console.log("[6b] Delete API response received");
      console.log("[6c] Error present:", !!deleteAuthError);
    } catch (err) {
      console.error("[6d] ❌ EXCEPTION calling deleteUser:", err);
      return res.status(500).json({ error: `Failed to delete user: ${err instanceof Error ? err.message : String(err)}` });
    }

    if (deleteAuthError) {
      console.error("[6e] ❌ FAIL: Error deleting auth user:", deleteAuthError);
      return res.status(500).json({ error: `Failed to delete auth user: ${deleteAuthError.message}` });
    }

    console.log("[6f] ✅ Auth user successfully deleted from Supabase");

    // Step 3: Clean up database records
    console.log("[7] Cleaning up database records...");
    const cleanupTargets = [
      { table: "works", column: "user_id" },
      { table: "likes", column: "user_id" },
      { table: "saves", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    for (const target of cleanupTargets) {
      console.log(`[7.${target.table}] Deleting from ${target.table}...`);
      const { error, count } = await supabaseAdmin
        .from(target.table)
        .delete()
        .eq(target.column, userId);

      if (error) {
        console.warn(`[7.${target.table}] ⚠️  Warning: Error deleting ${target.table}: ${error.message}`);
      } else {
        console.log(`[7.${target.table}] ✅ Deleted ${target.table}`);
      }
    }

    console.log("[8] ✅✅✅ ACCOUNT DELETION COMPLETE");
    console.log("=== END DELETE ACCOUNT ===\n");

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
      userId: userId,
    });
  } catch (err) {
    console.error("[ERROR] Unhandled exception:", err);
    console.log("=== END DELETE ACCOUNT (ERROR) ===\n");
    return res.status(500).json({ 
      error: err instanceof Error ? err.message : "Server error" 
    });
  }
}
