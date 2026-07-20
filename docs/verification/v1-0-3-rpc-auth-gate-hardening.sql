-- ============================================================================
-- v1.0.3 scope addition — Behavioral Verification: rpc_auth_gate_hardening
-- (apps/lavender-ops-mobile/supabase/migrations/20260720103317_rpc_auth_gate_hardening.sql)
--
-- STATUS: AUTHORED, NOT YET RUN. The hardening migration has been authored
-- but has NOT been pushed to the linked project (tuufzjxoprjsrrkagncz) —
-- `npx supabase db push` is a separate, explicitly-approved step, gated by
-- Farrel. Every assertion below that checks a REVOKE/GRANT state will FAIL if
-- run against the remote today, because the remote still carries the
-- pre-hardening grants. Run this script section by section IMMEDIATELY AFTER
-- the push, and record results here, per the release gate ordering PM fixed
-- in docs/reports/v1-0-3.md ("there is no arrangement in which the push is
-- the last step"): enumeration + body-invariance + math review → PUSH →
-- privilege + NULL-auth + live smoke.
--
-- Covers the two gates docs/reports/v1-0-3.md specifies for this migration:
--   • Privilege gate — has_function_privilege('anon', …) = false AND
--     ('authenticated', …) = true, for every in-scope function. BOTH halves;
--     the authenticated=true half is the anti-over-REVOKE check (the exact
--     omission that made the rpc_update_rental script's original Section K
--     pass vacuously — see v1-0-3-rpc-update-rental.sql Section K2's own
--     history).
--   • NULL-auth gate — an unauthenticated call raises the EXACT expected
--     error, not "an error appeared". `_testh_call_unauth`'s
--     `EXCEPTION WHEN OTHERS` stringifies ANY failure (a typo'd fixture id,
--     a dropped function, a constraint violation), so only an exact message
--     match is a pass.
-- Also includes a "positive-path smoke" section per function/branch — this is
-- NOT one of PM's two release gates (that is the separate, human, live-APK
-- smoke test as Mom's account), but a cheap SQL-level proof that the
-- authorized case of every rewritten guard still succeeds. This is the direct
-- proof against the "watch the polarity" risk: an `IS NOT TRUE` conversion
-- applied backwards would make a guard that never fired now ALWAYS fire —
-- which would show up here as a legitimate ops/admin call unexpectedly
-- raising 'unauthorized'.
--
-- Uses the same pooled-connection-safe pattern as task-3.4 /
-- v1-0-3-rpc-update-rental.sql (impersonation and the call-under-test happen
-- atomically inside one plpgsql function, because session-level set_config
-- does not survive across separate statement round-trips on this project —
-- see docs/verification/README.md). Helper prefix here is `_testh_` (distinct
-- from `_test103_`/`_test34_`) purely to avoid any name confusion while
-- reading two scripts side by side; there is no functional collision risk
-- either way since the other scripts already drop their own helpers.
--
-- All fixtures are tagged TEST_V103H (distinct from TEST_V103, which the
-- sibling rpc_update_rental script uses) so they are easy to find and Section
-- Z sweeps them all up.
-- ============================================================================


-- ── Section 0: helpers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _testh_uid(p_role text) RETURNS text AS $$
  SELECT user_id::text FROM app_config WHERE role = p_role;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION _testh_call(p_uid text, p_sql text) RETURNS text AS $$
DECLARE
  v_check_uid text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  v_check_uid := auth.uid()::text;
  EXECUTE p_sql;
  RETURN format('impersonated=%s | OK (no error raised)', v_check_uid);
EXCEPTION WHEN OTHERS THEN
  RETURN format('impersonated=%s | ERROR: %s', v_check_uid, SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Sanity check: impersonated should show the spoofed UUID below, not NULL.
SELECT _testh_call('99999999-9999-4999-8999-999999999999', 'SELECT 1');

-- Clears all JWT claims so auth.uid() resolves to NULL — simulating an
-- anon-key caller with no session at all.
CREATE OR REPLACE FUNCTION _testh_call_unauth(p_sql text) RETURNS text AS $$
DECLARE
  v_check_uid text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  v_check_uid := auth.uid()::text;
  EXECUTE p_sql;
  RETURN format('impersonated=%s | OK (no error raised)', COALESCE(v_check_uid, 'NULL'));
EXCEPTION WHEN OTHERS THEN
  RETURN format('impersonated=%s | ERROR: %s', COALESCE(v_check_uid, 'NULL'), SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Sanity check: impersonated must show NULL. ⚠️ Read literally — the "OK"
-- half is the discriminator, not the "NULL" half (see v1-0-3-rpc-update-rental.sql
-- Section K's comment for why "impersonated=NULL | ERROR: ..." can look
-- superficially similar to a pass while actually being a different failure).
SELECT _testh_call_unauth('SELECT 1');


-- ── Section A: fixtures ────────────────────────────────────────────────────
-- U1/V1 host the "live" fixtures (rentals + payments that get positively
-- exercised in Section D). U2/V2/H-DEL/R-DEL/V3 are disposable, dedicated to
-- the four admin_delete_* smoke tests so those tests' own DELETEs don't
-- interact with anything else being asserted on.

INSERT INTO users (id, name, phone, is_mahasiswa, notes) VALUES
  ('aaaaaaaa-0103-4900-8000-000000000001', 'TEST_V103H User1', '0800001031', true, 'TEST_V103H disposable'),
  ('aaaaaaaa-0103-4900-8000-000000000002', 'TEST_V103H User2 (for admin_delete_user)', '0800001032', true, 'TEST_V103H disposable');

INSERT INTO vehicles (id, name, plate, category, rate_6h, rate_12h, rate_24h, status, notes) VALUES
  ('bbbbbbbb-0103-4900-8000-000000000001', 'TEST_V103H Vehicle1', 'TESTV103H1', 'MOTOR', 15000, 25000, 40000, 'DISEWA', 'TEST_V103H disposable'),
  ('bbbbbbbb-0103-4900-8000-000000000002', 'TEST_V103H Vehicle2 (for admin_delete_vehicle)', 'TESTV103H2', 'MOTOR', 15000, 25000, 40000, 'TERSEDIA', 'TEST_V103H disposable'),
  ('bbbbbbbb-0103-4900-8000-000000000003', 'TEST_V103H Vehicle3 (for admin_delete_rental)', 'TESTV103H3', 'MOTOR', 15000, 25000, 40000, 'DISEWA', 'TEST_V103H disposable');

-- R-ACTIVE: closed in Section D (rpc_close_rental positive smoke).
INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status, paket_hari, paket_jam, tarif, notes) VALUES
  ('cccccccc-0103-4900-8000-000000000001',
   'aaaaaaaa-0103-4900-8000-000000000001', 'bbbbbbbb-0103-4900-8000-000000000001',
   now(), now() + interval '1 day', 'ACTIVE', 1, 0, 40000, 'TEST_V103H disposable — R-ACTIVE');

-- R-ACTIVE-PAY: hosts P-ACTIVE (update_payment ACTIVE-branch) and
-- P-DELETE-ACTIVE (delete_payment smoke). Stays ACTIVE throughout.
INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status, paket_hari, paket_jam, tarif, notes) VALUES
  ('cccccccc-0103-4900-8000-000000000002',
   'aaaaaaaa-0103-4900-8000-000000000001', 'bbbbbbbb-0103-4900-8000-000000000001',
   now(), now() + interval '1 day', 'ACTIVE', 1, 0, 40000, 'TEST_V103H disposable — R-ACTIVE-PAY');

-- R-COMPLETED: hosts P-COMPLETED (update_payment COMPLETED-branch, admin only).
INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, returned_at, status, paket_hari, paket_jam, tarif, subtotal_sewa, notes) VALUES
  ('cccccccc-0103-4900-8000-000000000003',
   'aaaaaaaa-0103-4900-8000-000000000001', 'bbbbbbbb-0103-4900-8000-000000000001',
   now() - interval '1 day', now(), now(), 'COMPLETED', 1, 0, 40000, 10000, 'TEST_V103H disposable — R-COMPLETED');

-- R-DEL: dedicated to the admin_delete_rental smoke test (ACTIVE, so the
-- delete also exercises the vehicle-release branch on V3).
INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status, paket_hari, paket_jam, tarif, notes) VALUES
  ('cccccccc-0103-4900-8000-000000000004',
   'aaaaaaaa-0103-4900-8000-000000000001', 'bbbbbbbb-0103-4900-8000-000000000003',
   now(), now() + interval '1 day', 'ACTIVE', 1, 0, 40000, 'TEST_V103H disposable — R-DEL');

INSERT INTO payments (id, rental_id, amount, method, paid_at, notes) VALUES
  ('dddddddd-0103-4900-8000-000000000001', 'cccccccc-0103-4900-8000-000000000002', 10000, 'CASH', now(), 'TEST_V103H disposable — P-ACTIVE'),
  ('dddddddd-0103-4900-8000-000000000002', 'cccccccc-0103-4900-8000-000000000003', 10000, 'CASH', now(), 'TEST_V103H disposable — P-COMPLETED'),
  ('dddddddd-0103-4900-8000-000000000004', 'cccccccc-0103-4900-8000-000000000002', 5000,  'CASH', now(), 'TEST_V103H disposable — P-DELETE-ACTIVE');

INSERT INTO hutang (id, user_id, jumlah_awal, notes) VALUES
  ('eeeeeeee-0103-4900-8000-000000000001', 'aaaaaaaa-0103-4900-8000-000000000001', 20000, 'TEST_V103H disposable — H1 (standalone)'),
  ('eeeeeeee-0103-4900-8000-000000000002', 'aaaaaaaa-0103-4900-8000-000000000001', 5000,  'TEST_V103H disposable — H-DEL (for admin_delete_hutang)');

INSERT INTO payments (id, hutang_id, amount, method, paid_at, notes) VALUES
  ('dddddddd-0103-4900-8000-000000000003', 'eeeeeeee-0103-4900-8000-000000000001', 5000, 'CASH', now(), 'TEST_V103H disposable — P-HUTANG');

-- Confirm fixtures exist: expect 2 users, 3 vehicles, 4 rentals, 4 payments, 2 hutang.
SELECT
  (SELECT count(*) FROM users    WHERE name  LIKE 'TEST_V103H%') AS users,
  (SELECT count(*) FROM vehicles WHERE name  LIKE 'TEST_V103H%') AS vehicles,
  (SELECT count(*) FROM rentals  WHERE notes LIKE 'TEST_V103H%') AS rentals,
  (SELECT count(*) FROM payments WHERE notes LIKE 'TEST_V103H%') AS payments,
  (SELECT count(*) FROM hutang   WHERE notes LIKE 'TEST_V103H%') AS hutang;


-- ── Section B: PRIVILEGE GATE ───────────────────────────────────────────────
-- Expect anon_exec = false and authenticated_exec = true for all nine
-- client-facing functions; recompute_rental_hutang expects BOTH false (fully
-- closed — zero direct client callers, see the hardening migration's own
-- header for the grep evidence).

SELECT 'rpc_get_dashboard_summary' AS fn,
  has_function_privilege('anon', 'rpc_get_dashboard_summary()', 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', 'rpc_get_dashboard_summary()', 'EXECUTE') AS authenticated_exec
UNION ALL SELECT 'rpc_create_rental',
  has_function_privilege('anon', 'rpc_create_rental(jsonb)', 'EXECUTE'),
  has_function_privilege('authenticated', 'rpc_create_rental(jsonb)', 'EXECUTE')
UNION ALL SELECT 'rpc_close_rental',
  has_function_privilege('anon', 'rpc_close_rental(uuid, jsonb)', 'EXECUTE'),
  has_function_privilege('authenticated', 'rpc_close_rental(uuid, jsonb)', 'EXECUTE')
UNION ALL SELECT 'rpc_update_payment',
  has_function_privilege('anon', 'rpc_update_payment(uuid, jsonb)', 'EXECUTE'),
  has_function_privilege('authenticated', 'rpc_update_payment(uuid, jsonb)', 'EXECUTE')
UNION ALL SELECT 'rpc_delete_payment',
  has_function_privilege('anon', 'rpc_delete_payment(uuid)', 'EXECUTE'),
  has_function_privilege('authenticated', 'rpc_delete_payment(uuid)', 'EXECUTE')
UNION ALL SELECT 'rpc_admin_delete_rental',
  has_function_privilege('anon', 'rpc_admin_delete_rental(uuid)', 'EXECUTE'),
  has_function_privilege('authenticated', 'rpc_admin_delete_rental(uuid)', 'EXECUTE')
UNION ALL SELECT 'rpc_admin_delete_hutang',
  has_function_privilege('anon', 'rpc_admin_delete_hutang(uuid)', 'EXECUTE'),
  has_function_privilege('authenticated', 'rpc_admin_delete_hutang(uuid)', 'EXECUTE')
UNION ALL SELECT 'rpc_admin_delete_user',
  has_function_privilege('anon', 'rpc_admin_delete_user(uuid)', 'EXECUTE'),
  has_function_privilege('authenticated', 'rpc_admin_delete_user(uuid)', 'EXECUTE')
UNION ALL SELECT 'rpc_admin_delete_vehicle',
  has_function_privilege('anon', 'rpc_admin_delete_vehicle(uuid)', 'EXECUTE'),
  has_function_privilege('authenticated', 'rpc_admin_delete_vehicle(uuid)', 'EXECUTE')
UNION ALL SELECT 'recompute_rental_hutang (fully closed — expect BOTH false)',
  has_function_privilege('anon', 'recompute_rental_hutang(uuid)', 'EXECUTE'),
  has_function_privilege('authenticated', 'recompute_rental_hutang(uuid)', 'EXECUTE');


-- ── Section C: NULL-AUTH GATE ────────────────────────────────────────────────
-- Every call below uses a real caller-less session (auth.uid() = NULL). Every
-- one must RAISE the exact message 'unauthorized' (Postgres prefixes it with
-- "ERROR: " in SQLERRM) and must NOT mutate anything, since in every function
-- below the auth check runs before any write. Read results literally — see
-- the header comment on _testh_call_unauth above.
--
-- ⚠️ recompute_rental_hutang is intentionally NOT called here. It has no
-- internal auth check at all (nothing to make NULL-safe — see the hardening
-- migration's own Section 10 comment), so calling it directly through this
-- script's elevated connection would simply SUCCEED regardless of identity —
-- that would NOT indicate Fix 2 is broken, it would only demonstrate this
-- script's own connection bypasses grants entirely (same structural caveat as
-- v1-0-3-rpc-update-rental.sql's Section K docstring). recompute_rental_hutang's
-- closure is proved by Section B's privilege check alone.

-- get_dashboard_summary — expect: "... | ERROR: unauthorized"
SELECT _testh_call_unauth($sql$SELECT rpc_get_dashboard_summary()$sql$);

-- create_rental — expect: "... | ERROR: unauthorized"
SELECT _testh_call_unauth($sql$SELECT rpc_create_rental('{}'::jsonb)$sql$);

-- close_rental (against R-ACTIVE — auth check fires before the rental lookup,
-- so this cannot mutate R-ACTIVE even though it's a real id we still need
-- untouched for Section D) — expect: "... | ERROR: unauthorized"
SELECT _testh_call_unauth(
  $sql$SELECT rpc_close_rental('cccccccc-0103-4900-8000-000000000001', '{}'::jsonb)$sql$
);
SELECT status FROM rentals WHERE id = 'cccccccc-0103-4900-8000-000000000001';
-- Expect: still 'ACTIVE' (unauth call did not close it).

-- update_payment — all three guard branches. Expect: "... | ERROR: unauthorized" ×3
SELECT _testh_call_unauth(
  $sql$SELECT rpc_update_payment('dddddddd-0103-4900-8000-000000000001', '{}'::jsonb)$sql$  -- ACTIVE-rental branch (P-ACTIVE)
);
SELECT _testh_call_unauth(
  $sql$SELECT rpc_update_payment('dddddddd-0103-4900-8000-000000000002', '{}'::jsonb)$sql$  -- COMPLETED-rental branch (P-COMPLETED)
);
SELECT _testh_call_unauth(
  $sql$SELECT rpc_update_payment('dddddddd-0103-4900-8000-000000000003', '{}'::jsonb)$sql$  -- hutang branch (P-HUTANG)
);
-- Confirm none of the three payments were mutated (amounts unchanged: 10000/10000/5000).
SELECT id, amount FROM payments WHERE id IN (
  'dddddddd-0103-4900-8000-000000000001',
  'dddddddd-0103-4900-8000-000000000002',
  'dddddddd-0103-4900-8000-000000000003'
) ORDER BY id;

-- delete_payment — all three guard branches (same fixtures; a rejected delete
-- must not soft-delete). Expect: "... | ERROR: unauthorized" ×3
SELECT _testh_call_unauth($sql$SELECT rpc_delete_payment('dddddddd-0103-4900-8000-000000000001')$sql$);
SELECT _testh_call_unauth($sql$SELECT rpc_delete_payment('dddddddd-0103-4900-8000-000000000002')$sql$);
SELECT _testh_call_unauth($sql$SELECT rpc_delete_payment('dddddddd-0103-4900-8000-000000000003')$sql$);
-- Confirm none of the three payments were soft-deleted (deleted_at still NULL).
SELECT id, deleted_at FROM payments WHERE id IN (
  'dddddddd-0103-4900-8000-000000000001',
  'dddddddd-0103-4900-8000-000000000002',
  'dddddddd-0103-4900-8000-000000000003'
) ORDER BY id;

-- admin_delete_rental (R-DEL) — expect: "... | ERROR: unauthorized"
SELECT _testh_call_unauth($sql$SELECT rpc_admin_delete_rental('cccccccc-0103-4900-8000-000000000004')$sql$);
SELECT count(*) AS r_del_still_present FROM rentals WHERE id = 'cccccccc-0103-4900-8000-000000000004';
-- Expect: 1 (not deleted).

-- admin_delete_hutang (H-DEL) — expect: "... | ERROR: unauthorized"
SELECT _testh_call_unauth($sql$SELECT rpc_admin_delete_hutang('eeeeeeee-0103-4900-8000-000000000002')$sql$);
SELECT count(*) AS h_del_still_present FROM hutang WHERE id = 'eeeeeeee-0103-4900-8000-000000000002';
-- Expect: 1 (not deleted).

-- admin_delete_user (U2) — expect: "... | ERROR: unauthorized"
SELECT _testh_call_unauth($sql$SELECT rpc_admin_delete_user('aaaaaaaa-0103-4900-8000-000000000002')$sql$);
SELECT count(*) AS u2_still_present FROM users WHERE id = 'aaaaaaaa-0103-4900-8000-000000000002';
-- Expect: 1 (not deleted).

-- admin_delete_vehicle (V2) — expect: "... | ERROR: unauthorized"
SELECT _testh_call_unauth($sql$SELECT rpc_admin_delete_vehicle('bbbbbbbb-0103-4900-8000-000000000002')$sql$);
SELECT count(*) AS v2_still_present FROM vehicles WHERE id = 'bbbbbbbb-0103-4900-8000-000000000002';
-- Expect: 1 (not deleted).


-- ── Section D: POSITIVE-PATH SMOKE (the polarity check) ────────────────────
-- Every call below is a LEGITIMATE, correctly-authorized caller. Every one
-- MUST say "OK (no error raised)". Any "ERROR: unauthorized" here means a
-- guard rewrite fired backwards — the exact "Mom cannot close rentals or
-- record payments" failure mode this migration must not introduce.

-- get_dashboard_summary, as ops.
SELECT _testh_call(_testh_uid('ops'), $sql$SELECT rpc_get_dashboard_summary()$sql$);

-- create_rental, as ops — mints a brand-new rental (R-NEW), tagged for cleanup.
SELECT _testh_call(
  _testh_uid('ops'),
  $sql$SELECT rpc_create_rental(jsonb_build_object(
    'id', 'cccccccc-0103-4900-8000-00000000000a',
    'userId', 'aaaaaaaa-0103-4900-8000-000000000001',
    'vehicleId', 'bbbbbbbb-0103-4900-8000-000000000001',
    'startAt', now(), 'dueAt', now() + interval '1 day',
    'paketHari', 1, 'paketJam', 0, 'tarif', 40000,
    'notes', 'TEST_V103H disposable — R-NEW (via rpc_create_rental smoke)'
  ))$sql$
);
SELECT count(*) AS r_new_created FROM rentals WHERE id = 'cccccccc-0103-4900-8000-00000000000a';
-- Expect: 1.

-- close_rental, as ops, on R-ACTIVE. (Auto-creates a hutang since no payments
-- were ever linked to R-ACTIVE — expected, swept in Section Z via rental_id.)
SELECT _testh_call(
  _testh_uid('ops'),
  $sql$SELECT rpc_close_rental('cccccccc-0103-4900-8000-000000000001', jsonb_build_object(
    'subtotalSewa', 15000, 'discount', 0,
    'kondisiKembali', jsonb_build_object('bensinKotak', 3, 'km', 500, 'photos', '[]'::jsonb),
    'returnedAt', now(),
    'notes', 'TEST_V103H disposable — R-ACTIVE closed via smoke test',
    'extraFees', '[]'::jsonb, 'newPayments', '[]'::jsonb
  ))$sql$
);
SELECT status FROM rentals WHERE id = 'cccccccc-0103-4900-8000-000000000001';
-- Expect: 'COMPLETED'.

-- update_payment, ACTIVE-rental branch (P-ACTIVE), as ops.
SELECT _testh_call(
  _testh_uid('ops'),
  $sql$SELECT rpc_update_payment('dddddddd-0103-4900-8000-000000000001', jsonb_build_object(
    'amount', 10000, 'method', 'CASH', 'methodDescription', null,
    'paidAt', now(), 'notes', 'TEST_V103H updated by ops smoke (ACTIVE branch)'
  ))$sql$
);

-- update_payment, COMPLETED-rental branch (P-COMPLETED), as admin.
-- amount kept at 10000 (= R-COMPLETED's total_bill) so recompute_rental_hutang's
-- internal PERFORM (still called — its body is untouched) lands on sisa = 0
-- and does not insert a stray hutang for R-COMPLETED.
SELECT _testh_call(
  _testh_uid('admin'),
  $sql$SELECT rpc_update_payment('dddddddd-0103-4900-8000-000000000002', jsonb_build_object(
    'amount', 10000, 'method', 'CASH', 'methodDescription', null,
    'paidAt', now(), 'notes', 'TEST_V103H updated by admin smoke (COMPLETED branch)'
  ))$sql$
);

-- update_payment, hutang branch (P-HUTANG), as ops.
SELECT _testh_call(
  _testh_uid('ops'),
  $sql$SELECT rpc_update_payment('dddddddd-0103-4900-8000-000000000003', jsonb_build_object(
    'amount', 5000, 'method', 'CASH', 'methodDescription', null,
    'paidAt', now(), 'notes', 'TEST_V103H updated by ops smoke (hutang branch)'
  ))$sql$
);

-- Confirm all three update_payment calls above actually said OK (re-read):
SELECT id, amount, notes FROM payments WHERE id IN (
  'dddddddd-0103-4900-8000-000000000001',
  'dddddddd-0103-4900-8000-000000000002',
  'dddddddd-0103-4900-8000-000000000003'
) ORDER BY id;

-- delete_payment, as ops, on the dedicated P-DELETE-ACTIVE.
SELECT _testh_call(
  _testh_uid('ops'),
  $sql$SELECT rpc_delete_payment('dddddddd-0103-4900-8000-000000000004')$sql$
);
SELECT deleted_at IS NOT NULL AS soft_deleted FROM payments WHERE id = 'dddddddd-0103-4900-8000-000000000004';
-- Expect: true.

-- admin_delete_hutang, as admin, on H-DEL.
SELECT _testh_call(_testh_uid('admin'), $sql$SELECT rpc_admin_delete_hutang('eeeeeeee-0103-4900-8000-000000000002')$sql$);
SELECT count(*) AS h_del_left FROM hutang WHERE id = 'eeeeeeee-0103-4900-8000-000000000002';
-- Expect: 0.

-- admin_delete_user, as admin, on U2.
SELECT _testh_call(_testh_uid('admin'), $sql$SELECT rpc_admin_delete_user('aaaaaaaa-0103-4900-8000-000000000002')$sql$);
SELECT count(*) AS u2_left FROM users WHERE id = 'aaaaaaaa-0103-4900-8000-000000000002';
-- Expect: 0.

-- admin_delete_vehicle, as admin, on V2.
SELECT _testh_call(_testh_uid('admin'), $sql$SELECT rpc_admin_delete_vehicle('bbbbbbbb-0103-4900-8000-000000000002')$sql$);
SELECT count(*) AS v2_left FROM vehicles WHERE id = 'bbbbbbbb-0103-4900-8000-000000000002';
-- Expect: 0.

-- admin_delete_rental, as admin, on R-DEL (also releases V3 → TERSEDIA).
SELECT _testh_call(_testh_uid('admin'), $sql$SELECT rpc_admin_delete_rental('cccccccc-0103-4900-8000-000000000004')$sql$);
SELECT count(*) AS r_del_left FROM rentals WHERE id = 'cccccccc-0103-4900-8000-000000000004';
SELECT status AS v3_status_after FROM vehicles WHERE id = 'bbbbbbbb-0103-4900-8000-000000000003';
-- Expect: 0 rentals left; v3_status_after = 'TERSEDIA'.


-- ── Section Z: cleanup — remove fixtures, drop helpers ──────────────────────
-- Order matters (children before parents). Two extra sweeps beyond the plain
-- notes/name tag: (a) hutang auto-created by rpc_close_rental (R-ACTIVE) or
-- rpc_update_payment's recompute (R-COMPLETED) carries no notes of its own —
-- caught via rental_id; (b) payments' notes survive their Section D UPDATEs
-- because every patch above deliberately kept the TEST_V103H tag in `notes`.

DELETE FROM payments WHERE notes LIKE 'TEST_V103H%';
DELETE FROM hutang
  WHERE notes LIKE 'TEST_V103H%'
     OR rental_id IN (SELECT id FROM rentals WHERE notes LIKE 'TEST_V103H%')
     OR user_id   IN (SELECT id FROM users   WHERE name  LIKE 'TEST_V103H%');
DELETE FROM charges WHERE rental_id IN (SELECT id FROM rentals WHERE notes LIKE 'TEST_V103H%');
DELETE FROM rentals WHERE notes LIKE 'TEST_V103H%';
DELETE FROM vehicles WHERE name LIKE 'TEST_V103H%';
DELETE FROM users    WHERE name LIKE 'TEST_V103H%';

-- Final sweep: every row here should be 0.
SELECT 'users' AS tbl, count(*) FROM users WHERE name LIKE 'TEST_V103H%'
UNION ALL SELECT 'vehicles', count(*) FROM vehicles WHERE name LIKE 'TEST_V103H%'
UNION ALL SELECT 'rentals', count(*) FROM rentals WHERE notes LIKE 'TEST_V103H%'
UNION ALL SELECT 'payments', count(*) FROM payments WHERE notes LIKE 'TEST_V103H%'
UNION ALL SELECT 'hutang', count(*) FROM hutang WHERE notes LIKE 'TEST_V103H%';

DROP FUNCTION IF EXISTS _testh_call(text, text);
DROP FUNCTION IF EXISTS _testh_call_unauth(text);
DROP FUNCTION IF EXISTS _testh_uid(text);
