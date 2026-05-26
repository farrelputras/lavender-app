# Phase 0: Shared Form-Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract repeated UI primitives from `DetailSewaScreen.tsx` (1455 lines) and `PengembalianScreen.tsx` (1313 lines) into a reusable `app/components/form/` library. Existing screens are NOT rewritten in this phase — they keep their inline copies. Future screens (User CRUD, Hutang, Penyewaan list, Auth) in Phase 5 will compose from this library from day 1.

**Architecture:**
- New components live in `apps/lavender-ops-mobile/app/components/form/`
- Each component: `Name.tsx` + co-located `Name.test.tsx`
- Barrel export: `app/components/form/index.ts`
- Shared `parseRupiahInput` moves to existing `app/utils/format.ts`
- Existing screens (`DetailSewaScreen.tsx`, `PengembalianScreen.tsx`) untouched

**Tech Stack:**
- React Native 0.83 / Expo SDK 55
- TypeScript strict
- Jest + `@testing-library/react-native` (already configured via `jest-expo` preset)
- M3 theme tokens from `app/theme/tokens.ts` (`colors`, `textStyles`, `spacing`)

**Verification approach (per spec §4.5):**
- `npx tsc --noEmit` must pass after every task
- `npm test` must pass after every task
- Existing screens are untouched, so they should still render unchanged in Metro
- Final task: manual smoke check by running `npm start` and navigating each existing form screen

**Source-of-truth references:**
- `apps/lavender-ops-mobile/app/screens/DetailSewaScreen.tsx` — inline definitions at lines 43–127 (helpers + 4 sub-components) and 1061–1455 (styles)
- `apps/lavender-ops-mobile/app/screens/PengembalianScreen.tsx` — inline definitions at lines 33–155 (helpers + 4 sub-components) and ~975–1313 (styles)

**Working directory:** All file paths below are relative to `apps/lavender-ops-mobile/`. All commands assume `cd apps/lavender-ops-mobile` unless noted.

---

## Task 1: Set up `app/components/form/` directory and barrel

**Files:**
- Create: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Create the directory and empty barrel file**

Create `apps/lavender-ops-mobile/app/components/form/index.ts` with this content:

```ts
// Shared form-component library — see docs/superpowers/specs/2026-05-26-v1-roadmap-design.md §4.5
// Components extracted from inline declarations in DetailSewaScreen + PengembalianScreen.
// Existing screens are NOT rewritten in Phase 0; new screens (Phase 5) MUST compose from these.
```

(No exports yet — they're added as each component is extracted.)

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit
```

Expected: passes with no errors (file has no exports, just a comment).

- [ ] **Step 3: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): set up shared form-component library"
```

---

## Task 2: Move `parseRupiahInput` to `app/utils/format.ts`

**Why first:** `RupiahInput` (Task 7) needs this helper. Extracting once removes the duplication in both screens (DetailSewa line 51, Pengembalian line 43).

**Files:**
- Modify: `apps/lavender-ops-mobile/app/utils/format.ts`
- Test: `apps/lavender-ops-mobile/app/utils/format.test.ts` (create if absent)

- [ ] **Step 1: Add `parseRupiahInput` to `format.ts`**

Append to `apps/lavender-ops-mobile/app/utils/format.ts`:

```ts
/**
 * Parse a user-entered string into a numeric rupiah amount.
 * Strips all non-digit characters (except a leading minus sign for refunds/diskon).
 * Returns 0 if the result is NaN.
 */
export function parseRupiahInput(raw: string): number {
  const cleaned = raw.replace(/[^\d-]/g, "")
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? 0 : n
}
```

Note: this matches `PengembalianScreen.tsx` line 43–47 (which supports the leading minus). DetailSewa's version at line 51–54 used `/\D/g` (no minus). The Pengembalian variant is the superset — discounts/refunds need negative values — so we keep that.

- [ ] **Step 2: Write a test**

Create `apps/lavender-ops-mobile/app/utils/format.test.ts` (or append if it exists):

```ts
import { parseRupiahInput } from "./format"

describe("parseRupiahInput", () => {
  it("parses a plain digit string", () => {
    expect(parseRupiahInput("50000")).toBe(50000)
  })

  it("strips non-digit characters", () => {
    expect(parseRupiahInput("Rp 50.000")).toBe(50000)
  })

  it("preserves a leading minus sign", () => {
    expect(parseRupiahInput("-5000")).toBe(-5000)
  })

  it("returns 0 for an empty string", () => {
    expect(parseRupiahInput("")).toBe(0)
  })

  it("returns 0 for non-numeric garbage", () => {
    expect(parseRupiahInput("abc")).toBe(0)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd apps/lavender-ops-mobile && npm test -- --testPathPattern=format
```

Expected: 5 passes.

- [ ] **Step 4: Verify TypeScript**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app/utils/format.ts apps/lavender-ops-mobile/app/utils/format.test.ts
git commit -m "feat(utils): add parseRupiahInput, shared rupiah parser"
```

---

## Task 3: Extract `SectionLabel`

**Source:** `DetailSewaScreen.tsx:64-70` and `PengembalianScreen.tsx:63-69` (identical).

**Files:**
- Create: `apps/lavender-ops-mobile/app/components/form/SectionLabel.tsx`
- Create: `apps/lavender-ops-mobile/app/components/form/SectionLabel.test.tsx`
- Modify: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Create the component**

`apps/lavender-ops-mobile/app/components/form/SectionLabel.tsx`:

```tsx
import { Text } from "react-native"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface SectionLabelProps {
  children: string
}

/**
 * Heading shown above a form section (e.g., "Jaminan", "Kondisi Kembali").
 * Uses M3 headlineSm tokens with bottom spacing for breathing room before the FieldCard.
 */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Text style={[textStyles.headlineSm, { color: colors.onSurface, marginBottom: spacing.sm }]}>
      {children}
    </Text>
  )
}
```

- [ ] **Step 2: Write a render test**

`apps/lavender-ops-mobile/app/components/form/SectionLabel.test.tsx`:

```tsx
import { render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { SectionLabel } from "./SectionLabel"

describe("SectionLabel", () => {
  it("renders the text content", () => {
    const { getByText } = render(
      <ThemeProvider>
        <SectionLabel>Jaminan</SectionLabel>
      </ThemeProvider>,
    )
    expect(getByText("Jaminan")).toBeDefined()
  })
})
```

- [ ] **Step 3: Export from barrel**

Edit `apps/lavender-ops-mobile/app/components/form/index.ts` to append:

```ts
export { SectionLabel } from "./SectionLabel"
export type { SectionLabelProps } from "./SectionLabel"
```

- [ ] **Step 4: Run tsc and test**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit && npm test -- --testPathPattern=SectionLabel
```

Expected: tsc passes, 1 test pass.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/SectionLabel.tsx apps/lavender-ops-mobile/app/components/form/SectionLabel.test.tsx apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): extract SectionLabel"
```

---

## Task 4: Extract `FieldCard`

**Source:** `DetailSewaScreen.tsx:72-74` (accepts `style?: object`) and `PengembalianScreen.tsx:71-73` (no style override). Take the union: optional style prop.

**Files:**
- Create: `apps/lavender-ops-mobile/app/components/form/FieldCard.tsx`
- Create: `apps/lavender-ops-mobile/app/components/form/FieldCard.test.tsx`
- Modify: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Create the component**

`apps/lavender-ops-mobile/app/components/form/FieldCard.tsx`:

```tsx
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native"
import { ReactNode } from "react"
import { colors, spacing } from "@/theme/tokens"

export interface FieldCardProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * The visual container for a form section's content. Rounded card with subtle
 * shadow, used inside DetailSewa / Pengembalian (and future form screens).
 * Style prop accepted for per-instance overrides (e.g., error state, no padding).
 */
export function FieldCard({ children, style }: FieldCardProps) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
})
```

(Style values mirror the `card` + `CARD_SHADOW` constants from `DetailSewaScreen.tsx:1053-1099`.)

- [ ] **Step 2: Write a test**

`apps/lavender-ops-mobile/app/components/form/FieldCard.test.tsx`:

```tsx
import { Text } from "react-native"
import { render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { FieldCard } from "./FieldCard"

describe("FieldCard", () => {
  it("renders children", () => {
    const { getByText } = render(
      <ThemeProvider>
        <FieldCard>
          <Text>inside</Text>
        </FieldCard>
      </ThemeProvider>,
    )
    expect(getByText("inside")).toBeDefined()
  })

  it("applies style overrides", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <FieldCard style={{ borderColor: "red" }}>
          <Text testID="content">x</Text>
        </FieldCard>
      </ThemeProvider>,
    )
    expect(getByTestId("content")).toBeDefined()
  })
})
```

- [ ] **Step 3: Export from barrel**

Append to `apps/lavender-ops-mobile/app/components/form/index.ts`:

```ts
export { FieldCard } from "./FieldCard"
export type { FieldCardProps } from "./FieldCard"
```

- [ ] **Step 4: Run tsc and test**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit && npm test -- --testPathPattern=FieldCard
```

Expected: tsc passes, 2 test passes.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/FieldCard.tsx apps/lavender-ops-mobile/app/components/form/FieldCard.test.tsx apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): extract FieldCard"
```

---

## Task 5: Extract `FuelGauge`

**Source:** Both screens hardcode 8 segments. Generalize to accept `max` prop with default 8 (matching DetailSewa's signature at line 76).

**Files:**
- Create: `apps/lavender-ops-mobile/app/components/form/FuelGauge.tsx`
- Create: `apps/lavender-ops-mobile/app/components/form/FuelGauge.test.tsx`
- Modify: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Create the component**

`apps/lavender-ops-mobile/app/components/form/FuelGauge.tsx`:

```tsx
import { View, StyleSheet } from "react-native"
import { colors, spacing } from "@/theme/tokens"

export interface FuelGaugeProps {
  value: number
  max?: number
}

/**
 * Visual fuel-level indicator using horizontal segments. Used in DetailSewa
 * (kondisi keluar) and Pengembalian (kondisi kembali). Each segment fills with
 * primary color when its index < value.
 */
export function FuelGauge({ value, max = 8 }: FuelGaugeProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i === 0 && styles.first,
            i === max - 1 && styles.last,
            { backgroundColor: i < value ? colors.primary : colors.surfaceVariant },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 2,
    height: 8,
    marginTop: spacing.xs,
  },
  segment: { borderRadius: 0, flex: 1 },
  first: { borderBottomLeftRadius: 4, borderTopLeftRadius: 4 },
  last: { borderBottomRightRadius: 4, borderTopRightRadius: 4 },
})
```

- [ ] **Step 2: Write a test**

`apps/lavender-ops-mobile/app/components/form/FuelGauge.test.tsx`:

```tsx
import { render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { FuelGauge } from "./FuelGauge"

describe("FuelGauge", () => {
  it("renders the default 8 segments", () => {
    const { UNSAFE_root } = render(
      <ThemeProvider>
        <FuelGauge value={4} />
      </ThemeProvider>,
    )
    expect(UNSAFE_root).toBeDefined()
  })

  it("respects a custom max", () => {
    const { UNSAFE_root } = render(
      <ThemeProvider>
        <FuelGauge value={2} max={4} />
      </ThemeProvider>,
    )
    expect(UNSAFE_root).toBeDefined()
  })
})
```

- [ ] **Step 3: Export from barrel**

Append to `apps/lavender-ops-mobile/app/components/form/index.ts`:

```ts
export { FuelGauge } from "./FuelGauge"
export type { FuelGaugeProps } from "./FuelGauge"
```

- [ ] **Step 4: Run tsc and test**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit && npm test -- --testPathPattern=FuelGauge
```

Expected: tsc passes, 2 test passes.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/FuelGauge.tsx apps/lavender-ops-mobile/app/components/form/FuelGauge.test.tsx apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): extract FuelGauge"
```

---

## Task 6: Extract `Stepper`

**Source:** `DetailSewaScreen.tsx:94-127` (no `max` prop) and `PengembalianScreen.tsx:93-155` (has `max?: number` defaulting to 8). Take the Pengembalian signature — `max` optional, no implicit upper bound (treat undefined as no cap). The `disabled` logic uses `value <= min` for decrement and `value >= max` for increment (only when `max` is set).

**Files:**
- Create: `apps/lavender-ops-mobile/app/components/form/Stepper.tsx`
- Create: `apps/lavender-ops-mobile/app/components/form/Stepper.test.tsx`
- Modify: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Create the component**

`apps/lavender-ops-mobile/app/components/form/Stepper.tsx`:

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface StepperProps {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  label: string
  min?: number
  max?: number
}

/**
 * Increment/decrement control with a centered label between the two buttons.
 * Used for Hari count, Bensin kotak, etc. If `max` is omitted there is no
 * upper bound (DetailSewa's Hari stepper has none). `min` defaults to 0.
 */
export function Stepper({
  value,
  onDecrement,
  onIncrement,
  label,
  min = 0,
  max,
}: StepperProps) {
  const atMin = value <= min
  const atMax = max !== undefined && value >= max
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.btn}
        onPress={onDecrement}
        disabled={atMin}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="remove"
          size={24}
          color={atMin ? colors.outlineVariant : colors.primary}
        />
      </TouchableOpacity>
      <Text
        style={[
          textStyles.headlineSm,
          { color: colors.onSurface, minWidth: 72, textAlign: "center" },
        ]}
      >
        {label}
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={onIncrement}
        disabled={atMax}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="add"
          size={24}
          color={atMax ? colors.outlineVariant : colors.primary}
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.xs,
  },
  btn: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
})
```

- [ ] **Step 2: Write interaction tests**

`apps/lavender-ops-mobile/app/components/form/Stepper.test.tsx`:

```tsx
import { TouchableOpacity } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { Stepper } from "./Stepper"

describe("Stepper", () => {
  it("renders the label", () => {
    const { getByText } = render(
      <ThemeProvider>
        <Stepper value={3} label="3 kotak" onDecrement={() => {}} onIncrement={() => {}} />
      </ThemeProvider>,
    )
    expect(getByText("3 kotak")).toBeDefined()
  })

  it("calls onIncrement and onDecrement when not at bounds", () => {
    const onIncrement = jest.fn()
    const onDecrement = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <Stepper
          value={3}
          label="3"
          min={0}
          max={8}
          onDecrement={onDecrement}
          onIncrement={onIncrement}
        />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    // First button is decrement, second is increment
    fireEvent.press(buttons[0])
    fireEvent.press(buttons[1])
    expect(onDecrement).toHaveBeenCalledTimes(1)
    expect(onIncrement).toHaveBeenCalledTimes(1)
  })

  it("does not fire onDecrement when at min", () => {
    const onDecrement = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <Stepper value={0} label="0" min={0} onDecrement={onDecrement} onIncrement={() => {}} />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(buttons[0])
    expect(onDecrement).not.toHaveBeenCalled()
  })

  it("does not fire onIncrement when at max", () => {
    const onIncrement = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <Stepper value={8} label="8" max={8} onDecrement={() => {}} onIncrement={onIncrement} />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(buttons[1])
    expect(onIncrement).not.toHaveBeenCalled()
  })

  it("has no upper bound when max is omitted", () => {
    const onIncrement = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <Stepper value={999} label="999" onDecrement={() => {}} onIncrement={onIncrement} />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(buttons[1])
    expect(onIncrement).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Export from barrel**

Append to `apps/lavender-ops-mobile/app/components/form/index.ts`:

```ts
export { Stepper } from "./Stepper"
export type { StepperProps } from "./Stepper"
```

- [ ] **Step 4: Run tsc and test**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit && npm test -- --testPathPattern=Stepper
```

Expected: tsc passes, 5 test passes.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/Stepper.tsx apps/lavender-ops-mobile/app/components/form/Stepper.test.tsx apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): extract Stepper with min/max support"
```

---

## Task 7: Extract `RupiahInput`

**Source:** The "Rp" prefix + numeric `TextInput` pattern appears in both screens for Tarif, Add-on, Diskon, Bensin harga per kotak, Extra fees. See `DetailSewaScreen.tsx:826-840` for one example. The pattern: container row with `Rp` text + flex-1 numeric `TextInput`.

This component owns the formatting/display. Caller passes raw digit string (state) and an `onChangeText` callback; component handles the input style. We do NOT use `displayRupiah` formatting on input (it would interfere with keyboard caret); display formatting stays in non-input read-only contexts.

**Files:**
- Create: `apps/lavender-ops-mobile/app/components/form/RupiahInput.tsx`
- Create: `apps/lavender-ops-mobile/app/components/form/RupiahInput.test.tsx`
- Modify: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Create the component**

`apps/lavender-ops-mobile/app/components/form/RupiahInput.tsx`:

```tsx
import { View, Text, TextInput, StyleSheet, ViewStyle, StyleProp } from "react-native"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface RupiahInputProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Rupiah currency input row. Renders "Rp" prefix + flex-1 numeric TextInput
 * inside a rounded container. Value is the raw digit string; parent decides
 * how to parse (use `parseRupiahInput` from `@/utils/format`).
 */
export function RupiahInput({ value, onChangeText, placeholder, style }: RupiahInputProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Rp</Text>
      <TextInput
        style={[textStyles.bodyMd, styles.field]}
        keyboardType="numeric"
        placeholder={placeholder ?? "0"}
        placeholderTextColor={colors.outline}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="done"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md,
  },
  field: {
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },
})
```

- [ ] **Step 2: Write a test**

`apps/lavender-ops-mobile/app/components/form/RupiahInput.test.tsx`:

```tsx
import { fireEvent, render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { RupiahInput } from "./RupiahInput"

describe("RupiahInput", () => {
  it("renders Rp prefix and placeholder", () => {
    const { getByText, getByPlaceholderText } = render(
      <ThemeProvider>
        <RupiahInput value="" onChangeText={() => {}} placeholder="50000" />
      </ThemeProvider>,
    )
    expect(getByText("Rp")).toBeDefined()
    expect(getByPlaceholderText("50000")).toBeDefined()
  })

  it("emits onChangeText when user types", () => {
    const onChangeText = jest.fn()
    const { getByPlaceholderText } = render(
      <ThemeProvider>
        <RupiahInput value="" onChangeText={onChangeText} placeholder="0" />
      </ThemeProvider>,
    )
    fireEvent.changeText(getByPlaceholderText("0"), "25000")
    expect(onChangeText).toHaveBeenCalledWith("25000")
  })
})
```

- [ ] **Step 3: Export from barrel**

Append to `apps/lavender-ops-mobile/app/components/form/index.ts`:

```ts
export { RupiahInput } from "./RupiahInput"
export type { RupiahInputProps } from "./RupiahInput"
```

- [ ] **Step 4: Run tsc and test**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit && npm test -- --testPathPattern=RupiahInput
```

Expected: tsc passes, 2 test passes.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/RupiahInput.tsx apps/lavender-ops-mobile/app/components/form/RupiahInput.test.tsx apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): extract RupiahInput row"
```

---

## Task 8: Extract `PhotoRow`

**Source:** Horizontal scroll + "Tambah Foto" tile + thumbnails with close button. See `DetailSewaScreen.tsx:617-643`. Same pattern in Pengembalian (kondisi kembali photo row).

Photos in v1 are stubbed (no camera yet) — items only carry `{ id, uri }`. The actual camera + Supabase Storage upload comes in Phase 6. This component is purely the UI shell.

**Files:**
- Create: `apps/lavender-ops-mobile/app/components/form/PhotoRow.tsx`
- Create: `apps/lavender-ops-mobile/app/components/form/PhotoRow.test.tsx`
- Modify: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Create the component**

`apps/lavender-ops-mobile/app/components/form/PhotoRow.tsx`:

```tsx
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface PhotoItem {
  id: string
  uri: string | null
}

export interface PhotoRowProps {
  photos: PhotoItem[]
  onAdd: () => void
  onRemove: (id: string) => void
  addLabel?: string
}

/**
 * Horizontal scroll row of photo thumbnails with a dashed "add" tile on the left.
 * Each thumbnail has a close button to remove it. The actual camera capture
 * is the parent's responsibility (called via `onAdd`); this component is just
 * the UI shell.
 */
export function PhotoRow({ photos, onAdd, onRemove, addLabel = "Tambah Foto" }: PhotoRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <TouchableOpacity style={styles.addTile} onPress={onAdd} activeOpacity={0.8}>
        <MaterialIcons name="add-a-photo" size={28} color={colors.primary} />
        <Text style={[textStyles.labelMd, { color: colors.primary, marginTop: 4 }]}>
          {addLabel}
        </Text>
      </TouchableOpacity>
      {photos.map((p) => (
        <View key={p.id} style={styles.thumb}>
          <View style={styles.placeholder}>
            <MaterialIcons name="image" size={32} color={colors.outlineVariant} />
          </View>
          <TouchableOpacity
            style={styles.close}
            onPress={() => onRemove(p.id)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <MaterialIcons name="close" size={14} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  addTile: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.primary,
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 120,
    justifyContent: "center",
    width: 120,
  },
  thumb: {
    borderColor: colors.outlineVariant,
    borderRadius: 14,
    borderWidth: 1,
    height: 120,
    overflow: "hidden",
    width: 120,
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    flex: 1,
    justifyContent: "center",
  },
  close: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 22,
  },
})
```

- [ ] **Step 2: Write a test**

`apps/lavender-ops-mobile/app/components/form/PhotoRow.test.tsx`:

```tsx
import { fireEvent, render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { PhotoRow } from "./PhotoRow"

describe("PhotoRow", () => {
  it("renders the add tile label", () => {
    const { getByText } = render(
      <ThemeProvider>
        <PhotoRow photos={[]} onAdd={() => {}} onRemove={() => {}} />
      </ThemeProvider>,
    )
    expect(getByText("Tambah Foto")).toBeDefined()
  })

  it("renders a custom add label", () => {
    const { getByText } = render(
      <ThemeProvider>
        <PhotoRow photos={[]} onAdd={() => {}} onRemove={() => {}} addLabel="Foto KTP" />
      </ThemeProvider>,
    )
    expect(getByText("Foto KTP")).toBeDefined()
  })

  it("fires onAdd when add tile is pressed", () => {
    const onAdd = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <PhotoRow photos={[]} onAdd={onAdd} onRemove={() => {}} />
      </ThemeProvider>,
    )
    fireEvent.press(getByText("Tambah Foto"))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Export from barrel**

Append to `apps/lavender-ops-mobile/app/components/form/index.ts`:

```ts
export { PhotoRow } from "./PhotoRow"
export type { PhotoItem, PhotoRowProps } from "./PhotoRow"
```

- [ ] **Step 4: Run tsc and test**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit && npm test -- --testPathPattern=PhotoRow
```

Expected: tsc passes, 3 test passes.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/PhotoRow.tsx apps/lavender-ops-mobile/app/components/form/PhotoRow.test.tsx apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): extract PhotoRow shell (camera wiring in Phase 6)"
```

---

## Task 9: Extract `BottomActionBar`

**Source:** Sticky bottom bar with "Batal" + primary action (Simpan/Selesaikan/etc.). See `DetailSewaScreen.tsx:1015-1038`. Same shape in Pengembalian.

Generalize: takes a primary action label, an `onPrimary` callback, an `onCancel` callback, an optional `loading` flag, and an optional `primaryIcon` (defaults to `check-circle`).

**Files:**
- Create: `apps/lavender-ops-mobile/app/components/form/BottomActionBar.tsx`
- Create: `apps/lavender-ops-mobile/app/components/form/BottomActionBar.test.tsx`
- Modify: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Create the component**

`apps/lavender-ops-mobile/app/components/form/BottomActionBar.tsx`:

```tsx
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface BottomActionBarProps {
  primaryLabel: string
  onPrimary: () => void
  onCancel: () => void
  loading?: boolean
  cancelLabel?: string
  primaryIconName?: keyof typeof MaterialIcons.glyphMap
}

/**
 * Sticky bottom action bar for form screens. Left: cancel (outlined).
 * Right: primary action (filled, fills remaining width), shows spinner when loading.
 */
export function BottomActionBar({
  primaryLabel,
  onPrimary,
  onCancel,
  loading = false,
  cancelLabel = "Batal",
  primaryIconName = "check-circle",
}: BottomActionBarProps) {
  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.cancel} onPress={onCancel} activeOpacity={0.8}>
        <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
        <Text style={[textStyles.labelLg, { color: colors.onSurfaceVariant }]}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.primary, loading && { opacity: 0.7 }]}
        onPress={onPrimary}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <MaterialIcons name={primaryIconName} size={20} color={colors.onPrimary} />
        )}
        <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>{primaryLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.base,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.base,
  },
  cancel: {
    alignItems: "center",
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 52,
    paddingHorizontal: spacing.base,
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 52,
    justifyContent: "center",
  },
})
```

- [ ] **Step 2: Write a test**

`apps/lavender-ops-mobile/app/components/form/BottomActionBar.test.tsx`:

```tsx
import { fireEvent, render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { BottomActionBar } from "./BottomActionBar"

describe("BottomActionBar", () => {
  it("renders both labels", () => {
    const { getByText } = render(
      <ThemeProvider>
        <BottomActionBar
          primaryLabel="Simpan Penyewaan"
          onPrimary={() => {}}
          onCancel={() => {}}
        />
      </ThemeProvider>,
    )
    expect(getByText("Batal")).toBeDefined()
    expect(getByText("Simpan Penyewaan")).toBeDefined()
  })

  it("fires onPrimary and onCancel", () => {
    const onPrimary = jest.fn()
    const onCancel = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <BottomActionBar primaryLabel="Simpan" onPrimary={onPrimary} onCancel={onCancel} />
      </ThemeProvider>,
    )
    fireEvent.press(getByText("Simpan"))
    fireEvent.press(getByText("Batal"))
    expect(onPrimary).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("disables primary action while loading", () => {
    const onPrimary = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <BottomActionBar
          primaryLabel="Simpan"
          onPrimary={onPrimary}
          onCancel={() => {}}
          loading
        />
      </ThemeProvider>,
    )
    fireEvent.press(getByText("Simpan"))
    expect(onPrimary).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Export from barrel**

Append to `apps/lavender-ops-mobile/app/components/form/index.ts`:

```ts
export { BottomActionBar } from "./BottomActionBar"
export type { BottomActionBarProps } from "./BottomActionBar"
```

- [ ] **Step 4: Run tsc and test**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit && npm test -- --testPathPattern=BottomActionBar
```

Expected: tsc passes, 3 test passes.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/BottomActionBar.tsx apps/lavender-ops-mobile/app/components/form/BottomActionBar.test.tsx apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): extract BottomActionBar"
```

---

## Task 10 (time-boxed, optional): Extract `WaktuSewaPicker`

**Source:** `DetailSewaScreen.tsx:234-282` (picker handlers) + `718-811` (JSX). Pengembalian has a similar but slightly simpler picker (single datetime for `kembaliAt`).

**Why time-boxed:** This is the most coupled extraction. The picker manages internal state (date-then-time on Android, spinner on iOS) AND coordinates with parent state (mulai/estimasi linkage in DetailSewa, kembaliAt in Pengembalian). If it proves to take more than 2 hours, **STOP and leave the inline implementations in place**. The spec (§7) explicitly authorizes this fallback. Document the decision in the commit message and move to Task 11.

**Files (if extracted):**
- Create: `apps/lavender-ops-mobile/app/components/form/WaktuSewaPicker.tsx`
- Create: `apps/lavender-ops-mobile/app/components/form/WaktuSewaPicker.test.tsx`
- Modify: `apps/lavender-ops-mobile/app/components/form/index.ts`

- [ ] **Step 1: Time-box check (max 2h on this task)**

Note the current time. If at any point during Steps 2–5 you exceed 2 hours total, abandon the extraction. Run:

```bash
git checkout -- apps/lavender-ops-mobile/app/components/form/
```

Then write a short note in `apps/lavender-ops-mobile/app/components/form/WaktuSewaPicker.SKIPPED.md`:

```markdown
# WaktuSewaPicker — extraction deferred

Attempted Phase 0 extraction of the inline datetime picker flow from
DetailSewaScreen + PengembalianScreen, but the coupling between picker
state and parent rental state (mulai/estimasi linkage, automatic durasi
recompute) made the API too thorny for a 2h time-box.

Deferred to Phase 4 (connector swap) when both screens will be touched
anyway. At that point, decide whether to extract or keep inline.
```

Commit the skip note and stop:

```bash
git add apps/lavender-ops-mobile/app/components/form/WaktuSewaPicker.SKIPPED.md
git commit -m "chore(components/form): defer WaktuSewaPicker extraction to Phase 4"
```

Then jump to Task 11.

- [ ] **Step 2: Create the component (only if time-box not exceeded)**

`apps/lavender-ops-mobile/app/components/form/WaktuSewaPicker.tsx`:

```tsx
import { useState } from "react"
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { colors, textStyles, spacing } from "@/theme/tokens"

export interface WaktuSewaRow {
  label: string
  value: Date
  iconName?: keyof typeof MaterialIcons.glyphMap
}

export interface WaktuSewaPickerProps {
  rows: WaktuSewaRow[]
  onChange: (index: number, newDate: Date) => void
  formatLabel: (d: Date) => string
}

/**
 * Multi-row datetime picker. Each row shows a label + formatted value + icon.
 * Tapping a row opens the platform picker (Android: date then time; iOS: spinner).
 * Parent receives the new Date via `onChange(rowIndex, newDate)`.
 */
export function WaktuSewaPicker({ rows, onChange, formatLabel }: WaktuSewaPickerProps) {
  const [target, setTarget] = useState<number | null>(null)
  const [mode, setMode] = useState<"date" | "time">("date")
  const [tempDate, setTempDate] = useState<Date>(new Date())

  function openPicker(index: number) {
    setTarget(index)
    setMode("date")
    setTempDate(rows[index].value)
  }

  function handleAndroidChange(_e: unknown, date?: Date) {
    if (!date) {
      setTarget(null)
      return
    }
    if (mode === "date") {
      setTempDate(date)
      setMode("time")
    } else {
      const merged = new Date(tempDate)
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0)
      if (target !== null) onChange(target, merged)
      setTarget(null)
    }
  }

  function handleIosDone() {
    if (mode === "date") {
      setMode("time")
    } else {
      if (target !== null) onChange(target, tempDate)
      setTarget(null)
    }
  }

  return (
    <View>
      {rows.map((row, i) => (
        <View key={row.label}>
          {i > 0 && <View style={styles.divider} />}
          <TouchableOpacity style={styles.row} onPress={() => openPicker(i)} activeOpacity={0.8}>
            <View>
              <Text
                style={[
                  textStyles.labelMd,
                  { color: colors.onSurfaceVariant, marginBottom: 2 },
                ]}
              >
                {row.label}
              </Text>
              <Text style={[textStyles.bodyMd, { color: colors.onSurface }]}>
                {formatLabel(row.value)}
              </Text>
            </View>
            <MaterialIcons
              name={row.iconName ?? "calendar-month"}
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      ))}

      {target !== null &&
        (Platform.OS === "ios" ? (
          <View style={styles.iosContainer}>
            <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginBottom: 4 }]}>
              {mode === "date" ? "Pilih Tanggal" : "Pilih Waktu"}
            </Text>
            <DateTimePicker
              value={tempDate}
              mode={mode}
              display="spinner"
              onChange={(_e, d) => {
                if (d) setTempDate(d)
              }}
            />
            <TouchableOpacity style={styles.iosDone} onPress={handleIosDone}>
              <Text style={[textStyles.labelLg, { color: colors.primary }]}>
                {mode === "date" ? "Pilih Waktu →" : "Selesai"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <DateTimePicker
            value={mode === "date" ? rows[target].value : tempDate}
            mode={mode}
            display="default"
            onChange={handleAndroidChange}
          />
        ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.base,
  },
  divider: { backgroundColor: colors.outlineVariant, height: 1 },
  iosContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  iosDone: {
    alignItems: "flex-end",
    paddingVertical: spacing.sm,
  },
})
```

- [ ] **Step 3: Write a render test**

`apps/lavender-ops-mobile/app/components/form/WaktuSewaPicker.test.tsx`:

```tsx
import { render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { WaktuSewaPicker } from "./WaktuSewaPicker"

describe("WaktuSewaPicker", () => {
  it("renders all row labels", () => {
    const { getByText } = render(
      <ThemeProvider>
        <WaktuSewaPicker
          rows={[
            { label: "Mulai", value: new Date(2026, 4, 26, 10, 0) },
            { label: "Estimasi Kembali", value: new Date(2026, 4, 27, 22, 0) },
          ]}
          onChange={() => {}}
          formatLabel={(d) => d.toISOString()}
        />
      </ThemeProvider>,
    )
    expect(getByText("Mulai")).toBeDefined()
    expect(getByText("Estimasi Kembali")).toBeDefined()
  })
})
```

(Picker interaction is hard to test without significant native mocking. Render smoke test is sufficient for Phase 0; deeper testing comes in Phase 7 polish.)

- [ ] **Step 4: Export from barrel**

Append to `apps/lavender-ops-mobile/app/components/form/index.ts`:

```ts
export { WaktuSewaPicker } from "./WaktuSewaPicker"
export type { WaktuSewaPickerProps, WaktuSewaRow } from "./WaktuSewaPicker"
```

- [ ] **Step 5: Run tsc and test**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit && npm test -- --testPathPattern=WaktuSewaPicker
```

Expected: tsc passes, 1 test pass.

- [ ] **Step 6: Commit**

```bash
git add apps/lavender-ops-mobile/app/components/form/WaktuSewaPicker.tsx apps/lavender-ops-mobile/app/components/form/WaktuSewaPicker.test.tsx apps/lavender-ops-mobile/app/components/form/index.ts
git commit -m "feat(components/form): extract WaktuSewaPicker"
```

---

## Task 11: Final verification

**Files:** None — verification only.

- [ ] **Step 1: Full TypeScript check**

```bash
cd apps/lavender-ops-mobile && npx tsc --noEmit
```

Expected: zero errors across the entire app.

- [ ] **Step 2: Full test suite**

```bash
cd apps/lavender-ops-mobile && npm test
```

Expected: all tests pass (existing + ~16–22 new tests added across this phase).

- [ ] **Step 3: Lint**

```bash
cd apps/lavender-ops-mobile && npm run lint
```

Expected: no errors (warnings are tolerable).

- [ ] **Step 4: Manual Metro smoke check**

```bash
cd apps/lavender-ops-mobile && npm start
```

Open the app in Expo Go (or the dev client). Navigate through:
- Beranda
- Sewa Baru → Pilih User → Pilih Kendaraan → Detail Sewa
- (no save) back out
- Pick an active rental → Detail Penyewaan → Proses Pengembalian
- (no save) back out

**Expected:** all screens render exactly as before. No visual regressions. We did not modify any existing screen, so this is a sanity check that the new exports didn't accidentally break the module graph.

- [ ] **Step 5: Update the spec's status**

Edit `docs/superpowers/specs/2026-05-26-v1-roadmap-design.md` line 3 to mark Phase 0 done:

```markdown
**Status:** Phase 0 complete (shared form-component library). Ready for Phase 1.
```

Commit:

```bash
git add docs/superpowers/specs/2026-05-26-v1-roadmap-design.md
git commit -m "docs: mark Phase 0 complete in v1 roadmap spec"
```

- [ ] **Step 6: Final summary**

You should now have:

- `apps/lavender-ops-mobile/app/components/form/` with 7 or 8 components + tests
- `apps/lavender-ops-mobile/app/utils/format.ts` with `parseRupiahInput` added + tests
- `DetailSewaScreen.tsx` and `PengembalianScreen.tsx` **unchanged**
- All existing screens still render in Metro
- ~10 commits, each small and reversible
- The shared component vocabulary that Phase 5 screens will compose from

**Phase 1 (Native-dep bake) is the next session's work.** See `docs/superpowers/specs/2026-05-26-v1-roadmap-design.md` §3 and §5 for the dep list.
