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
-- Re-GRANTs EXECUTE to PUBLIC on the ten functions the hardening migration
-- revoked it from. PUBLIC covers every role, including anon and authenticated,
-- so this is the single blunt lever guaranteed to restore Mom's access
-- regardless of which specific narrower grant turned out to be wrong (e.g. a
-- typo'd argument-type signature on the `GRANT ... TO authenticated` step).
--
-- This restores the EXACT reachability all ten functions had before this
-- release: nine of them (everything except rpc_update_payment,
-- rpc_delete_payment, and the four rpc_admin_delete_* — which did carry an
-- explicit `GRANT ... TO authenticated`) had NO REVOKE statement in their
-- history at all, ever — PUBLIC's default EXECUTE grant was their only
-- protection, which in practice was none (see F-2 in
-- docs/reports/v1-0-3.md). Re-granting PUBLIC puts all ten back in that same
-- state.
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
-- It also does not touch recompute_rental_hutang's DECISION to be fully
-- closed (REVOKE ... FROM PUBLIC, anon, authenticated, no GRANT at all) —
-- this script re-opens it to PUBLIC same as the other nine, on the reasoning
-- that "restore exactly the prior state" should not quietly leave one function
-- more closed than before if this script is ever run. If recompute_rental_hutang
-- specifically is the suspected cause of an outage, note that it has NO client
-- caller anywhere in the app (verified by grep, see the hardening migration's
-- own header) — re-opening it is very unlikely to be the fix needed.
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
GRANT EXECUTE ON FUNCTION recompute_rental_hutang(uuid)       TO PUBLIC;

-- Sanity check after running: every row below should show anon_exec = true
-- (i.e. we are back to fully open — this is a rollback, not a fix).
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
