import { ScrollView, View, Alert } from 'react-native';
import { SafeAreaWrapper, GlassCard, H2, H3, Body, StatCard, Button } from '@/components';
import { colors, spacing } from '@/styles/theme';
import { useGame } from '@/state/GameContext';
import { TERRITORIES } from '@/lib/game';

/**
 * Map Screen
 * Territories are claimed with gold once enough total reps have been logged.
 */
export default function MapScreen() {
  const { state, claimTerritory } = useGame();

  const handleClaim = (territoryId: string) => {
    const result = claimTerritory(territoryId);
    Alert.alert(result.ok ? 'Territory claimed' : 'Cannot claim', result.message);
  };

  const claimed = state.territories.filter((t) => t.claimed);
  const unclaimed = state.territories.filter((t) => !t.claimed);

  return (
    <SafeAreaWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: spacing.lg }}>
          <H2 color={colors.accent.cyan}>World Map</H2>
          <Body color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Expand your territory through dedication
          </Body>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <StatCard label="Claimed" value={claimed.length} icon="🗺️" accent />
          <StatCard label="Gold" value={state.gold} icon="💰" />
        </View>

        {/* Claimed Territories */}
        <View style={{ marginBottom: spacing.lg }}>
          <H3 color={colors.success} style={{ marginBottom: spacing.md }}>
            ✨ Your Territories ({claimed.length})
          </H3>
          {claimed.length > 0 ? (
            claimed.map((territoryState) => {
              const def = TERRITORIES.find((t) => t.id === territoryState.id);
              if (!def) return null;
              return (
                <GlassCard
                  key={territoryState.id}
                  variant="bordered"
                  padding={spacing.md}
                  style={{ marginBottom: spacing.md }}
                >
                  <Body
                    color={colors.accent.cyan}
                    style={{ fontWeight: '600', marginBottom: spacing.xs, fontSize: 18 }}
                  >
                    {def.emoji} {def.name}
                  </Body>
                  <Body color={colors.text.secondary} style={{ fontSize: 13, marginBottom: spacing.sm }}>
                    {def.description}
                  </Body>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.md,
                      paddingTop: spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Body color={colors.text.tertiary} style={{ fontSize: 12 }}>
                      Level {territoryState.level}
                    </Body>
                    <Body color={colors.success} style={{ fontSize: 12, fontWeight: '600' }}>
                      Claimed ✓
                    </Body>
                  </View>
                </GlassCard>
              );
            })
          ) : (
            <Body color={colors.text.muted} style={{ marginBottom: spacing.md }}>
              No territories claimed yet. Start logging exercises!
            </Body>
          )}
        </View>

        {/* Unclaimed Territories */}
        <View style={{ marginBottom: spacing.xxl }}>
          <H3 color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            🔒 Unexplored Territories ({unclaimed.length})
          </H3>
          {unclaimed.map((territoryState) => {
            const def = TERRITORIES.find((t) => t.id === territoryState.id);
            if (!def) return null;
            const unlocked = state.totalReps >= def.unlockAt;
            const affordable = state.gold >= def.cost;
            return (
              <GlassCard key={territoryState.id} padding={spacing.md} style={{ marginBottom: spacing.md }}>
                <Body
                  color={unlocked ? colors.text.tertiary : colors.text.muted}
                  style={{ fontWeight: '600', marginBottom: spacing.xs, fontSize: 18 }}
                >
                  {def.emoji} {def.name}
                </Body>
                <Body color={colors.text.muted} style={{ fontSize: 13, marginBottom: spacing.sm }}>
                  {def.description}
                </Body>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    paddingTop: spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Body color={colors.text.tertiary} style={{ fontSize: 12 }}>
                    Level {def.level}
                  </Body>
                  {unlocked ? (
                    <Body color={colors.warning} style={{ fontSize: 12, fontWeight: '600' }}>
                      {def.cost} gold to claim
                    </Body>
                  ) : (
                    <Body color={colors.warning} style={{ fontSize: 12, fontWeight: '600' }}>
                      🔒 {def.unlockAt - state.totalReps} reps away
                    </Body>
                  )}
                </View>
                {unlocked && (
                  <Button
                    label={`Claim — ${def.cost} gold`}
                    onPress={() => handleClaim(territoryState.id)}
                    variant={affordable ? 'primary' : 'outlined'}
                    size="sm"
                    disabled={!affordable}
                    fullWidth
                  />
                )}
              </GlassCard>
            );
          })}
        </View>

        {/* Info Card */}
        <GlassCard variant="default" padding={spacing.md} style={{ marginBottom: spacing.lg }}>
          <Body color={colors.text.secondary} style={{ fontSize: 13, lineHeight: 20 }}>
            💡{' '}
            <Body color={colors.accent.cyan} style={{ fontWeight: '600' }}>
              Expansion Guide:
            </Body>{' '}
            Claim new territories by reaching exercise milestones and spending gold. Each territory
            offers unique rewards!
          </Body>
        </GlassCard>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
