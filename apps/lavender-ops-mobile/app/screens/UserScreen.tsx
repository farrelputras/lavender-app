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

import { SearchField } from "@/components/form/SearchField"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getUserSummaries } from "@/services/rentals"
import type { UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing } from "@/theme/tokens"
import { formatRupiah, initialsFromName } from "@/utils/format"

type Nav = NativeStackNavigationProp<AppStackParamList>

// Cycles through two palette options so the same user always gets the same avatar color.
const AVATAR_PALETTES = [
  { bg: colors.primaryContainer, text: colors.onPrimaryContainer },
  { bg: colors.secondaryContainer, text: colors.onSurface },
] as const

function avatarPalette(name: string) {
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length]
}

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
  const palette = avatarPalette(u.name)
  const hasChips = u.debtAmount > 0 || u.activeRentalsCount > 0
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {u.profilPhoto?.uri ? (
        <Image source={{ uri: u.profilPhoto.uri }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatarCircle, { backgroundColor: palette.bg }]}>
          <Text style={[textStyles.labelLg, { color: palette.text }]}>
            {initialsFromName(u.name)}
          </Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.nameText} numberOfLines={1}>
          {u.name}
          {u.nickname ? <Text style={styles.nicknameText}> ({u.nickname})</Text> : null}
        </Text>
        <Text style={styles.phoneText} numberOfLines={1}>
          {u.phone}
        </Text>
        {hasChips && (
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
        )}
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.outlineVariant} />
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
        <Text style={styles.title}>User</Text>
        <Text style={styles.subtitle}>{rows.length} total</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchFieldWrap}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchMode(true)}
            placeholder="Cari nama atau panggilan..."
            inputRef={searchRef}
          />
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
            <UserRow
              u={item}
              onPress={() => navigation.navigate("UserDetail", { userId: item.id })}
            />
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
            <UserRow
              u={item}
              onPress={() => navigation.navigate("UserDetail", { userId: item.id })}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLetter}>{section.title}</Text>
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
        <MaterialIcons name="person-add" size={22} color={colors.onPrimary} />
        <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>User Baru</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
} as const

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },

  // Header
  header: {
    paddingBottom: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.primary,
    fontFamily: "publicSansBold",
    fontSize: 40,
    lineHeight: 48,
  },
  subtitle: {
    ...textStyles.bodyMd,
    color: colors.secondary,
    marginTop: spacing.xs,
  },

  // Search
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
  },
  searchFieldWrap: { flex: 1 },

  // Section header (sticky)
  sectionHeader: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
  },
  sectionLetter: {
    ...textStyles.headlineSm,
    color: colors.secondary,
    paddingLeft: spacing.xs,
  },

  // List
  listContent: { paddingBottom: 120 },

  // Card
  card: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.base,
    padding: spacing.md,
    ...CARD_SHADOW,
  },
  avatarCircle: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarImage: { borderRadius: 24, height: 48, width: 48 },
  cardBody: { flex: 1 },
  nameText: {
    ...textStyles.bodyLg,
    color: colors.onSurface,
    fontFamily: "publicSansSemiBold",
  },
  nicknameText: {
    ...textStyles.bodyLg,
    color: colors.secondary,
    fontFamily: "publicSansRegular",
  },
  phoneText: {
    ...textStyles.bodyMd,
    color: colors.secondary,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xs,
  },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  chipDebt: { backgroundColor: colors.errorContainer },
  chipActive: { backgroundColor: colors.warningContainer },

  // Empty
  emptyState: { alignItems: "center", padding: 24 },

  // FAB
  fab: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: spacing.xl,
    elevation: 8,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: "absolute",
    right: spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
})
