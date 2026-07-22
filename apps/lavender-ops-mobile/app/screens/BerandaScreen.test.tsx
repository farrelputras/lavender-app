// PRD-5 AC-2 — the Beranda "Sewa Baru" / "User Baru" quick-action labels must render in full at
// the maximum supported text size. `actionBtn` was hard-pinned to `height: 80` with a
// `headlineSm` label (20pt/28 → 30pt/42 at 1.5x), no `numberOfLines`, no `flexShrink` — so the
// label's intrinsic single-line width overflowed the button (RN's default flexShrink is 0) and
// got visually swallowed by the neighboring button, reading as a clipped word (Mom's report:
// "Sewa Baru seems too big" — actually incomplete, not oversized).
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- required inline: a jest.mock
    // factory may not close over an outer-scope import binding.
    const { useEffect } = require("react")
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => cb(), [])
  },
}))

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}))

const mockGetDashboardSummary = jest.fn()
const mockGetRentalsDueToday = jest.fn()
jest.mock("@/services/rentals", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
  getRentalsDueToday: (...args: unknown[]) => mockGetRentalsDueToday(...args),
}))

import { render, waitFor } from "@testing-library/react-native"

import type { DashboardSummary } from "@/services/rentals/types"

import { BerandaScreen } from "./BerandaScreen"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockGetDashboardSummary.mockReset()
  mockGetRentalsDueToday.mockReset()
})

const summary: DashboardSummary = {
  activeRentalsCount: 3,
  activeDebtAmount: 150000,
  activeDebtCustomerCount: 2,
  availableVehiclesCount: 4,
  totalVehiclesCount: 6,
  verifiedUsersCount: 10,
  totalUsersCount: 12,
}

describe("BerandaScreen — quick-action labels never clip (AC-2)", () => {
  it("does not pin the quick-action button to a fixed height that would clip a two-line label", async () => {
    mockGetDashboardSummary.mockResolvedValue(summary)
    mockGetRentalsDueToday.mockResolvedValue([])
    const { getByTestId } = render(<BerandaScreen />)

    await waitFor(() => expect(getByTestId("action-btn-sewa-baru")).toBeTruthy())

    const btn = getByTestId("action-btn-sewa-baru")
    const flatStyle = [btn.props.style].flat()
    const height = flatStyle.map((s) => s?.height).find((v) => v !== undefined)
    const minHeight = flatStyle.map((s) => s?.minHeight).find((v) => v !== undefined)

    expect(height).toBeUndefined()
    expect(minHeight).toBe(80)
  })

  it("lets the 'Sewa Baru' / 'User Baru' labels shrink-to-wrap instead of overflowing the button", async () => {
    mockGetDashboardSummary.mockResolvedValue(summary)
    mockGetRentalsDueToday.mockResolvedValue([])
    const { getByText } = render(<BerandaScreen />)

    await waitFor(() => expect(getByText("Sewa Baru")).toBeTruthy())

    for (const label of ["Sewa Baru", "User Baru"]) {
      const node = getByText(label)
      const flatStyle = [node.props.style].flat()
      const flexShrink = flatStyle.map((s) => s?.flexShrink).find((v) => v !== undefined)
      expect(flexShrink).toBe(1)
    }
  })
})
