import { View, StyleSheet, ViewStyle, StyleProp } from "react-native"

import { Text, TextInput } from "@/components/AppText"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface RupiahInputProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  style?: StyleProp<ViewStyle>
}

export function RupiahInput({ value, onChangeText, placeholder, style }: RupiahInputProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
      <TextInput
        style={[textStyles.bodyMd, styles.field]}
        keyboardType="numeric"
        placeholder={placeholder ?? "0"}
        placeholderTextColor={colors.outline}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="done"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  field: {
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md,
  },
})
