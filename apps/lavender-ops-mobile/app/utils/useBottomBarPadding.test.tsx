jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

// LAVENDER ships Android-only (CLAUDE.md), but jest-expo's default preset (this project doesn't
// opt into `getAndroidPreset`) resolves `Platform.select` to its **iOS** implementation always,
// regardless of `Platform.OS` — confirmed by reading the resolved source directly:
// `node_modules/react-native/Libraries/Utilities/Platform.ios.js`'s `select` is
// `'ios' in spec ? spec.ios : ... spec.default` unconditionally; it doesn't read `.OS` at all.
// Haste picks that file over `Platform.android.js` per `haste.defaultPlatform: 'ios'` in
// `node_modules/react-native/jest-preset.js`, at module-resolution time — no in-test mutation
// of `Platform.OS` can change which file was already loaded. v1.0.4 discovery: no prior test in
// this codebase asserted on `Platform.select` output, so this gap was never exercised before.
//
// Mocking the whole `"react-native"` package (`{...jest.requireActual("react-native"), Platform:
// ...}`) does NOT work and must not be attempted again: `requireActual`'s spread forces every
// lazy getter on RN's `index.js` to evaluate eagerly (`DevMenu`, `Clipboard`, the deprecated
// `SafeAreaView` re-export, ...), and `DevMenu` throws under jest ("TurboModuleRegistry standard
// module... could not be found") — confirmed by trying it. The reliable fix is to mock only the
// exact resolved submodule, by its platform-suffixed filename, with the ESM interop shape it's
// actually loaded with (`export default Platform` → `{ __esModule: true, default: {...} }`).
jest.mock("react-native/Libraries/Utilities/Platform.ios", () => ({
  __esModule: true,
  default: {
    OS: "android",
    select: (spec: Record<string, unknown>) => spec.android ?? spec.default,
  },
}))

import { renderHook } from "@testing-library/react-native"

import { useBottomBarPadding } from "./useBottomBarPadding"
import { mockInsets, THREE_BUTTON_NAV_INSETS, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

describe("useBottomBarPadding", () => {
  describe("on Android (the only platform LAVENDER ships)", () => {
    it("matches the pre-v1.0.4 flat Android padding at zero inset — the no-regression guard", () => {
      mockInsets(ZERO_INSETS)
      const { result } = renderHook(() => useBottomBarPadding())
      expect(result.current).toBe(16) // spacing.base
    })

    it("grows by exactly the device's reported inset on top of that base", () => {
      mockInsets(THREE_BUTTON_NAV_INSETS)
      const { result } = renderHook(() => useBottomBarPadding())
      expect(result.current).toBe(16 + 48) // spacing.base + THREE_BUTTON_NAV_INSETS.bottom
    })
  })

  // No "on iOS" suite here: `jest.mock("react-native", ...)` above is file-global (hoisted
  // once), so it can't be flipped per-`describe` block to exercise the other `Platform.select`
  // branch in the same file. LAVENDER ships Android-only (CLAUDE.md) — that's what's under
  // test. iOS correctness (PRD-4 BR-6: "preserved or improved, never lost") rests on the same
  // `base + useBottomSpace()` formula and the same `Platform.select` call a real iOS device
  // resolves natively (not on anything mocked here); it is not separately asserted by this
  // suite. Flagged in the delivery report as a known, deliberate test gap, not a silent one.
})
