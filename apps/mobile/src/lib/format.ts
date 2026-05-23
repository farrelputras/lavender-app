const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format date as "Sabtu, 16 Mei 2026" (Indonesian locale, hardcoded to avoid Hermes Intl issues)
 */
export function formatHeaderDate(date: Date): string {
  const dayName = DAYS[date.getDay()];
  const dateNum = date.getDate();
  const monthName = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName}, ${dateNum} ${monthName} ${year}`;
}

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

export function formatRupiah(amount: number): string {
  const integerAmount = Math.floor(amount);
  const formatted = integerAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `Rp ${formatted}`;
}
