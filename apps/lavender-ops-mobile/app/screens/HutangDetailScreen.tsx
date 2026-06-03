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

import PembayaranSheet from "@/components/PembayaranSheet"
import { StatusPill } from "@/components/form/StatusPill"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { addHutangPayment, getHutangFull } from "@/services/rentals"
import type { HutangFull, Payment } from "@/services/rentals/types"
import { colors, textStyles, spacing, cardShadow } from "@/theme/tokens"
import { formatRupiah, formatHeaderDate, formatTime } from "@/utils/format"

function methodLabel(p: Payment): string {
  switch (p.method) {
    case "CASH":
      return "Tunai"
    case "TRANSFER":
      return "Transfer"
    case "QRIS":
      return "QRIS"
    case "LAINNYA":
      return p.methodDescription ?? "Lainnya"
  }
}

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

  const isLunas = h.status === "LUNAS"

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Detail Hutang</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero Summary Card */}
        <View style={styles.heroCard}>
          {/* Status badge — absolute top-right */}
          <View style={styles.statusBadge}>
            <StatusPill
              label={isLunas ? "Lunas" : "Aktif"}
              bg={isLunas ? colors.successContainer : colors.errorContainer}
              color={isLunas ? colors.onSuccessContainer : colors.onErrorContainer}
              icon={isLunas ? "check" : undefined}
            />
          </View>

          {/* Pelanggan */}
          <View style={styles.heroSection}>
            <Text style={styles.heroFieldLabel}>Pelanggan</Text>
            <Text style={styles.heroName}>{h.userName}</Text>
          </View>

          <View style={styles.heroDivider} />

          {/* Sisa */}
          <View style={styles.heroSection}>
            <Text style={styles.heroFieldLabel}>Sisa Hutang</Text>
            <Text style={[textStyles.displayLg, { color: isLunas ? colors.primary : colors.error }]}>
              {formatRupiah(h.sisa)}
            </Text>
            <Text style={styles.heroSubtitle}>dari {formatRupiah(h.jumlahAwal)}</Text>
          </View>
        </View>

        {/* Rental source link */}
        {h.rentalId && (
          <TouchableOpacity
            style={styles.rentalLink}
            onPress={() => navigation.navigate("PenyewaanDetail", { rentalId: h.rentalId! })}
            activeOpacity={0.85}
          >
            <View style={styles.rentalLinkLeft}>
              <MaterialIcons name="payments" size={22} color={colors.primary} />
              <Text style={styles.rentalLinkText}>Lihat rental sumber</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Pembayaran section */}
        <Text style={styles.sectionHeading}>Pembayaran</Text>

        {h.payments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt" size={48} color={colors.outlineVariant} style={{ marginBottom: spacing.md }} />
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Belum ada pembayaran
            </Text>
          </View>
        ) : (
          h.payments.map((p) => (
            <View key={p.id} style={styles.payRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.payMethod}>{methodLabel(p)}</Text>
                <Text style={styles.payDate}>
                  {formatHeaderDate(p.paidAt)} · {formatTime(p.paidAt)}
                </Text>
              </View>
              <View style={styles.payAmountRow}>
                <Text style={styles.payAmount}>{formatRupiah(p.amount)}</Text>
                {isLunas && (
                  <MaterialIcons
                    name="check-circle"
                    size={18}
                    color={colors.primary}
                    style={{ marginLeft: spacing.xs }}
                  />
                )}
              </View>
            </View>
          ))
        )}

        {/* Tambah Pembayaran — only for active hutang */}
        {h.status === "AKTIF" && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setSheetOpen(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={20} color={colors.onPrimary} />
            <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>
              Tambah Pembayaran
            </Text>
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

  // App Bar
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  appBarTitle: {
    ...textStyles.headlineSm,
    color: colors.onSurface,
    flex: 1,
    marginLeft: spacing.xs,
  },

  // Scroll
  scroll: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxl, paddingTop: spacing.sm },

  // Hero card
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  statusBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
  },
  heroSection: { gap: spacing.xs },
  heroFieldLabel: { ...textStyles.labelMd, color: colors.onSurfaceVariant },
  heroName: { ...textStyles.headlineMd, color: colors.onSurface },
  heroDivider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginVertical: spacing.md,
  },
  heroSubtitle: { ...textStyles.labelMd, color: colors.onSurfaceVariant, marginTop: spacing.xs },

  // Rental source link
  rentalLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  rentalLinkLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rentalLinkText: { ...textStyles.bodyMd, color: colors.primary },

  // Pembayaran section
  sectionHeading: {
    ...textStyles.labelLg,
    color: colors.onSurface,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // Payment row
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  payMethod: { ...textStyles.bodyLg, color: colors.onSurface },
  payDate: { ...textStyles.labelMd, color: colors.onSurfaceVariant, marginTop: 2 },
  payAmountRow: { flexDirection: "row", alignItems: "center" },
  payAmount: { ...textStyles.bodyLg, color: colors.onSurface },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: "dashed",
    marginBottom: spacing.sm,
  },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: spacing.md,
    ...cardShadow,
  },
})
