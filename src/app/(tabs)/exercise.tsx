import { useState } from 'react';
import { ScrollView, View, TextInput, Alert } from 'react-native';
import { SafeAreaWrapper, GlassCard, H2, H3, Body, Button, StatCard } from '@/components';
import { colors, spacing, borderRadius } from '@/styles/theme';
import { useGame } from '@/state/GameContext';
import { GOLD_PER_REP } from '@/lib/game';

const EXERCISE_TYPES = ['Push-ups', 'Squats', 'Running', 'Pull-ups', 'Sit-ups', 'Walking'];

/**
 * Exercise Screen
 * Manual exercise logging. Every accepted workout feeds the shared game state,
 * which in turn drives gold, level, empire, map and achievements.
 */
export default function ExerciseScreen() {
  const { state } = useGame();
  const [exerciseType, setExerciseType] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('');

  const handleLogExercise = () => {
    Alert.alert(
      'Verification required',
      'Manual workout logging cannot award official rewards. Genuine server-side verification is required.'
    );
  };

  const inputStyle = {
    backgroundColor: colors.bg.darker,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  };

  return (
    <SafeAreaWrapper>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: spacing.lg }}>
          <H2 color={colors.accent.cyan}>Log Your Exercise</H2>
          <Body color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Every rep builds your empire
          </Body>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <StatCard label="Gold" value={state.gold} icon="💰" accent />
          <StatCard label="Total Reps" value={state.totalReps} icon="💪" />
        </View>

        {/* Exercise Input Form */}
        <GlassCard variant="bordered" padding={spacing.lg} style={{ marginBottom: spacing.lg }}>
          <H3 color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            💪 New Exercise Log
          </H3>

          <View style={{ marginBottom: spacing.md }}>
            <Body
              color={colors.text.secondary}
              style={{ marginBottom: spacing.sm, fontWeight: '600' }}
            >
              Exercise Type
            </Body>
            <TextInput
              placeholder="e.g., Push-ups, Running, Squats"
              placeholderTextColor={colors.text.muted}
              value={exerciseType}
              onChangeText={setExerciseType}
              style={inputStyle}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
              {EXERCISE_TYPES.map((t) => (
                <Button
                  key={t}
                  label={t}
                  onPress={() => setExerciseType(t)}
                  variant="outlined"
                  size="sm"
                />
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Body
                color={colors.text.secondary}
                style={{ marginBottom: spacing.sm, fontWeight: '600' }}
              >
                Reps
              </Body>
              <TextInput
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                style={inputStyle}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Body
                color={colors.text.secondary}
                style={{ marginBottom: spacing.sm, fontWeight: '600' }}
              >
                Sets
              </Body>
              <TextInput
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                value={sets}
                onChangeText={setSets}
                keyboardType="number-pad"
                style={inputStyle}
              />
            </View>
          </View>

          <Button
            label="Log Exercise"
            onPress={handleLogExercise}
            variant="primary"
            size="lg"
            fullWidth
          />
        </GlassCard>

        {/* Recent Logs */}
        {state.logs.length > 0 && (
          <View style={{ marginBottom: spacing.xxl }}>
            <H3 color={colors.text.primary} style={{ marginBottom: spacing.md }}>
              📝 Recent Logs
            </H3>
            {state.logs.map((log) => (
              <GlassCard key={log.id} padding={spacing.md} style={{ marginBottom: spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Body
                      color={colors.accent.cyan}
                      style={{ fontWeight: '600', marginBottom: spacing.xs }}
                    >
                      {log.type}
                    </Body>
                    <Body color={colors.text.secondary} style={{ fontSize: 13 }}>
                      {log.sets} sets × {log.reps} reps
                    </Body>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Body color={colors.success} style={{ fontSize: 13, fontWeight: '600' }}>
                      +{log.goldEarned} gold
                    </Body>
                    <Body color={colors.text.tertiary} style={{ fontSize: 12 }}>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Body>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Info Card */}
        <GlassCard variant="default" padding={spacing.md} style={{ marginBottom: spacing.lg }}>
          <Body color={colors.text.secondary} style={{ fontSize: 13, lineHeight: 20 }}>
            💡{' '}
            <Body color={colors.accent.cyan} style={{ fontWeight: '600' }}>
              Tip:
            </Body>{' '}
            Each rep earns {GOLD_PER_REP} gold. Log your exercises honestly — every workout
            strengthens your empire. No cheating allowed!
          </Body>
        </GlassCard>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
