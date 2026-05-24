import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  ToastAndroid,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useState, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { colors, textStyles, spacing } from '../../src/theme'
import { getRental, getUserSummary, getVehicle } from '../../src/connectors'
import { Rental, UserSummary, Vehicle } from '../../src/connectors/types'
import { formatRupiah, formatHeaderDate, formatTime, initialsFromName } from '../../src/lib/format'
import { sumPayments } from '../../src/lib/rentalMath'

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert('', msg)
  }
}

type RowProps = { label: string; value: string; valueColor?: string }
function InfoRow({ label, value, valueColor }: RowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, flex: 1 }]}>{label}</Text>
      <Text style={[textStyles.bodyMd, { color: valueColor ?? colors.onSurface, flex: 2, textAlign: 'right' }]}>
        {value}
      </Text>
    </View>
  )
}

export default function DetailPenyewaanScreen() {
  const router = useRouter()
  const { id, just_created } = useLocalSearchParams<{ id: string; just_created?: string }>()

  const [rental, setRental] = useState<Rental | null>(null)
  const [user, setUser] = useState<UserSummary | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const r = await getRental(id)
      if (!r) { setLoading(false); return }
      const [u, v] = await Promise.all([getUserSummary(r.userId), getVehicle(r.vehicleId)])
      setRental(r)
      setUser(u)
      setVehicle(v)
      setLoading(false)
      if (just_created === '1') {
        showToast('Penyewaan tersimpan')
      }
    }
    load()
  }, [id])

  function handleBack() {
    router.replace('/')
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (!rental) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Penyewaan tidak ditemukan.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const totalPaid = sumPayments(rental.payments)
  const sisa = Math.max(0, rental.totalBill - totalPaid)
  const initials = user ? initialsFromName(user.name) : '?'
  const vehicleIcon: 'two-wheeler' | 'directions-car' = vehicle?.category === 'mobil' ? 'directions-car' : 'two-wheeler'

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.appBarTitle}>
          <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>Detail Penyewaan</Text>
        </View>
        <View style={styles.statusChip}>
          <Text style={[textStyles.labelMd, { color: colors.onWarningContainer }]}>Aktif</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Pelanggan & Kendaraan */}
        <View style={styles.card}>
          {/* User row */}
          <View style={styles.entityRow}>
            <View style={styles.avatar}>
              <Text style={[textStyles.labelLg, { color: colors.onPrimaryContainer }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{user?.name ?? '—'}</Text>
              {user?.nickname ? (
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>{user.nickname}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Vehicle row */}
          <View style={styles.entityRow}>
            <View style={[styles.avatar, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialIcons name={vehicleIcon} size={20} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{vehicle?.name ?? '—'}</Text>
              {vehicle ? (
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>{vehicle.plate}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Waktu */}
        <View style={styles.card}>
          <Text style={[textStyles.labelMd, styles.cardHeading]}>Waktu Sewa</Text>
          <InfoRow
            label="Mulai"
            value={`${formatHeaderDate(rental.startAt)} · ${formatTime(rental.startAt)}`}
          />
          <View style={styles.rowDivider} />
          <InfoRow
            label="Est. Kembali"
            value={`${formatHeaderDate(rental.dueAt)} · ${formatTime(rental.dueAt)}`}
          />
        </View>

        {/* Keuangan */}
        <View style={styles.card}>
          <Text style={[textStyles.labelMd, styles.cardHeading]}>Pembayaran</Text>
          <InfoRow label="Total Tagihan" value={formatRupiah(rental.totalBill)} />
          <View style={styles.rowDivider} />
          <InfoRow label="Sudah Dibayar" value={formatRupiah(totalPaid)} />
          <View style={styles.rowDivider} />
          <InfoRow
            label="Sisa"
            value={formatRupiah(sisa)}
            valueColor={sisa > 0 ? colors.error : colors.success}
          />
        </View>

        {/* Placeholder for future actions */}
        <View style={styles.phaseNote}>
          <MaterialIcons name="info-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
            Fitur pengembalian akan tersedia di fase berikutnya.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: spacing.md,
  },
  appBarTitle: {
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.warningContainer,
  },
  body: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardHeading: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.xs,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  phaseNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
  },
})
