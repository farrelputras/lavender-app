// Tester-authored (v1.0.4) — LoginScreen had zero test coverage before this file. It is one of
// the 14 screens in the PRD-5 AC-5 audit surface and the one screen that (accidentally) already
// reserved the full safe-area inset before v1.0.4 (`edges={["top","right","bottom","left"]}`,
// C-2 in the release report).
//
// What this file proves: the screen mounts and renders its controls without throwing when the
// device reports `PixelRatio.getFontScale() === MAX_FONT_SCALE` (1.5) — i.e. AppText's default
// `maxFontSizeMultiplier` reaches every `<Text>`/`<TextInput>` on this screen without a runtime
// error. It does NOT prove the screen *looks* correct at 1.5x — jest's renderer does not perform
// real text layout/measurement, so wrapping, overflow, and truncation at 1.5x are not observable
// here. That is why the visual-audit checklist still carries a LoginScreen row.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

// `react-native-keyboard-controller`'s native module isn't linked under jest (no prior test in
// this codebase rendered LoginScreen, so this gap was never hit before). `KeyboardAwareScrollView`
// only needs to behave like a plain scroll container for this suite's purposes.
jest.mock("react-native-keyboard-controller", () => {
  const { ScrollView } = require("react-native")
  return { KeyboardAwareScrollView: ScrollView }
})

const mockSignIn = jest.fn()
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}))

import { PixelRatio } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { LoginScreen } from "./LoginScreen"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockSignIn.mockReset()
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
})

describe("LoginScreen — renders without throwing at MAX_FONT_SCALE (PRD-5 AC-5 audit surface)", () => {
  it("renders the title, both fields, and the submit button at fontScale=1", () => {
    const { getByText } = render(<LoginScreen />)
    expect(getByText("Lavender Ops")).toBeDefined()
    expect(getByText("Email")).toBeDefined()
    expect(getByText("Password")).toBeDefined()
    expect(getByText("Masuk")).toBeDefined()
  })

  it("renders the same controls without throwing when the device reports fontScale=1.5 (MAX_FONT_SCALE)", () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    const { getByText } = render(<LoginScreen />)
    expect(getByText("Lavender Ops")).toBeDefined()
    expect(getByText("Masuk")).toBeDefined()
  })

  it("still calls signIn with trimmed email + raw password after filling the form at fontScale=1.5 — the AppText redirect changes no behavior", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.5)
    mockSignIn.mockResolvedValue(undefined)
    const { getByText, UNSAFE_getAllByType } = render(<LoginScreen />)

    const inputs = UNSAFE_getAllByType(require("react-native").TextInput)
    fireEvent.changeText(inputs[0], "  mom@lavender.test ")
    fireEvent.changeText(inputs[1], "secret123")
    fireEvent.press(getByText("Masuk"))

    await Promise.resolve()
    expect(mockSignIn).toHaveBeenCalledWith("mom@lavender.test", "secret123")
  })
})
