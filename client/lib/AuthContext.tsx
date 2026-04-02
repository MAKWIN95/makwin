import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, username: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'website' | 'avatar_url'>>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // Initialize auth on mount only
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        console.log('[AuthContext] Starting auth initialization...');
        
        // Get session from storage
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthContext] Got session:', session?.user?.id ?? 'No user');
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Fetch profile if user exists
          if (session?.user) {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              if (!error && data) {
                console.log('[AuthContext] Loaded profile:', data.username);
                setProfile(data as Profile);
              } else {
                console.warn('[AuthContext] Error fetching profile:', error?.message);
              }
            } catch (err) {
              console.error('[AuthContext] Error fetching initial profile:', err);
            }
          }
          
          console.log('[AuthContext] Auth initialization complete, setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error getting session:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initAuth();

    // Fallback: Force loading to false after 10 seconds if something gets stuck
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Forcing loading=false due to timeout');
        setLoading(false);
      }
    }, 10000);

    // Listen for auth changes - this is critical for detecting OAuth redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] Auth state changed:', _event, 'User:', session?.user?.id ?? 'No user');
      
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('[AuthContext] Fetching profile for user:', session.user.id);
          
          // Fetch profile but don't block - use timeout
          const fetchProfileWithTimeout = async () => {
            try {
              console.log('[AuthContext] Starting Supabase query with 3s timeout...');
              
              // Create a timeout promise that rejects after 3s
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
              );
              
              // Race: whichever finishes first
              const queryPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              const result = await Promise.race([queryPromise, timeoutPromise]);
              const { data, error } = result as any;
              
              console.log('[AuthContext] Supabase query response:', { 
                hasData: !!data, 
                hasError: !!error, 
                errorMsg: error?.message 
              });
              
              if (!error && data && isMounted) {
                console.log('[AuthContext] Loaded profile from listener:', data.username);
                setProfile(data as Profile);
              } else if (error && isMounted) {
                console.warn('[AuthContext] Could not fetch profile:', error?.message);
                setProfile(null);
              }
            } catch (err: any) {
              console.warn('[AuthContext] Profile fetch failed/timeout:', err?.message);
              if (isMounted) {
                setProfile(null);
              }
            }
          };
          
          // Don't await - let it happen in background
          fetchProfileWithTimeout();
        } else {
          console.log('[AuthContext] No user in session, clearing profile');
          setProfile(null);
        }
        
        console.log('[AuthContext] Auth listener complete, setting loading=false');
        // Always ensure loading is false when auth state changes - DON'T WAIT for profile
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []); // Only run on mount

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://makwin.vercel.app/galeria' },
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
                error: es 
                  ? 'Este correo no está registrado' 
                  : 'This email is not registered' 
              };
            }
            
            return { 
              error: es 
                ? 'Contraseña incorrecta' 
                : 'Incorrect password' 
            };
          } catch (err) {
            // Si falla la verificación, devolvemos un mensaje genérico
            return { 
              error: es 
                ? 'Email o contraseña incorrectos' 
                : 'Incorrect email or password' 
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.toLowerCase(), display_name: displayName } },
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
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://makwin.vercel.app/reset-password',
    });
    return { error: error?.message ?? null };
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'website' | 'avatar_url'>>) => {
    if (!user) return { error: 'No hay sesión activa.' };
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!error) await fetchProfile(user.id);
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      signOut, resetPassword, updateProfile, refreshProfile,
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
