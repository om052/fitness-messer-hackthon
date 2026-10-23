import { useState } from 'react';
import { View, Text } from 'react-native';
import { colors, spacing } from '@/styles/theme';
import { AuthScreen, EmpireEmblem, AuthButton } from '../index';
import { WelcomeScreen } from './WelcomeScreen';
import { SignInScreen } from './SignInScreen';
import { SignUpScreen } from './SignUpScreen';

type AuthFlowStep = 'welcome' | 'sign-in' | 'sign-up' | 'verify-email';

/**
 * AuthFlow
 *
 * The unauthenticated experience. Rendered in place of the app content by
 * the root layout while no session exists. Guest mode is handled outside
 * this component (the root layout stores the guest decision and renders
 * the existing app, since guest progress is independent of accounts).
 */
export function AuthFlow({
  onAuthenticated,
}: {
  /**
   * Called when the user can enter the app: `true` for guest mode,
   * `false` when a real session was established (sign-in or immediate
   * sign-up without verification).
   */
  onAuthenticated: (isGuest: boolean) => void;
}) {
  const [step, setStep] = useState<AuthFlowStep>('welcome');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.empire.charcoal }}>
      {step === 'welcome' && (
        <WelcomeScreen
          onCreateAccount={() => setStep('sign-up')}
          onSignIn={() => setStep('sign-in')}
          onContinueAsGuest={() => onAuthenticated(true)}
        />
      )}

      {step === 'sign-in' && (
        <SignInScreen
          onSuccess={() => onAuthenticated(false)}
          onBack={() => setStep('welcome')}
          onNavigateToSignUp={() => setStep('sign-up')}
        />
      )}

      {step === 'sign-up' && (
        <SignUpScreen
          onSuccess={() => onAuthenticated(false)}
          onRequiresVerification={(email) => {
            setPendingEmail(email);
            setStep('verify-email');
          }}
          onBack={() => setStep('welcome')}
          onNavigateToSignIn={() => setStep('sign-in')}
        />
      )}

      {step === 'verify-email' && (
        <VerifyEmailNotice
          email={pendingEmail ?? ''}
          onBackToSignIn={() => setStep('sign-in')}
        />
      )}
    </View>
  );
}

/**
 * Honest "check your inbox" screen shown when Supabase reports that email
 * confirmation is required. Registration is NOT treated as complete.
 */
function VerifyEmailNotice({
  email,
  onBackToSignIn,
}: {
  email: string;
  onBackToSignIn: () => void;
}) {
  return (
    <AuthScreen centered testID="verify-email-screen">
      <View style={{ alignItems: 'center' }}>
        <EmpireEmblem size={64} />
        <Text
          accessibilityRole="header"
          style={{
            color: colors.empire.ivory,
            fontSize: 28,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: spacing.lg,
          }}
        >
          Verify your email
        </Text>
        <Text
          style={{
            color: colors.empire.stone,
            fontSize: 15,
            lineHeight: 22,
            textAlign: 'center',
            marginTop: spacing.md,
          }}
        >
          {email
            ? `We sent a verification link to ${email}. Confirm your email, then sign in to claim your throne.`
            : 'We sent a verification link to your email. Confirm it, then sign in to claim your throne.'}
        </Text>
        <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.md }}>
          <AuthButton
            label="Back to Sign In"
            onPress={onBackToSignIn}
            testID="verify-email-back"
          />
        </View>
      </View>
    </AuthScreen>
  );
}
