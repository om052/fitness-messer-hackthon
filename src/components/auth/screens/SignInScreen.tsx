import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, spacing } from '@/styles/theme';
import { useAuth } from '@/state/AuthContext';
import { AuthScreen } from '../AuthScreen';
import { AuthField } from '../AuthField';
import { AuthButton } from '../AuthButton';
import { EmpireEmblem } from '../EmpireEmblem';

interface SignInScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  onNavigateToSignUp: () => void;
}

/**
 * Screen B — Sign In.
 * Uses the existing Supabase client through AuthContext.signIn.
 */
export function SignInScreen({
  onSuccess,
  onBack,
  onNavigateToSignUp,
}: SignInScreenProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validate = (): boolean => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email.trim()))
      next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const { error: authError } = await signIn(email.trim(), password);
      if (authError) {
        setError(authError);
      } else {
        onSuccess();
      }
    } catch {
      // Never crash the app because an auth request fails.
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen testID="sign-in-screen">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to welcome"
        testID="sign-in-back"
        style={{ marginBottom: spacing.md, minHeight: 44, justifyContent: 'center' }}
      >
        <Text style={{ color: colors.empire.stone, fontSize: 15 }}>← Back</Text>
      </Pressable>

      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <EmpireEmblem size={52} />
        <Text
          accessibilityRole="header"
          style={{
            color: colors.empire.ivory,
            fontSize: 28,
            fontWeight: '800',
            marginTop: spacing.md,
          }}
        >
          Enter your realm
        </Text>
        <Text style={{ color: colors.empire.stone, fontSize: 15, marginTop: spacing.xs }}>
          Sign in to continue your legacy
        </Text>
      </View>

      {error ? (
        <View
          accessibilityRole="alert"
          testID="sign-in-error"
          style={{
            backgroundColor: 'rgba(229, 99, 79, 0.12)',
            borderColor: colors.empire.danger,
            borderWidth: 1,
            borderRadius: 8,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: colors.empire.danger, fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}

      <AuthField
        label="Email"
        testID="sign-in-email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@yourdomain.com"
      />
      <AuthField
        label="Password"
        testID="sign-in-password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secure
        autoComplete="password"
        placeholder="Your password"
      />

      <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
        <AuthButton
          label="Sign In"
          onPress={handleSubmit}
          loading={loading}
          testID="sign-in-submit"
        />
        <AuthButton
          label="Create a new account"
          variant="tertiary"
          onPress={onNavigateToSignUp}
          testID="sign-in-to-sign-up"
        />
      </View>
    </AuthScreen>
  );
}
