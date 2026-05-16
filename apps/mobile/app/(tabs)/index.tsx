import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../src/theme';

export default function BerandaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Beranda</Text>
    </View>
  );
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
});
