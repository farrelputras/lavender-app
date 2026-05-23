import { DashboardSummary, RentalDueToday, ReturnStatus, UserSummary } from './types'
import { users, vehicles, rentals, hutang } from './seed'

export async function getUserSummaries(): Promise<UserSummary[]> {
  return users
    .map<UserSummary>((u) => ({
      id: u.id,
      name: u.name,
      nickname: u.nickname,
      isVerified: u.verifiedAt !== null,
      activeRentalsCount: rentals.filter((r) => r.userId === u.id && r.status === 'active').length,
      debtAmount: hutang.filter((h) => h.userId === u.id).reduce((sum, h) => sum + h.amount, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
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
