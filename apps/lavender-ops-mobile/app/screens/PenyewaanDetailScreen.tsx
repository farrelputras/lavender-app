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
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons, FontAwesome } from '@expo/vector-icons'
import { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { colors, textStyles, spacing } from '@/theme/tokens'
import { getRental, getUserSummary, getVehicle, addPayment } from '@/services/rentals'
import type { Rental, UserSummary, Vehicle, Payment } from '@/services/rentals/types'
import { formatRupiah, formatHeaderDate, formatTime, initialsFromName, formatPhoneId, toWaNumber } from '@/utils/format'
import { sumPayments, formatPaket, isOverdue, hoursLate } from '@/utils/rentalMath'
import PembayaranSheet from '@/components/PembayaranSheet'
import type { AppStackScreenProps } from '@/navigators/navigationTypes'

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert('', msg)
  }
}

const JAMINAN_LABELS: Record<string, string> = { ktp: 'KTP', ktm: 'KTM', lainnya: 'Lainnya' }

function paymentMethodLabel(payment: Payment): string {
  if (payment.method === 'lainnya') return payment.methodDescription ?? 'Lainnya'
  const MAP: Record<string, string> = { cash: 'Cash', transfer: 'Transfer', qris: 'QRIS' }
  return MAP[payment.method] ?? payment.method
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={[textStyles.headlineSm, { color: colors.onSurface, marginBottom: spacing.sm }]}>
      {children}
    </Text>
  )
}

function BensinGauge({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: 8 }, (_, i) => (
        <View
          key={i}
          style={{
            width: 10,
            height: 14,
            marginHorizontal: 2,
            borderRadius: 2,
            backgroundColor: i < value ? colors.primary : colors.surfaceVariant,
          }}
        />
      ))}
    </View>
  )
}

export function PenyewaanDetailScreen({ navigation, route }: AppStackScreenProps<'PenyewaanDetail'>) {
  const { rentalId, justCreated, justClosed } = route.params

  const [rental, setRental] = useState<Rental | null>(null)
  const [user, setUser] = useState<UserSummary | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaySheet, setShowPaySheet] = useState(false)

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      async function load() {
        setLoading(true)
        const r = await getRental(rentalId)
        if (cancelled) return
        if (!r) { setLoading(false); return }
        const [u, v] = await Promise.all([getUserSummary(r.userId), getVehicle(r.vehicleId)])
        if (cancelled) return
        setRental(r)
        setUser(u)
        setVehicle(v)
        setLoading(false)
        if (justCreated) showToast('Penyewaan tersimpan')
        if (justClosed) showToast('Pengembalian tersimpan')
      }
      load()
      return () => { cancelled = true }
    }, [rentalId]),
  )

  function handleBack() {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
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
  const overdue = isOverdue(rental)

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
        {/* ── 1. User & Vehicle ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.entityRow}>
            <View style={styles.avatar}>
              <Text style={[textStyles.labelLg, { color: colors.onPrimaryContainer }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{user?.name ?? '—'}</Text>
              {user?.nickname ? (
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>{user.nickname}</Text>
              ) : null}
              {user?.phone ? (
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                  {formatPhoneId(user.phone)}
                </Text>
              ) : null}
            </View>
            {user ? (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL('https://wa.me/' + toWaNumber(user.phone)).catch(() => showToast('Tidak dapat membuka WhatsApp'))}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <FontAwesome name="whatsapp" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.entityRow}>
            <View style={[styles.avatar, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialIcons name={vehicleIcon} size={20} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{vehicle?.name ?? '—'}</Text>
              {vehicle ? (
                <View style={styles.plateChip}>
                  <Text style={[textStyles.labelMd, { color: colors.onSurface, letterSpacing: 1, fontFamily: 'publicSansSemiBold' }]}>
                    {vehicle.plate}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── 2. Waktu Sewa ─────────────────────────────── */}
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Waktu Sewa</Text>
            <TouchableOpacity onPress={() => showToast('Akan segera tersedia')}>
              <Text style={[textStyles.labelLg, { color: colors.primary }]}>Ubah</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
          <View style={styles.timeRow}>
            <MaterialIcons name="schedule" size={20} color={colors.onSurfaceVariant} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Mulai</Text>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {formatHeaderDate(rental.startAt)} · {formatTime(rental.startAt)}
              </Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.timeRow}>
            <MaterialIcons name="event" size={20} color={overdue ? colors.onWarningContainer : colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Estimasi Kembali</Text>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {formatHeaderDate(rental.dueAt)} · {formatTime(rental.dueAt)}
              </Text>
              {overdue && (
                <Text style={[textStyles.labelMd, { color: colors.onWarningContainer }]}>
                  Terlambat {hoursLate(rental.dueAt)} Jam
                </Text>
              )}
            </View>
          </View>

          <View style={styles.paketChip}>
            <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
              Paket: {formatPaket(rental.paketHari, rental.paketJam)}
            </Text>
          </View>
          </View>
        </View>

        {/* ── 3. Jaminan ───────────────────────────────── */}
        <View>
          <SectionLabel>Jaminan</SectionLabel>
          <View style={styles.card}>
          <View style={styles.jaminanPills}>
            {rental.jaminan.items.map((item) => (
              <View key={item} style={styles.jaminanPill}>
                <MaterialIcons name="check-circle" size={14} color={colors.primary} />
                <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                  {JAMINAN_LABELS[item] ?? item}
                </Text>
              </View>
            ))}
          </View>

          {rental.jaminan.lainnyaDescription ? (
            <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
              {rental.jaminan.lainnyaDescription}
            </Text>
          ) : null}

          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
            Dikembalikan saat semua tagihan lunas.
          </Text>
          </View>
        </View>

        {/* ── 4. Kondisi Keluar ─────────────────────────── */}
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Kondisi Keluar</Text>
            <TouchableOpacity onPress={() => showToast('Akan segera tersedia')}>
              <Text style={[textStyles.labelLg, { color: colors.primary }]}>Ubah</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, flex: 1 }]}>Bensin</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                {rental.kondisiKeluar.bensinKotak} kotak
              </Text>
              <BensinGauge value={rental.kondisiKeluar.bensinKotak} />
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, flex: 1 }]}>KM</Text>
            <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
              {rental.kondisiKeluar.km != null
                ? `${rental.kondisiKeluar.km.toLocaleString('id-ID')} km`
                : '—'}
            </Text>
          </View>

          {rental.kondisiKeluar.photos.length > 0 && (
            <>
              <View style={styles.rowDivider} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {rental.kondisiKeluar.photos.map((photo) => (
                    <View key={photo.id} style={styles.photoThumb}>
                      <MaterialIcons name="image" size={28} color={colors.onSurfaceVariant} />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}
          </View>
        </View>

        {/* ── 5. Tarif & Total ──────────────────────────── */}
        <View>
          <SectionLabel>Tarif & Total</SectionLabel>
          <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>Tarif</Text>
            <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{formatRupiah(rental.tarif)}</Text>
          </View>

          {(rental.addOn.amount > 0 || rental.addOn.description.trim().length > 0) ? (
            <View style={styles.infoRow}>
              <View style={{ flex: 1 }}>
                <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Add-on</Text>
                {rental.addOn.description.trim().length > 0 ? (
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                    {rental.addOn.description}
                  </Text>
                ) : null}
              </View>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {formatRupiah(rental.addOn.amount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>Diskon</Text>
            <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
              {rental.discount > 0 ? `− ${formatRupiah(rental.discount)}` : formatRupiah(0)}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Text style={[textStyles.labelLg, { color: colors.onSurface, flex: 1 }]}>Total</Text>
            <Text style={[textStyles.headlineSm, { color: colors.primary }]}>
              {formatRupiah(rental.totalBill)}
            </Text>
          </View>
          </View>
        </View>

        {/* ── 6. Pembayaran ────────────────────────────── */}
        <View>
          <SectionLabel>Pembayaran</SectionLabel>
          <View style={[styles.card, { padding: 0, overflow: 'hidden', gap: 0 }]}>
            <View>
              {rental.payments.length === 0 ? (
                <View style={styles.emptyPayment}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, fontStyle: 'italic' }]}>
                    Belum ada pembayaran
                  </Text>
                </View>
              ) : (
                rental.payments.map((p) => (
                  <View key={p.id} style={styles.paymentRow}>
                    <View style={styles.paymentIcon}>
                      <MaterialIcons name="payments" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>
                        {formatRupiah(p.amount)}
                      </Text>
                      <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                        {formatHeaderDate(p.paidAt)}
                      </Text>
                    </View>
                    <View style={styles.methodBadge}>
                      <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                        {paymentMethodLabel(p)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={styles.addPaymentBtn}
                onPress={() => setShowPaySheet(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={20} color={colors.primary} />
                <Text style={[textStyles.labelLg, { color: colors.primary }]}>Tambah Pembayaran</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.paySummary}>
            <View style={styles.paySummaryRow}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Sudah dibayar:</Text>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>{formatRupiah(totalPaid)}</Text>
            </View>
            <View style={styles.paySummaryRow}>
              <Text style={[textStyles.labelLg, { color: sisa > 0 ? colors.error : colors.onSuccessContainer }]}>
                Sisa:
              </Text>
              <Text style={[textStyles.labelLg, { color: sisa > 0 ? colors.error : colors.onSuccessContainer }]}>
                {formatRupiah(sisa)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 7. Catatan ───────────────────────────────── */}
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Catatan Rental</Text>
            <TouchableOpacity onPress={() => showToast('Akan segera tersedia')}>
              <Text style={[textStyles.labelLg, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
          <View style={styles.insetBlock}>
            <Text style={[textStyles.bodyMd, { color: rental.notes ? colors.onSurface : colors.onSurfaceVariant }]}>
              {rental.notes || 'Tidak ada catatan.'}
            </Text>
          </View>
          </View>
        </View>

        <View style={{ height: spacing.xxxl + 64 }} />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.btnProses}
          onPress={() => navigation.navigate('Pengembalian', { rentalId: rental.id })}
          activeOpacity={0.8}
        >
          <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Proses Pengembalian</Text>
          <MaterialIcons name="arrow-forward" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <PembayaranSheet
        visible={showPaySheet}
        onClose={() => setShowPaySheet(false)}
        onSubmit={async (p) => {
          try {
            const updated = await addPayment(rental.id, p)
            setRental(updated)
          } catch {
            showToast('Gagal menyimpan pembayaran')
          }
        }}
        defaultAmount={sisa > 0 ? sisa : undefined}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: 2,
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  paketChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  jaminanPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  jaminanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  photoThumb: {
    width: 96,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPayment: {
    padding: spacing.base,
    alignItems: 'center',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainer,
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.base,
  },
  paySummary: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.base,
    gap: spacing.xs,
  },
  paySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insetBlock: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.md,
  },
  bottomBar: {
    padding: spacing.base,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  btnProses: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
})
