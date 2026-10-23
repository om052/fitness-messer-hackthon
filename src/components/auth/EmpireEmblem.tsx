import React from 'react';
import { Text } from 'react-native';

/**
 * Heraldic emblem for Fitness Messer.
 * A shield sigil rendered as a glyph so it never depends on remote
 * image loading or bundled assets.
 */
export const EmpireEmblem: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <Text
    testID="empire-emblem"
    accessibilityLabel="Fitness Messer emblem"
    style={{ fontSize: size }}
  >
    🛡️
  </Text>
);
