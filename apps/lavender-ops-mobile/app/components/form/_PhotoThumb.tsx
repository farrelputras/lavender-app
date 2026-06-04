import { View, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { colors } from "@/theme/tokens"

import type { PhotoItem } from "./PhotoRow"

interface PhotoThumbProps {
  photo: PhotoItem
  onRemove: () => void
  readonly?: boolean
}

export function PhotoThumb({ photo, onRemove, readonly }: PhotoThumbProps) {
  return (
    <View style={styles.thumb}>
      {photo.uri != null ? (
        <Image source={{ uri: photo.uri }} style={styles.image} testID="photo-thumb-image" />
      ) : (
        <View style={styles.placeholder}>
          <MaterialIcons name="image" size={32} color={colors.outlineVariant} />
        </View>
      )}
      {photo.status === "pending" && (
        <View style={[StyleSheet.absoluteFillObject, styles.pendingOverlay]}>
          <ActivityIndicator size="small" color={colors.onPrimary} />
        </View>
      )}
      {photo.status === "failed" && (
        <View style={[StyleSheet.absoluteFillObject, styles.failedOverlay]} />
      )}
      {!readonly && (
        <TouchableOpacity
          style={styles.close}
          onPress={onRemove}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons name="close" size={14} color={colors.onSurface} />
        </TouchableOpacity>
      )}
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
  failedOverlay: { backgroundColor: "rgba(176,0,32,0.35)" },
  image: { borderRadius: 14, height: 120, width: 120 },
  pendingOverlay: {
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
