import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaWrapper, GlassCard, H2, Body, Button } from '@/components';
import { colors, spacing } from '@/styles/theme';

/**
 * Catch-all route for unknown deep links.
 */
export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaWrapper>
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
        <GlassCard variant="bordered" padding={spacing.xl}>
          <H2 color={colors.accent.cyan} style={{ marginBottom: spacing.md }}>
            🗺️ Lost Territory
          </H2>
          <Body color={colors.text.secondary} style={{ marginBottom: spacing.lg }}>
            This part of the map has not been claimed yet.
          </Body>
          <Button
            label="Back to Home"
            onPress={() => router.replace('/')}
            variant="primary"
            fullWidth
          />
        </GlassCard>
      </View>
    </SafeAreaWrapper>
  );
}
