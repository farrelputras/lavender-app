import { useState, useEffect } from "react"
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
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { SafeAreaView } from "react-native-safe-area-context"

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
          <View style={styles.appBarTitle}>
            <Text style={[textStyles.labelLg, { color: colors.onSurface }]} numberOfLines={1}>
              Proses Pengembalian
            </Text>
            <Text
              style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
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

              {/* Kembali (editable — tap to open picker) */}
              <TouchableOpacity style={styles.timeRow} onPress={openPicker} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                    Kembali
                  </Text>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurface, marginTop: 2 }]}>
                    {formatHeaderDate(returnedAt)} · {formatTime(returnedAt)}
                  </Text>
                </View>
                <View style={styles.inlineEditBtn}>
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                  <Text style={[textStyles.labelLg, { color: colors.primary }]}>Edit</Text>
                </View>
              </TouchableOpacity>

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
            </FieldCard>

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
            <FieldCard>
              <TextInput
                style={[textStyles.bodyMd, { color: colors.onSurface, minHeight: 40 }]}
                placeholder="Contoh: Kos Barat, Pantai Kenjeran, dll."
                placeholderTextColor={colors.outlineVariant}
                value={tujuan}
                onChangeText={setTujuan}
              />
            </FieldCard>
          </View>

          {/* ── 2. Kondisi Kembali ─────────────────────────────────── */}
          <View>
            <SectionLabel>Kondisi Kembali</SectionLabel>
            <FieldCard>
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
                    onChangeText={(t) => setRawSubtotal(t.replace(/\D/g, ""))}
                    keyboardType="numeric"
                    returnKeyType="done"
                    textAlign="right"
                    placeholder="0"
                    placeholderTextColor={colors.outlineVariant}
                  />
                </View>
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

              {/* Extra fee rows */}
              {extraFees.map((fee) => (
                <View key={fee.id} style={styles.extraFeeRow}>
                  <TextInput
                    style={[textStyles.bodyMd, styles.extraFeeDesc]}
                    value={fee.description}
                    onChangeText={(t) => updateExtraFee(fee.id, "description", t)}
                    placeholder="Deskripsi biaya..."
                    placeholderTextColor={colors.outlineVariant}
                    returnKeyType="next"
                  />
                  <View style={styles.amountInputRow}>
                    <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
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
                  <TouchableOpacity
                    onPress={() => removeExtraFee(fee.id)}
                    style={{ paddingLeft: spacing.sm }}
                  >
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
            </FieldCard>
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

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  // AppBar
  appBar: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginRight: spacing.sm,
    width: 40,
  },
  appBarTitle: {
    flex: 1,
  },

  // Scroll content
  scrollContent: {
    gap: spacing.md,
    padding: spacing.base,
  },

  // Card
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    gap: spacing.md,
    padding: spacing.base,
    ...cardShadow,
  },
  inlineEditBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
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

  // Divider
  rowDivider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
    marginVertical: 0,
  },

  // Time row (Waktu Sewa section)
  timeRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },

  // Generic row
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 40,
  },

  // Late caption
  lateCaption: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },

  // iOS picker
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

  // Fuel gauge
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

  // Stepper
  stepperRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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

  // Inline inputs
  inputRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 48,
    paddingHorizontal: spacing.sm,
  },
  inlineInput: {
    color: colors.onSurface,
    flex: 1,
    minHeight: 48,
  },

  // Amount input
  amountInputRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    height: 40,
    minWidth: 140,
    paddingHorizontal: spacing.sm,
  },
  amountInput: {
    color: colors.onSurface,
    flex: 1,
    paddingVertical: 0,
    textAlign: "right",
  },

  // Fuel suggestion row
  fuelSuggestionRow: {
    alignItems: "center",
    backgroundColor: colors.warningContainer,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
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
  terapkanBtn: {
    alignItems: "center",
    backgroundColor: colors.tertiaryContainer,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // Extra fee row
  extraFeeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  extraFeeDesc: {
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    color: colors.onSurface,
    flex: 1,
    paddingVertical: spacing.xs,
  },

  // Add biaya / diskon buttons
  addLineBtn: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 44,
    justifyContent: "center",
  },

  // Payment rows
  paymentRow: {
    alignItems: "center",
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  paymentIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  methodBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  editPayBtn: { alignItems: "center", flexDirection: "row", gap: 2, marginLeft: spacing.xs },
  addPaymentBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  emptyPayment: {
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },

  // Sisa summary
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

  // Jaminan banner
  jaminanBanner: {
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.base,
  },
  jaminanChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  jaminanChip: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: 20,
    borderWidth: 1,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    elevation: 4,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.base,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  btnSelesai: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
})
