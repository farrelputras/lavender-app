import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface PhotoItem {
  id: string
  uri: string | null
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
          <View style={styles.placeholder}>
            <MaterialIcons name="image" size={32} color={colors.outlineVariant} />
          </View>
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
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
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
  thumb: {
    borderColor: colors.outlineVariant,
    borderRadius: 14,
    borderWidth: 1,
    height: 120,
    overflow: "hidden",
    width: 120,
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    flex: 1,
    justifyContent: "center",
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
})
