import { Text } from "@/components/AppText"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface SectionLabelProps {
  children: string
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Text
      style={[
        textStyles.headlineSm,
        {
          color: colors.onSurface,
          paddingHorizontal: spacing.base,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
      ]}
    >
      {children}
    </Text>
  )
}
