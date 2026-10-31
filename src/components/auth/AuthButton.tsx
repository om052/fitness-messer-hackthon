import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/styles/theme';

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  testID?: string;
}

/**
 * Large touch-target button for the "Enter the Empire" auth screens.
 * - primary: lime background, near-black label (main action)
 * - secondary: bordered gold surface (alternate action)
 * - tertiary: plain text link (guest entry, navigation links)
 */
export const AuthButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  testID,
}) => {
  const inactive = disabled || loading;

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.empire.lime,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.empire.gold,
    },
    tertiary: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      minHeight: 44,
    },
  };

  const labelColor: Record<string, string> = {
    primary: colors.empire.nearBlack,
    secondary: colors.empire.gold,
    tertiary: colors.empire.stone,
  };

  const labelStyle: TextStyle = {
    color: labelColor[variant],
    fontSize: variant === 'tertiary' ? 15 : 17,
    fontWeight: variant === 'tertiary' ? '500' : '700',
    letterSpacing: variant === 'primary' ? 0.5 : 0,
  };

  const baseStyle: ViewStyle = {
    borderRadius: borderRadius.md,
    minHeight: variant === 'tertiary' ? 44 : 56,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : 'auto',
    opacity: inactive ? 0.45 : 1,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        baseStyle,
        variantStyles[variant],
        { opacity: pressed && !inactive ? 0.82 : baseStyle.opacity },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={labelColor[variant]}
          size="small"
          testID={testID ? `${testID}-spinner` : undefined}
        />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </Pressable>
  );
};
