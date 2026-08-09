import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  /** True until the initial getSession() call resolves */
  isLoading: boolean;
  /** Alias for isLoading — kept for backwards compat */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function useAuth() {
  return React.use(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialise from persisted session first
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[AuthContext] initial session:', s ? `uid=${s.user.id}` : 'none');
      setSession(s);
      setIsLoading(false);
    });

    // Keep in sync with any auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[AuthContext] onAuthStateChange event:', _event, 'session:', s ? `uid=${s.user.id}` : 'none');
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] signIn attempt', { email });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] signIn error', error.message);
      throw error;
    }
    console.log('[Auth] signIn success');
  };

  const signUp = async (email: string, password: string) => {
    console.log('[Auth] signUp attempt', { email });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[Auth] signUp error', error.message);
      throw error;
    }
    console.log('[Auth] signUp success');
  };

  const signOut = async () => {
    console.log('[Auth] signOut');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        loading: isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
