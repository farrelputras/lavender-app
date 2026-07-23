// Tester-authored (v1.0.4) — companion to the developer's own BerandaScreen.test.tsx (which
// covers the AC-2 quick-action fix but never mocks PixelRatio.getFontScale). This file exercises
// the one place on Beranda where the device's reported font scale is actually read in JS — the
// D-1b diagnostic footer line — integrated inside the real screen, not VersionFooter in
// isolation (VersionFooter.test.tsx already covers the component alone).
//
// What this proves: mounted inside BerandaScreen, at a mocked fontScale of 1.5 and a non-zero
// inset, the footer line reads exactly "fontScale 1.5 · inset 48" — i.e. the diagnostic Farrel
// asked for (D-1b) is wired correctly end-to-end on the one screen that ships it, not just in the
// component's own unit test. It does NOT prove Beranda "looks right" at 1.5x, and it does NOT
// prove Mom's own device reports a fontScale near 1.5 — only her own screenshot after the OTA can
// establish that (see the visual-audit checklist).
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useEffect } = require("react")
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => cb(), [])
  },
}))

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}))

jest.mock("expo-updates", () => ({ updateId: null, createdAt: null }))

const mockGetDashboardSummary = jest.fn()
const mockGetRentalsDueToday = jest.fn()
jest.mock("@/services/rentals", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
  getRentalsDueToday: (...args: unknown[]) => mockGetRentalsDueToday(...args),
}))

import { PixelRatio } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import type { DashboardSummary } from "@/services/rentals/types"

import { BerandaScreen } from "./BerandaScreen"
import { mockInsets, THREE_BUTTON_NAV_INSETS } from "../../test/mockSafeAreaInsets"

const summary: DashboardSummary = {
  activeRentalsCount: 3,
  activeDebtAmount: 150000,
  activeDebtCustomerCount: 2,
  availableVehiclesCount: 4,
  totalVehiclesCount: 6,
  verifiedUsersCount: 10,
  totalUsersCount: 12,
}

beforeEach(() => {
  mockGetDashboardSummary.mockReset().mockResolvedValue(summary)
  mockGetRentalsDueToday.mockReset().mockResolvedValue([])
})

describe("BerandaScreen — the D-1b diagnostic footer (fontScale + inset), integrated on the real screen", () => {
  it('reads exactly "fontScale 1.5 · inset 48" at MAX_FONT_SCALE and 3-button-nav inset', async () => {
    mockInsets(THREE_BUTTON_NAV_INSETS)
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    const { getByText } = render(<BerandaScreen />)
    await waitFor(() => expect(getByText("fontScale 1.5 · inset 48")).toBeDefined())
  })
})
