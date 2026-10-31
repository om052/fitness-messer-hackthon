import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors } from '@/styles/theme';

/**
 * "EmpireBackdrop" — a locally drawn cinematic kingdom scene.
 *
 * Layered mountain silhouettes with a walled citadel on the highest peak,
 * a lime horizon glow and a starfield, all rendered with plain Views so
 * there is zero dependency on image assets or network loading.
 */
export const EmpireBackdrop: React.FC<{
  children?: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => (
  <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
    {/* Starfield */}
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%' }}>
      {STAR_FIELDS.map((row, rowIndex) => (
        <View key={`star-row-${rowIndex}`} style={{ flexDirection: 'row' }}>
          {row.map((star, starIndex) => (
            <View
              key={`star-${rowIndex}-${starIndex}`}
              style={{
                position: 'absolute',
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                backgroundColor: star.bright
                  ? colors.empire.ivory
                  : colors.empire.stone,
                opacity: star.bright ? 0.9 : 0.45,
              }}
            />
          ))}
        </View>
      ))}
    </View>

    {children}

    {/* Kingdom scene pinned to the bottom */}
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      {/* Lime horizon glow */}
      <View
        style={{
          position: 'absolute',
          bottom: -40,
          left: -40,
          right: -40,
          height: 160,
          backgroundColor: colors.empire.limeDim,
          opacity: 0.25,
          borderRadius: 999,
        }}
      />

      {/* Far mountain range (left and right slopes) */}
      <View style={{ flexDirection: 'row', height: 130 }}>
        <View style={{ flex: 1, backgroundColor: 'transparent' }} />
        <MountainPeak width={140} height={118} color={colors.empire.surfaceAlt} opacity={0.55} />
        <View style={{ flex: 1, backgroundColor: 'transparent' }} />
        <MountainPeak width={170} height={132} color={colors.empire.surfaceAlt} opacity={0.7} />
        <View style={{ flex: 1, backgroundColor: 'transparent' }} />
      </View>

      {/* Citadel on the tallest peak */}
      <View style={{ position: 'absolute', bottom: 96, alignSelf: 'center' }}>
        {/* Keep + central tower */}
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 7,
              height: 26,
              backgroundColor: colors.empire.charcoal,
            }}
          />
          {/* Banner */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 6,
              width: 12,
              height: 8,
              backgroundColor: colors.empire.lime,
              borderTopRightRadius: 4,
              borderBottomRightRadius: 2,
            }}
          />
          <View
            style={{
              width: 18,
              height: 34,
              backgroundColor: colors.empire.nearBlack,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            }}
          />
          <View
            style={{
              width: 60,
              height: 30,
              backgroundColor: colors.empire.charcoal,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              flexDirection: 'row',
            }}
          >
            {/* Battlements */}
            {[0, 1, 2, 3].map((i) => (
              <View
                key={`battlement-${i}`}
                style={{
                  width: 7,
                  height: 6,
                  marginTop: -6,
                  marginRight: 3,
                  marginLeft: i === 0 ? 4 : 0,
                  backgroundColor: colors.empire.charcoal,
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Near ridge line */}
      <View style={{ height: 26, backgroundColor: colors.empire.charcoal }} />
    </View>
  </View>
);

/**
 * Triangular peak approximated with two skewed view borders.
 */
const MountainPeak: React.FC<{
  width: number;
  height: number;
  color: string;
  opacity?: number;
}> = ({ width, height, color, opacity = 1 }) => (
  <View
    style={{
      width,
      height,
      opacity,
      borderLeftWidth: width / 2,
      borderRightWidth: width / 2,
      borderTopWidth: height,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: color,
    }}
  />
);

// Deterministic star layout (no Math.random to keep renders stable).
const STAR_FIELDS: { top: number; left: number; size: number; bright: boolean }[][] = [
  [
    { top: 20, left: 30, size: 2, bright: false },
    { top: 48, left: 120, size: 3, bright: true },
    { top: 14, left: 210, size: 2, bright: false },
    { top: 60, left: 300, size: 2, bright: false },
  ],
  [
    { top: 90, left: 60, size: 2, bright: false },
    { top: 110, left: 250, size: 3, bright: true },
    { top: 80, left: 340, size: 2, bright: false },
  ],
  [
    { top: 150, left: 40, size: 2, bright: false },
    { top: 170, left: 160, size: 2, bright: false },
    { top: 140, left: 290, size: 3, bright: true },
  ],
];
