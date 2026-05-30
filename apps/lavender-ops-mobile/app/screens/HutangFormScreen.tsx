// app/screens/HutangFormScreen.tsx
import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

import { SectionLabel } from "@/components/form/SectionLabel"
import { FieldCard } from "@/components/form/FieldCard"
import { RupiahInput } from "@/components/form/RupiahInput"
import { BottomActionBar } from "@/components/form/BottomActionBar"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { createManualHutang, getUserSummaries } from "@/services/rentals"
import type { UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { parseRupiahInput } from "@/utils/format"

export function HutangFormScreen({ navigation }: AppStackScreenProps<"HutangForm">) {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [jumlahRaw, setJumlahRaw] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getUserSummaries().then((u) => {
      setUsers(u)
      setUsersLoading(false)
    })
  }, [])

  const filtered = users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
  const jumlah = parseRupiahInput(jumlahRaw)
  const canSave = selectedUserId !== null && jumlah > 0 && !saving

  const handleSave = async () => {
    if (!selectedUserId || jumlah <= 0) return
    setSaving(true)
    try {
      const h = await createManualHutang({
        userId: selectedUserId,
        jumlahAwal: jumlah,
        notes: notes.trim() || undefined,
      })
      navigation.replace("HutangDetail", { hutangId: h.id })
    } catch (e) {
      Alert.alert("Gagal menyimpan", e instanceof Error ? e.message : "Coba lagi")
      setSaving(false)
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
          Hutang Baru
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SectionLabel>Pelanggan</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Cari user</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Nama atau panggilan"
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </FieldCard>

        {usersLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} />
        ) : (
          filtered.slice(0, 20).map((u) => {
            const selected = u.id === selectedUserId
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.userOption, selected && styles.userOptionSelected]}
                onPress={() => setSelectedUserId(u.id)}
              >
                <Text style={[textStyles.bodyLg, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>
                  {u.nickname ? `${u.name} (${u.nickname})` : u.name}
                </Text>
                {selected && <MaterialIcons name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            )
          })
        )}

        <SectionLabel>Jumlah</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Jumlah Awal *</Text>
          <RupiahInput value={jumlahRaw} onChangeText={setJumlahRaw} placeholder="0" />
        </FieldCard>

        <SectionLabel>Catatan</SectionLabel>
        <FieldCard>
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
  appBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  scroll: { paddingBottom: 160 },
  fieldLabel: { color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 },
  input: { color: colors.onSurface, fontSize: 16, padding: 0 },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  userOption: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.base,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.card,
    backgroundColor: colors.surfaceContainerLowest,
  },
  userOptionSelected: { borderColor: colors.primary, borderWidth: 2 },
})
