# PRD-7 — Beranda should orient you

- **PRD:** 7 — refer to this as **PRD-7**.
- **Status:** 🟡 **SCAFFOLD** — problems verified against code, scope fixed, **not yet designed**.
  Behavioral requirements and acceptance criteria are *deliberately absent*; writing them is the next
  session's work.
- **Target release:** unassigned. Independent of PRD-6 and PRD-8 — can ship in any order, or alone.
- **Author:** Product · 2026-07-25 (pain points reported by Farrel from Mom's use of v1.0.4)
- **Priority:** **medium.** No data is wrong and no money moves. This is about the home screen
  answering "who am I?" and "what needs me today?" — currently it answers neither well.
- **Related:** sibling of PRD-6 and PRD-8 (same reporting session, unrelated causes).
  **The only one of the three that touches the connector layer**, and possibly the database.

## Summary

Beranda is the screen Mom opens first, every day. Two things it should tell her, it doesn't:

1. **Which account is signed in.** It says `Halo!` to everyone.
2. **What actually needs attention.** It shows only rentals due *today* — a list that is empty most
   days, and that hides the overdue rental from last week.

## Problem statement

### PP-2 — the greeting identifies nobody

`BerandaScreen.tsx:95` renders a hard-coded `Halo!`. There is no way to tell, from the app, whether
the phone is signed in as `ops` (Mom) or `admin` (Farrel).

**This is a diagnosis problem, not a vanity one.** The two roles see genuinely different apps — admin
gets hard-delete controls on rentals (`RentalDetailScreen.tsx:860`) and users
(`UserDetailScreen.tsx:277`), and a wider slice of PRD-1's edit matrix. When Mom reports "I can't do
X" or "there's a scary red button", the first thing Farrel needs to know is which account she is on,
and today he has to ask her to sign out and read the login screen.

`useSession()` already exposes `role` and is already consumed on two screens
(`RentalDetailScreen.tsx:105`, `UserDetailScreen.tsx:29`). Nothing new is needed to know the answer —
the home screen simply doesn't say it.

### PP-3 — "Harus Kembali Hari Ini" is the wrong list

Beranda's primary list is *Harus Kembali Hari Ini* (`:134-203`), fed by `getRentalsDueToday()`.

**Why it under-serves Mom.** It is scoped to a single day, so:

- On a day with no returns due it renders an empty state — the most prominent block on the home
  screen says nothing, while active rentals are running.
- A rental that went overdue three days ago **is not in it**. The one record most deserving of Mom's
  attention is the one the home screen omits.

Farrel's proposal: replace it with the **active rentals** list, sorted by urgency — due today first,
then overdue, then everything else.

**A naming collision to resolve.** Beranda's *Ringkasan* section already contains a stat card
labelled **"Rental Aktif"** (`:214`). Naming the new list "Rental Aktif" puts two different things
with the same name on one screen — one a count, one a list.

**A sort-order question to resolve.** The proposed order is *due today → overdue → the rest*. That
places a rental due at 18:00 tonight above one that was due last Tuesday. It may well be right (today's
returns are the ones Mom can still act on), but it is worth stating deliberately rather than inheriting.
There is also a genuine overlap: a rental due at 09:00 **this morning** is both "due today" *and*
overdue. Which bucket claims it is unspecified — see OQ-2.

## Affected users

- **Mom (`ops`, primary).** Opens Beranda first. Both problems are hers to live with.
- **Farrel (`admin`).** PP-2 is largely *for* him — it is a support and diagnosis affordance.
- **Any future operator.** Same.

## Validity — verified against code, 2026-07-25

| Claim | Verdict | Evidence |
|---|---|---|
| Greeting is hard-coded, role-blind | ✅ confirmed | `BerandaScreen.tsx:95` |
| Role is already available client-side | ✅ confirmed | `useSession()` → `role`; used at `RentalDetailScreen.tsx:105` |
| Beranda's list is scoped to today only | ✅ confirmed | `getRentalsDueToday()` (`services/rentals/index.ts:282`) |
| An active-rentals list is obtainable | ✅ feasible | `getRentals()` → `RentalListItem[]` already returns `status` + `dueAt`; `RentalScreen.tsx:102` filters `ACTIVE` today |
| "Rental Aktif" name is already taken on this screen | ⚠️ **collision** | `BerandaScreen.tsx:214` — Ringkasan stat card |
| Lateness can be derived client-side | ✅ confirmed | already done that way — `index.ts:291` computes `TERLAMBAT` from `dueAt < now`, not from the DB |

**No invalid claims.** Both pain points hold.

### ⚠️ This is the item with backend reach

`getRentalsDueToday()` does not filter in JavaScript — it selects from a **database view**,
`v_rentals_due_today` (`services/rentals/index.ts:285`). So "show active rentals instead" is not a
client-only edit. There are two shapes, and the choice belongs to the design session:

- **Client-side** — Beranda switches to `getRentals()` and filters/sorts `ACTIVE` in the screen or a
  new connector. No migration. `RentalScreen` already proves the data is sufficient.
- **Server-side** — a new or replacement view. Pulls in a migration, a `developer-backend`
  dispatch, and the `CREATE OR REPLACE` review discipline from debt #9.

**Connector signatures are locked** (CLAUDE.md, connector rule 2). Whichever shape wins, the route is
to **add** a connector, never to change `getRentalsDueToday`'s signature or return type.

**`getRentalsDueToday` would be orphaned.** `BerandaScreen` is its only caller (plus two test files).
If Beranda stops calling it, the function, the `RentalDueToday` type, and possibly the
`v_rentals_due_today` view all become dead. Deleting them is a decision, not a cleanup — see OQ-5.

## Scope

**In scope**

1. Beranda's greeting states the signed-in role: **`Halo, Admin!` / `Halo, Ops!`**, literal role
   names (Farrel's decision D-1).
2. Replace the *Harus Kembali Hari Ini* section with a list of **active rentals**.
3. That list is sorted by urgency: due-today → overdue → the rest (order confirmed at design time,
   see OQ-2).
4. Resolve the "Rental Aktif" naming collision with the existing Ringkasan stat card.

**Explicitly out of scope (non-goals)**

- Redesigning Beranda's layout, the Ringkasan stat grid, or the quick actions.
- Adding filtering, search, or tabs to the Beranda list — `RentalScreen` exists for that.
- Changing what a rental *is*, or any rental math.
- Auth, login, session handling, or role assignment. PP-2 **reads** the role; it does not manage it.
- Notifications or reminders about overdue rentals. Adjacent and tempting; not this PRD.

## Decisions already taken (Farrel, 2026-07-25)

- **D-1 — the greeting is permanent product copy showing the literal role name** (`Halo, Admin!` /
  `Halo, Ops!`), not a time-boxed diagnostic.
  > Recorded because the alternative was explicitly considered and rejected: v1.0.4 shipped a
  > "temporary" `fontScale` diagnostic footer that is on Mom's screen right now with no removal owner.
  > This one is permanent **by decision**, so it needs no removal plan — but it does mean internal role
  > vocabulary ("Ops") is now user-facing copy. See OQ-1.

## Constraints the design must honor (Product-surfaced; not the design itself)

- **Connector signatures are locked.** Add a connector; do not reshape `getRentalsDueToday`.
- **Prefer the client-side shape** unless the design session finds a concrete reason otherwise — it
  keeps this an OTA-only release. A migration changes the release's risk class, its dispatch plan, and
  its rollback story.
- **If a view *is* touched:** debt #9 applies — a migration replacing a function or view must list every
  behavioural line it changes in its header, and be reviewed by diffing old against new.
- **The list is now unbounded.** *Due today* was naturally small; *all active rentals* is not. Beranda
  is a scrolling dashboard, not a list screen — see OQ-3.
- **Must hold at `fontScale` 1.5** (PRD-5) and **respect the system-nav inset** (PRD-4). Beranda is
  inside `MainNavigator`'s tab bar; it already uses `useBottomSpace()` (`:34`) — reuse it, do not
  re-derive.
- **Beranda has real test coverage** (`BerandaScreen.test.tsx`, `BerandaScreen.fontScale.acceptance.test.tsx`)
  and both mock `getRentalsDueToday`. Changing the data source means updating those mocks — and it is
  an opportunity, since this is one of the few screens where coverage exists to protect the change.
- **OTA-only expected** *if* the client-side shape is chosen: no native dependency, no `version` bump.

## Open questions for the design session

- **OQ-1 (copy).** Is `Halo, Ops!` the literal string Mom sees? "Ops" is internal vocabulary and means
  nothing to her; she may read it as an error. Farrel has chosen literal role names — the remaining
  question is whether the *ops* label gets a human-readable Indonesian word while `Admin` stays as is.
  Worth a one-question check with Mom rather than a guess.
- **OQ-2 (sort).** Confirm the bucket order, and resolve the overlap: a rental due **earlier today**
  is both due-today and overdue. Which bucket wins, and is the sort within each bucket by `dueAt`
  ascending? Also: does *overdue* sort oldest-first (most neglected) or newest-first?
- **OQ-3 (volume).** Does the list cap? If Mom has 15 active rentals, does Beranda render all 15, or
  the top N with a "Lihat semua" link into `RentalScreen`? An unbounded list on a dashboard buries
  the Ringkasan section beneath it — and at Mom's `fontScale` 1.4, each card is already tall.
- **OQ-4 (naming).** What is the new section called, given *Rental Aktif* is taken by the stat card?
  Options: rename the section, rename the stat card, or drop the stat card as redundant once the list
  is right there.
- **OQ-5 (cleanup).** If Beranda stops calling `getRentalsDueToday()`, do the connector, the
  `RentalDueToday` type, and the `v_rentals_due_today` view get deleted, or kept for a future caller?
  Deleting the view is a migration; leaving it is dead schema. Either is fine — decide, don't drift.
- **OQ-6 (empty state).** What does Beranda show when there are **no** active rentals at all? Today's
  empty copy ("Tidak ada kendaraan yang harus kembali hari ini") stops being true and needs replacing.
