# PRD-8 — You can tell which fields you can change

- **PRD:** 8 — refer to this as **PRD-8**.
- **Status:** 🟢 **DESIGNED — ready for PM.** Scaffolded 2026-07-25; designed the same day. Behavioural
  requirements (BR-1…BR-12) and acceptance criteria (AC-1…AC-12) below. Eight decisions taken with
  Farrel in the design session (**D-1…D-8**); six questions remain open and are marked as *design-session*
  or *PM* calls, none of them blocking.
- **Target release:** unassigned — PM's call. **Ships (or is at least decided) before PRD-6** — see §Dependency.
  ⚠️ **This is no longer a presentation-only release.** D-5 opens the debt **#4** fence on
  `PengembalianScreen`. Size it accordingly; see §What this costs.
- **Author:** Product · 2026-07-25 (pain point reported by Farrel from Mom's use of v1.0.4).
  **Designed 2026-07-25** — evidence re-verified against code, inventory corrected from 7 treatments to
  **10**, contrast measured rather than estimated.
- **Priority:** **medium — but it gates PRD-6.** No data is wrong *from this cause*; the cost is
  hesitation and mis-taps, and one of those mis-taps became PRD-6.
  > Narrowed 2026-07-25. The blanket claim "no data is wrong today" was true when written and is not
  > true now: one COMPLETED rental carries a wrong `waktu kembali`. That came from a **confident wrong
  > default**, not from unmarked editability — the *Kembali* row is one of the best-marked controls in
  > the app (`PengembalianScreen.tsx:432-435`). See PRD-6 §Recorded, not scoped, and debt **#16**.
- **Related:** **PRD-6 consumes this convention** (and its OQ-1 was settled jointly here — see **D-4**) ·
  shares PRD-5's BR-8 principle (rules live in the shared primitives, so new screens inherit them) ·
  partially closes debt **#4**, and forces new coverage against debt **#15**.

## Summary

Mom cannot tell, by looking, which fields on a screen she can change and which are just showing her
information. The app has no visual convention for this. It has **ten** different ways of drawing an
editable field, two of which are pixel-identical to how it draws a read-only value.

## Problem statement

**The report.** On `RentalDetailScreen`, Mom is unsure which fields are fillable and which are
read-only. `PengembalianScreen` has the same problem in reverse: most of it *is* editable, and nothing
says so.

**The proposed remedy** was to adopt the tint already seen on *Tujuan* and *Catatan Rental* as the
"editable" signal, leaving read-only fields on plain white. Farrel asked for this to be confirmed
before being built.

### ⚠️ Confirmed — and the premise is wrong twice over

**First**, the tint does not mean "editable" today. `surfaceContainerLow` = `#ecf5fe`
(`app/theme/tokens.ts:26`) means "inset block", and it appears on both sides of the divide.

**Second — and this is what the scaffold missed — the tint is a red herring.** It cannot carry the
convention no matter what meaning is assigned to it, because it is not visible enough to be a signal.
See §The contrast measurement.

**The real defect is one level down: the app renders an editable field and a read-only value with the
same visual atom.**

```
UserFormScreen  (EDITABLE)                UserDetailScreen  (READ-ONLY)
  fieldLabel  labelMd / onSurfaceVariant    infoLabel  labelMd / onSurfaceVariant
  input       bodyMd  / onSurface           infoValue  bodyMd  / onSurface
  divider     1px #cac4d0                   infoDivider 1px #dbe4ed
  inside a white FieldCard                  inside a white card
  (:330-344)                                (:400-406)
```

They differ **only in divider colour**. An editable *Nama Lengkap* and a read-only *Alamat* render
identically. That is not a weak convention — it is a collision, and it is the whole PRD.

### The full inventory — 10 treatments, verified 2026-07-25

| # | Treatment | Where | Editable? |
|---|---|---|---|
| 1 | white + shadow, r24 pill, leading icon | `SearchField.tsx:60-71` | ✅ (a *control*, see BR-4) |
| 2 | `#f6faff` fill + `outlineVariant` 1px + **r12**, `minHeight: 52` | `RupiahInput.tsx:36-49` | ✅ |
| 3 | `#f6faff` fill + `outlineVariant` 1px + **r8**, **`height: 48` / `height: 40`** | `PengembalianScreen.tsx:1195`, `:1213` | ✅ |
| 4 | `#f6faff` fill + `outlineVariant` 1px + **r10** | `DetailSewaScreen.tsx:1183` | ✅ |
| 5 | `#e6eff8` fill, **no border**, `height: 48` | `LoginScreen.tsx:122-128` | ✅ |
| 6 | `#ecf5fe` + r12 | `notesInput` (`RentalDetailScreen.tsx:1112`), shared `Stepper.tsx:67`, `PhotoRow.tsx:62` | ✅ |
| 7 | `#ecf5fe` + r12 | `insetBlock` (`:1079`), `paySummary`, `paketChip`, `jaminanPill`, iOS picker container | ❌ read-only / decorative |
| 8 | **bare text — no box, no border, no fill** | `UserFormScreen.tsx:340`, `HutangFormScreen.tsx:229`, Pengembalian *Tujuan* (`:506`), `kmEditInput` (`RentalDetailScreen.tsx:1100`) | ✅ |
| 9 | **bare text — no box, no border, no fill** | every `infoLabel` / `infoValue` row, app-wide | ❌ read-only |
| 10 | bottom-border underline only | `extraFeeDesc` (`PengembalianScreen.tsx:1268`) | ✅ |

**Rows 6/7 collide** (the tint problem the report noticed). **Rows 8/9 collide** (the problem it
didn't) — and 8/9 is the one that hurts, because it covers the three screens with the most typing on
them. Rows 2, 3 and 4 are the *same* treatment differing only in border radius (12 / 8 / 10) and
height handling: three independent attempts at the answer, none of them shared.

### The sharpest single fact

***Tujuan* is tinted where it is read-only, and bare where it is editable.**

| Screen | Rendering | Editable? |
|---|---|---|
| `RentalDetailScreen.tsx:795` | `insetBlock` — `#ecf5fe`, r12, padding 12 | ❌ no edit control exists for it on that screen |
| `PengembalianScreen.tsx:506` | bare `TextInput` in a white card, no box | ✅ yes |

Same field name, exact inversion, on two screens Mom moves between inside one workflow.

### The contrast measurement (WCAG relative luminance, computed 2026-07-25)

The scaffold called `#ecf5fe`-on-white "a 4 %-luminance shift" and asked the design session to weigh
it. It does not need weighing — it is disqualifying, and the arithmetic settles OQ-2 the same way
PRD-5's on-device `fontScale` reading settled its cap.

| Pair | Contrast | vs. 3:1 (WCAG non-text UI minimum) |
|---|---|---|
| `surfaceContainerLow` `#ecf5fe` on `surfaceContainerLowest` `#ffffff` | **1.10 : 1** | ❌ fails by 2.7× |
| `surfaceContainerLow` `#ecf5fe` on `surface` `#f6faff` | **1.05 : 1** | ❌ effectively invisible |
| `surfaceVariant` `#dbe4ed` on white | 1.29 : 1 | ❌ |
| `outlineVariant` `#cac4d0` on white | 1.70 : 1 | ❌ |
| **`outlineVariant` `#cac4d0` on `#f6faff`** — *today's field border on today's field fill* | **1.63 : 1** | ❌ **fails** |
| **`outline` `#7a7580` on `#f6faff`** — the proposed border on the same fill | **4.28 : 1** | ✅ **passes** |
| `outline` `#7a7580` on white — if OQ-1 picks a white fill | 4.48 : 1 | ✅ passes |
| `primary` `#62528d` on white | 6.75 : 1 | ✅ |

*Computed from `tokens.ts` by the WCAG 2.x relative-luminance formula and re-checked before this PRD
was filed. Either fill in OQ-1 satisfies BR-3, so the fill decision cannot break the convention.*

Two conclusions, both load-bearing:

1. **Tint alone can never carry this convention.** At 1.10:1 it is below the threshold at which a
   colour difference is a *signal* rather than a texture — on a phone, in daylight, at arm's length,
   for a 50-year-old primary user.
2. **The borders the app already draws are also below the floor.** `RupiahInput`, `inputRow`,
   `amountInputRow` and `inlineInput` all use `outlineVariant`, which against their own `#f6faff` fill
   is **1.63:1** — under half the required 3:1. The app was *trying* to draw
   an outlined field and used the wrong token — `outlineVariant` is M3's decorative-divider colour;
   `outline` is M3's outlined-text-field container colour. **The design system already specifies the
   right answer; four call sites picked the neighbouring token.**

### The app already solved this once

`PhotoRow` takes a `readonly` prop (`PhotoRow.tsx:20`) and renders a dashed-primary "Tambah Foto" tile
**only when editable** (`:38-45`, `:60-70`). One shared primitive, one prop, an unmistakable difference
between the two states. It is the model this PRD generalises — not a new idea, an existing one that was
never extended past photos.

## Affected users

- **Mom (`ops`, primary).** She hesitates before tapping, and taps things that don't respond. On
  `PengembalianScreen` the uncertainty runs the other way — she may not realise a value is hers to
  correct. She runs `fontScale` ≈ 1.4, which says she is already optimising for legibility.
- **Farrel (`admin`).** Doesn't experience it; he knows which fields are inputs because he wrote them.
  The same asymmetry that let PRD-4 and PRD-5 ship.
- **Every future screen.** With no convention, each new screen re-decides — which is how ten
  treatments happened.

## Validity — verified against code, 2026-07-25 (re-verified in design)

| Claim | Verdict | Evidence |
|---|---|---|
| *Tujuan* / *Catatan* show a blue hue | ✅ confirmed | `surfaceContainerLow` = `#ecf5fe`, `tokens.ts:26` |
| That hue currently signals "editable" | ❌ **false** | same tint on read-only *Tujuan* (`:795`) and editable `notesInput` (`:1112`) |
| A consistent editable/read-only convention exists | ❌ **none exists** | **10** treatments, table above |
| Read-only fields are "just white background as usual" | ⚠️ **partly** | white is also `SearchField` (editable) and `FieldCard` (container) |
| Tint could be made the signal if applied consistently | ❌ **false** | **1.10 : 1** against white — below the 3:1 non-text minimum |
| The app's existing field borders are adequate | ❌ **false** | `outlineVariant` = **1.70 : 1**; `outline` at 4.48:1 is the token that qualifies |
| The money field is the least-marked input | ⚠️ **worse than stated** | `RupiahInput` has a (too-faint) border; `PengembalianScreen.amountInputRow` (`:1213`) is a **fixed `height: 40`** — *below the app's own `tapTargetMin = 48`* and a live PRD-5 BR-1 violation |
| The convention can live in shared primitives | ⚠️ **not for `PengembalianScreen`** | it imports **one** thing from `components/form/` (`PhotoRow`, `:16`); `SectionLabel`/`FieldCard`/`FuelGauge`/`Stepper` are local (`:75-120`) — **debt #4** |
| Dark mode complicates the colour choice | ✅ **no** | `tokens.ts` defines a single light palette; there is no dark variant to design against |
| Screens with zero coverage can't be verified by the suite | ⚠️ **half true** | a *source-reading* audit test can — `AppText.clampAudit.acceptance.test.ts` is the precedent (see AC-6/AC-7). Visual correctness still needs a device. |
| `LoginScreen` is already consistent with the form screens | ❌ **false** | treatment #5 — `surfaceContainer` fill, no border, its own thing |

**Verdict: the *problem* is valid and larger than reported; the *proposed mechanism* is disqualified by
measurement, not by taste.**

## Decisions taken (Farrel, 2026-07-25)

- **D-1 — PRD-8 sets the convention; PRD-6 consumes it.** Establishing "you can change this" in the
  shared primitives comes first, so PRD-6's edit mode switches fields into an already-defined state
  rather than inventing a one-screen visual language that this PRD would then have to unpick.
  *(Taken at scaffold time.)*

- **D-2 — the convention marks EDITABLE. Read-only keeps the app's existing plain rendering.**
  *Answers OQ-1.* Read-only is already the default everywhere (`infoLabel`/`infoValue`), so marking
  editable is the smaller diff and it answers Mom's actual question — *where do I tap?* — directly
  rather than by inference.
  > The scaffold worried that a mostly-editable screen would become "a blue screen carrying no
  > information". That was an artefact of assuming **tint**. With a **box**, a screen where most
  > fields are marked simply reads as *a form* — which is what `PengembalianScreen` is, and what every
  > other form on Mom's phone looks like. The inverse rule the scaffold asked for is not needed.

- **D-3 — the mechanism is a BOXED FIELD, not a tint.** *Answers OQ-2.* 1px border in a colour that
  clears **3:1**, a fill, `borderRadius.default` (12), and `minHeight: 52` (which also clears
  `tapTargetMin = 48`). Grounds:
  1. **The measurement forces it** — tint is 1.10:1; the border at `outline` is 4.48:1.
  2. **It is already 80 % built.** Treatments 2, 3 and 4 are three divergent attempts at exactly this
     box. The work is *unifying and correcting* them, not inventing.
  3. **It fixes the money field first**, as the scaffold demanded — `RupiahInput` and
     `amountInputRow` both become the box.
  4. **It is what the design system already specifies.** Swapping `outlineVariant` → `outline` is a
     one-token correction toward M3's own outlined-text-field spec.

- **D-4 — PRD-6's OQ-1 is settled jointly, here: a DEDICATED RENTAL EDIT SCREEN (PRD-6 D-6) is
  accepted.** Both PRDs instructed that this be decided in one sitting; it was. **Consequence for
  PRD-8:** `RentalDetailScreen` becomes 100 % read-only, so this PRD's work on that screen collapses
  from "define an edit state" to **"strip the two misleading tinted blocks"** — subtractive, cheap, and
  it removes the `insetBlock` ↔ `notesInput` collision by deleting one side of it.
  > ⚠️ PRD-6 must be updated to record that its OQ-1 is closed. A pointer has been added there.

- **D-5 — `PengembalianScreen` MIGRATES onto the shared input-bearing primitives.** *Resolves the
  scaffold's internal contradiction* (its scope items 3 and 4 could not both be satisfied — see
  §What this costs). Migration **depth is input-bearing primitives only**: the local
  `inputRow` / `amountInputRow` / bare *Tujuan* input move onto the shared field box, and the local
  `FieldCard` goes. **Not migrated:** local `SectionLabel`, `FuelGauge`, `Stepper`, and the local
  bottom action bar.
  > **Why depth matters.** The shared `Stepper` is the tinted `#ecf5fe` row; Pengembalian's local one
  > is white bordered circles (`:1183`) — migrating it visibly changes fuel entry. And the two
  > `FuelGauge` copies have **already diverged on `max`** (debt #4), which is a behavioural difference
  > on a money path. Both stay out.

- **D-6 — `DetailSewaScreen` is OUT of this PRD.** It is tariff composition (`docs/02` §6) and carries
  the same debt #4 fence. Opening one high-risk screen this release, not two. Its treatment #4
  (`inlineInput`, r10 + border) is the closest of the strays to the target, so it looks near-right even
  unmigrated. It follows in a second pass — recorded as a known exception, not as drift.

- **D-7 — rollout is four screens plus the primitives.** *Answers OQ-5.*
  | Screen | What happens |
  |---|---|
  | `PengembalianScreen` | **apply** (with the D-5 migration) |
  | `UserFormScreen` | **apply** — treatment #8 → the box |
  | `HutangFormScreen` | **apply** — treatment #8 → the box |
  | `RentalDetailScreen` | **strip only** — remove tinted single-value blocks; nothing gains a box |
  | `UserDetailScreen` | **strip only / audit** — 100 % read-only, must contain no box |
  | `LoginScreen` | **out** — deliberate exception, recorded (see §Known exceptions) |
  | `HutangDetailScreen`, list & search screens | **out** — read-only + `SearchField`, which is a *control* |
  | `DetailSewaScreen` | **out** — D-6 |

- **D-8 — two states only; no "locked" third state.** *Answers OQ-4.* Boxed = you can change this;
  plain = you can't. A field Mom cannot edit because of status or role renders plain for her.
  > **Accepted cost, stated plainly:** admin-only *Catatan* will look identical to permanently
  > read-only data for Mom, so the convention does not tell her whether asking Farrel would help. With
  > D-4 most conditional cases now sit behind the edit screen's own entry gate rather than on a read
  > screen, which shrinks the exposure — but it does not eliminate it. If it bites, it is a follow-up
  > PRD, not a silent addition to this one.

## Behavioural requirements

- **BR-1 — the field box.** An editable field is drawn as a **field box**: a 1px border, a fill,
  `borderRadius.default` (12), and `minHeight: 52`. Nothing that is not an editable field is drawn
  that way. This is the whole convention; everything below serves it.

- **BR-2 — read-only is the default and gains nothing.** Read-only values keep the existing plain
  rendering (`textStyles.labelMd` / `onSurfaceVariant` label above `textStyles.bodyMd` / `onSurface`
  value). No new treatment, no greying, no lock glyph. **The signal is the presence of the box, not
  the absence of one.**

- **BR-3 — the border must be a signal, not a hint.** The field-box border colour must meet **≥ 3:1**
  against **its own fill** — not against white, and not against whatever happens to sit behind the
  card. `outlineVariant` (`#cac4d0`) measures **1.63:1** against the `#f6faff` fill it is currently
  paired with and is **retired from field borders**; it remains correct for dividers. `outline`
  (`#7a7580`) qualifies on either candidate fill — **4.28:1** on `#f6faff`, 4.48:1 on white.

- **BR-4 — three categories, named.** Every element on a screen is exactly one of:
  | Category | Definition | Treatment |
  |---|---|---|
  | **Field** | a value the user enters or picks that gets **recorded** — text, number, rupiah, date/time | **must** be a field box |
  | **Control** | an element whose own shape already declares interactivity and which does not display a stored value as plain text — `Stepper`, `PhotoRow`/`PhotoSlot`, `Switch`, `SearchField`, buttons | **exempt** from the box; **must never** be styled as a read-only value |
  | **Read-only value** | a displayed value the user cannot change here | plain row; **never** a box |
  *This answers the scaffold's OQ-3:* `SearchField` **is** a Control, not a Field — it filters, it does
  not record. It keeps its pill and is unchanged by this PRD.

- **BR-5 — no tinted single-value block.** `surfaceContainerLow` may not be the background of a block
  whose only content is one displayed value. That shape reads as a field and is the exact thing Mom
  misread. Applies to `insetBlock` on `RentalDetailScreen` (*Tujuan* `:795`, read-only *Catatan* `:846`).
  > Tint survives where it **groups** rather than **contains** — `paySummary`, `paketChip`,
  > `jaminanPill`, `methodBadge`, the iOS picker container. After this PRD, **the tint carries no
  > meaning about editability at all**, in either direction. That must be stated in the rule doc
  > (BR-11) or it will be re-read as a signal within two releases.

- **BR-6 — one definition site.** The field box is defined **once**, in `app/components/form/`, and
  consumed everywhere. No screen re-declares the border-colour / fill / radius / `minHeight` set.
  This is PRD-5 **BR-8** carried forward, and it is the requirement that stops treatment #2/#3/#4 from
  re-diverging.

- **BR-7 — the money field is the proof case, not the cleanup item.** Every rupiah entry point is a
  field box: shared `RupiahInput`, and `PengembalianScreen`'s *Subtotal Sewa* and extra-fee amounts
  (`amountInputRow`, `:1213`). Today that control is a **fixed `height: 40`** — below the app's own
  `tapTargetMin = 48` — on the screen where Mom types money.

- **BR-8 — fixed heights give way.** Every field box uses `minHeight`, never `height`. PRD-5 **BR-1**
  carried forward, and currently violated on `PengembalianScreen` at `:1203` (`height: 48`) and
  `:1221` (`height: 40`) — both shipped un-fixed in v1.0.4 because that screen was fenced.

- **BR-9 — no grant, no revoke.** Applying the convention changes nothing about *what* is editable.
  PRD-1's permission matrix is untouched; `editLogic.ts`'s `canEditKondisiKeluar` / `canEditNotes` are
  **reused, not re-implemented**. No migration, no RPC, no RLS change. If one appears to be needed,
  that is a finding to escalate, not to absorb.

- **BR-10 — two states only.** No disabled/locked third state (D-8).

- **BR-11 — the rule is written down.** The convention, its three categories (BR-4), the retired
  `outlineVariant` border (BR-3), the demoted tint (BR-5), and the **known exceptions** list
  (`LoginScreen`, `DetailSewaScreen`) are recorded in `docs/` **and** in the primitive's own doc
  comment. An undocumented convention decays back into ten treatments.

- **BR-12 — the migration is gated by math safety.** The `PengembalianScreen` migration (D-5) is
  **preceded** by characterisation tests pinning current fuel-adjustment, return-total and auto-debt
  behaviour, and **followed** by a `rental-math-reviewer` pass. This is debt #4's own gate; D-5 opens
  the fence, it does not remove it.

## Acceptance criteria

> **Verification note.** `PengembalianScreen` has **zero** automated coverage (debt **#15**) and this
> PRD rewrites its inputs. Coverage there is **no longer an optional ride-along** — AC-1, AC-2 and
> AC-9 cannot be met without it. AC-6 and AC-7 are *source-reading* audits (modelled on
> `AppText.clampAudit.acceptance.test.ts`) and hold even on uncovered files; visual correctness still
> requires a device.

- **AC-1 (flagship).** On `PengembalianScreen`, **every** field Mom enters or picks renders in the
  field box — *Kembali* time, *Tujuan*, *Harga bensin / kotak*, *KM Kembali*, *Subtotal Sewa*, and every
  extra-fee description and amount — and **every** read-only row renders plain: *Mulai*, *Durasi*,
  *Total Tagihan*, *Sudah dibayar*, *Sisa*, and the `Saat keluar: …` captions.

- **AC-2.** On `PengembalianScreen`, no field box declares a fixed `height`; every one declares
  `minHeight ≥ 52`. Closes the PRD-5 BR-1 gap at `:1203` and `:1221`.

- **AC-3.** On `UserFormScreen` and `HutangFormScreen`, every `TextInput` sits in a field box. **No
  bare-text input remains** (treatment #8 is gone from both files), and no read-only-looking row is
  editable.

- **AC-4.** On `RentalDetailScreen`, no `surfaceContainerLow` single-value block remains (*Tujuan*,
  read-only *Catatan*), and **nothing on the screen renders in the field box** — it is read-only under
  D-4.

- **AC-5.** On `UserDetailScreen`, nothing renders in the field box, and every value row is the plain
  read-only rendering.

- **AC-6 (durability).** A source audit proves the field-box style set (border colour + fill + radius +
  `minHeight`) is declared in **exactly one** file under `app/`. Modelled on
  `AppText.clampAudit.acceptance.test.ts`; it must fail if a second declaration appears.

- **AC-7 (durability).** A source audit proves no `<TextInput` under `app/` — excluding `*.test.*` and
  the primitive itself — renders outside a field box, **except** for an explicit allow-list whose every
  entry carries a written reason. The allow-list starts as `LoginScreen` and `DetailSewaScreen` (D-6,
  D-7) and may only grow through a documented decision.

- **AC-8 (contrast, machine-checked).** A unit test asserts the field-box border meets **≥ 3:1**
  against its fill, computed from the tokens rather than hard-coded, so a future palette edit cannot
  silently drop it back to 1.70:1.

- **AC-9 (math parity).** The characterisation suite written under BR-12 passes **identically before
  and after** the `PengembalianScreen` migration — fuel adjustment, return total, `Sisa`, and auto-debt
  creation. A `rental-math-reviewer` pass returns clean.

- **AC-10 (inherited constraints).** At `fontScale` **1.5** every field box **grows rather than clips**
  (PRD-5), and `PengembalianScreen` still respects the system-nav inset via `useBottomBarPadding()` /
  `useBottomSpace()` (PRD-4) — **not re-derived**.

- **AC-11 (permission parity).** PRD-1's matrix is provably unchanged: `canEditKondisiKeluar` and
  `canEditNotes` are consumed unmodified, and the release contains no migration, no RPC change and no
  RLS change.

- **AC-12 (Mom's sign-off — the release is not ✅ without it).** On her own phone, Mom can look at
  `PengembalianScreen` and at a form screen and say, unprompted, which fields she can change. Recorded
  the way PRD-4/PRD-5 AC-8 are recorded — a named person, a date, and her words.
  > **This replaces the scaffold's OQ-6 (two mockups before building).** The mechanism no longer rests
  > on a guess — it was chosen on a contrast measurement, which is the same discipline OQ-6 was asking
  > for, applied earlier and more cheaply. What still cannot be measured is whether the result *reads*
  > to Mom, so the validation moves to sign-off rather than disappearing. **If PM would rather spend a
  > mockup round up front, that is a reasonable trade — it is a scheduling choice, not a correctness one.**

## Scope

**In scope**

1. Define the field box **once** in `app/components/form/`, with the three categories of BR-4, and
   record the rule (BR-11).
2. Apply it to `PengembalianScreen`, **including** the D-5 migration off that screen's local
   input-bearing primitives, behind BR-12's characterisation-test gate.
3. Apply it to `UserFormScreen` and `HutangFormScreen`.
4. **Strip** the misleading tinted single-value blocks from `RentalDetailScreen` (*Tujuan*, read-only
   *Catatan*); audit `UserDetailScreen` for the same.
5. Reconcile the existing scatter into the one definition: `RupiahInput` (correct its border token),
   `SearchField` (confirm as Control, unchanged), `Stepper` and `PhotoRow` (confirm as Controls),
   `FieldCard` (container, unchanged).
6. Add the coverage that AC-1/AC-2/AC-9 require on `PengembalianScreen` (debt #15), plus the two
   source audits (AC-6, AC-7) and the contrast unit test (AC-8).

**Explicitly out of scope (non-goals)**

- Changing **what** is editable. This PRD makes existing editability *visible*; it grants nothing and
  revokes nothing. PRD-1's permission matrix is untouched.
- Redesigning the palette, the type scale, or the visual identity. One convention, not a restyle.
  BR-3 changes **which existing token** a border uses; it does not add or alter a token.
- The **placement** and **prominence** of edit *buttons* — that is PRD-6.
- Rental math, connectors, values, or any server-side change. **The `PengembalianScreen` migration
  must move no math** — that is exactly what AC-9 exists to prove.
- `DetailSewaScreen` (D-6), `LoginScreen` (D-7), `HutangDetailScreen` and the list/search screens (D-7).
- The rest of debt **#4** — local `SectionLabel` / `FuelGauge` / `Stepper` / bottom action bar stay put
  (D-5). Full closure remains its own fenced release.
- A disabled/locked third state (D-8).
- Full accessibility conformance (screen-reader labels, complete contrast audit across all text, touch
  targets everywhere) — still deferred, as in PRD-5. BR-3 and BR-1's `minHeight: 52` set a floor for
  **the controls this PRD touches** and commit to nothing beyond them.

## What this costs — read before sizing

The scaffold assumed a presentation-only OTA. **D-5 changes that**, and PM should size against the
real shape:

| Item | Consequence |
|---|---|
| **The contradiction that forced the choice** | Scaffold scope items 3 and 4 could not both hold: it asked for the convention on `PengembalianScreen` *and* for delivery through `app/components/form/`, but that screen imports **one** thing from the library (`PhotoRow`, `:16`). The convention could not reach it through the primitives. |
| **The fence that opens** | Debt **#4** fences a `PengembalianScreen` primitive migration behind *"its own release, characterisation tests on the current math before anything moves, and a `rental-math-reviewer` pass"*. D-5 opens it — at **input-bearing depth only**, which is the narrowest opening that still delivers the convention. |
| **The coverage that becomes mandatory** | Debt **#15**: that screen has **zero** automated tests. Writing them is now a precondition (BR-12), not a ride-along. This is the single largest line item in the release. |
| **What is bought back** | Three live defects close as a side effect: the `height: 48` / `height: 40` PRD-5 BR-1 violations (`:1203`, `:1221`), the sub-48dp tap target on the money field, and the first real dent in debt #4 — plus the first automated coverage that screen has ever had. |
| **Still OTA** | No native dependency, no `app.json` `version` bump. The risk is *math regression*, not delivery. |

**Suggested sequencing for PM** (advisory, not a decision): characterisation tests first, as their own
verifiable step; then the primitive + the two form screens (low risk, high signal); then the
`PengembalianScreen` migration; then the strips. AC-9 gates the merge, AC-12 gates the ✅.

## Known exceptions — record these, or they read as drift

Two screens deliberately do **not** carry the convention when this ships. Both belong in the rule doc
(BR-11) and in AC-7's allow-list with their reason attached:

- **`LoginScreen`** (D-7) — treatment #5, its own fill and no border. Not a data-entry surface in the
  operational sense; Mom sees it rarely because the session persists. **Risk accepted:** it is one
  screen that breaks a rule the rest of the app teaches.
- **`DetailSewaScreen`** (D-6) — fenced with `PengembalianScreen` under debt #4; its treatment #4 is
  the closest stray to the target, so it reads as near-right rather than wrong. Follows in a second pass.

> The scaffold's OQ-5 warned that *"a half-applied convention is arguably worse than none, since it
> teaches a rule the other screens then break."* That risk is real and is being taken deliberately, on
> two screens, with reasons. Recording them here is what separates a decision from drift.

## Dependency — settled 2026-07-25

PRD-6 (`docs/prd/PRD-6-edit-must-be-unmistakable.md`) reshapes `RentalDetailScreen`'s edit interaction.
Both PRDs required their OQ-1s to be settled **jointly, in one sitting**, before either left scaffold
state. **That happened in this session — see D-4.** PRD-6's **D-6** (a dedicated rental edit screen) is
accepted, so:

- `RentalDetailScreen` becomes **100 % read-only**, and PRD-8's work there is **subtractive only**
  (scope item 4).
- The `insetBlock` ↔ `notesInput` tint collision is resolved by **deletion**, not by arbitration.
- PRD-8's remaining burden sits where it was always going to sit: `PengembalianScreen` and the form
  screens.
- **PRD-6's edit screen inherits this convention rather than inventing one** — its fields are Fields
  under BR-4 and wear the box. That is the entire point of D-1's sequencing.

Document sequencing stays **PRD-8 → PRD-6**. Whether PM bundles them into one release is PM's call;
the *convention* must be settled before PRD-6's design begins, and now is.

> ⚠️ Numbering is not ship order in this project (PRD-1 shipped in v1.0.3; PRD-4/5 in v1.0.4). PRD-8
> leading PRD-6 is intentional, not a mistake.

## Open questions — none blocking

Design-session and PM calls that do not change the shape of the work:

- **OQ-1 (design).** The box's **fill**: `surface` `#f6faff` (what treatments 2/3/4 already use — a
  faint recess inside a white `FieldCard`, nothing on the page background) or plain white with the
  border doing all the work. Either satisfies BR-1 and BR-3; `#f6faff` is the smaller diff.
- **OQ-2 (design).** The *Kembali* **date/time row** on `PengembalianScreen` — it is a Field under
  BR-4 (a recorded value Mom picks), so it should wear the box. Confirm, and decide what happens to
  its existing `inlineEditBtn` (`:432-435`) once the box makes the row self-evidently editable —
  keep both, or let the box replace the button.
  > ⚠️ Touching this row means touching the field debt **#16** is about. **Do not change the
  > `returnedAt` default here** — that is explicitly out of scope in PRD-6 §Recorded, not scoped, and
  > needs a server change. Styling the row is safe; re-seeding it is not.
- **OQ-3 (design).** `extraFeeDesc` (`:1268`) is treatment #10, a bottom-border underline. Box it like
  every other Field, or keep the underline as a deliberate lightweight variant for repeating rows?
  Boxing is more consistent; underlines cost less vertical space at `fontScale` 1.5, and these rows repeat.
- **OQ-4 (Lead / Tester).** How much characterisation coverage is "enough" before the D-5 migration
  moves anything? BR-12 sets the requirement; the depth is an execution call. Minimum bar: fuel
  adjustment in both directions across zero, return total, `Sisa`, and auto-debt creation at close.
- **OQ-5 (PM).** Does AC-12 (Mom's sign-off) gate this release's ✅ **independently**, or ride along
  with v1.0.4's still-outstanding PRD-4/PRD-5 AC-8 sign-off? Two pending sign-offs on one person is a
  scheduling question worth answering deliberately rather than by accident.
- **OQ-6 (PM).** `LoginScreen` is excluded by D-7. It is two fields and roughly an hour. If PM wants
  the convention to be exceptionless at ship, folding it in is cheap — the reason it is out is
  scope discipline, not difficulty.
