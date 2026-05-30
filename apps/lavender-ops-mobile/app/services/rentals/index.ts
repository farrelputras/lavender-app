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
  return (data as Record<string, unknown>[]).map(rowToUserSummary)
}

export async function getUserSummary(id: string): Promise<UserSummary | null> {
  const { data, error } = await supabase
    .from("v_user_summaries")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data ? rowToUserSummary(data as Record<string, unknown>) : null
}

export async function getUser(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  return data ? rowToUser(data as Record<string, unknown>) : null
}

export async function createUser(input: CreateUserInput): Promise<User> {
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
  return rowToUser(data as Record<string, unknown>)
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .update({
      name: input.name,
      nickname: input.nickname,
      phone: input.phone,
      is_mahasiswa: input.isMahasiswa,
      alamat: input.alamat,
      kontak_darurat: input.kontakDarurat,
      notes: input.notes,
    })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return rowToUser(data as Record<string, unknown>)
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
  return data ? rowToRental(data as Record<string, unknown>) : null
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
  const { error } = await supabase.rpc("rpc_close_rental", {
    p_rental_id: rentalId,
    payload: {
      returnedAt: input.returnedAt.toISOString(),
      kondisiKembali: { ...input.kondisiKembali, photos: [] }, // Phase 6: wire photo paths here
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
  // Phase 6 will upload photos to rentals/{rentalId}/kondisi-keluar/{uuid}.jpg
  // before calling this RPC. In Phase 4, photos are always [].
  // crypto.randomUUID() requires Hermes ≥ 0.71 (RN 0.83 ships it). Verify on
  // first dev-client build in Phase 5a: console.log(crypto.randomUUID())
  const rentalId = crypto.randomUUID()

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
      kondisiKeluar: { ...input.kondisiKeluar, photos: [] }, // Phase 6: real photo paths
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
