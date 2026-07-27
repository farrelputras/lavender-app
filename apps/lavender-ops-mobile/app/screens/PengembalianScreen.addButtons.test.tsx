// v1.0.5 (PRD-8) dispatch ⑨ — item 5. NOT part of the characterisation suite: proves the three
// "add" buttons (Tambah Biaya / Diskon / Tambah Pembayaran) are aligned to each other at
// `minHeight: 48` (Farrel's ruling — see the brief) while staying deliberately UN-aligned with
// `FieldBox`'s own tokens (`outline` / radius 12 / `surface`-only). A Control wearing the
// field-box border colour + radius would read as a Field under BR-1 — the exact regression this
// test exists to catch.

jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

// See app/utils/useBottomBarPadding.test.tsx / debt #11 — jest-expo's default preset resolves
// Platform.select to iOS always. PengembalianScreen reads useBottomBarPadding() /
// useBottomSpace(), both of which branch on Platform.select.
jest.mock("react-native/Libraries/Utilities/Platform.ios", () => ({
  __esModule: true,
  default: {
    OS: "android",
    select: (spec: Record<string, unknown>) => spec.android ?? spec.default,
  },
}))

import { StyleSheet } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import type { Rental, UserSummary, Vehicle } from "@/services/rentals/types"
import { colors, borderRadius } from "@/theme/tokens"

// Relative path deliberately, matching the characterisation suite's own convention.
import { PengembalianScreen } from "./PengembalianScreen"
import { findStyledAncestor } from "../../test/findStyledAncestor"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

const mockGetRental = jest.fn()
const mockGetUserSummary = jest.fn()
const mockGetVehicle = jest.fn()

jest.mock("@/services/rentals", () => ({
  getRental: (...args: unknown[]) => mockGetRental(...args),
  getUserSummary: (...args: unknown[]) => mockGetUserSummary(...args),
  getVehicle: (...args: unknown[]) => mockGetVehicle(...args),
  closeRental: jest.fn(),
  updatePayment: jest.fn(),
  deletePayment: jest.fn(),
}))

jest.mock("@/services/photos/capture", () => ({
  choosePhotoSource: jest.fn(),
}))

jest.mock("@/utils/showToast", () => ({
  showToast: jest.fn(),
}))

function makeRental(overrides: Partial<Rental> = {}): Rental {
  return {
    id: "r1",
    userId: "u1",
    vehicleId: "v1",
    startAt: new Date("2026-07-01T00:00:00Z"),
    dueAt: new Date("2026-07-02T00:00:00Z"),
    returnedAt: null,
    status: "ACTIVE",
    tarif: 40000,
    addOn: { description: "", amount: 0 },
    discount: 0,
    totalBill: 999999,
    totalPaid: 0,
    payments: [],
    jaminan: { items: ["KTP"] },
    kondisiKeluar: { bensinKotak: 6, km: 1000, photos: [] },
    kondisiKembali: null,
    notes: "",
    tujuan: "Kos Barat",
    paketHari: 1,
    paketJam: 0,
    ...overrides,
  } as Rental
}

function makeUserSummary(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    id: "u1",
    name: "Budi",
    nickname: null,
    phone: "081234567890",
    isMahasiswa: false,
    isVerified: false,
    verificationStatus: "BELUM_DIVERIFIKASI",
    namaPddikti: null,
    tahunMasuk: null,
    universitas: null,
    prodi: null,
    activeRentalsCount: 1,
    debtAmount: 0,
    profilPhoto: null,
    ...overrides,
  }
}

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    name: "Vario",
    plate: "L 1234 AB",
    category: "MOTOR",
    rate6h: 20000,
    rate12h: 30000,
    rate24h: 45000,
    available: false,
    gps: null,
    imei: null,
    ...overrides,
  }
}

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double, matches the
  // characterisation suite's own `as any` for AppStackScreenProps' navigation prop.
} as any

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockGetRental.mockReset().mockResolvedValue(makeRental())
  mockGetUserSummary.mockReset().mockResolvedValue(makeUserSummary())
  mockGetVehicle.mockReset().mockResolvedValue(makeVehicle())
})

describe("PengembalianScreen — the three 'add' buttons (PRD-8 dispatch ⑨, item 5)", () => {
  it("aligns Tambah Biaya / Diskon / Tambah Pembayaran at minHeight: 48, without adopting FieldBox's tokens", async () => {
    const rental = makeRental()
    const utils = render(
      <PengembalianScreen
        navigation={navigation}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double, matches
        // the characterisation suite's own `as any` for AppStackScreenProps' route prop.
        route={{ params: { rentalId: rental.id } } as any}
      />,
    )
    await waitFor(() => expect(utils.getByText("Proses Pengembalian")).toBeDefined())

    const tambahBiaya = findStyledAncestor(utils.getByText("Tambah Biaya"))
    const diskon = findStyledAncestor(utils.getByText("Diskon"))
    const tambahPembayaran = findStyledAncestor(utils.getByText("Tambah Pembayaran"))

    for (const btn of [tambahBiaya, diskon, tambahPembayaran]) {
      expect(btn).not.toBeNull()
      const flat = StyleSheet.flatten(btn!.props.style)
      expect(flat.minHeight).toBe(48)
      expect(flat.height).toBeUndefined()
    }

    // Tambah Biaya / Diskon: the bordered Control look — deliberately `outlineVariant` + radius
    // 10, NOT FieldBox's `outline` + radius 12 (BR-1/BR-3: a Control must never wear the
    // field-box tokens, or it reads as an editable value).
    const tambahBiayaFlat = StyleSheet.flatten(tambahBiaya!.props.style)
    expect(tambahBiayaFlat.borderColor).toBe(colors.outlineVariant)
    expect(tambahBiayaFlat.borderRadius).toBe(10)
    expect(tambahBiayaFlat.borderColor).not.toBe(colors.outline)
    expect(tambahBiayaFlat.borderRadius).not.toBe(borderRadius.default)

    // Tambah Pembayaran has no border at all (unchanged) — still not FieldBox's look.
    const tambahPembayaranFlat = StyleSheet.flatten(tambahPembayaran!.props.style)
    expect(tambahPembayaranFlat.borderColor).toBeUndefined()
    expect(tambahPembayaranFlat.paddingVertical).toBeDefined()
  })
})
