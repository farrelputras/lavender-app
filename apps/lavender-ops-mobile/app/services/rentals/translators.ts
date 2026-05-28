import type {
  Rental,
  UserSummary,
  Vehicle,
  VehicleSummary,
  Hutang,
  Payment,
  KondisiSnapshot,
  RentalAddOn,
  Jaminan,
  RentalStatus,
  VehicleCategory,
  PaymentMethod,
  VerificationStatus,
} from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toKondisi(raw: unknown): KondisiSnapshot {
  if (!raw || typeof raw !== "object") {
    return { bensinKotak: 4, km: null, photos: [] }
  }
  const r = raw as Record<string, unknown>
  return {
    bensinKotak: (r.bensinKotak as number) ?? 4,
    km: (r.km as number | null) ?? null,
    // Phase 4: photos are stored as {id, path} in DB but UI expects {id, uri}.
    // uri is always null until Phase 6 (photo upload) generates signed URLs.
    photos: ((r.photos as unknown[]) ?? []).map((p: unknown) => {
      const photo = p as Record<string, unknown>
      return { id: photo.id as string, uri: null as string | null }
    }),
  }
}

function toPayment(p: Record<string, unknown>): Payment {
  return {
    id: p.id as string,
    amount: p.amount as number,
    method: p.method as PaymentMethod,
    methodDescription: p.methodDescription as string | undefined,
    paidAt: new Date(p.paidAt as string),
    notes: p.notes as string | undefined,
  }
}

// ─── Row translators (snake_case DB → camelCase UI types) ─────────────────────

export function rowToRental(row: Record<string, unknown>): Rental {
  const payments = ((row.payments as unknown[]) ?? []).map((p) =>
    toPayment(p as Record<string, unknown>),
  )
  return {
    id: row.id as string,
    userId: row.user_id as string,
    vehicleId: row.vehicle_id as string,
    startAt: new Date(row.start_at as string),
    dueAt: new Date(row.due_at as string),
    returnedAt: row.returned_at ? new Date(row.returned_at as string) : null,
    status: row.status as RentalStatus,
    paketHari: row.paket_hari as number,
    paketJam: row.paket_jam as 0 | 6 | 12,
    tarif: row.tarif as number,
    addOn: row.add_on as RentalAddOn,
    discount: row.discount as number,
    totalBill: row.total_bill as number,
    totalPaid: row.total_paid as number,
    payments,
    jaminan: row.jaminan as Jaminan,
    kondisiKeluar: toKondisi(row.kondisi_keluar),
    kondisiKembali: row.kondisi_kembali ? toKondisi(row.kondisi_kembali) : null,
    notes: (row.notes as string) ?? "",
  }
}

export function rowToUserSummary(row: Record<string, unknown>): UserSummary {
  return {
    id: row.id as string,
    name: row.name as string,
    nickname: (row.nickname as string | null) ?? null,
    phone: row.phone as string,
    isMahasiswa: row.is_mahasiswa as boolean,
    isVerified: row.verification_status === "TERVERIFIKASI_PDDIKTI",
    verificationStatus: row.verification_status as VerificationStatus,
    namaPddikti: (row.nama_pddikti as string | null) ?? null,
    tahunMasuk: (row.tahun_masuk as number | null) ?? null,
    universitas: (row.universitas as string | null) ?? null,
    prodi: (row.prodi as string | null) ?? null,
    activeRentalsCount: (row.active_rentals_count as number) ?? 0,
    debtAmount: (row.debt_amount as number) ?? 0,
  }
}

export function rowToVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id: row.id as string,
    name: row.name as string,
    plate: row.plate as string,
    category: row.category as VehicleCategory,
    rate6h: row.rate_6h as number,
    rate12h: row.rate_12h as number,
    rate24h: row.rate_24h as number,
    available: row.status === "TERSEDIA",
  }
}

export function rowToVehicleSummary(row: Record<string, unknown>): VehicleSummary {
  return {
    id: row.id as string,
    name: row.name as string,
    plate: row.plate as string,
    category: row.category as VehicleCategory,
    rate24h: row.rate_24h as number,
    available: (row.available as boolean | undefined) ?? row.status === "TERSEDIA",
  }
}

export function rowToHutang(row: Record<string, unknown>, sisa: number): Hutang {
  return {
    id: row.id as string,
    rentalId: (row.rental_id as string | null) ?? null,
    userId: row.user_id as string,
    amount: sisa,
    createdAt: new Date(row.created_at as string),
  }
}
