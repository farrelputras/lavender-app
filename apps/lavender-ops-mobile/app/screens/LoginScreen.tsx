// app/screens/LoginScreen.tsx
import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useSession } from "@/services/auth/useSession"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"

export function LoginScreen() {
  const { signIn } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      // useSession will flip the AppNavigator switch automatically
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login gagal")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text style={[textStyles.headlineLg, { color: colors.onSurface }]}>Lavender Ops</Text>
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, marginBottom: 24 }]}>
            Masuk untuk mulai kelola rental
          </Text>

          <Text style={[textStyles.labelLg, styles.label]}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            editable={!submitting}
            placeholder="mom@lavender.local"
            placeholderTextColor={colors.onSurfaceVariant}
          />

          <Text style={[textStyles.labelLg, styles.label]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!submitting}
            placeholder="••••••••"
            placeholderTextColor={colors.onSurfaceVariant}
          />

          {error && (
            <View style={styles.errorBanner}>
              <Text style={[textStyles.bodyMd, { color: colors.onErrorContainer }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Masuk</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: "center" },
  label: { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    height: 48,
    borderRadius: borderRadius.default,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    color: colors.onSurface,
  },
  errorBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.card,
    padding: spacing.md,
  },
  submitBtn: {
    height: 52,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.5 },
})
