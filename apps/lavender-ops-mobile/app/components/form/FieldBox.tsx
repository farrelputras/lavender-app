import { ReactNode } from "react"
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native"

import { colors, borderRadius, spacing } from "@/theme/tokens"

export interface FieldBoxProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * The editable-field container (PRD-8). Wraps any input or picker row.
 *
 * Convention: **boxed = Mom can change this; plain = she can't.** Two states only
 * (BR-10/D-8) — there is no disabled/locked third state. Full rule: docs/field-box-convention.md.
 *
 * BR-4's three categories — every element on a screen is exactly one of:
 *   - **Field** — a value the user enters or picks that gets *recorded* → wears this box.
 *   - **Control** — an element whose own shape already declares interactivity and does not
 *     display a stored value as plain text (`Stepper`, `PhotoRow`/`PhotoSlot`, `Switch`,
 *     `SearchField`, buttons) → exempt; must never be styled as a read-only value.
 *   - **Read-only value** — a displayed value the user cannot change here → plain row, never
 *     a box. The signal is the *presence* of the box, not the absence of one (BR-2).
 *
 * **BR-6/AC-6 — this is the ONE declaration site** under `app/` of the box's border colour,
 * fill, radius and `minHeight`. Nothing else may redeclare that set. A consumer that needs a
 * variant (e.g. an error-state border) *composes* via the `style` prop — it does not carry its
 * own copy (see `RupiahInput`, which consumes this instead of declaring its own box).
 *
 * Tokens (BR-3, D-1): border = `colors.outline` — NOT `outlineVariant`, which measures 1.63:1
 * against this fill and is **retired from field borders** (it remains correct for dividers).
 * Fill = `colors.surface` (`#f6faff`). Radius = `borderRadius.default` (12).
 *
 * BR-8: `minHeight`, never `height` — fixed heights give way, so the box grows rather than
 * clips at larger text scale (PRD-5) instead of clipping the content it wraps.
 *
 * BR-5: after this PRD, the app's tint (`surfaceContainerLow`) carries **no meaning about
 * editability, in either direction** — do not read a tinted block as a signal.
 *
 * Known exceptions (BR-11, recorded in `docs/field-box-convention.md`): `LoginScreen` (not an
 * operational data-entry surface — the session persists, so Mom sees it rarely) and
 * `DetailSewaScreen` (fenced tariff composition, debt #4).
 *
 * It is a container, not an input: it wraps a `TextInput`, a date/time row, or a rupiah row
 * without imposing an API on any of them.
 */
export function FieldBox({ children, style }: FieldBoxProps) {
  return <View style={[styles.box, style]}>{children}</View>
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
})
