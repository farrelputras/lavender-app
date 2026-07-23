// Tester-authored (v1.0.4) — HutangScreen had zero test coverage before this file.
//
// What this proves: the screen (including its FAB, header, and the money-adjacent
// `cardFooter` row that PRD-5 AC-9's sweep touched — "4 more rows across 3 files" per the
// release report) mounts and renders without throwing at `fontScale = MAX_FONT_SCALE`. It does
// NOT prove the card layout is visually correct at 1.5x — see the visual-audit checklist for
// that.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

const mockNavigate = jest.fn()
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- required inline: a jest.mock
    // factory may not close over an outer-scope import binding.
    const { useEffect } = require("react")
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => cb(), [])
  },
}))

const mockGetHutangs = jest.fn()
jest.mock("@/services/rentals", () => ({
  getHutangs: (...args: unknown[]) => mockGetHutangs(...args),
}))

import { PixelRatio } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import type { HutangFull } from "@/services/rentals/types"

import { HutangScreen } from "./HutangScreen"
import { findFlexWrapAncestor } from "../../test/findStyledAncestor"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

function makeHutang(overrides: Partial<HutangFull> = {}): HutangFull {
  return {
    id: "h1",
    userName: "Siti Rahayu Wijayanti Kusumaningtyas",
    rentalId: null,
    jumlahAwal: 200000,
    sisa: 50000,
    status: "AKTIF",
    payments: [],
    notes: null,
    ...overrides,
  } as HutangFull
}

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockGetHutangs.mockReset()
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("HutangScreen — renders without throwing at MAX_FONT_SCALE (PRD-5 AC-5 audit surface)", () => {
  it("renders the header, list, and FAB at fontScale=1", async () => {
    mockGetHutangs.mockResolvedValue([makeHutang()])
    const { getByText } = render(<HutangScreen />)
    await waitFor(() => expect(getByText("Hutang Baru")).toBeDefined())
    expect(getByText("Hutang")).toBeDefined()
    // The header's total is interpolated into a larger sentence ("1 pelanggan · total Rp
    // 50.000") as one Text node, so it does NOT exact-match "Rp 50.000" alone — only the card's
    // own dedicated Sisa Text node does.
    expect(getByText("Rp 50.000")).toBeDefined()
  })

  it("renders the same content without throwing at fontScale=1.5 (MAX_FONT_SCALE), including a long customer name", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    mockGetHutangs.mockResolvedValue([makeHutang()])
    const { getByText } = render(<HutangScreen />)
    await waitFor(() => expect(getByText("Hutang Baru")).toBeDefined())
    expect(getByText("Siti Rahayu Wijayanti Kusumaningtyas")).toBeDefined()
  })

  it("does not force the money-adjacent card footer (Sisa / Awal) onto a single non-wrapping line — PRD-5 AC-9", async () => {
    mockGetHutangs.mockResolvedValue([makeHutang()])
    const { getByText } = render(<HutangScreen />)
    await waitFor(() => expect(getByText("Hutang Baru")).toBeDefined())

    const sisaNode = getByText("Rp 50.000") // the card's own dedicated Sisa Text node
    const cardFooter = findFlexWrapAncestor(sisaNode)
    expect(cardFooter).toBeTruthy()
    const flatStyle = [cardFooter!.props.style].flat()
    const flexWrap = flatStyle.map((s) => s?.flexWrap).find((v) => v !== undefined)
    const gap = flatStyle.map((s) => s?.gap ?? s?.columnGap).find((v) => v !== undefined)
    expect(flexWrap).toBe("wrap")
    expect(gap).toBeGreaterThan(0)
  })
})
