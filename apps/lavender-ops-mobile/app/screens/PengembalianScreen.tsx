import { useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { SafeAreaView } from "react-native-safe-area-context"

import { Text, TextInput } from "@/components/AppText"
import { FieldBox } from "@/components/form/FieldBox"
import { PhotoRow } from "@/components/form/PhotoRow"
import PembayaranSheet from "@/components/PembayaranSheet"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { choosePhotoSource } from "@/services/photos/capture"
import {
  getRental,
  getUserSummary,
  getVehicle,
  closeRental,
  updatePayment,
  deletePayment,
} from "@/services/rentals"
import type { CloseRentalInput } from "@/services/rentals"
import type { Rental, UserSummary, Vehicle, Payment } from "@/services/rentals/types"
import { colors, textStyles, spacing, cardShadow } from "@/theme/tokens"
import { formatRupiah, formatHeaderDate, formatTime } from "@/utils/format"
import {
  sumPayments,
  hoursLate,
  computeFuelAdjustment,
  computeReturnTotal,
} from "@/utils/rentalMath"
import { showToast } from "@/utils/showToast"
import { useBottomBarPadding } from "@/utils/useBottomBarPadding"
import { useBottomSpace } from "@/utils/useBottomSpace"
import { uuidv4 } from "@/utils/uuid"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseRupiahInput(raw: string): number {
  const cleaned = raw.replace(/[^\d-]/g, "")
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? 0 : n
}

function displayRupiah(digits: string): string {
  if (!digits) return ""
  const n = parseRupiahInput(digits)
  if (n === 0 && digits === "") return ""
  const sign = n < 0 ? "−" : ""
  return sign + new Intl.NumberFormat("id-ID").format(Math.abs(n))
}

function formatActualDuration(start: Date, end: Date): string {
  const diffMs = Math.max(0, end.getTime() - start.getTime())
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days === 0) return `${hours} Jam`
  if (hours === 0) return `${days} Hari`
  return `${days} Hari ${hours} Jam`
}

type ExtraFee = { id: string; description: string; rawAmount: string }

const JAMINAN_LABELS: Record<string, string> = { KTP: "KTP", KTM: "KTM", LAINNYA: "Lainnya" }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={[textStyles.headlineSm, { color: colors.onSurface, marginBottom: spacing.sm }]}>
      {children}
    </Text>
  )
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
      <Text
        style={[
          textStyles.headlineSm,
          { color: colors.onSurface, minWidth: 72, textAlign: "center" },
        ]}
      >
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

export function PengembalianScreen({ navigation, route }: AppStackScreenProps<"Pengembalian">) {
  const { rentalId } = route.params

  // PRD-4 (v1.0.4): no tab bar here (outside MainNavigator) — useBottomSpace() is the raw
  // device inset. barPadding is for the pinned bottom bar; bottomSpace is the extra scroll
  // clearance below it.
  const barPadding = useBottomBarPadding()
  const bottomSpace = useBottomSpace()

  const [rental, setRental] = useState<Rental | null>(null)
  const [user, setUser] = useState<UserSummary | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Waktu Kembali ─────────────────────────────────────────────────────────
  const [returnedAt, setReturnedAt] = useState<Date>(() => new Date())
  const [pickerActive, setPickerActive] = useState(false)
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date")
  const [pickerTempDate, setPickerTempDate] = useState<Date>(() => new Date())

  // ── Kondisi Kembali ───────────────────────────────────────────────────────
  const [bensinKembali, setBensinKembali] = useState(4)
  const [rawHarga, setRawHarga] = useState("5000")
  const [kmKembali, setKmKembali] = useState("")

  // ── Rincian Biaya ─────────────────────────────────────────────────────────
  const [rawSubtotal, setRawSubtotal] = useState("")
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([])
  const [showDiscount, setShowDiscount] = useState(false)
  const [rawDiscount, setRawDiscount] = useState("")

  // ── Pembayaran ────────────────────────────────────────────────────────────
  const [pendingPayments, setPendingPayments] = useState<Omit<Payment, "id">[]>([])
  const [showPaySheet, setShowPaySheet] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  // ── Kondisi Kembali Photos ────────────────────────────────────────────────
  const [kembaliPhotos, setKembaliPhotos] = useState<
    { id: string; uri: string | null; mimeType?: string }[]
  >([])

  // ── Tujuan ────────────────────────────────────────────────────────────────
  const [tujuan, setTujuan] = useState("")

  // ── Catatan ───────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("")

  // ── Saving ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const r = await getRental(rentalId)
      if (!r) {
        setLoading(false)
        return
      }
      const [u, v] = await Promise.all([getUserSummary(r.userId), getVehicle(r.vehicleId)])
      setRental(r)
      setUser(u)
      setVehicle(v)
      setBensinKembali(r.kondisiKeluar.bensinKotak)
      setRawSubtotal(String(r.tarif))
      setTujuan(r.tujuan)
      setNotes(r.notes)
      setLoading(false)
    }
    load()
  }, [rentalId])

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
    setPickerMode("date")
    setPickerActive(true)
  }

  function handlePickerChange(_e: unknown, selected?: Date) {
    if (!selected) {
      setPickerActive(false)
      return
    }
    if (pickerMode === "date") {
      const combined = new Date(pickerTempDate)
      combined.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
      setPickerTempDate(combined)
      if (Platform.OS === "android") setPickerMode("time")
    } else {
      const combined = new Date(pickerTempDate)
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
      setReturnedAt(combined)
      setPickerActive(false)
    }
  }

  function handleIosPickerDone() {
    if (pickerMode === "date") {
      setPickerMode("time")
    } else {
      setReturnedAt(new Date(pickerTempDate))
      setPickerActive(false)
    }
  }

  // ── Extra fees ────────────────────────────────────────────────────────────
  function addExtraFee() {
    setExtraFees((prev) => [...prev, { id: String(Date.now()), description: "", rawAmount: "" }])
  }

  function removeExtraFee(feeId: string) {
    setExtraFees((prev) => prev.filter((f) => f.id !== feeId))
  }

  function updateExtraFee(feeId: string, field: "description" | "rawAmount", value: string) {
    setExtraFees((prev) =>
      prev.map((f) =>
        f.id === feeId
          ? { ...f, [field]: field === "rawAmount" ? value.replace(/\D/g, "") : value }
          : f,
      ),
    )
  }

  // ── Fuel suggestion Terapkan ──────────────────────────────────────────────
  function applyFuelSuggestion() {
    if (!fuelAdj || fuelAdj.direction === "none") return
    const signed = fuelAdj.direction === "add" ? fuelAdj.deltaRupiah : -fuelAdj.deltaRupiah
    setExtraFees((prev) => [
      ...prev,
      { id: String(Date.now()), description: "Bensin", rawAmount: String(signed) },
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
          photos: kembaliPhotos,
        },
        subtotalSewa,
        extraFees: extraFeesComputed,
        discount,
        tujuan: tujuan.trim(),
        notes: notes.trim(),
        newPayments: pendingPayments,
      }
      await closeRental(rental.id, input)
      navigation.replace("RentalDetail", { rentalId: rental.id, justClosed: true })
    } catch {
      showToast("Gagal menyimpan pengembalian")
      setSaving(false)
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!rental || !user || !vehicle) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── AppBar ─────────────────────────────────────────────────── */}
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          {/* PRD-5 AC-4/BR-6 (v1.0.4): both lines used to be forced onto one line
              (`numberOfLines={1}`) — the one hand-rolled header in the app that failed by
              truncation instead of wrapping. `subtitle` concatenates three identifiers
              (nickname/name · vehicle · plate), which is exactly the content BR-1 says must
              never be cut off. `appBarTitle` already has `flex: 1` and the row has no pinned
              height, so removing the caps is enough — same working pattern as
              DetailSewaScreen's and PilihKendaraanScreen's headers. */}
          <View style={styles.appBarTitle}>
            <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>
              Proses Pengembalian
            </Text>
            <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
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
            <View style={styles.card}>
              {/* Mulai (read-only) */}
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                    Mulai
                  </Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface, marginTop: 2 }]}>
                    {formatHeaderDate(rental.startAt)} · {formatTime(rental.startAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              {/* Kembali (editable — tap to open picker). PRD-8 D-2: the box itself now carries
                  the affordance (the inline "Edit" control was removed 2026-07-26 — tapping the
                  box already opens the picker). FieldBox only wraps the SAME TouchableOpacity
                  that already covered this whole row, so the tap target and interaction are
                  unchanged. */}
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Kembali</Text>
              <FieldBox>
                <TouchableOpacity style={styles.timeRow} onPress={openPicker} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={[textStyles.bodyMd, { color: colors.onSurface, marginTop: 2 }]}>
                      {formatHeaderDate(returnedAt)} · {formatTime(returnedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </FieldBox>

              <View style={styles.rowDivider} />

              {/* Durasi (read-only, derived from Mulai → Kembali) */}
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                    Durasi
                  </Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface, marginTop: 2 }]}>
                    {formatActualDuration(rental.startAt, returnedAt)}
                  </Text>
                </View>
              </View>

              {/* iOS: inline picker with Done button */}
              {pickerActive && Platform.OS === "ios" && (
                <View style={styles.iosPickerContainer}>
                  <Text
                    style={[
                      textStyles.labelMd,
                      { color: colors.onSurfaceVariant, marginBottom: 4 },
                    ]}
                  >
                    {pickerMode === "date" ? "Pilih Tanggal" : "Pilih Jam"}
                  </Text>
                  <DateTimePicker
                    value={pickerTempDate}
                    mode={pickerMode}
                    display="spinner"
                    onChange={(_e, d) => {
                      if (d) setPickerTempDate(d)
                    }}
                    locale="id-ID"
                  />
                  <TouchableOpacity style={styles.iosPickerDone} onPress={handleIosPickerDone}>
                    <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>
                      {pickerMode === "date" ? "Pilih Jam →" : "Selesai"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Android: picker outside the card */}
            {pickerActive && Platform.OS === "android" && (
              <DateTimePicker
                value={pickerTempDate}
                mode={pickerMode}
                display="default"
                onChange={handlePickerChange}
              />
            )}

            {/* Terlambat warning — below the card */}
            {isLate && (
              <View style={styles.terlambatWarning}>
                <MaterialIcons name="warning-amber" size={16} color={colors.onWarningContainer} />
                <Text style={[textStyles.labelMd, { color: colors.onWarningContainer }]}>
                  Terlambat {jamLambat} jam dari estimasi
                </Text>
              </View>
            )}
          </View>

          {/* ── 1b. Tujuan (editable — can be corrected at return) ─── */}
          <View>
            <SectionLabel>Tujuan</SectionLabel>
            <View style={styles.card}>
              <FieldBox>
                <TextInput
                  style={[textStyles.bodyMd, styles.tujuanInput]}
                  placeholder="Contoh: Kos Barat, Pantai Kenjeran, dll."
                  placeholderTextColor={colors.outlineVariant}
                  value={tujuan}
                  onChangeText={setTujuan}
                />
              </FieldBox>
            </View>
          </View>

          {/* ── 2. Kondisi Kembali ─────────────────────────────────── */}
          <View>
            <SectionLabel>Kondisi Kembali</SectionLabel>
            <View style={styles.card}>
              {/* Bensin stepper */}
              <View>
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onSurfaceVariant, marginBottom: spacing.sm },
                  ]}
                >
                  Bensin Kembali
                </Text>
                <Stepper
                  value={bensinKembali}
                  onDecrement={() => setBensinKembali((v) => Math.max(0, v - 1))}
                  onIncrement={() => setBensinKembali((v) => Math.min(8, v + 1))}
                  label={`${bensinKembali} kotak`}
                />
                <FuelGauge value={bensinKembali} />
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onSurfaceVariant, marginTop: spacing.xs },
                  ]}
                >
                  Saat keluar: {rental.kondisiKeluar.bensinKotak} kotak
                </Text>
              </View>

              <View style={styles.rowDivider} />

              {/* Harga bensin per kotak */}
              <View>
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onSurfaceVariant, marginBottom: spacing.sm },
                  ]}
                >
                  Harga bensin / kotak
                </Text>
                <FieldBox>
                  <View style={styles.inputRow}>
                    <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                    <TextInput
                      style={[textStyles.bodyMd, styles.inlineInput]}
                      value={displayRupiah(rawHarga)}
                      onChangeText={(t) => setRawHarga(t.replace(/\D/g, ""))}
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholder="5.000"
                      placeholderTextColor={colors.outlineVariant}
                    />
                  </View>
                </FieldBox>
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onSurfaceVariant, marginTop: spacing.xs },
                  ]}
                >
                  Dipakai untuk menghitung saran penyesuaian tarif.
                </Text>
              </View>

              <View style={styles.rowDivider} />

              {/* KM */}
              <View>
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onSurfaceVariant, marginBottom: spacing.sm },
                  ]}
                >
                  KM Kembali (opsional)
                </Text>
                <FieldBox>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[textStyles.bodyMd, styles.inlineInput]}
                      value={kmKembali}
                      onChangeText={(t) => setKmKembali(t.replace(/\D/g, ""))}
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholder={
                        rental.kondisiKeluar.km != null ? String(rental.kondisiKeluar.km + 1) : "—"
                      }
                      placeholderTextColor={colors.outlineVariant}
                    />
                    <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>km</Text>
                  </View>
                </FieldBox>
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onSurfaceVariant, marginTop: spacing.xs },
                  ]}
                >
                  {rental.kondisiKeluar.km != null
                    ? `Saat keluar: ${rental.kondisiKeluar.km.toLocaleString("id-ID")} km`
                    : "Boleh dikosongkan."}
                </Text>
              </View>

              <View style={styles.rowDivider} />

              {/* Photos */}
              <PhotoRow
                photos={kembaliPhotos}
                onAdd={async () => {
                  const captured = await choosePhotoSource()
                  if (captured) {
                    setKembaliPhotos((prev) => [
                      ...prev,
                      { id: uuidv4(), uri: captured.uri, mimeType: captured.mimeType },
                    ])
                  }
                }}
                onRemove={(id) => setKembaliPhotos((prev) => prev.filter((p) => p.id !== id))}
              />
            </View>
          </View>

          {/* ── 3. Rincian Biaya ───────────────────────────────────── */}
          <View>
            <SectionLabel>Rincian Biaya</SectionLabel>
            <View style={styles.card}>
              {/* Subtotal Sewa (editable) */}
              <View style={styles.infoRow}>
                <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                  Subtotal Sewa
                </Text>
                <FieldBox style={styles.amountBox}>
                  <View style={styles.amountInputRow}>
                    <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                    <TextInput
                      style={[textStyles.bodyMd, styles.amountInput]}
                      value={displayRupiah(rawSubtotal)}
                      onChangeText={(t) => setRawSubtotal(t.replace(/\D/g, ""))}
                      keyboardType="numeric"
                      returnKeyType="done"
                      textAlign="right"
                      placeholder="0"
                      placeholderTextColor={colors.outlineVariant}
                    />
                  </View>
                </FieldBox>
              </View>

              {/* Fuel suggestion row */}
              {fuelAdj && fuelAdj.direction !== "none" && (
                <View style={styles.fuelSuggestionRow}>
                  <View style={styles.fuelSuggestionIcon}>
                    <MaterialIcons
                      name="local-gas-station"
                      size={20}
                      color={colors.onWarningContainer}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                      Bensin {fuelAdj.direction === "add" ? "kurang" : "lebih"}{" "}
                      {Math.abs(fuelAdj.selisih)} kotak
                    </Text>
                    <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                      saran {fuelAdj.direction === "add" ? "+" : "−"}
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

              {/* Extra fee rows. PRD-8 D-3: the description is boxed, not underlined — AC-1's
                  own wording ("every extra-fee description and amount") settles it. */}
              {extraFees.map((fee) => (
                <View key={fee.id} style={styles.extraFeeRow}>
                  <FieldBox style={styles.extraFeeDescBox}>
                    <TextInput
                      style={[textStyles.bodyMd, styles.extraFeeDesc]}
                      value={fee.description}
                      onChangeText={(t) => updateExtraFee(fee.id, "description", t)}
                      placeholder="Deskripsi biaya..."
                      placeholderTextColor={colors.outlineVariant}
                      returnKeyType="next"
                    />
                  </FieldBox>
                  <FieldBox style={styles.amountBox}>
                    <View style={styles.amountInputRow}>
                      <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
                        Rp
                      </Text>
                      <TextInput
                        style={[textStyles.bodyMd, styles.amountInput]}
                        value={displayRupiah(fee.rawAmount)}
                        onChangeText={(t) => updateExtraFee(fee.id, "rawAmount", t)}
                        keyboardType="numeric"
                        returnKeyType="done"
                        textAlign="right"
                        placeholder="0"
                        placeholderTextColor={colors.outlineVariant}
                      />
                    </View>
                  </FieldBox>
                  <TouchableOpacity
                    onPress={() => removeExtraFee(fee.id)}
                    style={{ paddingLeft: spacing.sm }}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Diskon row. Not named in AC-1's flagship list, but it shares the amount-box
                  style with Subtotal Sewa / extra-fee amounts (below) and is a Field under BR-4
                  like any of them — flagged in the delivery report. */}
              {showDiscount && (
                <View style={styles.infoRow}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                    Diskon
                  </Text>
                  <FieldBox style={styles.amountBox}>
                    <View style={styles.amountInputRow}>
                      <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
                        − Rp
                      </Text>
                      <TextInput
                        style={[textStyles.bodyMd, styles.amountInput]}
                        value={displayRupiah(rawDiscount)}
                        onChangeText={(t) => setRawDiscount(t.replace(/\D/g, ""))}
                        keyboardType="numeric"
                        returnKeyType="done"
                        textAlign="right"
                        placeholder="0"
                        placeholderTextColor={colors.outlineVariant}
                      />
                    </View>
                  </FieldBox>
                  <TouchableOpacity
                    onPress={() => {
                      setShowDiscount(false)
                      setRawDiscount("")
                    }}
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
                <TouchableOpacity
                  style={styles.addLineBtn}
                  onPress={() => setShowDiscount(true)}
                  activeOpacity={0.7}
                >
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
            </View>
          </View>

          {/* ── 4. Pembayaran ──────────────────────────────────────── */}
          <View>
            <SectionLabel>Pembayaran</SectionLabel>
            <View style={[styles.card, { padding: 0, overflow: "hidden", gap: 0 }]}>
              {rental.payments.length === 0 && pendingPayments.length === 0 ? (
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
                          {p.method === "LAINNYA"
                            ? (p.methodDescription ?? "Lainnya")
                            : p.method.toUpperCase()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editPayBtn}
                        onPress={() => {
                          setEditingPayment(p)
                          setShowPaySheet(true)
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="edit" size={16} color={colors.primary} />
                        <Text style={[textStyles.labelMd, { color: colors.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {pendingPayments.map((p, i) => (
                    <View
                      key={`pending-${i}`}
                      style={[styles.paymentRow, { backgroundColor: colors.surfaceContainerLow }]}
                    >
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
                          {p.method === "LAINNYA"
                            ? (p.methodDescription ?? "Lainnya")
                            : p.method.toUpperCase()}
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
                <Text style={[textStyles.labelLg, { color: colors.primary }]}>
                  Tambah Pembayaran
                </Text>
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
                <Text
                  style={[
                    textStyles.labelLg,
                    { color: sisa > 0 ? colors.error : colors.onSuccessContainer },
                  ]}
                >
                  Sisa:
                </Text>
                <Text
                  style={[
                    textStyles.labelLg,
                    { color: sisa > 0 ? colors.error : colors.onSuccessContainer },
                  ]}
                >
                  {formatRupiah(sisa)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── 5. Status Jaminan ──────────────────────────────────── */}
          <View>
            <SectionLabel>Status Jaminan</SectionLabel>
            <View
              style={[
                styles.jaminanBanner,
                { backgroundColor: sisa > 0 ? colors.warningContainer : colors.successContainer },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <MaterialIcons
                  name={sisa > 0 ? "warning-amber" : "check-circle"}
                  size={20}
                  color={sisa > 0 ? colors.onWarningContainer : colors.onSuccessContainer}
                />
                <Text
                  style={[
                    textStyles.labelLg,
                    {
                      color: sisa > 0 ? colors.onWarningContainer : colors.onSuccessContainer,
                      flex: 1,
                    },
                  ]}
                >
                  {sisa > 0
                    ? `Jaminan ditahan — akan dibuat Hutang ${formatRupiah(sisa)}`
                    : "Jaminan bisa dikembalikan"}
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
                <Text
                  style={[
                    textStyles.labelMd,
                    { color: colors.onWarningContainer, marginTop: spacing.xs },
                  ]}
                >
                  Hutang otomatis dibuat saat pengembalian disimpan.
                </Text>
              )}
            </View>
          </View>

          {/* ── 6. Catatan ─────────────────────────────────────────── */}
          {/* PRD-8 dispatch ⑨: `notes.trim()` flows into the close-rental payload, so this is a
              Field under BR-4 (AC-7 forbids a bare TextInput under app/ outside the two
              allow-listed screens). FieldBox's `minHeight: 52` is a minimum, not a fixed height,
              so the box grows with multiline content instead of clipping it. */}
          <View>
            <SectionLabel>Catatan</SectionLabel>
            <View style={styles.card}>
              <FieldBox>
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
              </FieldBox>
            </View>
          </View>

          <View style={{ height: spacing.xxxl + 64 + bottomSpace }} />
        </ScrollView>

        {/* ── Sticky bottom CTA ──────────────────────────────────── */}
        <View style={[styles.bottomBar, { paddingBottom: barPadding }]}>
          <TouchableOpacity
            style={[styles.btnSelesai, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              // PRD-5 BR-1 (v1.0.4): "Selesaikan & Buat Hutang" is the longest CTA label in the
              // app (24 chars) — the button most likely to wrap at 1.5x. `styles.btnLabel`
              // (`flexShrink: 1`, hoisted so it doesn't trip `no-inline-styles`) lets it wrap
              // instead of overflowing; `btnSelesai` below is `minHeight` (not `height`) so the
              // button grows to hold a second line instead of clipping it.
              <Text style={[textStyles.labelLg, styles.btnLabel, { color: colors.onPrimary }]}>
                {sisa > 0 ? "Selesaikan & Buat Hutang" : "Selesaikan Pengembalian"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PembayaranSheet
        visible={showPaySheet}
        onClose={() => {
          setShowPaySheet(false)
          setEditingPayment(null)
        }}
        onSubmit={async (p) => {
          if (editingPayment) {
            try {
              const updated = await updatePayment(rental.id, editingPayment.id, p)
              setRental(updated)
              setEditingPayment(null)
              setShowPaySheet(false)
            } catch {
              showToast("Gagal mengedit pembayaran")
            }
          } else {
            setPendingPayments((prev) => [...prev, p])
            setShowPaySheet(false)
          }
        }}
        defaultAmount={undefined}
        editingPayment={editingPayment ?? undefined}
        onDelete={
          editingPayment
            ? async () => {
                try {
                  const updated = await deletePayment(rental.id, editingPayment.id)
                  setRental(updated)
                  setEditingPayment(null)
                } catch {
                  showToast("Gagal menghapus pembayaran")
                }
              }
            : undefined
        }
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// PRD-8 BR-6/AC-6: the field-box style set (border colour + fill + radius + `minHeight`) lives
// ONLY in `FieldBox` now. `inputRow` / `amountInputRow` / `inlineInput` / `amountInput` /
// `extraFeeDesc` below are the INNER content rows/fields that sit *inside* a `<FieldBox>` — same
// split RupiahInput uses (its `row`/`field`). `amountBox` / `extraFeeDescBox` compose extra sizing
// (`minWidth`/`flex`) onto FieldBox's own box via its `style` prop, per ④'s handoff note (RN array
// style semantics — these do not redeclare border/fill/radius/minHeight).
//
// Alphabetised (react-native/sort-styles) — this block groups by section no longer, so read the
// per-key comments, not headers, for context.
const styles = StyleSheet.create({
  // PRD-8 dispatch ⑨ (v1.0.5): `height: 44` → `minHeight: 48` + `paddingVertical` — the
  // established minHeight-not-height pattern, so the box grows rather than clips at larger text
  // scale. This is a Control, NOT a Field (BR-4): it deliberately keeps `outlineVariant` +
  // radius 10, NOT FieldBox's `outline` + radius 12 + `surface`-only fill — those tokens are the
  // signal that this is not a value Mom can edit in place (BR-1/BR-3).
  addLineBtn: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  // PRD-8 dispatch ⑨ (v1.0.5): explicit `minHeight: 48` added to align with `addLineBtn`
  // (Farrel: "Tambah Pembayaran" should match "Tambah Biaya"/"Diskon" sizing). `paddingVertical`
  // unchanged — it already met the minHeight+padding pattern.
  addPaymentBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  // Composes onto FieldBox (Subtotal Sewa / extra-fee amount / Diskon) — preserves the pill's old
  // `minWidth: 140` now that border/fill/radius/minHeight live on FieldBox itself.
  amountBox: {
    minWidth: 140,
  },
  amountInput: {
    color: colors.onSurface,
    flex: 1,
    padding: 0,
    textAlign: "right",
  },
  // The "Rp" + amount TextInput row, now rendered INSIDE a FieldBox rather than being the box.
  amountInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  appBar: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  appBarTitle: {
    flex: 1,
  },
  backBtn: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginRight: spacing.sm,
    width: 40,
  },
  bottomBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    elevation: 4,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  // PRD-5 BR-1 (v1.0.4): lets a button label wrap instead of overflowing — hoisted out of
  // the JSX so it doesn't trip `no-inline-styles`.
  btnDisabled: {
    opacity: 0.6,
  },
  btnLabel: { flexShrink: 1 },
  btnSelesai: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  // Section container (formerly the local `FieldCard` sub-component — PRD-8 D-5 removes the
  // duplicate; usages now read `<View style={styles.card}>` directly).
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    gap: spacing.md,
    padding: spacing.base,
    ...cardShadow,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  editPayBtn: { alignItems: "center", flexDirection: "row", gap: 2, marginLeft: spacing.xs },
  emptyPayment: {
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  // PRD-8 D-3: boxed, not underlined — border-bottom dropped, `flex: 1` moved to
  // `extraFeeDescBox` (composed onto the wrapping FieldBox instead).
  extraFeeDesc: {
    color: colors.onSurface,
    padding: 0,
  },
  extraFeeDescBox: {
    flex: 1,
  },
  extraFeeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  fuelGaugeRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  fuelSegment: {
    flex: 1,
    height: 12,
    marginHorizontal: 1,
  },
  fuelSegmentFirst: {
    borderBottomLeftRadius: 6,
    borderTopLeftRadius: 6,
  },
  fuelSegmentLast: {
    borderBottomRightRadius: 6,
    borderTopRightRadius: 6,
  },
  fuelSuggestionIcon: {
    alignItems: "center",
    backgroundColor: colors.warningContainer,
    borderColor: colors.onWarningContainer,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    opacity: 0.8,
    width: 36,
  },
  // Guard 3 / debt #12: renders amber unconditionally, regardless of add/subtract direction —
  // pinned as-is by the characterisation suite. NOT touched by this migration.
  fuelSuggestionRow: {
    alignItems: "center",
    backgroundColor: colors.warningContainer,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  // Generic label/value row (Subtotal Sewa, Diskon, Total Tagihan). Untouched — its own
  // `minHeight: 40` is a DIFFERENT signature from the field-box set and is pinned by the
  // characterisation suite's row locators.
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 40,
  },
  inlineInput: {
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },
  // The Rp-prefixed / km-suffixed content row for Harga bensin/kotak and KM Kembali, now rendered
  // INSIDE a FieldBox rather than being the box (was treatment #3 in PRD-8's inventory).
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  iosPickerContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    marginTop: spacing.sm,
    padding: spacing.base,
  },
  iosPickerDone: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  jaminanBanner: {
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.base,
  },
  jaminanChip: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  jaminanChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  // Pre-existing dead style (`react-native/no-unused-styles`, baseline) — not part of this
  // migration's scope, left as found.
  lateCaption: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  methodBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  // Catatan's TextInput, now rendered inside a FieldBox — mirrors Tujuan/RupiahInput's `field`
  // split (`padding: 0` so the TextInput's own default padding doesn't stack on FieldBox's).
  // `minHeight: 96` sets the multiline TextInput's own minimum (~4 lines); it composes with
  // FieldBox's own `minHeight: 52` rather than replacing it — both are minimums, so the box
  // grows with content, never clips it.
  notesInput: {
    color: colors.onSurface,
    minHeight: 96,
    padding: 0,
  },
  paySummary: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.base,
  },
  // PRD-5 AC-9 (v1.0.4): a rupiah amount sits directly across from a label here, with the
  // same `space-between`-with-no-`gap` anti-pattern the flagship AC-1 defect used — "no
  // rupiah amount may ever touch adjacent text, no exception". `flexWrap` + `gap` let the
  // amount drop to its own line instead of relying on leftover slack.
  paySummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  paymentIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  paymentRow: {
    alignItems: "center",
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
    marginVertical: 0,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.base,
  },
  stepperBtn: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stepperRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  terapkanBtn: {
    alignItems: "center",
    backgroundColor: colors.tertiaryContainer,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  terlambatWarning: {
    alignItems: "center",
    backgroundColor: colors.warningContainer,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  timeRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  // Tujuan's TextInput, now rendered inside a FieldBox — mirrors RupiahInput's `field` split
  // (`padding: 0` so the TextInput's own default padding doesn't stack on FieldBox's).
  tujuanInput: {
    color: colors.onSurface,
    padding: 0,
  },
})
