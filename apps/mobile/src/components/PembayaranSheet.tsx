import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialIcons } from '@expo/vector-icons'
import { Payment, PaymentMethod } from '../connectors/types'
import { colors, textStyles, spacing } from '../theme'
import { formatRupiah } from '../lib/format'

type Props = {
  visible: boolean
  onClose: () => void
  onSubmit: (p: Omit<Payment, 'id'>) => void
  defaultAmount?: number
}

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'qris', label: 'QRIS' },
  { key: 'lainnya', label: 'Lainnya' },
]

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function PembayaranSheet({ visible, onClose, onSubmit, defaultAmount }: Props) {
  const [rawAmount, setRawAmount] = useState(defaultAmount ? String(defaultAmount) : '')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [methodDesc, setMethodDesc] = useState('')
  const [paidAt, setPaidAt] = useState<Date>(todayMidnight)
  const [notes, setNotes] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [amountError, setAmountError] = useState(false)

  function reset() {
    setRawAmount(defaultAmount ? String(defaultAmount) : '')
    setMethod('cash')
    setMethodDesc('')
    setPaidAt(todayMidnight())
    setNotes('')
    setShowDatePicker(false)
    setAmountError(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    const amount = parseInt(rawAmount.replace(/\D/g, ''), 10)
    if (!amount || amount <= 0) {
      setAmountError(true)
      return
    }
    onSubmit({
      amount,
      method,
      methodDescription: method === 'lainnya' ? methodDesc : undefined,
      paidAt,
      notes: notes.trim() || undefined,
    })
    reset()
    onClose()
  }

  const parsedAmount = parseInt(rawAmount.replace(/\D/g, ''), 10)
  const amountDisplay = rawAmount.replace(/\D/g, '') ? formatRupiah(parsedAmount || 0) : ''

  const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const dateLabel = `${DAYS[paidAt.getDay()]}, ${paidAt.getDate()} ${MONTHS[paidAt.getMonth()]} ${paidAt.getFullYear()}`

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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Tambah Pembayaran</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Jumlah */}
            <View style={styles.field}>
              <Text style={[textStyles.labelMd, styles.fieldLabel]}>Jumlah *</Text>
              <View style={[styles.rupiahInput, amountError && styles.inputError]}>
                <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
                <TextInput
                  style={[textStyles.bodyMd, styles.rupiahField]}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={rawAmount.replace(/\D/g, '')}
                  onChangeText={(t) => {
                    setAmountError(false)
                    setRawAmount(t)
                  }}
                  returnKeyType="done"
                />
              </View>
              {amountDisplay ? (
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  {amountDisplay}
                </Text>
              ) : null}
              {amountError && (
                <Text style={[textStyles.labelMd, { color: colors.error, marginTop: 4 }]}>
                  Jumlah harus lebih dari 0
                </Text>
              )}
            </View>

            {/* Metode */}
            <View style={styles.field}>
              <Text style={[textStyles.labelMd, styles.fieldLabel]}>Metode *</Text>
              <View style={styles.methodRow}>
                {METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.methodChip, method === m.key && styles.methodChipActive]}
                    onPress={() => setMethod(m.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      textStyles.labelMd,
                      { color: method === m.key ? colors.onPrimary : colors.onSurface },
                    ]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {method === 'lainnya' && (
                <TextInput
                  style={[textStyles.bodyMd, styles.textInput, { marginTop: spacing.sm }]}
                  placeholder="Contoh: DANA, Gopay, Voucher"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={methodDesc}
                  onChangeText={setMethodDesc}
                />
              )}
            </View>

            {/* Tanggal */}
            <View style={styles.field}>
              <Text style={[textStyles.labelMd, styles.fieldLabel]}>Tanggal</Text>
              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>{dateLabel}</Text>
                <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={paidAt}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_e, date) => {
                    setShowDatePicker(Platform.OS === 'ios')
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
            <View style={styles.field}>
              <Text style={[textStyles.labelMd, styles.fieldLabel]}>Catatan (opsional)</Text>
              <TextInput
                style={[textStyles.bodyMd, styles.textInput, { minHeight: 72, textAlignVertical: 'top' }]}
                placeholder="Contoh: DP, cicilan pertama..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnBatal} onPress={handleClose} activeOpacity={0.8}>
              <Text style={[textStyles.labelLg, { color: colors.onSurfaceVariant }]}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnTambah} onPress={handleSubmit} activeOpacity={0.8}>
              <MaterialIcons name="check" size={20} color={colors.onPrimary} style={{ marginRight: 6 }} />
              <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Tambah</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  body: {
    padding: spacing.base,
    gap: spacing.xl,
    paddingBottom: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.onSurfaceVariant,
  },
  rupiahInput: {
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
  inputError: {
    borderColor: colors.error,
  },
  rupiahField: {
    flex: 1,
    color: colors.onSurface,
    padding: 0,
  },
  methodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  methodChip: {
    height: 40,
    paddingHorizontal: spacing.base,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    color: colors.onSurface,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  btnBatal: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  btnTambah: {
    flex: 2,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
})
