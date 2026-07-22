import { PixelRatio } from "react-native"
import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { VersionFooter } from "./VersionFooter"
import { mockInsets, ZERO_INSETS, THREE_BUTTON_NAV_INSETS } from "../../test/mockSafeAreaInsets"

jest.mock("expo-updates", () => ({
  updateId: null,
  createdAt: null,
}))

jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Updates = require("expo-updates")

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("VersionFooter", () => {
  it("always shows the release constant", () => {
    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("Lavender Ops · v1.0.4")).toBeDefined()
  })

  // D-1b (v1.0.4, `[by-Farrel]`): a diagnostic line so Mom's next screenshot tells us her real
  // device fontScale and bottom inset instead of us inferring both. Removed next release.
  it("shows the device's reported fontScale and bottom inset", () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    mockInsets(THREE_BUTTON_NAV_INSETS)
    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("fontScale 1.5 · inset 48")).toBeDefined()
  })

  it("reflects a zero inset and default fontScale (AC-5/BR-5 no-regression baseline)", () => {
    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("fontScale 1 · inset 0")).toBeDefined()
  })

  it("shows 'bawaan' when running the bundle embedded in the APK", () => {
    Updates.updateId = null
    Updates.createdAt = null

    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("pembaruan bawaan")).toBeDefined()
  })

  it("shows the short update id and date when running an OTA update", () => {
    Updates.updateId = "a1b2c3d4-5e6f-7890-abcd-ef1234567890"
    Updates.createdAt = new Date(2026, 6, 12)

    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("pembaruan a1b2c3d · 12 Juli 2026")).toBeDefined()
  })
})
