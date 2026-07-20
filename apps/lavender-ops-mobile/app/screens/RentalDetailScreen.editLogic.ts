// Pure logic for the v1.0.3 (PRD-1) inline edit affordances on RentalDetailScreen.
// Kept out of the screen component so the permission matrix, the last-photo rule, and the
// wholesale kondisiKeluar-patch assembly are unit-testable without mounting the screen.
//
// Signatures here are NOT part of the locked connector contract (docs/02 §3) — only
// `updateRental` / `UpdateRentalInput` / `KondisiPhotoEdit` (from `@/services/rentals`) are.
import type { KondisiPhotoEdit } from "@/services/rentals"
import type { KondisiSnapshot, RentalStatus } from "@/services/rentals/types"

/** Kondisi Keluar Edit is offered only while the rental is ACTIVE (mirrors rpc_update_rental's gate). */
export function canEditKondisiKeluar(status: RentalStatus): boolean {
  return status === "ACTIVE"
}

/** Catatan Edit is offered on ACTIVE to ops|admin, and on COMPLETED to admin only. Never CANCELLED. */
export function canEditNotes(status: RentalStatus, isAdmin: boolean): boolean {
  return status === "ACTIVE" || (status === "COMPLETED" && isAdmin)
}

/**
 * D-1 (Farrel, 2026-07-20) — mirrors rpc_update_rental's server-side rule exactly:
 * reject when the RESULTING photo set would be empty AND the EXISTING (pre-edit) set was
 * non-empty AND the caller is not admin. A rental that already had zero exit photos may still
 * save an empty set (a legitimate fuel/km-only correction must not be blocked).
 */
export function isLastPhotoRemovalBlocked(
  resultingCount: number,
  originalWasNonEmpty: boolean,
  isAdmin: boolean,
): boolean {
  return resultingCount === 0 && originalWasNonEmpty && !isAdmin
}

/** km is optional; blank/whitespace clears it. Non-numeric input is treated as cleared, never NaN/0. */
export function parseKmInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const n = Number.parseInt(trimmed, 10)
  return Number.isNaN(n) ? null : n
}

/** Local edit-session photo item. `new` always carries a real uri (fresh capture); `keep` mirrors the rental's current photo, which may have a null (unsigned) uri. */
export type EditPhotoItem =
  | { id: string; kind: "keep"; uri: string | null; mimeType?: string }
  | { id: string; kind: "new"; uri: string; mimeType?: string }

/** Seeds edit state from the rental's current exit photos when entering edit mode. */
export function rentalPhotosToEditState(
  photos: KondisiSnapshot["photos"],
): EditPhotoItem[] {
  return photos.map((p) => ({
    id: p.id,
    kind: "keep" as const,
    uri: p.uri,
    mimeType: p.mimeType,
  }))
}

/** Assembles the `photos` field of the UpdateRentalInput patch from local edit state. */
export function editPhotosToPatch(photos: EditPhotoItem[]): KondisiPhotoEdit[] {
  return photos.map((p) =>
    p.kind === "keep"
      ? { kind: "keep" as const, id: p.id }
      : { kind: "new" as const, uri: p.uri, mimeType: p.mimeType },
  )
}
