import { View, Text, StyleSheet } from 'react-native'
import { colors, typography, spacing } from '@/theme/tokens'

export function PenyewaanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Penyewaan</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.heading,
    color: colors.text,
    marginTop: spacing.base,
  },
})
