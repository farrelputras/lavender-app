const palette = {
  // Primary — purple
  purple100: "#e9ddff",
  purple200: "#cfbcff",
  purple500: "#62528d",
  purple600: "#4d3d76",
  purple700: "#7c6ba8",
  purple800: "#200f48",

  // Surface / neutral
  neutral0: "#ffffff",
  neutral50: "#f6faff",
  neutral100: "#ecf5fe",
  neutral200: "#e6eff8",
  neutral300: "#dbe4ed",
  neutral400: "#cac4d0",
  neutral500: "#7a7580",
  neutral600: "#49454f",
  neutral700: "#141d23",
  neutral800: "#293138",

  // Error
  error50: "#ffdad6",
  error500: "#ba1a1a",
  error700: "#93000a",

  // Success
  success50: "#E6F4EA",
  success500: "#4A9B6E",
  success700: "#137333",

  // Warning
  warning50: "#FEF7E0",
  warning500: "#D4A23E",
  warning700: "#B06000",

  // Secondary
  secondary200: "#e1e3e4",
  secondary500: "#5c5f60",

  // Tertiary
  tertiary200: "#b7ad58",
  tertiary700: "#464000",

  // Ignite compat keys (used by built-in components)
  neutral900: "#000000", // deep black used by EmptyState image tint
  accent100: "#e9ddff", // light purple; replaces Ignite's warm orange for Checkbox accent
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // Ignite required semantic keys
  text: palette.neutral700,
  textDim: palette.neutral600,
  background: palette.neutral50,
  border: palette.neutral300,
  tint: palette.purple500,
  tintInactive: palette.neutral400,
  separator: palette.neutral300,
  error: palette.error500,
  errorBackground: palette.error50,

  // Lavender M3 color tokens
  primary: palette.purple500,
  primaryDark: "#6F5F99",
  primaryContainer: palette.purple700,
  onPrimary: palette.neutral0,
  onPrimaryContainer: "#fffbff",
  primaryFixed: palette.purple100,
  onPrimaryFixed: palette.purple800,
  onPrimaryFixedVariant: palette.purple600,
  inversePrimary: palette.purple200,

  surface: palette.neutral50,
  surfaceContainerLowest: palette.neutral0,
  surfaceContainerLow: palette.neutral100,
  surfaceContainer: palette.neutral200,
  surfaceVariant: palette.neutral300,
  onSurface: palette.neutral700,
  onSurfaceVariant: palette.neutral600,
  inverseSurface: palette.neutral800,
  inverseOnSurface: "#e9f2fb",

  secondary: palette.secondary500,
  secondaryContainer: palette.secondary200,
  onSecondary: palette.neutral0,

  tertiaryContainer: palette.tertiary200,
  onTertiaryContainer: palette.tertiary700,

  outline: palette.neutral500,
  outlineVariant: palette.neutral400,

  onError: palette.neutral0,
  errorContainer: palette.error50,
  onErrorContainer: palette.error700,

  success: palette.success500,
  successContainer: palette.success50,
  onSuccessContainer: palette.success700,

  warning: palette.warning500,
  warningContainer: palette.warning50,
  onWarningContainer: palette.warning700,

  danger: palette.error500,
  inactive: palette.neutral500,
  textMuted: palette.neutral600,
} as const
