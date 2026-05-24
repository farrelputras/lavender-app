import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native'
import { useEffect, useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialIcons } from '@expo/vector-icons'
import { Payment, PaymentMethod } from '../connectors/types'
import { colors, textStyles, spacing } from '../theme'

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function PembayaranSheet({ visible, onClose, onSubmit, defaultAmount }: Props) {
  const [rawDigits, setRawDigits] = useState(defaultAmount ? String(defaultAmount) : '')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [methodDesc, setMethodDesc] = useState('')
  const [paidAt, setPaidAt] = useState<Date>(todayMidnight)
  const [notes, setNotes] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [amountError, setAmountError] = useState(false)
  const [kbOffset, setKbOffset] = useState(0)

  useEffect(() => {
    if (!visible) return
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKbOffset(e.endCoordinates.height)
    })
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKbOffset(0)
    })
    return () => {
      showSub.remove()
      hideSub.remove()
      setKbOffset(0)
    }
  }, [visible])

  const displayValue = rawDigits
    ? new Intl.NumberFormat('id-ID').format(parseInt(rawDigits, 10) || 0)
    : ''

  function reset() {
    setRawDigits(defaultAmount ? String(defaultAmount) : '')
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
    const amount = parseInt(rawDigits, 10)
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

      <View
        style={[styles.sheetWrapper, { paddingBottom: kbOffset }]}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 32 }} />
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Tambah Pembayaran</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
              <View style={[styles.rupiahInput, amountError && styles.inputError]}>
                <Text style={[textStyles.headlineSm, { color: colors.onSurfaceVariant, marginRight: 8 }]}>Rp</Text>
                <TextInput
                  style={[textStyles.headlineMd, styles.rupiahField]}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={displayValue}
                  onChangeText={(t) => {
                    setAmountError(false)
                    setRawDigits(t.replace(/\D/g, ''))
                  }}
                  returnKeyType="done"
                />
              </View>
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
                    <Text style={[
                      textStyles.labelMd,
                      { color: method === m.key ? colors.onPrimary : colors.primary },
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
              <Text style={styles.fieldLabel}>Tanggal</Text>
              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{dateLabel}</Text>
                <MaterialIcons name="calendar-month" size={20} color={colors.onSurfaceVariant} />
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
            <View style={[styles.field, { paddingBottom: 32 }]}>
              <Text style={styles.fieldLabel}>
                Catatan{' '}
                <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>(opsional)</Text>
              </Text>
              <TextInput
                style={[textStyles.bodyMd, styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Catatan tambahan..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Action */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnSimpan} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    maxHeight: '90%',
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 24,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...textStyles.labelLg,
    color: colors.onSurface,
  },
  rupiahInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
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
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: colors.primary,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    color: colors.onSurface,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  btnSimpan: {
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
