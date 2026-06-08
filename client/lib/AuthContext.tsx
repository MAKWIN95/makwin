import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  needsUsernameSetup: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, username: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'website' | 'avatar_url' | 'instagram_url' | 'tiktok_url'>>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  completeGoogleSignUp: (username: string, password: string, displayName: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);

  // Fetch profile without being a dependency
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching profile:', err);
    }
  }, []);

  // Update language preference when profile updates
  useEffect(() => {
    if (profile?.language_preference) {
      localStorage.setItem('language', profile.language_preference);
      document.dispatchEvent(new CustomEvent('profileLanguageLoaded', { 
        detail: { language: profile.language_preference } 
      }));
    }
  }, [profile?.language_preference]);

  const isGoogleAuthSession = useCallback((session: Session | null) => {
    if (!session?.user) return false;
    const hasGoogleIdentity = session.user.identities?.some((identity) => identity.provider === 'google');
    return Boolean(
      hasGoogleIdentity ||
      session.user.app_metadata?.provider === 'google' ||
      session.user.user_metadata?.provider === 'google'
    );
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const handleSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setNeedsUsernameSetup(false);
      setOnboardingUser(null);
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('makwin-onboarding-incomplete');
        }
      } catch (err) {
        console.warn('[AuthContext] Error clearing sessionStorage:', err);
      }
      return;
    }

    setSession(session);
    setUser(session.user);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        const usernameExists = !!(data.username && String(data.username).trim().length > 0);
        const displayNameExists = !!(data.display_name && String(data.display_name).trim().length > 0);
        const profileComplete = usernameExists && displayNameExists;

        if (isGoogleAuthSession(session) && !profileComplete) {
          // Partial profile row exists, but onboarding is still incomplete.
          setProfile(null);
          setNeedsUsernameSetup(true);
          setOnboardingUser(session.user);
          try {
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('makwin-onboarding-incomplete', session.user.id);
            }
          } catch (err) {
            console.warn('[AuthContext] Error setting sessionStorage:', err);
          }
          return;
        }

        setProfile(data as Profile);
        setOnboardingUser(null);
        setNeedsUsernameSetup(false);
        try {
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem('makwin-onboarding-incomplete');
          }
        } catch (err) {
          console.warn('[AuthContext] Error clearing sessionStorage:', err);
        }
        return;
      }

      // Profile doesn't exist
      const isGoogleUser = isGoogleAuthSession(session);
      if (isGoogleUser) {
        // -- ONBOARDING INCOMPLETE: store ephemerally
        setProfile(null);
        setNeedsUsernameSetup(true);
        setOnboardingUser(session.user);
        // Mark in sessionStorage that this tab is in onboarding
        // (sessionStorage auto-clears on tab close; F5 also clears it)
        try {
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('makwin-onboarding-incomplete', session.user.id);
          }
        } catch (err) {
          console.warn('[AuthContext] Error setting sessionStorage:', err);
        }
        // ** IMPORTANT: Do NOT clear Supabase session from localStorage
        // ** The OAuth session is valid; we just guard app-level routes via needsUsernameSetup
        return;
      }

      // Non-Google user with no profile: sign out (shouldn't happen, but cleanup)
      await supabase.auth.signOut({ scope: 'local' });
      setSession(null);
      setUser(null);
      setProfile(null);
      setNeedsUsernameSetup(false);
      setOnboardingUser(null);
    } catch (err) {
      console.error('[AuthContext] Error fetching profile for session:', err);
      setProfile(null);
      setNeedsUsernameSetup(false);
      setOnboardingUser(null);
    }
  }, [isGoogleAuthSession]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        await handleSession(session);
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Auth initialization timeout, setting loading=false');
        setLoading(false);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      await handleSession(session);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, [handleSession]);

  const signInWithGoogle = async () => {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/galeria`
        : 'https://www.makwin.art/galeria';

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Si falla el login, verificamos si el email existe
        if (error.message.includes('Invalid login credentials')) {
          try {
            const response = await fetch('/api/check-email-exists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            const { exists } = await response.json();
            
            if (!exists) {
              return { 
                error: 'USER_NOT_FOUND'
              };
            }
            
            return { 
              error: 'INVALID_PASSWORD'
            };
          } catch (err) {
            // Si falla la verificación, devolvemos un mensaje genérico
            return { 
              error: 'INVALID_CREDENTIALS'
            };
          }
        }
        
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Error durante el login' };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    // Check username uniqueness first
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (existing) return { error: 'Este nombre de usuario ya está en uso.' };

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/login`
        : 'https://www.makwin.art/login';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { username: username.toLowerCase(), display_name: displayName },
      },
    });

    if (error) return { error: error.message };

    // Create profile manually (trigger handles it too but we ensure it's there)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username.toLowerCase(),
        display_name: displayName,
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setNeedsUsernameSetup(false);
    setOnboardingUser(null);
    setUser(null);
    setSession(null);
    // Clean up onboarding flag from sessionStorage only
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('makwin-onboarding-incomplete');
      }
    } catch (err) {
      console.warn('[AuthContext] Error clearing sessionStorage on signOut:', err);
    }
  };

  const resetPassword = async (email: string) => {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'https://www.makwin.art/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error: error?.message ?? null };
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'website' | 'avatar_url' | 'instagram_url' | 'tiktok_url'>>) => {
    if (!user) return { error: 'No hay sesión activa.' };

    // Validate username uniqueness if changing
    if (updates.username && updates.username !== profile?.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', updates.username.toLowerCase())
        .maybeSingle();
      if (existing) return { error: 'Este nombre de usuario ya está en uso.' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        ...updates,
        username: updates.username ? updates.username.toLowerCase() : undefined,
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id);
    if (!error) await fetchProfile(user.id);
    return { error: error?.message ?? null };
  };

  const completeGoogleSignUp = async (username: string, password: string, displayName: string) => {
    // Use ephemeral onboardingUser or current user (shouldn't happen, but fallback)
    const effectiveUser = user ?? onboardingUser;
    if (!effectiveUser) return { error: 'No hay sesión activa.' };

    try {
      // Check username uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (existing) return { error: 'Este nombre de usuario ya está en uso.' };

      // Try to set a password for the OAuth user
      // (This works if the session is active; for Google OAuth it may be optional)
      try {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) {
          console.warn('[AuthContext] updateUser password (non-fatal):', passwordError.message);
        }
      } catch (err) {
        console.warn('[AuthContext] Failed to set password:', err);
        // Non-fatal; continue with profile update
      }

      // Update or create profile with username
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: effectiveUser.id,
            username: username.toLowerCase(),
            display_name: displayName,
            google_setup_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (profileError) return { error: profileError.message };

      // Onboarding complete: session is already valid from OAuth, just update state
      setNeedsUsernameSetup(false);
      setOnboardingUser(null);

      // Fetch the refreshed profile to populate app state
      await fetchProfile(effectiveUser.id);

      // Clear the sessionStorage flag
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('makwin-onboarding-incomplete');
        }
      } catch (err) {
        console.warn('[AuthContext] Error clearing sessionStorage:', err);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Error completando la configuración' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, needsUsernameSetup,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      signOut, resetPassword, updateProfile, refreshProfile, completeGoogleSignUp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
