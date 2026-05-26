import { View, Text, StyleSheet } from "react-native"

import { colors, typography, spacing } from "@/theme/tokens"

export function HutangScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hutang</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  text: {
    color: colors.text,
    fontSize: typography.heading,
    marginTop: spacing.base,
  },
})
