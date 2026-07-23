// Tester-authored (v1.0.4) — HutangFormScreen had zero test coverage before this file.
//
// What this proves: the screen (search + user-picker list, `RupiahInput`, notes field, and the
// shared `BottomActionBar`) mounts and renders without throwing at `fontScale = MAX_FONT_SCALE`,
// and that the scroll content's bottom padding is `useBottomSpace()`-driven rather than a second,
// independently-computed number (PRD-4 AC-3/AC-5 — "the scroll must grow by exactly as much [as
// the bar], not by a second, separately-computed amount", per the release report's own framing of
// this screen).
//
// It does NOT prove `RupiahInput`'s fixed-height row (see the dedicated fixedHeightTextRow audit)
// is visually safe inside this screen's `FieldCard` at 1.5x on a device.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

const mockGetUserSummaries = jest.fn()
const mockCreateManualHutang = jest.fn()
jest.mock("@/services/rentals", () => ({
  getUserSummaries: (...args: unknown[]) => mockGetUserSummaries(...args),
  createManualHutang: (...args: unknown[]) => mockCreateManualHutang(...args),
}))

import { PixelRatio } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import type { UserSummary } from "@/services/rentals/types"

import { HutangFormScreen } from "./HutangFormScreen"
import { mockInsets, THREE_BUTTON_NAV_INSETS, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

const user: UserSummary = {
  id: "u1",
  name: "Budi Santoso",
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
}

function renderScreen() {
  return render(
    <HutangFormScreen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal nav stub
      navigation={{ goBack: jest.fn(), replace: jest.fn() } as any}
      route={{ params: undefined, key: "k", name: "HutangForm" } as any}
    />,
  )
}

beforeEach(() => {
  mockGetUserSummaries.mockReset().mockResolvedValue([user])
  mockCreateManualHutang.mockReset()
  mockInsets(ZERO_INSETS)
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("HutangFormScreen — renders without throwing at MAX_FONT_SCALE (PRD-5 AC-5 audit surface)", () => {
  it("renders the form and BottomActionBar at fontScale=1", async () => {
    const { getByText } = renderScreen()
    await waitFor(() => expect(getByText("Budi Santoso")).toBeDefined())
    expect(getByText("Hutang Baru")).toBeDefined()
    expect(getByText("Simpan")).toBeDefined()
  })

  it("renders the same content without throwing at fontScale=1.5 (MAX_FONT_SCALE)", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    const { getByText } = renderScreen()
    await waitFor(() => expect(getByText("Budi Santoso")).toBeDefined())
    expect(getByText("Simpan")).toBeDefined()
  })
})

describe("HutangFormScreen — scroll padding grows by exactly the shared bottom-space delta (PRD-4 AC-3/AC-5)", () => {
  function scrollPaddingBottom(utils: ReturnType<typeof renderScreen>): number {
    const { ScrollView } = require("react-native")
    const scroll = utils.UNSAFE_getByType(ScrollView)
    const flat = require("react-native").StyleSheet.flatten(scroll.props.contentContainerStyle)
    return flat.paddingBottom
  }

  it("uses 160 as the zero-inset scroll floor — matches the pre-v1.0.4 flat value", async () => {
    mockInsets(ZERO_INSETS)
    const utils = renderScreen()
    await waitFor(() => expect(utils.getByText("Hutang Baru")).toBeDefined())
    expect(scrollPaddingBottom(utils)).toBe(160)
  })

  it("grows by exactly the device's reported inset — the same delta the BottomActionBar itself grows by", async () => {
    mockInsets(THREE_BUTTON_NAV_INSETS)
    const utils = renderScreen()
    await waitFor(() => expect(utils.getByText("Hutang Baru")).toBeDefined())
    expect(scrollPaddingBottom(utils)).toBe(160 + THREE_BUTTON_NAV_INSETS.bottom)
  })
})
