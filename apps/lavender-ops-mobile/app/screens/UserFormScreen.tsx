// app/screens/UserFormScreen.tsx
import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

import { SectionLabel } from "@/components/form/SectionLabel"
import { FieldCard } from "@/components/form/FieldCard"
import { PhotoRow } from "@/components/form/PhotoRow"
import { BottomActionBar } from "@/components/form/BottomActionBar"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { createUser, getUser, updateUser } from "@/services/rentals"
import { colors, textStyles, spacing } from "@/theme/tokens"

export function UserFormScreen({ route, navigation }: AppStackScreenProps<"UserForm">) {
  const mode = route.params.mode
  const userId = mode === "edit" ? route.params.userId : null

  const [loading, setLoading] = useState(mode === "edit")
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [nickname, setNickname] = useState("")
  const [phone, setPhone] = useState("")
  const [isMahasiswa, setIsMahasiswa] = useState(true)
  const [alamat, setAlamat] = useState("")
  const [kontakDarurat, setKontakDarurat] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (mode !== "edit" || !userId) return
    getUser(userId).then((u) => {
      if (u) {
        setName(u.name)
        setNickname(u.nickname ?? "")
        setPhone(u.phone)
        setIsMahasiswa(u.isMahasiswa)
        setAlamat(u.alamat ?? "")
        setKontakDarurat(u.kontakDarurat ?? "")
        setNotes(u.notes ?? "")
      }
      setLoading(false)
    })
  }, [mode, userId])

  const canSave = name.trim().length > 0 && phone.trim().length > 0 && !saving

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        nickname: nickname.trim() || null,
        phone: phone.trim(),
        isMahasiswa,
        alamat: alamat.trim() || null,
        kontakDarurat: kontakDarurat.trim() || null,
        notes: notes.trim() || null,
      }
      if (mode === "create") {
        const user = await createUser(payload)
        navigation.replace("UserDetail", { userId: user.id })
      } else if (userId) {
        await updateUser(userId, payload)
        navigation.goBack()
      }
    } catch (e) {
      Alert.alert("Gagal menyimpan", e instanceof Error ? e.message : "Coba lagi")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
          {mode === "create" ? "User Baru" : "Edit User"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionLabel>Identitas</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama" placeholderTextColor={colors.onSurfaceVariant} />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Panggilan</Text>
          <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="(opsional)" placeholderTextColor={colors.onSurfaceVariant} />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>No. HP *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="0812..."
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="phone-pad"
          />
        </FieldCard>

        <SectionLabel>Status</SectionLabel>
        <FieldCard>
          <View style={styles.toggleRow}>
            <Text style={[textStyles.bodyLg, { color: colors.onSurface, flex: 1 }]}>Mahasiswa</Text>
            <Switch
              value={isMahasiswa}
              onValueChange={setIsMahasiswa}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
            />
          </View>
        </FieldCard>

        <SectionLabel>Kontak & Catatan</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Alamat</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={alamat}
            onChangeText={setAlamat}
            placeholder="(opsional)"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Kontak Darurat</Text>
          <TextInput
            style={styles.input}
            value={kontakDarurat}
            onChangeText={setKontakDarurat}
            placeholder="(opsional)"
            placeholderTextColor={colors.onSurfaceVariant}
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="(opsional)"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
          />
        </FieldCard>

        <SectionLabel>Foto KTP / KTM</SectionLabel>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginHorizontal: spacing.base, marginBottom: spacing.sm }]}>
          Upload foto akan diaktifkan setelah Phase 6 (sementara: placeholder).
        </Text>
        <View style={{ paddingHorizontal: spacing.base }}>
          <PhotoRow
            photos={[]}
            onAdd={() => Alert.alert("Belum aktif", "Foto user akan tersedia di Phase 6")}
            onRemove={() => {}}
          />
        </View>
      </ScrollView>

      <BottomActionBar
        primaryLabel={saving ? "Menyimpan…" : "Simpan"}
        onPrimary={() => {
          if (!canSave) return
          handleSave()
        }}
        onCancel={() => navigation.goBack()}
        loading={saving}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  scroll: { paddingBottom: 160 },
  fieldLabel: { color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.sm },
  input: {
    color: colors.onSurface,
    fontSize: 16,
    padding: 0,
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
})
