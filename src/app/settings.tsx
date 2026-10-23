import { useState } from 'react';
import { ScrollView, View, TextInput, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper, GlassCard, H2, H3, Body, Button } from '@/components';
import { colors, spacing, borderRadius } from '@/styles/theme';
import { useGame } from '@/state/GameContext';

/**
 * Settings Screen
 * Username, unit preference and notification toggles.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { state, updateUsername, updateSettings } = useGame();
  const [name, setName] = useState(state.username);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    updateUsername(trimmed);
    Alert.alert('Saved', 'Your profile has been updated.');
    router.back();
  };

  return (
    <SafeAreaWrapper bgColor={colors.bg.dark}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: spacing.lg }}>
          <H2 color={colors.accent.cyan}>Settings</H2>
          <Body color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Personalise your empire
          </Body>
        </View>

        <GlassCard variant="bordered" padding={spacing.lg} style={{ marginBottom: spacing.lg }}>
          <H3 color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            👤 Display Name
          </H3>
          <TextInput
            placeholder="Your name"
            placeholderTextColor={colors.text.muted}
            value={name}
            onChangeText={setName}
            style={{
              backgroundColor: colors.bg.darker,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              color: colors.text.primary,
              borderWidth: 1,
              borderColor: colors.border,
              fontSize: 16,
            }}
          />
          <View style={{ marginTop: spacing.md }}>
            <Button label="Save" onPress={handleSave} variant="primary" size="md" fullWidth />
          </View>
        </GlassCard>

        <GlassCard padding={spacing.lg} style={{ marginBottom: spacing.lg }}>
          <H3 color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            ⚙️ Preferences
          </H3>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <Body color={colors.text.secondary}>Workout reminders</Body>
            <Switch
              value={state.settings.remindersEnabled}
              onValueChange={(v) => updateSettings({ remindersEnabled: v })}
              trackColor={{ false: colors.border, true: colors.accent.cyanDark }}
              thumbColor={colors.accent.cyan}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <Body color={colors.text.secondary}>Haptic feedback</Body>
            <Switch
              value={state.settings.hapticsEnabled}
              onValueChange={(v) => updateSettings({ hapticsEnabled: v })}
              trackColor={{ false: colors.border, true: colors.accent.cyanDark }}
              thumbColor={colors.accent.cyan}
            />
          </View>

          <Body color={colors.text.secondary} style={{ marginBottom: spacing.sm }}>
            Units
          </Body>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label="Metric (kg)"
              onPress={() => updateSettings({ units: 'metric' })}
              variant={state.settings.units === 'metric' ? 'primary' : 'outlined'}
              size="sm"
            />
            <Button
              label="Imperial (lb)"
              onPress={() => updateSettings({ units: 'imperial' })}
              variant={state.settings.units === 'imperial' ? 'primary' : 'outlined'}
              size="sm"
            />
          </View>
        </GlassCard>

        <GlassCard padding={spacing.lg} style={{ marginBottom: spacing.xxl }}>
          <H3 color={colors.text.primary} style={{ marginBottom: spacing.sm }}>
            💾 Storage
          </H3>
          <Body color={colors.text.secondary} style={{ fontSize: 13, lineHeight: 20 }}>
            Your workouts, gold, buildings and territories are saved on this device and restored
            automatically the next time you open the app.
          </Body>
        </GlassCard>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
