const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

/**
 * Format date as "Sabtu, 16 Mei 2026" (Indonesian locale, hardcoded to avoid Hermes Intl issues)
 */
export function formatHeaderDate(date: Date): string {
  const dayName = DAYS[date.getDay()]
  const dateNum = date.getDate()
  const monthName = MONTHS[date.getMonth()]
  const year = date.getFullYear()

  return `${dayName}, ${dateNum} ${monthName} ${year}`
}

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${hours}:${minutes}`
}

export function formatRupiah(amount: number): string {
  const integerAmount = Math.floor(amount)
  const formatted = integerAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  return `Rp ${formatted}`
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

export function formatPhoneId(phone: string): string {
  let digits: string
  if (phone.startsWith("+62")) {
    digits = "0" + phone.slice(3)
  } else if (phone.startsWith("0")) {
    digits = phone
  } else {
    return phone
  }
  if (digits.length <= 4) return digits
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`
}

export function toWaNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "")
  if (digits.startsWith("62")) return digits
  if (digits.startsWith("0")) return "62" + digits.slice(1)
  return digits
}
