// PRD-5 AC-1/AC-9 — the urgent defect. `21 Juli → 22 JuliSisa Rp 50.000` fuses a date and a
// rupiah amount into one unreadable string once the date text grows (`RentalScreen.tsx` card
// footer: `justifyContent: "space-between"` with no `gap` and no `flexShrink` on either child —
// RN's default `flexShrink` is `0`, unlike web CSS's `1`). No rupiah amount may ever touch
// adjacent text (BR-2, no exception).
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

const mockGetRentals = jest.fn()
jest.mock("@/services/rentals", () => ({
  getRentals: (...args: unknown[]) => mockGetRentals(...args),
}))

import { render, waitFor } from "@testing-library/react-native"

import type { RentalListItem } from "@/services/rentals/types"

import { RentalScreen } from "./RentalScreen"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

beforeEach(() => {
  mockInsets(ZERO_INSETS)
})

function makeRental(overrides: Partial<RentalListItem> = {}): RentalListItem {
  return {
    id: "r1",
    userName: "Budi",
    vehicleName: "Honda Beat",
    vehiclePlate: "N 1234 AB",
    // A date range long enough to exhaust the card's leftover horizontal slack — this is
    // exactly the condition that produced Mom's screenshot.
    startAt: new Date("2026-07-21"),
    dueAt: new Date("2026-07-22"),
    returnedAt: null,
    status: "ACTIVE",
    totalBill: 100000,
    totalPaid: 50000,
    ...overrides,
  }
}

describe("RentalScreen — date/Sisa row never fuses (AC-1/AC-9)", () => {
  beforeEach(() => {
    mockGetRentals.mockReset()
  })

  it("renders the date range and the Sisa amount as separate Text nodes, never one concatenated string", async () => {
    mockGetRentals.mockResolvedValue([makeRental()])
    const { queryByText, getByText } = render(<RentalScreen />)

    await waitFor(() => expect(getByText(/Sisa Rp/)).toBeTruthy())

    // The defect was a single fused string like "22 JuliSisa Rp 50.000" — that string must
    // never exist as one text node.
    expect(queryByText(/Juli.*Sisa Rp/)).toBeNull()
  })

  it("lets the date/Sisa row wrap instead of relying on leftover horizontal slack (the anti-pattern PRD-5 names as unacceptable)", async () => {
    mockGetRentals.mockResolvedValue([makeRental()])
    const { getByTestId } = render(<RentalScreen />)
    await waitFor(() => expect(getByTestId("rental-card-footer")).toBeTruthy())

    const footer = getByTestId("rental-card-footer")
    const flatStyle = [footer.props.style].flat()
    const flexWrap = flatStyle.map((s) => s?.flexWrap).find((v) => v !== undefined)
    const gap = flatStyle.map((s) => s?.gap ?? s?.columnGap).find((v) => v !== undefined)

    expect(flexWrap).toBe("wrap")
    expect(gap).toBeGreaterThan(0)
  })
})
