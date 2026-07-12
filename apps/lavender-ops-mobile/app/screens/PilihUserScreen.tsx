import { useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SectionList,
  ActivityIndicator,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import { SearchField } from "@/components/form/SearchField"
import type { SewaBaruScreenProps } from "@/navigators/navigationTypes"
import { getUserSummaries } from "@/services/rentals"
import type { UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing } from "@/theme/tokens"
import { formatRupiah, initialsFromName } from "@/utils/format"

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupByFirstLetter(summaries: UserSummary[]): { title: string; data: UserSummary[] }[] {
  const map = new Map<string, UserSummary[]>()
  for (const u of summaries) {
    const letter = u.name[0].toUpperCase()
    const bucket = map.get(letter) ?? []
    bucket.push(u)
    map.set(letter, bucket)
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }))
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function UserCard({ summary, onPress }: { summary: UserSummary; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.userCard, summary.debtAmount > 0 && styles.userCardDebt]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.userCardRow}>
        <View style={styles.userAvatar}>
          <Text style={[textStyles.labelLg, { color: colors.onPrimaryContainer }]}>
            {initialsFromName(summary.name)}
          </Text>
        </View>

        <View style={styles.userCardContent}>
          <Text style={[textStyles.bodyLg, { color: colors.onSurface }]} numberOfLines={1}>
            {summary.nickname ? `${summary.name} (${summary.nickname})` : summary.name}
          </Text>
          <View style={styles.chipRow}>
            {summary.isVerified ? (
              <View style={[styles.chip, styles.chipVerified]}>
                <MaterialIcons
                  name="check-circle"
                  size={12}
                  color={colors.onSuccessContainer}
                  style={{ marginRight: 3 }}
                />
                <Text style={[textStyles.labelMd, { color: colors.onSuccessContainer }]}>
                  Terverifikasi
                </Text>
              </View>
            ) : (
              <View style={[styles.chip, styles.chipUnverified]}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                  Belum Diverifikasi
                </Text>
              </View>
            )}
            {summary.activeRentalsCount > 0 && (
              <View style={[styles.chip, styles.chipActive]}>
                <Text style={[textStyles.labelMd, { color: colors.onWarningContainer }]}>
                  Sedang Sewa ({summary.activeRentalsCount})
                </Text>
              </View>
            )}
            {summary.debtAmount > 0 && (
              <View style={[styles.chip, styles.chipDebt]}>
                <Text style={[textStyles.labelMd, { color: colors.onErrorContainer }]}>
                  Hutang {formatRupiah(summary.debtAmount)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  )
}

function ListFooter({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.footerLink} activeOpacity={0.8} onPress={onPress}>
      <Text style={[textStyles.labelLg, { color: colors.primary }]}>
        + Tidak ketemu? Daftarkan User Baru
      </Text>
    </TouchableOpacity>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function PilihUserScreen({ navigation, route }: SewaBaruScreenProps<"PilihUser">) {
  const [summaries, setSummaries] = useState<UserSummary[]>([])
  const [query, setQuery] = useState("")
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [loading, setLoading] = useState(true)

  const searchInputRef = useRef<TextInput>(null)
  const createdUserId = route.params?.createdUserId

  useFocusEffect(
    useCallback(() => {
      getUserSummaries().then((data) => {
        setSummaries(data)
        setLoading(false)
      })
    }, []),
  )

  // UserForm hands a freshly-created customer back here. Clear the param before navigating so
  // that backing out of PilihKendaraan lands on the list, not straight back into PilihKendaraan.
  useEffect(() => {
    if (!createdUserId) return
    navigation.setParams({ createdUserId: undefined })
    navigation.navigate("PilihKendaraan", { userId: createdUserId })
  }, [createdUserId, navigation])

  const handleDaftarkanUserBaru = () =>
    navigation.navigate("UserForm", { mode: "create", returnTo: "SewaBaru" })

  const q = query.toLowerCase()
  const filtered = summaries.filter(
    (u) => u.name.toLowerCase().includes(q) || (u.nickname?.toLowerCase().includes(q) ?? false),
  )
  const sections = groupByFirstLetter(summaries)

  const handleBatal = () => {
    setQuery("")
    setIsSearchMode(false)
    searchInputRef.current?.blur()
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Sewa Baru</Text>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
            Langkah 1 dari 3 · Pilih User
          </Text>
        </View>
        <View style={styles.appBarSpacer} />
      </View>

      {/* Progress bar — 1/3 */}
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchFieldWrap}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsSearchMode(true)}
            placeholder="Cari nama atau panggilan..."
            inputRef={searchInputRef}
          />
        </View>
        {isSearchMode && (
          <TouchableOpacity onPress={handleBatal}>
            <Text style={[textStyles.labelLg, { color: colors.primary }]}>Batal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Result count (search mode only) */}
      {isSearchMode && (
        <View style={styles.resultCount}>
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
            {filtered.length} user ditemukan
          </Text>
        </View>
      )}

      {/* List area */}
      <View style={styles.listArea}>
        {isSearchMode ? (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <UserCard
                summary={item}
                onPress={() => navigation.navigate("PilihKendaraan", { userId: item.id })}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={<ListFooter onPress={handleDaftarkanUserBaru} />}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
                  Tidak ada user ditemukan
                </Text>
              </View>
            }
          />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <UserCard
                summary={item}
                onPress={() => navigation.navigate("PilihKendaraan", { userId: item.id })}
              />
            )}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>
                  {section.title}
                </Text>
              </View>
            )}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
            ListFooterComponent={<ListFooter onPress={handleDaftarkanUserBaru} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },

  // AppBar
  appBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  backBtn: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  titleBlock: {
    flex: 1,
  },
  appBarSpacer: {
    width: 40,
  },

  // Progress bar
  progressTrack: {
    backgroundColor: colors.surfaceVariant,
    height: 4,
  },
  progressFill: {
    backgroundColor: colors.primary,
    height: 4,
    width: "33.33%",
  },

  // Search
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  searchFieldWrap: { flex: 1 },

  // Result count
  resultCount: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.base,
  },

  // List
  listArea: {
    flex: 1,
    position: "relative",
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xs,
  },

  // Section header
  sectionHeader: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },

  // User card
  userCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    elevation: 2,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.base,
    padding: spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  userCardDebt: {
    borderLeftColor: colors.error,
    borderLeftWidth: 4,
  },
  userCardRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  userAvatar: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 24,
    flexShrink: 0,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  userCardContent: {
    flex: 1,
    gap: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipVerified: {
    backgroundColor: colors.successContainer,
  },
  chipUnverified: {
    backgroundColor: colors.surfaceVariant,
  },
  chipActive: {
    backgroundColor: colors.warningContainer,
  },
  chipDebt: {
    backgroundColor: colors.errorContainer,
  },

  // Footer
  footerLink: {
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    padding: 24,
  },
})
