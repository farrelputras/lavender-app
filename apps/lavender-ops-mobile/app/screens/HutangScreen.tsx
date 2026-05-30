// app/screens/HutangScreen.tsx
import { useState, useCallback } from "react"
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
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatRupiah } from "@/utils/format"

type Nav = NativeStackNavigationProp<AppStackParamList>

function HutangCard({ h, onPress }: { h: HutangFull; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={[textStyles.bodyLg, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>
          {h.userName}
        </Text>
        <Text style={[textStyles.headlineSm, { color: colors.error }]}>{formatRupiah(h.sisa)}</Text>
      </View>
      <View style={[styles.row, { marginTop: 4 }]}>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
          Awal {formatRupiah(h.jumlahAwal)}
        </Text>
        {h.rentalId ? (
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
            Dari rental
          </Text>
        ) : (
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Manual</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export function HutangScreen() {
  const nav = useNavigation<Nav>()
  const [items, setItems] = useState<HutangFull[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getHutangs(true).then((r) => {
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

  const totalSisa = items.reduce((s, h) => s + h.sisa, 0)

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Hutang Aktif</Text>
        <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
          {items.length} pelanggan · total {formatRupiah(totalSisa)}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <HutangCard h={item} onPress={() => nav.navigate("HutangDetail", { hutangId: item.id })} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Tidak ada hutang aktif.
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate("HutangForm")} activeOpacity={0.85}>
        <MaterialIcons name="add" size={24} color={colors.onPrimary} />
        <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Hutang Baru</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingVertical: spacing.base, gap: 4 },
  list: { paddingBottom: 120 },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
    borderLeftColor: colors.error,
    borderLeftWidth: 4,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  empty: { alignItems: "center", padding: 24 },
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
