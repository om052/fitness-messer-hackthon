import React from 'react';
import {
  Pressable,
  Text,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/styles/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Reusable Button component
 * Variants:
 * - primary: Cyan background (main actions)
 * - secondary: Purple background (secondary actions)
 * - outlined: Transparent with cyan border
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const sizeStyles = {
    sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: 14,
    },
    md: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: 16,
    },
    lg: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      fontSize: 18,
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: colors.secondary,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    },
  };

  const sizeStyle = sizeStyles[size];
  const variantStyle = variantStyles[variant];

  const buttonStyle: ViewStyle = {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    ...sizeStyle,
    ...variantStyle,
  };

  const textColor =
    variant === 'outlined' ? colors.primary : colors.text.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        buttonStyle,
        {
          opacity: pressed && !disabled ? 0.8 : buttonStyle.opacity,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={[
            {
              color: textColor,
              fontSize: sizeStyle.fontSize,
              fontWeight: '600',
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};
