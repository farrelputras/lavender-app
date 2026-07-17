# PRD-1 — Edit an active rental

- **PRD:** 1 — refer to this as **PRD-1**.
- **Status:** ready to plan. Requirements are complete; no open question blocks the build.
- **Target release:** v1.0.3 (`docs/releases/v1-0-3.md`). This PRD is the authoritative **requirements**;
  the release plan refers to it, not the other way around.
- **Author:** Product · 2026-07-17
- **Related:** PRD-2 (independent — do **not** fold together).

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
- **BR-5 (photos).** Mom can add and remove exit photos. Removing a photo removes it from the record
  and MUST NOT show her an error. (Removed files are left in storage and reaped later by admin
  hard-delete; this feature adds no separate cleanup step — see non-goals.)
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
- Removing the **last** exit photo: see OQ-1.

## Acceptance criteria (testable)

- [ ] **AC-1** ACTIVE rental: Mom edits fuel / km / photos; change persists across reopen. *(G1, BR-3/8)*
- [ ] **AC-2** ACTIVE rental: Mom edits and saves the note. *(G2)*
- [ ] **AC-3** COMPLETED rental: exit-condition Edit is offered to **no one**; note Edit is offered to
      **admin only**, not to Mom. *(matrix, BR-1)*
- [ ] **AC-4** A disallowed edit is rejected **server-side**, provable independently of the UI. *(BR-1)*
- [ ] **AC-5** Removing a photo succeeds with **no** user-visible error. *(BR-5)*
- [ ] **AC-6** No money value (tariff / total / payments / hutang) changes as a result of any edit. *(BR-6)*
- [ ] **AC-7** Save cannot double-fire; a failed save keeps edit mode with a visible message. *(BR-7)*
- [ ] **AC-8** CANCELLED rental: nothing is editable. *(matrix)*
- [ ] **AC-9** Ships OTA-only: `app.json` `version` unchanged, no native dep, no APK.

## Constraints the design must honor (Product-surfaced; not the design itself)

- Enforce the permission matrix **server-side** (BR-1) — a status-tiered gate, not a client check.
- **No hutang/tariff recompute** anywhere in this feature (BR-6).
- Supabase errors are **plain objects, not `Error` instances** — the connector must throw a real
  `Error(message)`, and tests must mock the plain-object shape, never `new Error(...)`.
- Introduce **no new storage-delete permission** — the photo model is orphan-on-remove.
- Pick the correct fuel-box **max** deliberately (a known gauge-max divergence exists,
  `known-technical-debt.md` #4) — but do **not** start a gauge-unification refactor inside this feature.
- A `rental-math` review must confirm the ACTIVE-gate argument (no settled record can be edited) —
  this is the first change since v1.0.0 to move a number the tariff/fuel calc depends on.

## Open questions

- **OQ-1** May Mom remove the **last** exit photo (an empty exit-photo set), or is at least one photo
  required?
- **OQ-2** Which fuel-box **max** is correct for the interactive control? (A correctness detail, not a
  refactor.)

> A candidate technical design already exists in `docs/releases/v1-0-3.md` (RPC, migration, connector,
> UI). Under the current agent-system model that design belongs to the **implementation plan**, not
> this PRD. This PRD owns the requirements above; the release plan and the implementation plan refer
> **to it**.
