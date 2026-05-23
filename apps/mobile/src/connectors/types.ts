export type RentalStatus = 'active' | 'completed' | 'cancelled'

export type ReturnStatus = 'belumKembali' | 'terlambat'

export interface User {
  id: string
  name: string
  phone: string
  verifiedAt: Date | null
}

export interface Vehicle {
  id: string
  name: string
  plate: string
  rate6h: number
  rate12h: number
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
  totalBill: number
  totalPaid: number
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
