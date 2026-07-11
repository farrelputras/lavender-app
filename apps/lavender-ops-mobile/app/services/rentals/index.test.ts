import { hardDeleteRental, hardDeleteHutang, hardDeleteUser, hardDeleteVehicle } from "./index"

const mockRpc = jest.fn()
const rentalRow = {
  kondisi_keluar: { photos: [{ id: "1", path: "rentals/r1/kondisi-keluar/a.jpg" }] },
  kondisi_kembali: { photos: [{ id: "2", path: "rentals/r1/kondisi-kembali/b.jpg" }] },
}
const userRow = {
  ktp_photo: { id: "k", path: "users/u1/ktp/a.jpg" },
  ktm_photo: null,
  profil_photo: { id: "p", path: "users/u1/profil/c.jpg" },
}
// maybeSingle() resolves to whichever row the current test wants.
let mockNextRow: unknown = null
jest.mock("../supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: mockNextRow, error: null }) }),
      }),
    }),
  },
}))
const mockRemovePaths = jest.fn().mockResolvedValue(undefined)
jest.mock("@/services/photos/storage", () => ({
  removePaths: (paths: string[]) => mockRemovePaths(paths),
  // keep the other exports used by index.ts importable:
  uploadPhoto: jest.fn(),
  signPaths: jest.fn(),
}))

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ error: null })
  mockRemovePaths.mockClear()
  mockNextRow = null
})

describe("hardDeleteRental", () => {
  it("calls the RPC then removes owned photos", async () => {
    mockNextRow = rentalRow
    await hardDeleteRental("r1")
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_delete_rental", { p_rental_id: "r1" })
    expect(mockRemovePaths).toHaveBeenCalledWith([
      "rentals/r1/kondisi-keluar/a.jpg",
      "rentals/r1/kondisi-kembali/b.jpg",
    ])
  })

  it("throws and does NOT remove photos when the RPC errors", async () => {
    mockNextRow = rentalRow
    mockRpc.mockResolvedValue({ error: new Error("unauthorized") })
    await expect(hardDeleteRental("r1")).rejects.toThrow()
    expect(mockRemovePaths).not.toHaveBeenCalled()
  })

  it("still resolves when photo removal fails (orphan tolerated)", async () => {
    mockNextRow = rentalRow
    mockRemovePaths.mockRejectedValueOnce(new Error("storage down"))
    await expect(hardDeleteRental("r1")).resolves.toBeUndefined()
  })
})

describe("hardDeleteHutang", () => {
  it("calls the RPC and removes no photos", async () => {
    await hardDeleteHutang("h1")
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_delete_hutang", { p_hutang_id: "h1" })
    expect(mockRemovePaths).not.toHaveBeenCalled()
  })
})

describe("hardDeleteUser", () => {
  it("calls the RPC then removes owned photos", async () => {
    mockNextRow = userRow
    await hardDeleteUser("u1")
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_delete_user", { p_user_id: "u1" })
    expect(mockRemovePaths).toHaveBeenCalledWith(["users/u1/ktp/a.jpg", "users/u1/profil/c.jpg"])
  })

  it("rethrows a block-if-referenced error and skips removal", async () => {
    mockNextRow = userRow
    mockRpc.mockResolvedValue({
      error: new Error("Tidak bisa dihapus: masih ada rental/hutang terkait"),
    })
    await expect(hardDeleteUser("u1")).rejects.toThrow("Tidak bisa dihapus")
    expect(mockRemovePaths).not.toHaveBeenCalled()
  })
})

describe("hardDeleteVehicle", () => {
  it("calls the RPC and removes no photos", async () => {
    await hardDeleteVehicle("v1")
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_delete_vehicle", { p_vehicle_id: "v1" })
    expect(mockRemovePaths).not.toHaveBeenCalled()
  })
})
