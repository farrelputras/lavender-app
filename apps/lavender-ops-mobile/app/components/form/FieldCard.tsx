import { View, StyleSheet, ViewStyle, StyleProp } from "react-native"
import { ReactNode } from "react"
import { colors, spacing } from "@/theme/tokens"

export interface FieldCardProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export function FieldCard({ children, style }: FieldCardProps) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
})
