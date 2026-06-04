import { useState, useCallback, useMemo } from "react"
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import { SearchField } from "@/components/form/SearchField"
import { StatusPill } from "@/components/form/StatusPill"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getRentals } from "@/services/rentals"
import type { RentalListItem } from "@/services/rentals/types"
import { colors, textStyles, spacing, cardShadow } from "@/theme/tokens"
import { formatDateShort, formatRupiah } from "@/utils/format"

type Nav = NativeStackNavigationProp<AppStackParamList>
type FilterTab = "ALL" | "ACTIVE" | "COMPLETED"

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "ACTIVE", label: "Aktif" },
  { key: "COMPLETED", label: "Selesai" },
]

function statusConfig(status: RentalListItem["status"]) {
  switch (status) {
    case "ACTIVE":
      return { label: "Aktif", bg: colors.warningContainer, color: colors.onWarningContainer }
    case "COMPLETED":
      return { label: "Selesai", bg: colors.successContainer, color: colors.onSuccessContainer }
    case "CANCELLED":
      return { label: "Batal", bg: colors.secondaryContainer, color: colors.onSurfaceVariant }
  }
}

function RentalCard({ r, onPress }: { r: RentalListItem; onPress: () => void }) {
  const cfg = statusConfig(r.status)
  const sisa = Math.max(0, r.totalBill - r.totalPaid)
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>
          {r.userName}
        </Text>
        <StatusPill label={cfg.label} bg={cfg.bg} color={cfg.color} />
      </View>
      <Text style={styles.cardVehicle} numberOfLines={1}>
        {r.vehicleName} · {r.vehiclePlate}
      </Text>
      <View style={styles.divider} />
      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <MaterialIcons
            name="calendar-today"
            size={15}
            color={colors.onSurfaceVariant}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.dateText}>
            {formatDateShort(r.startAt)} → {formatDateShort(r.dueAt)}
          </Text>
        </View>
        {sisa > 0 ? (
          <Text style={styles.sisaText}>Sisa {formatRupiah(sisa)}</Text>
        ) : (
          <Text style={styles.lunasText}>Lunas</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export function RentalScreen() {
  const nav = useNavigation<Nav>()
  const [items, setItems] = useState<RentalListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL")

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getRentals().then((r) => {
        setItems(r)
        setLoading(false)
      })
    }, []),
  )

  const displayed = useMemo(() => {
    let result = items
    if (activeTab !== "ALL") result = result.filter((r) => r.status === activeTab)
    if (query) {
      const q = query.toLowerCase()
      result = result.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          r.vehicleName.toLowerCase().includes(q) ||
          r.vehiclePlate.toLowerCase().includes(q),
      )
    }
    return result
  }, [items, activeTab, query])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rental</Text>
        <Text style={styles.subtitle}>{items.length} record</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Cari rental..." />
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {FILTER_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <RentalCard
            r={item}
            onPress={() => nav.navigate("RentalDetail", { rentalId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Belum ada rental.
            </Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
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
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
  },

  // Filter tabs
  tabRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.base,
  },
  tab: {
    alignItems: "center",
    borderColor: colors.outlineVariant,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  tabText: { ...textStyles.labelLg, color: colors.onSurface },
  tabTextActive: { color: colors.onPrimaryContainer },

  // List
  listContent: { paddingBottom: 80 },
  emptyState: { alignItems: "center", padding: 24 },

  // Card
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.base,
    padding: spacing.md,
    ...cardShadow,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  cardName: {
    ...textStyles.headlineSm,
    color: colors.onSurface,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardVehicle: {
    ...textStyles.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  divider: {
    backgroundColor: colors.surfaceVariant,
    height: 1,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateRow: { alignItems: "center", flexDirection: "row" },
  dateText: { ...textStyles.bodyMd, color: colors.onSurfaceVariant },
  sisaText: { ...textStyles.labelLg, color: colors.error },
  lunasText: { ...textStyles.labelLg, color: colors.success },
})
