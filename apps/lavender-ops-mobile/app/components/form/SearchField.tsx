import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { cardShadow, colors, textStyles, spacing } from "@/theme/tokens"

export interface SearchFieldProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
}

/**
 * Pill-shaped search input that matches UserScreen's search bar style.
 * Includes a search icon on the left and a clear button when there is text.
 */
export function SearchField({ value, onChangeText, placeholder = "Cari..." }: SearchFieldProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons
        name="search"
        size={20}
        color={colors.secondary}
        style={{ marginRight: spacing.sm }}
      />
      <TextInput
        style={[textStyles.bodyMd, styles.input]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.outlineVariant}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="close" size={20} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    flexDirection: "row",
    height: 48,
    paddingHorizontal: spacing.md,
    ...cardShadow,
  },
  input: { color: colors.onSurface, flex: 1, padding: 0 },
})
