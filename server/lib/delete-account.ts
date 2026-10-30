import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./email.js";

const supabaseAdminUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseAdminUrl || !supabaseAdminKey) {
  throw new Error(
    "Server configuration error: SUPABASE_URL or VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
  );
}

const supabaseAdmin = createClient(supabaseAdminUrl, supabaseAdminKey);

// Asks Supabase to validate the token: decoding it locally would accept forged ones.
export async function getUserIdFromAuthorizationHeader(authHeader?: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(authHeader.substring(7));
  return error ? null : data?.user?.id ?? null;
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

async function removeUserFiles(userId: string): Promise<void> {
  for (const bucket of ['works', 'avatars']) {
    const storage = supabaseAdmin.storage.from(bucket);
    const folders = [userId, `${userId}/covers`];
    for (const folder of folders) {
      const { data, error } = await storage.list(folder, { limit: 1000 });
      if (error) {
        console.warn(`[DELETE-ACCOUNT] Could not list ${bucket}:`, error.message);
        continue;
      }
      const files = (data ?? []).filter((item) => item.id).map((item) => `${folder}/${item.name}`);
      if (files.length) {
        const { error: removeError } = await storage.remove(files);
        if (removeError) console.warn(`[DELETE-ACCOUNT] Could not remove files from ${bucket}:`, removeError.message);
      }
    }
  }
}

async function sendDeletionConfirmation(email: string, language: unknown): Promise<void> {
  const es = language !== 'en';
  await sendEmail({
    to: email,
    subject: es ? 'Tu cuenta de MAKWIN se ha eliminado' : 'Your MAKWIN account has been deleted',
    content: {
      language: es ? 'es' : 'en',
      title: es ? 'Tu cuenta se ha eliminado' : 'Your account has been deleted',
      preheader: es ? 'Hemos borrado tu cuenta y tus datos.' : 'We have deleted your account and your data.',
      blocks: [
        {
          type: 'text',
          text: es
            ? 'Hemos eliminado tu cuenta de MAKWIN junto con tu perfil, tus obras y tu actividad. Gracias por haber formado parte de MAKWIN.'
            : 'We have deleted your MAKWIN account along with your profile, your works and your activity. Thank you for being part of MAKWIN.',
        },
        {
          type: 'note',
          text: es
            ? 'Si no has sido tú, escríbenos desde Ayuda y contacto en la web de MAKWIN.'
            : 'If this was not you, write to us from Help & Contact on the MAKWIN website.',
        },
      ],
    },
  });
}

export async function deleteAccountForUser(userId: string): Promise<void> {
  const { data, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (getUserError || !data?.user) {
    throw new Error(`Failed to verify auth user: ${getUserError?.message ?? "not found"}`);
  }
  const { email, user_metadata: metadata } = data.user;

  await removeUserFiles(userId);

  // Profile, works, likes, saves and follows all cascade from the auth user.
  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
  }

  // Stale profiles can survive when an earlier cascade was missed.
  const { error: deleteProfileError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
  if (deleteProfileError) {
    console.warn("[DELETE-ACCOUNT] Profile cleanup warning:", deleteProfileError.message);
  }

  if (email) await sendDeletionConfirmation(email, metadata?.language_preference);
}
