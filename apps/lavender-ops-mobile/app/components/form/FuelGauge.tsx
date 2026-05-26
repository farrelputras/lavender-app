import { View, StyleSheet } from "react-native"

import { colors, spacing } from "@/theme/tokens"

export interface FuelGaugeProps {
  value: number
  max?: number
}

export function FuelGauge({ value, max = 8 }: FuelGaugeProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i === 0 && styles.first,
            i === max - 1 && styles.last,
            { backgroundColor: i < value ? colors.primary : colors.surfaceVariant },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  first: { borderBottomLeftRadius: 4, borderTopLeftRadius: 4 },
  last: { borderBottomRightRadius: 4, borderTopRightRadius: 4 },
  row: {
    flexDirection: "row",
    gap: 2,
    height: 8,
    marginTop: spacing.xs,
  },
  segment: { borderRadius: 0, flex: 1 },
})
