import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { colors, borderRadius } from '@/styles/theme';

interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Horizontal progress bar used for level, challenge and achievement progress.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  color = colors.accent.cyan,
  height = 8,
  style,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={[
        {
          height,
          backgroundColor: colors.bg.darker,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          height: '100%',
          width: `${clamped}%`,
          backgroundColor: color,
          borderRadius: borderRadius.full,
        }}
      />
    </View>
  );
};
