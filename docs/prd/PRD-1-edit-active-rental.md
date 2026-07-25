# PRD-1 — Edit an active rental

- **PRD:** 1 — refer to this as **PRD-1**.
- **Status:** ✅ **SHIPPED 2026-07-21** in **v1.0.3** — OTA-only, channel `preview`, update group
  `6adbb879-a6be-4be3-b525-c292a5787aec`. All acceptance criteria pass (see §Acceptance criteria).
  Release record — what shipped, migrations, rollback: `docs/releases/v1-0-3.md`.
- **⚠️ AMENDED 2026-07-21 — BR-5 and AC-5 were reversed.** Exit photos are no longer freely
  removable by Mom. Read **§Amendment A-1** before changing anything in this area; the shipped
  behaviour deliberately contradicts this PRD's original text.
- **Target release:** v1.0.3 (`docs/releases/v1-0-3.md`). This PRD is the authoritative **requirements**;
  the release plan refers to it, not the other way around.
- **⚠️ BR-2 IS SUPERSEDED BY PRD-6 (2026-07-25) — do not restore the section-level Edit buttons.**
  BR-2 mandated per-section, in-place editing on `RentalDetailScreen`. In use, Mom reached for the
  *Kondisi Keluar* edit when she meant to run *Proses Pengembalian*.
  `docs/prd/PRD-6-edit-must-be-unmistakable.md` replaces that interaction.
  **Everything else in PRD-1 stands**: the permission matrix, the server-side gate, and Amendment A-1
  are all still authoritative. PRD-6 moves controls; it grants and revokes nothing.
  > **Corrected 2026-07-25 (PRD-6 §Correction C-1).** An earlier version of this pointer said the
  > mis-navigation *moved the fuel baseline*. It did not — the affected rental's defect was its
  > `waktu kembali`, which no PRD-1 control can reach. The baseline hazard is real in the code and
  > unrealized in the data. Do not cite this pointer as evidence that AC-6 was ever breached.
- **⚠️ AC-1 / AC-2 / AC-3 / AC-8 are executed through testIDs PRD-6 deletes.** They run via
  `kondisi-edit-btn` and `notes-edit-btn`. Two of the negative assertions
  (`RentalDetailScreen.acceptance.test.tsx:365-366`, `:381-382`) assert those testIDs are **null** —
  so once the buttons are gone they **pass vacuously** and the permission matrix stops being tested
  with nothing turning red. PRD-6 scope item 6 owns re-anchoring them. The list below stays ticked;
  it is the *contract*, and only its *execution* changes.
- **Author:** Product · 2026-07-17. **Amended by Product · 2026-07-21** (A-1; OQ-1 and OQ-2 closed;
  acceptance list marked verified). **BR-2 superseded 2026-07-25** (PRD-6).
- **Related:** PRD-2 (independent — do **not** fold together) · **PRD-6** (supersedes BR-2).

## Amendment A-1 — the exit-photo set may not be emptied by Mom (2026-07-21)

> **This amendment reverses the original BR-5 / AC-5. The reversal is intentional and was made with
> the vehicle-condition dispute risk in full view. Do not "correct" the code back to the earlier
> text.** If you believe the earlier text was right, that is a new product decision for Farrel — not
> a bug fix.

| | |
|---|---|
| Decided | 2026-07-20 by **Farrel**, overruling the recommendation to let Mom empty the photo set |
| Refined | same day — the rule constrains *emptying a set that had photos*, not *saving with no photos* (this distinction is load-bearing; see BR-5) |
| Shipped | 2026-07-21 (v1.0.3), enforced both in the app and on the server |
| Recorded here | 2026-07-21 by Product |

**What changed.** The original requirement said removing an exit photo must always succeed and must
never show Mom an error. As shipped, Mom may remove exit photos freely **except the last one** — that
removal is refused, and she is told to ask Farrel.

**Why.** The exit photos are the record of what the vehicle looked like when it left. If the customer
disputes a scratch or a dent at return, a rental with zero exit photos leaves the business with
nothing to show. Emptying that evidence is an owner-level decision, not something that should be
possible by accident during a rushed handover. The cost of the rule is one extra step for Mom in a
rare case; the cost of not having it is an unwinnable dispute.

**Superseded text**, preserved so a future reader can trace the change:

> ~~**BR-5 (photos).** Mom can add and remove exit photos. Removing a photo removes it from the
> record and MUST NOT show her an error.~~ — superseded 2026-07-21
>
> ~~**AC-5** Removing a photo succeeds with **no** user-visible error.~~ — superseded 2026-07-21

The current requirement is **BR-5** and **AC-5a … AC-5d** below.

## Summary

A rental is **write-once**: after Mom creates it she can only add payments or close it. This feature
lets her **correct a rental while it is still active** — the exit condition (fuel, km, exit photos) and
the note — and lets Farrel (admin) fix a note on a completed rental. **No money ever moves.**

## Problem statement

The moment Mom taps *Sewa Baru* and creates a rental, the record freezes until the vehicle returns.
Real data entry at a busy handover has mistakes — she photographs the wrong thing, sets the exit fuel
gauge wrong, or later needs to add a note about the customer or the car — and today she has **no way to
fix any of it**. This is not only annoying: the exit-fuel reading is the *baseline* for the fuel
adjustment computed at return, so a wrong reading she can't correct feeds a wrong number into the
return math. The only current workarounds are to live with corrupt data or cancel and re-create the
whole rental. (v1.0.2 removed two placeholder "Edit" buttons that read *"Akan segera tersedia"*; this
makes them real.)

## Affected users

- **Mom (`ops`, primary).** Does the data entry under time pressure; needs to fix her own mistakes
  while the car is out.
- **Farrel (`admin`, secondary).** Needs to add/correct a **note** even after a rental has completed;
  never needs to touch settled exit condition.

## Goals

- **G1** Mom can correct the exit condition (fuel box, km, exit photos) on an **active** rental.
- **G2** Mom can edit the rental note on an **active** rental.
- **G3** Farrel (admin) can edit the note on a **completed** rental.
- **G4** None of the above ever changes tariff, total, payments, or hutang.

## Non-goals

- Editing a **completed** rental's exit condition / re-running the return math — a separate admin
  design, not this release.
- Unifying the two fuel gauges / shared form primitives across the rental screens
  (`known-technical-debt.md` #4) — touches rental math; its own release.
- True storage cleanup of removed photos — orphan-on-remove is the accepted model here.
- Anything in PRD-2 (PDDIKTI verification).

## Who may edit what, and when (the core rule)

This permission matrix is the heart of the feature and MUST hold:

| Field | ACTIVE | COMPLETED | CANCELLED |
|---|---|---|---|
| Exit condition (fuel box · km · exit photos) | Mom (ops) or admin | ✋ no one | ✋ no one |
| Note (*Catatan Rental*) | Mom (ops) or admin | **admin only** | ✋ no one |

**Why exit-condition is ACTIVE-only:** the exit-fuel reading is the baseline for the fuel adjustment at
return, so it is safe to change only *before* that calculation runs (while ACTIVE). Once the vehicle is
returned the record is settled; moving the baseline afterward would silently corrupt settled money.
**Why the note is looser:** it is free text with no math, so it is safe any time — hence admin-only
(not forbidden) after completion.

## Behavioral requirements

- **BR-1 (server-enforced gate).** The permission matrix MUST be enforced on the **server**, not only
  by hiding buttons in the UI. A client-only gate is bypassable, and a bypassed exit-condition edit on
  a settled rental corrupts money. A disallowed edit is rejected and the user sees an error.
- **BR-2 (in-place edit).** Editing happens **in place** on the rental detail screen (not a separate
  screen or sheet); each editable section flips to an edit state with a **Save / Cancel** bar.
- **BR-3 (exit-condition edit exposes all three fields).** Fuel box (an **interactive** control — the
  control shown today is display-only), km (numeric, may be empty), and exit photos (add / remove).
- **BR-4 (note edit).** A multiline text field seeded with the current note.
- **BR-5 (photos — amended 2026-07-21, see A-1).** Mom can add exit photos freely, and can remove a
  photo **as long as at least one exit photo would remain**. She may not remove the last one: the
  removal is refused and she is told to ask Farrel — *"Foto terakhir tidak bisa dihapus. Minta Farrel
  untuk menghapusnya."* Only **admin** may leave an active rental with no exit photos at all.
  - **Mom is never stuck with a wrong photo.** If the single photo on a rental is the wrong one, she
    takes the correct one *first* and then removes the wrong one — at that point a photo remains, so
    nothing blocks her. The rule costs her an extra step only when she genuinely wants the rental to
    end up with no evidence at all.
  - **The rule is about *emptying a set that had photos*, not about *saving with no photos*.** A
    rental that already has zero exit photos is not blocked: Mom can still correct its fuel or km, and
    that save MUST succeed. Stating the rule as "Mom may never save a rental with no exit photos"
    would be wrong — it would block a legitimate fuel-only correction on a rental that never had
    photos in the first place, which is the exact case this feature exists to fix.
  - The refusal happens **when she taps remove**, not after a save round-trip — she must not wait on
    the network to find out she can't. The same rule is **also enforced on the server** (BR-1), so it
    holds even if the app is bypassed.
  - Removed files are left in storage and reaped later by admin hard-delete; this feature adds no
    separate cleanup step — see non-goals.
- **BR-6 (money invariant).** No edit in this feature changes tariff, total, payments, or hutang. Full
  stop.
- **BR-7 (safe save).** Save is disabled while a save is in flight (no double-submit). A failed save
  shows the real error message and keeps Mom in edit mode to retry.
- **BR-8 (persistence).** A saved change is visible immediately and persists across leaving and
  reopening the rental.

## User flows

1. **Fix exit fuel (Mom, active).** Open rental → tap Edit on *Kondisi Keluar* → adjust fuel / km /
   photos → Save → values update in place.
2. **Add a note (Mom, active).** Tap Edit on *Catatan Rental* → type → Save.
3. **Admin note fix (completed).** Farrel opens a completed rental → *Catatan Rental* shows Edit (Mom
   would not) → edits → Save.
4. **Blocked (negative).** On a completed rental, *Kondisi Keluar* shows **no** Edit for anyone; a
   forced attempt is rejected by the server (BR-1).

## Failure & edge behavior

- Save fails (network/server): error message shown, stay in edit mode (BR-7).
- km cleared: allowed (km is optional).
- Cancelled rental: nothing editable (matrix).
- Removing the **last** exit photo (Mom): refused with a message pointing her at Farrel; admin may do
  it. A rental that *already* had no exit photos is unaffected and still saves normally. *(BR-5, A-1)*

## Acceptance criteria (testable)

> **All criteria verified 2026-07-21** (v1.0.3). Evidence: 32 test suites / 174 tests green; three
> verification SQL scripts run against the production Supabase project after the migrations were
> applied, every section passed (AC-4 and the server half of AC-6 are the ones that required the live
> database — they cannot be closed by unit tests); live smoke test on Mom's real `ops` account passed.
> Per-criterion evidence: `docs/reports/v1-0-3-tests.md`. Release record: `docs/releases/v1-0-3.md`.
>
> **The list is kept ticked, not deleted.** It is the regression contract for rental editing —
> anyone changing this area later (notably the gauge unification in `known-technical-debt.md` #4,
> which lands directly on the fuel control) should be able to re-run it as written.

- [x] **AC-1** ACTIVE rental: Mom edits fuel / km / photos; change persists across reopen. *(G1, BR-3/8)*
- [x] **AC-2** ACTIVE rental: Mom edits and saves the note. *(G2)*
- [x] **AC-3** COMPLETED rental: exit-condition Edit is offered to **no one**; note Edit is offered to
      **admin only**, not to Mom. *(matrix, BR-1)*
- [x] **AC-4** A disallowed edit is rejected **server-side**, provable independently of the UI. *(BR-1)*
- [x] **AC-5a** ACTIVE rental with more than one exit photo: Mom removes one — it succeeds, with no
      error, and the removal persists. *(BR-5, A-1)*
- [x] **AC-5b** ACTIVE rental with exactly one exit photo: Mom's attempt to remove it is refused at the
      moment she taps remove, with the message pointing her at Farrel; the photo is still on the
      rental afterwards. The same attempt is refused **server-side** as well. *(BR-5, BR-1, A-1)*
- [x] **AC-5c** ACTIVE rental that already has **no** exit photos: Mom corrects only fuel and/or km and
      saves — the save **succeeds** and shows no photo-related error. *(BR-5, A-1)*
- [x] **AC-5d** Admin may remove the last exit photo, leaving the rental with none. *(BR-5, A-1)*
- [x] **AC-6** No money value (tariff / total / payments / hutang) changes as a result of any edit. *(BR-6)*
- [x] **AC-7** Save cannot double-fire; a failed save keeps edit mode with a visible message. *(BR-7)*
- [x] **AC-8** CANCELLED rental: neither field in the permission matrix — exit condition or note — is
      editable, for either role. *(matrix)*
      > Narrowed 2026-07-21 from "nothing is editable". On a CANCELLED rental an admin still sees the
      > pre-existing **payment** Edit button, which PRD-1 never governed — the original wording made
      > correct behaviour look like a defect.
- [x] **AC-9** Ships OTA-only: `app.json` `version` unchanged, no native dep, no APK.

## Constraints the design must honor (Product-surfaced; not the design itself)

- Enforce the permission matrix **server-side** (BR-1) — a status-tiered gate, not a client check.
- **No hutang/tariff recompute** anywhere in this feature (BR-6).
- Supabase errors are **plain objects, not `Error` instances** — the connector must throw a real
  `Error(message)`, and tests must mock the plain-object shape, never `new Error(...)`.
- Introduce **no new storage-delete permission** — the photo model is orphan-on-remove.
- Pick the correct fuel-box **max** deliberately (a known gauge-max divergence exists,
  `known-technical-debt.md` #4) — but do **not** start a gauge-unification refactor inside this feature.
  **Resolved: 8** — see §Resolved questions OQ-2.
- A `rental-math` review must confirm the ACTIVE-gate argument (no settled record can be edited) —
  this is the first change since v1.0.0 to move a number the tariff/fuel calc depends on.

## Resolved questions

Both questions that were open at authoring time were resolved during execution. They are recorded as
**closed with their answers** — do not reopen either without a new decision from Farrel.

- **OQ-1 — May Mom remove the last exit photo? → CLOSED 2026-07-20: no. Admin only.**
  Decided by Farrel, overruling the recommendation to allow an empty set, then refined the same day:
  the rule constrains *reducing a non-empty photo set to empty*, not *saving with an empty set*.
  Without that refinement the rule would have blocked a fuel-only correction on a rental that never
  had photos — a case this feature exists to make possible. Folded into **BR-5** and
  **AC-5a … AC-5d** by **Amendment A-1**.

- **OQ-2 — Which fuel-box max is correct for the interactive control? → CLOSED: 8.**
  This was **derived, not chosen**. The edit control must produce values on the same scale as the
  control that originally recorded the exit fuel; any other maximum would silently rescale the
  baseline that the return fuel adjustment reads, and a rescaled baseline changes money at return.
  The creating control's scale was read directly and is 8.
  **Standing caveat:** this answer is only correct while the creating control's scale is 8. The
  gauge-max divergence in `known-technical-debt.md` #4 is still open — whoever unifies the gauges
  owns re-deriving this number, and must not assume 8 is a constant of the product.

> A candidate technical design already exists in `docs/releases/v1-0-3.md` (RPC, migration, connector,
> UI). Under the current agent-system model that design belongs to the **implementation plan**, not
> this PRD. This PRD owns the requirements above; the release plan and the implementation plan refer
> **to it**.
