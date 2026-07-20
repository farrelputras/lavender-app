// PRD-1 AC-6 / BR-6: "No money value (tariff / total / payments / hutang) changes as a result of
// any edit." The authoritative, complete proof of BR-6 is server-side (rpc_update_rental only ever
// runs two UPDATEs — kondisi_keluar and notes — verified by docs/verification/v1-0-3-rpc-update-rental.sql
// §B/§F, currently PENDING the db push). This file proves the CLIENT half of the invariant: the
// `updateRental` connector never assembles a patch containing anything money-shaped, even when handed
// input that tries to smuggle one in (a caller bypassing the `UpdateRentalInput` type, e.g. from JS
// call sites or a future refactor that spreads more fields in by mistake).
//
// Mocking rule: the postgrest `error` is a plain object, never `new Error(...)` — n/a here, no
// failure path is exercised; this file only inspects what request body updateRental *sends*.

import { updateRental } from "./index"

const mockRpc = jest.fn()
const rentalRow = {
  id: "r1",
  user_id: "u1",
  vehicle_id: "v1",
  start_at: "2026-07-01T00:00:00Z",
  due_at: "2026-07-02T00:00:00Z",
  returned_at: null,
  status: "ACTIVE",
  paket_hari: 1,
  paket_jam: 0,
  tarif: 40000,
  add_on: { description: "", amount: 0 },
  discount: 0,
  total_bill: 40000,
  total_paid: 0,
  payments: [],
  jaminan: { items: [] },
  kondisi_keluar: { bensinKotak: 4, km: 1000, photos: [] },
  kondisi_kembali: null,
  notes: "",
  tujuan: "",
}

jest.mock("../supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: rentalRow, error: null }) }),
      }),
    }),
  },
}))

jest.mock("@/services/photos/storage", () => ({
  uploadPhoto: jest.fn(),
  signPaths: jest.fn().mockResolvedValue(new Map()),
  removePaths: jest.fn(),
}))

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ error: null })
})

// Every money-shaped key that must NEVER appear anywhere in the patch sent to rpc_update_rental,
// at any nesting level. Taken from Rental's financial fields (types.ts) plus the obvious aliases.
const FORBIDDEN_KEYS = [
  "tarif",
  "addOn",
  "add_on",
  "discount",
  "totalBill",
  "total_bill",
  "totalPaid",
  "total_paid",
  "payments",
  "hutang",
  "subtotalSewa",
  "subtotal_sewa",
  "extraFees",
]

function assertNoForbiddenKeys(value: unknown, path = "patch") {
  if (value === null || typeof value !== "object") return
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    expect(FORBIDDEN_KEYS).not.toContain(key)
    assertNoForbiddenKeys(v, `${path}.${key}`)
  }
}

describe("updateRental — AC-6/BR-6 client-side money invariant", () => {
  it("a notes-only edit sends a patch with ONLY the `notes` key", async () => {
    await updateRental("r1", { notes: "catatan baru" })
    const [, callArgs] = mockRpc.mock.calls[0]
    expect(Object.keys(callArgs.patch)).toEqual(["notes"])
    assertNoForbiddenKeys(callArgs.patch)
  })

  it("a kondisiKeluar-only edit sends a patch whose kondisiKeluar sub-object has ONLY bensinKotak/km/keepPhotoIds/newPhotos", async () => {
    await updateRental("r1", {
      kondisiKeluar: { bensinKotak: 5, km: 1500, photos: [{ kind: "keep", id: "p1" }] },
    })
    const [, callArgs] = mockRpc.mock.calls[0]
    expect(Object.keys(callArgs.patch)).toEqual(["kondisiKeluar"])
    expect(Object.keys(callArgs.patch.kondisiKeluar).sort()).toEqual(
      ["bensinKotak", "keepPhotoIds", "km", "newPhotos"].sort(),
    )
    assertNoForbiddenKeys(callArgs.patch)
  })

  it("a combined notes + kondisiKeluar edit still contains no money-shaped key anywhere in the patch", async () => {
    await updateRental("r1", {
      notes: "catatan + kondisi",
      kondisiKeluar: { bensinKotak: 3, km: null, photos: [] },
    })
    const [, callArgs] = mockRpc.mock.calls[0]
    assertNoForbiddenKeys(callArgs.patch)
  })

  it("does not leak arbitrary extra properties smuggled onto the input object past the type system", async () => {
    // Simulates a caller that bypasses UpdateRentalInput's compile-time contract (e.g. a stray
    // spread from a bigger object) by casting to `any`. The connector must still build the patch
    // field-by-field, not forward whatever it was handed.
    const smuggledInput = {
      notes: "catatan",
      tarif: 999999,
      totalBill: 1,
      payments: [{ amount: 1000000 }],
      hutang: { amount: 500000 },
    } as unknown as Parameters<typeof updateRental>[1]

    await updateRental("r1", smuggledInput)
    const [, callArgs] = mockRpc.mock.calls[0]
    expect(Object.keys(callArgs.patch)).toEqual(["notes"])
    assertNoForbiddenKeys(callArgs.patch)
  })

  it("the resolved Rental returned to the caller reflects whatever the server returned for money fields, never a client-side recompute", async () => {
    // updateRental must not derive/mutate totalBill or payments itself — it only re-fetches and
    // returns exactly what getRental hands back.
    const result = await updateRental("r1", { notes: "x" })
    expect(result.tarif).toBe(40000)
    expect(result.totalBill).toBe(40000)
    expect(result.payments).toEqual([])
  })
})
