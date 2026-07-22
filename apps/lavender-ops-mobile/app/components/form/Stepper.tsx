import { View, TouchableOpacity, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { Text } from "@/components/AppText"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface StepperProps {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  label: string
  min?: number
  max?: number
}

export function Stepper({ value, onDecrement, onIncrement, label, min = 0, max }: StepperProps) {
  const atMin = value <= min
  const atMax = max !== undefined && value >= max
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.btn}
        onPress={onDecrement}
        disabled={atMin}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="remove"
          size={24}
          color={atMin ? colors.outlineVariant : colors.primary}
        />
      </TouchableOpacity>
      <Text
        style={[
          textStyles.headlineSm,
          { color: colors.onSurface, minWidth: 72, textAlign: "center" },
        ]}
      >
        {label}
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={onIncrement}
        disabled={atMax}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="add"
          size={24}
          color={atMax ? colors.outlineVariant : colors.primary}
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.xs,
  },
})
