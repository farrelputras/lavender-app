# PROJECT CONTINUATION DOCUMENT
## Session 21 — 21 July 2026, 14:51

> **Read §4.1 first.** It is the single open decision blocking everything else, and it is what
> Farrel asked to have explained. The rest of the document is context for it.

---

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`lavender-ops-mobile`)
- **What This Project Is:** An internal vehicle-rental operations app for Farrel's mother's business.
  Two users total: **Mom** (role `ops`, primary daily operator) and **Farrel** (role `admin`).
  Not on the Play Store — the APK is sideloaded, updates ship OTA via Expo Updates.
- **Primary Objective (this release, v1.0.3):** Let Mom correct a rental **while it is still active**
  (exit fuel, km, exit photos, and the note), plus admin note-editing on a completed rental — without
  any money value ever moving. Requirements are **PRD-1**.
- **Strategic Intent:** This is a real business tool, not a demo. Mom enters data under time pressure
  at vehicle handovers. Wrong data that she cannot fix propagates into the return calculation, which
  determines what a customer owes. Correctness of money beats velocity, always.
- **Hard Constraints (must not change):**
  - **`app.json` `version` MUST stay `1.0.0`.** `runtimeVersion` policy is `appVersion`; bumping it
    targets OTA at a runtime Mom's installed APK does not report, silently cutting her off from all
    future updates. The *displayed* version is a JS constant (`app/config/release.ts`), now `"1.0.3"`.
  - **Connector contract** (`docs/02-demo-development.md` §3): UI never touches raw data; connector
    signatures are locked; all connectors are `async`; UI types are camelCase, never Postgres rows.
  - **Supabase errors are plain objects**, not `Error` instances. Connectors that must surface a
    message throw `new Error(error.message)`. **Never mock a Supabase failure as `new Error(...)`** —
    that exact mock hid a real bug through two green reviews.
  - **Never hand-paste migration SQL into the web SQL editor**, and never edit an already-applied
    migration file. Forward migrations only.
  - **Never bump `version` for an OTA-only release.**

---

### 2. WHAT EXISTS RIGHT NOW

#### Built and working ✅
- **v1.0.3 feature work is complete and committed** on branch `v1.0.3-edit-active-rental`
  (3 commits: `6c83193`, `8a7a0a8`, `5720273`). Working tree **clean**.
- **`pnpm test` → 31 suites / 168 tests, all passing.** `pnpm run compile` → clean.
  *(Both re-run and verified directly this session, not quoted from a subagent.)*
- PRD-1: `rpc_update_rental` migration, the `updateRental` connector, and the inline edit UI on
  `RentalDetailScreen`.
- Debt #5: a 30s `AbortController` fetch timeout in `app/services/supabase/client.ts`.
- A project-wide auth-gate hardening migration covering 10 `SECURITY DEFINER` RPCs.
- An emergency rollback script, deliberately **outside** `supabase/migrations/`.

#### Partially built / pending ⏳
- **Two migrations are authored, reviewed, and NOT pushed.** Nothing has been applied to the live
  Supabase project (`tuufzjxoprjsrrkagncz`).
- **AC-4** (server-side rejection provable independently of the UI) and the **server half of AC-6**
  are **PENDING — blocked on the push.** The verification SQL cannot run until the functions exist
  remotely. This ordering is unavoidable, not an oversight.
- `docs/reports/v1-0-3.md` — post-execution sections (bottlenecks, tech debt, best practices,
  workflow improvements) are still `_Pending_`.

#### Blocked 🛑
- **Everything downstream is blocked on one decision: the `deleted_at` fix (§4.1).**

#### Not started ❌
- The `deleted_at` fix itself (if approved).
- `db push`, verification SQL run, live smoke test, OTA publish.
- Merge to `master` — **explicitly gated by Farrel; the previous session was told to stop here.**
- Updating `docs/releases/v1-0-3.md`: its **Rollback section is currently WRONG** (see §5).
- The PRD-1 BR-5/AC-5 amendment that Product owes.

---

### 3. ARCHITECTURE & TECHNICAL MAP

- **Stack:** Expo SDK 55 (dev-client), React Native 0.83, **Ignite** (React Navigation — *not* Expo
  Router), TypeScript strict, Supabase (`@supabase/supabase-js` v2), EAS Build + Expo Updates.
- **Key paths:**

| Path | What |
|---|---|
| `app/screens/` | All screens. `RentalDetailScreen.tsx` is where v1.0.3's UI lives. |
| `app/services/rentals/index.ts` | The connector seam — every DB call goes through here. |
| `app/services/supabase/client.ts` | Supabase client + the new `fetchWithTimeout` wrapper. |
| `app/utils/rentalMath.ts` | Tariff, fuel adjustment, `sisa`. Must be correct. |
| `supabase/migrations/` | Applied migrations `0001`–`0017` + two new pending ones. |
| `docs/prd/PRD-1-edit-active-rental.md` | Authoritative requirements. |
| `docs/releases/v1-0-3.md` | Scope + release gates. **Rollback section is stale/wrong.** |
| `docs/reports/v1-0-3.md` | The full execution record for this release. |
| `docs/verification/` | SQL proving live DB behavior. Two v1.0.3 scripts, neither run yet. |

- **End-to-end flow for the v1.0.3 feature:**
  1. Mom opens an ACTIVE rental → `RentalDetailScreen` shows Edit on *Kondisi Keluar* and *Catatan*.
  2. Tapping Edit flips the section in place; Save/Cancel bar appears (`EditActionBar`).
  3. Save calls `updateRental(rentalId, input)`. New photos upload client-side first.
  4. The connector assembles a `jsonb` patch and calls `rpc_update_rental`.
  5. The RPC resolves `status`, applies a **tiered auth gate**, merges photos server-side, writes
     `kondisi_keluar` / `notes`. **No money recompute anywhere.**
  6. The connector re-fetches via `getRental` (re-signs photo URIs) and returns a `Rental`.
  7. On failure it throws `new Error(message)`; the UI toasts it and **stays in edit mode**.

- **The permission matrix (the heart of the feature):**

| Field | ACTIVE | COMPLETED | CANCELLED |
|---|---|---|---|
| Exit condition (fuel · km · photos) | ops or admin | ✋ no one | ✋ no one |
| Note | ops or admin | **admin only** | ✋ no one |

  Exit condition is ACTIVE-only because the exit-fuel reading is the **baseline** for the fuel
  adjustment at return — safe to change only *before* that calculation runs.

- **Conventions:** migrations `0001`-style historically, new ones timestamped (both sort correctly).
  Always `npx supabase` (CLI is a devDependency, no global install), run from
  `apps/lavender-ops-mobile`.
- **External:** Supabase project `tuufzjxoprjsrrkagncz`; EAS Update channel `preview`.

---

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

The session ran the **`/lead` delivery workflow**: plan → Farrel's approval → dispatch subagents →
review gates → report. Roles used: `developer-backend`, `developer-frontend`, `tester`,
`rental-math-reviewer`, `connector-contract-reviewer`, `pm`.

## 4.1 ⭐ THE OPEN DECISION — the `deleted_at` fix

**This is what Farrel asked to have explained, and it blocks everything else.**

### The bug, in one line

`rpc_close_rental` sums a rental's payments **without excluding soft-deleted ones**:

```sql
-- 0015_close_rental_tujuan.sql:81  (the live body today)
SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM payments WHERE rental_id = p_rental_id;
```

### How it was found

Nobody went looking for it. The chain was:

1. `rental-math-reviewer` was reviewing v1.0.3's **new** RPC and found an auth hole
   (three-valued SQL logic: `auth.uid() IN (…)` returns **NULL**, not `false`, when `auth.uid()` is
   NULL — so `IF NOT v_is_operator THEN RAISE` **silently never fires**).
2. That defect turned out to be **systemic** across already-shipped RPCs. Farrel directed the fix
   into v1.0.3 mid-execution.
3. `developer-backend` had to `CREATE OR REPLACE` those shipped functions. To guarantee it changed
   **only** guard lines, it machine-diffed each old body against each new one.
4. **Reading `rpc_close_rental`'s body that closely is how the missing `deleted_at` filter surfaced.**
   The backend reported it as pre-existing legacy debt and correctly refused to fix it inside a
   security migration.
5. `rental-math-reviewer`, re-signing the hardening migration, **corrected the backend's account of
   its origin** — and that correction is what makes it urgent.

### The provenance correction (verified directly this session)

It is **not** ancient debt. It is a **regression of a fix that already shipped**:

```sql
-- 0014_payment_edit_delete.sql:338-340  — the filter was HERE, deliberately
-- Compute sisa (exclude soft-deleted payments) and conditionally create hutang.
SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments WHERE rental_id = p_rental_id AND deleted_at IS NULL;
```

`0015` then `CREATE OR REPLACE`d the **whole function** to add **one `tujuan` line** — and silently
dropped the filter. `0015`'s own header claims it only adds `tujuan`.

**So `0015` was itself an undeclared body-invariance violation** — the exact failure mode the review
gate we ran this session exists to catch. That gate is not theoretical; this project has already
shipped this class of bug once.

### What it affects — why it is HIGH severity

**The UI and the server disagree about the same number, and the UI is right.**

- `v_rentals` (the view the app reads) **does** filter `deleted_at IS NULL` (`0014:89`). So
  `PengembalianScreen` computes and displays the **correct** `sisa`.
- `rpc_close_rental` does **not** filter. It computes a **larger** `total_paid` → a **smaller** `sisa`.

The concrete failure, all on one screen, in one moment:

1. Mom records a payment, realizes it is wrong, deletes it — **`PengembalianScreen` itself calls
   `deletePayment`** (`:1022`). This is not contrived; it is the same screen at the same moment.
2. The screen correctly shows *"Sisa Rp X"* and *"Jaminan ditahan — akan dibuat Hutang Rp X"*.
3. She presses a button that literally reads **"Selesaikan & Buat Hutang"**.
4. The server counts the deleted payment as paid → creates a hutang **smaller than X**, or
   **none at all** if the deleted payment covered the bill (`IF v_sisa > 0` skips the INSERT).

**The customer's debt silently does not exist.** Nothing self-heals it — `recompute_rental_hutang`
filters correctly but only runs if an admin later edits a payment on that rental.

**Reachable by Mom alone, no admin involvement.** `RentalDetailScreen:719` gates payment edit/delete
on `rental.status === "ACTIVE" || isAdmin`, so ops can delete a payment on an ACTIVE rental, and the
server's `rpc_delete_payment` permits it.

This violates `docs/02-demo-development.md` §6 directly: *"Sisa" = Total Tagihan − Σ pembayaran*.
A soft-deleted payment has been retracted; it is not a `pembayaran`.

### Why Farrel has to decide (it is not a technical call)

The fix is trivial — restore `AND deleted_at IS NULL`, one line, verbatim from `0014`. The decision
is a **process** one, and reasonable people land differently:

| Ship it in v1.0.3 | Hold the scope freeze |
|---|---|
| It is a **regression**, not accepted debt | PM explicitly froze scope after the auth addition |
| The fix is **restoring reviewed code**, not new logic | v1.0.3 already absorbed one unplanned mid-execution addition |
| Shipping the hardening re-asserts the wrong body into history a **third** time, making it look deliberate | A second exception makes "frozen" meaningless and is how a release stops being verifiable |
| It is **live and costing money silently right now** | It has been live since `0015`; a few more days is not categorically different |

**Both reviewers who looked at it recommend shipping it in v1.0.3 as its own separate migration file**
— separate so the security migration's body-invariance gate stays intact and the money change is
independently reviewable and revertible.

**If Farrel holds the freeze:** it must be logged as **high-severity** debt, and **Mom should be told
not to delete payments on active rentals** in the interim.

---

## 4.2 What else was decided this session, and why

| # | Decision | By | Reasoning (do not undo without reading this) |
|---|---|---|---|
| D-1 | **Only admin may empty the exit-photo set.** Ops removing the *last* photo is blocked with *"Foto terakhir tidak bisa dihapus. Minta Farrel untuk menghapusnya."* | **Farrel** (overruled Lead) | Lead recommended allowing an empty set; Farrel reversed it. **This makes PRD-1 BR-5/AC-5 stale** — they still say removal never errors. Product owes an amendment. |
| D-1a | The rule is *"may not **reduce** a non-empty set to empty"*, **not** "may not send an empty set" | Lead | The RPC rewrites `kondisi_keluar` **wholesale**, so an ops edit of a rental that *already* has zero photos also sends `photos: []`. The naive rule would block a legitimate fuel correction. Enforced at both layers. |
| D-2 | Fuel control uses **`max = 8`** | agent | Not chosen — **derived**. The edit control must match the scale of the control that *created* `bensinKotak`, or editing silently rescales the fuel baseline. Traced to `DetailSewaScreen`'s `Math.min(8, …)`. |
| D-3 | **30s** fetch timeout, no new UI | Farrel | The wrapper bounds **storage photo uploads** too. A tight timeout would fail a slow-but-succeeding multi-photo upload on mobile data — **worse than the hang it replaces**, because it kills work that would have completed. |
| — | Auth-gate fix ships **in v1.0.3** | Farrel | Overrode Lead's recommendation to defer it to its own release. |
| — | Scope: **10 functions**, not the 6 escalated | Farrel (PM-scoped) | PM found 4 more by reading rather than trusting the escalation. |
| — | `recompute_rental_hutang` revoked from **`authenticated` too** | Farrel | Conditional on zero direct callers; backend and reviewer independently confirmed zero. |
| — | Scope **frozen** after the auth addition | Farrel | Notably resisting debt #1, which looks newly urgent *because* someone is editing the error path — scope creep wearing a disguise. |
| — | `app/config/release.ts` → `"1.0.3"` | Farrel | Was still `"1.0.2"`. `app.json` stays `1.0.0`. |

### The three security defects fixed in v1.0.3's own new RPC (all closed, re-verified)

1. **NULL-logic auth bypass** — `IS NOT TRUE` at every role check.
2. **`GRANT` was decorative** — Postgres grants `EXECUTE` to `PUBLIC` by default and **no `REVOKE`
   existed anywhere in the project**, so `anon` (whose key ships in the sideloaded APK) reached the
   body, and `SECURITY DEFINER` then bypassed RLS. Added `REVOKE … FROM PUBLIC, anon`.
3. **`bensinKotak` could be silently nulled** — `(patch->…->>'bensinKotak')::int` yields NULL for
   both an absent key and JSON `null`; `translators.ts:28` then reads it back as `?? 4`, **silently
   substituting 4 kotak**. Now RAISEs.

### Three near-misses worth preserving

- **A verification script that would have passed vacuously.** Section K claimed to prove the REVOKE
  but only cleared JWT *claims*, not the *session role* — the script runs as an elevated role that
  holds `EXECUTE` regardless. Worse, **nothing would have caught a broken `authenticated` grant**,
  which kills the app for every real user. Fixed with `has_function_privilege` on **both** roles.
- **The rollback would have undone itself.** `db push` applies **every** pending migration in one
  shot — no per-file selection. A rollback inside `migrations/` would have been applied by the very
  push that shipped the hardening. It now lives at `supabase/ROLLBACK_restore_rpc_grants.sql`.
- **Three functions never had *any* explicit `GRANT`** in project history (`rpc_get_dashboard_summary`,
  `rpc_create_rental`, `rpc_close_rental`) — they ran purely on the default `PUBLIC` grant. **`REVOKE`
  alone would have locked out every user on push.**

### Discussed but NOT implemented
- The `deleted_at` fix (§4.1).
- Commenting out `ROLLBACK_restore_rpc_grants.sql:111`, which re-grants `recompute_rental_hutang` to
  `PUBLIC` — restoring the sharpest item in the set. An operator under pressure runs the file whole.
- Rewriting `docs/releases/v1-0-3.md`'s Rollback section.
- Debt-register updates: amend #5, grow #1, open #8.
- The PRD-1 BR-5/AC-5 amendment.

### Open threads
- **`0016`'s hard-delete guard has the identical NULL hole** — it is in scope for the hardening
  migration and fixed there, but it has been **live** since `0016` shipped.
- The `bensinKotak` guard only checks `IS NULL`; `-5` or `9999` still writes through. Not reachable
  through the UI (Stepper clamps 0–8). Debt-register item.
- Pre-existing: a CANCELLED rental renders "Selesai" in the status chip.
- `RentalDetailScreen.tsx` gained **+1 real lint error** (`no-restricted-imports`, raw `TextInput`),
  consistent with both rental-math screens. Technically breaches debt #6's "must not increase" gate.

---

### 5. WHAT COULD GO WRONG

#### Known bugs
- **The `deleted_at` bug (§4.1) — live right now, silently under-recording customer debt.**
- `0016`'s NULL-logic hole — live until the push lands.

#### ⚠️ The single most dangerous thing in this handoff

**PM's finding: the fix is riskier to the business than the vulnerability is.**

The vulnerability has existed since `0005` and requires extracting the anon key from the APK plus
deliberate intent, against an app with two users. **A botched `REVOKE` breaks Mom immediately, in the
field, during handovers — and OTA rollback cannot fix it**, because the damage is server-side the
instant the push lands.

Three failure modes: `REVOKE` too wide (strips `authenticated` → app dead); polarity flip on an
`IS NOT TRUE` conversion (a guard that never fired now **always** fires → Mom cannot close rentals or
record payments); silent body drift while "tidying".

All three were reviewed for and cleared — but this is why the **live smoke test on Mom's account is
non-negotiable**, and why the push must happen when Farrel can test within minutes.

#### 🔴 `docs/releases/v1-0-3.md`'s Rollback section is WRONG
It says a JS-only OTA rollback is safe because the migration is additive and inert. **True of PRD-1's
migration; false of the hardening migration**, which modifies functions Mom uses daily. OTA-republish
does not undo it. **Rewrite before shipping.**

#### Assumptions the next AI might get wrong
- ❌ "The migrations are pushed." **They are not.** Both show `remote: ""`.
- ❌ "AC-4 failed." **It is PENDING**, blocked on the push. Do not mark it failed.
- ❌ "PRD-1 is the current truth on photos." **BR-5/AC-5 are stale** — D-1 supersedes them.
- ❌ "The rollback belongs in `migrations/`." **No** — it would self-apply.
- ❌ "`GRANT … TO authenticated` means it is locked down." **No** — `PUBLIC` holds `EXECUTE` by
  default; only an explicit `REVOKE` restricts it.
- ❌ "`-- No GRANT` in a comment is a security control." **It never was.**
- ❌ "Lint should be green." It is red on `master` by known debt #6 (~25,000 phantom CRLF errors).
  **Do NOT run `eslint --fix` across the repo** — it would rewrite line endings on the two rental-math
  screens, producing an unreviewable diff over the most dangerous code in the app.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1. Core pattern — the connector seam.** Every DB call goes through
`app/services/rentals/index.ts` with a **locked signature**. Screens never see a Postgres row. This
exists so the planned v1.1 backend swap is a connector-layer-only change. All connectors are `async`
even when they needn't be — otherwise every UI caller would need `await` added during migration,
which is exactly the UI rewrite the architecture exists to prevent.

**Security rule that generalizes:** `SECURITY DEFINER` only bypasses RLS for what runs **inside** the
function. Any client-side step in the same workflow is still an RLS subject. This was missed once
already (photo cleanup after hard-delete failed silently; fixed in `0017`).

**2. The most common mistake:** *assuming a guard that reads correctly actually fires.* This project
has now been bitten three separate ways — `NOT NULL_expr` never firing, `GRANT` without `REVOKE` doing
nothing, and `-- No GRANT` being treated as protection. A close second: **a `CREATE OR REPLACE` that
quietly changes more than it claims** — that is precisely how the `deleted_at` bug got in.

**3. What looks refactorable but must NOT be touched:** `DetailSewaScreen.tsx` and
`PengembalianScreen.tsx` (~48–50KB each) contain private copies of the shared design system
(`SectionLabel`, `FuelGauge`, `FieldCard`, `Stepper`), and **the copies have already diverged**. It is
tempting to unify them. **Do not.** Those two files are tariff composition and fuel-adjustment +
auto-debt creation — the highest-risk code in the app. Debt #4 says this needs its own release,
characterisation tests *before* anything moves, and a `rental-math-reviewer` pass after.

Also do not "fix" `translators.ts`'s `?? 4` fallback — it is the right defensive default for legacy
rows. The fix belongs at the write boundary, where it now is.

---

### 7. DO NOT TOUCH LIST

- **Do NOT merge to `master`.** Farrel explicitly gated this; the previous session was told to stop
  at the merge boundary.
- **Do NOT run `npx supabase db push` without Farrel's explicit go-ahead**, and not unless he can
  smoke-test within minutes.
- **Do NOT edit any already-applied migration** (`0001`–`0017`). `db push` skips them, so an edit
  changes the repo's story without changing the database — leaving every future reader believing a
  hole is closed while it is open. **Worse than not fixing it, because it destroys the ability to know.**
- **Do NOT move `ROLLBACK_restore_rpc_grants.sql` into `supabase/migrations/`.**
- **Do NOT touch debt #1** (the ~24 raw postgrest throws). Scope is frozen.
- **Do NOT alter logic in `DetailSewaScreen.tsx` / `PengembalianScreen.tsx`.**
- **Do NOT run `eslint --fix` / `prettier --write` across the repo.**
- **Do NOT mock a Supabase error as `new Error(...)`.** (A *`fetch`* rejection genuinely is an
  `Error` — know which layer you are mocking.)
- **Do NOT bump `app.json` `version`.**
- Do NOT re-open `20260720073455_rpc_update_rental.sql` or the `updateRental` connector — both
  passed two review gates.
- Preserve the D-1 photo rule exactly; it is deliberately stricter than PRD-1 still says.

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence | Basis |
|---|---|---|
| §1 Identity / constraints | ✅ HIGH | CLAUDE.md + PRD-1, re-read this session |
| §2 Current state | ✅ HIGH | `git log`/`status` and `pnpm test` **run directly**, not quoted |
| §3 Architecture | ✅ HIGH | Verified by two review agents this session |
| §4.1 `deleted_at` bug | ✅ HIGH | Found by `rental-math-reviewer`; provenance **independently confirmed** by reading `0014:338-340` vs `0015:81` |
| §4.1 severity/reachability | ✅ HIGH | Reviewer cited `PengembalianScreen.tsx:1022`, `:232`, `RentalDetailScreen.tsx:719` |
| §4.2 Decisions | ✅ HIGH | All made this session, recorded in `docs/reports/v1-0-3.md` |
| Migration correctness | ✅ HIGH | `rental-math-reviewer` PASS on body invariance, polarity, lockout risk |
| Test counts (31/168) | ✅ HIGH | Re-run 3× by tester, then independently by Lead |
| AC-1…AC-3, AC-5…AC-9 | ✅ HIGH | Tester verdict + independent suite run |
| AC-4, server half of AC-6 | ⚠️ MEDIUM | Scripts **authored and assessed adequate but never executed** |
| The two migrations' live behavior | ❓ **LOW** | **Never run against a real database.** Reviewed by reading only. |
| Rollback would restore access | ⚠️ MEDIUM | Reviewer PASS-WITH-CONCERNS, by reading; never exercised |
| Debt register accuracy | ⚠️ MEDIUM | #5 known narrower than written; #1 grew; #8 not yet opened |

---

## THE IMMEDIATE NEXT ACTIONS, IN ORDER

**Step 0 — Answer Farrel's question (§4.1) and get his decision.** Everything below waits on it.

**If he approves the fix:** dispatch `developer-backend` for a **separate** one-line migration
(restore `AND deleted_at IS NULL`, verbatim from `0014:339-340`) + a test; re-run
`rental-math-reviewer`; commit. Also comment out `ROLLBACK_restore_rpc_grants.sql:111`.

**Step 1 — `db push`** (only when Farrel is at a keyboard with the preview APK):
```powershell
cd apps/lavender-ops-mobile
npx supabase migration list      # confirm exactly the expected files are pending
npx supabase db push             # applies ALL pending migrations at once
```

**Step 2 — Run the verification SQL** (impossible before the push). Closes **AC-4** + server **AC-6**:
```powershell
npx supabase db query --linked -f ../../docs/verification/v1-0-3-rpc-update-rental.sql
npx supabase db query --linked -f ../../docs/verification/v1-0-3-rpc-auth-gate-hardening.sql
```
Read results **literally**. `EXCEPTION WHEN OTHERS` stringifies any failure — "an ERROR appeared" is
**not** a pass; the message must match exactly. The `authenticated = true` assertions matter as much
as the `anon = false` ones.

**Step 3 — Live smoke test on the preview APK, as Mom's account (NOT admin):** create a rental ·
close a rental · add/edit/delete a payment · load the dashboard. **This is the only gate that proves
Mom is not locked out** — SQL privilege checks can pass while the app is dead.

**If she is locked out:** apply `apps/lavender-ops-mobile/supabase/ROLLBACK_restore_rpc_grants.sql`
via `npx supabase db query --linked -f`.

**Step 4 — OTA publish:**
```powershell
pnpm ota:publish --message "v1.0.3: edit active rental + auth hardening"
```

**Step 5 — Close out:** fill in `docs/reports/v1-0-3.md`'s post-execution sections; rewrite the
Rollback section of `docs/releases/v1-0-3.md`; update the debt register (amend #5, grow #1, open #8);
then **ask Farrel** about merging to `master`.
