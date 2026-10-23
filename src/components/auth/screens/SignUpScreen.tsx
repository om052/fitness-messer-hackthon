import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, spacing } from '@/styles/theme';
import { useAuth } from '@/state/AuthContext';
import { AuthScreen } from '../AuthScreen';
import { AuthField } from '../AuthField';
import { AuthButton } from '../AuthButton';
import { EmpireEmblem } from '../EmpireEmblem';

interface SignUpScreenProps {
  /** Called when the user is signed in immediately (verification not required). */
  onSuccess: () => void;
  /** Called when Supabase requires email verification — the honest next step. */
  onRequiresVerification: (email: string) => void;
  onBack: () => void;
  onNavigateToSignIn: () => void;
}

const MIN_PASSWORD_LENGTH = 6;
const MIN_PLAYER_NAME_LENGTH = 2;
const MAX_PLAYER_NAME_LENGTH = 24;

function playerNameProblems(rawName: string): string | null {
  const name = rawName.trim();
  if (!name) return 'Player Name is required.';
  if (name.length < MIN_PLAYER_NAME_LENGTH)
    return `Player Name must be at least ${MIN_PLAYER_NAME_LENGTH} characters.`;
  if (name.length > MAX_PLAYER_NAME_LENGTH)
    return `Player Name must be at most ${MAX_PLAYER_NAME_LENGTH} characters.`;
  return null;
}

function passwordProblems(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  return null;
}

/**
 * Screen C — Create Account.
 * Uses the existing Supabase client through AuthContext.signUp.
 * Shows the actual next step based on the Supabase response: if email
 * verification is required, the user is told so — registration is not
 * claimed to be complete.
 */
export function SignUpScreen({
  onSuccess,
  onRequiresVerification,
  onBack,
  onNavigateToSignIn,
}: SignUpScreenProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    playerName?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = (): boolean => {
    const next: {
      email?: string;
      playerName?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email.trim()))
      next.email = 'Enter a valid email address.';
    const nameProblem = playerNameProblems(playerName);
    if (nameProblem) next.playerName = nameProblem;
    const pwProblem = passwordProblems(password);
    if (pwProblem) next.password = pwProblem;
    if (confirmPassword !== password)
      next.confirmPassword = 'Passwords do not match.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await signUp(email.trim(), password, playerName.trim());
      if (result.error) {
        setError(result.error);
      } else if (result.needsEmailVerification) {
        onRequiresVerification(email.trim());
      } else {
        onSuccess();
      }
    } catch {
      // Never crash the app because an auth request fails.
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen testID="sign-up-screen">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to welcome"
        testID="sign-up-back"
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
          Found your empire
        </Text>
        <Text style={{ color: colors.empire.stone, fontSize: 15, marginTop: spacing.xs }}>
          Create an account to carry your legacy anywhere
        </Text>
      </View>

      {error ? (
        <View
          accessibilityRole="alert"
          testID="sign-up-error"
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
        testID="sign-up-email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@yourdomain.com"
      />
      <AuthField
        label="Player Name"
        testID="sign-up-player-name"
        value={playerName}
        onChangeText={setPlayerName}
        error={fieldErrors.playerName}
        autoCapitalize="words"
        autoComplete="nickname"
        maxLength={MAX_PLAYER_NAME_LENGTH}
        placeholder="Your name across the empire"
      />
      <AuthField
        label="Password"
        testID="sign-up-password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secure
        autoComplete="new-password"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
      />
      <AuthField
        label="Confirm Password"
        testID="sign-up-confirm-password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        secure
        autoComplete="new-password"
        placeholder="Repeat your password"
      />

      <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
        <AuthButton
          label="Create Your Account"
          onPress={handleSubmit}
          loading={loading}
          testID="sign-up-submit"
        />
        <AuthButton
          label="Already have an account? Sign in"
          variant="tertiary"
          onPress={onNavigateToSignIn}
          testID="sign-up-to-sign-in"
        />
      </View>
    </AuthScreen>
  );
}
