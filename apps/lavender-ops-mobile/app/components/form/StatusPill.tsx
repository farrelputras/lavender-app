import { View, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { Text } from "@/components/AppText"
import { textStyles, spacing } from "@/theme/tokens"

export interface StatusPillProps {
  label: string
  bg: string
  color: string
  /** Optional MaterialIcons icon name rendered before the label. */
  icon?: keyof typeof MaterialIcons.glyphMap
}

export function StatusPill({ label, bg, color, icon }: StatusPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? (
        <MaterialIcons name={icon} size={14} color={color} style={{ marginRight: 4 }} />
      ) : null}
      <Text style={[textStyles.labelMd, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
})
