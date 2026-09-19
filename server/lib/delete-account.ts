import { createClient } from "@supabase/supabase-js";
import * as jwt from "jsonwebtoken";

const supabaseAdminUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseAdminUrl || !supabaseAdminKey) {
  throw new Error(
    "Server configuration error: SUPABASE_URL or VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
  );
}

const supabaseAdmin = createClient(supabaseAdminUrl, supabaseAdminKey);

export function getUserIdFromAuthorizationHeader(authHeader?: string | null): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.substring(7);
  const decoded: any = jwt.decode(token);
  const userId = decoded?.sub;

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid token - missing user ID");
  }

  return userId;
}

export async function pruneOrphanedProfileByUsername(username: string): Promise<{ available: boolean; cleaned: boolean }> {
  const normalized = String(username ?? '').trim().toLowerCase();
  if (!normalized) {
    return { available: false, cleaned: false };
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username')
    .eq('username', normalized)
    .maybeSingle();

  if (error && !(error as any)?.code?.includes?.('PGRST116')) {
    throw new Error(error.message);
  }

  if (!profile) {
    return { available: true, cleaned: false };
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (!authError && authUser?.user) {
    return { available: false, cleaned: false };
  }

  const { error: deleteError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', profile.id);

  if (deleteError) {
    throw new Error(`Failed to delete stale profile: ${deleteError.message}`);
  }

  return { available: true, cleaned: true };
}

export async function deleteAccountForUser(userId: string): Promise<void> {
  console.log(`[DELETE-ACCOUNT] ============================================`);
  console.log(`[DELETE-ACCOUNT] Starting deletion for user: ${userId}`);
  console.log(`[DELETE-ACCOUNT] Supabase URL: ${supabaseAdminUrl}`);
  console.log(`[DELETE-ACCOUNT] Has service role key: ${!!supabaseAdminKey}`);

  // Step 1: Verify the auth user exists
  console.log(`[DELETE-ACCOUNT] STEP 1: Verifying auth user exists...`);
  const { data: getUserResponse, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (getUserError) {
    console.error("[DELETE-ACCOUNT] ❌ Error fetching auth user:", getUserError);
    throw new Error(`Failed to verify auth user: ${getUserError.message}`);
  }

  const existingUser = getUserResponse?.user;
  if (!existingUser) {
    console.error("[DELETE-ACCOUNT] ❌ Auth user not found for ID:", userId);
    throw new Error("Auth user not found - already deleted?");
  }

  console.log(
    "[DELETE-ACCOUNT] ✅ Found auth user:",
    existingUser.email || userId
  );

  // Step 2: Delete the Auth user from Supabase
  console.log(`[DELETE-ACCOUNT] STEP 2: Deleting auth user from Supabase...`);
  const { data: deleteAuthData, error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    console.error("[DELETE-ACCOUNT] ❌ Error deleting auth user:", deleteAuthError);
    throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
  }

  console.log(
    `[DELETE-ACCOUNT] ✅ Successfully deleted auth user: ${deleteAuthData?.user?.id || userId}`
  );

  // Step 3: Explicitly clear the profile row, since stale profiles can remain when an auth user is deleted from the dashboard or a previous cascade was missed.
  console.log(`[DELETE-ACCOUNT] STEP 3: Cleaning up profile row...`);
  const { error: deleteProfileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (deleteProfileError) {
    console.warn('[DELETE-ACCOUNT] ⚠️ profile cleanup warning:', deleteProfileError.message);
  } else {
    console.log(`[DELETE-ACCOUNT] ✅ Deleted profile row for user: ${userId}`);
  }

  // Step 4: Clean up database records
  console.log(`[DELETE-ACCOUNT] STEP 4: Cleaning up database records...`);
  const cleanupTargets = [
    { table: "works", column: "user_id" },
    { table: "likes", column: "user_id" },
    { table: "saves", column: "user_id" },
  ];

  for (const target of cleanupTargets) {
    console.log(`[DELETE-ACCOUNT] Deleting from ${target.table}...`);
    const { error, count } = await supabaseAdmin
      .from(target.table)
      .delete()
      .eq(target.column, userId);

    if (error) {
      console.error(
        `[DELETE-ACCOUNT] ❌ Error deleting ${target.table}:`,
        error
      );
      console.warn(`[DELETE-ACCOUNT] ⚠️  Continuing despite ${target.table} deletion issue`);
    } else {
      console.log(`[DELETE-ACCOUNT] ✅ Deleted ${target.table} for user: ${userId}`);
    }
  }

  console.log(`[DELETE-ACCOUNT] ============================================`);
  console.log(`[DELETE-ACCOUNT] ✅✅✅ ACCOUNT DELETION COMPLETE FOR: ${userId}`);
  console.log(`[DELETE-ACCOUNT] ============================================`);
}
