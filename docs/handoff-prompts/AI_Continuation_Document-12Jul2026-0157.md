# PROJECT CONTINUATION DOCUMENT
## Session — 2026-07-12

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`apps/lavender-ops-mobile`, monorepo root `lavender-app`)
- **What This Project Is:** An internal vehicle-rental operations mobile app for Farrel's mom's rental business. Two users: Mom (primary/day-to-day "ops" role) and Farrel (admin). Not published on the Play Store — the APK is sideloaded directly onto Mom's device.
- **Primary Objective (current):** Ship v1.0.1 ("feedback polish round 2") as an OTA update to the already-shipped v1.0.0 preview APK — no new APK build, no `version` bump.
- **Strategic Intent:** v1.0.0 shipped a real, working day-to-day app to Mom (Play Store equivalent: sideloaded APK + Expo Updates OTA channel `preview`). Everything after that APK ships via OTA. v1.0.1 is the second round of polish based on Mom's real-world usage feedback.
- **Hard Constraints (non-negotiable):**
  - **Connector-contract rules** (`docs/02-demo-development.md` §3): UI components never touch raw data — all reads/writes go through connector functions. Connector function signatures (name/params/return type) are a locked contract. All connectors are `async`. UI code only ever sees camelCase types; the connector layer translates Postgres's snake_case rows.
  - **Rental math** (`docs/02-demo-development.md` §6) must not be broken — tariff composition, fuel adjustment direction, `Sisa = Total Tagihan − Σ payments`, auto-debt creation on return.
  - **v1.0.1 delivery is OTA-only.** No native module was introduced, so no APK rebuild, no `version` bump in `app.json`.
  - **Migration 0016 must be live in Supabase before the JS that calls its RPCs ships** to users.
  - Item 5 (text sizing) from the original v1.0.1 design is explicitly **out of scope** for this release — do not implement it opportunistically.

### 2. WHAT EXISTS RIGHT NOW

- **What is built and working:**
  - v1.0.0: fully shipped (all 7 phases done — auth, User/Hutang/Penyewaan CRUD, photo upload, Stitch redesign, UUID+OTA infra, edit/delete payments, Tujuan field). Confirmed via `CLAUDE.md`'s phase table.
  - v1.0.1 **Phase 1** (items 2/3a/3b — "Kembali ke Beranda" button, drop payment pre-fill, tarif read-only suggestion): done, reviewed, **merged to master**.
  - v1.0.1 **Phase 2** (item 4 — pinch-to-zoom `PhotoViewer`, wired into RentalDetailScreen + UserDetailScreen): done, reviewed, **merged to master**.
  - v1.0.1 **Phase 3 data layer** (item 6, part 1 — Tasks 3.1–3.3): migration `0016_admin_hard_delete.sql` (4 `SECURITY DEFINER` RPCs), `removePaths()` storage helper, 4 `hardDelete*` connectors. All implemented via TDD, all independently reviewed and approved (Task 3.1 by an opus-tier reviewer given the SECURITY DEFINER risk; 3.2/3.3 by sonnet reviewers). **Merged to master early** (fast-forward, `dab8e41..a7d34f1`) at the user's explicit request, ahead of the rest of Phase 3, specifically so migration 0016 would be present in the main checkout for the user to apply via the Supabase CLI.
  - **Migration 0016 is live on the production Supabase project.** User applied it via `npx supabase migration list` / CLI. Structurally verified: all 4 `rpc_admin_delete_*` functions exist, each `SECURITY DEFINER` with `search_path=public` pinned, each `GRANT EXECUTE`'d to the `authenticated` role. Confirmed via direct SQL query the user ran and pasted back.
  - Master's full test suite is green post-merge: 19/19 suites, 78/78 tests (`pnpm test` from `apps/lavender-ops-mobile`).

- **What is partially built:**
  - **Task 3.4 (behavioral verification of migration 0016)** — Step 1 (structural: functions exist, correct security posture) is **confirmed done**. Steps 2–4 (behavioral: auth-gate rejection, rental cascade correctness, block-if-referenced correctness) have a test SQL script written and handed to the user, but **the user has not yet run it and reported results** — this is the single most immediate open item.
  - The Phase 3 worktree (`.worktrees/feat-v1-0-1-phase-3`, branch `feat/v1-0-1-phase-3`) still exists, currently pointing at the same commit as master (`a7d34f1`) — kept alive intentionally to continue Phase 3's remaining tasks on top of it.

- **What is broken or blocked:**
  - Nothing is broken in the shipped code. The **Supabase MCP OAuth flow is broken** for this project/environment (`"Unrecognized client_id"` error on the authorize URL) — abandoned in favor of asking the user to run SQL directly via the Supabase CLI / SQL editor and paste results back.
  - Task 3.4's behavioral verification is blocked purely on the user running the handed-off SQL script — no code-side blocker.

- **What has NOT been started yet:**
  - **Task 3.5:** Admin hard-delete UI on `RentalDetailScreen.tsx`.
  - **Task 3.6:** Admin hard-delete UI on `HutangDetailScreen.tsx`.
  - **Task 3.7:** Admin hard-delete UI on `UserDetailScreen.tsx` (alongside the existing soft-delete).
  - Phase 3's final whole-branch review (opus model) and `finishing-a-development-branch` integration.
  - The plan's final "Delivery & rollout" section: `pnpm run compile && pnpm run lint && pnpm test` gate, then `pnpm ota:publish --message "v1.0.1 — feedback polish round 2"` on channel `preview` — this is a live production deploy to Mom's app and should not be run without explicit user confirmation, consistent with how every other live/shared-state action has been handled this session.

### 3. ARCHITECTURE & TECHNICAL MAP

- **Tech stack:** Expo SDK 55 (dev-client), React Native 0.83, Ignite (React Navigation — explicitly **not** Expo Router), TypeScript strict mode, Supabase (`@supabase/supabase-js` v2), EAS Build (APK), Expo Updates (OTA).
- **Key data structures, tables, files:**
  - `apps/lavender-ops-mobile/app/screens/` — all screen components.
  - `apps/lavender-ops-mobile/app/components/form/` — shared form primitives, including the new `PhotoViewer.tsx` (Phase 2).
  - `apps/lavender-ops-mobile/app/services/rentals/index.ts` — the main connector layer; now also holds the 4 `hardDelete*` functions (Task 3.3) and `collectRentalPhotoPaths`/`collectUserPhotoPaths` private helpers.
  - `apps/lavender-ops-mobile/app/services/photos/storage.ts` — photo storage helpers (`uploadPhoto`, `signPaths`, and the new `removePaths`).
  - `apps/lavender-ops-mobile/supabase/migrations/` — SQL migrations, now through `0016_admin_hard_delete.sql`.
  - `docs/02-demo-development.md` — connector-contract rules (§3) and rental math (§6).
  - `docs/superpowers/plans/2026-07-02-v1-0-1-plan.md` — the full, task-by-task v1.0.1 implementation plan (source of truth; also mirrored at `C:\Users\ferna\.claude\plans\implement-the-v1-0-1-release-ethereal-zephyr.md`).
  - `.superpowers/sdd/progress.md` — durable, main-checkout-rooted ledger of every completed task, its commit range, review verdict, and any deviations. **Read this first** to know exactly what's done.
  - `.superpowers/sdd/task-X.Y-brief.md` / `task-X.Y-report.md` — per-task briefs (generated from the plan) and implementer reports, also main-checkout-rooted.
- **How the admin hard-delete system works end-to-end (Phase 3's core logic):**
  1. UI (once 3.5–3.7 are built) will show a destructive "Hapus … Permanen" button, visible only when `isAdmin` (`role === "admin"` from `useSession`).
  2. On confirm, the UI calls a connector (`hardDeleteRental`/`hardDeleteHutang`/`hardDeleteUser`/`hardDeleteVehicle`) from `app/services/rentals/index.ts`.
  3. For rental/user deletes, the connector first **reads the row's owned photo paths** (from `kondisi_keluar`/`kondisi_kembali` JSONB for rentals, or `ktp_photo`/`ktm_photo`/`profil_photo` for users) — this must happen **before** the RPC call, because the row won't exist to query afterward.
  4. The connector then calls the matching Postgres RPC (`rpc_admin_delete_*`) via `supabase.rpc(...)`.
  5. Each RPC is `SECURITY DEFINER`, gated by `auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin')` — the sole authorization boundary, mirroring the existing gate pattern from `0014_payment_edit_delete.sql`.
  6. Rental/hutang RPCs cascade-delete owned children in explicit child-before-parent order (no `ON DELETE CASCADE` exists anywhere in the schema); an ACTIVE rental's vehicle is released to `TERSEDIA`. User/vehicle RPCs instead **block** (raise an exception) if still referenced by any rental/hutang, surfaced to the UI as `"Tidak bisa dihapus: masih ada rental/hutang terkait"`.
  7. If the RPC succeeds, the connector then does **best-effort** photo cleanup (`removePaths(paths).catch(() => {})`) — a storage failure must never fail the delete (an orphaned file is tolerable; a stuck row is not). If the RPC itself errors, the connector rethrows and skips photo cleanup entirely.
- **Naming/testing conventions established this session:**
  - Jest mock variables referenced inside a `jest.mock()` factory closure **must** be `mock`-prefixed (`babel-plugin-jest-hoist` requirement) — this has bitten every TDD task in Phase 3 so far (`mockRemove`, `mockRpc`, `mockRemovePaths`, and an unanticipated `mockNextRow`). Check any new task brief's test code for this before dispatching an implementer.
  - Model tiering used throughout: haiku for cheap/mechanical work, sonnet for standard judgment/multi-file tasks (used for most Phase 3 implementer + reviewer dispatches), opus for architecture-level or high-risk review (used only for Task 3.1's SQL review, given `SECURITY DEFINER` risk).
- **External dependencies:** Supabase (Postgres + Auth + Storage), EAS Build/Update, `react-native-gesture-handler` + `react-native-reanimated`/`react-native-worklets` (already installed, used by Phase 2's `PhotoViewer`).

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

- **What was worked on in this session** (this session picked up mid-Phase-3, after a context compaction):
  1. Retried and completed the Task 3.2 (`removePaths`) task-reviewer dispatch, which had failed earlier due to transient model unavailability. Approved, no blocking issues. One inherited (not implementer-introduced) minor gap noted: no explicit error-throw-path test.
  2. Generated Task 3.3's brief from the plan, proactively warned the implementer in advance about the Jest mock-hoisting naming constraint (based on Task 3.2's discovery) — instructed renaming `rpcMock`→`mockRpc`, `removePathsMock`→`mockRemovePaths` before starting.
  3. Dispatched and completed Task 3.3 (four `hardDelete*` connectors, TDD). The implementer also discovered and correctly fixed a **third, unanticipated** instance of the same hoisting issue (`nextRow`→`mockNextRow`, a state variable referenced inside a `jest.mock()` factory closure that the pre-emptive warning hadn't covered).
  4. Dispatched and completed the Task 3.3 review (sonnet). Approved — cross-checked all four `supabase.rpc(...)` calls' function names and parameter keys character-for-character against `0016_admin_hard_delete.sql` and confirmed exact matches. Verified the collect-photos-before-RPC ordering, best-effort cleanup semantics, and that `hardDeleteHutang`/`hardDeleteVehicle` never reference `removePaths`.
  5. Updated `.superpowers/sdd/progress.md` after both tasks.
  6. **User then asked to merge the Phase 3 worktree into master early**, before Tasks 3.5–3.7, specifically to get migration 0016 into the main checkout so they could apply it via the Supabase CLI themselves. Verified both the main checkout and the worktree were clean and that master was exactly at the worktree's branch point (`dab8e41`), then did a clean fast-forward merge to `a7d34f1`. Ran the full test suite on master afterward to confirm no regressions (19/19, 78/78, green). Recorded this explicitly in the ledger as an "EARLY MERGE" deviation from the established one-merge-per-full-phase pattern used in Phases 1 and 2, with the rationale (user-directed, low-risk since it's purely additive DB functions + connector functions with nothing UI-wired yet).
  7. User applied migration 0016 to the live Supabase project via CLI and pasted back `npx supabase migration list` output (0016 shows local=remote match) plus two SQL query results confirming all 4 RPC functions exist with correct `SECURITY DEFINER`/`search_path`/grants.
  8. Attempted to independently verify via the Supabase MCP — the OAuth authorize URL returned `"Unrecognized client_id"`. Abandoned this path; the user redirected to terminal-based verification instead, which had already succeeded.
  9. Asked the user (via `AskUserQuestion`) whether to also run Task 3.4's remaining **behavioral** verification (auth-gate rejection, rental cascade, block-if-referenced) against disposable test rows — user said yes, wanted the test SQL handed to them to run themselves (not via MCP).
  10. Wrote a comprehensive SQL verification script (v1) covering all of Task 3.4's Steps 2–4, using disposable rows tagged `TEST_TASK34`, with self-cleanup and a final zero-row sweep. Cross-checked the script against the actual schema (`0003_tables.sql`), enums (`0001_enums.sql`), and the `hutang` status-recompute trigger (`0004_triggers.sql`) to avoid constraint violations (e.g. discovered `rentals.paket_jam` has a `CHECK (paket_jam IN (0,6,12))` constraint — not a free-form hours value).
  11. User ran the script's `SELECT auth.uid()` sanity-check line and got `NULL` instead of the spoofed UID — revealing that the v1 script's session-level `set_config(..., false)` impersonation did not survive across separate statement round-trips. Diagnosed this as almost certainly Supabase's pooled connection string (PgBouncer transaction-mode pooling), which does not guarantee the same physical backend serves consecutive statements.
  12. **Rewrote the script (v2)** — the current, active version — to fix this by making impersonation and the RPC-under-test call happen **atomically inside a single PL/pgSQL function call** (`_test34_call(uid, sql)`, backed by `_test34_admin_uid()`), so the fix is immune to connection pooling regardless of how the client batches statements. Each test now returns a plain text result row (`impersonated=<uid> | OK (no error raised)` or `... | ERROR: <message>`) visible in any SQL client. This script is saved at:
     `C:\Users\ferna\AppData\Local\Temp\claude\C--Users-ferna-dev-personal-projects-lavender-app\978c5cbe-b6b9-495c-aa3f-fa18ce1e2d49\scratchpad\task-3.4-behavioral-verification.sql`
     — **note this is a session-scoped scratchpad temp path that may not survive into a new session/conversation.** If a fresh AI instance cannot read this file, it must regenerate the script from scratch using the same design (atomic impersonation+call pattern) rather than assuming the file is still there.
  13. The user then invoked `/handoff-prompt`, which produced this document, before running the v2 script.

- **Decisions made and why:**
  - **Early Phase 3 merge** (see item 6 above) — user-directed, deliberately deviates from the Phase 1/2 pattern of one merge at full phase completion, justified as low-risk because it's purely additive (new SQL functions + new connector functions, nothing wired into the UI or existing behavior).
  - **Vehicle hard-delete ships as RPC + connector only, no UI** — decided earlier in the session (before this document's visible history), because no vehicle detail/edit screen exists in the app (`KendaraanScreen.tsx` is a placeholder stub). User explicitly confirmed this scope decision.
  - **Behavioral verification test design (atomic function-call pattern)** — chosen over session-level `SET`/`set_config` after directly observing it fail in this environment; chosen over silently-swallowing `DO` blocks with `RAISE NOTICE` because NOTICE output isn't guaranteed to surface in every SQL client (e.g. some web-based SQL editors), whereas a `SELECT`-returned text value is guaranteed visible everywhere.

- **What was discussed but NOT yet implemented:** Tasks 3.5, 3.6, 3.7 (the admin-only delete UI on the three detail screens) — plan text exists (in the full plan doc) but no briefs have been extracted yet, no implementer dispatched.

- **Open threads / unresolved questions:**
  - **Immediate:** the user has not yet run the v2 behavioral verification script or reported results. This is the very next thing expected to happen.
  - Once Task 3.4 is fully confirmed (both structural and behavioral), the ledger needs one more update recording it as complete, and then Task 3.5's brief should be extracted and its implementer dispatched — continuing on the still-alive `feat/v1-0-1-phase-3` worktree.

### 5. WHAT COULD GO WRONG

- **Known issues:**
  - Supabase MCP OAuth is broken for this project (`"Unrecognized client_id"`) — do not retry it; use the Supabase CLI or SQL editor instead for any future Supabase interaction that would otherwise use the MCP.
  - Session-level Postgres settings (`SET`, `set_config(..., false)`) are **not reliable** across separate statement executions against this project's connection setup — almost certainly PgBouncer transaction-mode pooling. Any future ad hoc SQL needing `auth.uid()` impersonation (or any other session-scoped state) must use the single-atomic-function-call pattern established in the v2 script, not multi-statement session state.
  - Windows CRLF/`core.autocrlf=true` makes a bare repo-wide `pnpm run lint` report a huge (100s–1000s) pre-existing error count across files nobody touched — purely cosmetic to the working tree (git normalizes back to LF on commit regardless), not a real regression. Verify lint cleanliness on specific changed files (`npx eslint <files>`) instead of trusting the raw repo-wide count.

- **Edge cases to watch for:**
  - The `hutang` status-recompute trigger (`trg_recompute_hutang_status`, `0004_triggers.sql`) fires on every payment `INSERT/UPDATE/DELETE`, including during the cascade-delete RPCs' own `DELETE FROM payments` calls. This causes a harmless redundant `UPDATE hutang SET status = ...` on a hutang row that's about to be deleted anyway seconds later in the same function — already reviewed and accepted as harmless (Task 3.1's review), not a bug, do not "fix" it.
  - `rentals.paket_jam` has `CHECK (paket_jam IN (0, 6, 12))` — any test fixture or new code inserting/generating a rental row must respect this (0 = no extra hour-block, used for whole-day rentals via `paket_hari`).
  - `payments` has a `CHECK` constraint requiring **exactly one** of `rental_id`/`hutang_id` to be non-null (XOR) — relevant to any future connector or test-fixture work touching payments.

- **Technical debt or shortcuts taken:**
  - Task 3.2's `removePaths` has no test for the error-throw path (`.remove()` returning a Postgres/Storage error) — inherited from the plan's own brief, flagged by the reviewer as a non-blocking gap, not fixed.
  - The photo-path collector helpers (`collectRentalPhotoPaths`/`collectUserPhotoPaths` in `index.ts`) discard the `error` from `maybeSingle()`, silently returning `[]` on a query failure exactly the same as a genuine "row not found" — flagged by Task 3.3's reviewer as a Minor forward-looking hardening note (e.g. add a `console.warn`), not fixed, consistent with the design's stated "an orphaned file is tolerable" philosophy.

- **Assumptions being made that could be wrong (flag for validation):**
  - That `.worktrees/feat-v1-0-1-phase-3` (branch `feat/v1-0-1-phase-3`) is still present and still sitting at commit `a7d34f1` — **run `git worktree list` and `git log --oneline -3` in it to confirm** before continuing Phase 3 work there, since time may have passed.
  - That the scratchpad SQL script path referenced in Section 4 is still readable — it lives under a session-specific temp directory (`...\978c5cbe-b6b9-495c-aa3f-fa18ce1e2d49\scratchpad\...`) tied to the *previous* conversation's session ID, and may not exist in a fresh session's filesystem view. **Check before assuming it's there; regenerate from this document's description if not.**
  - That the user has not yet run the v2 SQL script — if a new session starts and the user says "I ran it" or pastes results, treat that as the actual next input, not this document's stale "not yet run" state.

### 6. HOW TO THINK ABOUT THIS PROJECT

1. **Core architectural pattern:** A strict connector-contract boundary (`docs/02` §3) separates UI (camelCase, async-only, never sees raw rows) from Postgres (snake_case rows, RLS, and `SECURITY DEFINER` RPCs for anything privilege-sensitive). It was chosen originally so the demo's in-memory mock data layer could be swapped for real Supabase calls without touching a single screen component — and it's now paying off again in Phase 3, where a genuinely dangerous capability (permanent cross-table cascading delete) is implemented as a small number of individually-reviewable SQL functions behind one narrow, auditable authorization check, rather than as scattered privilege logic across the JS/UI layer.
2. **Most common mistake a new person would make:** Either (a) changing a connector function's signature because it "would be cleaner," not realizing every screen calling it is a hard dependency on that exact signature, or (b) — specific to this exact moment in the project — assuming Postgres session state (`SET`, `set_config` without atomic scoping) persists across separate SQL statements sent to this Supabase project, when it demonstrably does not in this session's testing.
3. **What looks refactor-worthy but should NOT be touched:** The four `rpc_admin_delete_*` functions in `0016_admin_hard_delete.sql` look repetitive — each repeats the same `IF auth.uid() != (SELECT user_id FROM app_config WHERE role = 'admin') THEN RAISE EXCEPTION 'unauthorized'; END IF;` boilerplate. Do not consolidate them into one parameterized/dynamic function. They were deliberately kept as separate, individually-`GRANT`-able, individually-reviewed functions — each with genuinely different cascade-vs-block semantics per entity — and this exact shape already passed an opus-tier security review specifically because of its simplicity and auditability. Any consolidation would require a fresh security review before it could ship.

### 7. DO NOT TOUCH LIST

- Do not refactor stable, working systems (e.g. the connector layer, the trigger-based hutang status recompute) without being asked.
- Do not redesign architecture unless explicitly instructed.
- Preserve existing naming conventions (camelCase UI types, snake_case DB columns, `rpc_admin_delete_*` / `hardDelete*` naming pairs).
- Maintain previously chosen tradeoffs — they were chosen for reasons documented in Section 4/6 above.
- Ask before introducing new frameworks, libraries, or dependencies.
- **Do not edit `0016_admin_hard_delete.sql` (or any already-applied migration)** — it is live on production Supabase and already reviewed. Any fix must be a new migration file (`0017_...` onward), never an edit to an applied one.
- **Do not retry the Supabase MCP OAuth flow** for this project — confirmed broken (`"Unrecognized client_id"`); use the CLI or SQL editor instead.
- **Do not create `node_modules` junctions across git worktrees** — this caused a real data-loss near-miss earlier in the project's history (recovered, but the practice is permanently banned). Always do a real, standalone install per worktree.
- **Do not skip the task-reviewer step** for Tasks 3.5–3.7 or any future task — every task in this subagent-driven-development workflow gets a fresh implementer, then a fresh reviewer, before proceeding, per the established one-task-at-a-time discipline.
- **Do not run `pnpm ota:publish`** (or any other live/production/shared-state action — e.g. re-merging to master, force-pushing, applying another migration) **without explicit user confirmation first.**

### 8. CONFIDENCE & FRESHNESS

- Section 1 (Project Identity): ✅ HIGH — read directly from `CLAUDE.md` this session.
- Section 2 (What exists): ✅ HIGH for Phases 1–3-data-layer (verified via `git log`, test runs, and the ledger this session); ⚠️ MEDIUM for the "3.5–3.7 fully unstarted" claim (inferred from the ledger's absence of entries, not independently re-grepped for stray partial work at the moment of writing).
- Section 3 (Architecture): ✅ HIGH — read directly from `CLAUDE.md` and the actual migration/schema files this session.
- Section 4 (Recent work): ✅ HIGH — this is a direct account of this session's own actions.
- Section 5 (What could go wrong): ✅ HIGH for the pooling/hoisting/lint issues (all directly observed and diagnosed this session); ⚠️ MEDIUM for the "worktree still present" and "scratchpad file still readable" assumptions — explicitly flagged as needing re-verification, not confirmed at time of writing.
- Section 6 (How to think about it): ⚠️ MEDIUM-HIGH — reasoned synthesis consistent with documented reviewer verdicts and the user's own stated decisions, but phrased as this session's interpretation, not a verbatim user quote.
