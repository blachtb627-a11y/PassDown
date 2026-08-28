import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Falls back to the production site so a password-reset link opened outside a
// browser tab (e.g. tapped from a native app's webview) still lands somewhere
// that can complete the flow, since there's no custom URL scheme set up yet.
function getRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return 'https://passdown.it.com';
}

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
    });

    // Supabase's token auto-refresh timer only runs while this is called; React Native
    // has no window focus events, so it must be driven from app foreground/background.
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isPasswordRecovery,
      signUp: async (email, password, fullName, username) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, username } },
        });
        if (error) {
          // Supabase wraps a failed post-signup trigger (e.g. our unique-username
          // constraint) as a generic "Database error saving new user" — the specific
          // Postgres message doesn't make it through, so translate the common case.
          const message = /database error saving new user/i.test(error.message)
            ? 'That username is already taken. Please choose another.'
            : error.message;
          return { error: message };
        }
        return { error: null };
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      sendPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getRedirectUrl() });
        return { error: error?.message ?? null };
      },
      updatePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (!error) setIsPasswordRecovery(false);
        return { error: error?.message ?? null };
      },
    }),
    [session, isLoading, isPasswordRecovery]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
