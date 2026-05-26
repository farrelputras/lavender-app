import { Text } from "react-native"

import { colors, textStyles, spacing } from "@/theme/tokens"

export interface SectionLabelProps {
  children: string
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Text style={[textStyles.headlineSm, { color: colors.onSurface, marginBottom: spacing.sm }]}>
      {children}
    </Text>
  )
}
