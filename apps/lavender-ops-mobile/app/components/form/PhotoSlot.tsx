import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { colors, textStyles, spacing } from "@/theme/tokens"

import type { PhotoItem } from "@/components/form/PhotoRow"

export interface PhotoSlotProps {
  label: string
  photo: PhotoItem | null
  onCapture: () => void
  onRemove: () => void
}

export function PhotoSlot({ label, photo, onCapture, onRemove }: PhotoSlotProps) {
  if (photo == null) {
    return (
      <TouchableOpacity style={styles.emptyTile} onPress={onCapture} activeOpacity={0.8}>
        <MaterialIcons name="camera-alt" size={28} color={colors.primary} />
        <Text style={[textStyles.labelMd, { color: colors.primary, marginTop: 4 }]}>{label}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.thumb}>
        {photo.uri != null ? (
          <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <MaterialIcons name="image" size={32} color={colors.outlineVariant} />
          </View>
        )}
        {photo.status === "pending" && (
          <View style={styles.pendingOverlay}>
            <ActivityIndicator size="small" color={colors.onSurface} />
          </View>
        )}
        {photo.status === "failed" && <View style={styles.failedOverlay} />}
        <TouchableOpacity
          style={styles.close}
          onPress={onRemove}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons name="close" size={14} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
      <Text style={[textStyles.labelMd, styles.label]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  close: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 22,
  },
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
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(176,0,32,0.35)",
  },
  image: {
    flex: 1,
  },
  label: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    flex: 1,
    justifyContent: "center",
  },
  thumb: {
    borderColor: colors.outlineVariant,
    borderRadius: 14,
    borderWidth: 1,
    height: 120,
    overflow: "hidden",
    width: 120,
  },
})
