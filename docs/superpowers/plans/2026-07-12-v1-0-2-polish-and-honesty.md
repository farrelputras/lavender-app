# v1.0.2 — Polish & Honesty — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1.0.2 to mom's phone as a pure OTA update — fix the visible UI drift, remove every dead-end button, show her which version she is running, and extract the six duplicate `showToast` copies into one shared util.

**Architecture:** Five spec items, none of which touch the database, the connector layer, or the rental math. Two of them (the `SearchField` migration and the "Daftarkan User Baru" wire-up) require small *additive* extensions to shared code — two optional props on `SearchField`, and two optional navigation params — rather than behaviour-dropping swaps. Everything else is deletion or a new, independently-testable unit.

**Tech Stack:** Expo SDK 55 (dev-client) · React Native 0.83 · Ignite (React Navigation, **not** Expo Router) · TypeScript strict · Jest + `@testing-library/react-native` · EAS Update (OTA, channel `preview`).

**All paths below are relative to `apps/lavender-ops-mobile/`** unless stated otherwise.

## Global Constraints

These apply to **every** task. They are not optional and several are counter-intuitive.

1. **Do NOT bump `version` in `app.json`. It stays `"1.0.0"`.** Verified this session: `app.json` sets `"version": "1.0.0"` and `"runtimeVersion": { "policy": "appVersion" }`, and `app.config.ts` spreads `...config` so it inherits both. OTA updates are published *against the runtime version*. Mom's installed APK is runtime `1.0.0`. Bumping `version` would publish v1.0.2 against runtime `1.0.2`, and **she would silently stop receiving this and every future update** — no error, no signal. The displayed version comes from `app/config/release.ts` (Task 6) instead.
2. **No new file under `supabase/migrations/`.** This release has no database surface. If a task appears to need one, it is out of scope and belongs in v1.0.3.
3. **Do NOT refactor `DetailSewaScreen` or `PengembalianScreen`** beyond deleting their local `showToast` (Task 1). They are 48KB and 50KB, they contain the tariff composition and the fuel-adjustment/auto-debt math, their local copies of the shared form components **have already diverged** (`DetailSewa`'s local `FuelGauge` takes `max = 8`; `Pengembalian`'s takes no `max`), and no characterisation tests protect them. See `docs/known-technical-debt.md` #4.
4. **Do NOT enable `.throwOnError()`** on the Supabase client or sweep the ~24 connectors that `throw error` on a raw postgrest object. Out of scope (`known-technical-debt.md` #1).
5. **Never mock a Supabase failure as `new Error(...)` in a test.** Supabase returns errors as a **plain object** (`{message, details, hint, code}`), never an `Error` instance. This exact wrong mock hid a real bug through two green reviews. (No task in this plan mocks Supabase — but if you find yourself doing it, mock the plain-object shape.)
6. **Do NOT change any connector's name, parameters, or return type.** Signatures are a locked contract (`docs/02-demo-development.md` §3). No task here touches `app/services/`.
7. **All user-facing copy is Indonesian.** Mom does not read English. Preserve existing strings; write new ones in Indonesian.
8. **Do not introduce a new library.** Everything needed is already a dependency (`expo-updates` is already `~55.0.24`).
9. **Item 1 of the spec (text sizes) ships nothing.** It is blocked on mom's input. Do not invent work for it. There is no task for it in this plan, and that is correct.

**Verification gate — every task ends green on all three:**

```powershell
cd apps/lavender-ops-mobile
pnpm run compile   # tsc --noEmit
pnpm run lint      # eslint . --fix
pnpm test          # jest — 19 suites / 80 tests green as of v1.0.1
```

---

## File Structure

| File | Task | Responsibility |
|---|---|---|
| `app/utils/showToast.ts` | 1 | **Create.** The single toast helper. |
| `app/utils/showToast.test.ts` | 1 | **Create.** Proves Android and non-Android branches. |
| `app/screens/DetailSewaScreen.tsx` | 1 | Modify — delete local `showToast`, import shared. **Nothing else.** |
| `app/screens/PengembalianScreen.tsx` | 1 | Modify — delete local `showToast`, import shared. **Nothing else.** |
| `app/screens/PilihKendaraanScreen.tsx` | 1 | Modify — delete local `showToast`, import shared. |
| `app/screens/HutangScreen.tsx` | 2 | Modify — inline the chevron, delete the `chevron` style. |
| `app/components/form/SearchField.tsx` | 3 | Modify — add optional `onFocus` + `inputRef`; default `returnKeyType="search"`. |
| `app/components/form/SearchField.test.tsx` | 3 | **Create.** No test exists for this shared component today. |
| `app/screens/UserScreen.tsx` | 3 | Modify — adopt `SearchField`, delete `searchInputContainer`/`searchInput`. |
| `app/navigators/navigationTypes.ts` | 4 | Modify — `UserForm.returnTo`, `PilihUser.createdUserId`. |
| `app/screens/UserFormScreen.tsx` | 4 | Modify — honour `returnTo` after a create. |
| `app/screens/PilihUserScreen.tsx` | 3, 4 | Modify — adopt `SearchField`; wire the footer link; `useFocusEffect`; drop `showToast`. |
| `app/screens/RentalDetailScreen.tsx` | 1, 5 | Modify — import shared `showToast`; delete both Edit buttons + `inlineEditBtn` style. |
| `app/config/release.ts` | 6 | **Create.** The hand-maintained `RELEASE` constant. |
| `app/utils/format.ts` | 6 | Modify — add `formatDateLong`. |
| `app/utils/format.test.ts` | 6 | Modify — cover `formatDateLong`. |
| `app/components/VersionFooter.tsx` | 6 | **Create.** Renders release + update identity. Kept a component so it is testable — no screen tests exist in this repo. |
| `app/components/VersionFooter.test.tsx` | 6 | **Create.** Covers the OTA and embedded (`bawaan`) branches. |
| `app/screens/BerandaScreen.tsx` | 1, 6 | Modify — delete dead `showToast`, delete the bell, mount `<VersionFooter />`. |

**Deliberately NOT touched:** `app.json`, `app.config.ts`, `eas.json`, `supabase/migrations/`, `app/services/**`, `app/theme/tokens.ts`.

---

## Findings from this session that change the spec

Read these before starting. Each was verified by reading the code, and each contradicts a detail in `docs/releases/v1-0-2.md`.

1. **`showToast` migrates into 4 screens, not 6.** `BerandaScreen`'s copy (line 29) is **never called** — it is dead code, so that screen gets the function *deleted* with no import added. `PilihUserScreen`'s only call is the dead-end link at line 113, which Task 4 replaces with navigation — so it also ends with no import. The remaining four (`DetailSewaScreen`, `PengembalianScreen`, `PilihKendaraanScreen`, `RentalDetailScreen`) import the shared util.
2. **`SearchField` cannot express `PilihUserScreen`/`UserScreen` behaviour as written.** It has no `onFocus`, no `ref`, and no `returnKeyType`. Both screens drive an `isSearchMode`/`searchMode` state off `onFocus` and blur the input when "Batal" is tapped. Task 3 therefore **extends** `SearchField` with two optional props first. Dropping the search-mode behaviour to force a swap would be a regression.
3. **`inlineEditBtn` (`RentalDetailScreen.tsx:856`) is used *only* by the two Edit buttons** being deleted (lines 371 and 638). The spec says "keep the style if other sections use it" — they don't, so it gets deleted. `sectionHeader` is also used at line 421 and **stays**.
4. **The footer date reads "12 Juli 2026", not "12 Jul 2026".** The app has no abbreviated-month formatter and `format.ts` uses full Indonesian month names everywhere (`formatHeaderDate` → "Sabtu, 16 Mei 2026"). Matching the house convention beats matching the spec's ASCII mock-up.
5. **Confirmed by user, 2026-07-12:** after creating a customer mid-rental she **auto-advances to `PilihKendaraan`** with that customer selected (spec §3a's stated preference), and `PilihUserScreen` **switches to `useFocusEffect`** so the list is not stale when she backs into it.

---

## Task 1: Extract `showToast` to a shared util

Spec item 5. Purely mechanical, zero behaviour change, no rental-math surface. Do this first — it is the widest-reaching edit, and doing it before Tasks 4 and 5 means those tasks only *remove* code rather than fighting a merge.

**Files:**
- Create: `app/utils/showToast.ts`
- Create: `app/utils/showToast.test.ts`
- Modify: `app/screens/DetailSewaScreen.tsx:46` (delete local fn, add import)
- Modify: `app/screens/PengembalianScreen.tsx:45` (delete local fn, add import)
- Modify: `app/screens/PilihKendaraanScreen.tsx:26` (delete local fn, add import)
- Modify: `app/screens/RentalDetailScreen.tsx:44` (delete local fn, add import)
- Modify: `app/screens/PilihUserScreen.tsx:26` (delete local fn, add import — the import is removed again in Task 4)
- Modify: `app/screens/BerandaScreen.tsx:29-35` (delete dead local fn, **no import added**)

**Interfaces:**
- Produces: `showToast(msg: string): void` exported from `@/utils/showToast`. Tasks 4 and 5 delete call-sites of it; no other task changes its signature.

- [ ] **Step 1: Write the failing test**

Create `app/utils/showToast.test.ts`:

```ts
import { Platform, ToastAndroid, Alert } from "react-native"

import { showToast } from "./showToast"

describe("showToast", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("uses a native Android toast on Android", () => {
    Platform.OS = "android"
    const spy = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {})

    showToast("Rental tersimpan")

    expect(spy).toHaveBeenCalledWith("Rental tersimpan", ToastAndroid.SHORT)
  })

  it("falls back to an alert off Android", () => {
    Platform.OS = "ios"
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {})

    showToast("Rental tersimpan")

    expect(spy).toHaveBeenCalledWith("", "Rental tersimpan")
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

```powershell
cd apps/lavender-ops-mobile
pnpm test -- showToast
```

Expected: FAIL — `Cannot find module './showToast'`.

- [ ] **Step 3: Write the implementation**

Create `app/utils/showToast.ts`. This is byte-for-byte the body of the six local copies — do not "improve" it:

```ts
import { Platform, ToastAndroid, Alert } from "react-native"

/**
 * Brief, non-blocking confirmation message.
 *
 * Android gets a real toast; every other platform falls back to a titleless alert.
 * Extracted from six byte-identical local copies across the screens (v1.0.2, item 5).
 */
export function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert("", msg)
  }
}
```

- [ ] **Step 4: Run it and confirm it passes**

```powershell
pnpm test -- showToast
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Migrate the four screens that still call `showToast`**

For **each** of `DetailSewaScreen.tsx`, `PengembalianScreen.tsx`, `PilihKendaraanScreen.tsx`, `RentalDetailScreen.tsx`, and also `PilihUserScreen.tsx`:

1. Delete the local `function showToast(msg: string) { … }` block (and the `// ─── Helpers ───` comment banner **only if** the function was the sole thing under it — in `PilihUserScreen` it is not; `groupByFirstLetter` stays).
2. Add the import, in the `@/`-prefixed import group, keeping the group alphabetised (ESLint enforces `import/order`):

```ts
import { showToast } from "@/utils/showToast"
```

3. Remove `Platform`, `ToastAndroid`, and `Alert` from the `react-native` import **only where nothing else in that file uses them**. `Alert` is used for confirmation dialogs in several of these screens — check each one with a search before removing it. `pnpm run lint` will fail on an unused import, so this is enforced.

**In `RentalDetailScreen.tsx`, do not touch anything else.** Its lines 370 and 637 still call `showToast("Akan segera tersedia")` at this point; Task 5 deletes them.

**In `DetailSewaScreen.tsx` and `PengembalianScreen.tsx`, do not touch anything else at all.** Delete the function, add the import, adjust the `react-native` import. Nothing more. These files contain the money math (Global Constraint 3).

- [ ] **Step 6: Delete the dead copy in `BerandaScreen.tsx`**

`BerandaScreen`'s `showToast` (lines 29–35) is **never called**. Delete the function and do **not** add an import. Then remove `Platform` and `ToastAndroid` from its `react-native` import — but **keep `Alert`**, which is used by `handleSignOut` at line 46.

The import block becomes:

```ts
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
```

- [ ] **Step 7: Verify no local copies remain**

```powershell
cd apps/lavender-ops-mobile
rg "^function showToast" app/screens/
```

Expected: **no output.**

```powershell
rg "showToast" app/ -l
```

Expected: `app/utils/showToast.ts`, `app/utils/showToast.test.ts`, and the five screens that import it (`DetailSewa`, `Pengembalian`, `PilihKendaraan`, `RentalDetail`, `PilihUser`). **Not** `BerandaScreen`.

- [ ] **Step 8: Full gate**

```powershell
pnpm run compile; pnpm run lint; pnpm test
```

Expected: compile clean, lint clean, **21 suites green** (19 existing + showToast; count rises again in Tasks 3 and 6).

- [ ] **Step 9: Commit**

```bash
git add app/utils/showToast.ts app/utils/showToast.test.ts app/screens/
git commit -m "refactor: extract showToast to app/utils (v1.0.2 item 5)

Six byte-identical local copies collapsed into one util. BerandaScreen's
copy was dead code and is deleted outright rather than migrated.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Fix the `HutangScreen` chevron overlap

Spec item 2.1. Self-contained; touches one file and no shared code.

The chevron is currently absolutely positioned at the card's top-right (`HutangScreen.tsx:216`) — exactly where `cardHeader` renders the "Dari rental" / "Manual" `StatusPill`. They collide. Every other list in the app (`UserScreen.tsx:90`, `PilihUserScreen.tsx:102`, `BerandaScreen.tsx:197`) renders the chevron as an **inline flex child**, last in a row.

**Files:**
- Modify: `app/screens/HutangScreen.tsx:54-59` (the chevron element), `:208-216` (styles)

**Interfaces:**
- Consumes: nothing. Produces: nothing. No other task depends on this.

- [ ] **Step 1: Move the chevron inside the card footer**

In `HutangCard`, the chevron is currently a sibling of `cardFooter`, absolutely positioned:

```tsx
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.sisaLabel}>Sisa</Text>
          {lunas ? ( … ) : ( … )}
        </View>
        <Text style={styles.awalText}>Awal {formatRupiah(h.jumlahAwal)}</Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={20}
        color={colors.outlineVariant}
        style={styles.chevron}
      />
    </TouchableOpacity>
```

Replace that with the chevron grouped alongside the "Awal" text as the footer's right-hand cluster:

```tsx
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.sisaLabel}>Sisa</Text>
          {lunas ? ( … ) : ( … )}
        </View>
        <View style={styles.cardFooterRight}>
          <Text style={styles.awalText}>Awal {formatRupiah(h.jumlahAwal)}</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.outlineVariant} />
        </View>
      </View>
    </TouchableOpacity>
```

Leave the `{lunas ? … : …}` block exactly as it is — it is elided above only for brevity.

- [ ] **Step 2: Swap the styles**

Delete the `chevron` entry and add `cardFooterRight`. In `StyleSheet.create` (~line 208), the `chevron` line to delete is:

```ts
  chevron: { position: "absolute", right: spacing.md, top: spacing.md },
```

Add, keeping the block's alphabetical-ish grouping with its neighbours:

```ts
  cardFooterRight: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
```

`cardFooter` itself is unchanged (`alignItems: "flex-end"`, `flexDirection: "row"`, `justifyContent: "space-between"`) — it now has two children instead of two-plus-an-overlay, so the right cluster sits flush right and the chevron is vertically centred against the "Awal" text.

- [ ] **Step 3: Verify the style is gone**

```powershell
cd apps/lavender-ops-mobile
rg "styles.chevron|chevron:" app/screens/HutangScreen.tsx
```

Expected: **no output.**

- [ ] **Step 4: Gate**

```powershell
pnpm run compile; pnpm run lint; pnpm test
```

Expected: all green. (ESLint's `react-native/no-unused-styles` would have caught a leftover `chevron` entry.)

- [ ] **Step 5: Commit**

```bash
git add app/screens/HutangScreen.tsx
git commit -m "fix: hutang card chevron no longer overlaps the status pill (v1.0.2 item 2.1)

The chevron was absolutely positioned top-right, where cardHeader already
renders the Dari rental/Manual pill. Now an inline flex child of the card
footer, matching every other list in the app.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Adopt `SearchField` in `UserScreen` and `PilihUserScreen`

Spec item 2.3. **This is not a pure swap** — read the finding below before writing code.

`SearchField` today accepts only `{ value, onChangeText, placeholder }`. But **both** screens being migrated need three things it does not have:

| Need | Used for | `SearchField` today |
|---|---|---|
| `onFocus` | entering search mode (`UserScreen.tsx:147`, `PilihUserScreen.tsx:202`) | ❌ |
| a `ref` to the `TextInput` | blurring on "Batal" (`UserScreen.tsx:162`, `PilihUserScreen.tsx:150`) | ❌ |
| `returnKeyType="search"` | `PilihUserScreen.tsx:203` only | ❌ |

So `SearchField` is **extended additively** first. The four existing callers (`HutangScreen:108`, `RentalScreen:123`, `PilihKendaraanScreen:204`, `HutangFormScreen:82`) pass none of the new props and are unaffected.

`returnKeyType="search"` is set as an internal default for *all* search fields rather than exposed as a prop — it is a search box, the keyboard's action key should say so, and that is exactly the kind of consistency this item exists to create.

**Files:**
- Modify: `app/components/form/SearchField.tsx`
- Create: `app/components/form/SearchField.test.tsx` (none exists today)
- Modify: `app/screens/UserScreen.tsx:134-168` (search row), `:1-16` (imports), `:266-276` (styles)
- Modify: `app/screens/PilihUserScreen.tsx:186-219` (search row), `:1-22` (imports), `:336-349` (styles)

**Interfaces:**
- Produces: the extended `SearchFieldProps`, relied on by both migrated screens:

```ts
export interface SearchFieldProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  onFocus?: () => void
  inputRef?: Ref<TextInput>
}
```

- [ ] **Step 1: Write the failing test**

Create `app/components/form/SearchField.test.tsx`. Note it renders inside `ThemeProvider`, matching `SectionLabel.test.tsx`:

```tsx
import { createRef } from "react"
import { TextInput } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { SearchField } from "./SearchField"

describe("SearchField", () => {
  it("calls onFocus when the input is focused", () => {
    const onFocus = jest.fn()
    const { getByPlaceholderText } = render(
      <ThemeProvider>
        <SearchField
          value=""
          onChangeText={jest.fn()}
          placeholder="Cari nama..."
          onFocus={onFocus}
        />
      </ThemeProvider>,
    )

    fireEvent(getByPlaceholderText("Cari nama..."), "focus")

    expect(onFocus).toHaveBeenCalledTimes(1)
  })

  it("forwards inputRef to the underlying TextInput so callers can blur it", () => {
    const ref = createRef<TextInput>()
    render(
      <ThemeProvider>
        <SearchField value="" onChangeText={jest.fn()} placeholder="Cari..." inputRef={ref} />
      </ThemeProvider>,
    )

    expect(ref.current).not.toBeNull()
    expect(typeof ref.current?.blur).toBe("function")
  })

  it("clears the value when the clear button is pressed", () => {
    const onChangeText = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <SearchField value="budi" onChangeText={onChangeText} />
      </ThemeProvider>,
    )

    // The clear button only renders when value is non-empty.
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])

    expect(onChangeText).toHaveBeenCalledWith("")
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

```powershell
cd apps/lavender-ops-mobile
pnpm test -- SearchField
```

Expected: FAIL — the `onFocus` and `inputRef` tests fail (props are ignored; `ref.current` is `null`). The clear-button test may already pass; that is fine, it is a regression guard.

- [ ] **Step 3: Extend `SearchField`**

Rewrite `app/components/form/SearchField.tsx`:

```tsx
import { Ref } from "react"
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

import { cardShadow, colors, textStyles, spacing } from "@/theme/tokens"

export interface SearchFieldProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  /** Called when the input gains focus — used by screens that have a "search mode". */
  onFocus?: () => void
  /** Forwarded to the underlying TextInput so callers can blur it (e.g. a "Batal" button). */
  inputRef?: Ref<TextInput>
}

/**
 * Pill-shaped search input — the one search control in the app.
 * Search icon on the left, clear button on the right once there is text.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder = "Cari...",
  onFocus,
  inputRef,
}: SearchFieldProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons
        name="search"
        size={20}
        color={colors.secondary}
        style={{ marginRight: spacing.sm }}
      />
      <TextInput
        ref={inputRef}
        style={[textStyles.bodyMd, styles.input]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.outlineVariant}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="close" size={20} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    flexDirection: "row",
    height: 48,
    paddingHorizontal: spacing.md,
    ...cardShadow,
  },
  input: { color: colors.onSurface, flex: 1, padding: 0 },
})
```

- [ ] **Step 4: Run it and confirm it passes**

```powershell
pnpm test -- SearchField
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Migrate `UserScreen`**

`SearchField`'s container has no `flex: 1`. `UserScreen`'s `searchRow` is `flexDirection: "row"` and shares space with the "Batal" button, so the field must be wrapped in a flexing `View`. (The four existing callers put `SearchField` in a *column* row wrapper, where it stretches for free — that is why they never needed this.)

Replace `UserScreen.tsx:134-168` — the whole `searchRow` block — with:

```tsx
      <View style={styles.searchRow}>
        <View style={styles.searchFieldWrap}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchMode(true)}
            placeholder="Cari nama atau panggilan..."
            inputRef={searchRef}
          />
        </View>
        {searchMode && (
          <TouchableOpacity
            onPress={() => {
              setQuery("")
              setSearchMode(false)
              searchRef.current?.blur()
            }}
          >
            <Text style={[textStyles.labelLg, { color: colors.primary }]}>Batal</Text>
          </TouchableOpacity>
        )}
      </View>
```

In the styles block: **delete** `searchInputContainer` and `searchInput`, and **add**:

```ts
  searchFieldWrap: { flex: 1 },
```

Then fix imports: `TextInput` is still needed (for the `useRef<TextInput>` type annotation at line 101), but `MaterialIcons` is still used by `UserRow`'s chevron and the FAB — leave it. Add:

```ts
import { SearchField } from "@/components/form/SearchField"
```

`CARD_SHADOW` (line 222) is still used by `card` — leave it.

> **Behavioural note:** the old clear button rendered on `searchMode && query.length > 0`; `SearchField`'s renders on `value.length > 0`. These are equivalent in practice — `query` can only become non-empty by typing, which requires focus, which sets `searchMode`. No regression.

- [ ] **Step 6: Migrate `PilihUserScreen`'s search row**

Replace `PilihUserScreen.tsx:186-219` — the `{/* Search bar */}` block — with:

```tsx
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchFieldWrap}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsSearchMode(true)}
            placeholder="Cari nama atau panggilan..."
            inputRef={searchInputRef}
          />
        </View>
        {isSearchMode && (
          <TouchableOpacity onPress={handleBatal}>
            <Text style={[textStyles.labelLg, { color: colors.primary }]}>Batal</Text>
          </TouchableOpacity>
        )}
      </View>
```

`handleBatal` (line 147) and `searchInputRef` (line 130) are unchanged and still work. **Delete** `handleClearQuery` (line 145) — `SearchField` owns clearing now, and an unused function fails lint.

In the styles block: **delete** `searchInputContainer` and `searchInput`, **add** `searchFieldWrap: { flex: 1 },`.

Add the import:

```ts
import { SearchField } from "@/components/form/SearchField"
```

> This screen's search box was `colors.surfaceContainer` with no shadow; `SearchField` is `colors.surfaceContainerLowest` with `cardShadow`. **That visual change is the point of the item** — it is what makes search look the same in every tab.

- [ ] **Step 7: Verify no hand-rolled search boxes remain**

```powershell
cd apps/lavender-ops-mobile
rg "searchInputContainer" app/
```

Expected: **no output.**

- [ ] **Step 8: Gate**

```powershell
pnpm run compile; pnpm run lint; pnpm test
```

Expected: all green, **22 suites**.

- [ ] **Step 9: Commit**

```bash
git add app/components/form/SearchField.tsx app/components/form/SearchField.test.tsx app/screens/UserScreen.tsx app/screens/PilihUserScreen.tsx
git commit -m "refactor: adopt shared SearchField in UserScreen and PilihUserScreen (v1.0.2 item 2.3)

SearchField gains two optional props (onFocus, inputRef) so it can express the
search-mode behaviour both screens already had, rather than dropping it. The four
existing callers are unaffected. First test coverage for SearchField.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Wire "Daftarkan User Baru" into the rental flow

Spec item 3a. **Confirmed with the user 2026-07-12:** after saving, she auto-advances to `PilihKendaraan` with the new customer selected, continuing the rental at step 2 of 3.

`UserFormScreen` already exists on the `AppStack` and already creates users; in create mode it ends with `navigation.replace("UserDetail", { userId: user.id })` (`UserFormScreen.tsx:141`). That is right when she came from the Beranda or the Users tab, and wrong when she came from the rental flow — it would drop her on a profile page mid-rental.

So `UserForm` learns an optional `returnTo`, and `PilihUser` learns an optional `createdUserId` it consumes once and clears.

**Files:**
- Modify: `app/navigators/navigationTypes.ts:18-22` (`SewaBaruParamList`), `:28-37` (`AppStackParamList`)
- Modify: `app/screens/UserFormScreen.tsx:136-141` (the create branch of `handleSave`)
- Modify: `app/screens/PilihUserScreen.tsx` — signature, the `createdUserId` effect, the loader, `ListFooter`

**Interfaces:**
- Consumes: `showToast` import added in Task 1 — **this task removes it again** (its last call-site disappears here).
- Produces: two navigation params. Nothing after Task 4 depends on them.

```ts
SewaBaruParamList.PilihUser: { createdUserId?: string } | undefined
AppStackParamList.UserForm: { mode: "create"; returnTo?: "SewaBaru" } | { mode: "edit"; userId: string }
```

- [ ] **Step 1: Add the navigation params**

In `app/navigators/navigationTypes.ts`, change `SewaBaruParamList` (line 18):

```ts
export type SewaBaruParamList = {
  /** `createdUserId` is set when UserForm hands a freshly-created customer back to the rental flow. */
  PilihUser: { createdUserId?: string } | undefined
  PilihKendaraan: { userId: string }
  DetailSewa: { userId: string; vehicleId: string }
}
```

and `AppStackParamList.UserForm` (line 34):

```ts
  UserForm:
    | { mode: "create"; returnTo?: "SewaBaru" }
    | { mode: "edit"; userId: string }
```

Everything else in the file is unchanged. Note `PilihUser` was `undefined` before, so the existing `navigation.navigate("SewaBaru", { screen: "PilihUser" })` in `BerandaScreen.tsx:113` still typechecks.

- [ ] **Step 2: Honour `returnTo` in `UserFormScreen`**

In `handleSave` (line 121), the create branch currently reads:

```ts
      if (mode === "create") {
        const { user, failedPhotoSlots } = await createUser(payload)
        if (failedPhotoSlots.length > 0) {
          Alert.alert("User tersimpan", "Beberapa foto gagal diupload — coba lagi dari Edit.")
        }
        navigation.replace("UserDetail", { userId: user.id })
      } else if (userId) {
```

Replace it with:

```ts
      if (route.params.mode === "create") {
        const { user, failedPhotoSlots } = await createUser(payload)
        if (failedPhotoSlots.length > 0) {
          Alert.alert("User tersimpan", "Beberapa foto gagal diupload — coba lagi dari Edit.")
        }
        if (route.params.returnTo === "SewaBaru") {
          // She came from the rental flow. Hand the new customer back and let her carry on
          // at step 2 rather than stranding her on a profile page.
          navigation.navigate("SewaBaru", {
            screen: "PilihUser",
            params: { createdUserId: user.id },
          })
        } else {
          navigation.replace("UserDetail", { userId: user.id })
        }
      } else if (userId) {
```

`route.params.mode === "create"` (rather than the existing local `mode` variable) is what narrows the union so TypeScript will let you read `returnTo`. `mode` at line 47 stays — it is still used by the title and the loading state.

`navigation.navigate("SewaBaru", …)` pops back to the `SewaBaru` route that is already on the stack and merges the params into its `PilihUser` screen. It does **not** push a second copy.

- [ ] **Step 3: Consume `createdUserId` in `PilihUserScreen`**

Change the screen signature to destructure `route` (line 124):

```tsx
export function PilihUserScreen({ navigation, route }: SewaBaruScreenProps<"PilihUser">) {
  const [summaries, setSummaries] = useState<UserSummary[]>([])
  const [query, setQuery] = useState("")
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [loading, setLoading] = useState(true)

  const searchInputRef = useRef<TextInput>(null)
  const createdUserId = route.params?.createdUserId
```

Then add the auto-advance effect, immediately after the data-loading effect:

```tsx
  // UserForm hands a freshly-created customer back here. Clear the param before navigating so
  // that backing out of PilihKendaraan lands on the list, not straight back into PilihKendaraan.
  useEffect(() => {
    if (!createdUserId) return
    navigation.setParams({ createdUserId: undefined })
    navigation.navigate("PilihKendaraan", { userId: createdUserId })
  }, [createdUserId, navigation])
```

The `setParams` before the `navigate` is load-bearing. Without it, the param survives on the route, the effect re-fires when she presses back from `PilihKendaraan`, and she is bounced forward again — an inescapable loop.

- [ ] **Step 4: Refresh the list on focus**

Confirmed with the user. `PilihUserScreen` loads once in a `useEffect` (line 132), so backing into it from `PilihKendaraan` shows a list that is missing the customer she just created. `UserScreen.tsx:103-111` already does this correctly; copy that shape.

Replace the `useEffect` at line 132:

```tsx
  useFocusEffect(
    useCallback(() => {
      getUserSummaries().then((data) => {
        setSummaries(data)
        setLoading(false)
      })
    }, []),
  )
```

and update the React import (line 1) to `import { useState, useEffect, useCallback, useRef } from "react"` — `useEffect` is still needed by Step 3. Add the navigation import:

```ts
import { useFocusEffect } from "@react-navigation/native"
```

- [ ] **Step 5: Wire the footer link**

`ListFooter` (line 108) is currently a dead end firing `showToast("Belum tersedia di demo")`. It needs the navigation object, so take an `onPress` prop rather than reaching for a hook:

```tsx
function ListFooter({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.footerLink} activeOpacity={0.8} onPress={onPress}>
      <Text style={[textStyles.labelLg, { color: colors.primary }]}>
        + Tidak ketemu? Daftarkan User Baru
      </Text>
    </TouchableOpacity>
  )
}
```

In the screen body, define the handler:

```tsx
  const handleDaftarkanUserBaru = () =>
    navigation.navigate("UserForm", { mode: "create", returnTo: "SewaBaru" })
```

and change **both** `ListFooterComponent={ListFooter}` usages (the `FlatList` at line 243 and the `SectionList` at line 272) to:

```tsx
            ListFooterComponent={<ListFooter onPress={handleDaftarkanUserBaru} />}
```

- [ ] **Step 6: Drop `showToast` from this screen**

That was its last call-site. Remove the `import { showToast } from "@/utils/showToast"` line added in Task 1, and remove `Platform`, `Alert`, and `ToastAndroid` from the `react-native` import — verify nothing else in the file uses them first (nothing does). `groupByFirstLetter` stays.

- [ ] **Step 7: Verify the dead-end string is gone**

```powershell
cd apps/lavender-ops-mobile
rg -i "belum tersedia" app/
```

Expected: **no output.**

- [ ] **Step 8: Gate**

```powershell
pnpm run compile; pnpm run lint; pnpm test
```

Expected: all green. `pnpm run compile` is doing real work here — it is what proves the discriminated union on `UserForm` narrows correctly and that `navigate("SewaBaru", { screen: "PilihUser", params: … })` typechecks against `NavigatorScreenParams`.

- [ ] **Step 9: Manual check (this one cannot be unit-tested — there are no screen tests in this repo)**

Run the app and walk the flow: Beranda → Sewa Baru → scroll to the bottom of the customer list → "+ Tidak ketemu? Daftarkan User Baru" → fill in a name and phone → Simpan.

Confirm: (a) you land on **Pilih Kendaraan**, "Langkah 2 dari 3", (b) pressing back goes to the customer list and **the new customer is in it**, (c) pressing back again does **not** bounce you forward into Pilih Kendaraan.

- [ ] **Step 10: Commit**

```bash
git add app/navigators/navigationTypes.ts app/screens/UserFormScreen.tsx app/screens/PilihUserScreen.tsx
git commit -m "feat: 'Daftarkan User Baru' now reaches UserForm and returns into the rental flow (v1.0.2 item 3a)

Was a dead end firing 'Belum tersedia di demo'. UserForm learns an optional
returnTo; PilihUser learns an optional createdUserId it consumes and clears,
then auto-advances to PilihKendaraan with the new customer selected.
PilihUser also switches to useFocusEffect so the list is not stale on return.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Delete the two dead Edit buttons on `RentalDetailScreen`

Spec items 3b / 3c. **Deletion only.** The feature these buttons imply — editing an active rental — needs a migration, a `SECURITY DEFINER` RPC, and a new connector (there is **no `updateRental` at all**; a rental is write-once). That is `docs/releases/v1-0-3.md`, not this release. Mom has never been able to use these buttons, so nothing is lost.

**Files:**
- Modify: `app/screens/RentalDetailScreen.tsx:365-376` (Kondisi Keluar header), `:632-643` (Catatan header), `:856` (the `inlineEditBtn` style)

**Interfaces:**
- Consumes: `showToast` (imported in Task 1) — **still needed** afterwards. It has six other call-sites in this file (lines 118, 119, 147, 150, 252, 712, 725). Do **not** remove the import.

- [ ] **Step 1: Delete the "Kondisi Keluar" Edit button**

At line 366, the section header currently is:

```tsx
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Kondisi Keluar</Text>
            <TouchableOpacity
              onPress={() => showToast("Akan segera tersedia")}
              style={styles.inlineEditBtn}
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
              <Text style={[textStyles.labelLg, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
```

Delete the whole `TouchableOpacity`, leaving the header with just its title:

```tsx
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Kondisi Keluar</Text>
          </View>
```

The section body below is untouched and stays read-only.

- [ ] **Step 2: Delete the "Catatan Rental" Edit button**

At line 633, identically:

```tsx
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Catatan Rental</Text>
          </View>
```

- [ ] **Step 3: Delete the now-orphaned style**

`inlineEditBtn` (line 856) was used **only** by those two buttons — verified by grep this session. Delete the entry. ESLint's `react-native/no-unused-styles` will fail the build if you leave it.

**Keep `sectionHeader`** — it is still used at line 421.

- [ ] **Step 4: Verify**

```powershell
cd apps/lavender-ops-mobile
rg -i "segera tersedia|inlineEditBtn" app/
```

Expected: **no output.**

And the release-wide acceptance grep:

```powershell
rg -i "belum tersedia|akan segera tersedia" app/
```

Expected: **no output.** (Requires Task 4 to be done.)

- [ ] **Step 5: Gate**

```powershell
pnpm run compile; pnpm run lint; pnpm test
```

Expected: all green. If lint reports `MaterialIcons` or `TouchableOpacity` as unused, you deleted too much — both are still used heavily elsewhere in this file.

- [ ] **Step 6: Commit**

```bash
git add app/screens/RentalDetailScreen.tsx
git commit -m "fix: remove the two dead Edit buttons on RentalDetail (v1.0.2 items 3b/3c)

Both fired 'Akan segera tersedia'. There is no updateRental connector — a rental
is write-once — so making them work is a migration + RPC + connector, i.e. v1.0.3.
The sections stay, read-only. Mom has never been able to use these.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Show the app version on the Beranda footer

Spec item 4. Also deletes the dead notification bell (spec item 2.2) — same file, same edit, one review.

**Read Global Constraint 1 again before starting this task.** `Application.nativeApplicationVersion` is the obvious implementation and it is **wrong here** — it would report `"1.0.0"` forever, because `app.json`'s `version` is deliberately frozen. The source of truth is a JS constant that travels inside the OTA payload.

That gives a free diagnostic: **if an OTA silently fails to apply, mom's screen still shows the old number.** You find out immediately, without asking her to do anything.

**Files:**
- Create: `app/config/release.ts`
- Modify: `app/utils/format.ts` (add `formatDateLong`)
- Modify: `app/utils/format.test.ts` (cover it)
- Create: `app/components/VersionFooter.tsx`
- Create: `app/components/VersionFooter.test.tsx`
- Modify: `app/screens/BerandaScreen.tsx:105` (delete the bell), `:275` (mount the footer)

**Interfaces:**
- Produces: `RELEASE` from `@/config/release`; `formatDateLong(date: Date): string` from `@/utils/format`; `<VersionFooter />` from `@/components/VersionFooter`.

- [ ] **Step 1: Create the release constant**

Create `app/config/release.ts`:

```ts
/**
 * The version string shown to mom in the Beranda footer.
 *
 * This is deliberately NOT `app.json`'s `version`, and NOT
 * `Application.nativeApplicationVersion`.
 *
 * `app.json` is pinned at "1.0.0" because `runtimeVersion.policy` is `appVersion` — OTA
 * updates are published against the runtime version, and mom's installed APK is runtime
 * "1.0.0". Bumping it would silently cut her off from every future update. So the native
 * version reports "1.0.0" forever and is useless as a release identifier.
 *
 * This constant ships *inside* the OTA bundle, so it is always the truth about the JS
 * mom is actually running — including the diagnostic case: if an update fails to apply,
 * her screen still shows the old number.
 *
 * ⚠️ Hand-maintained. Bump it before every `pnpm ota:publish`. Nothing enforces this.
 */
export const RELEASE = "1.0.2"
```

- [ ] **Step 2: Write the failing test for the date helper**

The footer needs a "12 Juli 2026"-style date. `format.ts` has `formatHeaderDate` ("Sabtu, 16 Mei 2026") and `formatDateShort` ("16 Mei") but nothing with a year and no weekday.

Append to `app/utils/format.test.ts`:

```ts
describe("formatDateLong", () => {
  it("formats a date as day, Indonesian month name, and year", () => {
    expect(formatDateLong(new Date(2026, 6, 12))).toBe("12 Juli 2026")
  })
})
```

and add `formatDateLong` to that file's existing import from `./format`.

- [ ] **Step 3: Run it and confirm it fails**

```powershell
cd apps/lavender-ops-mobile
pnpm test -- format
```

Expected: FAIL — `formatDateLong is not a function`.

- [ ] **Step 4: Implement it**

Append to `app/utils/format.ts` (it already has the `MONTHS` array at the top — reuse it, do not redefine it):

```ts
/**
 * Format date as "12 Juli 2026" — used in the Beranda version footer.
 */
export function formatDateLong(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
```

- [ ] **Step 5: Run it and confirm it passes**

```powershell
pnpm test -- format
```

Expected: PASS.

- [ ] **Step 6: Write the failing test for `VersionFooter`**

`expo-updates` is a native module; it must be mocked. Create `app/components/VersionFooter.test.tsx`:

```tsx
import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { VersionFooter } from "./VersionFooter"

jest.mock("expo-updates", () => ({
  updateId: null,
  createdAt: null,
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Updates = require("expo-updates")

describe("VersionFooter", () => {
  it("always shows the release constant", () => {
    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("Lavender Ops · v1.0.2")).toBeDefined()
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
```

- [ ] **Step 7: Run it and confirm it fails**

```powershell
pnpm test -- VersionFooter
```

Expected: FAIL — `Cannot find module './VersionFooter'`.

- [ ] **Step 8: Implement `VersionFooter`**

Create `app/components/VersionFooter.tsx`. It is a component (not inline JSX in `BerandaScreen`) precisely so it can be tested — this repo has **no screen tests**, so anything left inline in a screen ships untested.

```tsx
import { View, Text, StyleSheet } from "react-native"
import * as Updates from "expo-updates"

import { RELEASE } from "@/config/release"
import { colors, textStyles, spacing } from "@/theme/tokens"
import { formatDateLong } from "@/utils/format"

/**
 * Quiet footer at the bottom of the Beranda scroll.
 *
 * Exists so that when something is wrong and Farrel is on the phone asking "what version
 * are you on?", mom can find the answer from a verbal instruction — "scroll to the bottom
 * of the home screen". The splash screen was rejected: it flashes past and cannot be
 * summoned back.
 *
 * `RELEASE` is the JS constant (see app/config/release.ts — NOT app.json's version).
 * Beneath it, the actual update identity from expo-updates. On the bundle embedded in the
 * APK, `updateId` is null and we show "bawaan".
 */
export function VersionFooter() {
  const updateId = Updates.updateId
  const createdAt = Updates.createdAt

  const updateLine =
    updateId && createdAt
      ? `pembaruan ${updateId.slice(0, 7)} · ${formatDateLong(new Date(createdAt))}`
      : "pembaruan bawaan"

  return (
    <View style={styles.container}>
      <Text style={styles.releaseText}>Lavender Ops · v{RELEASE}</Text>
      <Text style={styles.updateText}>{updateLine}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
  },
  releaseText: {
    ...textStyles.labelMd,
    color: colors.onSurfaceVariant,
  },
  updateText: {
    ...textStyles.labelMd,
    color: colors.outlineVariant,
    marginTop: 2,
  },
})
```

- [ ] **Step 9: Run it and confirm it passes**

```powershell
pnpm test -- VersionFooter
```

Expected: PASS — 3 tests.

- [ ] **Step 10: Delete the dead notification bell (spec item 2.2)**

`BerandaScreen.tsx:105` is a bare `MaterialIcons` — no `onPress`, no `TouchableOpacity`. It looks tappable and is not. The app has no notifications feature and none is planned. Delete the line:

```tsx
          <MaterialIcons name="notifications" size={24} color={colors.onSurfaceVariant} />
```

The `header` `View` keeps its avatar and its text block; `headerTextBlock` is `flex: 1`, so it simply takes the freed space. `MaterialIcons` is still used elsewhere in the file (the avatar, the quick actions, the stat cards) — do **not** remove the import.

- [ ] **Step 11: Mount the footer**

`BerandaScreen.tsx:275` currently ends the scroll with:

```tsx
        <View style={styles.bottomPadding} />
      </ScrollView>
```

Replace with:

```tsx
        <VersionFooter />

        <View style={styles.bottomPadding} />
      </ScrollView>
```

and add the import:

```ts
import { VersionFooter } from "@/components/VersionFooter"
```

It sits below the Ringkasan stat cards, at the very bottom of the scroll — reachable, quiet, and out of the way. `scrollContent` is `flexGrow: 1`, so on a tall screen the footer sits under the content rather than being pinned; that is intended.

- [ ] **Step 12: Gate**

```powershell
pnpm run compile; pnpm run lint; pnpm test
```

Expected: all green, **24 suites**.

- [ ] **Step 13: Confirm `app.json` was not touched**

```powershell
cd C:\Users\ferna\dev\personal_projects\lavender-app
git diff master --stat -- apps/lavender-ops-mobile/app.json
```

Expected: **no output.** If `app.json` appears here, you have broken OTA delivery to mom's phone. Revert it.

- [ ] **Step 14: Commit**

```bash
git add app/config/release.ts app/components/VersionFooter.tsx app/components/VersionFooter.test.tsx app/utils/format.ts app/utils/format.test.ts app/screens/BerandaScreen.tsx
git commit -m "feat: show the running version in the Beranda footer (v1.0.2 items 4 + 2.2)

RELEASE is a JS constant that ships inside the OTA bundle — not app.json's version,
which is frozen at 1.0.0 so that runtimeVersion keeps matching mom's installed APK.
Side benefit: if an OTA fails to apply, her screen still shows the old number.
Also deletes the dead, non-tappable notification bell.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Acceptance, docs, and ship

**Files:**
- Modify: `docs/releases/v1-0-2.md` (tick the acceptance boxes, set status to shipped)
- Modify: `CLAUDE.md` (current status)
- Modify: `docs/known-technical-debt.md` (only if anything new was found)

- [ ] **Step 1: Walk the spec's acceptance checklist**

Run each of these from `apps/lavender-ops-mobile` and record the actual output. Do not tick a box you have not run.

```powershell
rg -i "belum tersedia|akan segera tersedia" app/     # → no output
rg "searchInputContainer" app/                        # → no output
rg "^function showToast" app/screens/                 # → no output
rg "styles.chevron|inlineEditBtn" app/                # → no output
```

```powershell
cd C:\Users\ferna\dev\personal_projects\lavender-app
git diff master --stat -- apps/lavender-ops-mobile/app.json   # → no output
git diff master --stat -- supabase/                            # → no output
git diff master -- apps/lavender-ops-mobile/app/services/      # → no output (connectors untouched)
```

Confirm the two protected screens changed **only** in their `showToast` import:

```powershell
git diff master -- apps/lavender-ops-mobile/app/screens/DetailSewaScreen.tsx apps/lavender-ops-mobile/app/screens/PengembalianScreen.tsx
```

Expected: only the deleted local `showToast`, the added import, and the trimmed `react-native` import. **No change to any tariff, fuel, or hutang logic.** If you see anything else, stop and revert it.

- [ ] **Step 2: Full gate**

```powershell
cd apps/lavender-ops-mobile
pnpm run compile
pnpm run lint
pnpm test
```

Expected: compile clean, lint clean, **24 suites / 88+ tests green** (19/80 at v1.0.1, plus `showToast` ×2, `SearchField` ×3, `VersionFooter` ×3, `formatDateLong` ×1).

- [ ] **Step 3: Manual smoke on a device**

The unit tests do not cover any screen. Walk these five paths on the `preview` build:

1. **Beranda** — no bell in the header; scroll to the bottom → "Lavender Ops · v1.0.2" and an update line.
2. **Hutang tab** — the chevron sits at the card's bottom-right, clear of the "Dari rental" / "Manual" pill.
3. **User tab** — search box looks identical to the Rental and Hutang tabs; focus shows "Batal"; "Batal" clears and dismisses the keyboard.
4. **Sewa Baru → Pilih User** — same search box; "+ Tidak ketemu? Daftarkan User Baru" → User Baru form → Simpan → lands on **Pilih Kendaraan** with the new customer; back → list, containing that customer; back again does not bounce forward.
5. **Rental Detail** — no "Edit" next to Kondisi Keluar or Catatan Rental; both sections still render.

- [ ] **Step 4: Confirm `RELEASE` is bumped**

```powershell
rg "export const RELEASE" apps/lavender-ops-mobile/app/config/release.ts
```

Expected: `export const RELEASE = "1.0.2"`. **Nothing enforces this.** If it still says `1.0.1` or `1.0.0`, mom's footer will lie about what she is running, and the OTA-failure diagnostic is lost.

- [ ] **Step 5: Ship the OTA**

Only after every box above is ticked:

```powershell
cd apps/lavender-ops-mobile
pnpm ota:publish --message "v1.0.2 — polish + honesty: UI fixes, no dead ends, version footer, showToast util"
```

Then confirm it published against the right runtime:

```powershell
npx eas update:list --branch preview
```

Expected: the newest entry is on **runtime version `1.0.0`**. If it says `1.0.2`, `app.json` was bumped despite everything — mom will not receive it. Stop, revert `app.json`, and republish.

- [ ] **Step 6: Close out the docs**

In `docs/releases/v1-0-2.md`: tick every acceptance box, set **Status** to `shipped OTA <date>`, and record the two deviations from the spec found during implementation (`showToast` reaches 4 screens not 6; `SearchField` needed two new optional props). Note that item 1 (text sizes) is **still open and still blocked** — it carries to v1.0.3.

In `CLAUDE.md`: update the "Current Status" block to `v1.0.2 shipped ✅`.

- [ ] **Step 7: Commit and merge**

```bash
git add docs/ CLAUDE.md
git commit -m "docs: close out v1.0.2 (shipped OTA)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Then use the `superpowers:finishing-a-development-branch` skill to merge back to `master`.

---

## Self-Review

**Spec coverage:**

| Spec item | Task | Notes |
|---|---|---|
| 1. Text sizes | — | Correctly **no task**. Blocked on mom; ships nothing. |
| 2.1 Hutang chevron | 2 | |
| 2.2 Beranda bell | 6 | Folded in — same file as the version footer. |
| 2.3 `SearchField` adoption | 3 | Needed two additive props first. |
| 2.4 `KendaraanScreen` | — | Correctly **no task** — explicitly not in this release. |
| 3a "Daftarkan User Baru" | 4 | Landing decision confirmed with the user. |
| 3b/3c Edit buttons | 5 | Deletion only. |
| 4. Version display | 6 | |
| 5. `showToast` | 1 | |
| Acceptance checklist | 7 | Every box mapped to a runnable command. |

**Placeholder scan:** none — every code step carries the actual code, every command its expected output.

**Type consistency:** `showToast(msg: string)` (Task 1) is the name used in Tasks 4 and 5. `SearchFieldProps.onFocus` / `.inputRef` (Task 3) are the names used by both migrated screens. `UserForm.returnTo: "SewaBaru"` and `PilihUser.createdUserId` (Task 4, Step 1) are the names used in Steps 2, 3 and 5. `RELEASE` and `formatDateLong` (Task 6) are the names used by `VersionFooter` and its test.

**Task ordering is load-bearing.** Task 1 must precede Tasks 4 and 5, so those tasks only *remove* `showToast` call-sites rather than colliding with the extraction. Task 3 must precede Task 4 — both edit `PilihUserScreen`, and Task 3 leaves it compiling.
