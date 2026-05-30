import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { colors, textStyles, spacing } from "@/theme/tokens"

export interface PhotoItem {
  id: string
  uri: string | null
  status?: "uploaded" | "pending" | "failed"
}

export interface PhotoRowProps {
  photos: PhotoItem[]
  onAdd: () => void
  onRemove: (id: string) => void
  addLabel?: string
}

export function PhotoRow({ photos, onAdd, onRemove, addLabel = "Tambah Foto" }: PhotoRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <TouchableOpacity style={styles.addTile} onPress={onAdd} activeOpacity={0.8}>
        <MaterialIcons name="add-a-photo" size={28} color={colors.primary} />
        <Text style={[textStyles.labelMd, { color: colors.primary, marginTop: 4 }]}>
          {addLabel}
        </Text>
      </TouchableOpacity>
      {photos.map((p) => (
        <View key={p.id} style={styles.thumb}>
          {p.uri != null ? (
            <Image source={{ uri: p.uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="image" size={32} color={colors.outlineVariant} />
            </View>
          )}
          {p.status === "pending" && (
            <View style={styles.pendingOverlay}>
              <ActivityIndicator size="small" color={colors.onSurface} />
            </View>
          )}
          {p.status === "failed" && <View style={styles.failedOverlay} />}
          <TouchableOpacity
            style={styles.close}
            onPress={() => onRemove(p.id)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <MaterialIcons name="close" size={14} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  addTile: {
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
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(176,0,32,0.35)",
  },
  image: {
    flex: 1,
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
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  thumb: {
    borderColor: colors.outlineVariant,
    borderRadius: 14,
    borderWidth: 1,
    height: 120,
    overflow: "hidden",
    width: 120,
  },
})
