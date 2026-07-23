// Tester-authored (v1.0.4) — companion to AppText.clampAudit.acceptance.test.ts (static source
// checks) and the developer's own AppText.test.tsx (isolated behavior). This file proves one more
// thing neither of those does: that the clamp AppText supplies is a **hardcoded constant**, not
// something computed from the device's own reported font scale. If it read
// `PixelRatio.getFontScale()` internally, an OS scale far above 1.5 could in principle still leak
// through (e.g. via a `Math.min` bug, or a future edit that swaps the constant for a dynamic
// read). Proving the prop's value is unaffected by an extreme mocked device scale is the closest
// a jest render can get to PRD-5 AC-7 ("no further growth beyond it") — the actual enforcement of
// the cap happens in native code, which jest does not execute, so this does not prove real
// pixel-level font size on a device; it proves the JS-side contract AppText sends to native never
// changes with the device's own scale.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

import { PixelRatio } from "react-native"
import { render } from "@testing-library/react-native"

import { MAX_FONT_SCALE, Text } from "./AppText"

describe("AppText Text — the clamp is a constant, not derived from the device's own font scale", () => {
  it("still sends maxFontSizeMultiplier=1.5 when the device reports an extreme fontScale (3.0)", () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(3.0)
    const { getByText } = render(<Text>Hello</Text>)
    expect(getByText("Hello").props.maxFontSizeMultiplier).toBe(MAX_FONT_SCALE)
  })

  it("still sends maxFontSizeMultiplier=1.5 when the device reports fontScale=1 (no scaling requested)", () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1)
    const { getByText } = render(<Text>Hello</Text>)
    expect(getByText("Hello").props.maxFontSizeMultiplier).toBe(MAX_FONT_SCALE)
  })
})
