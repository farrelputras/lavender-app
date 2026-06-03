import { ReactNode } from "react"
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native"

import { cardShadow, colors, spacing } from "@/theme/tokens"

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
    borderRadius: 16,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.md,
    ...cardShadow,
  },
})
