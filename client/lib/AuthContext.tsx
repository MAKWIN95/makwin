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

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // Initialize auth on mount only
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Get session from storage
        const { data: { session } } = await supabase.auth.getSession();
        
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
                setProfile(data as Profile);
              }
            } catch (err) {
              console.error('[AuthContext] Error fetching initial profile:', err);
            }
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error getting session:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (!error && data) {
              setProfile(data as Profile);
            }
          } catch (err) {
            console.error('[AuthContext] Error fetching profile on auth change:', err);
          }
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
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
