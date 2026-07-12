// eslint-disable-next-line no-restricted-imports -- plain RN Text, no themed content here (same exception app/components/Text.tsx itself takes)
import { View, Text, StyleSheet } from "react-native"
// Named imports, not `import * as Updates` — Babel's namespace-import interop
// (`_interopRequireWildcard`) snapshots plain data properties by value the first time the
// module is required and caches that copy. Under jest, where the test mutates
// `expo-updates`'s mocked `updateId`/`createdAt` between assertions, a namespace import would
// keep reading the stale first-seen values forever. Named imports compile to a direct
// `_expoUpdates.updateId` property read at each usage site instead, so they see the mutation.
import { createdAt, updateId } from "expo-updates"

import { RELEASE } from "@/config/release"
import { colors, textStyles, spacing } from "@/theme/tokens"
import { formatDateLong } from "@/utils/format"

/**
 * Quiet footer at the bottom of the Beranda scroll.
 *
 * Exists so that when something is wrong and Farrel is on the phone asking "what version
 * are you on?", mom can find the answer from a verbal instruction — "scroll to the bottom
 * of the home screen". The splash screen was rejected: it flashes past and cannot be
 * summoned back.
 *
 * `RELEASE` is the JS constant (see app/config/release.ts — NOT app.json's version).
 * Beneath it, the actual update identity from expo-updates. On the bundle embedded in the
 * APK, `updateId` is null and we show "bawaan".
 */
export function VersionFooter() {
  const updateLine =
    updateId && createdAt
      ? `pembaruan ${updateId.slice(0, 7)} · ${formatDateLong(new Date(createdAt))}`
      : "pembaruan bawaan"

  return (
    <View style={styles.container}>
      <Text style={styles.releaseText}>Lavender Ops · v{RELEASE}</Text>
      <Text style={styles.updateText}>{updateLine}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
  },
  releaseText: {
    ...textStyles.labelMd,
    color: colors.onSurfaceVariant,
  },
  updateText: {
    ...textStyles.labelMd,
    color: colors.outlineVariant,
    marginTop: 2,
  },
})
