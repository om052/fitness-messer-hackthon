import { ScrollView, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper, GlassCard, H2, H3, Body, Button, StatCard } from '@/components';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, spacing } from '@/styles/theme';
import { useGame } from '@/state/GameContext';
import { useAuth, playerNameFromUser } from '@/state/AuthContext';

/**
 * Profile Screen
 * Live user profile, stats and achievement progress.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { state, getAchievements, resetProgress } = useGame();
  const { user } = useAuth();

  // The registered Player Name lives in Supabase user metadata, so it
  // follows the account across devices and restarts. It falls back to the
  // local game-state username (which itself defaults to "FitnessWarrior")
  // for accounts created before the registration field existed, and for
  // guest mode — no private account data is ever rendered here.
  const playerName = playerNameFromUser(user) ?? state.username;
  const achievements = getAchievements();
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  const handleReset = () => {
    Alert.alert(
      'Reset progress',
      'This permanently deletes all workouts, gold, buildings and territories. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetProgress },
      ]
    );
  };

  return (
    <SafeAreaWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View
          style={{
            alignItems: 'center',
            marginBottom: spacing.lg,
            paddingBottom: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.accent.cyan,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <H2 color={colors.bg.dark}>👤</H2>
          </View>
          <H2 color={colors.text.primary} style={{ marginBottom: spacing.xs }}>
            {playerName}
          </H2>
          <Body color={colors.accent.cyan} style={{ fontWeight: '600' }}>
            Level {state.level} • {state.totalWorkouts} workouts
          </Body>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <StatCard label="Reps" value={state.totalReps} icon="💪" accent />
          <StatCard label="Streak" value={`${state.streak}d`} icon="🔥" />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <StatCard label="Workouts" value={state.totalWorkouts} icon="📝" />
          <StatCard label="Level" value={state.level} icon="👑" />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <StatCard label="Gold" value={state.gold} icon="💰" />
          <StatCard
            label="Territories"
            value={state.territories.filter((t) => t.claimed).length}
            icon="🗺️"
          />
        </View>

        {/* Unlocked Achievements */}
        <View style={{ marginBottom: spacing.lg }}>
          <H3 color={colors.success} style={{ marginBottom: spacing.md }}>
            🏆 Achievements ({unlocked.length})
          </H3>
          {unlocked.length > 0 ? (
            unlocked.map((achievement) => (
              <GlassCard
                key={achievement.id}
                variant="bordered"
                padding={spacing.md}
                style={{ marginBottom: spacing.md }}
              >
                <Body
                  color={colors.accent.cyan}
                  style={{ fontWeight: '600', marginBottom: spacing.xs, fontSize: 18 }}
                >
                  {achievement.emoji} {achievement.name}
                </Body>
                <Body color={colors.text.secondary} style={{ fontSize: 13 }}>
                  {achievement.description}
                </Body>
              </GlassCard>
            ))
          ) : (
            <Body color={colors.text.muted} style={{ marginBottom: spacing.md }}>
              No achievements unlocked yet. Log your first workout to get started!
            </Body>
          )}
        </View>

        {/* Locked Achievements */}
        {locked.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <H3 color={colors.text.primary} style={{ marginBottom: spacing.md }}>
              🔒 Locked Achievements ({locked.length})
            </H3>
            {locked.map((achievement) => (
              <GlassCard key={achievement.id} padding={spacing.md} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Body
                      color={colors.text.tertiary}
                      style={{ fontWeight: '600', marginBottom: spacing.xs, fontSize: 18 }}
                    >
                      {achievement.emoji} {achievement.name}
                    </Body>
                    <Body color={colors.text.muted} style={{ fontSize: 13 }}>
                      {achievement.description}
                    </Body>
                  </View>
                  <Body color={colors.text.muted} style={{ fontSize: 12, fontWeight: '600' }}>
                    {achievement.current}/{achievement.goal}
                  </Body>
                </View>
                <View style={{ marginTop: spacing.sm }}>
                  <ProgressBar
                    percent={(achievement.current / achievement.goal) * 100}
                    color={colors.text.tertiary}
                    height={6}
                  />
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ marginBottom: spacing.xxl, gap: spacing.md }}>
          <Button
            label="Settings"
            onPress={() => router.push('/settings')}
            variant="secondary"
            fullWidth
          />
          <Button
            label="Reset Progress"
            onPress={handleReset}
            variant="outlined"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
