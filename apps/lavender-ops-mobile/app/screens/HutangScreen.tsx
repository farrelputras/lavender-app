import { useState, useCallback, useMemo } from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getHutangs } from "@/services/rentals"
import type { HutangFull } from "@/services/rentals/types"
import { colors, textStyles, spacing, cardShadow } from "@/theme/tokens"
import { formatRupiah } from "@/utils/format"
import { StatusPill } from "@/components/form/StatusPill"
import { SearchField } from "@/components/form/SearchField"

type Nav = NativeStackNavigationProp<AppStackParamList>

function HutangCard({ h, onPress }: { h: HutangFull; onPress: () => void }) {
  const lunas = h.sisa === 0
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>
          {h.userName}
        </Text>
        <StatusPill
          label={h.rentalId ? "Dari rental" : "Manual"}
          bg={colors.surfaceContainer}
          color={colors.onSurfaceVariant}
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.sisaLabel}>Sisa</Text>
          {lunas ? (
            <View style={styles.lunasRow}>
              <MaterialIcons name="check-circle" size={18} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={[textStyles.headlineSm, { color: colors.success }]}>Lunas</Text>
            </View>
          ) : (
            <Text style={[textStyles.headlineSm, { color: colors.error }]}>{formatRupiah(h.sisa)}</Text>
          )}
        </View>
        <Text style={styles.awalText}>Awal {formatRupiah(h.jumlahAwal)}</Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={20}
        color={colors.outlineVariant}
        style={styles.chevron}
      />
    </TouchableOpacity>
  )
}

export function HutangScreen() {
  const nav = useNavigation<Nav>()
  const [items, setItems] = useState<HutangFull[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getHutangs(true).then((r) => {
        setItems(r)
        setLoading(false)
      })
    }, []),
  )

  const displayed = useMemo(() => {
    if (!query) return items
    const q = query.toLowerCase()
    return items.filter((h) => h.userName.toLowerCase().includes(q))
  }, [items, query])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const totalSisa = items.reduce((s, h) => s + h.sisa, 0)

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Hutang</Text>
        <Text style={styles.subtitle}>
          {items.length} pelanggan · total {formatRupiah(totalSisa)}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Cari pelanggan..." />
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <HutangCard h={item} onPress={() => nav.navigate("HutangDetail", { hutangId: item.id })} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Tidak ada hutang aktif.
            </Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => nav.navigate("HutangForm")}
      >
        <MaterialIcons name="add" size={22} color={colors.onPrimary} />
        <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Hutang Baru</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: 0,
  },
  title: {
    fontFamily: "publicSansBold",
    fontSize: 40,
    lineHeight: 48,
    color: colors.primary,
  },
  subtitle: {
    ...textStyles.bodyMd,
    color: colors.secondary,
    marginTop: spacing.xs,
  },

  // Search
  searchRow: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },

  // List
  listContent: { paddingBottom: 120 },
  emptyState: { alignItems: "center", padding: 24 },

  // Card
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    ...textStyles.bodyLg,
    fontFamily: "publicSansSemiBold",
    color: colors.onSurface,
    flex: 1,
    marginRight: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sisaLabel: { ...textStyles.labelMd, color: colors.onSurfaceVariant, marginBottom: 2 },
  lunasRow: { flexDirection: "row", alignItems: "center" },
  awalText: { ...textStyles.bodyMd, color: colors.onSurfaceVariant },
  chevron: { position: "absolute", top: spacing.md, right: spacing.md },

  // FAB
  fab: {
    position: "absolute",
    right: spacing.base,
    bottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.primary,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
})
