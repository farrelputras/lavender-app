// Tester-authored (v1.0.4) — UserScreen had zero test coverage before this file.
//
// What this proves: the screen (SectionList + FlatList search-mode branches, the FAB, and the
// per-row identifying-value text PRD-5 BR-1 requires never truncate — `numberOfLines` was removed
// from these rows per the release report's D-7) mounts and renders without throwing at
// `fontScale = MAX_FONT_SCALE`. It does NOT prove the row/section layout is visually correct at
// 1.5x, and it does NOT prove the taller-card D-7 tradeoff at *default* scale reads as intentional
// rather than broken — that is the D-7 visual-audit row, a default-scale check by design.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

const mockNavigate = jest.fn()
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useEffect } = require("react")
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => cb(), [])
  },
}))

const mockGetUserSummaries = jest.fn()
jest.mock("@/services/rentals", () => ({
  getUserSummaries: (...args: unknown[]) => mockGetUserSummaries(...args),
}))

import { PixelRatio } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import type { UserSummary } from "@/services/rentals/types"

import { UserScreen } from "./UserScreen"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

function makeUser(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    id: "u1",
    name: "Muhammad Alexander Firmansyah Putra Wibisono",
    nickname: null,
    phone: "081234567890",
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
    ...overrides,
  } as UserSummary
}

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockGetUserSummaries.mockReset()
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("UserScreen — renders without throwing at MAX_FONT_SCALE (PRD-5 AC-5 audit surface)", () => {
  it("renders the sectioned list and FAB at fontScale=1", async () => {
    mockGetUserSummaries.mockResolvedValue([makeUser()])
    const { getByText } = render(<UserScreen />)
    await waitFor(() => expect(getByText("User Baru")).toBeDefined())
    expect(getByText("User")).toBeDefined()
  })

  it("renders the same list, including a long name that must not be cut off, without throwing at fontScale=1.5", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    mockGetUserSummaries.mockResolvedValue([makeUser()])
    const { getByText } = render(<UserScreen />)
    await waitFor(() => expect(getByText("User Baru")).toBeDefined())
    expect(getByText("Muhammad Alexander Firmansyah Putra Wibisono")).toBeDefined()
  })

  it("does not truncate the user name in the row (PRD-5 BR-1 / D-7 — numberOfLines removed deliberately)", async () => {
    mockGetUserSummaries.mockResolvedValue([makeUser()])
    const { getByText } = render(<UserScreen />)
    await waitFor(() => expect(getByText("User Baru")).toBeDefined())

    const nameNode = getByText("Muhammad Alexander Firmansyah Putra Wibisono")
    expect(nameNode.props.numberOfLines).toBeUndefined()
  })
})
