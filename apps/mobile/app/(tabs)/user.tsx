import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../src/theme';

export default function UserScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>User</Text>
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
