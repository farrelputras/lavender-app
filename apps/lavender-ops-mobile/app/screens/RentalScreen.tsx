import { useState, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getRentals } from "@/services/rentals"
import type { RentalListItem } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatDateShort, formatRupiah } from "@/utils/format"

type Nav = NativeStackNavigationProp<AppStackParamList>

function statusColor(s: RentalListItem["status"]) {
  if (s === "ACTIVE") return colors.warning
  if (s === "CANCELLED") return colors.outline
  return colors.primary
}

function statusLabel(s: RentalListItem["status"]) {
  if (s === "ACTIVE") return "Aktif"
  if (s === "CANCELLED") return "Batal"
  return "Selesai"
}

function RentalCard({ r, onPress }: { r: RentalListItem; onPress: () => void }) {
  const sisa = Math.max(0, r.totalBill - r.totalPaid)
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={[textStyles.bodyLg, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>
          {r.userName}
        </Text>
        <View style={[styles.statusChip, { backgroundColor: statusColor(r.status) }]}>
          <Text style={[textStyles.labelMd, { color: colors.onPrimary }]}>{statusLabel(r.status)}</Text>
        </View>
      </View>
      <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, marginTop: 4 }]} numberOfLines={1}>
        {r.vehicleName} · {r.vehiclePlate}
      </Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
          {formatDateShort(r.startAt)} → {formatDateShort(r.dueAt)}
        </Text>
        {sisa > 0 ? (
          <Text style={[textStyles.labelMd, { color: colors.error }]}>Sisa {formatRupiah(sisa)}</Text>
        ) : (
          <Text style={[textStyles.labelMd, { color: colors.primary }]}>Lunas</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export function RentalScreen() {
  const nav = useNavigation<Nav>()
  const [items, setItems] = useState<RentalListItem[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getRentals().then((r) => {
        setItems(r)
        setLoading(false)
      })
    }, []),
  )

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
        <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Rental</Text>
        <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>{items.length} record</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <RentalCard r={item} onPress={() => nav.navigate("PenyewaanDetail", { rentalId: item.id })} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Belum ada rental.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingVertical: spacing.base, gap: 4 },
  list: { paddingBottom: 80 },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  empty: { alignItems: "center", padding: 24 },
})
