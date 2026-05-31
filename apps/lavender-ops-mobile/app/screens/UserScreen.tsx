// app/screens/UserScreen.tsx
import { useState, useCallback, useRef } from "react"
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SectionList,
  ActivityIndicator,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getUserSummaries } from "@/services/rentals"
import type { UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatRupiah, initialsFromName } from "@/utils/format"

type Nav = NativeStackNavigationProp<AppStackParamList>

function groupByFirstLetter(rows: UserSummary[]) {
  const m = new Map<string, UserSummary[]>()
  for (const u of rows) {
    const l = u.name[0].toUpperCase()
    const b = m.get(l) ?? []
    b.push(u)
    m.set(l, b)
  }
  return Array.from(m.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }))
}

function UserRow({ u, onPress }: { u: UserSummary; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      {u.profilPhoto?.uri ? (
        <Image source={{ uri: u.profilPhoto.uri }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatarCircle}>
          <Text style={[textStyles.labelLg, { color: colors.onPrimaryContainer }]}>
            {initialsFromName(u.name)}
          </Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={[textStyles.bodyLg, { color: colors.onSurface }]} numberOfLines={1}>
          {u.nickname ? `${u.name} (${u.nickname})` : u.name}
        </Text>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
          {u.phone}
        </Text>
        <View style={styles.chipRow}>
          {u.debtAmount > 0 && (
            <View style={[styles.chip, styles.chipDebt]}>
              <Text style={[textStyles.labelMd, { color: colors.onErrorContainer }]}>
                Hutang {formatRupiah(u.debtAmount)}
              </Text>
            </View>
          )}
          {u.activeRentalsCount > 0 && (
            <View style={[styles.chip, styles.chipActive]}>
              <Text style={[textStyles.labelMd, { color: colors.onWarningContainer }]}>
                Sewa Aktif ({u.activeRentalsCount})
              </Text>
            </View>
          )}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  )
}

export function UserScreen() {
  const navigation = useNavigation<Nav>()
  const [rows, setRows] = useState<UserSummary[]>([])
  const [query, setQuery] = useState("")
  const [searchMode, setSearchMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<TextInput>(null)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getUserSummaries().then((data) => {
        setRows(data)
        setLoading(false)
      })
    }, []),
  )

  const q = query.toLowerCase()
  const filtered = rows.filter(
    (u) => u.name.toLowerCase().includes(q) || (u.nickname?.toLowerCase().includes(q) ?? false),
  )
  const sections = groupByFirstLetter(rows)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>User</Text>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
          {rows.length} total
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchRef}
            style={[textStyles.bodyMd, styles.searchInput]}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchMode(true)}
            placeholder="Cari nama atau panggilan..."
            placeholderTextColor={colors.onSurfaceVariant}
          />
          {searchMode && query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
        {searchMode && (
          <TouchableOpacity
            onPress={() => {
              setQuery("")
              setSearchMode(false)
              searchRef.current?.blur()
            }}
          >
            <Text style={[textStyles.labelLg, { color: colors.primary }]}>Batal</Text>
          </TouchableOpacity>
        )}
      </View>

      {searchMode ? (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <UserRow u={item} onPress={() => navigation.navigate("UserDetail", { userId: item.id })} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
                Tidak ada user ditemukan
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <UserRow u={item} onPress={() => navigation.navigate("UserDetail", { userId: item.id })} />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>{section.title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("UserForm", { mode: "create" })}
      >
        <MaterialIcons name="person-add" size={24} color={colors.onPrimary} />
        <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>User Baru</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: colors.onSurface, padding: 0 },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listContent: { paddingBottom: 120, paddingTop: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  rowBody: { flex: 1, gap: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipDebt: { backgroundColor: colors.errorContainer },
  chipActive: { backgroundColor: colors.warningContainer },
  emptyState: { alignItems: "center", padding: 24 },
  fab: {
    position: "absolute",
    right: spacing.base,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    elevation: 6,
  },
})
