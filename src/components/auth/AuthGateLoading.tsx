import { View, ActivityIndicator, Text } from 'react-native';
import { colors, spacing } from '@/styles/theme';
import { EmpireBackdrop } from './EmpireBackdrop';

/**
 * Full-screen loading state shown while the initial auth session is being
 * resolved. Prevents any flash of the welcome screen before authentication
 * state is known. Uses a locally drawn backdrop — never a remote image.
 */
export function AuthGateLoading() {
  return (
    <View
      testID="auth-gate-loading"
      style={{ flex: 1, backgroundColor: colors.empire.nearBlack }}
    >
      <EmpireBackdrop>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: spacing.xxl,
          }}
        >
          <Text
            style={{
              color: colors.empire.ivory,
              fontSize: 22,
              fontWeight: '700',
              letterSpacing: 3,
              marginBottom: spacing.md,
            }}
          >
            FITNESS MESSER
          </Text>
          <ActivityIndicator color={colors.empire.lime} size="large" />
        </View>
      </EmpireBackdrop>
    </View>
  );
}
