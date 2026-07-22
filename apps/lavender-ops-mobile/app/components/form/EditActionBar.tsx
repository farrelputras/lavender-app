import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native"

import { Text } from "@/components/AppText"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface EditActionBarProps {
  /** Disables both buttons and swaps the Save label for a spinner — the v1.0.3 re-entrancy guard (debt #2). */
  saving: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel?: string
  cancelLabel?: string
  /** When set, buttons get testIDs `${testID}-save` / `${testID}-cancel` for screens with more than one bar. */
  testID?: string
}

/**
 * Shared Save/Cancel bar for the inline-edit pattern (PRD-1 BR-2/BR-7). Used by both the Kondisi
 * Keluar and Catatan Rental edit sections on RentalDetailScreen so the re-entrancy guard and the
 * in-flight visual state live in exactly one place.
 */
export function EditActionBar({
  saving,
  onSave,
  onCancel,
  saveLabel = "Simpan",
  cancelLabel = "Batal",
  testID,
}: EditActionBarProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        testID={testID ? `${testID}-cancel` : undefined}
        style={styles.cancelBtn}
        onPress={onCancel}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={[textStyles.labelLg, { color: colors.onSurfaceVariant }]}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID={testID ? `${testID}-save` : undefined}
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>{saveLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  cancelBtn: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    height: 44,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveBtn: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    flex: 1,
    height: 44,
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
})
