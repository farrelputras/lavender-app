import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import { SectionLabel } from "@/components/form/SectionLabel"
import PembayaranSheet from "@/components/PembayaranSheet"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { addHutangPayment, getHutangFull } from "@/services/rentals"
import type { HutangFull, Payment } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatRupiah, formatHeaderDate, formatTime } from "@/utils/format"

export function HutangDetailScreen({ route, navigation }: AppStackScreenProps<"HutangDetail">) {
  const { hutangId } = route.params
  const [h, setH] = useState<HutangFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)

  const reload = useCallback(() => {
    return getHutangFull(hutangId).then((res) => setH(res))
  }, [hutangId])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      reload().finally(() => setLoading(false))
    }, [reload]),
  )

  const handleAddPayment = async (p: Omit<Payment, "id">) => {
    try {
      const next = await addHutangPayment(hutangId, p)
      setH(next)
      setSheetOpen(false)
    } catch (e) {
      Alert.alert("Gagal menyimpan pembayaran", e instanceof Error ? e.message : "Coba lagi")
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }
  if (!h) return null

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
          Detail Hutang
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summary}>
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Pelanggan</Text>
          <Text style={[textStyles.headlineMd, { color: colors.onSurface }]}>{h.userName}</Text>

          <View style={{ height: spacing.md }} />
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Sisa</Text>
          <Text style={[textStyles.headlineLg, { color: h.sisa > 0 ? colors.error : colors.primary }]}>
            {formatRupiah(h.sisa)}
          </Text>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
            dari {formatRupiah(h.jumlahAwal)}
          </Text>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  h.status === "AKTIF" ? colors.errorContainer : colors.successContainer,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text
              style={[
                textStyles.labelMd,
                {
                  color:
                    h.status === "AKTIF" ? colors.onErrorContainer : colors.onSuccessContainer,
                },
              ]}
            >
              {h.status}
            </Text>
          </View>
        </View>

        {h.rentalId && (
          <TouchableOpacity
            style={styles.linkBlock}
            onPress={() => navigation.navigate("PenyewaanDetail", { rentalId: h.rentalId! })}
          >
            <Text style={[textStyles.bodyLg, { color: colors.primary }]}>Lihat rental sumber</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        <SectionLabel>Pembayaran</SectionLabel>
        {h.payments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Belum ada pembayaran.
            </Text>
          </View>
        ) : (
          h.payments.map((p) => (
            <View key={p.id} style={styles.payRow}>
              <View style={{ flex: 1 }}>
                <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{p.method}</Text>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                  {formatHeaderDate(p.paidAt)} · {formatTime(p.paidAt)}
                </Text>
              </View>
              <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>
                {formatRupiah(p.amount)}
              </Text>
            </View>
          ))
        )}

        {h.status === "AKTIF" && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setSheetOpen(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={20} color={colors.onPrimary} />
            <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Tambah Pembayaran</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <PembayaranSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleAddPayment}
        defaultAmount={h.sisa}
      />
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
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  scroll: { paddingBottom: spacing.xxl },
  summary: { paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  statusChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  linkBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
  },
  empty: { alignItems: "center", padding: 24 },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary,
  },
})
