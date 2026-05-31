import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import { SectionLabel } from "@/components/form/SectionLabel"
import { PhotoSlot } from "@/components/form/PhotoSlot"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getUser, getUserSummary, softDeleteUser } from "@/services/rentals"
import type { User, UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatRupiah } from "@/utils/format"

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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[textStyles.bodyLg, { color: colors.onSurfaceVariant, padding: spacing.lg }]}>
          User tidak ditemukan.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
          Detail User
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("UserForm", { mode: "edit", userId: user.id })}>
          <MaterialIcons name="edit" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.identityBlock}>
          <Text style={[textStyles.headlineLg, { color: colors.onSurface }]}>
            {user.nickname ? `${user.name} (${user.nickname})` : user.name}
          </Text>
          <Text style={[textStyles.bodyLg, { color: colors.onSurfaceVariant }]}>{user.phone}</Text>
          {user.isMahasiswa && (
            <View style={[styles.chip, { backgroundColor: colors.surfaceVariant, marginTop: spacing.xs }]}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                {user.verificationStatus === "TERVERIFIKASI_PDDIKTI"
                  ? "Terverifikasi PDDikti"
                  : "Belum Diverifikasi PDDikti"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[textStyles.labelMd, { color: colors.secondary }]}>Sewa Aktif</Text>
            <Text style={[textStyles.headlineMd, { color: colors.onSurface }]}>
              {summary.activeRentalsCount}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[textStyles.labelMd, { color: colors.secondary }]}>Hutang</Text>
            <Text style={[textStyles.headlineMd, { color: colors.onSurface }]}>
              {formatRupiah(summary.debtAmount)}
            </Text>
          </View>
        </View>

        <SectionLabel>Foto</SectionLabel>
        <View style={styles.photoRow}>
          <PhotoSlot
            label="Foto Profil"
            photo={user.profilPhoto ? { id: user.profilPhoto.id, uri: user.profilPhoto.uri } : null}
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

        <SectionLabel>Kontak & Catatan</SectionLabel>
        <View style={styles.field}>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Alamat</Text>
          <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{user.alamat ?? "—"}</Text>
        </View>
        <View style={styles.field}>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Kontak Darurat</Text>
          <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{user.kontakDarurat ?? "—"}</Text>
        </View>
        <View style={styles.field}>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Catatan</Text>
          <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{user.notes ?? "—"}</Text>
        </View>

        {user.isMahasiswa && (user.namaPddikti || user.universitas) && (
          <>
            <SectionLabel>PDDikti</SectionLabel>
            <View style={styles.field}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Nama Resmi</Text>
              <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>
                {user.namaPddikti ?? "—"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Universitas</Text>
              <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>
                {user.universitas ?? "—"} {user.prodi ? `· ${user.prodi}` : ""}
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
          <MaterialIcons name="delete" size={20} color={colors.error} />
          <Text style={[textStyles.labelLg, { color: colors.error }]}>Hapus User</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  scroll: { paddingBottom: spacing.xxl },
  identityBlock: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.xs },
  chip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statsRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.base, marginTop: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.base,
    borderRadius: borderRadius.card,
    elevation: 2,
  },
  photoRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    flexWrap: "wrap",
  },
  field: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: 2 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.error,
  },
})
