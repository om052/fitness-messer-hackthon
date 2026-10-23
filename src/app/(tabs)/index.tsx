import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper, GlassCard, H2, H3, Body, StatCard, Button } from '@/components';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, spacing } from '@/styles/theme';
import { useGame } from '@/state/GameContext';
import { levelProgress, repsNeededForNextLevel } from '@/lib/game';

/**
 * Home Screen
 * Dashboard showing live stats and the daily challenge.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { state, getDailyChallenge, getAchievements } = useGame();
  const challenge = getDailyChallenge();
  const achievements = getAchievements();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <SafeAreaWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: spacing.lg }}>
          <H2 color={colors.accent.cyan}>Welcome Back!</H2>
          <Body color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Build your empire through fitness
          </Body>
        </View>

        {/* Quick Stats Grid */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <StatCard label="Level" value={state.level} icon="🏰" accent />
          <StatCard label="Streak" value={`${state.streak}d`} icon="🔥" />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <StatCard label="Gold" value={state.gold} icon="💰" />
          <StatCard label="Today" value={challenge.current} icon="💪" />
        </View>

        {/* Daily Challenge Card */}
        <GlassCard variant="elevated" padding={spacing.lg} style={{ marginBottom: spacing.lg }}>
          <H3 color={colors.accent.cyan} style={{ marginBottom: spacing.md }}>
            ⚡ Daily Challenge
          </H3>
          <Body color={colors.text.secondary} style={{ marginBottom: spacing.md }}>
            Complete {challenge.target} exercises today to earn 100 gold and unlock new
            territories!
          </Body>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Body
                color={colors.accent.cyan}
                style={{ marginBottom: spacing.xs, fontWeight: '600' }}
              >
                Progress
              </Body>
              <ProgressBar
                percent={(challenge.current / challenge.target) * 100}
                color={challenge.completed ? colors.success : colors.accent.cyan}
              />
            </View>
            <Body color={colors.text.tertiary} style={{ minWidth: 40, textAlign: 'right' }}>
              {challenge.current}/{challenge.target}
            </Body>
          </View>
          {challenge.completed && (
            <Body color={colors.success} style={{ marginTop: spacing.sm, fontSize: 13 }}>
              ✅ Challenge complete — bonus gold awarded!
            </Body>
          )}
        </GlassCard>

        {/* Level Progress */}
        <GlassCard variant="bordered" padding={spacing.lg} style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Body color={colors.text.secondary} style={{ fontWeight: '600' }}>
              Level {state.level} progress
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

        {/* Quick Action Cards */}
        <View style={{ marginBottom: spacing.lg }}>
          <H3 color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            Quick Actions
          </H3>
          <GlassCard
            variant="bordered"
            padding={spacing.md}
            style={{ marginBottom: spacing.md }}
            onPress={() => router.push('/exercise')}
          >
            <Body
              color={colors.accent.cyan}
              style={{ fontWeight: '600', marginBottom: spacing.sm }}
            >
              📝 Log Exercise
            </Body>
            <Body color={colors.text.secondary} style={{ fontSize: 13 }}>
              Record your workout and watch your empire grow
            </Body>
          </GlassCard>

          <GlassCard
            variant="bordered"
            padding={spacing.md}
            style={{ marginBottom: spacing.md }}
            onPress={() => router.push('/empire')}
          >
            <Body
              color={colors.accent.cyan}
              style={{ fontWeight: '600', marginBottom: spacing.sm }}
            >
              🏰 Expand Empire
            </Body>
            <Body color={colors.text.secondary} style={{ fontSize: 13 }}>
              Use your gold to build and unlock new territories
            </Body>
          </GlassCard>

          <GlassCard
            variant="bordered"
            padding={spacing.md}
            onPress={() => router.push('/profile')}
          >
            <Body
              color={colors.accent.cyan}
              style={{ fontWeight: '600', marginBottom: spacing.sm }}
            >
              🏆 Achievements
            </Body>
            <Body color={colors.text.secondary} style={{ fontSize: 13 }}>
              {unlockedCount} of {achievements.length} badges unlocked
            </Body>
          </GlassCard>
        </View>

        {/* Call to Action */}
        <View style={{ marginBottom: spacing.xxl }}>
          <Button
            label="Start Exercise Session"
            onPress={() => router.push('/exercise')}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
