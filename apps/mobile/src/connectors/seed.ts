import { User, Vehicle, Rental, Hutang } from './types'

/**
 * SEED DATA: In-memory dataset for LAVENDER demo
 *
 * The "due today" rentals (indices 0–2) have dueAt times anchored to new Date()
 * at module load time. This ensures the demo is always fresh regardless of when it runs.
 */

// Module load time — captures now() once, used for all "due today" computations
const now = new Date()

// Due-today reference times
const dueIn2h = new Date(now.getTime() + 2 * 60 * 60 * 1000) // belumKembali
const dueIn5h = new Date(now.getTime() + 5 * 60 * 60 * 1000) // belumKembali
const overdueBy3h = new Date(now.getTime() - 3 * 60 * 60 * 1000) // terlambat

// ===== USERS =====

export const users: User[] = [
  { id: 'user-001', name: 'Siti Nurhaliza', nickname: 'Siti',     phone: '+62812345001', verifiedAt: new Date('2026-05-15') },
  { id: 'user-002', name: 'Budi Santoso',   nickname: 'Budi',     phone: '+62812345002', verifiedAt: new Date('2026-05-14') },
  { id: 'user-003', name: 'Dewi Lestari',   nickname: 'Dewi',     phone: '+62812345003', verifiedAt: new Date('2026-05-10') },
  { id: 'user-004', name: 'Ahmad Wijaya',   nickname: 'Ahmad',    phone: '+62812345004', verifiedAt: new Date('2026-05-18') },
  { id: 'user-005', name: 'Ratna Kumala',   nickname: 'Ratna',    phone: '+62812345005', verifiedAt: new Date('2026-05-12') },
  { id: 'user-006', name: 'Endra Kusuma',   nickname: null,       phone: '+62812345006', verifiedAt: null                  },
  { id: 'user-007', name: 'Titi Widodo',    nickname: 'Titi',     phone: '+62812345007', verifiedAt: new Date('2026-05-20') },
  { id: 'user-008', name: 'Rudi Hermawan',  nickname: 'Rudi',     phone: '+62812345008', verifiedAt: new Date('2026-05-13') },
  { id: 'user-009', name: 'Lina Murtini',   nickname: 'Lina',     phone: '+62812345009', verifiedAt: new Date('2026-05-16') },
  { id: 'user-010', name: 'Sutrisno Aji',   nickname: 'Sutrisno', phone: '+62812345010', verifiedAt: new Date('2026-05-11') },
]

// ===== VEHICLES =====

export const vehicles: Vehicle[] = [
  {
    id: 'veh-001',
    name: 'Honda Beat',
    plate: 'N 2314 ABB',
    rate6h: 25000,
    rate12h: 35000,
    rate24h: 50000,
    available: true,
  },
  {
    id: 'veh-002',
    name: 'Honda Beat',
    plate: 'N 2435 ABB',
    rate6h: 25000,
    rate12h: 35000,
    rate24h: 50000,
    available: false, // Currently rented (rental-001)
  },
  {
    id: 'veh-003',
    name: 'Honda Beat',
    plate: 'N 2625 CQ',
    rate6h: 25000,
    rate12h: 35000,
    rate24h: 50000,
    available: true,
  },
  {
    id: 'veh-004',
    name: 'Honda Beat Street',
    plate: 'N 2680 ACM',
    rate6h: 30000,
    rate12h: 40000,
    rate24h: 60000,
    available: false, // Currently rented (rental-002)
  },
  {
    id: 'veh-005',
    name: 'Honda Beat',
    plate: 'N 2867 TAM',
    rate6h: 25000,
    rate12h: 35000,
    rate24h: 50000,
    available: true,
  },
  {
    id: 'veh-006',
    name: 'Yamaha Mio',
    plate: 'B 1239 ABC',
    rate6h: 32000,
    rate12h: 52000,
    rate24h: 82000,
    available: true,
  },
  {
    id: 'veh-007',
    name: 'Honda PCX',
    plate: 'B 1240 ABC',
    rate6h: 55000,
    rate12h: 85000,
    rate24h: 140000,
    available: true,
  },
  {
    id: 'veh-008',
    name: 'Honda ADV',
    plate: 'B 1241 ABC',
    rate6h: 60000,
    rate12h: 95000,
    rate24h: 150000,
    available: true,
  },
  {
    id: 'veh-009',
    name: 'Kawasaki W175',
    plate: 'B 1242 ABC',
    rate6h: 48000,
    rate12h: 78000,
    rate24h: 125000,
    available: true,
  },
  {
    id: 'veh-010',
    name: 'Yamaha FreeGo',
    plate: 'B 1243 ABC',
    rate6h: 38000,
    rate12h: 62000,
    rate24h: 98000,
    available: true,
  },
  {
    id: 'veh-011',
    name: 'Vespa S',
    plate: 'B 1244 ABC',
    rate6h: 65000,
    rate12h: 105000,
    rate24h: 160000,
    available: false, // Currently rented (rental-003)
  },
  {
    id: 'veh-012',
    name: 'Suzuki Burgman',
    plate: 'B 1245 ABC',
    rate6h: 52000,
    rate12h: 82000,
    rate24h: 135000,
    available: true,
  },
]

// ===== RENTALS =====

export const rentals: Rental[] = [
  // ===== 3 DUE TODAY (anchored to now) =====

  // Rental 1: Due in 2 hours (belumKembali)
  {
    id: 'rental-001',
    userId: 'user-001',
    vehicleId: 'veh-002', // Honda Vario
    startAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // Started 4 hours ago
    dueAt: dueIn2h,
    returnedAt: null,
    status: 'active',
    totalBill: 65000,
    totalPaid: 65000,
  },

  // Rental 2: Due in 5 hours (belumKembali)
  {
    id: 'rental-002',
    userId: 'user-002',
    vehicleId: 'veh-004', // Yamaha NMAX
    startAt: new Date(now.getTime() - 7 * 60 * 60 * 1000), // Started 7 hours ago
    dueAt: dueIn5h,
    returnedAt: null,
    status: 'active',
    totalBill: 75000,
    totalPaid: 40000, // Partial payment, will create debt on return
  },

  // Rental 3: Overdue by 3 hours (terlambat)
  {
    id: 'rental-003',
    userId: 'user-003',
    vehicleId: 'veh-011', // Vespa S
    startAt: new Date(now.getTime() - 27 * 60 * 60 * 1000), // Started 27 hours ago
    dueAt: overdueBy3h,
    returnedAt: null,
    status: 'active',
    totalBill: 105000,
    totalPaid: 105000,
  },

  // ===== 7 HISTORICAL/FUTURE RENTALS =====

  // Rental 4: Completed 2 days ago (clean closure, no debt)
  {
    id: 'rental-004',
    userId: 'user-004',
    vehicleId: 'veh-003',
    startAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    dueAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    returnedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    status: 'completed',
    totalBill: 85000,
    totalPaid: 85000,
  },

  // Rental 5: Completed 1 day ago (partial payment → hutang-001 seeded below)
  {
    id: 'rental-005',
    userId: 'user-005',
    vehicleId: 'veh-005',
    startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    dueAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    returnedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    status: 'completed',
    totalBill: 300000,
    totalPaid: 50000,
  },

  // Rental 6: Due tomorrow
  {
    id: 'rental-006',
    userId: 'user-006',
    vehicleId: 'veh-006',
    startAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
    dueAt: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours from now
    returnedAt: null,
    status: 'active',
    totalBill: 52000,
    totalPaid: 52000,
  },

  // Rental 7: Due in 3 days
  {
    id: 'rental-007',
    userId: 'user-007',
    vehicleId: 'veh-007',
    startAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
    dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    returnedAt: null,
    status: 'active',
    totalBill: 85000,
    totalPaid: 85000,
  },

  // Rental 8: Due in 1 day
  {
    id: 'rental-008',
    userId: 'user-008',
    vehicleId: 'veh-008',
    startAt: new Date(now.getTime() - 18 * 60 * 60 * 1000), // 18 hours ago
    dueAt: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hours from now (but not "today" in the 2h-5h window)
    returnedAt: null,
    status: 'active',
    totalBill: 95000,
    totalPaid: 95000,
  },

  // Rental 9: Due in 2 days
  {
    id: 'rental-009',
    userId: 'user-009',
    vehicleId: 'veh-009',
    startAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
    dueAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    returnedAt: null,
    status: 'active',
    totalBill: 78000,
    totalPaid: 40000, // Partial payment
  },

  // Rental 10: Due in 4 days
  {
    id: 'rental-010',
    userId: 'user-010',
    vehicleId: 'veh-010',
    startAt: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 8 hours ago
    dueAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    returnedAt: null,
    status: 'active',
    totalBill: 62000,
    totalPaid: 62000,
  },
]

// ===== HUTANG =====

export const hutang: Hutang[] = [
  {
    id: 'hutang-001',
    rentalId: 'rental-005',
    userId: 'user-005',
    amount: 250_000,
    createdAt: new Date('2026-05-22'),
  },
]
