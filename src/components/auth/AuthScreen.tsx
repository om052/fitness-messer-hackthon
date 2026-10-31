import React from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/styles/theme';

interface AuthScreenProps {
  children: React.ReactNode;
  /** When true content is centered vertically (welcome screen). */
  centered?: boolean;
  /** When true the screen background is transparent (backdrop shows through). */
  transparent?: boolean;
  testID?: string;
}

/**
 * Shared chrome for "Enter the Empire" screens: charcoal background,
 * layered surface, safe-area padding and keyboard avoidance.
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({
  children,
  centered = false,
  transparent = false,
  testID,
}) => (
  <SafeAreaView
    testID={testID}
    edges={['top', 'bottom']}
    style={{
      flex: 1,
      backgroundColor: transparent ? 'transparent' : colors.empire.charcoal,
    }}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          ...(centered
            ? { justifyContent: 'center', paddingVertical: spacing.xxl }
            : { paddingTop: spacing.xl, paddingBottom: spacing.xl }),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);

/**
 * Small, unobtrusive note shown on auth screens.
 */
export const LocalProgressNote: React.FC = () => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
    }}
  >
    <Text style={{ fontSize: 13, marginRight: 6 }}>💾</Text>
    <Text
      style={{
        color: colors.empire.stone,
        fontSize: 12.5,
      }}
    >
      Progress is saved locally on this device
    </Text>
  </View>
);
