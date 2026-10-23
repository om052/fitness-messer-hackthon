
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AUTH_REDIRECT_URL } from '@/lib/authRedirect';

export interface SignUpResult {
  /**
   * True when Supabase created the user but requires email verification
   * before a session exists. The UI must show the actual next step.
   */
  needsEmailVerification: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    playerName: string
  ) => Promise<{ error: string | null; needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
}

/**
 * Map a Supabase auth error to a short, user-friendly, non-sensitive message.
 * Never includes tokens, raw provider payloads or internal details.
 */
export function authErrorMessage(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';

  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (normalized.includes('already registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (normalized.includes('password should be at least')) {
    return 'Password is too short. Use at least 6 characters.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Network error. Check your connection and try again.';
  }

  return 'Authentication failed. Please try again.';
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Read the player name from Supabase user metadata. This is where the
 * registration screen stores the name, so it follows the account across
 * devices and app restarts. Existing accounts created before this field
 * existed have no metadata — callers must fall back to a default.
 */
export function playerNameFromUser(user: User | null): string | null {
  const raw = user?.user_metadata?.player_name;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        authLoading,
        signIn: async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          return { error: error ? authErrorMessage(error.message) : null };
        },
        signUp: async (email, password, playerName) => {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              // The confirmation email link must open the app itself, not a
              // browser page. This value must match the scheme in app.json
              // ("fitnessmesser") and the redirect allow-list in the
              // Supabase Dashboard.
              emailRedirectTo: AUTH_REDIRECT_URL,
              // Persisted with the account so the name survives app
              // restarts and sign-in on other devices.
              data: { player_name: playerName },
            },
          });
          if (error) {
            return {
              error: authErrorMessage(error.message),
              needsEmailVerification: false,
            };
          }
          // Supabase returns a user with no session when email confirmation
          // is required. Report that honestly instead of pretending
          // registration is complete.
          const needsEmailVerification =
            !!data.user && !data.session;
          return { error: null, needsEmailVerification };
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return context;
}
