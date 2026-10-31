import React from 'react';
import { SafeAreaView, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/styles/theme';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  bgColor?: string;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  paddingHorizontal?: number;
  style?: ViewStyle;
}

export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  bgColor = colors.bg.dark,
  edges = ['top', 'left', 'right'],
  paddingHorizontal = spacing.md,
  style,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: bgColor,
    paddingHorizontal,
    paddingTop: edges.includes('top') ? insets.top : spacing.md,
    paddingBottom: edges.includes('bottom') ? insets.bottom : spacing.md,
  };

  return (
    <SafeAreaView style={[containerStyle, style]}>
      {children}
    </SafeAreaView>
  );
};
