import { Ref } from "react"
import { View, TouchableOpacity, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { TextInput } from "@/components/AppText"
import { cardShadow, colors, textStyles, spacing } from "@/theme/tokens"

export interface SearchFieldProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  /** Called when the input gains focus — used by screens that have a "search mode". */
  onFocus?: () => void
  /** Forwarded to the underlying TextInput so callers can blur it (e.g. a "Batal" button). */
  inputRef?: Ref<TextInput>
}

/**
 * Pill-shaped search input — the one search control in the app.
 * Search icon on the left, clear button on the right once there is text.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder = "Cari...",
  onFocus,
  inputRef,
}: SearchFieldProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons
        name="search"
        size={20}
        color={colors.secondary}
        style={{ marginRight: spacing.sm }}
      />
      <TextInput
        ref={inputRef}
        style={[textStyles.bodyMd, styles.input]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.outlineVariant}
        returnKeyType="search"
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
