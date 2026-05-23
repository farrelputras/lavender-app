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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useState, useEffect } from 'react'
import { colors, textStyles, borderRadius, spacing } from '../../src/theme'
import { getDashboardSummary, getRentalsDueToday } from '../../src/connectors'
import { DashboardSummary, RentalDueToday } from '../../src/connectors/types'
import { formatHeaderDate, formatTime, formatRupiah } from '../../src/lib/format'

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert('', msg)
  }
}

export default function BerandaScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [rentalsDue, setRentalsDue] = useState<RentalDueToday[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    Promise.all([getDashboardSummary(), getRentalsDueToday()]).then(([s, r]) => {
      setSummary(s)
      setRentalsDue(r)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!summary) return null

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={24} color={colors.onPrimary} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>
              Halo!
            </Text>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              {formatHeaderDate(now)} • {formatTime(now)}
            </Text>
          </View>
          <MaterialIcons
            name="notifications"
            size={24}
            color={colors.onSurfaceVariant}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnFilled]}
            activeOpacity={0.8}
            onPress={() => {
              // TODO: navigate to Sewa Baru flow when built
            }}
          >
            <MaterialIcons name="add-circle" size={28} color={colors.onPrimary} />
            <Text style={[textStyles.headlineSm, { color: colors.onPrimary }]}>
              Sewa Baru
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutlined]}
            activeOpacity={0.8}
            onPress={() => showToast('Belum tersedia di demo')}
          >
            <MaterialIcons name="person-add" size={28} color={colors.primary} />
            <Text style={[textStyles.headlineSm, { color: colors.primary }]}>
              User Baru
            </Text>
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
              onPress={() => {
                // TODO: navigate to rental detail when built
              }}
              style={[
                styles.rentalCard,
                item.status === 'terlambat' && styles.rentalCardOverdue,
              ]}
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
                    item.status === 'terlambat'
                      ? styles.chipTerlambat
                      : styles.chipBelumKembali,
                  ]}
                >
                  <Text
                    style={[
                      textStyles.labelMd,
                      {
                        color:
                          item.status === 'terlambat'
                            ? colors.onError
                            : colors.onTertiaryContainer,
                      },
                    ]}
                  >
                    {item.status === 'terlambat' ? 'Terlambat' : 'Belum Kembali'}
                  </Text>
                </View>
              </View>

              {/* Row 2: vehicle info */}
              <Text
                style={[
                  textStyles.bodyMd,
                  { color: colors.onSurfaceVariant, marginTop: 4 },
                ]}
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
                    color={
                      item.status === 'terlambat'
                        ? colors.error
                        : colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={[
                      textStyles.bodyMd,
                      {
                        color:
                          item.status === 'terlambat'
                            ? colors.error
                            : colors.onSurfaceVariant,
                        marginLeft: 4,
                      },
                    ]}
                  >
                    Pukul {formatTime(item.dueAt)}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Section: Ringkasan */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>
            Ringkasan
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {/* Penyewaan Aktif */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={[textStyles.labelMd, { color: colors.secondary }]}>
                Penyewaan Aktif
              </Text>
              <MaterialIcons name="two-wheeler" size={24} color={colors.primary} />
            </View>
            <Text style={[textStyles.displayLg, { color: colors.onSurface }]}>
              {summary.activeRentalsCount.toString()}
            </Text>
          </View>

          {/* Hutang Aktif */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={[textStyles.labelMd, { color: colors.secondary }]}>
                Hutang Aktif
              </Text>
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
                {' '}dari {summary.totalVehiclesCount}
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
                {' '}dari {summary.totalUsersCount}
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
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 80,
    borderRadius: borderRadius.button,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnFilled: {
    backgroundColor: colors.primary,
  },
  actionBtnOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.outline,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  countBadge: {
    marginLeft: spacing.xs,
  },

  // Empty state
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },

  // Rental card
  rentalCard: {
    borderRadius: 12,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: 10,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  rentalCardOverdue: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Stats grid (single-column stack)
  statsGrid: {
    marginHorizontal: spacing.base,
    gap: 12,
  },
  statCard: {
    minHeight: 128,
    borderRadius: 12,
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bottomPadding: {
    height: 32,
  },
})
