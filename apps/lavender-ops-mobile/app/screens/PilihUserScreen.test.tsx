// Tester-authored (v1.0.4) — PilihUserScreen had zero test coverage before this file. It is
// step 1 of the Sewa Baru flow and carries its own "Langkah 1 dari 3 · Pilih User" step header —
// structurally identical to PilihKendaraanScreen's and DetailSewaScreen's headers (headlineSm
// title + labelMd subtitle in a `flex: 1`, no-fixed-height `titleBlock`), which the release
// report confirms were audited and found already-correct. This screen's header was not named
// individually in the report; this file checks it holds the same safe shape.
//
// What this proves: the screen mounts and renders without throwing at `fontScale =
// MAX_FONT_SCALE`, that its step header has no fixed height / no numberOfLines cap, and that the
// user-row name (PRD-5 BR-1, D-7 — `numberOfLines` removed) is not truncated. It does NOT prove
// the header/list actually looks right at 1.5x on a device.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

jest.mock("@react-navigation/native", () => ({
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

import { PilihUserScreen } from "./PilihUserScreen"
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

function renderScreen() {
  return render(
    <PilihUserScreen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal nav/route stub
      navigation={{ navigate: jest.fn(), setParams: jest.fn() } as any}
      route={{ params: undefined, key: "k", name: "PilihUser" } as any}
    />,
  )
}

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockGetUserSummaries.mockReset()
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("PilihUserScreen — renders without throwing at MAX_FONT_SCALE (PRD-5 AC-5 audit surface)", () => {
  it("renders the step header and list at fontScale=1", async () => {
    mockGetUserSummaries.mockResolvedValue([makeUser()])
    const { getByText } = renderScreen()
    await waitFor(() => expect(getByText("Sewa Baru")).toBeDefined())
    expect(getByText("Langkah 1 dari 3 · Pilih User")).toBeDefined()
  })

  it("renders the same content, including a long customer name, without throwing at fontScale=1.5", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    mockGetUserSummaries.mockResolvedValue([makeUser()])
    const { getByText } = renderScreen()
    await waitFor(() => expect(getByText("Sewa Baru")).toBeDefined())
    expect(getByText("Muhammad Alexander Firmansyah Putra Wibisono")).toBeDefined()
  })

  it("step header (title + 'Langkah 1 dari 3') has no fixed height and no line cap — same safe shape as the other two step headers", async () => {
    mockGetUserSummaries.mockResolvedValue([makeUser()])
    const { getByText } = renderScreen()
    await waitFor(() => expect(getByText("Sewa Baru")).toBeDefined())

    const title = getByText("Sewa Baru")
    const subtitle = getByText("Langkah 1 dari 3 · Pilih User")
    expect(title.props.numberOfLines).toBeUndefined()
    expect(subtitle.props.numberOfLines).toBeUndefined()

    // titleBlock is the shared parent — must be flex-based (no pinned height).
    const titleBlock = title.parent
    const flatStyle = [titleBlock!.props.style].flat()
    const height = flatStyle.map((s) => s?.height).find((v) => v !== undefined)
    expect(height).toBeUndefined()
  })

  it("does not truncate the user row name (PRD-5 BR-1 / D-7)", async () => {
    mockGetUserSummaries.mockResolvedValue([makeUser()])
    const { getByText } = renderScreen()
    await waitFor(() => expect(getByText("Sewa Baru")).toBeDefined())

    const nameNode = getByText("Muhammad Alexander Firmansyah Putra Wibisono")
    expect(nameNode.props.numberOfLines).toBeUndefined()
  })
})
