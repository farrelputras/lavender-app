# v1.0.5 · dispatch ⑥ — `rental-math-reviewer` AC-9 fence check

> ⚠️ **SIDECAR — awaiting merge into `docs/reports/v1-0-5.md`.** Written as a separate file because two Lead
> sessions were editing the release report concurrently on 2026-07-26 and appending into it risked corrupting
> the record. **Merge this into the main report once report ownership is settled**, then delete this file.
>
> ⚠️ **Numbering collision, unresolved at time of writing.** This dispatch was numbered **⑥** by the session
> that ran it (matching the originally approved plan). A parallel Lead session independently assigned **⑧**
> and **⑨** to other work and left ⑥ *on hold*. **⑥ here means: the `rental-math-reviewer` pass on ⑤'s
> committed diff.** See "Scope and its limits" below — this is not the full-diff review the parallel plan
> wanted ⑥ to be, and it does not discharge that obligation.

- **Dispatched:** 2026-07-26, by the Lead session resumed at 21:17.
- **Agent:** `rental-math-reviewer`, read-only, no Bash tool.
- **Reviewed:** ⑤'s **committed** diff `0eb4150 → 99a179b` (`PengembalianScreen.tsx`), plus non-contaminated
  reads of `FieldBox.tsx`, `FieldCard.tsx`, `rentalMath.ts`, `PengembalianScreen.characterization.test.tsx`,
  `docs/02` §6, the release plan and PRD-8.

## Scope and its limits — read before trusting this as AC-9's closure

At dispatch time the working-tree `PengembalianScreen.tsx` was **contaminated**: it carried Farrel's own
uncommitted hand edit removing the *Kembali* row's `inlineEditBtn` (F-11, `4 +` / `8 −`), which Lead had not
yet identified. So Lead staged **pristine artifacts** from git rather than let the reviewer read the working
tree:

| Artifact | Contents |
|---|---|
| `dispatch5-PengembalianScreen.diff` | `git diff 0eb4150 99a179b -- PengembalianScreen.tsx` |
| `PengembalianScreen.at-99a179b.tsx` | `git show 99a179b:…` — the whole file as of ⑤'s commit |
| `dispatch5-commit-stat.txt` / `dispatch5-full-stat.txt` | commit metadata and per-file stat |

⑥ confirmed it never opened the working-tree screen. **All line numbers below refer to the `99a179b`
snapshot**, not to the current file.

**Therefore this review covers ⑤'s migration only.** It does **not** cover Farrel's F-11 edit, nor anything a
later dispatch changes on that screen. **A second `rental-math-reviewer` pass is still owed on the final
diff.**

> **Technique worth reusing:** `git show <sha>:<path>` and `git diff <a> <b> -- <path>` redirected to files
> give a reviewer with no Bash tool a pristine, immutable view of exactly what was committed — immune to
> concurrent working-tree edits. It also lets Lead supply code to a reviewer without reading any code itself,
> which `docs/agents/lead.md` forbids.

## VERDICT

**PASS on the money fence** — ⑤'s diff is a component swap and nothing else on every calculation path.
**PASS-WITH-CONCERNS overall** — two of ⑤'s reported claims are inaccurate, one materially, and one in-scope
omission will trip a later gate. **No behavioural change on any money path.**

## Method — hunk arithmetic, not impression

⑥ derived cumulative old→new line offsets across all **14 hunks** (`+1, −3, −3, +2, +2, +4, +6, +8, +10, +15,
+19, +19, +24`) and computed the **untouched old-line ranges**:

**90–403** · 483–501 · 523–555 · 574–589 · 610–631 · 663–690 · 751–783 · 791–962 · 972–1048

**Old 90–403 contains the entire logic body of the screen** — state, hydration effect, computed values,
picker handlers, extra-fee mutators, `applyFuelSuggestion`, `handleSave` — **and appears in no hunk at all.**

It also checked the primitive itself: `app/components/form/FieldBox.tsx:47-49` is
`<View style={[styles.box, style]}>{children}</View>` — **no `cloneElement`, no prop injection, no
handlers** — so it structurally *cannot* alter the behaviour of anything it wraps. That is what makes
"component swap only" a proof rather than an impression.

## The six fence items — all confirmed unchanged

| # | Item | Evidence |
|---|---|---|
| 1 | **Fuel adjustment** | `applyFuelSuggestion()` `:302-309` = old 305–312, inside untouched 90–403. Inputs unchanged: `fuelAdj` `:244-246`, `hargaPerKotak` `:229`, `bensinKembali` `:178`, `Stepper` clamps `:536-537`. `computeFuelAdjustment` import `:36` untouched. `rentalMath.ts` is not in the commit (2 files total) |
| 2 | **Return total** | `subtotalSewa` `:228`, `discount` `:230`, `extraFeesComputed` `:231-234`, `totalTagihan = computeReturnTotal(...)` `:235` — all untouched. *Total Tagihan* display `:798-805` untouched. `infoRow`'s `minHeight: 40` byte-identical |
| 3 | **`Sisa`** | `alreadyPaid` / `pendingPaid` / `totalPaid` / `sisa = Math.max(0, totalTagihan − totalPaid)` `:236-239` untouched. `paySummary` render `:899-926` inside untouched 791–962, including its PRD-5 `flexWrap` / `gap` |
| 4 | **Auto-debt path** | Jaminan banner, `sisa > 0` colour/text, *"Hutang otomatis dibuat…"* `:930-982` untouched. CTA label `sisa > 0 ? "Selesaikan & Buat Hutang" : "Selesaikan Pengembalian"` `:1026` untouched. Debt creation is server-side via `closeRental` — no client-side hutang code exists or was added |
| 5 | **Close payload** | `handleSave` `:312-337`; `CloseRentalInput` literal `:317-330` with field order intact (`returnedAt`, `kondisiKembali`, `subtotalSewa`, `extraFees`, `discount`, `tujuan`, `notes`, `newPayments`); `await closeRental(rental.id, input)` `:331`; `navigation.replace(...)` `:332` — all untouched. `getRental` / `getUserSummary` / `getVehicle` `:209`/`:214`, `updatePayment` `:1042`, `deletePayment` `:1060` likewise |
| 6 | **`returnedAt` `new Date()` seed (guard 1)** | **Byte-identical.** `useState<Date>(() => new Date())` at `:172`, outside every hunk. `pickerTempDate`'s twin seed `:175` likewise. **Guard 1 held** |

## ⑤'s claims, verified independently

| Claim | Verdict |
|---|---|
| `returnedAt` seed byte-identical (guard 1) | **Confirmed** |
| Local `SectionLabel` / `FuelGauge` / `Stepper` / bottom bar untouched (guard 2) | **Confirmed.** Hunk 2 removes *only* the local `FieldCard`. **The diverged `FuelGauge` `max` was NOT migrated** — the specific "behavioural change in refactor's clothing" risk did not materialise. `Stepper`'s `min = 0, max = 8` sits inside untouched 90–403 |
| `applyFuelSuggestion()` body **and** the unconditional amber both untouched (guard 3) | **Confirmed** — body `:302-309`; `fuelSuggestionRow` style byte-identical including `backgroundColor: colors.warningContainer`; `fuelSuggestionIcon` and `terapkanBtn` also byte-identical |
| No math edited (guard 4) | **Confirmed** — see items 1–5 |
| `DetailSewaScreen` never opened (guard 6) | **Confirmed for the commit** — the stat lists exactly `PengembalianScreen.tsx` + `docs/reports/v1-0-5.md`. ⑥ cannot speak to files opened-and-reverted |
| **AC-2:** `inputRow`'s `height: 48` and `amountInputRow`'s `height: 40` gone, replaced by `minHeight ≥ 52` | **Confirmed.** Neither carries border/fill/radius/height; `FieldBox` supplies `minHeight: 52` + `colors.outline` + `colors.surface` + radius 12. `inlineInput`'s `minHeight: 48` also dropped. **AC-2 holds** |
| …*"the only two remaining `height:` declarations are `backBtn` and `stepperBtn`"* | ❌ **FALSE — see D-1** |
| **Judgment call 1:** *Diskon* had to be boxed | **Confirmed, and no non-regressive alternative existed.** All three amounts render `styles.amountInputRow`, whose border/fill/radius/height AC-6 required deleting. The alternatives were a second box-style declaration (direct AC-6 breach) or a visibly de-styled *Diskon*. `amountBox` preserves the old pill's `minWidth: 140` |
| **Judgment call 2:** local `FieldCard` → `<View style={styles.card}>` rather than the shared `FieldCard` | **Confirmed, and it changed no spacing.** The removed local component was literally `<View style={styles.card}>{children}</View>`, so the substitution is render-identical. Adopting the shared component would have been a real layout change: `form/FieldCard.tsx:16-23` has `marginBottom` + `marginHorizontal` + `padding: spacing.md` and **no `gap`**, vs local `padding: spacing.base` + `gap: spacing.md` + no margins — it would have added margins inside an already-padded `ScrollView`, shrunk padding 16→12, and collapsed the inter-row gap in every card. **Declining it was correct** |

## Debt #12 — confirmed **preserved**, both divergences

- **(a) The suggestion writes an extra-fee line rather than adjusting Subtotal.** `applyFuelSuggestion`
  `:302-309` appends `{description: "Bensin", rawAmount: String(signed)}` to `extraFees`; `setRawSubtotal` is
  never called from it. Diverges from `docs/02` §6:130 and §6:124. **Unchanged by the diff.**
- **(b) The row renders amber unconditionally.** `fuelSuggestionRow.backgroundColor = colors.warningContainer`
  with no direction branch, while §6:127-128 wants green for *more fuel returned* / amber for *less*.
  **Unchanged by the diff.**
- **Sign semantics remain §6-correct underneath:** `computeFuelAdjustment` returns `subtract` for
  `selisih > 0` (`rentalMath.ts:85`) and `applyFuelSuggestion` writes `−deltaRupiah`, so the net rupiah
  direction matches §6 in both directions.

**Guard 3 respected; nothing to act on** — which is exactly the finding the brief asked for rather than a
defect report.

## ⚠️ D-1 · ⑤ reported something false, and the falsehood concealed a live PRD-5 exposure

⑤ claimed *"the only two remaining `height:` declarations in the file are `backBtn` and the local
`stepperBtn`."* **There are seven:**

`addLineBtn` `:1094` (44) · `backBtn` `:1135` (40) · `fuelSegment` `:1206` (12) · `fuelSuggestionIcon` `:1223`
(36) · `paymentIcon` `:1336` (36) · `rowDivider` `:1351` (1) · `stepperBtn` `:1368` (40) — plus an inline
`height:` at `:1006` and `shadowOffset.height` `:1148`.

**AC-2 still holds** — none of them is a field box, which is what AC-2 governs. But:

> **`addLineBtn`'s fixed `height: 44` sits on a text-bearing button** — a live **PRD-5 BR-1** exposure and a
> **sub-48dp tap target**. ⑤'s claim would have kept it off Lead's desk entirely.

**Actions:** ⑤'s sentence **must not be repeated in the release report as written**. And this is the **sixth**
factual correction of v1.0.5 (C-1…C-5, ⑤'s `PembayaranSheet` treatment-#8 claim, now D-1) — **every one caught
by an agent reading the file, none by a reviewer reading a document.**

> **Independently corroborated.** The parallel Lead session found the same `addLineBtn` `height: 44` defect
> from a different direction (its "Finding 4 / Q3.3" button-alignment work) and Farrel ruled
> `minHeight: 48` on both button styles. **Two agents, no shared context, same defect** — the same pattern
> that made ④'s `PembayaranSheet` correction safe to believe.

## ⛔ D-2 · *Catatan* is a **confirmed** AC-7 scope breach, not a suspicion

⑤ *guessed* this; ⑥ **verified** it from source:

- Snapshot `:993` renders a bare `<TextInput value={notes} onChangeText={setNotes} multiline>`.
- `notes.trim()` reaches the close payload at `:328`.
- ⇒ a **Field** under BR-4, so BR-1 / AC-1's *"**every** field Mom enters or picks renders in the field box"*
  (PRD-8:562) covers it even though AC-1's enumeration stops short of it.
- **AC-7** (PRD-8:596) forbids any `<TextInput` under `app/` outside a box except `LoginScreen` +
  `DetailSewaScreen`, and `docs/releases/v1-0-5.md`:169 calls a third entry *"a scope breach, not a test
  detail."*

**`PengembalianScreen`'s *Catatan* is currently exactly that third entry**, and ⑦ would be correct to fail the
release on it.

**Status: owned and queued.** Farrel ruled it out of the reviewing session (*"leave it unboxed in this
session, it's being worked on in another session"*), and the parallel plan carries it as **⑨ item 3**
(*"Box Catatan (`:989`, tag 8 of 8, confirmed unboxed)"*). **⑥'s finding independently confirms that item is
mandatory, not optional.** It is an **omission, not an unauthorised change** — the money verdict is
unaffected.

## D-3 / D-4 / D-5 — three smaller divergences

- **D-3 · guard 1's cited line was a pre-migration number.** `docs/releases/v1-0-5.md`:91 and ⑤'s brief say
  `~:175`; post-migration the seed is at **`:172`** (hunk 2 removed 3 lines above it). Same code,
  byte-identical. The seventh instance of this release's line-number drift.
- **D-4 · a stale comment inside the AC-9 instrument.**
  `PengembalianScreen.characterization.test.tsx:464` still reads *"`amountInputRow` uses `height: 40`, a
  distinct key from `minHeight`."* `amountInputRow` no longer has `height` at all — the helper still works for
  a **different** reason (`FieldBox`'s `minHeight: 52` ≠ 40). Harmless today; **exactly the kind of stale
  reasoning that gets trusted later.** ⑤ correctly did not edit the suite (AC-9 requires it unmodified), so
  this is owed to whoever closes AC-9.
- **D-5 · two intentional style-value edits beyond key reordering**, both cosmetic, both inside ⑤'s brief,
  neither on a money path — recorded so "swap only" is not **over**stated: `amountInput`
  `paddingVertical: 0` → `padding: 0`; `extraFeeDesc` losing its `borderBottom*` (D-3's boxing decision) with
  `flex: 1` relocated to `extraFeeDescBox`; Tujuan's former inline `minHeight: 40` becoming
  `tujuanInput {color, padding: 0}` with height from `FieldBox`. Everything else in the 338/332 churn is
  `react-native/sort-styles` alphabetisation.

## What ⑥ could not verify, and how it is closed

**⑥ has no Bash tool, so it could not run the suite. AC-9's "identical before and after" is therefore
*analytically* argued by ⑥, not observed by it** — and it said so plainly rather than issuing a PASS it could
not back. Correct behaviour, and the same tooling limit v1.0.4's reviewer hit.

**Closed from the other side: Lead observed it.** At ⑤'s return, on a clean tree at `99a179b`, Lead re-ran and
measured **2 suites / 46 tests passing, identical before and after**, plus the full **52 suites / 284 tests**.
That is the AC-9 observation of record.

⑥ additionally hand-audited **every locator** in the characterisation suite against the post-migration tree
and found all survive, each for a stated structural reason: `getRowValue` via `infoRow`'s unchanged
`minHeight: 40` · `removeDiscountRow` still reaching `infoRow` because `FieldBox` presents 52, not 40 ·
`getExtraFeeRowByDescription` / `allExtraFeeRows` unaffected because the box has `justifyContent: "center"`
and no `gap` (excluded by both predicates) and `amountInputRow` / `inputRow` hold exactly **1** `TextInput`
each (excluded by the ≥2-input filter) · `getJaminanBannerColor` unable to false-match because the box
declares `paddingHorizontal` / `paddingVertical`, not `padding`.

**Analytical and observed agree.**

### ⚠️ Two re-runs still owed before publish

1. **The characterisation suite must be re-run after Farrel's F-11 edit and after ⑨ lands.** Neither Lead's
   measurement nor ⑥'s audit covers changes that did not exist when they were taken. Note in particular that
   F-11 removed a control the suite pins by its `"Edit"` text
   (`characterization.test.tsx:1034`), so a red result there is **expected** and is owned by the queued
   `tester` re-point — not a regression.
2. **A second `rental-math-reviewer` pass on the final diff**, per the parallel plan's own sequencing. This
   sidecar does not discharge it.

## One AC-10 flag for ⑦'s visual checklist

The extra-fee row now stacks **two ≥52pt boxes** (`extraFeeDescBox` `flex: 1` + `amountBox` `minWidth: 140`)
**plus a trash icon on one line** (`:707-739`). Horizontal room at `fontScale` 1.5 is a device question, not a
source question. **⑦'s AC-10 pass must look there specifically.**
