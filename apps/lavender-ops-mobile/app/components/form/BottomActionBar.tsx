import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { colors, textStyles, spacing } from "@/theme/tokens"
import { useBottomBarPadding } from "@/utils/useBottomBarPadding"

export interface BottomActionBarProps {
  primaryLabel: string
  onPrimary: () => void
  onCancel: () => void
  loading?: boolean
  cancelLabel?: string
  primaryIconName?: keyof typeof MaterialIcons.glyphMap
  /** Forwarded to the bar's outer container — lets a test target it directly. */
  testID?: string
}

export function BottomActionBar({
  primaryLabel,
  onPrimary,
  onCancel,
  loading = false,
  cancelLabel = "Batal",
  primaryIconName = "check-circle",
  testID,
}: BottomActionBarProps) {
  // PRD-4 BR-3/BR-4: replaces the old `Platform.OS === "ios" ? spacing.xl : spacing.base` —
  // named directly as the defect — with the device's actual reported inset on top of the same
  // zero-inset floor (AC-5/BR-5 — no regression).
  const barPadding = useBottomBarPadding()

  return (
    <View testID={testID} style={[styles.bar, { paddingBottom: barPadding }]}>
      <TouchableOpacity style={styles.cancel} onPress={onCancel} activeOpacity={0.8}>
        <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
        <Text style={[textStyles.labelLg, { color: colors.onSurfaceVariant }]}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.primary, loading && { opacity: 0.7 }]}
        onPress={onPrimary}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <MaterialIcons name={primaryIconName} size={20} color={colors.onPrimary} />
        )}
        <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>{primaryLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.base,
  },
  cancel: {
    alignItems: "center",
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 52,
    paddingHorizontal: spacing.base,
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 52,
    justifyContent: "center",
  },
})
