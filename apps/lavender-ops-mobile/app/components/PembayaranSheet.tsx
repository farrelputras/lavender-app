import { useEffect, useState } from "react"
import {
  Alert,
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  Keyboard,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"

import { Text, TextInput } from "@/components/AppText"
import { FieldBox } from "@/components/form/FieldBox"
import { Payment, PaymentMethod } from "@/services/rentals/types"
import { colors, textStyles, spacing } from "@/theme/tokens"

type Props = {
  visible: boolean
  onClose: () => void
  onSubmit: (p: Omit<Payment, "id">) => void
  defaultAmount?: number
  editingPayment?: Payment
  onDelete?: () => void
}

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "CASH", label: "Cash" },
  { key: "TRANSFER", label: "Transfer" },
  { key: "QRIS", label: "QRIS" },
  { key: "LAINNYA", label: "Lainnya" },
]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function PembayaranSheet({
  visible,
  onClose,
  onSubmit,
  defaultAmount,
  editingPayment,
  onDelete,
}: Props) {
  const [rawDigits, setRawDigits] = useState(defaultAmount ? String(defaultAmount) : "")
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [methodDesc, setMethodDesc] = useState("")
  const [paidAt, setPaidAt] = useState<Date>(todayMidnight)
  const [notes, setNotes] = useState("")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [amountError, setAmountError] = useState(false)
  const [kbOffset, setKbOffset] = useState(0)

  // Prefill from editingPayment (or reset to defaults) whenever the sheet opens.
  useEffect(() => {
    if (!visible) return
    if (editingPayment) {
      setRawDigits(String(editingPayment.amount))
      setMethod(editingPayment.method)
      setMethodDesc(editingPayment.methodDescription ?? "")
      setPaidAt(
        editingPayment.paidAt instanceof Date
          ? editingPayment.paidAt
          : new Date(editingPayment.paidAt as unknown as string),
      )
      setNotes(editingPayment.notes ?? "")
    } else {
      setRawDigits(defaultAmount ? String(defaultAmount) : "")
      setMethod("CASH")
      setMethodDesc("")
      setPaidAt(todayMidnight())
      setNotes("")
    }
    setAmountError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKbOffset(e.endCoordinates.height)
    })
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKbOffset(0)
    })
    return () => {
      showSub.remove()
      hideSub.remove()
      setKbOffset(0)
    }
  }, [visible])

  const displayValue = rawDigits
    ? new Intl.NumberFormat("id-ID").format(parseInt(rawDigits, 10) || 0)
    : ""

  function reset() {
    setRawDigits(defaultAmount ? String(defaultAmount) : "")
    setMethod("CASH")
    setMethodDesc("")
    setPaidAt(todayMidnight())
    setNotes("")
    setShowDatePicker(false)
    setAmountError(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleDelete() {
    Alert.alert("Hapus Pembayaran", "Pembayaran ini akan dihapus. Lanjutkan?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          handleClose()
          onDelete?.()
        },
      },
    ])
  }

  function handleSubmit() {
    const amount = parseInt(rawDigits, 10)
    if (!amount || amount <= 0) {
      setAmountError(true)
      return
    }
    onSubmit({
      amount,
      method,
      methodDescription: method === "LAINNYA" ? methodDesc : undefined,
      paidAt,
      notes: notes.trim() || undefined,
    })
    reset()
    onClose()
  }

  const dateLabel = `${paidAt.getDate()} ${MONTHS[paidAt.getMonth()]} ${paidAt.getFullYear()}`

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheetWrapper, { paddingBottom: kbOffset }]} pointerEvents="box-none">
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 32 }} />
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>
              {editingPayment ? "Edit Pembayaran" : "Tambah Pembayaran"}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Jumlah */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                Jumlah <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <FieldBox style={amountError ? styles.inputError : undefined}>
                <View style={styles.rupiahInput}>
                  <Text
                    style={[
                      textStyles.headlineSm,
                      { color: colors.onSurfaceVariant, marginRight: 8 },
                    ]}
                  >
                    Rp
                  </Text>
                  <TextInput
                    style={[textStyles.headlineMd, styles.rupiahField]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={displayValue}
                    onChangeText={(t) => {
                      setAmountError(false)
                      setRawDigits(t.replace(/\D/g, ""))
                    }}
                    returnKeyType="done"
                  />
                </View>
              </FieldBox>
              {amountError && (
                <Text style={[textStyles.labelMd, { color: colors.error, marginTop: 4 }]}>
                  Jumlah harus lebih dari 0
                </Text>
              )}
            </View>

            {/* Metode */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                Metode <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.methodRow}>
                {METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.methodChip, method === m.key && styles.methodChipActive]}
                    onPress={() => setMethod(m.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        textStyles.labelMd,
                        { color: method === m.key ? colors.onPrimary : colors.primary },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {method === "LAINNYA" && (
                <FieldBox style={styles.methodDescBox}>
                  <TextInput
                    style={[textStyles.bodyMd, styles.textInput]}
                    placeholder="Contoh: DANA, Gopay, Voucher"
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={methodDesc}
                    onChangeText={setMethodDesc}
                  />
                </FieldBox>
              )}
            </View>

            {/* Tanggal — a Field under BR-4 (a recorded value the user picks), even though it
                opens a picker rather than accepting typed text, so it gets FieldBox too (PRD-8
                dispatch ⑨). `dateRow` used to BE the box (its own border/fill/radius/height);
                it's now just the row's internal layout, composed inside FieldBox. */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tanggal</Text>
              <FieldBox>
                <TouchableOpacity
                  style={styles.dateRow}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{dateLabel}</Text>
                  <MaterialIcons name="calendar-month" size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </FieldBox>
              {showDatePicker && (
                <DateTimePicker
                  value={paidAt}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(_e, date) => {
                    setShowDatePicker(Platform.OS === "ios")
                    if (date) {
                      const d = new Date(date)
                      d.setHours(0, 0, 0, 0)
                      setPaidAt(d)
                    }
                  }}
                />
              )}
            </View>

            {/* Catatan */}
            <View style={[styles.field, { paddingBottom: 32 }]}>
              <Text style={styles.fieldLabel}>
                Catatan{" "}
                <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
                  (opsional)
                </Text>
              </Text>
              <FieldBox>
                <TextInput
                  style={[textStyles.bodyMd, styles.textInput, styles.notesInput]}
                  placeholder="Catatan tambahan..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </FieldBox>
            </View>
          </ScrollView>

          {/* Action */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnSimpan} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Simpan</Text>
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity style={styles.btnHapus} onPress={handleDelete} activeOpacity={0.8}>
                <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                <Text style={[textStyles.labelLg, { color: colors.error }]}>Hapus Pembayaran</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  actions: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopColor: colors.surfaceVariant,
    borderTopWidth: 1,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  body: {
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  btnHapus: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    height: 48,
    justifyContent: "center",
    marginTop: 8,
  },
  btnSimpan: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
  },
  closeBtn: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  // PRD-8 (v1.0.5): border/fill/radius/height moved to FieldBox (BR-6, AC-6 — one declaration
  // site; also BR-8's `minHeight`-not-`height`). This is now pure inner-row layout — label left,
  // calendar icon right — with no `paddingHorizontal` of its own since FieldBox already supplies
  // that (same convention as `rupiahField`/`textInput` below).
  dateRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...textStyles.labelLg,
    color: colors.onSurface,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.outlineVariant,
    borderRadius: 3,
    height: 6,
    marginBottom: 4,
    marginTop: 16,
    width: 48,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.surfaceVariant,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  // PRD-8 (v1.0.5): applied to the FieldBox (not this row) via its `style` prop when the
  // amount is invalid — composition, not a second box declaration (BR-6).
  inputError: {
    borderColor: colors.error,
  },
  methodChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  methodChipActive: {
    backgroundColor: colors.primary,
  },
  // PRD-8 (v1.0.5): replaces the old inline `{ marginTop: spacing.sm }` on the "Lainnya"
  // description TextInput — now applied to its FieldBox instead, since the box (not the bare
  // input) is the row that needs the gap from the method chips above it.
  methodDescBox: {
    marginTop: spacing.sm,
  },
  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  // PRD-8 (v1.0.5): replaces the old inline `{ minHeight: 80, textAlignVertical: "top" }` on
  // the Catatan TextInput — FieldBox now owns the box's own minHeight (52); this is purely the
  // multiline sizing hint for the input itself.
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rupiahField: {
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },
  // PRD-8 (v1.0.5): border/fill/radius/minHeight moved to FieldBox (BR-6, AC-6 — one
  // declaration site). This is now pure inner-row layout for the "Rp" label + amount input.
  rupiahInput: {
    alignItems: "center",
    flexDirection: "row",
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  // PRD-8 (v1.0.5): border/fill/radius moved to FieldBox (BR-6). `padding: 0` because the box
  // now owns the field's padding — matches `RupiahInput`'s own `field` style convention.
  textInput: {
    color: colors.onSurface,
    padding: 0,
  },
})
