import { ScrollView, View, Alert } from 'react-native';
import { SafeAreaWrapper, GlassCard, H2, H3, Body, StatCard, Button } from '@/components';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, spacing } from '@/styles/theme';
import { useGame } from '@/state/GameContext';
import { BUILDINGS, buildingCost, levelProgress, repsNeededForNextLevel } from '@/lib/game';

/**
 * Empire Screen
 * Shows the player's kingdom with buildings that can be upgraded with gold
 * earned from workouts. Buildings unlock as total reps increase.
 */
export default function EmpireScreen() {
  const { state, upgradeBuilding } = useGame();

  const handleUpgrade = (buildingId: string) => {
    const result = upgradeBuilding(buildingId);
    Alert.alert(result.ok ? 'Upgrade complete' : 'Cannot upgrade', result.message);
  };

  return (
    <SafeAreaWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: spacing.lg }}>
          <H2 color={colors.accent.cyan}>Your Empire</H2>
          <Body color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Level {state.level} • {state.totalReps} total reps
          </Body>
        </View>

        {/* Empire Stats */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <StatCard label="Level" value={state.level} icon="👑" accent />
          <StatCard label="Gold" value={state.gold} icon="💰" />
        </View>

        {/* Empire Progress Bar */}
        <GlassCard variant="bordered" padding={spacing.lg} style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Body color={colors.text.secondary} style={{ fontWeight: '600' }}>
              Total Reps Milestone
            </Body>
            <Body color={colors.text.tertiary} style={{ fontSize: 12 }}>
              {repsNeededForNextLevel(state.totalReps) > 0
                ? `${repsNeededForNextLevel(state.totalReps)} reps to level ${state.level + 1}`
                : 'Max level reached'}
            </Body>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ProgressBar percent={levelProgress(state.totalReps)} />
          </View>
        </GlassCard>

        {/* Buildings */}
        <View style={{ marginBottom: spacing.xxl }}>
          <H3 color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            🏛️ Buildings
          </H3>
          {BUILDINGS.map((def) => {
            const current = state.buildings.find((b) => b.id === def.id);
            const level = current?.level ?? 0;
            const unlocked = state.totalReps >= def.unlockAt;
            const maxed = level >= def.maxLevel;
            const cost = buildingCost(def, level);
            const affordable = state.gold >= cost;

            return (
              <GlassCard
                key={def.id}
                variant={level > 0 ? 'bordered' : 'default'}
                padding={spacing.md}
                style={{ marginBottom: spacing.md }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Body
                      color={unlocked ? colors.accent.cyan : colors.text.muted}
                      style={{ fontWeight: '600', marginBottom: spacing.xs, fontSize: 16 }}
                    >
                      {def.emoji} {def.name}
                    </Body>
                    <Body color={colors.text.secondary} style={{ fontSize: 13 }}>
                      {def.description}
                    </Body>
                    <Body color={colors.text.tertiary} style={{ fontSize: 12, marginTop: spacing.xs }}>
                      {level > 0
                        ? `Level ${level} of ${def.maxLevel}`
                        : `Unlocks at ${def.unlockAt} reps`}
                    </Body>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    {level > 0 ? (
                      <Body color={colors.success} style={{ fontWeight: '700', fontSize: 13 }}>
                        Built ✓
                      </Body>
                    ) : unlocked ? (
                      <Body color={colors.warning} style={{ fontWeight: '700', fontSize: 13 }}>
                        Ready
                      </Body>
                    ) : (
                      <Body color={colors.text.muted} style={{ fontWeight: '700', fontSize: 13 }}>
                        🔒 Locked
                      </Body>
                    )}
                  </View>
                </View>

                {unlocked && !maxed && (
                  <View style={{ marginTop: spacing.md }}>
                    <Button
                      label={`Upgrade — ${cost} gold`}
                      onPress={() => handleUpgrade(def.id)}
                      variant={affordable ? 'primary' : 'outlined'}
                      size="sm"
                      disabled={!affordable}
                      fullWidth
                    />
                  </View>
                )}
              </GlassCard>
            );
          })}
        </View>

        {/* Info */}
        <GlassCard variant="default" padding={spacing.md} style={{ marginBottom: spacing.lg }}>
          <Body color={colors.text.secondary} style={{ fontSize: 13, lineHeight: 20 }}>
            💡{' '}
            <Body color={colors.accent.cyan} style={{ fontWeight: '600' }}>
              How it works:
            </Body>{' '}
            Log exercises to earn gold and reps. Reach rep milestones to unlock buildings, then
            spend gold to upgrade them and grow your empire!
          </Body>
        </GlassCard>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
