// v1.0.5 (PRD-8) dispatch ⑨ — item 3. NOT part of the characterisation suite: this is a new,
// narrowly-scoped test proving the Catatan TextInput is now boxed (BR-4: `notes.trim()` flows
// into the close-rental payload, so it is a Field). The characterisation file
// (PengembalianScreen.characterization.test.tsx) stays untouched — see this dispatch's brief.

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

// Relative path deliberately, matching the characterisation suite's own convention (keeps this
// file's imports out of the "@/services/rentals/types" alphabetical group above).
import { PengembalianScreen } from "./PengembalianScreen"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

/**
 * Walks `.parent` upward from `start` until it finds the ancestor whose flattened style declares
 * a `borderColor` — i.e. FieldBox's own box. Deliberately NOT `test/findStyledAncestor.ts`'s
 * `findStyledAncestor` (height/minHeight based): Catatan's own `notesInput` style intentionally
 * keeps `minHeight: 96` (its pre-existing ~4-line minimum, per this dispatch's brief — "keeps its
 * existing height/padding intent"), and that style sits on the TextInput's own composite node,
 * ONE LEVEL BELOW FieldBox's host View. A height/minHeight predicate would match there first and
 * never reach the actual box. `borderColor` is unique to FieldBox along this path — neither
 * `styles.card` nor `notesInput` declares one.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors the characterisation
// suite's own local `findAncestorWhere`, which types its walk against RNTL's own
// `ReactTestInstance.props: any` rather than fighting an over-narrow test-only type.
function findBorderedAncestor(start: any): any {
  let node = start.parent
  while (node) {
    const flat = StyleSheet.flatten(node.props?.style) ?? {}
    if (flat.borderColor !== undefined) return node
    node = node.parent
  }
  return null
}

const mockGetRental = jest.fn()
const mockGetUserSummary = jest.fn()
const mockGetVehicle = jest.fn()
const mockCloseRental = jest.fn()
const mockUpdatePayment = jest.fn()
const mockDeletePayment = jest.fn()

jest.mock("@/services/rentals", () => ({
  getRental: (...args: unknown[]) => mockGetRental(...args),
  getUserSummary: (...args: unknown[]) => mockGetUserSummary(...args),
  getVehicle: (...args: unknown[]) => mockGetVehicle(...args),
  closeRental: (...args: unknown[]) => mockCloseRental(...args),
  updatePayment: (...args: unknown[]) => mockUpdatePayment(...args),
  deletePayment: (...args: unknown[]) => mockDeletePayment(...args),
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
  mockCloseRental.mockReset()
  mockUpdatePayment.mockReset()
  mockDeletePayment.mockReset()
})

describe("PengembalianScreen — Catatan field box (PRD-8)", () => {
  it("boxes the Catatan TextInput in a FieldBox-shaped ancestor (BR-1: boxed = Mom can change it)", async () => {
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

    const notesInput = utils.getByPlaceholderText("Tambahkan catatan opsional...")
    const box = findBorderedAncestor(notesInput)

    expect(box).not.toBeNull()
    const flat = StyleSheet.flatten(box!.props.style)
    expect(flat.borderColor).toBe(colors.outline)
    expect(flat.backgroundColor).toBe(colors.surface)
    expect(flat.borderRadius).toBe(borderRadius.default)
    expect(flat.minHeight).toBe(52)
    expect(flat.height).toBeUndefined()
  })
})
