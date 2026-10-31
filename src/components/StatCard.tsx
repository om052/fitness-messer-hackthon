import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { GlassCard } from './GlassCard';
import { H4, Caption } from './Typography';
import { colors, spacing } from '@/styles/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 120,
  },
});

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Stat card for displaying game metrics
 * Used in Empire, Home, Profile screens
 * Example: Level, Gold, Exercises Completed
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  accent = false,
  style,
}) => {
  return (
    <GlassCard
      variant={accent ? 'bordered' : 'default'}
      padding={spacing.lg}
      style={[styles.container, style]}
    >
      <View style={{ justifyContent: 'space-between', height: '100%' }}>
        <Caption color={accent ? colors.accent.cyan : colors.text.secondary}>
          {icon && `${icon} `}
          {label.toUpperCase()}
        </Caption>
        <H4 color={accent ? colors.accent.cyan : colors.text.primary}>
          {value}
        </H4>
      </View>
    </GlassCard>
  );
};
