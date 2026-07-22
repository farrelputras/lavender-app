// Reusable fixtures + setter for mocking `useSafeAreaInsets()` at specific values in unit
// tests (v1.0.4, PRD-4). Jest hoists `jest.mock(...)` calls to the top of whichever file calls
// them, so that declaration cannot be centralized here — it must appear, verbatim, in every
// consuming test file (see the snippet below). What this module centralizes is everything that
// *can* be shared: the insets fixtures, so every test in the suite agrees on what "no inset"
// and "a real device inset" mean, and the one-line call that sets the mock's return value.
//
// Usage in a test file:
//
//   jest.mock("react-native-safe-area-context", () => ({
//     ...jest.requireActual("react-native-safe-area-context"),
//     useSafeAreaInsets: jest.fn(),
//   }))
//
//   import { ZERO_INSETS, THREE_BUTTON_NAV_INSETS, mockInsets } from "../../test/mockSafeAreaInsets"
//
//   it("...", () => {
//     mockInsets(ZERO_INSETS)
//     // render / renderHook ...
//   })
//
// The `jest.mock` factory above must come before any `import` of the component/hook under test
// (or be hoisted by Babel, which it is, as long as it's a top-level call in the test file).
import type { EdgeInsets } from "react-native-safe-area-context"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/** No system inset at all — the AC-5/BR-5 no-regression baseline (PRD-4). Every screen must
 * render byte-for-byte as it does today when this is what the device reports. */
export const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 }

/**
 * A representative non-zero bottom inset — the exact value the v1.0.4 implementation brief
 * specifies for the "device reports an inset" test case (mock at `{bottom: 0}` and
 * `{bottom: 48}`). This is a fixed, spec-mandated test fixture, not a measurement of Mom's
 * actual Poco M3 — that reading doesn't exist yet (see the PRD-5 diagnostic footer line).
 */
export const THREE_BUTTON_NAV_INSETS: EdgeInsets = { top: 0, bottom: 48, left: 0, right: 0 }

/**
 * Sets what the next render sees from `useSafeAreaInsets()`. Requires the caller's own
 * `jest.mock("react-native-safe-area-context", ...)` declaration — see the file header.
 */
export function mockInsets(insets: EdgeInsets): void {
  ;(useSafeAreaInsets as jest.Mock).mockReturnValue(insets)
}
