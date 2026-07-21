-- ROLLBACK_restore_rpc_grants.sql
-- EMERGENCY FORWARD-ROLLBACK for 20260720103317_rpc_auth_gate_hardening.sql
--
-- Authored calmly, ahead of the push, per PM's "blocking precondition" in
-- docs/reports/v1-0-3.md — NOT written at 11pm during an outage.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ WHY THIS FILE IS NOT IN supabase/migrations/ (read this before moving it)
-- ═══════════════════════════════════════════════════════════════════════════
-- `npx supabase db push` applies every migration file present in
-- supabase/migrations/ that is not yet recorded in the remote
-- schema_migrations history — ALL of them, in one shot, in order. There is no
-- flag to push a single named migration and skip another that is also
-- pending (confirmed via `npx supabase db push --help`: `--include-all` only
-- broadens what counts as "pending", it does not narrow it).
--
-- If this file lived in supabase/migrations/ as a normal timestamped
-- migration sitting right after the hardening migration, the very `db push`
-- meant to SHIP the hardening migration would apply this rollback in the same
-- breath — silently re-opening the hole the instant it closes, with no
-- observation window in between. That defeats the entire purpose of having a
-- rollback ready "in reserve".
--
-- Keeping this file here (a plain .sql file, sibling to migrations/, same
-- place seed.sql already lives per CLAUDE.md) means it is applied ONLY by a
-- deliberate, separate action — never swept up by the next ordinary db push.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHEN TO USE THIS
-- ═══════════════════════════════════════════════════════════════════════════
-- Immediately after pushing 20260720103317_rpc_auth_gate_hardening.sql, if the
-- release plan's mandatory live positive-path smoke test (create rental ·
-- close rental · add/edit/delete payment · load dashboard, run as Mom's own
-- account, not admin) fails — i.e. Mom (or Farrel testing as Mom) is locked
-- out of something she could do before this migration.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THIS DOES
-- ═══════════════════════════════════════════════════════════════════════════
-- Re-GRANTs EXECUTE to PUBLIC on NINE of the ten functions the hardening
-- migration revoked it from. PUBLIC covers every role, including anon and
-- authenticated, so this is the single blunt lever guaranteed to restore Mom's
-- access regardless of which specific narrower grant turned out to be wrong
-- (e.g. a typo'd argument-type signature on the `GRANT ... TO authenticated`
-- step).
--
-- ⚠️ The tenth, recompute_rental_hutang, is deliberately left closed — its GRANT
-- line below is commented out. See "WHAT THIS DOES **NOT** DO" for why, and do
-- not uncomment it reflexively.
--
-- For those nine, this restores the EXACT reachability they had before this
-- release: NONE of the ten carried a REVOKE anywhere in project history — PUBLIC's
-- default EXECUTE grant was their only protection, which in practice was none
-- (see F-2 in docs/reports/v1-0-3.md). Six of them (rpc_update_payment,
-- rpc_delete_payment, and the four rpc_admin_delete_*) additionally carried an
-- explicit `GRANT ... TO authenticated`, which the hardening migration keeps and
-- which this script does not disturb.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THIS DOES **NOT** DO
-- ═══════════════════════════════════════════════════════════════════════════
-- It does NOT revert the NULL-safe guard-line rewrites, or any other body
-- change, from the hardening migration — every CREATE OR REPLACE body stays
-- exactly as hardened. Re-opening PUBLIC only changes who is ALLOWED to call
-- the function; it does not change what the function's own logic decides once
-- called.
--
-- Concretely: if the outage is caused by an over-broad REVOKE (Mom's
-- `authenticated` role lost EXECUTE it should still have), this script fixes
-- it completely. If the outage is instead caused by a polarity bug in one of
-- the `IS NOT TRUE` guard rewrites (e.g. a guard that now always raises,
-- rejecting Mom too), this script will NOT fix it — restoring PUBLIC does not
-- change what the guard decides once execution reaches it. That failure mode
-- needs a further forward migration correcting the guard logic itself, not
-- this rollback.
--
-- It also does NOT re-open recompute_rental_hutang. That is a deliberate
-- exception to "restore exactly the prior state", decided 2026-07-21:
--
--   • It is the sharpest function in the set. SECURITY DEFINER, and it rewrites
--     hutang.jumlah_awal and hutang.status directly — a direct write path into
--     customer debt.
--   • It has NO client caller anywhere in the app (verified by grep; see the
--     hardening migration's own header), so it CANNOT be the cause of an app
--     outage. Re-opening it could not fix one.
--   • An operator running this file under pressure runs it whole. Leaving that
--     GRANT live would hand `anon` that write path as a silent side effect of
--     restoring Mom's access.
--
-- If you have a specific, articulated reason to re-open it, uncomment its GRANT
-- line below. "The rollback didn't fully work" is not such a reason — check the
-- guard-polarity failure mode described above first.
--
-- ⚠️ SCOPE GAP: this script covers only the functions the HARDENING migration
-- touched. It does NOT cover rpc_update_rental, which 20260720073455 revoked from
-- PUBLIC in the same release. If the smoke test shows Mom locked out of EDITING an
-- active rental specifically (v1.0.3's headline feature) while create / close /
-- payment / dashboard all still work, this file will not fix it — add
-- `GRANT EXECUTE ON FUNCTION rpc_update_rental(uuid, jsonb) TO PUBLIC;` manually.
-- Left out by default because that path is new in v1.0.3: losing it degrades a new
-- feature, it does not take away anything Mom could do before, so it is not an
-- outage in the sense this script exists for.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- HOW TO APPLY, IF NEEDED
-- ═══════════════════════════════════════════════════════════════════════════
-- Run directly against the linked project (bypasses the migration tracker
-- entirely, on purpose — this is emergency-response SQL, not a tracked schema
-- change):
--
--   cd apps/lavender-ops-mobile
--   npx supabase db query --linked -f supabase/ROLLBACK_restore_rpc_grants.sql
--
-- If you want this recorded in schema_migrations history afterwards (e.g. to
-- keep `migration list` truthful about what state the live DB is actually in),
-- copy this file's GRANT statements into a freshly timestamped file under
-- supabase/migrations/ (`npx supabase migration new restore_rpc_grants`) AFTER
-- applying it here, and use `npx supabase migration repair --status applied
-- <version>` to record it without re-running the SQL — per CLAUDE.md's
-- "Database Migrations" rule, `repair` only for a migration you have confirmed
-- is already applied.
-- ═══════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION rpc_get_dashboard_summary()        TO PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_create_rental(jsonb)            TO PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_close_rental(uuid, jsonb)       TO PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_update_payment(uuid, jsonb)     TO PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_delete_payment(uuid)            TO PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_admin_delete_rental(uuid)       TO PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_admin_delete_hutang(uuid)       TO PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_admin_delete_user(uuid)         TO PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_admin_delete_vehicle(uuid)      TO PUBLIC;
-- ⚠️ DELIBERATELY COMMENTED OUT — uncomment only with a specific reason.
-- recompute_rental_hutang is the sharpest item in this set: SECURITY DEFINER, it
-- rewrites hutang.jumlah_awal and hutang.status directly. It has NO client caller
-- anywhere in the app (verified by grep — see the hardening migration's header), so
-- re-opening it cannot be the fix for an app outage. An operator running this file
-- under pressure runs it whole; leaving this line live would hand `anon` a direct
-- write path into customer debt as a side effect of restoring Mom's access.
-- GRANT EXECUTE ON FUNCTION recompute_rental_hutang(uuid)       TO PUBLIC;

-- Sanity check after running: the first NINE rows should show anon_exec = true
-- (i.e. we are back to fully open — this is a rollback, not a fix).
--
-- `recompute_rental_hutang` is EXPECTED to read false — its GRANT above is
-- deliberately commented out. A false there is this file working as intended, NOT
-- a failed rollback. It has no client caller, so it cannot be causing an outage.
SELECT
  'rpc_get_dashboard_summary' AS fn, has_function_privilege('anon', 'rpc_get_dashboard_summary()', 'EXECUTE') AS anon_exec
UNION ALL SELECT 'rpc_create_rental', has_function_privilege('anon', 'rpc_create_rental(jsonb)', 'EXECUTE')
UNION ALL SELECT 'rpc_close_rental', has_function_privilege('anon', 'rpc_close_rental(uuid, jsonb)', 'EXECUTE')
UNION ALL SELECT 'rpc_update_payment', has_function_privilege('anon', 'rpc_update_payment(uuid, jsonb)', 'EXECUTE')
UNION ALL SELECT 'rpc_delete_payment', has_function_privilege('anon', 'rpc_delete_payment(uuid)', 'EXECUTE')
UNION ALL SELECT 'rpc_admin_delete_rental', has_function_privilege('anon', 'rpc_admin_delete_rental(uuid)', 'EXECUTE')
UNION ALL SELECT 'rpc_admin_delete_hutang', has_function_privilege('anon', 'rpc_admin_delete_hutang(uuid)', 'EXECUTE')
UNION ALL SELECT 'rpc_admin_delete_user', has_function_privilege('anon', 'rpc_admin_delete_user(uuid)', 'EXECUTE')
UNION ALL SELECT 'rpc_admin_delete_vehicle', has_function_privilege('anon', 'rpc_admin_delete_vehicle(uuid)', 'EXECUTE')
UNION ALL SELECT 'recompute_rental_hutang', has_function_privilege('anon', 'recompute_rental_hutang(uuid)', 'EXECUTE');
