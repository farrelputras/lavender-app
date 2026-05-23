import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SectionList,
  ActivityIndicator,
  Platform,
  Alert,
  ToastAndroid,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { colors, textStyles, spacing } from '../../src/theme'
import { getUserSummaries } from '../../src/connectors'
import { UserSummary } from '../../src/connectors/types'
import { formatRupiah } from '../../src/lib/format'

// ─── Helpers ────────────────────────────────────────────────────────────────

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert('', msg)
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

function groupByFirstLetter(
  summaries: UserSummary[]
): { title: string; data: UserSummary[] }[] {
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

function UserCard({ summary }: { summary: UserSummary }) {
  return (
    <TouchableOpacity
      style={[styles.userCard, summary.debtAmount > 0 && styles.userCardDebt]}
      activeOpacity={0.8}
      onPress={() => {
        // TODO: router.push('/sewa-baru/pilih-kendaraan') when Step 2 lands
        showToast('Langkah 2 belum tersedia di demo')
      }}
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

function ListFooter() {
  return (
    <TouchableOpacity
      style={styles.footerLink}
      activeOpacity={0.8}
      onPress={() => showToast('Belum tersedia di demo')}
    >
      <Text style={[textStyles.labelLg, { color: colors.primary }]}>
        + Tidak ketemu? Daftarkan User Baru
      </Text>
    </TouchableOpacity>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PilihUserScreen() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<UserSummary[]>([])
  const [query, setQuery] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [loading, setLoading] = useState(true)

  const searchInputRef = useRef<TextInput>(null)

  useEffect(() => {
    getUserSummaries().then((data) => {
      setSummaries(data)
      setLoading(false)
    })
  }, [])

  const q = query.toLowerCase()
  const filtered = summaries.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      (u.nickname?.toLowerCase().includes(q) ?? false)
  )
  const sections = groupByFirstLetter(summaries)

  const handleClearQuery = () => setQuery('')

  const handleBatal = () => {
    setQuery('')
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
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => router.back()}
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
        <View style={styles.searchInputContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={colors.onSurfaceVariant}
            style={{ marginRight: 8 }}
          />
          <TextInput
            ref={searchInputRef}
            style={[textStyles.bodyMd, styles.searchInput]}
            placeholder="Cari nama atau panggilan..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsSearchMode(true)}
            returnKeyType="search"
          />
          {isSearchMode && query.length > 0 && (
            <TouchableOpacity
              onPress={handleClearQuery}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
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
            renderItem={({ item }) => <UserCard summary={item} />}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={ListFooter}
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
            renderItem={({ item }) => <UserCard summary={item} />}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>
                  {section.title}
                </Text>
              </View>
            )}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
            ListFooterComponent={ListFooter}
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
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  // AppBar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  appBarSpacer: {
    width: 40,
  },

  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceVariant,
  },
  progressFill: {
    height: 4,
    width: '33.33%',
    backgroundColor: colors.primary,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.onSurface,
    padding: 0,
  },

  // Result count
  resultCount: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xs,
  },

  // List
  listArea: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },

  // Section header
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },

  // User card
  userCard: {
    borderRadius: 12,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  userCardDebt: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  userCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  userCardContent: {
    flex: 1,
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
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
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
  },

  // Empty state
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
})
