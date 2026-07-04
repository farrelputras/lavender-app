import { useState, useCallback } from "react"
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
} from "react-native"
import { MaterialIcons, FontAwesome } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import { PhotoRow } from "@/components/form/PhotoRow"
import { PhotoViewer } from "@/components/form/PhotoViewer"
import PembayaranSheet from "@/components/PembayaranSheet"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useSession } from "@/services/auth/useSession"
import {
  getRental,
  getUserSummary,
  getVehicle,
  addPayment,
  updatePayment,
  deletePayment,
} from "@/services/rentals"
import type { Rental, UserSummary, Vehicle, Payment } from "@/services/rentals/types"
import { colors, textStyles, spacing, cardShadow } from "@/theme/tokens"
import {
  formatRupiah,
  formatHeaderDate,
  formatTime,
  initialsFromName,
  formatPhoneId,
  toWaNumber,
} from "@/utils/format"
import { sumPayments, formatPaket, isOverdue, hoursLate } from "@/utils/rentalMath"

function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert("", msg)
  }
}

const JAMINAN_LABELS: Record<string, string> = { KTP: "KTP", KTM: "KTM", LAINNYA: "Lainnya" }

function paymentMethodLabel(payment: Payment): string {
  if (payment.method === "LAINNYA") return payment.methodDescription ?? "Lainnya"
  const MAP: Record<string, string> = { CASH: "Cash", TRANSFER: "Transfer", QRIS: "QRIS" }
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
    <View style={{ flexDirection: "row", alignItems: "center" }}>
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

export function RentalDetailScreen({ navigation, route }: AppStackScreenProps<"RentalDetail">) {
  const { rentalId, justCreated, justClosed } = route.params

  const { role } = useSession()
  const isAdmin = role === "admin"

  const [rental, setRental] = useState<Rental | null>(null)
  const [user, setUser] = useState<UserSummary | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaySheet, setShowPaySheet] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [viewerUri, setViewerUri] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      async function load() {
        setLoading(true)
        const r = await getRental(rentalId)
        if (cancelled) return
        if (!r) {
          setLoading(false)
          return
        }
        const [u, v] = await Promise.all([getUserSummary(r.userId), getVehicle(r.vehicleId)])
        if (cancelled) return
        setRental(r)
        setUser(u)
        setVehicle(v)
        setLoading(false)
        if (justCreated) showToast("Rental tersimpan")
        if (justClosed) showToast("Pengembalian tersimpan")
      }
      load()
      return () => {
        cancelled = true
      }
    }, [rentalId]),
  )

  function handleBack() {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })
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
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
            Rental tidak ditemukan.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const totalPaid = sumPayments(rental.payments)
  const sisa = Math.max(0, rental.totalBill - totalPaid)
  const initials = user ? initialsFromName(user.name) : "?"
  const vehicleIcon: "two-wheeler" | "directions-car" =
    vehicle?.category === "MOBIL" ? "directions-car" : "two-wheeler"
  const overdue = isOverdue(rental)

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.appBarTitle}>
          <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>Detail Rental</Text>
        </View>
        <View
          style={[
            styles.statusChip,
            rental
              ? rental.status === "ACTIVE"
                ? { backgroundColor: colors.warningContainer }
                : { backgroundColor: colors.successContainer }
              : { backgroundColor: colors.warningContainer },
          ]}
        >
          <Text
            style={[
              textStyles.labelMd,
              {
                color:
                  rental?.status === "ACTIVE"
                    ? colors.onWarningContainer
                    : colors.onSuccessContainer,
              },
            ]}
          >
            {rental?.status === "ACTIVE" ? "Aktif" : "Selesai"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* ── 1. User & Vehicle ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.entityRow}>
            <View style={styles.avatar}>
              <Text style={[textStyles.labelLg, { color: colors.onPrimaryContainer }]}>
                {initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {user?.name ?? "—"}
              </Text>
              {user?.nickname ? (
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                  {user.nickname}
                </Text>
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
                onPress={() =>
                  Linking.openURL("https://wa.me/" + toWaNumber(user.phone)).catch(() =>
                    showToast("Tidak dapat membuka WhatsApp"),
                  )
                }
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
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {vehicle?.name ?? "—"}
              </Text>
              {vehicle ? (
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
              ) : null}
            </View>
          </View>
        </View>

        {/* ── 2. Waktu Sewa ─────────────────────────────── */}
        <View>
          <SectionLabel>Waktu Sewa</SectionLabel>
          <View style={[styles.card, { padding: 0, overflow: "hidden", gap: 0 }]}>
            {/* Mulai */}
            <View style={styles.waktuRow}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Mulai</Text>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {formatHeaderDate(rental.startAt)} · {formatTime(rental.startAt)}
              </Text>
            </View>
            <View style={styles.waktuDivider} />
            {/* Kembali */}
            <View style={styles.waktuRow}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Kembali</Text>
              <Text
                style={[
                  textStyles.bodyMd,
                  {
                    color: overdue && rental.status === "ACTIVE" ? colors.error : colors.onSurface,
                  },
                ]}
              >
                {formatHeaderDate(rental.dueAt)} · {formatTime(rental.dueAt)}
              </Text>
            </View>
            <View style={styles.waktuDivider} />
            {/* Durasi */}
            <View style={styles.waktuRow}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Durasi</Text>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {formatPaket(rental.paketHari, rental.paketJam)}
              </Text>
            </View>
          </View>
          {/* Terlambat warning — aktif only, below card */}
          {overdue && rental.status === "ACTIVE" && (
            <View style={styles.terlambatWarning}>
              <MaterialIcons name="warning-amber" size={16} color={colors.onWarningContainer} />
              <Text style={[textStyles.labelMd, { color: colors.onWarningContainer }]}>
                Terlambat {hoursLate(rental.dueAt)} jam
              </Text>
            </View>
          )}
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
            <TouchableOpacity
              onPress={() => showToast("Akan segera tersedia")}
              style={styles.inlineEditBtn}
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
              <Text style={[textStyles.labelLg, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                Bensin
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                  {rental.kondisiKeluar.bensinKotak} kotak
                </Text>
                <BensinGauge value={rental.kondisiKeluar.bensinKotak} />
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                KM
              </Text>
              <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                {rental.kondisiKeluar.km != null
                  ? `${rental.kondisiKeluar.km.toLocaleString("id-ID")} km`
                  : "—"}
              </Text>
            </View>

            {rental.kondisiKeluar.photos.length > 0 && (
              <>
                <View style={styles.rowDivider} />
                <PhotoRow
                  photos={rental.kondisiKeluar.photos}
                  readonly
                  onAdd={() => {}}
                  onRemove={() => {}}
                  onPhotoPress={(p) => setViewerUri(p.uri)}
                />
              </>
            )}
          </View>
        </View>

        {/* ── 4b. Kondisi Kembali ───────────────────────── */}
        {rental.kondisiKembali && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>
                Kondisi Kembali
              </Text>
            </View>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                  Bensin
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                    {rental.kondisiKembali.bensinKotak} kotak
                  </Text>
                  <BensinGauge value={rental.kondisiKembali.bensinKotak} />
                </View>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                  KM
                </Text>
                <Text style={[textStyles.labelMd, { color: colors.onSurface }]}>
                  {rental.kondisiKembali.km != null
                    ? `${rental.kondisiKembali.km.toLocaleString("id-ID")} km`
                    : "—"}
                </Text>
              </View>
              {rental.kondisiKembali.photos.length > 0 && (
                <>
                  <View style={styles.rowDivider} />
                  <PhotoRow
                    photos={rental.kondisiKembali.photos}
                    readonly
                    onAdd={() => {}}
                    onRemove={() => {}}
                    onPhotoPress={(p) => setViewerUri(p.uri)}
                  />
                </>
              )}
            </View>
          </View>
        )}

        {/* ── 5. Tarif & Total ──────────────────────────── */}
        <View>
          <SectionLabel>Tarif & Total</SectionLabel>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                Tarif
              </Text>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {formatRupiah(rental.tarif)}
              </Text>
            </View>

            {rental.addOn.amount > 0 || rental.addOn.description.trim().length > 0 ? (
              <View style={styles.infoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
                    Add-on
                  </Text>
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
              <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                Diskon
              </Text>
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
          <View style={[styles.card, { padding: 0, overflow: "hidden", gap: 0 }]}>
            <View>
              {rental.payments.length === 0 ? (
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
                    {(rental.status === "ACTIVE" || isAdmin) && (
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
                    )}
                  </View>
                ))
              )}
              {rental.status === "ACTIVE" && (
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
              )}
            </View>
          </View>
          <View style={styles.paySummary}>
            <View style={styles.paySummaryRow}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                Sudah dibayar:
              </Text>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
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

        {/* ── 7. Tujuan ─────────────────────────────────── */}
        <View>
          <Text
            style={[textStyles.headlineSm, { color: colors.onSurface, marginBottom: spacing.xs }]}
          >
            Tujuan
          </Text>
          <View style={styles.card}>
            <View style={styles.insetBlock}>
              <Text
                style={[
                  textStyles.bodyMd,
                  { color: rental.tujuan ? colors.onSurface : colors.onSurfaceVariant },
                ]}
              >
                {rental.tujuan || "Tidak ada tujuan."}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 8. Catatan ───────────────────────────────── */}
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Catatan Rental</Text>
            <TouchableOpacity
              onPress={() => showToast("Akan segera tersedia")}
              style={styles.inlineEditBtn}
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
              <Text style={[textStyles.labelLg, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.insetBlock}>
              <Text
                style={[
                  textStyles.bodyMd,
                  { color: rental.notes ? colors.onSurface : colors.onSurfaceVariant },
                ]}
              >
                {rental.notes || "Tidak ada catatan."}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: spacing.xxxl + 64 }} />
      </ScrollView>

      {/* Sticky bottom CTA — only for active rentals */}
      {rental.status === "ACTIVE" && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.btnProses}
            onPress={() => navigation.navigate("Pengembalian", { rentalId: rental.id })}
            activeOpacity={0.8}
          >
            <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>
              Proses Pengembalian
            </Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Sticky bottom CTA — completed rentals: back to home */}
      {rental.status === "COMPLETED" && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.btnKembali} onPress={handleBack} activeOpacity={0.8}>
            <MaterialIcons name="home" size={20} color={colors.onPrimary} />
            <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        </View>
      )}

      <PembayaranSheet
        visible={showPaySheet}
        onClose={() => {
          setShowPaySheet(false)
          setEditingPayment(null)
        }}
        onSubmit={async (p) => {
          try {
            const updated = editingPayment
              ? await updatePayment(rental.id, editingPayment.id, p)
              : await addPayment(rental.id, p)
            setRental(updated)
            setEditingPayment(null)
          } catch {
            showToast(editingPayment ? "Gagal mengedit pembayaran" : "Gagal menyimpan pembayaran")
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

      <PhotoViewer
        visible={viewerUri != null}
        uri={viewerUri}
        onClose={() => setViewerUri(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  addPaymentBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    padding: spacing.base,
  },
  appBar: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  appBarTitle: {
    flex: 1,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  body: {
    gap: spacing.md,
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  bottomBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    padding: spacing.base,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.base,
  },
  btnKembali: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    height: 56,
    justifyContent: "center",
  },
  btnProses: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    height: 56,
    justifyContent: "center",
  },
  callButton: {
    alignItems: "center",
    backgroundColor: "#25D366",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    gap: spacing.sm,
    padding: spacing.base,
    ...cardShadow,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  divider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
    marginVertical: spacing.xs,
  },
  editPayBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    marginLeft: spacing.xs,
  },
  emptyPayment: {
    alignItems: "center",
    padding: spacing.base,
  },
  entityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: spacing.xs,
  },
  inlineEditBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  insetBlock: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.md,
  },
  jaminanPill: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  jaminanPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  methodBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  paketChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  paymentIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  paymentRow: {
    alignItems: "center",
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.base,
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
  rowDivider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
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
  waktuDivider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
  },
  waktuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.base,
  },
})
