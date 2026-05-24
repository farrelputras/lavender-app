import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ToastAndroid,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'

import { colors, textStyles, spacing } from '../../src/theme'
import { getUserSummary, getVehicle, createRental } from '../../src/connectors'
import { UserSummary, Vehicle, Payment, JaminanItem, KondisiSnapshot } from '../../src/connectors/types'
import { formatRupiah, formatHeaderDate, formatTime, initialsFromName } from '../../src/lib/format'
import { composeTarif, addDuration, durationToPaket, sumPayments, isPaketValid, computeTotalBill } from '../../src/lib/rentalMath'
import PembayaranSheet from '../../src/components/PembayaranSheet'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert('', msg)
  }
}

function parseRupiahInput(raw: string): number {
  const n = parseInt(raw.replace(/\D/g, ''), 10)
  return isNaN(n) ? 0 : n
}

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={[textStyles.headlineSm, { color: colors.onSurface, marginBottom: spacing.sm }]}>
      {children}
    </Text>
  )
}

function FieldCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>
}

function FuelGauge({ value, max = 8 }: { value: number; max?: number }) {
  return (
    <View style={styles.fuelGaugeRow}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.fuelSegment,
            i === 0 && styles.fuelSegmentFirst,
            i === max - 1 && styles.fuelSegmentLast,
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
}: {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  label: string
  min?: number
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
      <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>{label}</Text>
      <TouchableOpacity style={styles.stepperBtn} onPress={onIncrement} activeOpacity={0.7}>
        <MaterialIcons name="add" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DetailSewaScreen() {
  const router = useRouter()
  const { userId, vehicleId } = useLocalSearchParams<{ userId: string; vehicleId: string }>()

  // ─── Data loading
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !vehicleId) {
      showToast('Data tidak lengkap')
      router.back()
      return
    }
    Promise.all([getUserSummary(userId), getVehicle(vehicleId)]).then(([u, v]) => {
      if (!u || !v) {
        showToast('Data tidak ditemukan')
        router.back()
        return
      }
      setUserSummary(u)
      setVehicle(v)
      setLoading(false)
    })
  }, [userId, vehicleId])

  // ─── Jaminan
  const [jaminanItems, setJaminanItems] = useState<Set<JaminanItem>>(new Set(['ktp', 'ktm']))
  const [jaminanLainnya, setJaminanLainnya] = useState('')
  const [jaminanError, setJaminanError] = useState(false)

  // ─── Kondisi Keluar
  const [bensin, setBensin] = useState(4) // need to match based on current condition (get vehicle status)
  const [km, setKm] = useState('') // need to match based on current condition (get vehicle status)
  const [photos, setPhotos] = useState<{ id: string; uri: string | null }[]>([])

  // ─── Paket Sewa
  const [hari, setHari] = useState(0)
  const [jam, setJam] = useState<0 | 6 | 12>(0)
  const [paketError, setPaketError] = useState(false)

  // ─── Waktu Sewa
  const [mulai, setMulai] = useState<Date>(new Date())
  const [estimasi, setEstimasi] = useState<Date>(() => addDuration(new Date(), 1, 0))
  const [estimasiManual, setEstimasiManual] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'mulai' | 'estimasi' | null>(null)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')
  const [pickerTempDate, setPickerTempDate] = useState<Date>(new Date())

  // ─── Tarif & Total
  const defaultTarif = vehicle ? composeTarif(vehicle, hari, jam) : 0
  const [tarifRaw, setTarifRaw] = useState('')
  const tarifValue = tarifRaw ? parseRupiahInput(tarifRaw) : defaultTarif

  const [addOnDesc, setAddOnDesc] = useState('')
  const [addOnAmountRaw, setAddOnAmountRaw] = useState('')
  const addOnAmount = parseRupiahInput(addOnAmountRaw)

  const [discountRaw, setDiscountRaw] = useState('')
  const discount = parseRupiahInput(discountRaw)

  const totalBill = computeTotalBill(tarifValue, addOnAmount, discount)

  // ─── Payments
  const [payments, setPayments] = useState<Omit<Payment, 'id'>[]>([])
  const [showPaySheet, setShowPaySheet] = useState(false)

  const paid = sumPayments(payments as Payment[])
  const remaining = Math.max(0, totalBill - paid)

  // ─── Catatan
  const [notes, setNotes] = useState('')

  // ─── Saving
  const [saving, setSaving] = useState(false)

  // When vehicle loads, seed the tarif display from defaultTarif
  const tarifSeeded = useRef(false)
  useEffect(() => {
    if (vehicle && !tarifSeeded.current) {
      tarifSeeded.current = true
      // leave tarifRaw empty so it uses defaultTarif
    }
  }, [vehicle])

  // Recompute estimasi whenever paket changes (unless manually overridden)
  useEffect(() => {
    if (!estimasiManual) {
      setEstimasi(addDuration(mulai, hari, jam))
    }
  }, [hari, jam, mulai, estimasiManual])

  // ─── Paket change handlers
  function handleHariChange(newHari: number) {
    setHari(newHari)
    setPaketError(false)
    setEstimasiManual(false)
  }

  function handleJamChange(newJam: 0 | 6 | 12) {
    setJam(newJam)
    setPaketError(false)
    setEstimasiManual(false)
  }

  // ─── Datetime picker flow (two-step: date then time on Android)
  function openPicker(target: 'mulai' | 'estimasi') {
    const base = target === 'mulai' ? mulai : estimasi
    setPickerTarget(target)
    setPickerMode('date')
    setPickerTempDate(base)
  }

  function handlePickerChange(_event: unknown, date?: Date) {
    if (!date) {
      if (Platform.OS === 'android') setPickerTarget(null)
      return
    }
    if (pickerMode === 'date') {
      setPickerTempDate(date)
      if (Platform.OS === 'android') {
        setPickerMode('time')
      }
    } else {
      // time picked — merge date part from temp, time from new value
      const merged = new Date(pickerTempDate)
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0)
      applyPickerResult(merged)
      setPickerTarget(null)
    }
  }

  function handleIOSPickerDone() {
    if (pickerMode === 'date') {
      setPickerMode('time')
    } else {
      applyPickerResult(pickerTempDate)
      setPickerTarget(null)
    }
  }

  function applyPickerResult(date: Date) {
    if (pickerTarget === 'mulai') {
      setMulai(date)
      if (!estimasiManual) {
        setEstimasi(addDuration(date, hari, jam))
      }
    } else if (pickerTarget === 'estimasi') {
      setEstimasi(date)
      setEstimasiManual(true)
      // Backfill paket from the diff (docs §6: datetime wins)
      const { hari: h, jam: j } = durationToPaket(mulai, date)
      setHari(Math.max(0, h))
      setJam(j)
    }
  }

  // ─── Jaminan
  function toggleJaminan(item: JaminanItem) {
    setJaminanItems((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
    setJaminanError(false)
  }

  // ─── Photos (stub — no camera)
  function addPhoto() {
    setPhotos((prev) => [...prev, { id: `photo-${Date.now()}`, uri: null }])
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  // ─── Validate & Save
  function validate(): string | null {
    if (jaminanItems.size === 0) {
      setJaminanError(true)
      return 'Pilih minimal satu jaminan'
    }
    if (!isPaketValid(hari, jam)) {
      setPaketError(true)
      return 'Durasi minimal 0 Hari 6 Jam'
    }
    if (estimasi <= mulai) {
      return 'Estimasi kembali harus setelah waktu mulai'
    }
    if (tarifValue <= 0) {
      return 'Tarif harus lebih dari 0'
    }
    return null
  }

  async function handleSimpan() {
    const err = validate()
    if (err) {
      showToast(err)
      return
    }
    if (!vehicle || !userSummary) return

    setSaving(true)
    try {
      const rental = await createRental({
        userId: userSummary.id,
        vehicleId: vehicle.id,
        startAt: mulai,
        dueAt: estimasi,
        paketHari: hari,
        paketJam: jam,
        tarif: tarifValue,
        addOn: { description: addOnDesc, amount: addOnAmount },
        discount,
        jaminan: {
          items: Array.from(jaminanItems),
          lainnyaDescription: jaminanItems.has('lainnya') ? jaminanLainnya : undefined,
        },
        kondisiKeluar: {
          bensinKotak: bensin,
          km: km.trim() ? parseInt(km.replace(/\D/g, ''), 10) : null,
          photos,
        } as KondisiSnapshot,
        payments,
        notes,
      })
      showToast('Penyewaan berhasil disimpan')
      router.replace({ pathname: '/penyewaan/[id]', params: { id: rental.id, just_created: '1' } } as never)
    } finally {
      setSaving(false)
    }
  }

  // ─── Derived display values
  const userDisplayName = userSummary
    ? userSummary.nickname
      ? `${userSummary.name} (${userSummary.nickname})`
      : userSummary.name
    : '...'

  const isMotor = vehicle?.category === 'motor'

  const mulaiLabel = `${formatHeaderDate(mulai)} · ${formatTime(mulai)}`
  const estimasiLabel = `${formatHeaderDate(estimasi)} · ${formatTime(estimasi)}`

  const tarifHint = formatRupiah(defaultTarif)
  const tarifChanged = tarifRaw !== '' && tarifValue !== defaultTarif

  const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  function formatPayDate(d: Date) {
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
  }

  const methodLabel: Record<string, string> = {
    cash: 'Cash', transfer: 'Transfer', qris: 'QRIS', lainnya: 'Lainnya',
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Sewa Baru</Text>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
            Langkah 3 dari 3 · Detail Sewa
          </Text>
        </View>
        <Text style={[textStyles.labelMd, { color: colors.primary, fontWeight: '600' }]}>3/3</Text>
      </View>

      {/* Progress bar — 3/3 full */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Context bar ─────────────────────────────────── */}
          <FieldCard>
            {/* User row */}
            <View style={styles.contextRow}>
              <View style={styles.contextAvatar}>
                <Text style={[textStyles.labelLg, { color: colors.onPrimaryContainer }]}>
                  {userSummary ? initialsFromName(userSummary.name) : '?'}
                </Text>
              </View>
              <Text style={[textStyles.bodyMd, styles.contextName]} numberOfLines={1}>
                {userDisplayName}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/sewa-baru/pilih-user' as never)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[textStyles.labelLg, { color: colors.primary }]}>Ubah</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contextDivider} />
            {/* Vehicle row */}
            <View style={styles.contextRow}>
              <View style={styles.contextVehicleIcon}>
                <MaterialIcons
                  name={isMotor ? 'two-wheeler' : 'directions-car'}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[textStyles.bodyMd, { color: colors.onSurface, fontWeight: '500' }]} numberOfLines={1}>
                  {vehicle?.name ?? '...'}
                </Text>
                {vehicle && (
                  <View style={styles.plateChip}>
                    <Text style={[textStyles.labelMd, { color: colors.onSurface, letterSpacing: 1, fontFamily: 'PublicSans_600SemiBold' }]}>
                      {vehicle.plate}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[textStyles.labelLg, { color: colors.primary }]}>Ubah</Text>
              </TouchableOpacity>
            </View>
          </FieldCard>

          {/* ── Jaminan ─────────────────────────────────────── */}
          <View>
            <SectionLabel>Jaminan</SectionLabel>
            <FieldCard style={jaminanError ? styles.cardError : undefined}>
              {(['ktp', 'ktm', 'lainnya'] as JaminanItem[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.checkboxRow}
                  onPress={() => toggleJaminan(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, jaminanItems.has(item) && styles.checkboxChecked]}>
                    {jaminanItems.has(item) && (
                      <MaterialIcons name="check" size={14} color={colors.onPrimary} />
                    )}
                  </View>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                    {item === 'ktp' ? 'KTP' : item === 'ktm' ? 'KTM' : 'Lainnya'}
                  </Text>
                </TouchableOpacity>
              ))}
              {jaminanItems.has('lainnya') && (
                <TextInput
                  style={[textStyles.bodyMd, styles.inlineInput, { marginTop: spacing.sm }]}
                  placeholder="Sebutkan jaminan lainnya..."
                  placeholderTextColor={colors.outline}
                  value={jaminanLainnya}
                  onChangeText={setJaminanLainnya}
                />
              )}
            </FieldCard>
            <View style={styles.caption}>
              <MaterialIcons
                name="info-outline"
                size={14}
                color={jaminanError ? colors.error : colors.onSurfaceVariant}
              />
              <Text style={[textStyles.labelMd, { color: jaminanError ? colors.error : colors.onSurfaceVariant }]}>
                Minimal pilih satu jaminan
              </Text>
            </View>
          </View>

          {/* ── Kondisi Keluar ───────────────────────────────── */}
          <View>
            <SectionLabel>Kondisi Keluar</SectionLabel>
            <FieldCard>
              {/* Bensin */}
              <View style={styles.kondisiSection}>
                <View style={styles.kondisiLabelRow}>
                  <MaterialIcons name="local-gas-station" size={20} color={colors.primary} />
                  <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>Bensin (kotak)</Text>
                </View>
                <Stepper
                  value={bensin}
                  min={0}
                  onDecrement={() => setBensin((v) => Math.max(0, v - 1))}
                  onIncrement={() => setBensin((v) => Math.min(8, v + 1))}
                  label={`${bensin} kotak`}
                />
                <FuelGauge value={bensin} />
                <View style={styles.bensinHint}>
                  <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceVariant} />
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                    Kosong / Kedip = 0 kotak
                  </Text>
                </View>
              </View>

              <View style={styles.kondisiDivider} />

              {/* KM */}
              <View style={styles.kondisiSection}>
                <View style={styles.kondisiLabelRow}>
                  <MaterialIcons name="speed" size={20} color={colors.primary} />
                  <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>KM (opsional)</Text>
                </View>
                <View style={styles.kmInputRow}>
                  <TextInput
                    style={[textStyles.bodyMd, styles.kmInput]}
                    placeholder="Contoh: 25340"
                    placeholderTextColor={colors.outline}
                    keyboardType="numeric"
                    value={km}
                    onChangeText={setKm}
                    returnKeyType="done"
                  />
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>km</Text>
                </View>
              </View>

              <View style={styles.kondisiDivider} />

              {/* Photos */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoRow}
              >
                <TouchableOpacity style={styles.photoAdd} onPress={addPhoto} activeOpacity={0.8}>
                  <MaterialIcons name="add-a-photo" size={28} color={colors.primary} />
                  <Text style={[textStyles.labelMd, { color: colors.primary, marginTop: 4 }]}>Tambah Foto</Text>
                </TouchableOpacity>
                {photos.map((p) => (
                  <View key={p.id} style={styles.photoThumb}>
                    <View style={styles.photoPlaceholder}>
                      <MaterialIcons name="image" size={32} color={colors.outlineVariant} />
                    </View>
                    <TouchableOpacity
                      style={styles.photoClose}
                      onPress={() => removePhoto(p.id)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <MaterialIcons name="close" size={14} color={colors.onSurface} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </FieldCard>
          </View>

          {/* ── Paket Sewa ───────────────────────────────────── */}
          <View>
            <SectionLabel>Paket Sewa</SectionLabel>
            <View style={styles.paketRow}>
              {/* Hari card */}
              <FieldCard style={styles.paketCard}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>
                  Hari
                </Text>
                <Stepper
                  value={hari}
                  min={0}
                  onDecrement={() => handleHariChange(Math.max(0, hari - 1))}
                  onIncrement={() => handleHariChange(Math.min(30, hari + 1))}
                  label={String(hari)}
                />
              </FieldCard>

              {/* Jam card */}
              <FieldCard style={styles.paketCard}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>
                  Jam
                </Text>
                <View style={styles.jamSegmented}>
                  {([0, 6, 12] as (0 | 6 | 12)[]).map((j) => (
                    <TouchableOpacity
                      key={j}
                      style={[styles.jamOption, jam === j && styles.jamOptionActive]}
                      onPress={() => handleJamChange(j)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        textStyles.labelMd,
                        { color: jam === j ? colors.onPrimary : colors.onSurfaceVariant },
                      ]}>
                        {j}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FieldCard>
            </View>
            <View style={styles.caption}>
              <MaterialIcons
                name="info-outline"
                size={14}
                color={paketError ? colors.error : colors.onSurfaceVariant}
              />
              <Text style={[textStyles.labelMd, { color: paketError ? colors.error : colors.onSurfaceVariant }]}>
                Minimal 0 Hari 6 Jam
              </Text>
            </View>
          </View>

          {/* ── Waktu Sewa ───────────────────────────────────── */}
          <View>
            <SectionLabel>Waktu Sewa</SectionLabel>
            <FieldCard style={{ padding: 0, overflow: 'hidden' }}>
              <TouchableOpacity
                style={styles.waktuRow}
                onPress={() => openPicker('mulai')}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: 2 }]}>
                    Mulai
                  </Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{mulaiLabel}</Text>
                </View>
                <MaterialIcons name="calendar-month" size={22} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.waktuDivider} />
              <TouchableOpacity
                style={styles.waktuRow}
                onPress={() => openPicker('estimasi')}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: 2 }]}>
                    Estimasi Kembali
                  </Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{estimasiLabel}</Text>
                </View>
                <MaterialIcons name="edit-calendar" size={22} color={colors.primary} />
              </TouchableOpacity>
            </FieldCard>
            <View style={styles.caption}>
              <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                Otomatis dari Paket Sewa, bisa diubah
              </Text>
            </View>

            {/* DateTimePicker */}
            {pickerTarget !== null && (
              <>
                {Platform.OS === 'ios' ? (
                  <View style={styles.iosPickerContainer}>
                    <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: 4 }]}>
                      {pickerMode === 'date' ? 'Pilih Tanggal' : 'Pilih Waktu'}
                    </Text>
                    <DateTimePicker
                      value={pickerTempDate}
                      mode={pickerMode}
                      display="spinner"
                      onChange={(_e, date) => {
                        if (date) setPickerTempDate(date)
                      }}
                    />
                    <TouchableOpacity style={styles.iosPickerDone} onPress={handleIOSPickerDone}>
                      <Text style={[textStyles.labelLg, { color: colors.primary }]}>
                        {pickerMode === 'date' ? 'Pilih Waktu →' : 'Selesai'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DateTimePicker
                    value={pickerMode === 'date' ? (pickerTarget === 'mulai' ? mulai : estimasi) : pickerTempDate}
                    mode={pickerMode}
                    display="default"
                    onChange={handlePickerChange}
                  />
                )}
              </>
            )}
          </View>

          {/* ── Tarif & Total ────────────────────────────────── */}
          <View>
            <FieldCard>
              <Text style={[textStyles.headlineSm, { color: colors.onSurface, marginBottom: spacing.md }]}>
                Tarif &amp; Total
              </Text>

              {/* Tarif */}
              <View style={styles.formField}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Tarif</Text>
                <View style={styles.rupiahInputRow}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                  <TextInput
                    style={[textStyles.bodyMd, styles.rupiahField]}
                    keyboardType="numeric"
                    placeholder={String(defaultTarif)}
                    placeholderTextColor={colors.outline}
                    value={tarifRaw}
                    onChangeText={setTarifRaw}
                    returnKeyType="done"
                  />
                </View>
                <Text style={[textStyles.labelMd, { color: tarifChanged ? colors.primary : colors.onSurfaceVariant }]}>
                  Tarif default: {tarifHint}
                </Text>
              </View>

              {/* Add-on */}
              <View style={[styles.formField, { marginTop: spacing.md }]}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Add-on</Text>
                <TextInput
                  style={[textStyles.bodyMd, styles.textInput]}
                  placeholder="Contoh: helm pink 2, jas hujan, gembok"
                  placeholderTextColor={colors.outline}
                  value={addOnDesc}
                  onChangeText={setAddOnDesc}
                />
                <View style={[styles.rupiahInputRow, { marginTop: spacing.sm }]}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                  <TextInput
                    style={[textStyles.bodyMd, styles.rupiahField]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.outline}
                    value={addOnAmountRaw}
                    onChangeText={setAddOnAmountRaw}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Diskon */}
              <View style={[styles.formField, { marginTop: spacing.md }]}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Diskon</Text>
                <View style={styles.rupiahInputRow}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                  <TextInput
                    style={[textStyles.bodyMd, styles.rupiahField]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.outline}
                    value={discountRaw}
                    onChangeText={setDiscountRaw}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>Total</Text>
                <Text style={[textStyles.headlineMd, { color: colors.primary }]}>
                  {formatRupiah(totalBill)}
                </Text>
              </View>
            </FieldCard>
          </View>

          {/* ── Pembayaran ───────────────────────────────────── */}
          <View>
            <SectionLabel>Pembayaran</SectionLabel>
            <FieldCard style={{ padding: 0, overflow: 'hidden' }}>
              {payments.length === 0 ? (
                <View style={styles.emptyPayment}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, fontStyle: 'italic' }]}>
                    Belum ada pembayaran
                  </Text>
                </View>
              ) : (
                payments.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.paymentRow}
                    onLongPress={() => {
                      Alert.alert('Hapus Pembayaran?', formatRupiah(p.amount), [
                        { text: 'Batal', style: 'cancel' },
                        {
                          text: 'Hapus',
                          style: 'destructive',
                          onPress: () => setPayments((prev) => prev.filter((_, i) => i !== idx)),
                        },
                      ])
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.paymentIcon}>
                      <MaterialIcons name="payments" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>
                        {formatRupiah(p.amount)}
                      </Text>
                      <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                        {formatPayDate(p.paidAt)}
                      </Text>
                    </View>
                    <View style={styles.methodBadge}>
                      <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                        {p.methodDescription || methodLabel[p.method]}
                      </Text>
                    </View>
                  </TouchableOpacity>
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
            </FieldCard>

            {/* Summary */}
            <View style={styles.paySummary}>
              <View style={styles.paySummaryRow}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Sudah dibayar:</Text>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>{formatRupiah(paid)}</Text>
              </View>
              <View style={styles.paySummaryRow}>
                <Text style={[textStyles.labelLg, { color: remaining > 0 ? colors.error : colors.onSuccessContainer }]}>
                  Sisa:
                </Text>
                <Text style={[textStyles.labelLg, { color: remaining > 0 ? colors.error : colors.onSuccessContainer }]}>
                  {formatRupiah(remaining)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Catatan ──────────────────────────────────────── */}
          <View>
            <SectionLabel>Catatan Rental</SectionLabel>
            <TextInput
              style={[textStyles.bodyMd, styles.catatanInput]}
              placeholder="Catatan tambahan jika ada"
              placeholderTextColor={colors.outline}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={{ height: spacing.xxxl + 64 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky bottom bar ────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.btnBatal}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
          <Text style={[textStyles.labelLg, { color: colors.onSurfaceVariant }]}>Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnSimpan, saving && { opacity: 0.7 }]}
          onPress={handleSimpan}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} />
          )}
          <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Simpan Penyewaan</Text>
        </TouchableOpacity>
      </View>

      {/* Pembayaran bottom sheet */}
      <PembayaranSheet
        visible={showPaySheet}
        onClose={() => setShowPaySheet(false)}
        onSubmit={(p) => setPayments((prev) => [...prev, p])}
        defaultAmount={remaining > 0 ? remaining : undefined}
      />
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // AppBar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titleBlock: { flex: 1 },

  // Progress
  progressTrack: { height: 4, backgroundColor: colors.surfaceVariant },
  progressFill: { height: 4, backgroundColor: colors.primary },

  // Scroll
  scrollContent: {
    padding: spacing.base,
    gap: spacing.xl,
  },

  // Card
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...CARD_SHADOW,
  },
  cardError: {
    borderColor: colors.error,
  },

  // Context bar
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contextAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  contextVehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  contextName: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: '500',
  },
  contextDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.5,
    marginVertical: spacing.sm,
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

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  inlineInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    color: colors.onSurface,
  },

  // Caption
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },

  // Kondisi Keluar
  kondisiSection: { gap: spacing.sm },
  kondisiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kondisiDivider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.md, opacity: 0.5 },
  bensinHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  kmInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  kmInput: {
    flex: 1,
    color: colors.onSurface,
    padding: 0,
  },

  // Photo row
  photoRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  photoAdd: {
    width: 120,
    height: 120,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.xs,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },

  // Fuel gauge
  fuelGaugeRow: { flexDirection: 'row', gap: 2, height: 8, marginTop: spacing.xs },
  fuelSegment: { flex: 1, borderRadius: 0 },
  fuelSegmentFirst: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  fuelSegmentLast: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },

  // Paket Sewa
  paketRow: { flexDirection: 'row', gap: spacing.sm },
  paketCard: { flex: 1 },
  jamSegmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  jamOption: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  jamOptionActive: {
    backgroundColor: colors.primary,
  },

  // Waktu Sewa
  waktuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  waktuDivider: { height: 1, backgroundColor: colors.outlineVariant },
  iosPickerContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
  },
  iosPickerDone: {
    alignItems: 'flex-end',
    paddingVertical: spacing.sm,
  },

  // Tarif & Total form
  formField: { gap: spacing.xs },
  rupiahInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
  },
  rupiahField: {
    flex: 1,
    color: colors.onSurface,
    padding: 0,
  },
  textInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },

  // Pembayaran
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

  // Catatan
  catatanInput: {
    padding: spacing.base,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    color: colors.onSurface,
    minHeight: 96,
    ...CARD_SHADOW,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.base,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  btnBatal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  btnSimpan: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
})
