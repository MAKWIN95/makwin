import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, DEFAULT_USER_AVATAR } from './supabase';

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
  const sessionSequenceRef = useRef(0);

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
    const user = session.user as any;

    // Check session-level provider (supabase may populate this on OAuth redirects)
    if ((session as any).provider === 'google') return true;

    // identities array (present in some Supabase setups)
    if (Array.isArray(user.identities) && user.identities.some((identity: any) => identity.provider === 'google')) return true;

    // app_metadata can be either a string provider or an array 'providers'
    if (user.app_metadata?.provider === 'google') return true;
    if (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes('google')) return true;

    // user_metadata sometimes carries provider information
    if (user.user_metadata?.provider === 'google') return true;

    return false;
  }, []);

  const isProfileCompleteForSession = useCallback((session: Session | null, profileData: any) => {
    if (!profileData) return false;

    const googleUser = isGoogleAuthSession(session);

    // For Google sessions the profile is only complete after the user finishes onboarding explicitly.
    // The DB trigger may create a row and populate username/display_name/avatar_url automatically,
    // but those values are not a valid completion signal for a Google account.
    if (googleUser) {
      return profileData.google_setup_completed === true;
    }

    const usernameExists = !!(profileData.username && String(profileData.username).trim().length > 0);
    const displayNameExists = !!(profileData.display_name && String(profileData.display_name).trim().length > 0);
    return usernameExists && displayNameExists;
  }, [isGoogleAuthSession]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const clearOnboardingState = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('makwin-onboarding-incomplete');
      }
    } catch (err) {
      console.warn('[AuthContext] Error clearing sessionStorage:', err);
    }
  }, []);

  const setIncompleteGoogleState = useCallback((currentSession: Session, currentUser: User) => {
    setSession(currentSession);
    setUser(currentUser);
    setProfile(null);
    setNeedsUsernameSetup(true);
    setOnboardingUser(currentUser);
    try {
      if (typeof window !== 'undefined') {
        const storedUserId = window.sessionStorage.getItem('makwin-onboarding-incomplete');
        if (storedUserId !== currentUser.id) {
          window.sessionStorage.setItem('makwin-onboarding-incomplete', currentUser.id);
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Error setting sessionStorage:', err);
    }
  }, []);

  const handleSession = useCallback(async (session: Session | null) => {
    const sequence = ++sessionSequenceRef.current;
    const isLatest = () => sequence === sessionSequenceRef.current;

    if (!session?.user) {
      if (!isLatest()) return;
      setSession(null);
      setUser(null);
      setProfile(null);
      setNeedsUsernameSetup(false);
      setOnboardingUser(null);
      clearOnboardingState();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!isLatest()) return;

      const isGoogleUser = isGoogleAuthSession(session);

      if (!error && data) {
        const profileComplete = isProfileCompleteForSession(session, data);

        if (!profileComplete) {
          setIncompleteGoogleState(session, session.user);
          return;
        }

        setSession(session);
        setUser(session.user);
        setProfile(data as Profile);
        setOnboardingUser(null);
        setNeedsUsernameSetup(false);
        clearOnboardingState();
        return;
      }

      if (isGoogleUser) {
        setIncompleteGoogleState(session, session.user);
        return;
      }

      await supabase.auth.signOut({ scope: 'local' });
      if (!isLatest()) return;
      setSession(null);
      setUser(null);
      setProfile(null);
      setNeedsUsernameSetup(false);
      setOnboardingUser(null);
      clearOnboardingState();
    } catch (err) {
      if (!isLatest()) return;
      console.error('[AuthContext] Error fetching profile for session:', err);
      setProfile(null);
      setNeedsUsernameSetup(false);
      setOnboardingUser(null);
      const isGoogleUser = isGoogleAuthSession(session);
      if (isGoogleUser) {
        setIncompleteGoogleState(session, session.user);
      }
    }
  }, [clearOnboardingState, isGoogleAuthSession, isProfileCompleteForSession, setIncompleteGoogleState]);

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
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, [handleSession]);

  const getAppBaseUrl = useCallback(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL) {
      return import.meta.env.VITE_PUBLIC_SITE_URL as string;
    }
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) {
      return import.meta.env.VITE_APP_URL as string;
    }
    return 'https://makwin.art';
  }, []);

  const signInWithGoogle = async () => {
    const redirectTo = `${getAppBaseUrl()}/galeria`;

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

    const redirectTo = `${getAppBaseUrl()}/login`;

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
        avatar_url: DEFAULT_USER_AVATAR,
        google_setup_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
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
    const redirectTo = `${getAppBaseUrl()}/reset-password`;

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
    const effectiveUser = user ?? onboardingUser;
    if (!effectiveUser?.id) return { error: 'No hay sesión activa.' };

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session || sessionData.session.user.id !== effectiveUser.id) {
      return { error: 'La sesión de autenticación no está activa.' };
    }

    const uname = String(username || '').trim().toLowerCase();
    const safeDisplayName = String(displayName || '').trim();
    const googleAvatar = (effectiveUser.user_metadata?.avatar_url as string | undefined) || DEFAULT_USER_AVATAR;

    try {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', uname)
        .maybeSingle();

      if (taken && taken.id !== effectiveUser.id) {
        return { error: 'Este nombre de usuario ya existe.' };
      }

      try {
        // Do not allow spaces in passwords
        if (/\s/.test(password)) {
                  return { error: 'Password cannot contain spaces.' };
        }

        // Prefer setting password via server-side admin endpoint to avoid triggering provider emails
        // and to ensure a stable admin-side operation. Use current client access token to validate identity.
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token || '';
          if (accessToken) {
            try {
              const resp = await fetch('/api/admin-set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ userId: effectiveUser.id, password }),
              });

              if (!resp.ok) {
                const payload = await resp.json().catch(() => ({}));
                console.warn('[AuthContext] admin-set-password failed:', resp.status, payload);
              }
            } catch (err) {
              console.warn('[AuthContext] admin-set-password request failed:', err);
            }
          } else {
            // fallback to client-side update if no access token available
            const { error: passwordError } = await supabase.auth.updateUser({ password });
            if (passwordError) {
              console.warn('[AuthContext] updateUser password (non-fatal):', passwordError.message);
            }
          }

          // After updating password, Supabase may rotate/refresh the session. Wait briefly for the client
          // session to reflect the current user so subsequent DB writes use a stable auth token.
          const waitForSessionMatch = async (userId: string, timeoutMs = 5000) => {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user && session.user.id === userId) return true;
              } catch (e) {
                // ignore and retry
              }
              // small delay
              await new Promise((r) => setTimeout(r, 300));
            }
            return false;
          };

          try {
            await waitForSessionMatch(effectiveUser.id, 5000);
          } catch (e) {
            // non-fatal - proceed anyway, we'll handle DB errors below
            console.warn('[AuthContext] waitForSessionMatch error:', e);
          }
        } catch (err) {
          console.warn('[AuthContext] Failed to set password:', err);
        }

      const profilePayload = {
        id: effectiveUser.id,
        username: uname,
        display_name: safeDisplayName,
        avatar_url: googleAvatar,
        google_setup_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Wrap DB write calls with a short timeout so the UI cannot remain forever in a loading state
      const withTimeout = async (promise: any, timeoutMs = 7000): Promise<any> => {
        return await Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
        ] as any);
      };

      const { data: existingProfile, error: existingProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', effectiveUser.id)
        .maybeSingle();

      if (existingProfileError && !String(existingProfileError.message).toLowerCase().includes('not found')) {
        console.error('[AuthContext] Checking existing profile before onboarding completion failed:', existingProfileError);
      }

      let nextProfile: Profile | null = null;

      if (existingProfile) {
        try {
          const { data: updatedProfile, error: updateError } = await withTimeout(
            supabase
              .from('profiles')
              .update(profilePayload)
              .eq('id', effectiveUser.id)
              .select('*')
              .single(),
            7000
          );

          if (updateError) {
            const msg = String(updateError.message || '').toLowerCase();
            if (msg.includes('duplicate') || msg.includes('already exists')) {
              return { error: 'Este nombre de usuario ya existe.' };
            }
            return { error: updateError.message || 'No se pudo guardar el perfil.' };
          }

          nextProfile = (updatedProfile as any) as Profile;
        } catch (err: any) {
          console.error('[AuthContext] Profile update timeout or error:', err);
          return { error: err?.message || 'No se pudo guardar el perfil (timeout).' };
        }
      } else {
        try {
          const { data: insertedProfile, error: insertError } = await withTimeout(
            supabase
              .from('profiles')
              .insert(profilePayload)
              .select('*')
              .single(),
            7000
          );

          if (insertError) {
            const msg = String(insertError.message || '').toLowerCase();
            if (msg.includes('duplicate') || msg.includes('already exists')) {
              return { error: 'Este nombre de usuario ya existe.' };
            }
            return { error: insertError.message || 'No se pudo guardar el perfil.' };
          }

          nextProfile = (insertedProfile as any) as Profile;
        } catch (err: any) {
          console.error('[AuthContext] Profile insert timeout or error:', err);
          return { error: err?.message || 'No se pudo guardar el perfil (timeout).' };
        }
      }

      const resolvedProfile: Profile = nextProfile ?? {
        ...profilePayload,
        bio: null,
        website: null,
        instagram_url: null,
        tiktok_url: null,
        is_verified: false,
        is_banned: false,
        language_preference: 'es',
        last_name_change: null,
        last_username_change: null,
        created_at: new Date().toISOString(),
      } as Profile;

      setProfile(resolvedProfile);
      setNeedsUsernameSetup(false);
      setOnboardingUser(null);
      clearOnboardingState();

      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('makwin-last-google-auth', effectiveUser.id);
        } catch (e) {
          console.warn('[AuthContext] Error saving onboarding state marker:', e);
        }
      }

      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext] completeGoogleSignUp error:', err);
      return { error: err?.message || 'Error completando la configuración' };
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
