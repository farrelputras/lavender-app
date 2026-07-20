# v1.0.3 — Tester report

- **PRD:** `docs/prd/PRD-1-edit-active-rental.md` (AC-1…AC-9) — **AC-5/BR-5 amended** per D-1
  (`docs/reports/v1-0-3.md`): the exit-photo set may only be emptied by admin; an ops attempt to
  remove the **last** photo is blocked with an error. This report tests the amended rule, not the
  stale PRD text, per Lead's explicit brief.
- **Branch:** `v1.0.3-edit-active-rental`, tip `6c83193` (developer round 2, post review-gate fixes)
  at start of this pass. No product code touched — test files only.
- **Baseline handed to Tester:** 27 suites / 144 tests green, compile clean.
- **State at end of this pass:** **31 suites / 168 tests, all green** (`pnpm test`, run twice for
  stability). `pnpm run compile` — **clean, 0 errors.**

New test files (this pass), all `*.test.ts(x)`, no product code modified:

| File | Purpose |
|---|---|
| `app/services/supabase/client.noRegression.test.ts` | #5 no-regression gate: real (unmocked) supabase client + real connectors across rental/user/hutang read+write paths |
| `app/services/rentals/updateRental.moneyInvariant.test.ts` | AC-6/BR-6 client-side structural proof: the patch sent to `rpc_update_rental` never contains a money-shaped key |
| `app/screens/RentalDetailScreen.acceptance.test.tsx` | AC-1/BR-8 persistence-across-reopen, AC-6 UI-level money-invariant, add-a-new-photo path, AC-8 refinement |
| `app/config/release.acceptance.test.ts` | AC-9: `app.json` version pinned at `1.0.0` |

---

## 1. Pass/fail per acceptance criterion

| AC | Verdict | Covering test(s) |
|---|---|---|
| **AC-1** ACTIVE: fuel/km/photos edit persists across reopen | **PASS** | `RentalDetailScreen.acceptance.test.tsx` — "kondisi keluar: a value saved in one screen instance is what a FRESH mount displays" (real unmount + fresh `render()`, connected only via `getRental`'s mocked return — mirrors what a real re-navigation does). Plus developer's `updateRental.test.ts` (patch assembly) and `RentalDetailScreen.test.tsx` (wholesale-patch construction). |
| **AC-2** ACTIVE: note edits and saves | **PASS** | Developer's `RentalDetailScreen.test.tsx` ("notes save: on success…"). Extended by my "catatan rental: a note saved in one screen instance is what a fresh mount displays" for the reopen case (BR-8). |
| **AC-3** COMPLETED: exit-condition Edit offered to no one; note Edit admin-only | **PASS** | Developer's `edit affordance visibility` matrix test (`it.each` over status×role) — verified correct and non-vacuous by reading `RentalDetailScreen.editLogic.ts` directly: `canEditKondisiKeluar` = `status === "ACTIVE"`; `canEditNotes` = `ACTIVE \|\| (COMPLETED && isAdmin)`. Matches PRD-1's matrix exactly. |
| **AC-4** Disallowed edit rejected server-side, provable independently of UI | **PENDING (blocked on push)** — see §2 below. |
| **AC-5** (amended, D-1) last-photo removal blocked for ops with the Farrel-toast; admin may empty; an already-empty set never blocks a fuel/km-only correction | **PASS** | Developer's `editLogic.test.ts` (`isLastPhotoRemovalBlocked`, all 5 cases including both "already empty" edge cases) + `RentalDetailScreen.test.tsx`'s "last-photo removal block (D-1)" describe (ops blocked + toast text verbatim, admin allowed, already-empty not blocked). Independently re-verified: the toast string in `RentalDetailScreen.tsx:212` (`"Foto terakhir tidak bisa dihapus. Minta Farrel untuk menghapusnya."`) is byte-identical to the SQL's `RAISE EXCEPTION` message (migration line 117) and to the brief. Not vacuous — these tests actually exercise the D-1 rule, not a placeholder. |
| **AC-6** No money value changes as a result of any edit | **PASS** (client-side/structural half — see note) | `updateRental.moneyInvariant.test.ts` (patch never carries a money-shaped key, even under a type-bypassing "smuggled" input) + `RentalDetailScreen.acceptance.test.tsx`'s "displayed money values are unchanged" describe (Tarif/Total/Sisa/payment list unchanged on screen after a kondisi/notes save). **The authoritative, complete proof is server-side** (`rpc_update_rental` only ever runs two `UPDATE`s — `kondisi_keluar`, `notes` — never `tarif`/`total_bill`/`payments`/`hutang`); that is verified by `docs/verification/…sql` §B/§F, which shares AC-4's PENDING status (not yet run against the live DB). |
| **AC-7** Save cannot double-fire; failed save keeps edit mode + visible message | **PASS** | Developer's `EditActionBar.test.tsx` (disabled while `saving`) + `RentalDetailScreen.test.tsx`'s BR-7 describe (in-flight disable, failure toast + stays in edit mode, for both kondisi and notes). Adequate and not vacuous. |
| **AC-8** CANCELLED: nothing (in PRD-1's matrix) editable | **PASS**, with one clarification | See §6 below — a pre-existing, out-of-PRD-1-scope payment-edit button also renders "Edit" for admin on any rental regardless of status. The two PRD-1 affordances (`kondisi-edit-btn`, `notes-edit-btn`) are correctly absent for CANCELLED, both roles — proven by developer's matrix test and my `AC-8` describe. |
| **AC-9** OTA-only: `version` unchanged, no native dep, no APK | **PASS** | `release.acceptance.test.ts` (`app.json` version === `"1.0.0"`) + structural check: `git diff` of `package.json`/`app.json` against this branch's base (`e8653d0`) is empty — no dependency added, no version bump. "No APK" is a deployment fact, not testable in Jest; confirmed by the same empty diff (nothing native-touching changed). |

---

## 2. AC-4 — assessment of `docs/verification/v1-0-3-rpc-update-rental.sql`

**Status: PENDING (blocked on push).** The migration (`20260720073455_rpc_update_rental.sql`) has
not been applied to the linked project — confirmed by reading the migration and verification files
directly; nothing in this pass ran `db push` (correctly out of Tester's authority per the release
report's approval gate).

**Adequacy of the script, read section-by-section:** it would prove what AC-4/BR-1 require.
- Tiered gate: §B/§C/§D cover `kondisiKeluar` ACTIVE-only (ops succeeds, both ops+admin RAISE on
  COMPLETED — the harder "settled money must never move" case — and CANCELLED RAISEs).
- §E/§F/§G/§H cover `notes`: ACTIVE ops succeeds, COMPLETED admin succeeds, COMPLETED ops RAISEs
  (admin-only tier), CANCELLED RAISEs even for admin.
- §I/§J cover the amended D-1 last-photo rule for **both** roles, including the mandatory "already
  empty, ops, must succeed" edge case (§J) — this is the exact case the naive rule gets wrong.
- §K proves Fix-1 (NULL-safe role checks) via an unauthenticated-caller simulation, with an explicit
  warning in the script itself not to misread "any ERROR" as a pass — only the literal `unauthorized`
  string counts. §K2 proves Fix-2 (the `REVOKE …FROM PUBLIC, anon`) directly via
  `has_function_privilege(...)`, correctly noting §K's Management-API role can never exercise the
  grant check on its own. §L proves Fix-3 (missing `bensinKotak` rejected, not defaulted).
- §B/§F double as the BR-6/AC-6 server-side proof (tarif/subtotal_sewa asserted unchanged).
- Section Z cleans up all `TEST_V103`-tagged fixtures and helper functions.

I found no gap in the script's coverage against BR-1/AC-4's requirements. **Recommendation:** run it
immediately after `db push`, section by section, and record actual output in the file per its own
header instructions before this gate is marked satisfied in the release report.

---

## 3. Debt #5 — the two release gates

| Gate | Verdict | Covering test(s) |
|---|---|---|
| **Timeout:** a never-resolving `fetch` times out with a clear error within a bounded (30s) wait | **PASS** | Developer's `client.test.ts` (`fetchWithTimeout` directly, using a `fetch` that only ever rejects on abort — mirrors RN's real behavior — advanced via `jest.advanceTimersByTimeAsync(30_000)`, asserts the Indonesian message). Not vacuous. |
| **No-regression:** a successful connector call is unchanged; the timer never fires; confirmed across rental/user/hutang read+write | **PASS** | `client.noRegression.test.ts` — this is new coverage this pass, not just a re-assertion of the developer's isolated wrapper test. It uses the **real, unmocked** `@supabase/supabase-js` client (only `global.fetch` faked) and calls the **actual exported connector functions**: rental read (`getRentals`), rental write via table insert+refetch (`addPayment`), rental write via the new RPC (`updateRental`), user read (`getUserSummaries`), user write (`updateUser`), hutang read (`getHutangs`), hutang write (`addHutangPayment`) — 8 tests, all confirming normal request/response shape is preserved and the injected `AbortSignal` is present-but-not-aborted. This closes a real gap: the developer's `client.test.ts` proves the wrapper is transparent **in isolation**; nothing previously proved it is actually wired into `createClient({ global: { fetch } })` and stays transparent once postgrest-js's own request assembly (headers, `.maybeSingle()`, `.rpc()` body) is in the loop. |

**Known scope limit (confirmed, not a bug — as briefed):** the Indonesian timeout copy reaches the
UI only through the 5 connectors that wrap in `new Error(...)` (`updateRental` + 4 `hardDelete*`).
I did not attempt a full hang-then-timeout test through one of the other ~24 raw-`throw error`
connectors (e.g. `getRental`) — I prototyped this and hit a reproducible jest/fake-timers +
postgrest-js interaction that hung the test runner past 15s regardless of `advanceTimersByTimeAsync`
(likely undici/Node's own internal scheduling not being intercepted by jest's fake timers). Given
the isolated wrapper test (client.test.ts) plus the wiring proof (client.noRegression.test.ts)
already jointly establish "the hang is fixed everywhere, the message degrades on ~24 sites" as
documented, I did not chase this further — logged as a coverage gap (§4), not pursued due to
environment fragility rather than product risk.

---

## 4. Coverage gaps vs the PRD

- **AC-4/AC-6(server half)** — behavioral proof pending the `db push` (§2). Not a test gap; a
  sequencing gap already flagged by Lead as a separate, Farrel-gated step.
- **The hang-then-degraded-message case** on one of the ~24 unwrapped connectors, end-to-end through
  a real hung `fetch` — not proven by any test (see §3). Low risk: the property itself (message
  degrades to the generic fallback on those sites) follows deterministically from reading
  `postgrest-js`'s error handling and each connector's own `catch`/fallback text; it isn't a
  behavior that plausibly regresses independently.
- **Real camera/gallery permission flows** (`expo-image-picker` permission prompts,
  `captureFromCamera`/`captureFromGallery` internals) are not exercised by any test in this
  release — every test (developer's and mine) mocks at the `choosePhotoSource` module boundary.
  This matches the existing testing convention for photo capture elsewhere in the app (not a
  v1.0.3-specific gap).
- **`rental-math` review sign-off** on the ACTIVE-gate argument is a review-gate item, not a test
  gap — already recorded as done (with the F-1/F-2/F-3 round) in `docs/reports/v1-0-3.md`.

---

## 5. Developer tests reviewed for vacuity — none found wrong or vacuous

I read every developer test file line-by-line (`updateRental.test.ts`, `client.test.ts`,
`RentalDetailScreen.editLogic.test.ts`, `RentalDetailScreen.test.tsx`, `EditActionBar.test.tsx`)
before writing anything new, specifically checking whether each asserted what it claimed:

- `updateRental.test.ts`'s error test correctly mocks the plain-object postgrest shape (never
  `new Error(...)`) and asserts the connector rethrows a real `Error` carrying the message — correct
  per the project's mandatory testing rule.
- `client.test.ts`'s never-resolving-fetch mock correctly mirrors RN's real behavior (the promise
  only ever settles via the abort listener, matching how `AbortController`-driven fetches actually
  behave) rather than a mock that settles some other, easier way.
- `RentalDetailScreen.test.tsx`'s D-1 last-photo tests correctly assert the **toast fires without**
  `updateRental` having been called yet (blocked at removal time), and separately that pressing Save
  afterward still sends the photo as `kept` — this proves the block is real UI state, not just a
  toast side-effect with no behavioral consequence.

No vacuous or wrongly-asserting developer test found.

---

## 6. Divergence found during testing (not a bug, needed clarification)

**A pre-existing, out-of-PRD-1-scope "Edit" button leaked into my first AC-8 assertion.**
`RentalDetailScreen.tsx`'s payment row renders its own Edit button gated on
`rental.status === "ACTIVE" || isAdmin` (pre-dates v1.0.3 — payment edit/delete shipped in
migration `0014`, v1.0.2 era). For an **admin** viewing a **CANCELLED** rental **with a payment on
it**, that button renders — so a blanket "no element with text 'Edit' anywhere" assertion fails, but
**not** because PRD-1's matrix leaked: `kondisi-edit-btn` and `notes-edit-btn` are correctly absent
in every case I tested. I narrowed the test to isolate PRD-1's two governed fields and added a
dedicated case proving the one rendered "Edit" in that scenario is the payment button, not a PRD-1
leak. Flagging as an observation, not a defect: PRD-1's non-goals section never claimed payment
editing, and "CANCELLED: nothing editable" in the PRD's plain-language framing is scoped by its own
matrix (which only has two rows: exit condition, note) — but it *is* the kind of ambiguity worth a
one-line clarification in a future PRD-1 amendment alongside the already-owed BR-5/AC-5 fix, since a
literal reading of AC-8 ("nothing is editable") is broader than what the matrix actually governs.

**`app/config/release.ts`'s `RELEASE` constant is still `"1.0.2"`.** This is the JS-only display
version shown in the Beranda footer (distinct from `app.json`'s pinned `1.0.0`, per that file's own
doc comment: "Bump it before every `pnpm ota:publish`. Nothing enforces this."). Not part of any
AC-9 requirement (which only concerns `app.json`), so not a test failure — but worth a Lead/Farrel
decision before `ota:publish`: bump it to `"1.0.3"` as part of ship, or intentionally leave it,
since nothing currently enforces the bump and it was evidently missed once already this release.

---

## 7. Diagnosis of the 4 failures Lead observed (all now fixed; test-file-only, no product code touched)

All four were failures in **my own new test file** (`RentalDetailScreen.acceptance.test.tsx`), not
in developer tests, and not in product code. Diagnosed by reading the relevant handler in
`RentalDetailScreen.tsx` directly and, where needed, reproducing in an isolated scratch harness
before concluding — per the standing instruction, I did not assume "failing == my test is wrong"
without checking the code first.

1. **AC-8 admin/CANCELLED — one "Edit" text found.** Confirmed by reading the code: the pre-existing
   payment-edit button (§6), not a PRD-1 leak. **Test artifact** (assertion too broad) — narrowed,
   plus added a dedicated test proving what the one Edit actually is.
2. **Add-photo patch showed `photos: []` instead of the captured photo.** Confirmed **not** a
   product bug: `handleAddKondisiPhoto` in `RentalDetailScreen.tsx` correctly
   `await choosePhotoSource()`s before calling `setEditPhotos`. My test fired the Save button
   **synchronously** right after the add-tile press, before that awaited state update had a chance
   to land — a genuine test-timing bug on my part. Fixed by `await waitFor(...)` before Save,
   matching the pattern already used (and already passing) in the sibling "existing + new photo"
   test in the same file. Re-verified in an isolated debug harness that the real handler, given
   time to settle, produces the correct patch. **AC-1's photo-edit path is not broken.**
3 & 4. **Two `waitFor(...).toBeNull()` assertions (AC-6 describe) intermittently failed on their
   default 1000ms internal budget**, not because the save/exit-edit-mode behavior was wrong — a
   debug harness using a plain `setTimeout(200)` instead of `waitFor` showed the save completing
   and the toast firing correctly every time, and re-running with `--testTimeout=20000` passed at
   ~2.3s. This screen mounts a large tree; **environment/timing headroom**, not a defect. Fixed by
   widening the specific `waitFor` calls to 5000ms and adding `jest.setTimeout(15000)` for this
   file. One of the two also had a **second, independent bug**: its `getAllByText("Rp 15.000")`
   assertion coincidentally matched both the payment row's amount and the "Sudah dibayar" summary
   row (they're equal by construction when there's exactly one payment) — fixed by keying off the
   "Cash" method badge instead, which only ever renders inside a payment row.

Stability re-confirmed: the full file and the full suite were each run twice after the fixes with
no flakes (`31 suites / 168 tests` both times).

---

## 8. Items needing a Lead/Farrel decision

1. **`db push` + run `docs/verification/v1-0-3-rpc-update-rental.sql`** — the one remaining step
   before AC-4/BR-1 and the server half of AC-6/BR-6 move from PENDING to PASS. Already flagged in
   the release report as a separate, explicitly-approved step; not re-litigated here.
2. **`app/config/release.ts`'s `RELEASE` constant** — bump to `"1.0.3"` before `ota:publish`, or
   confirm leaving it is intentional (§6).
3. **AC-8's literal wording vs. its matrix** — worth folding into the BR-5/AC-5 amendment Product
   already owes PRD-1, clarifying that "nothing is editable" on CANCELLED is scoped to the
   matrix's two rows, not the whole screen (§6). Not a blocker.
