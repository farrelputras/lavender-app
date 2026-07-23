// Tester-authored (v1.0.4) — HutangDetailScreen had zero test coverage before this file.
//
// What this proves: the screen mounts and renders without throwing at `fontScale =
// MAX_FONT_SCALE`, including its `PembayaranSheet` child (rendered but not `visible` here — its
// own `DateTimePicker` only mounts once "ubah tanggal" is tapped, which this file does not
// exercise) and the two `minHeight`-based CTA buttons named in the release report's "6 more
// buttons across 3 files" finding. It does NOT prove the hero card's `Rp X` figure (`displayLg`,
// the largest token in the app) stays clear of its "dari Rp Y" subtitle at 1.5x on a real device.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

const mockGoBack = jest.fn()
const mockNavigate = jest.fn()
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useEffect } = require("react")
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => cb(), [])
  },
}))

const mockRole = { current: "ops" as "ops" | "admin" }
jest.mock("@/services/auth/useSession", () => ({
  useSession: () => ({ role: mockRole.current, session: null, loading: false }),
}))

const mockGetHutangFull = jest.fn()
jest.mock("@/services/rentals", () => ({
  getHutangFull: (...args: unknown[]) => mockGetHutangFull(...args),
  addHutangPayment: jest.fn(),
  updateHutangPayment: jest.fn(),
  deleteHutangPayment: jest.fn(),
  hardDeleteHutang: jest.fn(),
}))

import { PixelRatio } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import type { HutangFull } from "@/services/rentals/types"

import { HutangDetailScreen } from "./HutangDetailScreen"
import { findStyledAncestor } from "../../test/findStyledAncestor"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

function makeHutang(overrides: Partial<HutangFull> = {}): HutangFull {
  return {
    id: "h1",
    userName: "Budi Santoso",
    rentalId: null,
    jumlahAwal: 200000,
    sisa: 50000,
    status: "AKTIF",
    payments: [
      { id: "p1", amount: 150000, method: "CASH", paidAt: new Date("2026-07-01T01:00:00Z") },
    ],
    notes: null,
    ...overrides,
  } as HutangFull
}

async function renderScreen(hutang: HutangFull) {
  mockGetHutangFull.mockResolvedValue(hutang)
  const utils = render(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal nav/route stub
    <HutangDetailScreen
      navigation={{ goBack: mockGoBack, navigate: mockNavigate } as any}
      route={{ params: { hutangId: hutang.id }, key: "k", name: "HutangDetail" } as any}
    />,
  )
  await waitFor(() => expect(utils.getByText("Detail Hutang")).toBeDefined())
  return utils
}

beforeEach(() => {
  mockRole.current = "ops"
  mockGetHutangFull.mockReset()
  mockInsets(ZERO_INSETS)
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("HutangDetailScreen — renders without throwing at MAX_FONT_SCALE (PRD-5 AC-5 audit surface)", () => {
  it("renders the hero card and payment list at fontScale=1", async () => {
    const { getByText } = await renderScreen(makeHutang())
    expect(getByText("Budi Santoso")).toBeDefined()
    // Exact match, not a substring/regex — "Rp 150.000" (the payment row) contains "50.000" as a
    // literal substring and must NOT satisfy this assertion.
    expect(getByText("Rp 50.000")).toBeDefined()
  })

  it("renders the same content, plus the admin-only hard-delete CTA, without throwing at fontScale=1.5", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    mockRole.current = "admin"
    const { getByText } = await renderScreen(makeHutang())
    expect(getByText("Tambah Pembayaran")).toBeDefined()
    expect(getByText("Hapus Hutang Permanen")).toBeDefined()
  })

  it("does not pin the 'Tambah Pembayaran' / hard-delete buttons to a fixed height that would clip a wrapped label", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    mockRole.current = "admin"
    const { getByText } = await renderScreen(makeHutang())

    for (const label of ["Tambah Pembayaran", "Hapus Hutang Permanen"]) {
      const textNode = getByText(label)
      const btn = findStyledAncestor(textNode) // the TouchableOpacity (or its styled host wrapper)
      expect(btn).toBeTruthy()
      const flatStyle = [btn!.props.style].flat()
      const height = flatStyle.map((s) => s?.height).find((v) => v !== undefined)
      const minHeight = flatStyle.map((s) => s?.minHeight).find((v) => v !== undefined)
      expect(height).toBeUndefined()
      expect(minHeight).toBe(52)
    }
  })
})
