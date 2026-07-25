# PRD-6 — Editing a record must be findable and unmistakable

- **PRD:** 6 — refer to this as **PRD-6**.
- **Status:** 🟡 **SCAFFOLD — but OQ-1 is now CLOSED.** Problem verified against code, scope fixed,
  **not yet designed**. Behavioral requirements and acceptance criteria are *deliberately absent*:
  this document exists to record the problem, its validity, and its boundaries. Writing BRs/ACs is the
  next session's work.
  > ✅ **The blocking question is answered (2026-07-25).** OQ-1 was settled jointly with PRD-8's OQ-1
  > in PRD-8's design session, exactly as both documents required. **D-6 is accepted: editing moves to
  > a dedicated rental edit screen.** See §Dependency and PRD-8 **D-4**. The design session no longer
  > has to choose an interaction model — it has to specify one.
- **⚠️ CORRECTED 2026-07-25 — the incident's realized damage was elsewhere.** Read **§Correction C-1**
  before citing this PRD's priority or its money argument. The original text attributed a realized
  money consequence to the reported incident; that attribution is **withdrawn**.
- **Target release:** unassigned. **Ships after PRD-8** — see §Dependency.
- **Author:** Product · 2026-07-25 (pain points reported by Farrel from Mom's use of v1.0.4).
  **Reviewed and corrected the same day** — validity re-checked against code, C-1 raised, D-3…D-6 added.
- **Priority:** **high — data integrity, on a structural hazard that has not yet fired.** See C-1 for
  why the word "structural" is doing real work here and "realized" is not.
- **Related:** **supersedes PRD-1 BR-2** (see §Supersession) · **consumes PRD-8's convention**, and
  partly *determines* its scope (see §Dependency) · sibling of PRD-7 (same reporting session).

## Correction C-1 — the incident's realized damage was elsewhere (2026-07-25)

> **Recorded rather than absorbed, per the PRD-4 Amendment A-1 discipline.** This PRD was drafted, and
> a whole money argument built, from a prose description of an incident. When the record was actually
> checked, the damage was somewhere else entirely. That is the second time in three releases; it is
> the reason C-1 sits at the top of the file rather than in a footnote.

**What was originally written.** That Mom set out to process a return, edited the rental detail
instead, and that this carried a money consequence "structural rather than hypothetical" — the moved
fuel baseline of §The money stake.

**What Farrel found in the record (2026-07-25).** The affected rental is **COMPLETED** (*Selesai*),
and what is wrong on it is the **`waktu kembali`** — the recorded return time. Farrel is correcting it
by hand.

**Why the original attribution cannot be right.** Neither control this PRD indicts can reach a time
field:

| Step | Evidence |
|---|---|
| `rpc_update_rental` accepts **only** `kondisiKeluar` and `notes` | `20260720073455_rpc_update_rental.sql` |
| `returned_at` is written **only** by `rpc_close_rental`, from `payload->>'returnedAt'` | `20260721150806_close_rental_exclude_deleted_payments.sql:84` |
| That value originates on `PengembalianScreen` and **defaults to the moment the screen opens** | `PengembalianScreen.tsx:175` — `useState<Date>(() => new Date())` |

**Confirmed mechanism (Farrel, 2026-07-25): Mom accepted the pre-filled default.** The car came back
before she processed the return; the field arrived already showing a complete, plausible date and
time, so nothing prompted her to change it. This is a **third failure mode**, distinct from both
PRD-6 and PRD-8 — see §Recorded, not scoped.

**What survives this correction, and what does not:**

| Claim | After C-1 |
|---|---|
| Mom reached for the wrong control instead of *Proses Pengembalian* | ✅ **stands** — Farrel's report; it is the behaviour PP-1 describes |
| The *Kondisi Keluar* edit can move the fuel baseline and change money | ✅ **stands** — verified in code, `rentalMath.ts:83` |
| **That hazard fired, and money moved** | ❌ **withdrawn** — no `kondisiKeluar` corruption has been found on any rental |
| PRD-6 is justified by realized loss | ❌ **withdrawn** — it is justified by a live hazard on a money path plus a confirmed mis-navigation |

**No `kondisiKeluar` audit exists to prove the negative either.** `rentals.kondisi_keluar` is a JSONB
column overwritten in place (`0003_tables.sql:75`), and the audit trail is `set_audit_fields()` setting
`updated_at` / `updated_by` only (`0004_triggers.sql`) — **no before/after row history anywhere in the
schema**. A query can identify *which* ACTIVE rentals were edited
(`WHERE status = 'ACTIVE' AND updated_at > created_at`); it can never recover what `bensinKotak` was.
Recorded here so a future reader does not go looking for a history table that does not exist.

**Consequence for whoever plans this.** PRD-6 remains **high** priority — an unrealized hazard on a
money path, discovered by luck rather than by design, is still worth closing, and the discoverability
problem is confirmed independently. But it is no longer an incident response, and PM should sequence it
as prevention, not remediation.

## Summary

Two screens hide the action that corrects a mistake. On `UserDetailScreen` that is an annoyance —
Mom cannot find Edit. On `RentalDetailScreen` it is a hazard: the edit control she *does* find sits
next to the wrong data, and using it would corrupt the baseline that the return calculation reads.

## Problem statement

### PP-1 — `RentalDetailScreen`: the edit control invites the wrong action

**What happened.** Mom set out to process a vehicle return and reached for the rental-detail edit
instead (reported by Farrel, 2026-07-25). **The damage found on that rental came from a different
cause — see C-1.** The mis-navigation itself is what PP-1 addresses.

**Why the screen invites it.** `RentalDetailScreen` carries four tappable affordances below the fold,
of which the three edit-shaped ones are the quietest elements on the screen:

| Control | Location | Style | What it changes |
|---|---|---|---|
| `kondisi-edit-btn` | *Kondisi Keluar* section header (`:486`) | `editSectionBtn` (`:1044`) — 16px icon + `labelMd`, **no padding, no minHeight, no background, no border** | exit fuel, exit km, exit photos |
| `notes-edit-btn` | *Catatan Rental* section header (`:812`) | same | free-text note |
| `editPayBtn` | each payment row (`:729`) | `editPayBtn` (`:1038`) — same 16px + `labelMd`, `marginLeft` only | opens `PembayaranSheet` → **edit or delete** a payment |
| *Tambah Pembayaran* | below the payment rows (`:744`) | `addPaymentBtn` — 20px icon + **`labelLg`** | appends a payment |

> **Correction to the original draft:** it listed *Tambah Pembayaran* as a fourth instance of the same
> quiet `labelMd` text link. It is not — it is `labelLg` with a larger icon and its own style, i.e.
> already visually heavier than the three edit controls. That distinction is load-bearing; it is the
> reason D-1 needed splitting into D-3.

The *Kondisi Keluar* edit sits directly above **Bensin**, **KM**, and **Foto** — the same three
fields `PengembalianScreen` asks for when recording a return. Mom did not misread a label; the screen
placed a plausible data-entry path immediately next to the data she needed to enter.

**The ranking is inverted.** *Proses Pengembalian* — the correct action — is a 56 px filled primary
bar pinned to the bottom (`:881`). The edit links are the quietest elements on the screen. Yet Edit is
the more consequential of the two, because it rewrites a settled baseline rather than appending to it.

**A fifth control the original draft missed.** `isAdmin && hardDeleteBtn` (`:860-874`, style `:1058`)
is a full-width **outlined pill — `borderWidth: 1`, `borderRadius: 12`, `minHeight: 52`, 20px icon +
`labelLg`** — sitting between *Catatan Rental* and the bottom bar. It is not an edit, but it already
occupies the visual weight and the screen region a prominent Edit would want. Any design lands next
to it. It is also the shape Farrel has chosen for the new control — see **D-5**.

#### The money stake — structural, and so far unrealized

`computeFuelAdjustment(bensinKeluar, bensinKembali, hargaPerKotak)` is
`selisih = bensinKembali − bensinKeluar` (`app/utils/rentalMath.ts:83`).

**Kondisi *Keluar* is the baseline of that subtraction.** Editing it after the fact — believing you
are recording the *return* — moves the baseline and silently changes the fuel price adjustment
suggested at closing. The direction flips at zero, so an edit can turn a refund into a surcharge.

> ⚠️ **Per C-1 this has not happened.** The mechanism is verified in code; no corrupted rental has been
> found, and none can be ruled out either, since no before-value is stored. Treat this section as a
> hazard analysis, not an incident report.

This hazard is half-documented already: `RentalDetailScreen.tsx:61-65` (v1.0.3, D-2) warns that the
edit control must share `BENSIN_MAX` with the control that *creates* the value, "otherwise editing
silently rescales the baseline the return fuel adjustment reads." That note anticipated a *developer*
mismatch. It did not anticipate the *operator* reaching for the control by mistake. Same corruption,
different cause.

#### A second money path the original draft did not trace

`editPayBtn` (`:729`) opens `PembayaranSheet`, which contains **Hapus Pembayaran**
(`PembayaranSheet.tsx:315-318`) behind a single `Alert.alert` (`:120-127`). Deleting a payment changes
`Sisa`, and `Sisa > 0` at close is what auto-creates a hutang. So the row-level payment Edit is on a
money path too — reached by a control styled identically to the section edits this PRD is removing.
Folded into **D-3**.

### PP-4 — `UserDetailScreen`: Edit is invisible

Edit is a 40 × 40 icon-only circle in the app bar (`UserDetailScreen.tsx:138-144`, style `:335-342`) —
a bare pencil glyph, no label, in the corner Mom does not look at. **It is smaller than the back arrow
beside it** (`appBarBtn`, 48 × 48, `:330-333`).

Meanwhile the same screen already ends with three full-width labelled pills — **WhatsApp**,
**Hapus User**, **Hapus Permanen** (`:257-289`) — which is exactly where Mom looks for actions and
exactly the shape she recognises. It is also the same shape as `RentalDetailScreen`'s `hardDeleteBtn`,
which means **one control shape answers both halves of this PRD** (D-5).

**The destination already exists.** The pencil navigates to
`UserForm` in `mode: "edit"` (`:140`) — a full working edit screen. PP-4's fix is making an existing
route findable, not building anything. This matters well beyond PP-4; see **D-6**.

No money risk here. Same *class* of failure as PP-1 (the edit action is not where the user looks),
much lower stakes — which is why it rides along rather than driving.

## Affected users

- **Mom (`ops`, primary).** Both. She is the one who cannot find Edit on `UserDetailScreen`, and the
  one who reached for the wrong Edit on `RentalDetailScreen`.
- **Farrel (`admin`).** Sees neither problem — he knows where every control is because he placed it.
  The same asymmetry that let PRD-4 and PRD-5 ship.
- **Any future operator.** The layout teaches the mistake; it will teach it again.

## Validity — verified against code, 2026-07-25 (re-verified same day)

| Claim | Verdict | Evidence |
|---|---|---|
| Section-level Edit buttons exist on `RentalDetailScreen` | ✅ confirmed | `:486`, `:812` |
| They are visually subordinate to *Proses Pengembalian* | ✅ confirmed | `labelMd` text link, no padding/minHeight (`:1044`) vs 56 pt filled bar (`:881`) |
| Editing *Kondisi Keluar* can move money | ✅ confirmed | `rentalMath.ts:83` — it is the subtraction baseline |
| **It did move money on the reported rental** | ❌ **withdrawn** | C-1 — the damage was `returned_at`, unreachable from these controls |
| A prominent Edit can be sited beside *Proses Pengembalian* | ✅ feasible | bottom bar is a plain `View` holding one CTA (`:881-893`) — no structural obstacle |
| `UserDetailScreen` Edit is icon-only in the app bar | ✅ confirmed | `:138-144`, style `:335-342` |
| An Edit pill fits the existing action stack | ✅ feasible | three sibling pills already there (`:257-289`) |
| *Tambah Pembayaran* is styled like the section edits | ❌ **false** | `addPaymentBtn` is `labelLg` + 20px icon (`:744`); the edits are `labelMd` + 16px |
| `editPayBtn` is a single-screen pattern | ❌ **false** | byte-identical style on **four** screens — see D-4 |
| The payment Edit is money-neutral | ❌ **false** | it opens the sheet's **Hapus Pembayaran** (`PembayaranSheet.tsx:315`) → changes `Sisa` → auto-debt |
| The new controls will meet a 48dp touch target by default | ❌ **false today** | `editSectionBtn`/`editPayBtn` ≈ 36dp incl. `hitSlop`; `UserDetailScreen.editBtn` is 40 × 40 — resolved by **D-5** |
| A dedicated edit screen would be expensive | ❌ **false** | `UserForm` precedent (`:140`) + `RentalDetailScreen.editLogic.ts` already isolates the rules — see D-6 |
| PRD-1's acceptance list survives this change as written | ❌ **false** | its testIDs are what this PRD deletes — see §Supersession |

## Scope

**In scope**

1. Consolidate `RentalDetailScreen`'s section-level edits into **one prominent control**, at the weight
   and shape fixed by **D-5**.
2. That control must communicate that its purpose is **correcting a mistake**, not recording an
   event — via label, supporting copy, warning, or confirmation. The mechanism is the design
   session's call; the requirement is that Mom cannot confuse it with *Proses Pengembalian*.
3. Remove `kondisi-edit-btn` and `notes-edit-btn` from the section headers.
4. **Payments: *Tambah Pembayaran* stays prominent; the row-level *Edit* is visually re-ranked** so it
   no longer reads as the same affordance (**D-3**), and that re-rank is applied to **all four screens
   carrying `editPayBtn`** (**D-4**).
5. `UserDetailScreen`: promote Edit into the action stack alongside WhatsApp / Hapus User, as a
   labelled pill (**D-5**'s shape).
6. **Re-express PRD-1's acceptance criteria against the new control.** AC-1, AC-2, AC-3 and AC-8 are
   currently executed through `kondisi-edit-btn` / `notes-edit-btn`; this PRD deletes both. Re-anchoring
   them is in scope and is not optional — see the vacuous-pass trap in §Supersession.

**Explicitly out of scope (non-goals)**

- Changing **what** is editable, or the **permission matrix** — PRD-1 governs that and it shipped
  server-enforced. This PRD moves controls; it grants and revokes nothing.
- Any server-side change: no migration, no RPC, no RLS. If one appears to be needed, that is a
  finding to escalate, not to absorb.
- `PengembalianScreen`'s own flow. Its *field styling* belongs to PRD-8; its logic is untouched here.
  **The `returnedAt` default problem is out of scope entirely** — §Recorded, not scoped.
- Inventing the editable-vs-read-only visual convention — that is **PRD-8**, and this PRD consumes it.
- A general accessibility pass. **D-5** sets a floor for the controls this PRD touches; it commits to
  nothing beyond them.
- Retrofitting the *section-edit* pattern to every other screen. Two screens for that half; the
  payment re-rank is deliberately wider (D-4) because the control is literally shared.

## Decisions already taken (Farrel, 2026-07-25)

- **D-1 — payments stay directly actionable, visually re-ranked.** Recording a payment is Mom's most
  frequent action and is normal operation, not mistake-fixing; putting it behind a warning-framed
  Edit mode would tax the common case to protect the rare one. *Note:* PRD-1 AC-8 already records
  that the payment Edit predates PRD-1 and "PRD-1 never governed" it — so this PRD is the first to
  give it an owner. **Refined by D-3.**
- **D-2 — PRD-8 ships first** and defines the convention; PRD-6 consumes it (see §Dependency).
- **D-3 — D-1 is split: *Tambah Pembayaran* ≠ row-level *Edit*.** D-1's rationale ("Mom's most
  frequent action… normal operation, not mistake-fixing") is true of **Tambah Pembayaran** only —
  append-only, frequent, safe, and already the heavier control (`labelLg`, `:744`). The row-level
  **Edit** is the opposite on every axis: it *is* mistake-fixing, it is rare, and it hides
  **Hapus Pembayaran** behind one Alert — a change to `Sisa`, which drives auto-debt at close. One
  label, two affordances, opposite risk profiles. *Tambah* keeps or gains weight; row-*Edit* is
  re-ranked with the other correction controls.
- **D-4 — the payment re-rank propagates to all four screens.** `editPayBtn` is byte-identical on
  `RentalDetailScreen:729`, `HutangDetailScreen:212`, `PengembalianScreen:828`, and
  `DetailSewaScreen:926`. Changing one and not the others would teach a rule that three screens break.
  ⚠️ **Two of those four have zero automated coverage** (debt #15) — the change there is verified by
  reading and by device, or coverage is added as a ride-along. Plan for it explicitly.
- **D-5 — the consolidated Edit control takes the *Hapus Rental Permanen* shape.** A full-width
  outlined pill: `borderWidth: 1`, `borderRadius: 12`, **`minHeight: 52`**, 20px icon + `labelLg`
  (`RentalDetailScreen.tsx:1058-1069`) — in primary rather than error colour. This single decision
  resolves three things at once:
  1. **The touch-target floor.** 52dp clears the 48dp minimum. The controls it replaces are ≈36dp
     (`editSectionBtn`) and 40 × 40 (`UserDetailScreen.editBtn`). No wider a11y commitment is implied.
  2. **Both halves of the PRD get one shape.** `UserDetailScreen`'s action-stack pills
     (`:257-289`) are the same family, so PP-1 and PP-4 converge instead of inventing two languages.
  3. **It is a shape Mom already reads as "an action button"** — it is what the existing WhatsApp /
     Hapus User / Hapus Permanen controls look like.
  > **This partly answers OQ-3 and mildly amends scope item 1.** `hardDeleteBtn` lives *in the scroll*,
  > not in the pinned bottom bar. So the Edit control is **prominent but not adjacent** to *Proses
  > Pengembalian*. That is a defensible reading of the goal — "cannot be confused with the return CTA"
  > and "sited right next to the return CTA" pull against each other, and this picks separation. The
  > design session still owns the exact placement; see OQ-3 as re-framed.
- **D-6 — a dedicated edit screen. ✅ ACCEPTED by Farrel 2026-07-25** (in PRD-8's design session;
  recorded there as **D-4**). This was written as Product's *recommended* answer to OQ-1, open to being
  overruled; it was ratified instead, and OQ-1 is now closed. Grounds:
  - **The pattern already exists and works**: `UserDetailScreen:140` → `UserForm` in `mode: "edit"`.
    Choosing it makes PP-1 and PP-4 the same interaction, not two.
  - **The rules are already portable.** `RentalDetailScreen.editLogic.ts` isolates the permission
    matrix (`canEditKondisiKeluar`, `canEditNotes`), the last-photo rule, and the wholesale patch
    assembly as pure, unit-tested functions explicitly kept "out of the screen component". A new screen
    consumes them unchanged.
  - **The connector is already the right shape.** `updateRental` takes a wholesale patch, so a
    screen-level Save needs no new connector and no signature change (connector rule 2).
  - **It gives PRD-8 a clean answer on this screen** — see §Dependency.

## Supersession — PRD-1 BR-2

PRD-1 **BR-2** reads: *"Editing happens **in place** on the rental detail screen (not a separate
screen or sheet); each editable section flips to an edit state with a **Save / Cancel** bar."*
It shipped in v1.0.3 on 2026-07-21.

**PP-1 overturns it four days later.** That is legitimate — field feedback beats a design assumption,
and Mom's use is the evidence PRD-1 could not have had. But it must be recorded, not absorbed
silently, or a future reader will treat the removal of the section-edit buttons as a regression and
restore them. This is the same discipline PRD-1's own Amendment A-1 established.

Whether the replacement is a separate screen, a sheet, or a whole-screen edit mode is **open** — see
OQ-1, and **D-6** for Product's recommendation.

> A forward pointer has been added to PRD-1 so the supersession is visible from both directions.

### ⚠️ The supersession has teeth in the test suite — including a silent-failure trap

PRD-1's acceptance list carries an explicit instruction: *"The list is kept ticked, not deleted. It is
the regression contract for rental editing — anyone changing this area later should be able to re-run
it as written."* **This PRD makes that impossible as written**, because the criteria are executed
through the two testIDs it removes. They are pressed in roughly two dozen places across
`RentalDetailScreen.test.tsx` and `RentalDetailScreen.acceptance.test.tsx`.

Most of those go red, which is fine — red is a prompt. **Four assertions do something worse:**

```
RentalDetailScreen.acceptance.test.tsx:365-366   expect(queryByTestId("kondisi-edit-btn")).toBeNull()
RentalDetailScreen.acceptance.test.tsx:381-382   expect(queryByTestId("notes-edit-btn")).toBeNull()
```

These are the **negative** permission checks — PRD-1 AC-3 and AC-8, "COMPLETED offers exit-condition
Edit to no one", "CANCELLED offers nothing". Delete the buttons and they **pass forever, vacuously**.
The permission matrix stops being tested and nothing turns red to say so.

**Requirement:** every re-anchored negative assertion must be shown to *fail* against a deliberately
broken build before it is accepted as passing. A green negative test proves nothing until it has been
seen to go red.

## Constraints the design must honor (Product-surfaced; not the design itself)

- **The fuel baseline is sacred.** Whatever the new control does, editing *Kondisi Keluar* must remain
  distinguishable, at a glance, from recording *Kondisi Kembali*. The whole PRD exists because it is not.
- **`BENSIN_MAX` stays consistent** with the control that creates the value (`RentalDetailScreen.tsx:61-65`,
  v1.0.3 D-2). Do not re-open this by re-siting the control. If D-6 is taken, the constant moves screens —
  moving it is not the same as re-deriving it, and it must not be silently re-picked.
- **PRD-1's permission matrix survives intact** — status-tiered, server-enforced, admin-vs-ops. A
  relocated button must not become a wider grant. `editLogic.ts`'s `canEditKondisiKeluar` /
  `canEditNotes` are the client half and should be **reused, not re-implemented**.
- **PRD-1's acceptance criteria are re-expressed, not deleted** — including the negative-test
  discipline above. Scope item 6.
- **No rental-math change, no value change.** Presentation and navigation only.
- **Touch targets on the controls this PRD touches are ≥ 48dp**, satisfied by D-5's 52dp. Stated so it
  cannot quietly regress back to a bare `labelMd` row.
- **Must hold at `fontScale` 1.5** (PRD-5) and **respect the system-nav inset** (PRD-4). A new bottom-bar
  control lands in the exact region PRD-4 just fixed — use `useBottomBarPadding()`, do not re-derive it.
  D-5's in-scroll pill sits above that region, but `useBottomSpace()` clearance still applies.
- ⚠️ **`PengembalianScreen` and `DetailSewaScreen` have zero automated coverage** (debt #15), and **D-4
  puts this PRD inside both of them.** Two of the four payment re-ranks cannot be verified by the
  suite. Decide up front: device-and-reading verification, or coverage as a ride-along.
- **OTA-only expected**: no native dependency, no `app.json` `version` bump. D-6's dedicated screen is a
  new route in an existing navigator — still OTA.

## Dependency — PRD-8 first, but the arrow runs both ways

PRD-8 establishes what "you can change this field" looks like. If PRD-6 is designed first it will
invent a one-screen visual language on `RentalDetailScreen` that PRD-8 then has to unpick. Sequencing
is PRD-8 → PRD-6.

**But PRD-6's OQ-1 partly determines PRD-8's scope, which the original text of neither PRD captured.**
If **D-6** is taken and editing moves to a dedicated screen, then `RentalDetailScreen` becomes **100 %
read-only** — PRD-8's OQ-1 ("mark editable, mark read-only, or both?") is trivially answered there,
and PRD-8's entire remaining burden shifts onto `PengembalianScreen` and the form screens. PRD-8's own
§Dependency anticipates the shrink; what neither said is that the decision belongs to *this* PRD.

**Practical consequence:** PRD-6 OQ-1 and PRD-8 OQ-1 should be settled **together, in one sitting**,
before either PRD leaves scaffold state. Sequencing the *documents* PRD-8 → PRD-6 remains right; the
*decision* is joint.

This does **not** mean PRD-6 waits for PRD-8 to *ship* if PM decides to bundle them; it means the
convention must be *decided* before PRD-6's edit mode is designed.

### ✅ Both were settled, in one sitting — 2026-07-25

That joint decision happened in PRD-8's design session. Farrel's calls, and what they mean here:

| Decision | Effect on PRD-6 |
|---|---|
| **PRD-6 OQ-1 → dedicated edit screen** (D-6 accepted; PRD-8 D-4) | The interaction model is fixed. The design session specifies it rather than choosing it. |
| **PRD-8 OQ-1 → the convention marks *editable*** (PRD-8 D-2) | Every field on the new edit screen is a "Field" and wears the box. PRD-6 inherits a vocabulary instead of inventing one — D-1/D-2's whole purpose. |
| **PRD-8 OQ-2 → a boxed field, not a tint** (PRD-8 D-3) | 1px `outline` border + fill + r12 + `minHeight: 52`. Tint was disqualified by measurement (`#ecf5fe` on white = **1.10 : 1**, below the 3:1 non-text minimum). |
| **PRD-8 D-8 — no locked/disabled third state** | PRD-6's edit screen shows what Mom can change as boxed and what she can't as plain. Admin-only *Catatan* looks the same as permanently read-only data for her — an accepted cost, recorded in PRD-8 D-8, and worth re-checking when this screen is specified since it is the case that lands here. |

**And `RentalDetailScreen` becomes 100 % read-only**, which is what shrinks PRD-8's half of the work to
stripping two tinted blocks. PRD-8 is designed and PM-ready; this PRD's design session can proceed as
soon as PM sequences it.

> ⚠️ Numbering is not ship order in this project (PRD-1 shipped in v1.0.3; PRD-4/5 in v1.0.4). Do not
> infer sequence from the number.

## Recorded, not scoped — the `returnedAt` default (2026-07-25)

**Farrel's decision: record it, do not scope it yet.** It is written down here because C-1 uncovered it
and it must not evaporate; it is **not** part of this PRD's deliverable. Also filed as debt **#16**.

**The problem, in two halves:**

1. **A confident wrong default on a field that records the past.** `PengembalianScreen.tsx:175` seeds
   `returnedAt` with `new Date()` — the moment the screen opens, not the moment the car came back. The
   *Kembali* row (`:422-436`) then displays a fully-formatted, entirely plausible date and time. Mom
   accepted it. Nothing on the screen marks the value as a guess.
2. **No correction path after close.** `returned_at` is written only by `rpc_close_rental` and appears
   in **no** edit path afterwards. PRD-1's matrix does not list it at all — exit condition is ✋ no one
   on COMPLETED, notes are admin-only, return time is simply absent. Fixing it requires direct database
   access, which is what Farrel is doing.

**Why it belongs to neither PRD-6 nor PRD-8.** The *Kembali* row is **not** an unmarked editable field:
it carries an explicit `inlineEditBtn` — 16px icon + **`labelLg`** "Edit" (`:432-435`) — making it
*more* marked than any control PRD-6 indicts. PRD-8's "nothing says so" does not describe this row.
The defect is in the **value**, not the affordance, and every remedy the other two PRDs propose makes
it worse: a louder, better-marked field still shows a confident wrong answer.

**Money reach — stated precisely, not inflated.** `isLate` / `jamLambat` (`:244-245`) feed only the
*Terlambat* warning banner (`:492-499`). Late fees are entered by hand as `extraFees`. So a wrong
`returnedAt` **misinforms** Mom (and corrupts `formatActualDuration` and the permanent record of when
the vehicle came back) rather than silently recomputing a charge. It is not the fuel-baseline hazard;
it should not be argued as if it were.

**If it is picked up later,** the second half needs a server change (an RPC and a permission-matrix
extension), which is why folding it into presentation-only PRD-6 was rejected.

## Open questions for the design session

- **OQ-1 — CLOSED 2026-07-25.** *"What replaces per-section inline edit — a dedicated edit screen, a
  sheet, or a whole-screen edit mode?"* → **A dedicated rental edit screen. D-6 is accepted** (Farrel,
  in PRD-8's design session, settled jointly with PRD-8's OQ-1 as both documents required — PRD-8
  **D-4**). Kept, not deleted: it was the design-blocking question, and its answer is what fixed both
  PRDs' scope. **What still belongs to the design session:** Save/Cancel behaviour, partial-save
  semantics (see OQ-7), and what Mom sees while editing — the *model* is settled, the *specification*
  is not.
- **OQ-2.** How is "this is for fixing mistakes" communicated — button copy alone, supporting text,
  a confirmation dialog, or a warning banner inside the edit state? A dialog on every edit will be
  dismissed unread within a week; copy alone may not be enough. Worth testing wording with Mom.
- **OQ-3 (re-framed by D-5).** D-5 fixes the control's *shape* and, by following `hardDeleteBtn`,
  implies it sits **in the scroll** rather than the pinned bottom bar — prominent, deliberately not
  adjacent to *Proses Pengembalian*. Confirm that reading, and settle the exact position: above the
  admin hard-delete pill, below it, or somewhere earlier in the scroll. Two adjacent full-width bars
  would consume a lot of a small screen at `fontScale` 1.4 (Mom's measured setting) — which is an
  argument *for* the in-scroll placement.
- **OQ-4.** For a **COMPLETED** rental the bottom bar holds *Kembali ke Beranda* (`:896-905`), and
  PRD-1's matrix still allows an admin note edit. Where does the consolidated control go there?
- **OQ-5 — CLOSED 2026-07-25.** *"Did Mom's reported mis-edit land on a real rental?"* → **No
  `kondisiKeluar` corruption was found.** The affected rental's defect was its `waktu kembali`, from a
  different cause. See **C-1**; no escalation (Farrel is correcting the record by hand). Kept, not
  deleted, because the question was right to ask and its answer is what corrected this PRD.
- **OQ-6 — partly answered 2026-07-25.** *"Does the same edit-discoverability problem exist on
  `HutangDetailScreen`?"* → **Not the PP-4 kind.** That screen has **no** section-level edit at all: its
  only edit affordance is `editPayBtn` (`:212`) plus an admin hard-delete (`:244`). So nothing is
  hidden there. **But D-4 reaches it anyway**, via the shared payment control. Remaining question:
  does `HutangDetailScreen` need anything *beyond* the D-4 re-rank? Cheap to check; if yes, it belongs
  here rather than in a fourth PRD.
- **OQ-7 (new).** If D-6 is taken, does the rental edit screen edit *everything at once* (exit
  condition **and** note, one Save), or preserve PRD-1's per-section save granularity? PRD-1 BR-7's
  "failed save keeps you in edit mode" and BR-8's persistence guarantee were written against per-section
  saves; a single wholesale Save changes what a partial failure means. `updateRental` already accepts a
  wholesale patch, so both are implementable — this is a product choice, not a technical one.
- **OQ-8 (new).** Does the `UserDetailScreen` app-bar pencil **move** into the action stack, or is a
  pill **added** while the pencil stays? Two entry points to one destination is redundancy, not
  redundancy-as-safety — but removing the pencil changes muscle memory for Farrel, who does use it.
