import { useState, useEffect } from "react"
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
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

import type { SewaBaruScreenProps } from "@/navigators/navigationTypes"
import { getUserSummary, getVehicleSummaries } from "@/services/rentals"
import type { UserSummary, VehicleSummary, VehicleCategory } from "@/services/rentals/types"
import { colors, textStyles, spacing } from "@/theme/tokens"
import { initialsFromName } from "@/utils/format"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert("", msg)
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type FilterCategory = "semua" | VehicleCategory

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

function VehicleCard({ vehicle, onPress }: { vehicle: VehicleSummary; onPress: () => void }) {
  const isMotor = vehicle.category === "MOTOR"

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
          name={isMotor ? "two-wheeler" : "directions-car"}
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
        <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
          {vehicle.name}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function PilihKendaraanScreen({ navigation, route }: SewaBaruScreenProps<"PilihKendaraan">) {
  const { userId } = route.params

  const [userSummary, setUserSummary] = useState<UserSummary | null>(null)
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<FilterCategory>("semua")
  const [showUnavailable, setShowUnavailable] = useState(false)

  useEffect(() => {
    if (!userId) {
      showToast("Data user tidak ditemukan")
      navigation.goBack()
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
    if (category !== "semua" && v.category !== category) return false
    if (q && !v.plate.toLowerCase().includes(q) && !v.name.toLowerCase().includes(q)) return false
    return true
  })

  const availableCount = filtered.filter((v) => v.available).length
  const unavailableCount = filtered.filter((v) => !v.available).length

  const countLabel = showUnavailable
    ? `${availableCount} kendaraan tersedia (${unavailableCount} tidak tersedia)`
    : `${availableCount} kendaraan tersedia`

  const handleSelectVehicle = (vehicle: VehicleSummary) => {
    navigation.navigate("DetailSewa", { userId, vehicleId: vehicle.id })
  }

  const displayName = userSummary
    ? userSummary.nickname
      ? `${userSummary.name} (${userSummary.nickname})`
      : userSummary.name
    : "..."

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
            {userSummary ? initialsFromName(userSummary.name) : "?"}
          </Text>
        </View>
        <Text style={[textStyles.bodyMd, styles.userStripText]} numberOfLines={1}>
          {displayName}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[textStyles.labelLg, { color: colors.primary }]}>Ubah</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={colors.onSurfaceVariant}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={[textStyles.bodyMd, styles.searchInput]}
            placeholder="Cari plat nomor..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
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
          <FilterChip
            label="Semua"
            active={category === "semua"}
            onPress={() => setCategory("semua")}
          />
          <FilterChip
            label="Motor"
            active={category === "MOTOR"}
            onPress={() => setCategory("MOTOR")}
          />
          <FilterChip
            label="Mobil"
            active={category === "MOBIL"}
            onPress={() => setCategory("MOBIL")}
          />
          <View style={styles.filterDivider} />
          <FilterChip
            label="Disewa"
            active={showUnavailable}
            onPress={() => setShowUnavailable((v) => !v)}
          />
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
    width: "66.66%",
  },

  // User strip
  userStrip: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  userAvatar: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  userStripText: {
    color: colors.onSurface,
    flex: 1,
    fontWeight: "500",
  },

  // Search
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  searchInputContainer: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    flex: 1,
    flexDirection: "row",
    height: 48,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },

  // Filter chips
  filterRow: {
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  chip: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.base,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterDivider: {
    backgroundColor: colors.outlineVariant,
    height: 24,
    marginHorizontal: spacing.xs,
    width: 1,
  },

  // Count label
  countLabel: {
    color: colors.onSurfaceVariant,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },

  // Grid
  gridContent: {
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
  },
  gridRow: {
    gap: spacing.base,
    justifyContent: "flex-start",
    marginBottom: spacing.base,
  },

  // Vehicle card
  vehicleCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    elevation: 2,
    flexBasis: "48%",
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  vehicleCardUnavailable: {
    opacity: 0.5,
  },
  vehicleIconPanel: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    height: 96,
    justifyContent: "center",
  },
  unavailableChip: {
    backgroundColor: colors.tertiaryContainer,
    borderRadius: 999,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
    right: 6,
  },
  vehicleInfo: {
    gap: 2,
    padding: spacing.base,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    padding: 24,
  },
})
