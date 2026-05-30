import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { colors, textStyles, spacing } from "@/theme/tokens"

import { PhotoThumb } from "./_PhotoThumb"

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
        <PhotoThumb key={p.id} photo={p} onRemove={() => onRemove(p.id)} />
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
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
})
