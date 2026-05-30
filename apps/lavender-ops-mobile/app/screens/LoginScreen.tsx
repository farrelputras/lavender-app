// app/screens/LoginScreen.tsx
import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAuth } from "@/context/AuthContext"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"

export function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordVisible, setPasswordVisible] = useState(false)
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
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
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
            placeholderTextColor={colors.onSurfaceVariant}
          />

          <Text style={[textStyles.labelLg, styles.label]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              editable={!submitting}
              placeholderTextColor={colors.onSurfaceVariant}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setPasswordVisible((v) => !v)}
              hitSlop={8}
            >
              <MaterialIcons
                name={passwordVisible ? "visibility-off" : "visibility"}
                size={22}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, justifyContent: "center" },
  label: { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    height: 48,
    borderRadius: borderRadius.default,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    color: colors.onSurface,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: borderRadius.default,
    backgroundColor: colors.surfaceContainer,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: spacing.md,
    color: colors.onSurface,
  },
  eyeBtn: {
    paddingHorizontal: spacing.md,
    height: "100%",
    justifyContent: "center",
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
