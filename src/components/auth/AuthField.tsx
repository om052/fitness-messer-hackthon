import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/styles/theme';

interface AuthFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  error?: string | null;
  secure?: boolean;
  testID?: string;
}

/**
 * Labelled input field for auth screens with focus states, optional
 * show/hide toggle for secrets, and inline validation errors.
 */
export const AuthField: React.FC<AuthFieldProps> = ({
  label,
  error,
  secure = false,
  testID,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(!secure);

  const containerStyle: ViewStyle = {
    marginBottom: spacing.md,
  };

  const inputWrapper: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.empire.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: error
      ? colors.empire.danger
      : focused
        ? colors.empire.lime
        : colors.empire.border,
    paddingHorizontal: spacing.md,
    height: 52,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    color: colors.empire.ivory,
    fontSize: 16,
    paddingVertical: 0,
  };

  return (
    <View style={containerStyle}>
      <Text
        style={{
          color: colors.empire.stone,
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginBottom: spacing.xs + 2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View style={inputWrapper}>
        <TextInput
          {...inputProps}
          testID={testID}
          secureTextEntry={secure && !reveal}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.empire.stone}
          style={inputStyle}
          keyboardAppearance="dark"
        />
        {secure && (
          <Pressable
            onPress={() => setReveal((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
            testID={testID ? `${testID}-toggle` : undefined}
            hitSlop={12}
            style={{ paddingHorizontal: spacing.xs }}
          >
            <Ionicons
              name={reveal ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.empire.stone}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text
          testID={testID ? `${testID}-error` : undefined}
          accessibilityRole="alert"
          style={{
            color: colors.empire.danger,
            fontSize: 13,
            marginTop: spacing.sm,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};
