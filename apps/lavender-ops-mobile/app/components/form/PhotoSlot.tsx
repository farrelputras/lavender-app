import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import type { PhotoItem } from "@/components/form/PhotoRow"
import { colors, textStyles, spacing } from "@/theme/tokens"

import { PhotoThumb } from "./_PhotoThumb"

export interface PhotoSlotProps {
  label: string
  photo: PhotoItem | null
  onCapture: () => void
  onRemove: () => void
  readonly?: boolean
  onPress?: () => void
}

export function PhotoSlot({ label, photo, onCapture, onRemove, readonly, onPress }: PhotoSlotProps) {
  if (photo == null) {
    if (readonly) {
      return (
        <View style={styles.container}>
          <View style={[styles.emptyTile, styles.emptyTileReadonly]}>
            <MaterialIcons name="image" size={28} color={colors.outlineVariant} />
          </View>
          <Text style={[textStyles.labelMd, styles.label]}>{label}</Text>
        </View>
      )
    }
    return (
      <TouchableOpacity style={styles.emptyTile} onPress={onCapture} activeOpacity={0.8}>
        <MaterialIcons name="camera-alt" size={28} color={colors.primary} />
        <Text style={[textStyles.labelMd, { color: colors.primary, marginTop: 4 }]}>{label}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <PhotoThumb photo={photo} onRemove={onRemove} readonly={readonly} onPress={onPress} />
      <Text style={[textStyles.labelMd, styles.label]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  emptyTile: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.primary,
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 120,
    justifyContent: "center",
    width: 120,
  },
  emptyTileReadonly: {
    borderColor: colors.outlineVariant,
    borderStyle: "solid",
  },
  label: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
})
