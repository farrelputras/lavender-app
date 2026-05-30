import { buildUserPhotoPath, buildRentalPhotoPath, extFromMime } from "./paths"

describe("buildUserPhotoPath", () => {
  it("returns correct path shape for user profile photo", () => {
    const path = buildUserPhotoPath("u1", "profil", "jpg")
    expect(path).toMatch(/^users\/u1\/profil\/[0-9a-f-]+\.jpg$/)
  })
})

describe("buildRentalPhotoPath", () => {
  it("returns correct path shape for rental exit condition photo", () => {
    const path = buildRentalPhotoPath("r1", "kondisi-keluar", "jpg")
    expect(path).toMatch(/^rentals\/r1\/kondisi-keluar\/[0-9a-f-]+\.jpg$/)
  })
})

describe("extFromMime", () => {
  it("returns 'png' for image/png", () => {
    expect(extFromMime("image/png")).toBe("png")
  })

  it("returns 'jpg' for image/jpeg", () => {
    expect(extFromMime("image/jpeg")).toBe("jpg")
  })

  it("returns 'jpg' for image/heic (normalized)", () => {
    expect(extFromMime("image/heic")).toBe("jpg")
  })

  it("returns 'jpg' for null (default)", () => {
    expect(extFromMime(null)).toBe("jpg")
  })
})
