/**
 * Fitness Messer Theme
 * Dark navy with cyan accents for a premium empire-building aesthetic
 */

export const colors = {
  // Primary backgrounds
  bg: {
    dark: '#0f172a', // Deep navy
    darker: '#0a0f1f', // Almost black navy
    card: '#1a2847', // Card background
    hover: '#253456', // Hover state
  },

  // Accent colors
  accent: {
    cyan: '#00d9ff', // Bright cyan
    cyanLight: '#33e5ff', // Light cyan
    cyanDark: '#00a8cc', // Dark cyan
  },

  // Semantic colors
  primary: '#00d9ff', // Cyan - primary action
  secondary: '#8b5cf6', // Purple - secondary
  success: '#10b981', // Green - achievements
  danger: '#ef4444', // Red - warnings
  warning: '#f59e0b', // Amber - alerts

  // Text colors
  text: {
    primary: '#ffffff', // White text
    secondary: '#cbd5e1', // Light gray
    tertiary: '#94a3b8', // Medium gray
    muted: '#64748b', // Dark gray
  },

  // Borders and dividers
  border: '#1e293b', // Dark slate
  divider: '#334155', // Slate

  // "Enter the Empire" auth palette (additive — used only by auth screens)
  empire: {
    charcoal: '#141414', // Deep charcoal base
    nearBlack: '#0b0d0a', // Near-black with a green cast
    surface: '#1c1f1a', // Layered surface above charcoal
    surfaceAlt: '#232720', // Slightly raised surface
    border: '#2e332b', // Subtle border
    borderStrong: '#3a4034',
    lime: '#a3e635', // Energetic lime — primary actions & progress
    limeDark: '#84cc16',
    limeDim: '#4d7c0f',
    stone: '#8a8f86', // Muted stone grey
    ivory: '#f5f2e8', // Warm ivory text
    gold: '#c9a961', // Subdued metallic gold
    goldDim: '#8a7340',
    danger: '#e5634f',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 13.16,
    elevation: 20,
  },
};

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;
