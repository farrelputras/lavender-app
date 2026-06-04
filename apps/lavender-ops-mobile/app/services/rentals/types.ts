export type RentalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED"

export type ReturnStatus = "BELUM_KEMBALI" | "TERLAMBAT"

export type VehicleCategory = "MOTOR" | "MOBIL"

export type PaymentMethod = "CASH" | "TRANSFER" | "QRIS" | "LAINNYA"

export type JaminanItem = "KTP" | "KTM" | "LAINNYA"

export type VerificationStatus = "BELUM_DIVERIFIKASI" | "TERVERIFIKASI_PDDIKTI" | "VERIFIKASI_GAGAL"

export interface User {
  id: string
  name: string
  nickname: string | null
  phone: string
  isMahasiswa: boolean
  verifiedAt: Date | null
  verificationStatus: VerificationStatus
  namaPddikti: string | null
  tahunMasuk: number | null
  universitas: string | null
  prodi: string | null
  alamat: string | null
  kontakDarurat: string | null
  notes: string | null
  ktpPhoto: { id: string; uri: string | null } | null
  ktmPhoto: { id: string; uri: string | null } | null
  profilPhoto: { id: string; uri: string | null } | null
}

export type PhotoInput =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "new"; uri: string; mimeType?: string }

export interface CreateUserInput {
  name: string
  nickname: string | null
  phone: string
  isMahasiswa: boolean
  alamat: string | null
  kontakDarurat: string | null
  notes: string | null
  profilPhoto?: PhotoInput
  ktpPhoto?: PhotoInput
  ktmPhoto?: PhotoInput
}

export type UpdateUserInput = CreateUserInput

export interface Hutang {
  id: string
  rentalId: string | null // null for manual hutang (no associated rental)
  userId: string
  amount: number // sisa (remaining balance) at query time
  createdAt: Date
}

export interface Payment {
  id: string
  amount: number
  method: PaymentMethod
  methodDescription?: string
  paidAt: Date
  notes?: string
}

export interface RentalAddOn {
  description: string
  amount: number
}

export interface KondisiSnapshot {
  bensinKotak: number
  km: number | null
  photos: { id: string; uri: string | null; mimeType?: string }[]
}

export interface Jaminan {
  items: JaminanItem[]
  lainnyaDescription?: string
}

export interface UserSummary {
  id: string
  name: string
  nickname: string | null
  phone: string
  // Verification (Phase 4 widening — always BELUM_DIVERIFIKASI until v1.1 PDDikti)
  isMahasiswa: boolean
  isVerified: boolean // true when verificationStatus === 'TERVERIFIKASI_PDDIKTI'
  verificationStatus: VerificationStatus
  namaPddikti: string | null // populated by v1.1 PDDikti verify
  tahunMasuk: number | null
  universitas: string | null
  prodi: string | null
  // Computed aggregates
  activeRentalsCount: number
  debtAmount: number
  profilPhoto: { id: string; uri: string | null } | null
}

export interface Vehicle {
  id: string
  name: string
  plate: string
  category: VehicleCategory
  rate6h: number
  rate12h: number
  rate24h: number
  available: boolean
  gps: string | null
  imei: string | null
}

export interface VehicleSummary {
  id: string
  name: string
  plate: string
  category: VehicleCategory
  rate24h: number
  available: boolean
}

export interface Rental {
  id: string
  userId: string
  vehicleId: string
  startAt: Date
  dueAt: Date
  returnedAt: Date | null
  status: RentalStatus
  // Financials
  tarif: number
  addOn: RentalAddOn
  discount: number
  totalBill: number
  totalPaid: number
  payments: Payment[]
  // Handover
  jaminan: Jaminan
  kondisiKeluar: KondisiSnapshot
  kondisiKembali: KondisiSnapshot | null
  // Meta
  notes: string
  tujuan: string
  paketHari: number
  paketJam: 0 | 6 | 12
}

export interface CreateRentalInput {
  userId: string
  vehicleId: string
  startAt: Date
  dueAt: Date
  paketHari: number
  paketJam: 0 | 6 | 12
  tarif: number
  addOn: RentalAddOn
  discount: number
  jaminan: Jaminan
  kondisiKeluar: KondisiSnapshot
  payments: Omit<Payment, "id">[]
  notes?: string
  tujuan: string
}

export interface DashboardSummary {
  activeRentalsCount: number
  activeDebtAmount: number
  activeDebtCustomerCount: number
  availableVehiclesCount: number
  totalVehiclesCount: number
  verifiedUsersCount: number
  totalUsersCount: number
}

export interface RentalDueToday {
  rentalId: string
  customerName: string
  vehicleName: string
  vehiclePlate: string
  dueAt: Date
  status: ReturnStatus
}

export type HutangStatus = "AKTIF" | "LUNAS"

export interface HutangFull {
  id: string
  userId: string
  userName: string
  rentalId: string | null
  jumlahAwal: number
  sisa: number
  status: HutangStatus
  notes: string | null
  createdAt: Date
  payments: Payment[]
}

export interface RentalListItem {
  id: string
  userName: string
  vehicleName: string
  vehiclePlate: string
  startAt: Date
  dueAt: Date
  returnedAt: Date | null
  status: RentalStatus
  totalBill: number
  totalPaid: number
}
