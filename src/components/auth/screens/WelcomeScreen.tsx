import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/styles/theme';
import { AuthScreen, LocalProgressNote } from '../AuthScreen';
import { AuthButton } from '../AuthButton';
import { EmpireEmblem } from '../EmpireEmblem';
import { EmpireBackdrop } from '../EmpireBackdrop';

interface WelcomeScreenProps {
  onCreateAccount: () => void;
  onSignIn: () => void;
  onContinueAsGuest: () => void;
}

const styles = StyleSheet.create({
  brand: {
    color: colors.empire.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: spacing.md,
  },
  headline: {
    color: colors.empire.ivory,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
  },
  headlineAccent: {
    color: colors.empire.lime,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: spacing.md,
  },
  tagline: {
    color: colors.empire.stone,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});

/**
 * Screen A — Welcome / "Enter the Empire".
 * Cinematic kingdom backdrop with the Fitness Messer emblem and the three
 * entry actions. Guest entry stays fully discoverable.
 */
export function WelcomeScreen({
  onCreateAccount,
  onSignIn,
  onContinueAsGuest,
}: WelcomeScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.empire.charcoal }}>
      <EmpireBackdrop>
        <AuthScreen centered testID="welcome-screen" transparent>
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <EmpireEmblem size={72} />
            <Text style={styles.brand}>FITNESS MESSER</Text>
          </View>

          <Text accessibilityRole="header" style={styles.headline}>
            Your strength.
          </Text>
          <Text accessibilityRole="header" style={styles.headlineAccent}>
            Your kingdom.
          </Text>

          <Text style={styles.tagline}>
            Every workout builds your legacy. Every session moves your empire
            forward.
          </Text>

          <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            <AuthButton
              label="Create Your Account"
              onPress={onCreateAccount}
              testID="welcome-create-account"
            />
            <AuthButton
              label="Sign In"
              variant="secondary"
              onPress={onSignIn}
              testID="welcome-sign-in"
            />
            <AuthButton
              label="Continue as Guest"
              variant="tertiary"
              onPress={onContinueAsGuest}
              testID="welcome-guest"
            />
          </View>

          <LocalProgressNote />
        </AuthScreen>
      </EmpireBackdrop>
    </View>
  );
}
