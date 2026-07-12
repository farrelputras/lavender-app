import { useState, useCallback, useMemo } from "react"
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import { SearchField } from "@/components/form/SearchField"
import { StatusPill } from "@/components/form/StatusPill"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getHutangs } from "@/services/rentals"
import type { HutangFull } from "@/services/rentals/types"
import { colors, textStyles, spacing, cardShadow } from "@/theme/tokens"
import { formatRupiah } from "@/utils/format"

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
              <MaterialIcons
                name="check-circle"
                size={18}
                color={colors.success}
                style={{ marginRight: 4 }}
              />
              <Text style={[textStyles.headlineSm, { color: colors.success }]}>Lunas</Text>
            </View>
          ) : (
            <Text style={[textStyles.headlineSm, { color: colors.error }]}>
              {formatRupiah(h.sisa)}
            </Text>
          )}
        </View>
        <View style={styles.cardFooterRight}>
          <Text style={styles.awalText}>Awal {formatRupiah(h.jumlahAwal)}</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.outlineVariant} />
        </View>
      </View>
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
          <HutangCard
            h={item}
            onPress={() => nav.navigate("HutangDetail", { hutangId: item.id })}
          />
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
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
  },

  // List
  listContent: { paddingBottom: 120 },
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
  },
  cardName: {
    ...textStyles.bodyLg,
    color: colors.onSurface,
    flex: 1,
    fontFamily: "publicSansSemiBold",
    marginRight: spacing.sm,
  },
  divider: {
    backgroundColor: colors.surfaceVariant,
    height: 1,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardFooterRight: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  sisaLabel: { ...textStyles.labelMd, color: colors.onSurfaceVariant, marginBottom: 2 },
  lunasRow: { alignItems: "center", flexDirection: "row" },
  awalText: { ...textStyles.bodyMd, color: colors.onSurfaceVariant },

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
