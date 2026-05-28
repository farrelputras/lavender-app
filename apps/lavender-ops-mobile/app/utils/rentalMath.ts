import { Payment, Rental, Vehicle } from "../services/rentals/types"

/**
 * Compose the default tarif from a vehicle's rates and the selected duration.
 *
 * Composition rule (docs/02 §6):
 *   0H+6J  → rate6h
 *   0H+12J → rate12h
 *   1H+0J  → rate24h
 *   1H+6J  → rate24h + rate6h
 *   1H+12J → rate24h + rate12h
 *   2H+0J  → 2 × rate24h   … and so on
 */
export function composeTarif(vehicle: Vehicle, hari: number, jam: 0 | 6 | 12): number {
  const dailyPart = hari * vehicle.rate24h
  const hourPart = jam === 6 ? vehicle.rate6h : jam === 12 ? vehicle.rate12h : 0
  return dailyPart + hourPart
}

export function addDuration(start: Date, hari: number, jam: number): Date {
  return new Date(start.getTime() + (hari * 24 + jam) * 60 * 60 * 1000)
}

/**
 * Given a start and an end date, infer the closest (hari, jam) pair.
 * Snap jam to the nearest of 0 / 6 / 12 based on total hours mod 24.
 */
export function durationToPaket(start: Date, end: Date): { hari: number; jam: 0 | 6 | 12 } {
  const totalHours = Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000)))
  const hari = Math.floor(totalHours / 24)
  const remainingHours = totalHours % 24

  let jam: 0 | 6 | 12
  if (remainingHours < 3) {
    jam = 0
  } else if (remainingHours < 9) {
    jam = 6
  } else {
    jam = 12
  }

  return { hari, jam }
}

export function sumPayments(payments: Payment[]): number {
  return payments.reduce((s, p) => s + p.amount, 0)
}

export function sisa(totalBill: number, payments: Payment[]): number {
  return Math.max(0, totalBill - sumPayments(payments))
}

export function isPaketValid(hari: number, jam: 0 | 6 | 12): boolean {
  return hari > 0 || jam >= 6
}

export function computeTotalBill(tarif: number, addOnAmount: number, discount: number): number {
  return Math.max(0, tarif + addOnAmount - discount)
}

export function formatPaket(hari: number, jam: 0 | 6 | 12): string {
  const totalJam = hari * 24 + jam
  const parts: string[] = []
  if (hari > 0) parts.push(`${hari} Hari`)
  if (jam > 0) parts.push(`${jam} Jam`)
  if (parts.length === 0) parts.push("0 Jam")
  return `${parts.join(" ")} (${totalJam} jam)`
}

export function isOverdue(rental: Pick<Rental, "dueAt" | "status">, now?: Date): boolean {
  return rental.status === "ACTIVE" && rental.dueAt.getTime() < (now ?? new Date()).getTime()
}

export function hoursLate(dueAt: Date, now?: Date): number {
  return Math.max(0, Math.ceil(((now ?? new Date()).getTime() - dueAt.getTime()) / 3_600_000))
}

export function computeFuelAdjustment(
  bensinKeluar: number,
  bensinKembali: number,
  hargaPerKotak: number,
): { selisih: number; deltaRupiah: number; direction: "add" | "subtract" | "none" } {
  const selisih = bensinKembali - bensinKeluar
  const deltaRupiah = Math.abs(selisih) * hargaPerKotak
  const direction = selisih > 0 ? "subtract" : selisih < 0 ? "add" : "none"
  return { selisih, deltaRupiah, direction }
}

export function computeReturnTotal(
  subtotalSewa: number,
  extraFees: { amount: number }[],
  discount: number,
): number {
  const extras = extraFees.reduce((s, f) => s + (f.amount || 0), 0)
  return Math.max(0, subtotalSewa + extras - discount)
}
