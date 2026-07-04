const mockRemove = jest.fn().mockResolvedValue({ data: [], error: null })
jest.mock("../supabase/client", () => ({
  supabase: { storage: { from: () => ({ remove: mockRemove }) } },
}))

import { removePaths } from "./storage"

describe("removePaths", () => {
  beforeEach(() => mockRemove.mockClear())

  it("no-ops on an empty array (no storage call)", async () => {
    await removePaths([])
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it("forwards the paths to storage.remove", async () => {
    await removePaths(["users/u1/ktp/a.jpg", "rentals/r1/kondisi-keluar/b.jpg"])
    expect(mockRemove).toHaveBeenCalledWith([
      "users/u1/ktp/a.jpg",
      "rentals/r1/kondisi-keluar/b.jpg",
    ])
  })
})
