import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native"
import { MaterialIcons, FontAwesome } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import { PhotoSlot } from "@/components/form/PhotoSlot"
import { StatusPill } from "@/components/form/StatusPill"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getUser, getUserSummary, softDeleteUser } from "@/services/rentals"
import type { User, UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing, cardShadow } from "@/theme/tokens"
import { formatRupiah, toWaNumber } from "@/utils/format"

export function UserDetailScreen({ route, navigation }: AppStackScreenProps<"UserDetail">) {
  const { userId } = route.params
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<UserSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      Promise.all([getUser(userId), getUserSummary(userId)]).then(([u, s]) => {
        setUser(u)
        setSummary(s)
        setLoading(false)
      })
    }, [userId]),
  )

  const handleDelete = () => {
    Alert.alert(
      "Hapus User?",
      "User akan disembunyikan dari daftar. Riwayat rental & hutang tetap tersimpan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            await softDeleteUser(userId)
            navigation.goBack()
          },
        },
      ],
    )
  }

  const handleWhatsApp = () => {
    if (!user) return
    Linking.openURL("https://wa.me/" + toWaNumber(user.phone)).catch(() =>
      Alert.alert("Error", "Tidak dapat membuka WhatsApp"),
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!user || !summary) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.appBarBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Detail User</Text>
          <View style={styles.appBarSide} />
        </View>
        <Text style={[textStyles.bodyLg, { color: colors.onSurfaceVariant, padding: spacing.lg }]}>
          User tidak ditemukan.
        </Text>
      </SafeAreaView>
    )
  }

  const isVerified = user.verificationStatus === "TERVERIFIKASI_PDDIKTI"
  const displayName = user.nickname ? `${user.name} (${user.nickname})` : user.name

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.appBarBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Detail User</Text>
        <View style={styles.appBarSide}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("UserForm", { mode: "edit", userId: user.id })}
          >
            <MaterialIcons name="edit" size={20} color={colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroName}>{displayName}</Text>
          <Text style={styles.heroPhone}>{user.phone}</Text>
          {user.isMahasiswa && (
            <StatusPill
              label="Mahasiswa"
              bg={isVerified ? colors.successContainer : colors.surfaceVariant}
              color={isVerified ? colors.onSuccessContainer : colors.onSurfaceVariant}
              icon={isVerified ? "check" : undefined}
            />
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Sewa Aktif</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {summary.activeRentalsCount}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Hutang</Text>
            <Text
              style={[
                styles.statValue,
                { color: summary.debtAmount > 0 ? colors.error : colors.success },
              ]}
            >
              {formatRupiah(summary.debtAmount)}
            </Text>
          </View>
        </View>

        {/* Dokumen & Foto */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Dokumen &amp; Foto</Text>
          <View style={styles.photoRow}>
            <PhotoSlot
              label="Foto Profil"
              photo={
                user.profilPhoto ? { id: user.profilPhoto.id, uri: user.profilPhoto.uri } : null
              }
              readonly
              onCapture={() => {}}
              onRemove={() => {}}
            />
            <PhotoSlot
              label="KTP"
              photo={user.ktpPhoto ? { id: user.ktpPhoto.id, uri: user.ktpPhoto.uri } : null}
              readonly
              onCapture={() => {}}
              onRemove={() => {}}
            />
            <PhotoSlot
              label="KTM"
              photo={user.ktmPhoto ? { id: user.ktmPhoto.id, uri: user.ktmPhoto.uri } : null}
              readonly
              onCapture={() => {}}
              onRemove={() => {}}
            />
          </View>
        </View>

        {/* Kontak & Catatan */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Alamat</Text>
            <Text style={styles.infoValue}>{user.alamat ?? "—"}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kontak Darurat</Text>
            <Text style={styles.infoValue}>{user.kontakDarurat ?? "—"}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Catatan</Text>
            <Text style={styles.infoValue}>{user.notes ?? "—"}</Text>
          </View>
        </View>

        {/* PDDikti (conditional) */}
        {user.isMahasiswa && (user.namaPddikti || user.universitas) && (
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Resmi</Text>
              <Text style={styles.infoValue}>{user.namaPddikti ?? "—"}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Universitas</Text>
              <Text style={styles.infoValue}>
                {user.universitas ?? "—"}
                {user.prodi ? ` · ${user.prodi}` : ""}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={handleWhatsApp}
            activeOpacity={0.85}
          >
            <FontAwesome name="whatsapp" size={22} color="#FFFFFF" />
            <Text style={[textStyles.labelLg, { color: "#FFFFFF" }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
            <MaterialIcons name="delete" size={20} color={colors.error} />
            <Text style={[textStyles.labelLg, { color: colors.error }]}>Hapus User</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },

  // App Bar
  appBar: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  appBarBtn: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  appBarTitle: {
    ...textStyles.headlineMd,
    color: colors.onSurface,
    flex: 1,
    textAlign: "center",
  },
  appBarSide: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  editBtn: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  // Scroll
  scroll: { paddingBottom: spacing.xxl },

  // Profile Hero
  hero: {
    alignItems: "center",
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  heroName: { ...textStyles.headlineLg, color: colors.onSurface, textAlign: "center" },
  heroPhone: { ...textStyles.bodyLg, color: colors.onSurfaceVariant, textAlign: "center" },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 100,
    padding: spacing.md,
    ...cardShadow,
  },
  statLabel: { ...textStyles.labelMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  statValue: { ...textStyles.headlineMd },

  // Card (photo + info + PDDikti)
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.base,
    padding: spacing.md,
    ...cardShadow,
  },
  cardSectionTitle: {
    ...textStyles.labelLg,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  // Info fields inside card
  infoRow: { gap: 2 },
  infoLabel: { ...textStyles.labelMd, color: colors.onSurfaceVariant },
  infoValue: { ...textStyles.bodyMd, color: colors.onSurface },
  infoDivider: {
    backgroundColor: colors.surfaceVariant,
    height: 1,
    marginVertical: spacing.sm,
  },

  // Action buttons
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  whatsappBtn: {
    alignItems: "center",
    backgroundColor: "#25D366",
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    justifyContent: "center",
  },
  deleteBtn: {
    alignItems: "center",
    borderColor: colors.error,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    justifyContent: "center",
  },
})
