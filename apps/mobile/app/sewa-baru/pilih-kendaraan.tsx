import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
  ToastAndroid,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useState, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { colors, textStyles, spacing } from '../../src/theme'
import { getUserSummary, getVehicleSummaries } from '../../src/connectors'
import { UserSummary, VehicleSummary, VehicleCategory } from '../../src/connectors/types'
import { initialsFromName } from '../../src/lib/format'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert('', msg)
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type FilterCategory = 'semua' | VehicleCategory

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[textStyles.labelMd, { color: active ? colors.onPrimary : colors.onSurface }]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function VehicleCard({
  vehicle,
  onPress,
}: {
  vehicle: VehicleSummary
  onPress: () => void
}) {
  const isMotor = vehicle.category === 'motor'

  return (
    <TouchableOpacity
      style={[styles.vehicleCard, !vehicle.available && styles.vehicleCardUnavailable]}
      activeOpacity={vehicle.available ? 0.8 : 1}
      disabled={!vehicle.available}
      onPress={onPress}
    >
      {/* Icon panel */}
      <View style={styles.vehicleIconPanel}>
        <MaterialIcons
          name={isMotor ? 'two-wheeler' : 'directions-car'}
          size={40}
          color={vehicle.available ? colors.primary : colors.onSurfaceVariant}
        />
        {!vehicle.available && (
          <View style={styles.unavailableChip}>
            <Text style={[textStyles.labelMd, { color: colors.onTertiaryContainer, fontSize: 11 }]}>
              Sedang Disewa
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.vehicleInfo}>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface }]} numberOfLines={1}>
          {vehicle.plate}
        </Text>
        <Text
          style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {vehicle.name}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PilihKendaraanScreen() {
  const router = useRouter()
  const { userId } = useLocalSearchParams<{ userId: string }>()

  const [userSummary, setUserSummary] = useState<UserSummary | null>(null)
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FilterCategory>('semua')
  const [showUnavailable, setShowUnavailable] = useState(false)

  useEffect(() => {
    if (!userId) {
      showToast('Data user tidak ditemukan')
      router.back()
      return
    }
    Promise.all([getUserSummary(userId), getVehicleSummaries()]).then(([user, vehs]) => {
      setUserSummary(user)
      setVehicles(vehs)
      setLoading(false)
    })
  }, [userId])

  const q = query.toLowerCase()
  const filtered = vehicles.filter((v) => {
    if (!showUnavailable && !v.available) return false
    if (category !== 'semua' && v.category !== category) return false
    if (q && !v.plate.toLowerCase().includes(q) && !v.name.toLowerCase().includes(q)) return false
    return true
  })

  const availableCount = filtered.filter((v) => v.available).length
  const unavailableCount = filtered.filter((v) => !v.available).length

  const countLabel = showUnavailable
    ? `${availableCount} kendaraan tersedia (${unavailableCount} tidak tersedia)`
    : `${availableCount} kendaraan tersedia`

  const handleSelectVehicle = (vehicle: VehicleSummary) => {
    showToast('Langkah 3 belum tersedia di demo')
  }

  const displayName = userSummary
    ? userSummary.nickname
      ? `${userSummary.name} (${userSummary.nickname})`
      : userSummary.name
    : '...'

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
            Langkah 2 dari 3 · Pilih Kendaraan
          </Text>
        </View>
        <View style={styles.appBarSpacer} />
      </View>

      {/* Progress bar — 2/3 */}
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      {/* Selected user strip */}
      <View style={styles.userStrip}>
        <View style={styles.userAvatar}>
          <Text style={[textStyles.labelLg, { color: colors.onPrimaryContainer }]}>
            {userSummary ? initialsFromName(userSummary.name) : '?'}
          </Text>
        </View>
        <View style={styles.userStripText}>
          <Text style={[textStyles.labelMd, { color: colors.onPrimaryFixedVariant }]}>Untuk:</Text>
          <Text style={[textStyles.bodyMd, { color: colors.onPrimaryFixed, fontWeight: '500' }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[textStyles.labelLg, { color: colors.primary }]}>Ubah</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
          <TextInput
            style={[textStyles.bodyMd, styles.searchInput]}
            placeholder="Cari plat nomor..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* Filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip label="Semua" active={category === 'semua'}  onPress={() => setCategory('semua')} />
          <FilterChip label="Motor" active={category === 'motor'}  onPress={() => setCategory('motor')} />
          <FilterChip label="Mobil" active={category === 'mobil'}  onPress={() => setCategory('mobil')} />
          <View style={styles.filterDivider} />
          <FilterChip label="Disewa" active={showUnavailable} onPress={() => setShowUnavailable((v) => !v)} />
        </ScrollView>
      </View>

      {/* Count label */}
      <Text style={[textStyles.labelMd, styles.countLabel]}>{countLabel}</Text>

      {/* Vehicle grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <VehicleCard vehicle={item} onPress={() => handleSelectVehicle(item)} />
        )}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Tidak ada kendaraan cocok dengan filter
            </Text>
          </View>
        }
      />
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
    width: '66.66%',
    backgroundColor: colors.primary,
  },

  // User strip
  userStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: colors.primaryFixed,
    borderRadius: 16,
    padding: spacing.base,
    gap: spacing.md,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  userStripText: {
    flex: 1,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
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

  // Filter chips
  filterRow: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.base,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.xs,
  },

  // Count label
  countLabel: {
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },

  // Grid
  gridContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  gridRow: {
    gap: spacing.base,
    marginBottom: spacing.base,
    justifyContent: 'flex-start',
  },

  // Vehicle card
  vehicleCard: {
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  vehicleCardUnavailable: {
    opacity: 0.5,
  },
  vehicleIconPanel: {
    height: 96,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableChip: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.tertiaryContainer,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vehicleInfo: {
    padding: spacing.base,
    gap: 2,
  },

  // Empty state
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
})
