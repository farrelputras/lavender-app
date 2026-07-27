# v1.0.5 — handoff from the 21:17 Lead session

> **Ownership settled 2026-07-26 `[by-Farrel]`: the S4 session drives. This session hands off.**
> Two Lead sessions orchestrated v1.0.5 concurrently on 2026-07-26 (S4 from ~21:23, and this one from
> ~21:17). Farrel ruled S4 the driver. This file is **not** a narrative to merge — it is a **decision log +
> to-do list** for the driving session, covering only what S4 cannot know because it happened here.
>
> **This session wrote to `docs/reports/v1-0-5.md` before ownership was settled.** Its contribution is the
> section beginning `# ⚠️ AMENDMENT — the *waktu kembali* display defect` (~line 2286) and the two ruling
> blocks above it. **That text is S4's to merge, reword, or renumber.** This session has stopped editing that
> file.

## Why this file exists

Farrel reported a **P1/high user-visible defect** in this session, PM was consulted twice, and he made
**eight decisions** that exist nowhere in the main report's S4 narrative. Two dispatches were run. None of it
is recoverable from S4's context.

## Numbering — resolved `[by-agent]`

S4's **⑧** (`tester` re-point of the D-2 pinned interaction) and **⑨** (`developer-frontend` device-findings
bundle) **keep their numbers** — they are already written into the report.

| Number | Dispatch | Status |
|---|---|---|
| **⑥** | `rental-math-reviewer` on ⑤'s **committed** diff (`0eb4150 → 99a179b`) | ✅ **RAN.** Record: `docs/reports/v1-0-5-dispatch-6.md`. **Does NOT discharge the final-diff review** |
| **⑧ / ⑨** | S4's, as written in the main report | ⏸ held, awaiting Farrel's *"the list is final"* |
| **⑩** | `developer-frontend` — the `returnedAt` display fix on `RentalDetailScreen` | ✅ **RETURNED GREEN, verified by Lead.** Commit `f0a965e`. Originally numbered ⑧ here; renumbered to avoid collision |

> ⚠️ **The main report contains stale lines saying "⑥ still on hold" / "⑥ remains on hold independently."**
> ⑥ ran. Those lines need correcting, and ⑥'s *scope* needs stating precisely: it reviewed **⑤'s migration
> only**, not Farrel's F-11 edit and not anything ⑨ or ⑩ change.

## The defect ⑩ fixes, and why it was folded in

**Reported by Farrel on his device:** Mom edits *waktu kembali* on `PengembalianScreen` → *Selesaikan
Pengembalian* → `RentalDetailScreen` shows the value from the original *sewa baru* flow instead.

**PM traced it to a read-side omission. Nothing is lost and nothing is corrupt:**

| Hop | Site | Verdict |
|---|---|---|
| Screen state → payload | `PengembalianScreen.tsx:172`, `:318` | ✅ |
| Connector | `app/services/rentals/index.ts:422` — `returnedAt: input.returnedAt.toISOString()` | ✅ |
| RPC write | `…close_rental_exclude_deleted_payments.sql:84` — `returned_at = (payload->>'returnedAt')::timestamptz`, **the client's value, not `now()`** | ✅ |
| Read back | `translators.ts:62` | ✅ |
| **Display** | **`RentalDetailScreen.tsx:~433`** renders `rental.dueAt` under the label **"Kembali"** | ❌ **the defect** |

`dueAt` is the *planned* return (`DetailSewaScreen.tsx:329`, `dueAt: estimasi`). **`rental.returnedAt` is
rendered nowhere in `app/`** — outside its type, translator, and `PengembalianScreen`'s local state it appears
only in test fixtures, all `returnedAt: null`. The screen already holds a full refetched `Rental` (`~:117` via
`getRental` `~:142`) and never reads the field.

**Every rental Mom has closed has the correct return time in the database.** No audit, no backfill, no
migration. **Guard 5 / BR-9 / AC-11 untouched; the "fully OTA-revertible" rollback story survives.**

**Not a v1.0.5 regression.** ④b touched *Tujuan* / read-only *Catatan* / `kmEditInput` / `notesInput`; ⑤
touched `PengembalianScreen` only. Neither went near the Waktu Sewa card (`:410-454`). **AC-9 did not fail and
⑤ broke nothing.** Almost certainly v1.0-era; ⑩ was asked to confirm with `git log -L`.

## Farrel's decisions in this session — none of these are in the main report's S4 narrative

| # | Decision | Note |
|---|---|---|
| **A-3a** | **Fold the fix into v1.0.5** rather than hotfix a v1.0.6 | Cheapest moment it will ever exist (⑦ unstarted, so it rides the same tester pass), and it fixes **the build Mom validates** — under the hotfix option she signs off on a build that is not the one she keeps |
| **A-3b** | **Tripwire pre-authorised** — if the fix needs anything beyond `RentalDetailScreen`'s render + tests (connector change, type change, shared-helper extraction, *new* shared helper, or one line inside `PengembalianScreen`) it **drops to v1.0.6 automatically, without renegotiation** | Fired the same day — see A-4a |
| **A-4a** | **The Durasi change defers to v1.0.6.** ⑩ ships the return-time row only | **The tripwire fired on the day it was authorised and was allowed to.** Verbatim ruling: *"Split but make sure it is extracted into a shared util, not as a new helper"* |
| **A-4a′** | When A-4a ships it must **extract `formatActualDuration` into a shared util**, never define a parallel helper | **Farrel's constraint, stronger than either Lead's or PM's proposal** — it means the two-copies divergence risk never comes into existence rather than being deferred |
| **A-4b** | **Substitutive: the booked package goes.** On a COMPLETED rental the row shows the **actual** return only — no planned value, no muted secondary line, no second row | Chosen with all three ⚠ costs displayed |
| **Labels** | **`Dikembalikan`.** *"let it be, no need to ratify"* | `Estimasi` was the alternative; it is already the app's own word for `dueAt` (`DetailSewaScreen.tsx:307`, `:371`, `:742`) if a planned line ever returns |
| **Severity** | **P1/high**, not P0 | Farrel reported it as P0. Recorded as P1 so *"it's P0"* cannot later buy a guard-5 waiver or a halt. **Scheduling unchanged either way** |
| **PRD-9** | Opened **after** the OQ-5 visit, not now | Its content: *"a completed rental's record tells the truth about what actually happened"* — the planned-only Waktu Sewa card, actual duration with no home, actual lateness with no home, **debt #16**, and PRD-1's permission matrix not listing return time. **This is where the RPC + matrix extension get scoped properly, once** |
| **AC-12 / Mom's visit** | **Does not grow.** Stays three verdicts (PRD-4 AC-8, PRD-5 AC-8, v1.0.5 AC-12) | AC-12 asks a *presentation* question; adding *"is this the right return time?"* mixes two mental models. **AC-13 goes on Farrel's device pass instead** |

### ⑩'s exact scope, as dispatched

| Rental status | Label | Value |
|---|---|---|
| COMPLETED, `returnedAt` present | **`Dikembalikan`** | `rental.returnedAt` |
| COMPLETED, `returnedAt` `null` | `Kembali` | `rental.dueAt` — **exactly today's output**, never blank, never `Invalid Date`, no backfill |
| Anything else (ACTIVE …) | `Kembali` — unchanged | `dueAt` — unchanged, incl. `error` colour (`~:429`) and Terlambat banner (`~:446-452`) |

Three TDD assertions required: COMPLETED with `returnedAt ≠ dueAt` · **ACTIVE negative** (the one that stops
the fix breaking the case that was always correct) · COMPLETED with `returnedAt === null`. Plus a real value in
at least one `RentalDetailScreen.acceptance.test.tsx` fixture (`:~87` carries `returnedAt: null`).

**AC-13, proposed wording:** *On `RentalDetailScreen`, a COMPLETED rental displays the actual return time from
`rental.returnedAt`, distinguishable from the planned `dueAt`; an ACTIVE rental's Waktu Sewa card is unchanged
in output. Verified by jest (both statuses) and by one round trip on a real Android device.* **Attach it to the
publish gate, NOT to AC-9** — it has no math surface, and diluting AC-9 is how a money gate stops meaning
something.

### ⑩ — returned green. **Lead re-ran everything rather than quoting the agent.**

| Check | ⑩ reported | Lead measured | Verdict |
|---|---|---|---|
| Commit scope | 3 files | **`f0a965e`, exactly 3 files** — `RentalDetailScreen.tsx` (15 lines, +12 net), `.test.tsx` (+57), `.acceptance.test.tsx` (+27) | ✅ |
| Suites / tests | 52 / 288, 1 failing | **52 / 288, 287 passing, 1 failing** (24.8s) | ✅ `+4` tests vs 284, all ⑩'s |
| The 1 failure | pre-existing, not its own | **Confirmed:** `returnedAt — the Kembali picker interaction … › pressing the inline Edit control opens the Android picker, and a chosen value reaches the payload` | ✅ **S4's ⑧ owns it** |
| Types | exit 0 | **`npx tsc --noEmit` exit 0** | ✅ |
| Lint | 121 | **121**, and the breakdown independently corroborates the cause: `no-unused-styles` **4** (was 3) | ✅ **+0** |

**What it built** — three derived constants beside the file's other derived render values (actual line `303`,
*not* the brief's `~433`; the JSX row is at `422-441`):

```ts
const showActualReturn = rental.status === "COMPLETED" && rental.returnedAt != null
const kembaliLabel = showActualReturn ? "Dikembalikan" : "Kembali"
const kembaliDate  = showActualReturn ? (rental.returnedAt as Date) : rental.dueAt
```

The `overdue && rental.status === "ACTIVE"` colour expression was left **completely untouched** — it was
already ACTIVE-gated, so COMPLETED rows were never eligible for `colors.error` anyway. **No other line in the
file changed.**

**TDD evidence, red before green** — and note the honest asymmetry ⑩ reported itself: only the two
*"actual value"* assertions were red→green. The ACTIVE and null-fallback tests **pass both before and after by
design**, because they encode *"must not change"*. They are regression guards, not new-behaviour proofs, and
⑩ said so rather than presenting 4 green tests as 4 proofs.

```
× COMPLETED with a returnedAt that differs from dueAt
    Unable to find an element with text: Dikembalikan
    [renders "Kembali" / "Kamis, 2 Juli 2026 · 07:00" — the planned dueAt]
× shows the actual returnedAt  (acceptance fixture)
    Unable to find an element with text: Dikembalikan
```

**Tripwire: did not come near firing.** No connector change, no type change (`Rental.returnedAt: Date | null`
and `RentalStatus` already existed exactly as needed), no shared or new helper, **zero lines in
`PengembalianScreen.tsx`.** PM's scoping prediction — that this was containable inside the render layer — held
exactly.

> **The branch does not carry a red commit.** The suite failure comes from Farrel's **uncommitted**
> working-tree edit, not from `f0a965e`: ⑩ never touched `PengembalianScreen.tsx`, and the failing assertion
> locates `getAllByText("Edit")`, the control that edit removed. **S4's plan to commit Farrel's edit together
> with ⑧'s re-point as one commit therefore still holds.** Stated as reasoning, not measurement — verifying it
> directly would require stashing Farrel's uncommitted work.

## Artifacts this session produced

| Path | Contents |
|---|---|
| `docs/reports/v1-0-5-dispatch-6.md` | ⑥'s full record. **Sidecar, awaiting merge** |
| `docs/reports/v1-0-5.md` ~line 2286 onward | The amendment section + two ruling blocks. **S4's to merge or rewrite** |
| `…/scratchpad/dispatch5-PengembalianScreen.diff`, `PengembalianScreen.at-99a179b.tsx`, `dispatch5-*-stat.txt` | Pristine artifacts staged for ⑥. Regenerable; see the technique note below |
| **this file** | The decision log |

## Owed, in priority order

1. **Record ⑩ in the main report** — it is **done and Lead-verified** (`f0a965e`, see the ⑩ section above).
   Nothing about it is outstanding except the bookkeeping: the `Also rides along:` line and **AC-13** on
   `docs/releases/v1-0-5.md`, and **debt #17** opened-and-struck at ship.
2. **⛔ *Catatan* must be boxed (⑨ item 3) or ⑦ fails the release.** ⑥ independently **verified** what ⑤ only
   guessed: `PengembalianScreen` snapshot `:993` renders a bare `<TextInput value={notes} onChangeText={setNotes} multiline>`
   and `notes.trim()` reaches the close payload at `:328`. That makes it a **Field** under BR-4, so AC-7
   (PRD-8:596) forbids it being unboxed, and `docs/releases/v1-0-5.md`:169 calls a third allow-list entry
   *"a scope breach, not a test detail."* **⑨ item 3 is mandatory, not optional.**
3. **Re-run the characterisation suite** after Farrel's F-11 edit and after ⑨. A red result on
   `characterization.test.tsx:1034`'s `"Edit"` locator is **expected** — F-11 removed that control and S4's ⑧
   owns the re-point. Neither Lead's `99a179b` measurement nor ⑥'s locator audit covers changes that did not
   exist when they were taken.
4. **A second `rental-math-reviewer` pass on the final diff.** S4's sequencing was right that ⑥ should review
   the final state; this session ran it early on ⑤'s diff. **`v1-0-5-dispatch-6.md` does not discharge it.**
5. **Correct the stale "⑥ on hold" lines** in the main report, and state ⑥'s scope precisely.
6. **`addLineBtn`'s fixed `height: 44`** — a sub-48dp tap target on a text-bearing button, a live PRD-5 BR-1
   exposure. **⑥ found it via D-1; S4 found it via Finding 4 / Q3.3; Farrel ruled `minHeight: 48` on both
   button styles.** ⑨ item 5 covers it. **⑤'s claim that only `backBtn` and `stepperBtn` retain `height:` is
   FALSE — seven do — and must not be repeated in the report as written.**
7. **Debt register additions** on top of the existing list:
   - **#17** — the read-side `returnedAt` omission, **opened and immediately struck as fixed-in-v1.0.5**, with
     cross-references to #16 both ways.
   - **#18 — no cross-screen integration coverage.** See F-10 below. **Owed regardless of ⑩'s outcome.**
   - **F-11 (this session's numbering)** — the `durationToPaket` reuse trap. See below.
   - `addLineBtn`'s `height: 44` if ⑨ does not close it.
   - **D-4:** a stale comment at `characterization.test.tsx:464` claims `amountInputRow` uses `height: 40`.
     It no longer has `height` at all; the helper works for a different reason (`FieldBox`'s `minHeight: 52`
     ≠ 40). Harmless today, and exactly the kind of stale reasoning that gets trusted later. ⑤ correctly did
     not edit the suite. **Owed to whoever closes AC-9.**
8. **Farrel's own-device round trip as a blocking pre-publish gate** — edit the return time on Android →
   *Selesaikan Pengembalian* → the detail screen shows it. **The only check in the release that crosses a
   screen boundary.** Recommended, not yet confirmed by him.
9. **v1.0.4's overlapping visual rows** (B3/C3/F2, I6/J2/F3, B4/D1/I8, C5/I7) on Farrel's device **before**
   v1.0.5 publishes. Approved 2026-07-25 `[by-Farrel]`, **still not started.**
10. **v1.0.6 contents, Lead's recommendation:** bundle **A-4a** with **debt #16** and **PRD-9**. Extracting
    `formatActualDuration` properly wants the debt-#4 fence legitimately open.

## Findings worth keeping

### F-10 · Every test in this project stops at a screen boundary

**No test follows a value from one screen, through the connector, to its display on another.** Eight green
dispatches, 52 suites, 284 tests, and a characterisation suite written *specifically* to pin
`PengembalianScreen` — and none caught this bug, **because none could.**
`PengembalianScreen.characterization.test.tsx:1087` asserts
`expect(payload.returnedAt).toEqual(new Date(2026, 6, 10, 14, 30, 0, 0))`. It proves the payload was right.
**It is green. It was green while this bug was live.** Anyone glancing at it will believe it covers the fixed
path. → **debt #18**, and it is the most valuable thing this bug bought.

### F-11 · The helper reuse that would have recreated debt #16

`formatPaket(...durationToPaket(startAt, returnedAt))` composes **two existing shared exports** into an actual
duration with zero new arithmetic. It looks free. It is wrong:

**`durationToPaket` snaps** (`app/utils/rentalMath.ts:33-40`): `remainingHours < 3 → 0`, `< 9 → 6`, else `12`.
It is a **billing-package inference** function — its job is rounding an interval **up to a saleable tier**. A
vehicle gone 1 day 4 hours returns `{hari:1, jam:6}` → **"1 Hari 6 Jam (48+ jam)"** — **overstating reality by
up to 5 hours, in the vocabulary of a charge, on the one row whose entire purpose is truthfulness.**
`formatPaket`'s signature forbids it anyway (`jam: 0 | 6 | 12` cannot express an arbitrary hour count, and
widening it is a rental-math edit).

**`rentalMath.ts` contains duration arithmetic but not *this* duration arithmetic.**
`formatActualDuration` (`PengembalianScreen.tsx:60-68` — module-level, pure, `(start, end) => string`,
truncates rather than snaps, no `(N jam)` suffix) is the only elapsed formatter in the app. **Recorded because
the next person wanting an elapsed duration will find the same two exports and the same apparent freebie.**

### One ⚠ cost Farrel accepted does not bite until v1.0.6

He chose substitutive knowing lateness becomes unreconstructable in-app. **In v1.0.5 it does not** — Durasi
still shows the booked package, and `dueAt` *was* computed from it (`DetailSewaScreen.tsx:216`,
`setEstimasi(addDuration(mulai, hari, jam))`). So the planned return stays **derivable from Mulai + Durasi**
for one release. It becomes genuinely unrecoverable the moment A-4a flips Durasi to actual elapsed.
**Record that as an explicit v1.0.6 gate — v1.0.6 must re-confirm the trade rather than inherit it silently.**

### PM's independent correction to Lead's framing

Lead's opening hypothesis — *"the edit is being lost downstream of the screen"* — was **wrong**, and so was
the follow-on claim that Farrel's Durasi request rested on a false premise. `dueAt` **is** the booked package
expressed as a timestamp, so `formatPaket(paketHari, paketJam)` and the interval `startAt → dueAt` are two
renderings of one fact. **Farrel had correctly identified that Durasi is a planned number wearing no
marking** — precisely the defect class PRD-8 exists to remove. Recorded because the correction went from
Farrel → PM → Lead, not the other way.

### Technique: reviewing code a reviewer must not read from disk

⑥ had to certify `PengembalianScreen` while the working tree carried Farrel's uncommitted F-11 edit, and
`rental-math-reviewer` has no Bash tool. Solution:

```bash
git diff <base> <head> -- <path>  > scratchpad/dispatch.diff
git show <head>:<path>            > scratchpad/File.at-<sha>.tsx
```

The reviewer reads **pristine, immutable** artifacts, immune to concurrent edits — and Lead supplies code to a
reviewer **without putting code into its own context**, which `docs/agents/lead.md` forbids. ⑥'s hunk-offset
reconstruction then turned "the diff looks like styling" into a proof of which line ranges were untouched.
**Reusable for any fenced review, and worth adding to the Lead playbook.**

## Process finding — two Lead sessions on one release

Both sessions wrote to `docs/reports/v1-0-5.md`, assigned **⑧** to different dispatches, and held
contradictory beliefs about ⑥'s state. **No file was clobbered and no work was lost** — the two sessions
happened to touch disjoint product files — but that was luck, not design. **This session twice saw
"file modified on disk" warnings and rationalised them as its own edits.**

**Worth a debt entry or a playbook line:** the release report is a single-writer artifact, and a Lead session
should treat an unexplained modification to it as a **stop-and-check**, not a race to append. The cheapest
detector available was already in hand — `git status --short` showed an untracked
`docs/handoff-prompts/AI_Continuation_Document-26Jul2026-2123.md`, which is a *second session's* fingerprint
and was visible well before the collision was understood.
