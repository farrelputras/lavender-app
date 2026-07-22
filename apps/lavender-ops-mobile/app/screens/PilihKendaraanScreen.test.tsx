// PRD-5 AC-3 — licence plates must render in full at the maximum supported text size. Mom uses
// the plate to tell two identical Honda Beats apart at handover; shrinking it to fit is
// explicitly not an acceptable resolution (PRD-5 constraints). The old mechanism:
// `flexBasis: "48%"` pins the card's width, `overflow: "hidden"` on the card clips anything
// that outgrows it, and `numberOfLines={1}` on the plate Text forces the ellipsis once glyph
// width exceeds the column at large text scale.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

const mockGoBack = jest.fn()
const mockNavigate = jest.fn()
const mockGetUserSummary = jest.fn()
const mockGetVehicleSummaries = jest.fn()
jest.mock("@/services/rentals", () => ({
  getUserSummary: (...args: unknown[]) => mockGetUserSummary(...args),
  getVehicleSummaries: (...args: unknown[]) => mockGetVehicleSummaries(...args),
}))
jest.mock("@/utils/showToast", () => ({ showToast: jest.fn() }))

import { render, waitFor } from "@testing-library/react-native"

import type { UserSummary, VehicleSummary } from "@/services/rentals/types"

import { PilihKendaraanScreen } from "./PilihKendaraanScreen"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockGetUserSummary.mockReset()
  mockGetVehicleSummaries.mockReset()
})

const user: UserSummary = {
  id: "u1",
  name: "Budi",
  nickname: null,
  phone: "0812",
  isMahasiswa: false,
  isVerified: false,
  verificationStatus: "BELUM_DIVERIFIKASI",
  namaPddikti: null,
  tahunMasuk: null,
  universitas: null,
  prodi: null,
  activeRentalsCount: 0,
  debtAmount: 0,
  profilPhoto: null,
}

const vehicle: VehicleSummary = {
  id: "v1",
  name: "Honda Beat",
  plate: "N 2314 AB",
  category: "MOTOR",
  rate24h: 50000,
  available: true,
}

function renderScreen() {
  return render(
    <PilihKendaraanScreen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal nav/route stub
      navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any}
      route={{ params: { userId: "u1" }, key: "k", name: "PilihKendaraan" } as any}
    />,
  )
}

describe("PilihKendaraanScreen — licence plates never truncate (AC-3)", () => {
  it("does not force the plate onto a single line", async () => {
    mockGetUserSummary.mockResolvedValue(user)
    mockGetVehicleSummaries.mockResolvedValue([vehicle])
    const { getByText } = renderScreen()
    await waitFor(() => expect(getByText("N 2314 AB")).toBeTruthy())

    const plateNode = getByText("N 2314 AB")
    expect(plateNode.props.numberOfLines).toBeUndefined()
  })

  it("does not clip the card's content area — overflow:hidden moves to the icon panel only, so the card itself can grow", async () => {
    mockGetUserSummary.mockResolvedValue(user)
    mockGetVehicleSummaries.mockResolvedValue([vehicle])
    const { getByTestId } = renderScreen()
    await waitFor(() => expect(getByTestId("vehicle-card-v1")).toBeTruthy())

    const card = getByTestId("vehicle-card-v1")
    const flatStyle = [card.props.style].flat()
    const overflow = flatStyle.map((s) => s?.overflow).find((v) => v !== undefined)
    expect(overflow).toBeUndefined()
  })
})
