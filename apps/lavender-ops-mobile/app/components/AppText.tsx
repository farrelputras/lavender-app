// PRD-5 BR-4/BR-8 — "the rules live in the shared text/layout primitives ... so a new screen
// inherits correct behavior rather than re-introducing the defect."
//
// This is the single definition site for the app's text-scale clamp (v1.0.4 re-gate, Option 4,
// `[by-Farrel]`). `Text`/`TextInput` here are an *API-identical passthrough* over RN's own
// components — same name, same props, same ref type — so adopting them anywhere in the app is
// an **import-line redirect**, not a JSX change:
//
//   - import { Text, TextInput } from "react-native"
//   + import { Text, TextInput } from "@/components/AppText"
//
// Every existing `<Text>`/`<TextInput>` tag keeps working exactly as written. `no-restricted-imports`
// already bans importing the raw versions from "react-native" outside this file, so a new screen
// that forgets to redirect fails lint today — no new rule needed.
//
// Explicitly NOT Ignite's `components/Text.tsx` / `TextField.tsx` (dead code outside
// ErrorDetails.tsx, v1.0.4 discovery F-2): that component has a different props API
// (`preset`/`tx`/`weight`/`size`) and its `TextField` sibling is not a drop-in for the 38 bespoke
// `TextInput`s in this app — swapping to it would be a BR-5 visual regression.
//
// Two things this passthrough must get right that a naive version would miss (verified before
// adoption, v1.0.4 kill-criteria):
//
// 1. Nested `<Text>` inside `<Text>` must still inherit style the way RN's raw nesting does —
//    true here because this wrapper renders one native `Text` host node per tag, same as RN's
//    own, so nesting is structurally identical (see AppText.test.tsx).
// 2. RN's `TextInput` (and `Text`) are *classes*, so the bare identifier is usable both as a
//    value (the component) and as a type (a ref's instance type, e.g.
//    `useRef<TextInput>(null)`). A `const TextInput = forwardRef(...)` alone is only a value —
//    any site typing a ref against the raw import (found at `PilihUserScreen.tsx`,
//    `UserScreen.tsx`, `SearchField.tsx`'s `Ref<TextInput>`) would stop compiling the moment its
//    import redirects. The `export type` lines below restore that dual meaning.
import { forwardRef } from "react"
// eslint-disable-next-line no-restricted-imports -- this IS the wrapper `no-restricted-imports` points callers at
import { Text as RNText, TextInput as RNTextInput, type TextProps as RNTextProps, type TextInputProps as RNTextInputProps } from "react-native"

/**
 * The one supported maximum effective text-scale multiplier for the whole app (PRD-5 BR-4).
 * `[by-Farrel]`: deliberately an over-cap — MIUI's "XL" is a slider label, not a number, and
 * under-capping would shrink Mom's text and read as the app fighting her. `1.5` sits above every
 * value MIUI's ladder is reported to reach.
 */
export const MAX_FONT_SCALE = 1.5

export const Text = forwardRef<RNText, RNTextProps>(function Text(
  { maxFontSizeMultiplier = MAX_FONT_SCALE, ...rest },
  ref,
) {
  return <RNText ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} />
})
export type Text = RNText

export const TextInput = forwardRef<RNTextInput, RNTextInputProps>(function TextInput(
  { maxFontSizeMultiplier = MAX_FONT_SCALE, ...rest },
  ref,
) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} />
})
export type TextInput = RNTextInput
