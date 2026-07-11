-- ============================================================================
-- Task 3.4 Behavioral Verification: admin hard-delete RPCs (0016_admin_hard_delete.sql)
--
-- STATUS: RUN AGAINST PRODUCTION SUPABASE 2026-07-12 -- ALL SECTIONS PASSED.
--         Post-run hygiene confirmed: 0 leftover _test34_* helpers, 4 rpc_admin_delete_*
--         functions present, 0 TEST_TASK34 rows remaining. See ./README.md for the
--         per-section result table.
--
-- v2 -- fixed for connection pooling (session-level set_config didn't survive
-- across separate statement round-trips: auth.uid() came back NULL after a
-- standalone `set_config(..., false)` + separate `SELECT auth.uid()`).
--
-- Fix: impersonation now happens INSIDE a single plpgsql function call
-- (_test34_call), atomically with the RPC invocation it's testing. This works
-- regardless of whether your client keeps one physical connection across
-- statements (transaction-mode pooling, e.g. Supabase's pooled connection
-- string on port 6543, breaks that assumption -- this design doesn't need it).
--
-- HOW TO RUN: execute section by section, in order. Every RPC-under-test call
-- now returns a plain text row like:
--   "impersonated=<uid> | OK (no error raised)"
--   "impersonated=<uid> | ERROR: <message>"
-- Read the comment above each one for what result is expected -- some are
-- SUPPOSED to say ERROR, that's a pass for those, not a failure.
--
-- All test rows are tagged with the marker TEST_TASK34 (name/notes/description)
-- so they're easy to find and Section G's cleanup sweeps them all up.
-- ============================================================================


-- ── Section 0: helpers ─────────────────────────────────────────────────────
SELECT user_id AS admin_user_id FROM app_config WHERE role = 'admin';  -- just for your visibility

CREATE OR REPLACE FUNCTION _test34_admin_uid() RETURNS text AS $$
  SELECT user_id::text FROM app_config WHERE role = 'admin';
$$ LANGUAGE sql STABLE;

-- Impersonates p_uid, then executes p_sql, all within this one function call
-- (one round trip -- immune to pooling/session issues). Returns a plain text
-- result you'll see as a normal query result row in any SQL client.
CREATE OR REPLACE FUNCTION _test34_call(p_uid text, p_sql text) RETURNS text AS $$
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
SELECT _test34_call('99999999-9999-4999-8999-999999999999', 'SELECT 1');


-- ── Section A: AUTH GATE -- non-admin caller must be rejected ─────────────────
-- Expected result: "impersonated=99999999-... | ERROR: unauthorized"
-- (Nothing exists at this id anyway -- if this instead says "OK", that's a
-- real bug: the gate isn't rejecting non-admins.)
SELECT _test34_call(
  '99999999-9999-4999-8999-999999999999',
  'SELECT rpc_admin_delete_rental(''11111111-1111-4111-8111-111111111111'')'
);


-- ── Section B: rental cascade, COMPLETED rental (payments + charges + linked hutang) ──
INSERT INTO users (id, name, phone, is_mahasiswa, notes) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'TEST_TASK34 User B', '0800000001', true, 'TEST_TASK34 disposable');

INSERT INTO vehicles (id, name, plate, category, rate_6h, rate_12h, rate_24h, notes) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000001', 'TEST_TASK34 Vehicle B', 'TEST34-B', 'MOTOR', 15000, 25000, 40000, 'TEST_TASK34 disposable');

INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, returned_at, status, paket_hari, paket_jam, tarif, subtotal_sewa, notes) VALUES
  ('cccccccc-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001',
   'bbbbbbbb-0000-4000-8000-000000000001',
   now() - interval '1 day', now(), now(), 'COMPLETED', 1, 0, 40000, 40000, 'TEST_TASK34 disposable');

INSERT INTO charges (rental_id, description, amount) VALUES
  ('cccccccc-0000-4000-8000-000000000001', 'TEST_TASK34 charge', 5000);

INSERT INTO payments (rental_id, amount, method, paid_at, notes) VALUES
  ('cccccccc-0000-4000-8000-000000000001', 20000, 'CASH', now(), 'TEST_TASK34 rental payment');

INSERT INTO hutang (id, user_id, rental_id, jumlah_awal, notes) VALUES
  ('dddddddd-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001',
   'cccccccc-0000-4000-8000-000000000001', 25000, 'TEST_TASK34 auto-debt');

INSERT INTO payments (hutang_id, amount, method, paid_at, notes) VALUES
  ('dddddddd-0000-4000-8000-000000000001', 10000, 'CASH', now(), 'TEST_TASK34 hutang payment');

-- Confirm fixtures exist before deleting: expect 1,1,1,2 (2 payments: rental's + hutang's)
SELECT
  (SELECT count(*) FROM rentals WHERE id = 'cccccccc-0000-4000-8000-000000000001') AS rentals,
  (SELECT count(*) FROM charges WHERE rental_id = 'cccccccc-0000-4000-8000-000000000001') AS charges,
  (SELECT count(*) FROM hutang WHERE id = 'dddddddd-0000-4000-8000-000000000001') AS hutang,
  (SELECT count(*) FROM payments WHERE rental_id = 'cccccccc-0000-4000-8000-000000000001'
     OR hutang_id = 'dddddddd-0000-4000-8000-000000000001') AS payments;

-- The actual cascade delete under test, as admin. Expected: "... | OK (no error raised)"
SELECT _test34_call(
  _test34_admin_uid(),
  'SELECT rpc_admin_delete_rental(''cccccccc-0000-4000-8000-000000000001'')'
);

-- Verify everything cascaded: expect all zeros.
SELECT
  (SELECT count(*) FROM rentals WHERE id = 'cccccccc-0000-4000-8000-000000000001') AS rentals_left,
  (SELECT count(*) FROM charges WHERE rental_id = 'cccccccc-0000-4000-8000-000000000001') AS charges_left,
  (SELECT count(*) FROM hutang WHERE id = 'dddddddd-0000-4000-8000-000000000001') AS hutang_left,
  (SELECT count(*) FROM payments WHERE rental_id = 'cccccccc-0000-4000-8000-000000000001'
     OR hutang_id = 'dddddddd-0000-4000-8000-000000000001') AS payments_left;


-- ── Section C: rental cascade, ACTIVE rental -- vehicle must release to TERSEDIA ──
INSERT INTO users (id, name, phone, is_mahasiswa, notes) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000002', 'TEST_TASK34 User C', '0800000002', true, 'TEST_TASK34 disposable');

INSERT INTO vehicles (id, name, plate, category, rate_6h, rate_12h, rate_24h, status, notes) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000002', 'TEST_TASK34 Vehicle C', 'TEST34-C', 'MOTOR', 15000, 25000, 40000, 'DISEWA', 'TEST_TASK34 disposable');

INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status, paket_hari, paket_jam, tarif, notes) VALUES
  ('cccccccc-0000-4000-8000-000000000002',
   'aaaaaaaa-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002',
   now(), now() + interval '1 day', 'ACTIVE', 1, 0, 40000, 'TEST_TASK34 disposable');

-- Confirm vehicle starts DISEWA.
SELECT status FROM vehicles WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002';

SELECT _test34_call(
  _test34_admin_uid(),
  'SELECT rpc_admin_delete_rental(''cccccccc-0000-4000-8000-000000000002'')'
);

-- Expect: rental gone (0 rows), vehicle status flipped to TERSEDIA.
SELECT count(*) AS rental_left FROM rentals WHERE id = 'cccccccc-0000-4000-8000-000000000002';
SELECT status AS vehicle_status_after FROM vehicles WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002';


-- ── Section D: block-if-referenced (user) -> unblock -> clean success + standalone hutang delete ──
INSERT INTO users (id, name, phone, is_mahasiswa, notes) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000003', 'TEST_TASK34 User D', '0800000003', true, 'TEST_TASK34 disposable');

INSERT INTO hutang (id, user_id, jumlah_awal, notes) VALUES
  ('dddddddd-0000-4000-8000-000000000002',
   'aaaaaaaa-0000-4000-8000-000000000003', 20000, 'TEST_TASK34 manual hutang (blocks user delete)');

-- Expected: "... | ERROR: Tidak bisa dihapus: masih ada rental/hutang terkait"
SELECT _test34_call(
  _test34_admin_uid(),
  'SELECT rpc_admin_delete_user(''aaaaaaaa-0000-4000-8000-000000000003'')'
);

-- Verify user is still present (block worked).
SELECT count(*) AS user_still_present FROM users WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003';

-- Remove the blocker via the standalone hardDeleteHutang path (no rental_id involved).
-- Expected: "... | OK (no error raised)"
SELECT _test34_call(
  _test34_admin_uid(),
  'SELECT rpc_admin_delete_hutang(''dddddddd-0000-4000-8000-000000000002'')'
);
SELECT count(*) AS hutang_left FROM hutang WHERE id = 'dddddddd-0000-4000-8000-000000000002';

-- Now the clean-success path: should succeed now that the reference is gone.
SELECT _test34_call(
  _test34_admin_uid(),
  'SELECT rpc_admin_delete_user(''aaaaaaaa-0000-4000-8000-000000000003'')'
);
SELECT count(*) AS user_left FROM users WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003';


-- ── Section E: block-if-referenced (vehicle) -> unblock -> clean success ──────
INSERT INTO users (id, name, phone, is_mahasiswa, notes) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000004', 'TEST_TASK34 User E', '0800000004', true, 'TEST_TASK34 disposable');

INSERT INTO vehicles (id, name, plate, category, rate_6h, rate_12h, rate_24h, notes) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000003', 'TEST_TASK34 Vehicle E', 'TEST34-E', 'MOTOR', 15000, 25000, 40000, 'TEST_TASK34 disposable');

INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status, paket_hari, paket_jam, tarif, notes) VALUES
  ('cccccccc-0000-4000-8000-000000000003',
   'aaaaaaaa-0000-4000-8000-000000000004',
   'bbbbbbbb-0000-4000-8000-000000000003',
   now(), now() + interval '1 day', 'ACTIVE', 1, 0, 40000, 'TEST_TASK34 disposable');

-- Expected: "... | ERROR: Tidak bisa dihapus: masih ada rental terkait"
SELECT _test34_call(
  _test34_admin_uid(),
  'SELECT rpc_admin_delete_vehicle(''bbbbbbbb-0000-4000-8000-000000000003'')'
);

-- Verify vehicle is still present (block worked).
SELECT count(*) AS vehicle_still_present FROM vehicles WHERE id = 'bbbbbbbb-0000-4000-8000-000000000003';

-- Remove the blocking rental.
SELECT _test34_call(
  _test34_admin_uid(),
  'SELECT rpc_admin_delete_rental(''cccccccc-0000-4000-8000-000000000003'')'
);

-- Now the clean-success path.
SELECT _test34_call(
  _test34_admin_uid(),
  'SELECT rpc_admin_delete_vehicle(''bbbbbbbb-0000-4000-8000-000000000003'')'
);
SELECT count(*) AS vehicle_left FROM vehicles WHERE id = 'bbbbbbbb-0000-4000-8000-000000000003';


-- ── Section F: cleanup -- remove remaining test fixtures (also = more clean-success proofs) ──
SELECT _test34_call(_test34_admin_uid(), 'SELECT rpc_admin_delete_user(''aaaaaaaa-0000-4000-8000-000000000001'')');    -- User B
SELECT _test34_call(_test34_admin_uid(), 'SELECT rpc_admin_delete_user(''aaaaaaaa-0000-4000-8000-000000000002'')');    -- User C
SELECT _test34_call(_test34_admin_uid(), 'SELECT rpc_admin_delete_user(''aaaaaaaa-0000-4000-8000-000000000004'')');    -- User E
SELECT _test34_call(_test34_admin_uid(), 'SELECT rpc_admin_delete_vehicle(''bbbbbbbb-0000-4000-8000-000000000001'')'); -- Vehicle B
SELECT _test34_call(_test34_admin_uid(), 'SELECT rpc_admin_delete_vehicle(''bbbbbbbb-0000-4000-8000-000000000002'')'); -- Vehicle C


-- ── Section G: final sweep -- confirm ZERO TEST_TASK34 rows remain anywhere ───
SELECT 'users' AS tbl, count(*) FROM users WHERE name LIKE 'TEST_TASK34%'
UNION ALL SELECT 'vehicles', count(*) FROM vehicles WHERE name LIKE 'TEST_TASK34%'
UNION ALL SELECT 'rentals', count(*) FROM rentals WHERE notes LIKE 'TEST_TASK34%'
UNION ALL SELECT 'hutang', count(*) FROM hutang WHERE notes LIKE 'TEST_TASK34%'
UNION ALL SELECT 'payments', count(*) FROM payments WHERE notes LIKE 'TEST_TASK34%'
UNION ALL SELECT 'charges', count(*) FROM charges WHERE description LIKE 'TEST_TASK34%';
-- Every row here should be 0. If anything is nonzero, run Section X below.

-- Drop the test helper functions -- nothing test-related should remain in the schema.
DROP FUNCTION IF EXISTS _test34_call(text, text);
DROP FUNCTION IF EXISTS _test34_admin_uid();


-- ── Section X (ONLY IF NEEDED): manual fallback cleanup ───────────────────────
-- Only run this if Section G showed nonzero counts. Deletes in child-before-parent
-- order, filtered strictly to the TEST_TASK34 marker so it cannot touch real data.
-- DELETE FROM payments WHERE notes LIKE 'TEST_TASK34%';
-- DELETE FROM charges  WHERE description LIKE 'TEST_TASK34%';
-- DELETE FROM hutang   WHERE notes LIKE 'TEST_TASK34%';
-- DELETE FROM rentals  WHERE notes LIKE 'TEST_TASK34%';
-- DELETE FROM users    WHERE name LIKE 'TEST_TASK34%';
-- DELETE FROM vehicles WHERE name LIKE 'TEST_TASK34%';
