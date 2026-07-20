import type { RentalStatus } from "@/services/rentals/types"

import {
  canEditKondisiKeluar,
  canEditNotes,
  isLastPhotoRemovalBlocked,
  parseKmInput,
  rentalPhotosToEditState,
  editPhotosToPatch,
} from "./RentalDetailScreen.editLogic"

describe("canEditKondisiKeluar", () => {
  it("is true only for ACTIVE", () => {
    expect(canEditKondisiKeluar("ACTIVE")).toBe(true)
    expect(canEditKondisiKeluar("COMPLETED")).toBe(false)
    expect(canEditKondisiKeluar("CANCELLED")).toBe(false)
  })
})

describe("canEditNotes", () => {
  const cases: [RentalStatus, boolean, boolean][] = [
    // status, isAdmin, expected
    ["ACTIVE", false, true],
    ["ACTIVE", true, true],
    ["COMPLETED", false, false],
    ["COMPLETED", true, true],
    ["CANCELLED", false, false],
    ["CANCELLED", true, false],
  ]

  it.each(cases)("status=%s isAdmin=%s -> %s", (status, isAdmin, expected) => {
    expect(canEditNotes(status, isAdmin)).toBe(expected)
  })
})

describe("isLastPhotoRemovalBlocked", () => {
  it("blocks ops from reducing a non-empty set to empty", () => {
    expect(isLastPhotoRemovalBlocked(0, true, false)).toBe(true)
  })

  it("allows admin to empty a non-empty set", () => {
    expect(isLastPhotoRemovalBlocked(0, true, true)).toBe(false)
  })

  it("does not block when the resulting set is still non-empty", () => {
    expect(isLastPhotoRemovalBlocked(1, true, false)).toBe(false)
  })

  it("edge case: a rental that ALREADY had zero photos is not blocked from saving an empty set (ops)", () => {
    expect(isLastPhotoRemovalBlocked(0, false, false)).toBe(false)
  })

  it("edge case: already-zero-photos, admin — also not blocked", () => {
    expect(isLastPhotoRemovalBlocked(0, false, true)).toBe(false)
  })
})

describe("parseKmInput", () => {
  it("returns null for an empty string", () => {
    expect(parseKmInput("")).toBeNull()
  })

  it("returns null for a whitespace-only string", () => {
    expect(parseKmInput("   ")).toBeNull()
  })

  it("parses a plain integer string", () => {
    expect(parseKmInput("12500")).toBe(12500)
  })

  it("trims surrounding whitespace", () => {
    expect(parseKmInput("  4200  ")).toBe(4200)
  })

  it("returns null for non-numeric input rather than throwing or coercing to 0", () => {
    expect(parseKmInput("abc")).toBeNull()
  })
})

describe("rentalPhotosToEditState", () => {
  it("maps existing rental photos to `keep` edit items, preserving id/uri/mimeType", () => {
    const result = rentalPhotosToEditState([
      { id: "p1", uri: "https://example.com/a.jpg", mimeType: "image/jpeg" },
      { id: "p2", uri: null },
    ])
    expect(result).toEqual([
      { id: "p1", kind: "keep", uri: "https://example.com/a.jpg", mimeType: "image/jpeg" },
      { id: "p2", kind: "keep", uri: null, mimeType: undefined },
    ])
  })

  it("returns an empty array for a rental with zero exit photos", () => {
    expect(rentalPhotosToEditState([])).toEqual([])
  })
})

describe("editPhotosToPatch", () => {
  it("maps `keep` items to {kind:'keep', id} and `new` items to {kind:'new', uri, mimeType}", () => {
    const result = editPhotosToPatch([
      { id: "p1", kind: "keep", uri: "https://example.com/a.jpg", mimeType: "image/jpeg" },
      { id: "local-2", kind: "new", uri: "file://local.jpg", mimeType: "image/jpeg" },
    ])
    expect(result).toEqual([
      { kind: "keep", id: "p1" },
      { kind: "new", uri: "file://local.jpg", mimeType: "image/jpeg" },
    ])
  })

  it("returns an empty array when there are no photos", () => {
    expect(editPhotosToPatch([])).toEqual([])
  })
})
