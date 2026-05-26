import { Platform } from "react-native"
import {
  PublicSans_400Regular as publicSansRegular,
  PublicSans_500Medium as publicSansMedium,
  PublicSans_600SemiBold as publicSansSemiBold,
  PublicSans_700Bold as publicSansBold,
} from "@expo-google-fonts/public-sans"

export const customFontsToLoad = {
  publicSansRegular,
  publicSansMedium,
  publicSansSemiBold,
  publicSansBold,
}

const fonts = {
  publicSans: {
    regular: "publicSansRegular",
    normal: "publicSansRegular", // alias for Ignite components that use `weight="normal"`
    medium: "publicSansMedium",
    semibold: "publicSansSemiBold",
    bold: "publicSansBold",
  },
  helveticaNeue: {
    thin: "HelveticaNeue-Thin",
    light: "HelveticaNeue-Light",
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  courier: {
    normal: "Courier",
  },
  sansSerif: {
    thin: "sans-serif-thin",
    light: "sans-serif-light",
    normal: "sans-serif",
    medium: "sans-serif-medium",
  },
  monospace: {
    normal: "monospace",
  },
}

export const typography = {
  fonts,
  primary: fonts.publicSans,
  secondary: Platform.select({ ios: fonts.helveticaNeue, android: fonts.sansSerif }),
  code: Platform.select({ ios: fonts.courier, android: fonts.monospace }),

  // M3 type-scale presets — sized up for a 50yo primary user
  textStyles: {
    displayLg: { fontFamily: "publicSansBold", fontSize: 40, lineHeight: 48 },
    headlineLg: { fontFamily: "publicSansSemiBold", fontSize: 32, lineHeight: 40 },
    headlineMd: { fontFamily: "publicSansSemiBold", fontSize: 24, lineHeight: 32 },
    headlineSm: { fontFamily: "publicSansSemiBold", fontSize: 20, lineHeight: 28 },
    bodyLg: { fontFamily: "publicSansRegular", fontSize: 18, lineHeight: 28 },
    bodyMd: { fontFamily: "publicSansRegular", fontSize: 16, lineHeight: 24 },
    labelLg: { fontFamily: "publicSansSemiBold", fontSize: 16, lineHeight: 20 },
    labelMd: { fontFamily: "publicSansMedium", fontSize: 14, lineHeight: 18 },
  },

  borderRadius: {
    default: 12,
    card: 16,
    button: 8,
  },

  tapTargetMin: 48,
}
