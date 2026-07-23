// Tester-authored (v1.0.4) — PRD-5 BR-1: "Fixed-height controls are the mechanism behind the
// clipping. Wherever a fixed height forces text to clip, the height gives way — not the text."
//
// The release report's own discovery pass (F-10) named `SearchField`'s fixed `height: 48` row as
// "the highest-leverage single target in PRD-5" — one fix helps the four screens that use it
// (Rental, PilihUser, PilihKendaraan, User). `git diff 193697f..HEAD` confirms `SearchField.tsx`
// and `RupiahInput.tsx` (the other shared "icon/label + scalable TextInput in a fixed-height row"
// primitive, used by HutangForm/UserForm and, via the rental screens, by DetailSewa/Pengembalian)
// received ONLY an import-line redirect — the fixed height was never addressed.
//
// What this test proves: both components' outer row is still a fixed `height`, not `minHeight` —
// an objective, source-level fact matching the exact pattern PRD-5 BR-1 names as unacceptable.
// What it does NOT prove: that the TextInput's content is actually visually clipped at 1.5x on a
// device. RN's default `overflow: 'visible'` on a View means a taller child is not truncated by a
// fixed-height sibling — it visually overflows the row instead (which can look just as broken,
// e.g. spilling past the pill's rounded background, but is a different failure mode than
// clipping). That distinction can only be settled by looking at the two components on a device at
// 1.5x, which is why both are also carried on the visual-audit checklist.
//
// Governing instruction: derive "correct" from the PRD, not the implementation. These assertions
// are expected to FAIL against the current code — that is the finding, and this file must not be
// edited to make it pass; only a product-code fix does that (out of scope for the Tester).
import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { RupiahInput } from "./RupiahInput"
import { SearchField } from "./SearchField"
import { findStyledAncestor } from "../../../test/findStyledAncestor"

// `.parent` one hop up from the TextInput lands on AppText's own forwardRef wrapper (whose
// `style` prop is the *input's* style, e.g. SearchField's `styles.input`/`{flex:1,padding:0}` —
// no height at all), not the outer row — so a single `.parent` hop would falsely "pass" this
// check for the wrong reason. `findStyledAncestor` walks up until it finds the ancestor whose
// flattened style actually declares a `height`/`minHeight`, which is the row this PRD-5 BR-1
// check is actually about.

describe("SearchField — PRD-5 BR-1: the search pill must not pin a fixed height around a scalable TextInput", () => {
  it("does not set a fixed `height` on its container (expected to fail — F-10, unaddressed)", () => {
    const { getByPlaceholderText } = render(
      <ThemeProvider>
        <SearchField value="" onChangeText={jest.fn()} placeholder="Cari..." />
      </ThemeProvider>,
    )
    const input = getByPlaceholderText("Cari...")
    const container = findStyledAncestor(input) // SearchField's outer `<View style={styles.container}>`
    expect(container).not.toBeNull()
    const flat = require("react-native").StyleSheet.flatten(container!.props.style)
    expect(flat.height).toBeUndefined()
  })
})

describe("RupiahInput — PRD-5 BR-1: the 'Rp' row must not pin a fixed height around a scalable TextInput", () => {
  it("does not set a fixed `height` on its container (expected to fail — same unaddressed pattern as SearchField)", () => {
    const { getByDisplayValue } = render(
      <ThemeProvider>
        <RupiahInput value="50000" onChangeText={jest.fn()} />
      </ThemeProvider>,
    )
    const input = getByDisplayValue("50000")
    const container = findStyledAncestor(input) // RupiahInput's outer `<View style={styles.row}>`
    expect(container).not.toBeNull()
    const flat = require("react-native").StyleSheet.flatten(container!.props.style)
    expect(flat.height).toBeUndefined()
  })
})
