import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ToastAndroid,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useState, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'

import { colors, textStyles, spacing } from '../../../src/theme'
import { getRental, getUserSummary, getVehicle, closeRental } from '../../../src/connectors'
import type { CloseRentalInput } from '../../../src/connectors'
import { Rental, UserSummary, Vehicle, Payment } from '../../../src/connectors/types'
import { formatRupiah, formatHeaderDate, formatTime } from '../../../src/lib/format'
import {
  sumPayments,
  hoursLate,
  computeFuelAdjustment,
  computeReturnTotal,
} from '../../../src/lib/rentalMath'
import PembayaranSheet from '../../../src/components/PembayaranSheet'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert('', msg)
  }
}

function parseRupiahInput(raw: string): number {
  const cleaned = raw.replace(/[^\d-]/g, '')
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? 0 : n
}

function displayRupiah(digits: string): string {
  if (!digits) return ''
  const n = parseRupiahInput(digits)
  if (n === 0 && digits === '') return ''
  const sign = n < 0 ? '−' : ''
  return sign + new Intl.NumberFormat('id-ID').format(Math.abs(n))
}

type ExtraFee = { id: string; description: string; rawAmount: string }

const JAMINAN_LABELS: Record<string, string> = { ktp: 'KTP', ktm: 'KTM', lainnya: 'Lainnya' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={[textStyles.headlineSm, { color: colors.onSurface, marginBottom: spacing.sm }]}>
      {children}
    </Text>
  )
}

function FieldCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

function FuelGauge({ value }: { value: number }) {
  return (
    <View style={styles.fuelGaugeRow}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.fuelSegment,
            i === 0 && styles.fuelSegmentFirst,
            i === 7 && styles.fuelSegmentLast,
            { backgroundColor: i < value ? colors.primary : colors.surfaceVariant },
          ]}
        />
      ))}
    </View>
  )
}

function Stepper({
  value,
  onDecrement,
  onIncrement,
  label,
  min = 0,
  max = 8,
}: {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  label: string
  min?: number
  max?: number
}) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={onDecrement}
        disabled={value <= min}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="remove"
          size={24}
          color={value <= min ? colors.outlineVariant : colors.primary}
        />
      </TouchableOpacity>
      <Text style={[textStyles.headlineSm, { color: colors.onSurface, minWidth: 72, textAlign: 'center' }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={onIncrement}
        disabled={value >= max}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="add"
          size={24}
          color={value >= max ? colors.outlineVariant : colors.primary}
        />
      </TouchableOpacity>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProsesKembaliScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [rental, setRental] = useState<Rental | null>(null)
  const [user, setUser] = useState<UserSummary | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Waktu Kembali ─────────────────────────────────────────────────────────
  const [returnedAt, setReturnedAt] = useState<Date>(() => new Date())
  const [pickerActive, setPickerActive] = useState(false)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')
  const [pickerTempDate, setPickerTempDate] = useState<Date>(() => new Date())

  // ── Kondisi Kembali ───────────────────────────────────────────────────────
  const [bensinKembali, setBensinKembali] = useState(4)
  const [rawHarga, setRawHarga] = useState('5000')
  const [kmKembali, setKmKembali] = useState('')

  // ── Rincian Biaya ─────────────────────────────────────────────────────────
  const [rawSubtotal, setRawSubtotal] = useState('')
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([])
  const [showDiscount, setShowDiscount] = useState(false)
  const [rawDiscount, setRawDiscount] = useState('')

  // ── Pembayaran ────────────────────────────────────────────────────────────
  const [pendingPayments, setPendingPayments] = useState<Omit<Payment, 'id'>[]>([])
  const [showPaySheet, setShowPaySheet] = useState(false)

  // ── Catatan ───────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState('')

  // ── Saving ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const r = await getRental(id)
      if (!r) { setLoading(false); return }
      const [u, v] = await Promise.all([getUserSummary(r.userId), getVehicle(r.vehicleId)])
      setRental(r)
      setUser(u)
      setVehicle(v)
      setBensinKembali(r.kondisiKeluar.bensinKotak)
      setRawSubtotal(String(r.tarif))
      setNotes(r.notes)
      setLoading(false)
    }
    load()
  }, [id])

  // ── Computed values ───────────────────────────────────────────────────────
  const subtotalSewa = parseRupiahInput(rawSubtotal)
  const hargaPerKotak = parseRupiahInput(rawHarga) || 5000
  const discount = parseRupiahInput(rawDiscount)
  const extraFeesComputed = extraFees.map((f) => ({
    description: f.description,
    amount: parseRupiahInput(f.rawAmount),
  }))
  const totalTagihan = computeReturnTotal(subtotalSewa, extraFeesComputed, discount)
  const alreadyPaid = rental ? sumPayments(rental.payments) : 0
  const pendingPaid = pendingPayments.reduce((s, p) => s + p.amount, 0)
  const totalPaid = alreadyPaid + pendingPaid
  const sisa = Math.max(0, totalTagihan - totalPaid)

  const isLate = rental ? returnedAt.getTime() > rental.dueAt.getTime() : false
  const jamLambat = rental && isLate ? hoursLate(rental.dueAt, returnedAt) : 0

  const fuelAdj = rental
    ? computeFuelAdjustment(rental.kondisiKeluar.bensinKotak, bensinKembali, hargaPerKotak)
    : null

  // ── DateTime picker handlers ───────────────────────────────────────────────
  function openPicker() {
    setPickerTempDate(returnedAt)
    setPickerMode('date')
    setPickerActive(true)
  }

  function handlePickerChange(_e: unknown, selected?: Date) {
    if (!selected) {
      setPickerActive(false)
      return
    }
    if (pickerMode === 'date') {
      const combined = new Date(pickerTempDate)
      combined.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
      setPickerTempDate(combined)
      if (Platform.OS === 'android') setPickerMode('time')
    } else {
      const combined = new Date(pickerTempDate)
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
      setReturnedAt(combined)
      setPickerActive(false)
    }
  }

  function handleIosPickerDone() {
    if (pickerMode === 'date') {
      setPickerMode('time')
    } else {
      setReturnedAt(new Date(pickerTempDate))
      setPickerActive(false)
    }
  }

  // ── Extra fees ────────────────────────────────────────────────────────────
  function addExtraFee() {
    setExtraFees((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', rawAmount: '' },
    ])
  }

  function removeExtraFee(feeId: string) {
    setExtraFees((prev) => prev.filter((f) => f.id !== feeId))
  }

  function updateExtraFee(feeId: string, field: 'description' | 'rawAmount', value: string) {
    setExtraFees((prev) =>
      prev.map((f) =>
        f.id === feeId
          ? { ...f, [field]: field === 'rawAmount' ? value.replace(/\D/g, '') : value }
          : f,
      ),
    )
  }

  // ── Fuel suggestion Terapkan ──────────────────────────────────────────────
  function applyFuelSuggestion() {
    if (!fuelAdj || fuelAdj.direction === 'none') return
    const signed = fuelAdj.direction === 'add' ? fuelAdj.deltaRupiah : -fuelAdj.deltaRupiah
    setExtraFees((prev) => [
      ...prev,
      { id: String(Date.now()), description: 'Bensin', rawAmount: String(signed) },
    ])
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (saving || !rental) return
    setSaving(true)
    try {
      const km = kmKembali.trim() ? parseInt(kmKembali.trim(), 10) : null
      const input: CloseRentalInput = {
        returnedAt,
        kondisiKembali: {
          bensinKotak: bensinKembali,
          km: km !== null && !isNaN(km) ? km : null,
          photos: [],
        },
        subtotalSewa,
        extraFees: extraFeesComputed,
        discount,
        notes: notes.trim(),
        newPayments: pendingPayments,
      }
      await closeRental(rental.id, input)
      router.replace({
        pathname: '/penyewaan/[id]',
        params: { id: rental.id, just_closed: '1' },
      } as never)
    } catch {
      showToast('Gagal menyimpan pengembalian')
      setSaving(false)
    }
  }

  function handleBack() {
    router.back()
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!rental || !user || !vehicle) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
            Data penyewaan tidak ditemukan.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const subtitle = `${user.nickname ?? user.name} · ${vehicle.name} · ${vehicle.plate}`

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── AppBar ─────────────────────────────────────────────────── */}
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.appBarTitle}>
            <Text style={[textStyles.labelLg, { color: colors.onSurface }]} numberOfLines={1}>
              Proses Pengembalian
            </Text>
            <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 1. Waktu Sewa ──────────────────────────────────────── */}
          <View>
            <SectionLabel>Waktu Sewa</SectionLabel>
            <FieldCard>
              {/* Mulai (read-only) */}
              <View style={styles.timeRow}>
                <MaterialIcons name="schedule" size={20} color={colors.onSurfaceVariant} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Mulai</Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface, marginTop: 2 }]}>
                    {formatHeaderDate(rental.startAt)} · {formatTime(rental.startAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              {/* Kembali (editable) */}
              <TouchableOpacity style={styles.timeRow} onPress={openPicker} activeOpacity={0.7}>
                <MaterialIcons name="event" size={20} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Kembali</Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface, marginTop: 2 }]}>
                    {formatHeaderDate(returnedAt)} · {formatTime(returnedAt)}
                  </Text>
                </View>
                <MaterialIcons name="edit" size={18} color={colors.primary} />
              </TouchableOpacity>

              {isLate && (
                <View style={styles.lateCaption}>
                  <MaterialIcons name="schedule" size={16} color={colors.onWarningContainer} />
                  <Text style={[textStyles.labelMd, { color: colors.onWarningContainer }]}>
                    Terlambat {jamLambat} jam dari estimasi
                  </Text>
                </View>
              )}

              {/* iOS: inline picker with Done button */}
              {pickerActive && Platform.OS === 'ios' && (
                <View style={styles.iosPickerContainer}>
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: 4 }]}>
                    {pickerMode === 'date' ? 'Pilih Tanggal' : 'Pilih Jam'}
                  </Text>
                  <DateTimePicker
                    value={pickerTempDate}
                    mode={pickerMode}
                    display="spinner"
                    onChange={(_e, d) => { if (d) setPickerTempDate(d) }}
                    locale="id-ID"
                  />
                  <TouchableOpacity style={styles.iosPickerDone} onPress={handleIosPickerDone}>
                    <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>
                      {pickerMode === 'date' ? 'Pilih Jam →' : 'Selesai'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </FieldCard>

            {/* Android: picker outside the card */}
            {pickerActive && Platform.OS === 'android' && (
              <DateTimePicker
                value={pickerTempDate}
                mode={pickerMode}
                display="default"
                onChange={handlePickerChange}
              />
            )}
          </View>

          {/* ── 2. Kondisi Kembali ─────────────────────────────────── */}
          <View>
            <SectionLabel>Kondisi Kembali</SectionLabel>
            <FieldCard>
              {/* Bensin stepper */}
              <View>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>
                  Bensin Kembali
                </Text>
                <Stepper
                  value={bensinKembali}
                  onDecrement={() => setBensinKembali((v) => Math.max(0, v - 1))}
                  onIncrement={() => setBensinKembali((v) => Math.min(8, v + 1))}
                  label={`${bensinKembali} kotak`}
                />
                <FuelGauge value={bensinKembali} />
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>
                  Saat keluar: {rental.kondisiKeluar.bensinKotak} kotak
                </Text>
              </View>

              <View style={styles.rowDivider} />

              {/* Harga bensin per kotak */}
              <View>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>
                  Harga bensin / kotak
                </Text>
                <View style={styles.inputRow}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                  <TextInput
                    style={[textStyles.bodyMd, styles.inlineInput]}
                    value={displayRupiah(rawHarga)}
                    onChangeText={(t) => setRawHarga(t.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    returnKeyType="done"
                    placeholder="5.000"
                    placeholderTextColor={colors.outlineVariant}
                  />
                </View>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>
                  Dipakai untuk menghitung saran penyesuaian tarif.
                </Text>
              </View>

              <View style={styles.rowDivider} />

              {/* KM */}
              <View>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>
                  KM Kembali (opsional)
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[textStyles.bodyMd, styles.inlineInput]}
                    value={kmKembali}
                    onChangeText={(t) => setKmKembali(t.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    returnKeyType="done"
                    placeholder={
                      rental.kondisiKeluar.km != null
                        ? String(rental.kondisiKeluar.km + 1)
                        : '—'
                    }
                    placeholderTextColor={colors.outlineVariant}
                  />
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>km</Text>
                </View>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>
                  {rental.kondisiKeluar.km != null
                    ? `Saat keluar: ${rental.kondisiKeluar.km.toLocaleString('id-ID')} km`
                    : 'Boleh dikosongkan.'}
                </Text>
              </View>

              <View style={styles.rowDivider} />

              {/* Photo strip (stub) */}
              <View>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>
                  Foto Kondisi Kembali
                </Text>
                <TouchableOpacity
                  style={styles.photoAddTile}
                  onPress={() => showToast('Foto belum tersedia di demo')}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="add-a-photo" size={24} color={colors.onSurfaceVariant} />
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                    Tambah Foto
                  </Text>
                </TouchableOpacity>
              </View>
            </FieldCard>
          </View>

          {/* ── 3. Rincian Biaya ───────────────────────────────────── */}
          <View>
            <SectionLabel>Rincian Biaya</SectionLabel>
            <FieldCard>
              {/* Subtotal Sewa (editable) */}
              <View style={styles.infoRow}>
                <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                  Subtotal Sewa
                </Text>
                <View style={styles.amountInputRow}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                  <TextInput
                    style={[textStyles.bodyMd, styles.amountInput]}
                    value={displayRupiah(rawSubtotal)}
                    onChangeText={(t) => setRawSubtotal(t.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    returnKeyType="done"
                    textAlign="right"
                    placeholder="0"
                    placeholderTextColor={colors.outlineVariant}
                  />
                </View>
              </View>

              {/* Fuel suggestion row */}
              {fuelAdj && fuelAdj.direction !== 'none' && (
                <View style={styles.fuelSuggestionRow}>
                  <View style={styles.fuelSuggestionIcon}>
                    <MaterialIcons name="local-gas-station" size={20} color={colors.onWarningContainer} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                      Bensin {fuelAdj.direction === 'add' ? 'kurang' : 'lebih'}{' '}
                      {Math.abs(fuelAdj.selisih)} kotak
                    </Text>
                    <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                      saran {fuelAdj.direction === 'add' ? '+' : '−'}
                      {formatRupiah(fuelAdj.deltaRupiah)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.terapkanBtn}
                    onPress={applyFuelSuggestion}
                    activeOpacity={0.8}
                  >
                    <Text style={[textStyles.labelMd, { color: colors.onTertiaryContainer }]}>
                      Terapkan
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Extra fee rows */}
              {extraFees.map((fee) => (
                <View key={fee.id} style={styles.extraFeeRow}>
                  <TextInput
                    style={[textStyles.bodyMd, styles.extraFeeDesc]}
                    value={fee.description}
                    onChangeText={(t) => updateExtraFee(fee.id, 'description', t)}
                    placeholder="Deskripsi biaya..."
                    placeholderTextColor={colors.outlineVariant}
                    returnKeyType="next"
                  />
                  <View style={styles.amountInputRow}>
                    <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                    <TextInput
                      style={[textStyles.bodyMd, styles.amountInput]}
                      value={displayRupiah(fee.rawAmount)}
                      onChangeText={(t) => updateExtraFee(fee.id, 'rawAmount', t)}
                      keyboardType="numeric"
                      returnKeyType="done"
                      textAlign="right"
                      placeholder="0"
                      placeholderTextColor={colors.outlineVariant}
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeExtraFee(fee.id)} style={{ paddingLeft: spacing.sm }}>
                    <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Diskon row */}
              {showDiscount && (
                <View style={styles.infoRow}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                    Diskon
                  </Text>
                  <View style={styles.amountInputRow}>
                    <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>− Rp</Text>
                    <TextInput
                      style={[textStyles.bodyMd, styles.amountInput]}
                      value={displayRupiah(rawDiscount)}
                      onChangeText={(t) => setRawDiscount(t.replace(/\D/g, ''))}
                      keyboardType="numeric"
                      returnKeyType="done"
                      textAlign="right"
                      placeholder="0"
                      placeholderTextColor={colors.outlineVariant}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => { setShowDiscount(false); setRawDiscount('') }}
                    style={{ paddingLeft: spacing.sm }}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Action buttons */}
              <TouchableOpacity style={styles.addLineBtn} onPress={addExtraFee} activeOpacity={0.7}>
                <MaterialIcons name="add" size={18} color={colors.primary} />
                <Text style={[textStyles.labelLg, { color: colors.primary }]}>Tambah Biaya</Text>
              </TouchableOpacity>
              {!showDiscount && (
                <TouchableOpacity style={styles.addLineBtn} onPress={() => setShowDiscount(true)} activeOpacity={0.7}>
                  <MaterialIcons name="add" size={18} color={colors.primary} />
                  <Text style={[textStyles.labelLg, { color: colors.primary }]}>Diskon</Text>
                </TouchableOpacity>
              )}

              <View style={styles.rowDivider} />

              {/* Total Tagihan */}
              <View style={styles.infoRow}>
                <Text style={[textStyles.labelLg, { color: colors.onSurface, flex: 1 }]}>
                  Total Tagihan
                </Text>
                <Text style={[textStyles.headlineSm, { color: colors.primary }]}>
                  {formatRupiah(totalTagihan)}
                </Text>
              </View>
            </FieldCard>
          </View>

          {/* ── 4. Pembayaran ──────────────────────────────────────── */}
          <View>
            <SectionLabel>Pembayaran</SectionLabel>
            <View style={[styles.card, { padding: 0, overflow: 'hidden', gap: 0 }]}>
              {rental.payments.length === 0 && pendingPayments.length === 0 ? (
                <View style={styles.emptyPayment}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, fontStyle: 'italic' }]}>
                    Belum ada pembayaran
                  </Text>
                </View>
              ) : (
                <>
                  {rental.payments.map((p) => (
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
                          {p.method === 'lainnya' ? (p.methodDescription ?? 'Lainnya') : p.method.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {pendingPayments.map((p, i) => (
                    <View key={`pending-${i}`} style={[styles.paymentRow, { backgroundColor: colors.surfaceContainerLow }]}>
                      <View style={styles.paymentIcon}>
                        <MaterialIcons name="payments" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>
                          {formatRupiah(p.amount)}
                        </Text>
                        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                          {formatHeaderDate(p.paidAt)} · belum tersimpan
                        </Text>
                      </View>
                      <View style={styles.methodBadge}>
                        <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                          {p.method === 'lainnya' ? (p.methodDescription ?? 'Lainnya') : p.method.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
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

            {/* Sisa summary */}
            <View style={styles.paySummary}>
              <View style={styles.paySummaryRow}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                  Sudah dibayar:
                </Text>
                <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                  {formatRupiah(totalPaid)}
                </Text>
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

          {/* ── 5. Status Jaminan ──────────────────────────────────── */}
          <View>
            <SectionLabel>Status Jaminan</SectionLabel>
            <View style={[
              styles.jaminanBanner,
              { backgroundColor: sisa > 0 ? colors.warningContainer : colors.successContainer },
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <MaterialIcons
                  name={sisa > 0 ? 'warning-amber' : 'check-circle'}
                  size={20}
                  color={sisa > 0 ? colors.onWarningContainer : colors.onSuccessContainer}
                />
                <Text style={[textStyles.labelLg, { color: sisa > 0 ? colors.onWarningContainer : colors.onSuccessContainer, flex: 1 }]}>
                  {sisa > 0
                    ? `Jaminan ditahan — akan dibuat Hutang ${formatRupiah(sisa)}`
                    : 'Jaminan bisa dikembalikan'}
                </Text>
              </View>

              {rental.jaminan.items.length > 0 && (
                <View style={styles.jaminanChips}>
                  {rental.jaminan.items.map((item) => (
                    <View key={item} style={styles.jaminanChip}>
                      <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                        {JAMINAN_LABELS[item] ?? item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {sisa > 0 && (
                <Text style={[textStyles.labelMd, { color: colors.onWarningContainer, marginTop: spacing.xs }]}>
                  Hutang otomatis dibuat saat pengembalian disimpan.
                </Text>
              )}
            </View>
          </View>

          {/* ── 6. Catatan ─────────────────────────────────────────── */}
          <View>
            <SectionLabel>Catatan</SectionLabel>
            <FieldCard>
              <TextInput
                style={[textStyles.bodyMd, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                placeholder="Tambahkan catatan opsional..."
                placeholderTextColor={colors.outlineVariant}
                textAlignVertical="top"
              />
            </FieldCard>
          </View>

          <View style={{ height: spacing.xxxl + 64 }} />
        </ScrollView>

        {/* ── Sticky bottom CTA ──────────────────────────────────── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.btnSelesai, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>
                {sisa > 0 ? 'Selesaikan & Buat Hutang' : 'Selesaikan Pengembalian'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PembayaranSheet
        visible={showPaySheet}
        onClose={() => setShowPaySheet(false)}
        onSubmit={(p) => {
          setPendingPayments((prev) => [...prev, p])
          setShowPaySheet(false)
        }}
        defaultAmount={sisa > 0 ? sisa : undefined}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // AppBar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  appBarTitle: {
    flex: 1,
  },

  // Scroll content
  scrollContent: {
    padding: spacing.base,
    gap: spacing.md,
  },

  // Card
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
    gap: spacing.md,
    ...CARD_SHADOW,
  },

  // Divider
  rowDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 0,
  },

  // Time row (Waktu Sewa section)
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },

  // Generic row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },

  // Late caption
  lateCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },

  // iOS picker
  iosPickerContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.base,
    marginTop: spacing.sm,
  },
  iosPickerDone: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    alignSelf: 'flex-end',
  },

  // Fuel gauge
  fuelGaugeRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  fuelSegment: {
    flex: 1,
    height: 12,
    marginHorizontal: 1,
  },
  fuelSegmentFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  fuelSegmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },

  // Inline inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.sm,
    height: 48,
  },
  inlineInput: {
    flex: 1,
    color: colors.onSurface,
    minHeight: 48,
  },

  // Photo stub
  photoAddTile: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },

  // Amount input
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    height: 40,
    minWidth: 140,
  },
  amountInput: {
    color: colors.onSurface,
    flex: 1,
    textAlign: 'right',
    paddingVertical: 0,
  },

  // Fuel suggestion row
  fuelSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningContainer,
    borderRadius: 12,
    padding: spacing.sm,
  },
  fuelSuggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.onWarningContainer,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  terapkanBtn: {
    backgroundColor: colors.tertiaryContainer,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Extra fee row
  extraFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  extraFeeDesc: {
    flex: 1,
    color: colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: spacing.xs,
  },

  // Add biaya / diskon buttons
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },

  // Payment rows
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  emptyPayment: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  // Sisa summary
  paySummary: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.base,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  paySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Jaminan banner
  jaminanBanner: {
    borderRadius: 12,
    padding: spacing.base,
    gap: spacing.sm,
  },
  jaminanChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  jaminanChip: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },

  // Notes
  notesInput: {
    color: colors.onSurface,
    minHeight: 96,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  btnSelesai: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
})
