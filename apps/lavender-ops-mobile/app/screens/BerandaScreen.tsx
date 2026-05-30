import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ToastAndroid,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getDashboardSummary, getRentalsDueToday } from "@/services/rentals"
import type { DashboardSummary, RentalDueToday } from "@/services/rentals/types"
import { colors, textStyles, borderRadius, spacing } from "@/theme/tokens"
import { formatHeaderDate, formatTime, formatRupiah } from "@/utils/format"
import { useSession } from "@/services/auth/useSession"

type BerandaNavProp = NativeStackNavigationProp<AppStackParamList>

function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert("", msg)
  }
}

export function BerandaScreen() {
  const navigation = useNavigation<BerandaNavProp>()
  const { signOut } = useSession()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [rentalsDue, setRentalsDue] = useState<RentalDueToday[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  const handleSignOut = () => {
    Alert.alert("Keluar?", "Anda akan diminta login lagi.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: () => {
          signOut()
        },
      },
    ])
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      Promise.all([getDashboardSummary(), getRentalsDueToday()]).then(([s, r]) => {
        setSummary(s)
        setRentalsDue(r)
        setLoading(false)
      })
    }, []),
  )

  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setNow(new Date()), 30_000)
      return () => clearInterval(id)
    }, []),
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!summary) return null

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={handleSignOut}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="person" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Halo!</Text>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              {formatHeaderDate(now)} • {formatTime(now)}
            </Text>
          </View>
          <MaterialIcons name="notifications" size={24} color={colors.onSurfaceVariant} />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnFilled]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("SewaBaru", { screen: "PilihUser" })}
          >
            <MaterialIcons name="add-circle" size={28} color={colors.onPrimary} />
            <Text style={[textStyles.headlineSm, { color: colors.onPrimary }]}>Sewa Baru</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutlined]}
            activeOpacity={0.8}
            onPress={() => showToast("Belum tersedia di demo")}
          >
            <MaterialIcons name="person-add" size={28} color={colors.primary} />
            <Text style={[textStyles.headlineSm, { color: colors.primary }]}>User Baru</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Harus Kembali Hari Ini */}
        <View style={styles.sectionHeader}>
          <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>
            Harus Kembali Hari Ini
          </Text>
          <View style={styles.countBadge}>
            <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
              ({rentalsDue.length})
            </Text>
          </View>
        </View>

        {rentalsDue.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Tidak ada kendaraan yang harus kembali hari ini
            </Text>
          </View>
        ) : (
          rentalsDue.map((item) => (
            <TouchableOpacity
              key={item.rentalId}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("PenyewaanDetail", { rentalId: item.rentalId })}
              style={[styles.rentalCard, item.status === "TERLAMBAT" && styles.rentalCardOverdue]}
            >
              {/* Row 1: customer name + status chip */}
              <View style={styles.cardRow}>
                <Text
                  style={[textStyles.labelLg, { color: colors.onSurface, flex: 1 }]}
                  numberOfLines={1}
                >
                  {item.customerName}
                </Text>
                <View
                  style={[
                    styles.statusChip,
                    item.status === "TERLAMBAT" ? styles.chipTerlambat : styles.chipBelumKembali,
                  ]}
                >
                  <Text
                    style={[
                      textStyles.labelMd,
                      {
                        color:
                          item.status === "TERLAMBAT" ? colors.onError : colors.onTertiaryContainer,
                      },
                    ]}
                  >
                    {item.status === "TERLAMBAT" ? "Terlambat" : "Belum Kembali"}
                  </Text>
                </View>
              </View>

              {/* Row 2: vehicle info */}
              <Text
                style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}
                numberOfLines={1}
              >
                {item.vehicleName} — {item.vehiclePlate}
              </Text>

              {/* Row 3: due time + chevron */}
              <View style={[styles.cardRow, { marginTop: 8 }]}>
                <View style={styles.timeRow}>
                  <MaterialIcons
                    name="schedule"
                    size={16}
                    color={item.status === "TERLAMBAT" ? colors.error : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      textStyles.bodyMd,
                      {
                        color: item.status === "TERLAMBAT" ? colors.error : colors.onSurfaceVariant,
                        marginLeft: 4,
                      },
                    ]}
                  >
                    Pukul {formatTime(item.dueAt)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Section: Ringkasan */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Ringkasan</Text>
        </View>

        <View style={styles.statsGrid}>
          {/* Penyewaan Aktif */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={[textStyles.labelMd, { color: colors.secondary }]}>Penyewaan Aktif</Text>
              <MaterialIcons name="two-wheeler" size={24} color={colors.primary} />
            </View>
            <Text style={[textStyles.displayLg, { color: colors.onSurface }]}>
              {summary.activeRentalsCount.toString()}
            </Text>
          </View>

          {/* Hutang Aktif */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={[textStyles.labelMd, { color: colors.secondary }]}>Hutang Aktif</Text>
              <MaterialIcons name="payments" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[textStyles.headlineMd, { color: colors.onSurface }]}>
                {formatRupiah(summary.activeDebtAmount)}
              </Text>
              <Text style={[textStyles.labelMd, { color: colors.secondary, marginTop: 2 }]}>
                {summary.activeDebtCustomerCount} pelanggan
              </Text>
            </View>
          </View>

          {/* Kendaraan Tersedia */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={[textStyles.labelMd, { color: colors.secondary }]}>
                Kendaraan Tersedia
              </Text>
              <MaterialIcons name="vpn-key" size={24} color={colors.primary} />
            </View>
            <View style={styles.statNumberRow}>
              <Text style={[textStyles.displayLg, { color: colors.onSurface }]}>
                {summary.availableVehiclesCount}
              </Text>
              <Text style={[textStyles.bodyLg, { color: colors.secondary, paddingBottom: 4 }]}>
                {" "}
                dari {summary.totalVehiclesCount}
              </Text>
            </View>
          </View>

          {/* User Terverifikasi */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={[textStyles.labelMd, { color: colors.secondary }]}>
                User Terverifikasi
              </Text>
              <MaterialIcons name="verified-user" size={24} color={colors.primary} />
            </View>
            <View style={styles.statNumberRow}>
              <Text style={[textStyles.displayLg, { color: colors.onSurface }]}>
                {summary.verifiedUsersCount}
              </Text>
              <Text style={[textStyles.bodyLg, { color: colors.secondary, paddingBottom: 4 }]}>
                {" "}
                dari {summary.totalUsersCount}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  )
}

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
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
  },
  actionBtn: {
    alignItems: "center",
    borderRadius: borderRadius.button,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 80,
    justifyContent: "center",
  },
  actionBtnFilled: {
    backgroundColor: colors.primary,
  },
  actionBtnOutlined: {
    backgroundColor: "transparent",
    borderColor: colors.outline,
    borderWidth: 1.5,
  },

  // Section header
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
  },
  countBadge: {
    marginLeft: spacing.xs,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    padding: 24,
  },

  // Rental card
  rentalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 10,
    marginHorizontal: spacing.base,
    padding: spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  rentalCardOverdue: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
    borderWidth: 1,
  },
  cardRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipBelumKembali: {
    backgroundColor: colors.tertiaryContainer,
  },
  chipTerlambat: {
    backgroundColor: colors.error,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
  },

  // Stats grid (single-column stack)
  statsGrid: {
    gap: 12,
    marginHorizontal: spacing.base,
  },
  statCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    elevation: 2,
    justifyContent: "space-between",
    minHeight: 128,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  statCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statNumberRow: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  bottomPadding: {
    height: 32,
  },
})
