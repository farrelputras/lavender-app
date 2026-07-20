import { updateRental } from "./index"

const mockRpc = jest.fn()
const mockUploadPhoto = jest.fn().mockResolvedValue(undefined)
const mockSignPaths = jest.fn().mockResolvedValue(new Map())

const baseRentalRow = {
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

// getRental() re-fetch after a successful RPC call resolves to whichever row
// the current test wants (mirrors index.test.ts's mockNextRow pattern).
let mockNextRentalRow: unknown = baseRentalRow

jest.mock("../supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: mockNextRentalRow, error: null }),
        }),
      }),
    }),
  },
}))

jest.mock("@/services/photos/storage", () => ({
  uploadPhoto: (...args: unknown[]) => mockUploadPhoto(...args),
  signPaths: (...args: unknown[]) => mockSignPaths(...args),
  removePaths: jest.fn(),
}))

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ error: null })
  mockUploadPhoto.mockClear()
  mockSignPaths.mockClear().mockResolvedValue(new Map())
  mockNextRentalRow = baseRentalRow
})

describe("updateRental", () => {
  it("sends a notes-only patch and returns the re-fetched Rental", async () => {
    const rental = await updateRental("r1", { notes: "catatan baru" })

    expect(mockRpc).toHaveBeenCalledWith("rpc_update_rental", {
      p_rental_id: "r1",
      patch: { notes: "catatan baru" },
    })
    expect(rental.id).toBe("r1")
  })

  it("sends an empty-string notes patch (does not drop a deliberate clear)", async () => {
    await updateRental("r1", { notes: "" })

    expect(mockRpc).toHaveBeenCalledWith("rpc_update_rental", {
      p_rental_id: "r1",
      patch: { notes: "" },
    })
  })

  it("uploads only the `new` photos, keeps `keep` ids as-is, and merges both into the patch", async () => {
    await updateRental("r1", {
      kondisiKeluar: {
        bensinKotak: 6,
        km: 1500,
        photos: [
          { kind: "keep", id: "existing-photo-1" },
          { kind: "new", uri: "file://local-photo.jpg", mimeType: "image/jpeg" },
        ],
      },
    })

    expect(mockUploadPhoto).toHaveBeenCalledTimes(1)
    const [uploadedUri, uploadedPath, uploadedMime] = mockUploadPhoto.mock.calls[0]
    expect(uploadedUri).toBe("file://local-photo.jpg")
    expect(uploadedPath).toMatch(/^rentals\/r1\/kondisi-keluar\/.+\.jpg$/)
    expect(uploadedMime).toBe("image/jpeg")

    expect(mockRpc).toHaveBeenCalledTimes(1)
    const [, callArgs] = mockRpc.mock.calls[0]
    expect(callArgs.p_rental_id).toBe("r1")
    expect(callArgs.patch.kondisiKeluar.bensinKotak).toBe(6)
    expect(callArgs.patch.kondisiKeluar.km).toBe(1500)
    expect(callArgs.patch.kondisiKeluar.keepPhotoIds).toEqual(["existing-photo-1"])
    expect(callArgs.patch.kondisiKeluar.newPhotos).toHaveLength(1)
    expect(callArgs.patch.kondisiKeluar.newPhotos[0]).toMatchObject({
      id: expect.any(String),
      path: uploadedPath,
    })
  })

  it("carries km: null through untouched (does not coerce to 0 or drop it)", async () => {
    await updateRental("r1", {
      kondisiKeluar: { bensinKotak: 4, km: null, photos: [] },
    })

    const [, callArgs] = mockRpc.mock.calls[0]
    expect(callArgs.patch.kondisiKeluar.km).toBeNull()
  })

  it("does not block an all-empty photos patch client-side — the last-photo gate lives server-side in the RPC", async () => {
    await expect(
      updateRental("r1", { kondisiKeluar: { bensinKotak: 5, km: 1200, photos: [] } }),
    ).resolves.toBeTruthy()

    expect(mockRpc).toHaveBeenCalledWith("rpc_update_rental", {
      p_rental_id: "r1",
      patch: {
        kondisiKeluar: { bensinKotak: 5, km: 1200, keepPhotoIds: [], newPhotos: [] },
      },
    })
  })

  it("throws a real Error carrying the RPC's message — never the raw postgrest object", async () => {
    mockRpc.mockResolvedValue({
      error: {
        message: "Kondisi keluar hanya dapat diubah selama rental berstatus aktif",
        details: "",
        hint: "",
        code: "P0001",
      },
    })

    let caught: unknown
    try {
      await updateRental("r1", { kondisiKeluar: { bensinKotak: 4, km: null, photos: [] } })
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe(
      "Kondisi keluar hanya dapat diubah selama rental berstatus aktif",
    )
  })

  it("throws a clear message if the rental is gone by the post-RPC re-fetch", async () => {
    mockNextRentalRow = null

    await expect(updateRental("r1", { notes: "x" })).rejects.toThrow(
      /Rental r1 not found after updateRental/,
    )
  })
})
