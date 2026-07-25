// THROWAWAY SPIKE — v1.0.5 dispatch ① discovery pass.
//
// Purpose: answer ONE question — can PengembalianScreen be mounted in jest at all? — by
// actually mounting it, not by reasoning about its imports. This file is NOT part of the
// BR-12 characterisation suite; Lead decides whether it stays or is deleted after the re-gate.
//
// Modelled directly on RentalDetailScreen.test.tsx's mocking pattern (same screen shape: takes
// {navigation, route} as props per AppStackScreenProps, no NavigationContainer needed).

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

import { render, waitFor } from "@testing-library/react-native"

import type { Rental, UserSummary, Vehicle } from "@/services/rentals/types"

import { mockInsets, ZERO_INSETS } from "./mockSafeAreaInsets"

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

const mockChoosePhotoSource = jest.fn()
jest.mock("@/services/photos/capture", () => ({
  choosePhotoSource: (...args: unknown[]) => mockChoosePhotoSource(...args),
}))

const mockShowToast = jest.fn()
jest.mock("@/utils/showToast", () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

// Imported AFTER the mocks above, per jest convention.
// eslint-disable-next-line import/first
import { PengembalianScreen } from "@/screens/PengembalianScreen"

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
    totalBill: 40000,
    totalPaid: 0,
    payments: [],
    jaminan: { items: ["KTP"] },
    kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] },
    kondisiKembali: null,
    notes: "",
    tujuan: "",
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
    rate24h: 40000,
    available: false,
    gps: null,
    imei: null,
    ...overrides,
  }
}

const navigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() } as any

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockGetRental.mockReset().mockResolvedValue(makeRental())
  mockGetUserSummary.mockReset().mockResolvedValue(makeUserSummary())
  mockGetVehicle.mockReset().mockResolvedValue(makeVehicle())
  mockCloseRental.mockReset()
  mockUpdatePayment.mockReset()
  mockDeletePayment.mockReset()
  mockChoosePhotoSource.mockReset()
  mockShowToast.mockReset()
})

describe("SPIKE — can PengembalianScreen mount in jest?", () => {
  it("renders the AppBar title after load resolves", async () => {
    const t0 = Date.now()
    const { getByText } = render(
      <PengembalianScreen
        navigation={navigation}
        route={{ params: { rentalId: "r1" } } as any}
      />,
    )

    await waitFor(() => expect(getByText("Proses Pengembalian")).toBeDefined())
    // eslint-disable-next-line no-console
    console.log(`SPIKE render+resolve took ${Date.now() - t0}ms`)
  })

  // Second question: can a render-level test pin the ARGUMENTS handed to the connector at
  // close (D-4's requirement), not just displayed text? Drive the Subtotal Sewa input (no
  // testID exists anywhere in this screen — located by tree order via UNSAFE_getAllByType,
  // same technique RentalDetailScreen.test.tsx uses for its Stepper buttons) and press Save.
  it("pins the closeRental payload after editing Subtotal Sewa (no testID on this screen)", async () => {
    mockCloseRental.mockResolvedValue(makeRental({ status: "COMPLETED" }))
    const { getByText, UNSAFE_getAllByType } = render(
      <PengembalianScreen
        navigation={navigation}
        route={{ params: { rentalId: "r1" } } as any}
      />,
    )
    await waitFor(() => expect(getByText("Proses Pengembalian")).toBeDefined())

    const inputs = UNSAFE_getAllByType(require("react-native").TextInput)
    // Tree order: Tujuan(0), Harga bensin/kotak(1), KM Kembali(2), Subtotal Sewa(3), ... Catatan(last)
    const { fireEvent } = require("@testing-library/react-native")
    fireEvent.changeText(inputs[3], "100000")

    const saveBtn = getByText(/Selesaikan/)
    fireEvent.press(saveBtn)

    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [rentalId, payload] = mockCloseRental.mock.calls[0]
    // eslint-disable-next-line no-console
    console.log("SPIKE closeRental payload:", rentalId, JSON.stringify(payload))
    expect(rentalId).toBe("r1")
    expect(payload.subtotalSewa).toBe(100000)
    expect(payload.extraFees).toEqual([])
    expect(payload.discount).toBe(0)
  })
})
