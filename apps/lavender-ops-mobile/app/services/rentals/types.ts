export type RentalStatus = "active" | "completed" | "cancelled"

export type ReturnStatus = "belumKembali" | "terlambat"

export type VehicleCategory = "motor" | "mobil"

export type PaymentMethod = "cash" | "transfer" | "qris" | "lainnya"

export type JaminanItem = "ktp" | "ktm" | "lainnya"

export interface User {
  id: string
  name: string
  nickname: string | null
  phone: string
  verifiedAt: Date | null
}

export interface Hutang {
  id: string
  rentalId: string
  userId: string
  amount: number
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
  photos: { id: string; uri: string | null }[]
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
  isVerified: boolean
  activeRentalsCount: number
  debtAmount: number
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
