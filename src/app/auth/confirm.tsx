import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { colors, spacing } from '@/styles/theme';
import {
  handleAuthRedirect,
  AUTH_REDIRECT_PATH,
} from '@/lib/authRedirect';

/**
 * Email-confirmation landing route.
 *
 * Supabase's confirmation email redirects to `fitnessmesser://auth/confirm?...`.
 * This route receives that deep link, hands the parameters to
 * handleAuthRedirect (which exchanges them for a real session), and then
 * routes the user to the right place. A redirect alone does not create a
 * session — this callback step is mandatory.
 *
 * Expo Router also forwards deep-link query/fragment parameters here, so
 * the same handling works whether the link arrives via cold start or while
 * the app is already running.
 */
export default function AuthConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Some Android link shapes only surface through Linking when the app is
    // already running, so a URL string is constructed from route params OR
    // the initial URL, whichever carries auth parameters.
    let cancelled = false;

    (async () => {
      const initial = await Linking.getInitialURL();
      const candidate =
        Object.keys(params).length > 0
          ? `${AUTH_REDIRECT_PATH}#${Object.entries(params)
              .map(([k, v]) => `${k}=${String(v)}`)
              .join('&')}`
          : initial;

      const result = candidate
        ? await handleAuthRedirect(candidate)
        : { status: 'invalid' as const };

      if (cancelled) return;

      // Not our link: ignore silently and return to the auth flow.
      if (result.status === 'ignored') {
        router.replace('/(tabs)');
        return;
      }

      if (result.status === 'signed-in') {
        setStatus('done');
        setMessage('Email confirmed! Welcome to the empire. Taking you in…');
        // The root layout switches to the app automatically once the session
        // event from handleAuthRedirect propagates.
        setTimeout(() => router.replace('/(tabs)'), 1200);
        return;
      }

      // Invalid, expired, reused, or already-confirmed links.
      setStatus('error');
      setMessage(
        result.message ??
          'Could not complete email confirmation. Please try signing in.'
      );
    })();

    return () => {
      cancelled = true;
    };
    // Params are read once on mount; deep links re-mount this screen.
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.empire.charcoal,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
      }}
    >
      {status === 'working' && (
        <ActivityIndicator size="large" color={colors.empire.gold ?? colors.accent.cyan} />
      )}

      <Text
        accessibilityRole="header"
        style={{
          color: status === 'error' ? colors.empire.danger : colors.empire.ivory,
          fontSize: 24,
          fontWeight: '800',
          textAlign: 'center',
          marginTop: spacing.lg,
        }}
      >
        {status === 'working'
          ? 'Confirming your email…'
          : status === 'done'
            ? 'Email confirmed'
            : 'Confirmation problem'}
      </Text>

      {message ? (
        <Text
          style={{
            color: colors.empire.stone,
            fontSize: 15,
            lineHeight: 22,
            textAlign: 'center',
            marginTop: spacing.md,
          }}
        >
          {message}
        </Text>
      ) : null}

      {status === 'error' ? (
        <Text
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="link"
          style={{
            color: colors.empire.gold ?? colors.accent.cyan,
            fontSize: 16,
            fontWeight: '600',
            marginTop: spacing.xl,
          }}
        >
          Go to sign in →
        </Text>
      ) : null}
    </View>
  );
}
