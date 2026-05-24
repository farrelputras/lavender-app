import { DashboardSummary, RentalDueToday, ReturnStatus, UserSummary, VehicleSummary, Vehicle, Rental, CreateRentalInput, Payment, KondisiSnapshot, Hutang } from './types'
import { users, vehicles, rentals, hutang } from './seed'
import { computeReturnTotal } from '../lib/rentalMath'

export interface CloseRentalInput {
  returnedAt: Date
  kondisiKembali: KondisiSnapshot
  subtotalSewa: number
  extraFees: { description: string; amount: number }[]
  discount: number
  notes?: string
  newPayments: Omit<Payment, 'id'>[]
}

function toUserSummary(u: typeof users[number]): UserSummary {
  return {
    id: u.id,
    name: u.name,
    nickname: u.nickname,
    phone: u.phone,
    isVerified: u.verifiedAt !== null,
    activeRentalsCount: rentals.filter((r) => r.userId === u.id && r.status === 'active').length,
    debtAmount: hutang.filter((h) => h.userId === u.id).reduce((sum, h) => sum + h.amount, 0),
  }
}

export async function getUserSummaries(): Promise<UserSummary[]> {
  return users
    .map(toUserSummary)
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
}

export async function getUserSummary(id: string): Promise<UserSummary | null> {
  const u = users.find((u) => u.id === id)
  return u ? toUserSummary(u) : null
}

export async function getVehicleSummaries(): Promise<VehicleSummary[]> {
  return vehicles
    .map<VehicleSummary>((v) => ({
      id: v.id,
      name: v.name,
      plate: v.plate,
      category: v.category,
      rate24h: v.rate24h,
      available: v.available,
    }))
    .sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1
      return a.plate.localeCompare(b.plate, 'id')
    })
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  return vehicles.find((v) => v.id === id) ?? null
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const activeRentals = rentals.filter((r) => r.status === 'active')
  const activeDebtRentals = activeRentals.filter((r) => r.totalPaid < r.totalBill)

  return {
    activeRentalsCount: activeRentals.length,
    activeDebtAmount: activeDebtRentals.reduce((sum, r) => sum + (r.totalBill - r.totalPaid), 0),
    activeDebtCustomerCount: activeDebtRentals.length,
    availableVehiclesCount: vehicles.filter((v) => v.available).length,
    totalVehiclesCount: vehicles.length,
    verifiedUsersCount: users.filter((u) => u.verifiedAt !== null).length,
    totalUsersCount: users.length,
  }
}

export async function getRentalsDueToday(): Promise<RentalDueToday[]> {
  const now = new Date()
  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth()
  const todayDate = now.getDate()

  return rentals
    .filter((r) => {
      if (r.status !== 'active') return false
      return (
        r.dueAt.getFullYear() === todayYear &&
        r.dueAt.getMonth() === todayMonth &&
        r.dueAt.getDate() === todayDate
      )
    })
    .map((r) => {
      const user = users.find((u) => u.id === r.userId)
      const vehicle = vehicles.find((v) => v.id === r.vehicleId)
      const status: ReturnStatus = r.dueAt < now ? 'terlambat' : 'belumKembali'
      return {
        rentalId: r.id,
        customerName: user?.name ?? '',
        vehicleName: vehicle?.name ?? '',
        vehiclePlate: vehicle?.plate ?? '',
        dueAt: r.dueAt,
        status,
      }
    })
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
}

export async function getRental(id: string): Promise<Rental | null> {
  return rentals.find((r) => r.id === id) ?? null
}

export async function addPayment(rentalId: string, input: Omit<Payment, 'id'>): Promise<Rental> {
  const rental = rentals.find((r) => r.id === rentalId)
  if (!rental) throw new Error(`Rental ${rentalId} not found`)
  const id = `pay-${rentalId}-${rental.payments.length}`
  rental.payments.push({ ...input, id })
  rental.totalPaid = rental.payments.reduce((s, p) => s + p.amount, 0)
  return { ...rental }
}

export async function closeRental(rentalId: string, input: CloseRentalInput): Promise<Rental> {
  const rental = rentals.find((r) => r.id === rentalId)
  if (!rental) throw new Error(`Rental ${rentalId} not found`)
  if (rental.status !== 'active') throw new Error(`Rental ${rentalId} is not active`)

  const ts = Date.now()

  const newPays: Payment[] = input.newPayments.map((p, i) => ({
    ...p,
    id: `pay-${ts}-close-${i}`,
  }))
  rental.payments.push(...newPays)
  rental.totalPaid = rental.payments.reduce((s, p) => s + p.amount, 0)

  rental.totalBill = computeReturnTotal(input.subtotalSewa, input.extraFees, input.discount)
  rental.returnedAt = input.returnedAt
  rental.kondisiKembali = input.kondisiKembali
  rental.status = 'completed'
  if (input.notes !== undefined) rental.notes = input.notes

  const vehicle = vehicles.find((v) => v.id === rental.vehicleId)
  if (vehicle) vehicle.available = true

  const sisa = Math.max(0, rental.totalBill - rental.totalPaid)
  if (sisa > 0) {
    const h: Hutang = {
      id: `hutang-${ts}`,
      rentalId: rental.id,
      userId: rental.userId,
      amount: sisa,
      createdAt: new Date(),
    }
    hutang.push(h)
  }

  return { ...rental }
}

export async function createRental(input: CreateRentalInput): Promise<Rental> {
  const ts = Date.now()

  const payments: Payment[] = input.payments.map((p, i) => ({
    ...p,
    id: `pay-${ts}-${i}`,
  }))

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const totalBill = Math.max(0, input.tarif + input.addOn.amount - input.discount)

  const rental: Rental = {
    id: `rental-${ts}`,
    userId: input.userId,
    vehicleId: input.vehicleId,
    startAt: input.startAt,
    dueAt: input.dueAt,
    returnedAt: null,
    status: 'active',
    paketHari: input.paketHari,
    paketJam: input.paketJam,
    tarif: input.tarif,
    addOn: input.addOn,
    discount: input.discount,
    totalBill,
    totalPaid,
    payments,
    jaminan: input.jaminan,
    kondisiKeluar: input.kondisiKeluar,
    kondisiKembali: null,
    notes: input.notes ?? '',
  }

  rentals.push(rental)

  // Mark vehicle as unavailable
  const vehicle = vehicles.find((v) => v.id === input.vehicleId)
  if (vehicle) vehicle.available = false

  return rental
}
