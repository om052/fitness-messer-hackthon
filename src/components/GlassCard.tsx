import React from 'react';
import { View, ViewStyle, Pressable, StyleProp } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/styles/theme';

interface GlassCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: number;
}

/**
 * Premium card component with dark theme
 * Variant options:
 * - default: Solid background with subtle shadow
 * - bordered: Dark background with cyan border
 * - elevated: More prominent shadow, lifted appearance
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
  padding = spacing.md,
}) => {
  const baseStyle: ViewStyle = {
    backgroundColor: colors.bg.card,
    borderRadius: borderRadius.lg,
    padding,
    ...shadows.md,
  };

  const variantStyle: ViewStyle = {
    default: {},
    bordered: {
      borderWidth: 1,
      borderColor: colors.accent.cyan,
      shadowOpacity: 0,
      elevation: 0,
    },
    elevated: {
      ...shadows.lg,
    },
  }[variant];

  const containerStyle = [baseStyle, variantStyle, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          {
            backgroundColor: pressed ? colors.bg.hover : colors.bg.card,
          },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};
