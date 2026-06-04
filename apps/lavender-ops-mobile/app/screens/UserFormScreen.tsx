import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react"
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

import { BottomActionBar } from "@/components/form/BottomActionBar"
import { FieldCard } from "@/components/form/FieldCard"
import { PhotoSlot } from "@/components/form/PhotoSlot"
import { SectionLabel } from "@/components/form/SectionLabel"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { choosePhotoSource } from "@/services/photos/capture"
import { createUser, getUser, updateUser } from "@/services/rentals"
import type { PhotoInput } from "@/services/rentals/types"
import { colors, textStyles, spacing } from "@/theme/tokens"

type SlotState =
  | { status: "none" }
  | { status: "existing"; id: string; uri: string | null }
  | { status: "new"; uri: string; mimeType: string }
  | { status: "removed" }

function toDisplayItem(s: SlotState) {
  if (s.status === "none" || s.status === "removed") return null
  return { id: s.status === "existing" ? s.id : "local", uri: s.uri }
}

function toPhotoInput(s: SlotState): PhotoInput | undefined {
  if (s.status === "none") return undefined
  if (s.status === "existing") return { kind: "keep" }
  if (s.status === "new") return { kind: "new", uri: s.uri, mimeType: s.mimeType }
  return { kind: "remove" }
}

const NONE: SlotState = { status: "none" }

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

  const [profilSlot, setProfilSlot] = useState<SlotState>(NONE)
  const [ktpSlot, setKtpSlot] = useState<SlotState>(NONE)
  const [ktmSlot, setKtmSlot] = useState<SlotState>(NONE)
  // Originals allow restoring the pre-capture state when user cancels a new capture
  const originals = useRef({
    profil: NONE as SlotState,
    ktp: NONE as SlotState,
    ktm: NONE as SlotState,
  })

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

        const profil: SlotState = u.profilPhoto
          ? { status: "existing", id: u.profilPhoto.id, uri: u.profilPhoto.uri }
          : NONE
        const ktp: SlotState = u.ktpPhoto
          ? { status: "existing", id: u.ktpPhoto.id, uri: u.ktpPhoto.uri }
          : NONE
        const ktm: SlotState = u.ktmPhoto
          ? { status: "existing", id: u.ktmPhoto.id, uri: u.ktmPhoto.uri }
          : NONE

        originals.current = { profil, ktp, ktm }
        setProfilSlot(profil)
        setKtpSlot(ktp)
        setKtmSlot(ktm)
      }
      setLoading(false)
    })
  }, [mode, userId])

  const canSave = name.trim().length > 0 && phone.trim().length > 0 && !saving

  function makeCapture(setter: Dispatch<SetStateAction<SlotState>>) {
    return async () => {
      const captured = await choosePhotoSource()
      if (captured) setter({ status: "new", uri: captured.uri, mimeType: captured.mimeType })
    }
  }

  function makeRemove(setter: Dispatch<SetStateAction<SlotState>>, getOriginal: () => SlotState) {
    return () => {
      setter((prev) => {
        if (prev.status === "existing") return { status: "removed" }
        if (prev.status === "new") return getOriginal()
        return prev
      })
    }
  }

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
        profilPhoto: toPhotoInput(profilSlot),
        ktpPhoto: toPhotoInput(ktpSlot),
        ktmPhoto: toPhotoInput(ktmSlot),
      }
      if (mode === "create") {
        const { user, failedPhotoSlots } = await createUser(payload)
        if (failedPhotoSlots.length > 0) {
          Alert.alert("User tersimpan", "Beberapa foto gagal diupload — coba lagi dari Edit.")
        }
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
      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{mode === "create" ? "User Baru" : "Edit User"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionLabel>Identitas</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Masukkan nama lengkap"
            placeholderTextColor={colors.outlineVariant}
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Panggilan</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Masukkan nama panggilan"
            placeholderTextColor={colors.outlineVariant}
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>No. HP *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Contoh: 08123456789"
            placeholderTextColor={colors.outlineVariant}
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

        <SectionLabel>Kontak &amp; Catatan</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Alamat</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={alamat}
            onChangeText={setAlamat}
            placeholder="Masukkan alamat lengkap"
            placeholderTextColor={colors.outlineVariant}
            multiline
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Kontak Darurat</Text>
          <TextInput
            style={styles.input}
            value={kontakDarurat}
            onChangeText={setKontakDarurat}
            placeholder="Nama / No. HP"
            placeholderTextColor={colors.outlineVariant}
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tambahkan catatan jika ada"
            placeholderTextColor={colors.outlineVariant}
            multiline
          />
        </FieldCard>

        <SectionLabel>Foto</SectionLabel>
        <View style={styles.photoRow}>
          <PhotoSlot
            label="Foto Profil"
            photo={toDisplayItem(profilSlot)}
            onCapture={makeCapture(setProfilSlot)}
            onRemove={makeRemove(setProfilSlot, () => originals.current.profil)}
          />
          <PhotoSlot
            label="KTP"
            photo={toDisplayItem(ktpSlot)}
            onCapture={makeCapture(setKtpSlot)}
            onRemove={makeRemove(setKtpSlot, () => originals.current.ktp)}
          />
          <PhotoSlot
            label="KTM"
            photo={toDisplayItem(ktmSlot)}
            onCapture={makeCapture(setKtmSlot)}
            onRemove={makeRemove(setKtmSlot, () => originals.current.ktm)}
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
  safe: { backgroundColor: colors.background, flex: 1 },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },

  // App Bar
  appBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  appBarTitle: {
    ...textStyles.headlineSm,
    color: colors.onSurface,
    flex: 1,
    marginLeft: spacing.xs,
  },

  // Scroll
  scroll: { paddingBottom: 160 },

  // Field inside FieldCard
  fieldLabel: {
    ...textStyles.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  divider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
    marginVertical: spacing.sm,
  },
  input: {
    ...textStyles.bodyMd,
    color: colors.onSurface,
    padding: 0,
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
  },

  // Photo row (outside FieldCard, matches FieldCard marginHorizontal)
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
  },
})
