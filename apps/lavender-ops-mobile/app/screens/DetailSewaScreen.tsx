import { useState, useEffect, useRef } from "react"
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
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import { PhotoRow } from "@/components/form/PhotoRow"
import PembayaranSheet from "@/components/PembayaranSheet"
import type { SewaBaruScreenProps, AppStackParamList } from "@/navigators/navigationTypes"
import { choosePhotoSource } from "@/services/photos/capture"
import { getUserSummary, getVehicle, createRental } from "@/services/rentals"
import type {
  UserSummary,
  Vehicle,
  Payment,
  JaminanItem,
  KondisiSnapshot,
} from "@/services/rentals/types"
import { colors, textStyles, spacing } from "@/theme/tokens"
import { formatRupiah, formatHeaderDate, formatTime, initialsFromName } from "@/utils/format"
import {
  composeTarif,
  addDuration,
  sumPayments,
  isPaketValid,
  computeTotalBill,
  formatPaket,
} from "@/utils/rentalMath"
import { uuidv4 } from "@/utils/uuid"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert("", msg)
  }
}

function parseRupiahInput(raw: string): number {
  const n = parseInt(raw.replace(/\D/g, ""), 10)
  return isNaN(n) ? 0 : n
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

export function DetailSewaScreen({ navigation, route }: SewaBaruScreenProps<"DetailSewa">) {
  const { userId, vehicleId } = route.params

  // ─── Data loading
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !vehicleId) {
      showToast("Data tidak lengkap")
      navigation.goBack()
      return
    }
    Promise.all([getUserSummary(userId), getVehicle(vehicleId)]).then(([u, v]) => {
      if (!u || !v) {
        showToast("Data tidak ditemukan")
        navigation.goBack()
        return
      }
      setUserSummary(u)
      setVehicle(v)
      setLoading(false)
    })
  }, [userId, vehicleId])

  // ─── Jaminan
  const [jaminanItems, setJaminanItems] = useState<Set<JaminanItem>>(new Set(["KTP", "KTM"]))
  const [jaminanLainnya, setJaminanLainnya] = useState("")
  const [jaminanError, setJaminanError] = useState(false)

  // ─── Kondisi Keluar
  const [bensin, setBensin] = useState(4)
  const [km, setKm] = useState("")
  const [photos, setPhotos] = useState<{ id: string; uri: string | null; mimeType?: string }[]>([])

  // ─── Paket Sewa
  const [hari, setHari] = useState(0)
  const [jam, setJam] = useState<0 | 6 | 12>(0)
  const [paketError, setPaketError] = useState(false)

  // ─── Waktu Sewa (Mulai editable; Kembali + Durasi derived from stepper + Mulai)
  const [mulai, setMulai] = useState<Date>(new Date())
  const [estimasi, setEstimasi] = useState<Date>(() => addDuration(new Date(), 1, 0))
  const [pickerTarget, setPickerTarget] = useState<"mulai" | null>(null)
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date")
  const [pickerTempDate, setPickerTempDate] = useState<Date>(new Date())

  // ─── Tarif & Total
  const defaultTarif = vehicle ? composeTarif(vehicle, hari, jam) : 0
  const [tarifRaw, setTarifRaw] = useState("")
  const tarifValue = tarifRaw ? parseRupiahInput(tarifRaw) : defaultTarif

  const [addOnDesc, setAddOnDesc] = useState("")
  const [addOnAmountRaw, setAddOnAmountRaw] = useState("")
  const addOnAmount = parseRupiahInput(addOnAmountRaw)

  const [discountRaw, setDiscountRaw] = useState("")
  const discount = parseRupiahInput(discountRaw)

  const totalBill = computeTotalBill(tarifValue, addOnAmount, discount)

  // ─── Payments
  const [payments, setPayments] = useState<Omit<Payment, "id">[]>([])
  const [showPaySheet, setShowPaySheet] = useState(false)

  const paid = sumPayments(payments as Payment[])
  const remaining = Math.max(0, totalBill - paid)

  // ─── Tujuan
  const [tujuan, setTujuan] = useState("")
  const [tujuanError, setTujuanError] = useState(false)

  // ─── Catatan
  const [notes, setNotes] = useState("")

  // ─── Saving
  const [saving, setSaving] = useState(false)

  const tarifSeeded = useRef(false)
  useEffect(() => {
    if (vehicle && !tarifSeeded.current) {
      tarifSeeded.current = true
    }
  }, [vehicle])

  // Kembali is always derived from Mulai + Durasi stepper (never manually edited)
  useEffect(() => {
    setEstimasi(addDuration(mulai, hari, jam))
  }, [hari, jam, mulai])

  // ─── Durasi change handlers (stepper drives Kembali via useEffect)
  function handleHariChange(newHari: number) {
    setHari(newHari)
    setPaketError(false)
  }

  function handleJamChange(newJam: 0 | 6 | 12) {
    setJam(newJam)
    setPaketError(false)
  }

  // ─── Datetime picker for Mulai (two-step: date then time on Android)
  function openPicker(target: "mulai") {
    setPickerTarget(target)
    setPickerMode("date")
    setPickerTempDate(mulai)
  }

  function handlePickerChange(_event: unknown, date?: Date) {
    if (!date) {
      if (Platform.OS === "android") setPickerTarget(null)
      return
    }
    if (pickerMode === "date") {
      setPickerTempDate(date)
      if (Platform.OS === "android") {
        setPickerMode("time")
      }
    } else {
      const merged = new Date(pickerTempDate)
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0)
      applyPickerResult(merged)
      setPickerTarget(null)
    }
  }

  function handleIOSPickerDone() {
    if (pickerMode === "date") {
      setPickerMode("time")
    } else {
      applyPickerResult(pickerTempDate)
      setPickerTarget(null)
    }
  }

  function applyPickerResult(date: Date) {
    if (pickerTarget === "mulai") {
      setMulai(date)
      // Kembali recomputed automatically via useEffect
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

  async function handleAddPhoto() {
    const captured = await choosePhotoSource()
    if (captured) {
      setPhotos((prev) => [
        ...prev,
        { id: uuidv4(), uri: captured.uri, mimeType: captured.mimeType },
      ])
    }
  }

  // ─── Validate & Save
  function validate(): string | null {
    if (tujuan.trim() === "") {
      setTujuanError(true)
      return "Tujuan harus diisi"
    }
    if (jaminanItems.size === 0) {
      setJaminanError(true)
      return "Pilih minimal satu jaminan"
    }
    if (!isPaketValid(hari, jam)) {
      setPaketError(true)
      return "Durasi minimal 0 Hari 6 Jam"
    }
    if (estimasi <= mulai) {
      return "Estimasi kembali harus setelah waktu mulai"
    }
    if (tarifValue <= 0) {
      return "Tarif harus lebih dari 0"
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
          lainnyaDescription: jaminanItems.has("LAINNYA") ? jaminanLainnya : undefined,
        },
        kondisiKeluar: {
          bensinKotak: bensin,
          km: km.trim() ? parseInt(km.replace(/\D/g, ""), 10) : null,
          photos,
        } as KondisiSnapshot,
        payments,
        notes,
        tujuan,
      })
      showToast("Rental berhasil disimpan")
      navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.reset({
        index: 1,
        routes: [
          { name: "MainTabs" },
          { name: "RentalDetail", params: { rentalId: rental.id, justCreated: true } },
        ],
      })
    } finally {
      setSaving(false)
    }
  }

  // ─── Derived display values
  const userDisplayName = userSummary
    ? userSummary.nickname
      ? `${userSummary.name} (${userSummary.nickname})`
      : userSummary.name
    : "..."

  const isMotor = vehicle?.category === "MOTOR"

  const mulaiLabel = `${formatHeaderDate(mulai)} · ${formatTime(mulai)}`
  const estimasiLabel = `${formatHeaderDate(estimasi)} · ${formatTime(estimasi)}`
  const durasLabel = formatPaket(hari, jam)

  const tarifHint = formatRupiah(defaultTarif)
  const tarifChanged = tarifRaw !== "" && tarifValue !== defaultTarif

  const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ]

  function formatPayDate(d: Date) {
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
  }

  const methodLabel: Record<string, string> = {
    cash: "Cash",
    transfer: "Transfer",
    qris: "QRIS",
    lainnya: "Lainnya",
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
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
        <Text style={[textStyles.labelMd, { color: colors.primary, fontWeight: "600" }]}>3/3</Text>
      </View>

      {/* Progress bar — 3/3 full */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: "100%" }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                  {userSummary ? initialsFromName(userSummary.name) : "?"}
                </Text>
              </View>
              <Text style={[textStyles.bodyMd, styles.contextName]} numberOfLines={1}>
                {userDisplayName}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("PilihUser")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.inlineEditBtn}
              >
                <MaterialIcons name="edit" size={16} color={colors.primary} />
                <Text style={[textStyles.labelLg, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contextDivider} />
            {/* Vehicle row */}
            <View style={styles.contextRow}>
              <View style={styles.contextVehicleIcon}>
                <MaterialIcons
                  name={isMotor ? "two-wheeler" : "directions-car"}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[textStyles.bodyMd, { color: colors.onSurface, fontWeight: "500" }]}
                  numberOfLines={1}
                >
                  {vehicle?.name ?? "..."}
                </Text>
                {vehicle && (
                  <View style={styles.plateChip}>
                    <Text
                      style={[
                        textStyles.labelMd,
                        {
                          color: colors.onSurface,
                          letterSpacing: 1,
                          fontFamily: "publicSansSemiBold",
                        },
                      ]}
                    >
                      {vehicle.plate}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.inlineEditBtn}
              >
                <MaterialIcons name="edit" size={16} color={colors.primary} />
                <Text style={[textStyles.labelLg, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>
          </FieldCard>

          {/* ── Jaminan ─────────────────────────────────────── */}
          <View>
            <SectionLabel>Jaminan</SectionLabel>
            <FieldCard style={jaminanError ? styles.cardError : undefined}>
              {(["KTP", "KTM", "LAINNYA"] as JaminanItem[]).map((item) => (
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
                    {item === "KTP" ? "KTP" : item === "KTM" ? "KTM" : "Lainnya"}
                  </Text>
                </TouchableOpacity>
              ))}
              {jaminanItems.has("LAINNYA") && (
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
              <Text
                style={[
                  textStyles.labelMd,
                  { color: jaminanError ? colors.error : colors.onSurfaceVariant },
                ]}
              >
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
                  <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>
                    Bensin (kotak)
                  </Text>
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
                  <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>
                    KM (opsional)
                  </Text>
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
              <PhotoRow
                photos={photos}
                onAdd={handleAddPhoto}
                onRemove={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
              />
            </FieldCard>
          </View>

          {/* ── Durasi ───────────────────────────────────────── */}
          <View>
            <SectionLabel>Durasi</SectionLabel>
            <View style={styles.paketRow}>
              {/* Hari card */}
              <FieldCard style={styles.paketCard}>
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onSurfaceVariant, marginBottom: spacing.sm },
                  ]}
                >
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
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onSurfaceVariant, marginBottom: spacing.sm },
                  ]}
                >
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
                      <Text
                        style={[
                          textStyles.labelMd,
                          { color: jam === j ? colors.onPrimary : colors.onSurfaceVariant },
                        ]}
                      >
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
              <Text
                style={[
                  textStyles.labelMd,
                  { color: paketError ? colors.error : colors.onSurfaceVariant },
                ]}
              >
                Minimal 0 Hari 6 Jam
              </Text>
            </View>
          </View>

          {/* ── Waktu Sewa ───────────────────────────────────── */}
          <View>
            <SectionLabel>Waktu Sewa</SectionLabel>
            <FieldCard style={{ padding: 0, overflow: "hidden" }}>
              {/* Mulai — editable */}
              <TouchableOpacity
                style={styles.waktuRow}
                onPress={() => openPicker("mulai")}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      textStyles.labelMd,
                      { color: colors.onSurfaceVariant, marginBottom: 2 },
                    ]}
                  >
                    Mulai
                  </Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{mulaiLabel}</Text>
                </View>
                <MaterialIcons name="edit" size={18} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.waktuDivider} />
              {/* Kembali — read-only, derived from Mulai + Durasi stepper */}
              <View style={styles.waktuRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      textStyles.labelMd,
                      { color: colors.onSurfaceVariant, marginBottom: 2 },
                    ]}
                  >
                    Kembali
                  </Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                    {estimasiLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.waktuDivider} />
              {/* Durasi — read-only, mirrors the stepper above */}
              <View style={styles.waktuRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      textStyles.labelMd,
                      { color: colors.onSurfaceVariant, marginBottom: 2 },
                    ]}
                  >
                    Durasi
                  </Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{durasLabel}</Text>
                </View>
              </View>
            </FieldCard>
            <View style={styles.caption}>
              <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                Kembali dan Durasi otomatis dari Hari/Jam di atas
              </Text>
            </View>

            {/* DateTimePicker */}
            {pickerTarget !== null && (
              <>
                {Platform.OS === "ios" ? (
                  <View style={styles.iosPickerContainer}>
                    <Text
                      style={[
                        textStyles.labelMd,
                        { color: colors.onSurfaceVariant, marginBottom: 4 },
                      ]}
                    >
                      {pickerMode === "date" ? "Pilih Tanggal" : "Pilih Waktu"}
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
                        {pickerMode === "date" ? "Pilih Waktu →" : "Selesai"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DateTimePicker
                    value={pickerMode === "date" ? mulai : pickerTempDate}
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
              <Text
                style={[
                  textStyles.headlineSm,
                  { color: colors.onSurface, marginBottom: spacing.md },
                ]}
              >
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
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: tarifChanged ? colors.primary : colors.onSurfaceVariant },
                  ]}
                >
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
            <FieldCard style={{ padding: 0, overflow: "hidden" }}>
              {payments.length === 0 ? (
                <View style={styles.emptyPayment}>
                  <Text
                    style={[
                      textStyles.bodyMd,
                      { color: colors.onSurfaceVariant, fontStyle: "italic" },
                    ]}
                  >
                    Belum ada pembayaran
                  </Text>
                </View>
              ) : (
                payments.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.paymentRow}
                    onLongPress={() => {
                      Alert.alert("Hapus Pembayaran?", formatRupiah(p.amount), [
                        { text: "Batal", style: "cancel" },
                        {
                          text: "Hapus",
                          style: "destructive",
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
                <Text style={[textStyles.labelLg, { color: colors.primary }]}>
                  Tambah Pembayaran
                </Text>
              </TouchableOpacity>
            </FieldCard>

            {/* Summary */}
            <View style={styles.paySummary}>
              <View style={styles.paySummaryRow}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                  Sudah dibayar:
                </Text>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                  {formatRupiah(paid)}
                </Text>
              </View>
              <View style={styles.paySummaryRow}>
                <Text
                  style={[
                    textStyles.labelLg,
                    { color: remaining > 0 ? colors.error : colors.onSuccessContainer },
                  ]}
                >
                  Sisa:
                </Text>
                <Text
                  style={[
                    textStyles.labelLg,
                    { color: remaining > 0 ? colors.error : colors.onSuccessContainer },
                  ]}
                >
                  {formatRupiah(remaining)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Tujuan ───────────────────────────────────────── */}
          <View>
            <SectionLabel>Tujuan</SectionLabel>
            <TextInput
              style={[
                textStyles.bodyMd,
                styles.textInput,
                tujuanError ? { borderColor: colors.error } : undefined,
              ]}
              placeholder="Contoh: Kos Barat, Pantai Kenjeran, dll."
              placeholderTextColor={colors.outline}
              value={tujuan}
              onChangeText={(v) => {
                setTujuan(v)
                if (tujuanError) setTujuanError(false)
              }}
            />
            {tujuanError && (
              <Text style={[textStyles.labelMd, { color: colors.error, marginTop: spacing.xs }]}>
                Tujuan harus diisi
              </Text>
            )}
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
          onPress={() => navigation.goBack()}
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
          <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Simpan Rental</Text>
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
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },

  // AppBar
  appBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  backBtn: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  titleBlock: { flex: 1 },

  // Progress
  progressTrack: { backgroundColor: colors.surfaceVariant, height: 4 },
  progressFill: { backgroundColor: colors.primary, height: 4 },

  // Scroll
  scrollContent: {
    gap: spacing.xl,
    padding: spacing.base,
  },

  // Card
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.base,
    ...CARD_SHADOW,
  },
  cardError: {
    borderColor: colors.error,
  },

  // Context bar
  contextRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  contextAvatar: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  contextVehicleIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  contextName: {
    color: colors.onSurface,
    flex: 1,
    fontWeight: "500",
  },
  contextDivider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
    marginVertical: spacing.sm,
    opacity: 0.5,
  },
  plateChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.outlineVariant,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // Checkbox
  checkboxRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 6,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  inlineInput: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.onSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  // Caption
  caption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: spacing.xs,
  },

  // Kondisi Keluar
  kondisiSection: { gap: spacing.sm },
  kondisiLabelRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  kondisiDivider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
    marginVertical: spacing.md,
    opacity: 0.5,
  },
  bensinHint: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  kmInputRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md,
  },
  kmInput: {
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },

  // Stepper
  stepperRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.xs,
  },
  stepperBtn: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  // Fuel gauge
  fuelGaugeRow: { flexDirection: "row", gap: 2, height: 8, marginTop: spacing.xs },
  fuelSegment: { borderRadius: 0, flex: 1 },
  fuelSegmentFirst: { borderBottomLeftRadius: 4, borderTopLeftRadius: 4 },
  fuelSegmentLast: { borderBottomRightRadius: 4, borderTopRightRadius: 4 },

  // Paket Sewa
  paketRow: { flexDirection: "row", gap: spacing.sm },
  paketCard: { flex: 1 },
  jamSegmented: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    flexDirection: "row",
    gap: 2,
    padding: 3,
  },
  jamOption: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    height: 46,
    justifyContent: "center",
  },
  jamOptionActive: {
    backgroundColor: colors.primary,
  },

  // Inline edit button (icon + label)
  inlineEditBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },

  // Waktu Sewa
  waktuRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.base,
  },
  waktuDivider: { backgroundColor: colors.outlineVariant, height: 1 },
  iosPickerContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  iosPickerDone: {
    alignItems: "flex-end",
    paddingVertical: spacing.sm,
  },

  // Tarif & Total form
  formField: { gap: spacing.xs },
  rupiahInputRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  rupiahField: {
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.onSurface,
    height: 52,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  totalRow: {
    alignItems: "center",
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },

  // Pembayaran
  emptyPayment: {
    alignItems: "center",
    padding: spacing.base,
  },
  paymentRow: {
    alignItems: "center",
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.base,
  },
  paymentIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  methodBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addPaymentBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    padding: spacing.base,
  },
  paySummary: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.base,
  },
  paySummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Catatan
  catatanInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.onSurface,
    minHeight: 96,
    padding: spacing.base,
    ...CARD_SHADOW,
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.base,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.base,
  },
  btnBatal: {
    alignItems: "center",
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 52,
    paddingHorizontal: spacing.base,
  },
  btnSimpan: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 52,
    justifyContent: "center",
  },
})
