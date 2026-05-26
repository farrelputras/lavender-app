// Flat token barrel — mirrors apps/mobile/src/theme/index.ts but remaps font-family
// strings to Ignite's loaded font keys (see app/theme/typography.ts).
// Screens import from here instead of the mobile source tree.

export const colors = {
  // Legacy keys
  primary: '#62528d',
  primaryDark: '#6F5F99',
  background: '#f6faff',
  surface: '#f6faff',
  border: '#dbe4ed',
  text: '#141d23',
  textMuted: '#49454f',
  success: '#4A9B6E',
  warning: '#D4A23E',
  danger: '#ba1a1a',
  inactive: '#7a7580',

  // M3 color tokens
  onPrimary: '#ffffff',
  primaryContainer: '#7c6ba8',
  onPrimaryContainer: '#fffbff',
  onSurface: '#141d23',
  onSurfaceVariant: '#49454f',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#ecf5fe',
  surfaceContainer: '#e6eff8',
  surfaceVariant: '#dbe4ed',
  secondary: '#5c5f60',
  onSecondary: '#ffffff',
  secondaryContainer: '#e1e3e4',
  outline: '#7a7580',
  outlineVariant: '#cac4d0',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  tertiaryContainer: '#b7ad58',
  onTertiaryContainer: '#464000',
  successContainer: '#E6F4EA',
  onSuccessContainer: '#137333',
  warningContainer: '#FEF7E0',
  onWarningContainer: '#B06000',
  inverseSurface: '#293138',
  inverseOnSurface: '#e9f2fb',
  inversePrimary: '#cfbcff',
  primaryFixed: '#e9ddff',
  onPrimaryFixed: '#200f48',
  onPrimaryFixedVariant: '#4d3d76',
} as const

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
} as const

// Sized up for a 50yo primary user
export const typography = {
  caption: 14,
  body: 16,
  bodyLarge: 18,
  heading: 22,
  headingLarge: 28,
} as const

export const tapTargetMin = 48

export const borderRadius = {
  default: 12,
  card: 16,
  button: 8,
} as const

// Font family keys — use Ignite's loaded names (publicSans*)
export const fontFamily = {
  regular: 'publicSansRegular',
  medium: 'publicSansMedium',
  semibold: 'publicSansSemiBold',
  bold: 'publicSansBold',
} as const

// M3 type scale — font-family strings remapped to Ignite loaded keys
export const textStyles = {
  displayLg:  { fontFamily: 'publicSansBold',     fontSize: 40, lineHeight: 48 },
  headlineLg: { fontFamily: 'publicSansSemiBold',  fontSize: 32, lineHeight: 40 },
  headlineMd: { fontFamily: 'publicSansSemiBold',  fontSize: 24, lineHeight: 32 },
  headlineSm: { fontFamily: 'publicSansSemiBold',  fontSize: 20, lineHeight: 28 },
  bodyLg:     { fontFamily: 'publicSansRegular',   fontSize: 18, lineHeight: 28 },
  bodyMd:     { fontFamily: 'publicSansRegular',   fontSize: 16, lineHeight: 24 },
  labelLg:    { fontFamily: 'publicSansSemiBold',  fontSize: 16, lineHeight: 20 },
  labelMd:    { fontFamily: 'publicSansMedium',    fontSize: 14, lineHeight: 18 },
} as const
