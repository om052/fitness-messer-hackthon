
import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/state/AuthContext';
import { GameProvider } from '@/state/GameContext';
import { colors } from '@/styles/theme';
import { AuthGateLoading, AuthFlow } from '@/components/auth';
import { getGuestMode, setGuestMode } from '@/state/guestMode';
import { handleAuthRedirect, AUTH_REDIRECT_PATH } from '@/lib/authRedirect';

/**
 * Root layout
 *
 * Keeps authentication and game state available to the existing routes.
 * The tab navigator remains the single source of truth for tab routes.
 *
 * Entry flow (expo-router ~3.4 — no protected-routes support):
 *   launch → auth session resolving → AuthGateLoading
 *   unauthenticated, no guest choice → AuthFlow (welcome/sign-in/sign-up)
 *   guest chosen OR session exists   → existing app routes
 *
 * Provider hierarchy is preserved: AuthProvider wraps GameProvider, and
 * GameProvider derives its storage key from the auth user, keeping the
 * existing guest/account storage isolation intact.
 */
function RootShell() {
  const { session, authLoading } = useAuth();
  // null = still resolving the persisted guest preference
  const [guestMode, setGuestModeState] = useState<boolean | null>(null);
  const handledUrl = useRef<string | null>(null);

  // Email-confirmation deep links (fitnessmesser://auth/confirm?...).
  // handleAuthRedirect turns the link's tokens/code into a real session by
  // calling supabase.auth, which then fires onAuthStateChange — the existing
  // session effect below takes over from there. A redirect alone never
  // creates a session, so this handling is mandatory.
  useEffect(() => {
    let cancelled = false;

    const process = async (url: string | null) => {
      if (!url || cancelled) return;
      if (!url.includes(AUTH_REDIRECT_PATH)) return;
      if (handledUrl.current === url) return; // dedupe re-emitted links
      handledUrl.current = url;
      try {
        await handleAuthRedirect(url);
      } catch {
        // Never crash the shell over a malformed link; the user can still
        // sign in manually.
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      void process(url);
    });
    Linking.getInitialURL().then((url) => {
      void process(url);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getGuestMode().then((value) => {
      if (!cancelled) setGuestModeState(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A real session always wins over a stale guest flag.
  useEffect(() => {
    if (session) {
      setGuestModeState(false);
      setGuestMode(false);
    }
  }, [session]);

  if (authLoading || guestMode === null) {
    return <AuthGateLoading />;
  }

  const showApp = session !== null || guestMode;

  if (showApp) {
    return (
      <GameProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg.dark },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="auth/confirm" />
        </Stack>
      </GameProvider>
    );
  }

  return (
    <AuthFlow
      onAuthenticated={(isGuest: boolean) => {
        if (isGuest) {
          setGuestMode(true);
          setGuestModeState(true);
        }
        // For a real sign-in the session arrives via onAuthStateChange and
        // the session effect above switches the shell to the app.
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootShell />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
