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

import { BottomActionBar } from "@/components/form/BottomActionBar"
import { FieldCard } from "@/components/form/FieldCard"
import { RupiahInput } from "@/components/form/RupiahInput"
import { SearchField } from "@/components/form/SearchField"
import { SectionLabel } from "@/components/form/SectionLabel"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { createManualHutang, getUserSummaries } from "@/services/rentals"
import type { UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing } from "@/theme/tokens"
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
      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Hutang Baru</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SectionLabel>Pelanggan</SectionLabel>

        {/* Pelanggan card: search + user rows combined */}
        <View style={styles.pelangganCard}>
          {/* Search row inside card */}
          <View style={styles.pelangganSearch}>
            <SearchField value={query} onChangeText={setQuery} placeholder="Cari nama user..." />
          </View>

          {usersLoading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} />
          ) : (
            <View>
              {filtered.slice(0, 20).map((u, index) => {
                const selected = u.id === selectedUserId
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.userRow,
                      index > 0 && styles.userRowBorder,
                      selected && styles.userRowSelected,
                    ]}
                    onPress={() => setSelectedUserId(u.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        textStyles.bodyMd,
                        styles.userRowName,
                        selected && styles.userRowNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {u.nickname ? `${u.name} (${u.nickname})` : u.name}
                    </Text>
                    {selected && (
                      <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

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
            placeholderTextColor={colors.outlineVariant}
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
  safe: { backgroundColor: colors.background, flex: 1 },

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

  // Pelanggan section (custom card: search + list rows)
  pelangganCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    elevation: 2,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.base,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  pelangganSearch: {
    borderBottomColor: colors.surfaceVariant,
    borderBottomWidth: 1,
    padding: spacing.md,
  },
  userRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  userRowBorder: {
    borderTopColor: colors.surfaceVariant,
    borderTopWidth: 1,
  },
  userRowSelected: {
    backgroundColor: colors.primaryFixed,
    borderLeftColor: colors.primary,
    borderLeftWidth: 4,
  },
  userRowName: { color: colors.onSurface, flex: 1, marginRight: spacing.sm },
  userRowNameSelected: { color: colors.onSurface, fontFamily: "publicSansSemiBold" },

  // Field inside FieldCard
  fieldLabel: {
    ...textStyles.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  input: {
    ...textStyles.bodyMd,
    color: colors.onSurface,
    padding: 0,
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
})
