import { View, StyleSheet } from "react-native"

import { Text } from "@/components/AppText"
import { colors, typography, spacing } from "@/theme/tokens"

export function KendaraanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Kendaraan</Text>
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
