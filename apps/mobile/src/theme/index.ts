export const colors = {
  primary: '#8B7AB8',
  primaryDark: '#6F5F99',
  background: '#FFFFFF',
  surface: '#F9F8FB',
  border: '#E5E2EC',
  text: '#1F1B2E',
  textMuted: '#6B6577',
  success: '#4A9B6E',
  warning: '#D4A23E',
  danger: '#C75B5B',
  inactive: '#A8A4B3',
} as const;

// 4, 8, 12, 16, 20, 24, 32, 48
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// Sized up for a 50yo primary user
export const typography = {
  caption: 14,
  body: 16,
  bodyLarge: 18,
  heading: 22,
  headingLarge: 28,
} as const;

export const tapTargetMin = 48;

export const borderRadius = {
  default: 12,
  card: 16,
} as const;
