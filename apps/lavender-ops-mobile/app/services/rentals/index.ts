import {
  rowToRental,
  rowToUserSummary,
  rowToUser,
  rowToVehicle,
  rowToVehicleSummary,
  rowToHutang,
  rowToHutangFull,
  rowToRentalListItem,
} from "./translators"
import {
  DashboardSummary,
  RentalDueToday,
  ReturnStatus,
  User,
  CreateUserInput,
  UpdateUserInput,
  PhotoInput,
  UserSummary,
  VehicleSummary,
  Vehicle,
  Rental,
  CreateRentalInput,
  Payment,
  KondisiSnapshot,
  Hutang,
  HutangFull,
  RentalListItem,
} from "./types"
import { supabase } from "../supabase/client"
import { uuidv4 } from "@/utils/uuid"
import { uploadPhoto, signPaths } from "@/services/photos/storage"
import type { UserPhotoSlot, RentalPhotoPhase } from "@/services/photos/paths"
import { buildUserPhotoPath, buildRentalPhotoPath, extFromMime } from "@/services/photos/paths"

export interface CloseRentalInput {
  returnedAt: Date
  kondisiKembali: KondisiSnapshot
  subtotalSewa: number
  extraFees: { description: string; amount: number }[]
  discount: number
  notes?: string
  newPayments: Omit<Payment, "id">[]
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserSummaries(): Promise<UserSummary[]> {
  const { data, error } = await supabase
    .from("v_user_summaries")
    .select("*")
    .order("name", { ascending: true })
  if (error) throw error
  const rawRows = data as Record<string, unknown>[]
  const users = rawRows.map(rowToUserSummary)
  // gather all profil paths for batch signing
  const allPaths: string[] = []
  rawRows.forEach((row) => {
    const profil = row.profil_photo as { id: string; path: string } | null
    if (profil) allPaths.push(profil.path)
  })
  if (allPaths.length > 0) {
    const signed = await signPaths(allPaths)
    users.forEach((u, i) => {
      const profil = rawRows[i].profil_photo as { id: string; path: string } | null
      if (profil && u.profilPhoto) u.profilPhoto = { ...u.profilPhoto, uri: signed.get(profil.path) ?? null }
    })
  }
  return users
}

export async function getUserSummary(id: string): Promise<UserSummary | null> {
  const { data, error } = await supabase
    .from("v_user_summaries")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const raw = data as Record<string, unknown>
  const user = rowToUserSummary(raw)
  // hydrate profil photo URI
  const profil = raw.profil_photo as { id: string; path: string } | null
  if (profil && user.profilPhoto) {
    const signed = await signPaths([profil.path])
    user.profilPhoto = { ...user.profilPhoto, uri: signed.get(profil.path) ?? null }
  }
  return user
}

export async function getUser(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const raw = data as Record<string, unknown>
  const user = rowToUser(raw)
  // hydrate photo URIs
  const pathsToSign: string[] = []
  const ktp = raw.ktp_photo as { id: string; path: string } | null
  const ktm = raw.ktm_photo as { id: string; path: string } | null
  const profil = raw.profil_photo as { id: string; path: string } | null
  if (ktp) pathsToSign.push(ktp.path)
  if (ktm) pathsToSign.push(ktm.path)
  if (profil) pathsToSign.push(profil.path)
  if (pathsToSign.length > 0) {
    const signed = await signPaths(pathsToSign)
    if (ktp && user.ktpPhoto) user.ktpPhoto = { ...user.ktpPhoto, uri: signed.get(ktp.path) ?? null }
    if (ktm && user.ktmPhoto) user.ktmPhoto = { ...user.ktmPhoto, uri: signed.get(ktm.path) ?? null }
    if (profil && user.profilPhoto) user.profilPhoto = { ...user.profilPhoto, uri: signed.get(profil.path) ?? null }
  }
  return user
}

export async function createUser(
  input: CreateUserInput,
): Promise<{ user: User; failedPhotoSlots: string[] }> {
  const { data, error } = await supabase
    .from("users")
    .insert({
      name: input.name,
      nickname: input.nickname,
      phone: input.phone,
      is_mahasiswa: input.isMahasiswa,
      alamat: input.alamat,
      kontak_darurat: input.kontakDarurat,
      notes: input.notes,
      verification_status: "BELUM_DIVERIFIKASI",
    })
    .select("*")
    .single()
  if (error) throw error
  const userId = (data as Record<string, unknown>).id as string
  // Best-effort upload each photo slot — never throw on photo failure
  const photoFailures: string[] = []
  const photoUpdates: Record<string, unknown> = {}
  for (const [col, uiSlot, photoInput] of [
    ["ktp_photo",    "ktpPhoto",    input.ktpPhoto],
    ["ktm_photo",    "ktmPhoto",    input.ktmPhoto],
    ["profil_photo", "profilPhoto", input.profilPhoto],
  ] as [string, string, PhotoInput | undefined][]) {
    if (!photoInput || photoInput.kind !== "new") continue
    try {
      const ext = extFromMime(photoInput.mimeType)
      const path = buildUserPhotoPath(userId, col.replace("_photo", "") as UserPhotoSlot, ext)
      await uploadPhoto(photoInput.uri, path, photoInput.mimeType ?? "image/jpeg")
      photoUpdates[col] = { id: uuidv4(), path }
    } catch {
      photoFailures.push(uiSlot)
    }
  }
  // if any photos succeeded, update the row; capture failures per slot
  if (Object.keys(photoUpdates).length > 0) {
    const colToUiSlot: Record<string, string> = {
      ktp_photo: "ktpPhoto", ktm_photo: "ktmPhoto", profil_photo: "profilPhoto",
    }
    const { error: updateError } = await supabase
      .from("users")
      .update(photoUpdates)
      .eq("id", userId)
    if (updateError) {
      for (const col of Object.keys(photoUpdates)) photoFailures.push(colToUiSlot[col] ?? col)
    }
  }
  // re-fetch the full user with hydrated photo URIs
  const user = await getUser(userId)
  if (!user) throw new Error(`User ${userId} not found after createUser`)
  return { user, failedPhotoSlots: photoFailures }
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const colUpdates: Record<string, unknown> = {
    name: input.name,
    nickname: input.nickname,
    phone: input.phone,
    is_mahasiswa: input.isMahasiswa,
    alamat: input.alamat,
    kontak_darurat: input.kontakDarurat,
    notes: input.notes,
  }
  for (const [col, photoInput, slot] of [
    ["ktp_photo", input.ktpPhoto, "ktp"],
    ["ktm_photo", input.ktmPhoto, "ktm"],
    ["profil_photo", input.profilPhoto, "profil"],
  ] as [string, PhotoInput | undefined, string][]) {
    if (!photoInput) continue // keep — don't include in update
    if (photoInput.kind === "remove") { colUpdates[col] = null; continue }
    if (photoInput.kind === "new") {
      const ext = extFromMime(photoInput.mimeType)
      const path = buildUserPhotoPath(id, slot as UserPhotoSlot, ext)
      await uploadPhoto(photoInput.uri, path, photoInput.mimeType ?? "image/jpeg")
      colUpdates[col] = { id: uuidv4(), path }
    }
    // "keep" → don't include col in updates (handled by the `!photoInput` guard above)
  }
  const { error } = await supabase.from("users").update(colUpdates).eq("id", id)
  if (error) throw error
  // re-fetch to return a fully hydrated User with signed URIs
  const user = await getUser(id)
  if (!user) throw new Error(`User ${id} not found after updateUser`)
  return user
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export async function getVehicleSummaries(): Promise<VehicleSummary[]> {
  const { data, error } = await supabase
    .from("v_vehicle_summaries")
    .select("*")
    .order("plate", { ascending: true })
  if (error) throw error
  const summaries = (data as Record<string, unknown>[]).map(rowToVehicleSummary)
  // Available vehicles first, then sort by plate within each group
  return summaries.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1
    return a.plate.localeCompare(b.plate, "id")
  })
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  return data ? rowToVehicle(data as Record<string, unknown>) : null
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc("rpc_get_dashboard_summary")
  if (error) throw error
  const d = data as Record<string, unknown>
  return {
    activeRentalsCount: (d.activeRentalsCount as number) ?? 0,
    activeDebtAmount: (d.totalActiveDebt as number) ?? 0,
    activeDebtCustomerCount: (d.activeDebtCustomerCount as number) ?? 0,
    availableVehiclesCount: (d.vehiclesAvailable as number) ?? 0,
    totalVehiclesCount: (d.vehiclesTotal as number) ?? 0,
    verifiedUsersCount: (d.verifiedUsersCount as number) ?? 0,
    totalUsersCount: (d.totalUsers as number) ?? 0,
  }
}

// ─── Rentals ──────────────────────────────────────────────────────────────────

export async function getRentalsDueToday(): Promise<RentalDueToday[]> {
  const now = new Date()
  const { data, error } = await supabase
    .from("v_rentals_due_today")
    .select("*")
    .order("due_at", { ascending: true })
  if (error) throw error
  return (data as Record<string, unknown>[]).map((row) => {
    const dueAt = new Date(row.due_at as string)
    const status: ReturnStatus = dueAt < now ? "TERLAMBAT" : "BELUM_KEMBALI"
    return {
      rentalId: row.id as string,
      customerName: (row.user_name as string) ?? "",
      vehicleName: (row.vehicle_name as string) ?? "",
      vehiclePlate: (row.vehicle_plate as string) ?? "",
      dueAt,
      status,
    }
  })
}

export async function getRental(id: string): Promise<Rental | null> {
  const { data, error } = await supabase.from("v_rentals").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  if (!data) return null

  const raw = data as Record<string, unknown>
  const rental = rowToRental(raw)

  // Batch-sign kondisi photo paths. Paths live in the raw row; translator drops them.
  type RawPhoto = { id: string; path?: string }
  const keluarRaw = raw.kondisi_keluar as { photos?: RawPhoto[] } | null
  const kembaliRaw = raw.kondisi_kembali as { photos?: RawPhoto[] } | null
  const pathById = new Map<string, string>()
  for (const p of keluarRaw?.photos ?? []) if (p.path) pathById.set(p.id, p.path)
  for (const p of kembaliRaw?.photos ?? []) if (p.path) pathById.set(p.id, p.path)

  if (pathById.size > 0) {
    const urlMap = await signPaths([...pathById.values()])
    for (const photo of rental.kondisiKeluar.photos) {
      const path = pathById.get(photo.id)
      if (path) photo.uri = urlMap.get(path) ?? null
    }
    if (rental.kondisiKembali) {
      for (const photo of rental.kondisiKembali.photos) {
        const path = pathById.get(photo.id)
        if (path) photo.uri = urlMap.get(path) ?? null
      }
    }
  }

  return rental
}

async function uploadKondisiPhotos(
  rentalId: string,
  phase: RentalPhotoPhase,
  photos: { id: string; uri: string | null; mimeType?: string }[],
): Promise<{ id: string; path: string }[]> {
  const result: { id: string; path: string }[] = []
  for (const photo of photos) {
    if (!photo.uri) continue
    const mimeType = photo.mimeType ?? "image/jpeg"
    const path = buildRentalPhotoPath(rentalId, phase, extFromMime(mimeType))
    await uploadPhoto(photo.uri, path, mimeType)
    result.push({ id: photo.id, path })
  }
  return result
}

export async function addPayment(rentalId: string, input: Omit<Payment, "id">): Promise<Rental> {
  const { error } = await supabase.from("payments").insert({
    rental_id: rentalId,
    amount: input.amount,
    method: input.method,
    method_description: input.methodDescription,
    paid_at: input.paidAt.toISOString(),
    notes: input.notes,
  })
  if (error) throw error
  const rental = await getRental(rentalId)
  if (!rental) throw new Error(`Rental ${rentalId} not found after addPayment`)
  return rental
}

export async function closeRental(rentalId: string, input: CloseRentalInput): Promise<Rental> {
  // Upload kondisi-kembali photos BEFORE the RPC — same rationale as createRental.
  const kembaliPhotos = await uploadKondisiPhotos(
    rentalId,
    "kondisi-kembali",
    input.kondisiKembali.photos,
  )

  const { error } = await supabase.rpc("rpc_close_rental", {
    p_rental_id: rentalId,
    payload: {
      returnedAt: input.returnedAt.toISOString(),
      kondisiKembali: { ...input.kondisiKembali, photos: kembaliPhotos },
      subtotalSewa: input.subtotalSewa,
      extraFees: input.extraFees,
      discount: input.discount,
      notes: input.notes ?? "",
      newPayments: input.newPayments.map((p) => ({
        amount: p.amount,
        method: p.method,
        methodDescription: p.methodDescription,
        paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
        notes: p.notes,
      })),
    },
  })
  if (error) throw error
  const rental = await getRental(rentalId)
  if (!rental) throw new Error(`Rental ${rentalId} not found after closeRental`)
  return rental
}

export async function createRental(input: CreateRentalInput): Promise<Rental> {
  // Client mints the rental UUID so photo paths are known before the DB insert.
  const rentalId = uuidv4()

  // Upload kondisi-keluar photos BEFORE the RPC — if upload fails, no DB row exists,
  // so the screen can retry without duplicating the rental.
  const keluarPhotos = await uploadKondisiPhotos(
    rentalId,
    "kondisi-keluar",
    input.kondisiKeluar.photos,
  )

  const { error } = await supabase.rpc("rpc_create_rental", {
    payload: {
      id: rentalId,
      userId: input.userId,
      vehicleId: input.vehicleId,
      startAt: input.startAt.toISOString(),
      dueAt: input.dueAt.toISOString(),
      paketHari: input.paketHari,
      paketJam: input.paketJam,
      tarif: input.tarif,
      addOn: input.addOn,
      jaminan: input.jaminan,
      kondisiKeluar: { ...input.kondisiKeluar, photos: keluarPhotos },
      discount: input.discount,
      notes: input.notes ?? "",
      newPayments: input.payments.map((p) => ({
        amount: p.amount,
        method: p.method,
        methodDescription: p.methodDescription,
        paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
        notes: p.notes,
      })),
    },
  })
  if (error) throw error
  const rental = await getRental(rentalId)
  if (!rental) throw new Error(`Rental ${rentalId} not found after createRental`)
  return rental
}

// ─── New connectors (Phase 4) ─────────────────────────────────────────────────

export async function createManualHutang(input: {
  userId: string
  jumlahAwal: number
  notes?: string
}): Promise<Hutang> {
  const { data, error } = await supabase
    .from("hutang")
    .insert({
      user_id: input.userId,
      rental_id: null,
      jumlah_awal: input.jumlahAwal,
      notes: input.notes,
    })
    .select("*")
    .single()
  if (error) throw error
  // Newly created hutang has no payments yet — sisa = jumlah_awal
  return rowToHutang(data as Record<string, unknown>, input.jumlahAwal)
}

export async function softDeleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function softDeleteVehicle(id: string): Promise<void> {
  const { error } = await supabase
    .from("vehicles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

// ─── Hutang (Phase 5c) ────────────────────────────────────────────────────────

export async function getHutangs(activeOnly: boolean = true): Promise<HutangFull[]> {
  let q = supabase.from("v_hutang").select("*").order("created_at", { ascending: false })
  if (activeOnly) q = q.eq("status", "AKTIF")
  const { data, error } = await q
  if (error) throw error
  return (data as Record<string, unknown>[]).map(rowToHutangFull)
}

export async function getHutangFull(id: string): Promise<HutangFull | null> {
  const { data, error } = await supabase.from("v_hutang").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? rowToHutangFull(data as Record<string, unknown>) : null
}

export async function addHutangPayment(
  hutangId: string,
  input: Omit<Payment, "id">,
): Promise<HutangFull> {
  const { error } = await supabase.from("payments").insert({
    hutang_id: hutangId,
    rental_id: null,
    amount: input.amount,
    method: input.method,
    method_description: input.methodDescription,
    paid_at: input.paidAt.toISOString(),
    notes: input.notes,
  })
  if (error) throw error
  const h = await getHutangFull(hutangId)
  if (!h) throw new Error(`Hutang ${hutangId} not found after addHutangPayment`)
  return h
}

// ─── Rental list (Phase 5d) ───────────────────────────────────────────────────

export async function getRentals(): Promise<RentalListItem[]> {
  const { data, error } = await supabase
    .from("v_rental_list")
    .select("*")
    .order("start_at", { ascending: false })
    .limit(200)
  if (error) throw error
  return (data as Record<string, unknown>[]).map(rowToRentalListItem)
}
