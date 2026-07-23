// Tester-authored (v1.0.4) — UserDetailScreen had zero test coverage before this file.
//
// What this proves: the screen (hero, stat cards, photo row, info cards, and the three
// full-width action buttons — WhatsApp / Hapus User / Hapus Permanen) mounts and renders without
// throwing at `fontScale = MAX_FONT_SCALE` (PRD-5 AC-5 audit surface).
//
// It also proves PRD-5 BR-1 for those three buttons: `whatsappBtn`/`deleteBtn`/`hardDeleteBtn`
// use `minHeight: 52` (grows to fit content) rather than a fixed `height` that would clip — the
// D-8 fix applied by ⑦, gated by the sub-test below (rewritten in D-9 to assert the BR-1-correct
// shape instead of the pre-fix defect it originally documented).
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

const mockGetUser = jest.fn()
const mockGetUserSummary = jest.fn()
jest.mock("@/services/rentals", () => ({
  getUser: (...args: unknown[]) => mockGetUser(...args),
  getUserSummary: (...args: unknown[]) => mockGetUserSummary(...args),
  softDeleteUser: jest.fn(),
  hardDeleteUser: jest.fn(),
}))

import { PixelRatio } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import type { User, UserSummary } from "@/services/rentals/types"

import { UserDetailScreen } from "./UserDetailScreen"
import { findStyledAncestor } from "../../test/findStyledAncestor"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

function makeUser(overrides: Partial<User> = {}): User {
  return {
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
    alamat: null,
    kontakDarurat: null,
    notes: null,
    profilPhoto: null,
    ktpPhoto: null,
    ktmPhoto: null,
    ...overrides,
  } as User
}

const summary: UserSummary = {
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

async function renderScreen(user: User) {
  mockGetUser.mockResolvedValue(user)
  mockGetUserSummary.mockResolvedValue(summary)
  const utils = render(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal nav/route stub
    <UserDetailScreen
      navigation={{ goBack: mockGoBack, navigate: mockNavigate } as any}
      route={{ params: { userId: user.id }, key: "k", name: "UserDetail" } as any}
    />,
  )
  await waitFor(() => expect(utils.getByText("Detail User")).toBeDefined())
  return utils
}

beforeEach(() => {
  mockRole.current = "ops"
  mockGetUser.mockReset()
  mockGetUserSummary.mockReset()
  mockInsets(ZERO_INSETS)
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("UserDetailScreen — renders without throwing at MAX_FONT_SCALE (PRD-5 AC-5 audit surface)", () => {
  it("renders the hero, stats, and action buttons at fontScale=1", async () => {
    const { getByText } = await renderScreen(makeUser())
    expect(getByText("Budi Santoso")).toBeDefined()
    expect(getByText("WhatsApp")).toBeDefined()
  })

  it("renders the same content, including the admin-only permanent-delete CTA, without throwing at fontScale=1.5", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    mockRole.current = "admin"
    const { getByText } = await renderScreen(makeUser())
    expect(getByText("Hapus Permanen")).toBeDefined()
  })

  describe("PRD-5 BR-1 — action buttons grow to fit, they don't clip (D-8 fix, applied by ⑦)", () => {
    it("'WhatsApp' / 'Hapus User' / 'Hapus Permanen' use minHeight (grows to fit content), not a fixed height that would clip", async () => {
      jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
      mockRole.current = "admin"
      const { getByText } = await renderScreen(makeUser())

      for (const label of ["WhatsApp", "Hapus User", "Hapus Permanen"]) {
        const textNode = getByText(label)
        const btn = findStyledAncestor(textNode) // the TouchableOpacity's styled host wrapper
        expect(btn).toBeTruthy()
        const flat = require("react-native").StyleSheet.flatten(btn!.props.style)
        // BR-1: "fixed heights that clip text are not acceptable; controls grow to fit their
        // content." D-8 (this release) fixed all three buttons to `minHeight: 52` +
        // `paddingVertical` + a shrinkable label, matching the already-fixed Beranda/Hutang CTA
        // pattern. Assert the BR-1-correct shape directly: minHeight present, fixed height absent.
        expect(flat.minHeight).toBe(52)
        expect(flat.height).toBeUndefined()
      }
    })
  })
})
