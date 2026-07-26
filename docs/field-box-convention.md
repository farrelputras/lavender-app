# The field-box convention

- **Established by:** PRD-8 (`docs/prd/PRD-8-editable-vs-readonly.md`, BR-1…BR-11), delivered v1.0.5
  (`docs/releases/v1-0-5.md`).
- **Defined once, in code, at:** `app/components/form/FieldBox.tsx` (BR-6/AC-6 — the only place under
  `app/` allowed to declare this style set; the primitive's own doc comment restates this file).
- **Why this doc exists:** BR-11 requires the convention recorded in `docs/` *and* in the primitive's
  own doc comment. An undocumented convention decays back into ten (then twelve) treatments — that is
  literally how PRD-8's problem happened, and it is the failure mode this file exists to prevent.

## The convention, in one line

**Boxed = Mom can change this. Plain = she can't.** Two states only (BR-10) — there is no
disabled/locked third state. A field she cannot edit today because of status or role renders **plain**
for her, the same as a field that will never be editable.

## BR-4 — three categories, and every element on a screen is exactly one

| Category | Definition | Treatment |
|---|---|---|
| **Field** | A value the user enters or picks that gets **recorded** — text, number, rupiah, date/time. | **Must** be wrapped in `FieldBox`. |
| **Control** | An element whose own shape already declares interactivity and which does not display a stored value as plain text — `Stepper`, `PhotoRow`/`PhotoSlot`, `Switch`, `SearchField`, buttons. | **Exempt** from the box. Must **never** be styled as a read-only value. |
| **Read-only value** | A displayed value the user cannot change here. | Plain row — label above value, no greying, no lock glyph. **Never** a box. |

**The signal is the presence of the box, not the absence of one (BR-2).** Read-only rendering is the
app's existing default everywhere (`textStyles.labelMd` / `onSurfaceVariant` label above
`textStyles.bodyMd` / `onSurface` value) and gains nothing new — no dimming, no icon, no third state.

`SearchField` is a Control, not a Field: it filters, it does not record. `Stepper`/`PhotoRow` are
Controls for the same reason — their shape already tells you they respond to a tap or drag.

## The box itself (BR-1)

A field box is a 1px border, a fill, `borderRadius.default` (12), and `minHeight: 52` (never `height` —
BR-8, so it grows rather than clips at larger text scale, PRD-5). Composed via `<FieldBox>`, never
redeclared:

```tsx
import { FieldBox } from "@/components/form/FieldBox"

<FieldBox>
  <TextInput ... />
</FieldBox>
```

A consumer that needs a variant (an error-state border, extra margin) passes `style` — it does not carry
its own copy of the border/fill/radius/`minHeight` set. `RupiahInput` and `PembayaranSheet`'s amount
field (the invalid-amount red border) both do this.

### Tokens — never a colour literal

| Part | Token | Value |
|---|---|---|
| Border | `colors.outline` | `#7a7580` |
| Fill | `colors.surface` | `#f6faff` |
| Radius | `borderRadius.default` | `12` |
| Min height | — | `52` |

Both live in `app/theme/tokens.ts`. A colour written as a hex literal at a field-box call site is
simultaneously a `no-color-literals` lint error and a BR-3/BR-6 violation — the same defect caught twice.

## BR-3 — the retired border token

`colors.outlineVariant` (`#cac4d0`) is **retired from field borders**. Measured against the box's own
fill (`#f6faff`), it is **1.63:1** — under half the WCAG 3:1 minimum for non-text UI, and effectively
invisible in daylight at arm's length. `colors.outline` (`#7a7580`) is the token that qualifies —
**4.28:1** against `#f6faff`, 4.48:1 against white.

**`outlineVariant` remains correct for dividers** (the 1px rule between stacked fields inside a
`FieldCard`, for example). This is a narrow retirement — one role, not the whole token.

## BR-5 — the demoted tint

`surfaceContainerLow` (`#ecf5fe`) used to appear on both editable and read-only surfaces, and that
collision is half of what PRD-8 exists to fix. At **1.10:1** against white it cannot carry a signal at
all (WCAG's non-text-UI floor is 3:1) — it is disqualified by measurement, not by taste.

**After PRD-8, the tint carries no meaning about editability, in either direction.** It still survives
where it *groups* rather than *contains* — `paySummary`, `paketChip`, `jaminanPill`, `methodBadge`, the
iOS picker container — but none of that is a signal about whether something is editable. If a future
screen reaches for the tint to mean "you can change this," that is a regression of this convention, not
a legitimate extension of it. **State this sentence explicitly whenever the convention is explained, or
it gets re-read as a signal within two releases** (PRD-8's own warning).

## Known exceptions

Two screens deliberately do not carry the convention. Both are recorded here and in AC-7's allow-list
with their reason attached — a third entry anywhere is a scope breach, not a judgment call:

- **`LoginScreen`** — its own fill, no border (treatment #5). Not an operational data-entry surface in
  the sense the rest of this convention targets; Mom sees it rarely because the session persists.
  **Risk accepted:** it is one screen that breaks a rule the rest of the app teaches.
- **`DetailSewaScreen`** — fenced with `PengembalianScreen`'s rental-math code under debt #4. Its
  existing treatment (`inlineInput`, r10 + border) is the closest stray to the target, so it reads as
  near-right rather than wrong. Follows in a second pass, its own fenced release.

## Where it has (and has not) shipped

| Screen / component | Status |
|---|---|
| `app/components/form/FieldBox.tsx` | The primitive itself (v1.0.5) |
| `RupiahInput` | Consumes `FieldBox` (v1.0.5) — corrected `outlineVariant` → `outline` |
| `UserFormScreen`, `HutangFormScreen` | Every `TextInput` boxed (v1.0.5) |
| `PembayaranSheet` | *Jumlah*, the "Lainnya" method description, *Notes* boxed (v1.0.5) — consumed by `RentalDetailScreen` and `PengembalianScreen` (in scope) and by `HutangDetailScreen` / `DetailSewaScreen` (out of scope; those two screens change appearance with zero source-line edits) |
| `PengembalianScreen` | D-5 migration — input-bearing primitives only (v1.0.5, separate dispatch) |
| `RentalDetailScreen` | Tinted single-value blocks stripped; `kmEditInput` / `notesInput` boxed as live Fields (v1.0.5, separate dispatch). Not yet 100% read-only — see PRD-8 Amendment A-1 (AC-4b, deferred to the release carrying PRD-6) |
| `UserDetailScreen` | Audited — no box, all plain read-only rows (v1.0.5, separate dispatch) |
| `DetailSewaScreen` | Out — known exception, debt #4 fence |
| `LoginScreen` | Out — known exception |

See `docs/prd/PRD-8-editable-vs-readonly.md` for the full requirements and `docs/releases/v1-0-5.md` /
`docs/reports/v1-0-5.md` for the delivery record.
