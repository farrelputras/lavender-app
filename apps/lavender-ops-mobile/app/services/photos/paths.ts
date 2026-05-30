import { uuidv4 } from "@/utils/uuid"

export type UserPhotoSlot = "profil" | "ktp" | "ktm"
export type RentalPhotoPhase = "kondisi-keluar" | "kondisi-kembali"

export function extFromMime(mimeType?: string | null): string {
  if (!mimeType) return "jpg"
  if (mimeType.includes("png")) return "png"
  if (mimeType.includes("heic") || mimeType.includes("heif")) return "jpg" // normalize heic→jpg
  return "jpg"
}

export function buildUserPhotoPath(userId: string, slot: UserPhotoSlot, ext: string): string {
  return `users/${userId}/${slot}/${uuidv4()}.${ext}`
}

export function buildRentalPhotoPath(rentalId: string, phase: RentalPhotoPhase, ext: string): string {
  return `rentals/${rentalId}/${phase}/${uuidv4()}.${ext}`
}
