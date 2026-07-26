import { View, StyleSheet, ViewStyle, StyleProp } from "react-native"

import { Text, TextInput } from "@/components/AppText"
import { colors, textStyles, spacing } from "@/theme/tokens"

import { FieldBox } from "./FieldBox"

export interface RupiahInputProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  style?: StyleProp<ViewStyle>
}

// PRD-8 BR-3/BR-6/AC-6: this used to be its own field box (border + fill + radius +
// `minHeight`, treatment #2 in PRD-8's inventory). It now CONSUMES `FieldBox` — the one
// declaration site — instead of carrying its own copy. `style` composes onto the box, exactly
// as the primitive's contract intends.
export function RupiahInput({ value, onChangeText, placeholder, style }: RupiahInputProps) {
  return (
    <FieldBox style={style}>
      <View style={styles.row}>
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
    </FieldBox>
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
    flexDirection: "row",
    gap: spacing.sm,
  },
})
