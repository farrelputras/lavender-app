// Tester-authored (v1.0.4) — UserFormScreen had zero test coverage before this file.
//
// What this proves: the screen (identity/status/contact FieldCards, PhotoSlot row, and the
// shared BottomActionBar) mounts and renders without throwing at `fontScale = MAX_FONT_SCALE`,
// and that its scroll padding is `useBottomSpace()`-driven (PRD-4 AC-3/AC-5) rather than a
// second, independently-computed number.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

const mockCreateUser = jest.fn()
jest.mock("@/services/rentals", () => ({
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  getUser: jest.fn(),
  updateUser: jest.fn(),
}))

const mockChoosePhotoSource = jest.fn()
jest.mock("@/services/photos/capture", () => ({
  choosePhotoSource: (...args: unknown[]) => mockChoosePhotoSource(...args),
}))

import { PixelRatio } from "react-native"
import { render } from "@testing-library/react-native"

import { UserFormScreen } from "./UserFormScreen"
import { mockInsets, THREE_BUTTON_NAV_INSETS, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

function renderScreen() {
  return render(
    <UserFormScreen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal nav stub
      navigation={{ goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn() } as any}
      route={{ params: { mode: "create" }, key: "k", name: "UserForm" } as any}
    />,
  )
}

beforeEach(() => {
  mockCreateUser.mockReset()
  mockChoosePhotoSource.mockReset()
  mockInsets(ZERO_INSETS)
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("UserFormScreen — renders without throwing at MAX_FONT_SCALE (PRD-5 AC-5 audit surface)", () => {
  it("renders the create-mode form and BottomActionBar at fontScale=1", () => {
    const { getByText } = renderScreen()
    expect(getByText("User Baru")).toBeDefined()
    expect(getByText("Simpan")).toBeDefined()
    expect(getByText("Nama Lengkap *")).toBeDefined()
  })

  it("renders the same content without throwing at fontScale=1.5 (MAX_FONT_SCALE)", () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    const { getByText } = renderScreen()
    expect(getByText("User Baru")).toBeDefined()
    expect(getByText("Simpan")).toBeDefined()
  })
})

describe("UserFormScreen — scroll padding grows by exactly the shared bottom-space delta (PRD-4 AC-3/AC-5)", () => {
  function scrollPaddingBottom(utils: ReturnType<typeof renderScreen>): number {
    const { ScrollView, StyleSheet } = require("react-native")
    const scroll = utils.UNSAFE_getByType(ScrollView)
    return StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom
  }

  it("uses 160 as the zero-inset scroll floor — matches the pre-v1.0.4 flat value", () => {
    mockInsets(ZERO_INSETS)
    const utils = renderScreen()
    expect(scrollPaddingBottom(utils)).toBe(160)
  })

  it("grows by exactly the device's reported inset", () => {
    mockInsets(THREE_BUTTON_NAV_INSETS)
    const utils = renderScreen()
    expect(scrollPaddingBottom(utils)).toBe(160 + THREE_BUTTON_NAV_INSETS.bottom)
  })
})
