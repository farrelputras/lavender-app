-- ============================================================================
-- v1.0.3 (PRD-1) Behavioral Verification: rpc_update_rental
-- (20260720073455_rpc_update_rental.sql)
--
-- STATUS: AUTHORED, NOT YET RUN. The migration has been authored and unit-
-- tested (connector layer) but has NOT been pushed to the linked project
-- (`npx supabase db push` is a separate, explicitly-approved step per the
-- v1.0.3 dispatch). rpc_update_rental does not exist on the remote database
-- yet, so this script cannot execute until the push happens. Run it
-- immediately after the push, section by section, and record results here
-- (mirroring task-3.4-admin-hard-delete.sql's convention) before the release
-- gate is marked satisfied.
--
-- Uses the same pooled-connection-safe pattern as task-3.4: impersonation and
-- the call-under-test happen atomically inside one plpgsql function
-- (_test103_call), because session-level set_config does not survive across
-- separate statement round-trips on this project (see docs/verification/README.md).
--
-- All fixtures are tagged TEST_V103 (in `notes`/`name`) so they are easy to
-- find and Section-Z sweeps them all up. HOW TO RUN: execute section by
-- section, in order. Every RPC-under-test call returns a plain text row like:
--   "impersonated=<uid> | OK (no error raised)"
--   "impersonated=<uid> | ERROR: <message>"
-- Some are SUPPOSED to say ERROR — that's a pass for those, not a failure;
-- read the comment above each call for what's expected.
-- ============================================================================


-- ── Section 0: helpers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _test103_uid(p_role text) RETURNS text AS $$
  SELECT user_id::text FROM app_config WHERE role = p_role;
$$ LANGUAGE sql STABLE;

-- Impersonates p_uid, then executes p_sql, all within this one function call.
CREATE OR REPLACE FUNCTION _test103_call(p_uid text, p_sql text) RETURNS text AS $$
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
SELECT _test103_call('99999999-9999-4999-8999-999999999999', 'SELECT 1');

-- Executes p_sql with NO impersonation at all (explicitly clears any JWT
-- claims first), so auth.uid() resolves to NULL — simulating a caller with no
-- authenticated session (auth.uid() = NULL). This proves **Fix 1 only**: that
-- the in-function role checks are NULL-safe (`IS NOT TRUE`) and actually RAISE
-- when identity is absent, instead of the three-valued-logic hole where `NOT
-- v_is_operator`/`NOT v_is_admin` silently evaluated to NULL and let a NULL
-- caller through. It does NOT prove Fix 2 (the anon/PUBLIC EXECUTE revoke):
-- this script runs as the Management API's elevated role (postgres/
-- service_role), which always has EXECUTE regardless of any GRANT/REVOKE on
-- the function, so the privilege check itself is never exercised here. Fix 2
-- is proved separately below by has_function_privilege(...), which inspects
-- the grant directly rather than relying on who is allowed to call it.
CREATE OR REPLACE FUNCTION _test103_call_unauth(p_sql text) RETURNS text AS $$
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

-- Sanity check: impersonated must show NULL (proves the helper actually
-- clears identity rather than inheriting a stale claim from a prior call).
-- ⚠️ Read this literally — the "OK" half is the discriminator, not the "NULL"
-- half. Both a genuine pass AND a broken auth.uid() display "impersonated=
-- NULL": under an older auth.uid() definition lacking a `nullif` guard,
-- casting '' to uuid would RAISE (invalid input syntax for type uuid), and
-- v_check_uid would still print as NULL (it was never successfully assigned)
-- in the format string. Only "impersonated=NULL | OK (no error raised)" is a
-- pass; "impersonated=NULL | ERROR: invalid input syntax..." is a FAIL that
-- looks superficially similar at a glance.
SELECT _test103_call_unauth('SELECT 1');


-- ── Section A: fixtures ────────────────────────────────────────────────────
-- One user + vehicle, and four rentals covering every status/photo combo the
-- gate needs to distinguish:
--   R-ACTIVE     : ACTIVE, 1 exit photo   — the main happy path + last-photo gate
--   R-ACTIVE-0PH : ACTIVE, 0 exit photos  — the "already empty" edge case (OQ-1 clause)
--   R-COMPLETED  : COMPLETED, 1 exit photo — kondisiKeluar must RAISE regardless of role;
--                  notes: admin ok, ops RAISE
--   R-CANCELLED  : CANCELLED — everything RAISEs

INSERT INTO users (id, name, phone, is_mahasiswa, notes) VALUES
  ('aaaaaaaa-0103-4000-8000-000000000001', 'TEST_V103 User', '0800001030', true, 'TEST_V103 disposable');

INSERT INTO vehicles (id, name, plate, category, rate_6h, rate_12h, rate_24h, notes) VALUES
  ('bbbbbbbb-0103-4000-8000-000000000001', 'TEST_V103 Vehicle', 'TESTV103', 'MOTOR', 15000, 25000, 40000, 'TEST_V103 disposable');

INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status, paket_hari, paket_jam, tarif, kondisi_keluar, notes) VALUES
  ('cccccccc-0103-4000-8000-000000000001',
   'aaaaaaaa-0103-4000-8000-000000000001', 'bbbbbbbb-0103-4000-8000-000000000001',
   now(), now() + interval '1 day', 'ACTIVE', 1, 0, 40000,
   jsonb_build_object('bensinKotak', 4, 'km', 1000,
     'photos', jsonb_build_array(jsonb_build_object('id', 'photo-fixture-1', 'path', 'rentals/cccccccc-0103-4000-8000-000000000001/kondisi-keluar/fixture.jpg'))),
   'TEST_V103 disposable — R-ACTIVE');

INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status, paket_hari, paket_jam, tarif, kondisi_keluar, notes) VALUES
  ('cccccccc-0103-4000-8000-000000000002',
   'aaaaaaaa-0103-4000-8000-000000000001', 'bbbbbbbb-0103-4000-8000-000000000001',
   now(), now() + interval '1 day', 'ACTIVE', 1, 0, 40000,
   jsonb_build_object('bensinKotak', 4, 'km', 1000, 'photos', '[]'::jsonb),
   'TEST_V103 disposable — R-ACTIVE-0PH');

INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, returned_at, status, paket_hari, paket_jam, tarif, subtotal_sewa, kondisi_keluar, notes) VALUES
  ('cccccccc-0103-4000-8000-000000000003',
   'aaaaaaaa-0103-4000-8000-000000000001', 'bbbbbbbb-0103-4000-8000-000000000001',
   now() - interval '1 day', now(), now(), 'COMPLETED', 1, 0, 40000, 40000,
   jsonb_build_object('bensinKotak', 4, 'km', 1000,
     'photos', jsonb_build_array(jsonb_build_object('id', 'photo-fixture-2', 'path', 'rentals/cccccccc-0103-4000-8000-000000000003/kondisi-keluar/fixture.jpg'))),
   'TEST_V103 disposable — R-COMPLETED');

INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status, paket_hari, paket_jam, tarif, kondisi_keluar, notes) VALUES
  ('cccccccc-0103-4000-8000-000000000004',
   'aaaaaaaa-0103-4000-8000-000000000001', 'bbbbbbbb-0103-4000-8000-000000000001',
   now(), now() + interval '1 day', 'CANCELLED', 1, 0, 40000,
   jsonb_build_object('bensinKotak', 4, 'km', 1000, 'photos', '[]'::jsonb),
   'TEST_V103 disposable — R-CANCELLED');

-- Confirm fixtures exist: expect 1 user, 1 vehicle, 4 rentals.
SELECT
  (SELECT count(*) FROM users WHERE id = 'aaaaaaaa-0103-4000-8000-000000000001') AS users,
  (SELECT count(*) FROM vehicles WHERE id = 'bbbbbbbb-0103-4000-8000-000000000001') AS vehicles,
  (SELECT count(*) FROM rentals WHERE notes LIKE 'TEST_V103%') AS rentals;


-- ── Section B: kondisiKeluar on ACTIVE, as ops → succeeds ──────────────────
-- Also proves the merge: keeps photo-fixture-1, adds a new photo, rewrites
-- bensinKotak/km — and that notes/money are untouched by this call.
-- Expected: "... | OK (no error raised)"
SELECT _test103_call(
  _test103_uid('ops'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000001',
    jsonb_build_object('kondisiKeluar', jsonb_build_object(
      'bensinKotak', 6, 'km', 1234,
      'keepPhotoIds', jsonb_build_array('photo-fixture-1'),
      'newPhotos', jsonb_build_array(jsonb_build_object('id', 'photo-fixture-new', 'path', 'rentals/x/kondisi-keluar/new.jpg'))
    )))$sql$
);

-- Verify: bensinKotak=6, km=1234, 2 photos (kept + new); notes/total_bill unchanged (BR-6).
SELECT
  kondisi_keluar->>'bensinKotak' AS bensin_kotak,
  kondisi_keluar->>'km' AS km,
  jsonb_array_length(kondisi_keluar->'photos') AS photo_count,
  notes,
  tarif
FROM rentals WHERE id = 'cccccccc-0103-4000-8000-000000000001';
-- Expect: bensin_kotak=6, km=1234, photo_count=2, notes='TEST_V103 disposable — R-ACTIVE', tarif=40000 (unchanged).


-- ── Section C: kondisiKeluar on COMPLETED → RAISE, even for admin ──────────
-- Expected (ops):   "... | ERROR: Kondisi keluar hanya dapat diubah selama rental berstatus aktif"
SELECT _test103_call(
  _test103_uid('ops'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000003',
    jsonb_build_object('kondisiKeluar', jsonb_build_object('bensinKotak', 4, 'km', 1, 'keepPhotoIds', '[]'::jsonb, 'newPhotos', '[]'::jsonb)))$sql$
);
-- Expected (admin, the harder case — settled money must never move): same ERROR.
SELECT _test103_call(
  _test103_uid('admin'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000003',
    jsonb_build_object('kondisiKeluar', jsonb_build_object('bensinKotak', 4, 'km', 1, 'keepPhotoIds', '[]'::jsonb, 'newPhotos', '[]'::jsonb)))$sql$
);


-- ── Section D: kondisiKeluar on CANCELLED → RAISE ───────────────────────────
-- Expected: "... | ERROR: Kondisi keluar hanya dapat diubah selama rental berstatus aktif"
SELECT _test103_call(
  _test103_uid('admin'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000004',
    jsonb_build_object('kondisiKeluar', jsonb_build_object('bensinKotak', 4, 'km', 1, 'keepPhotoIds', '[]'::jsonb, 'newPhotos', '[]'::jsonb)))$sql$
);


-- ── Section E: notes on ACTIVE, as ops → succeeds ───────────────────────────
-- Expected: "... | OK (no error raised)"
SELECT _test103_call(
  _test103_uid('ops'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000001', jsonb_build_object('notes', 'catatan diedit ops'))$sql$
);
SELECT notes FROM rentals WHERE id = 'cccccccc-0103-4000-8000-000000000001';
-- Expect: 'catatan diedit ops'.


-- ── Section F: notes on COMPLETED, as admin → succeeds ──────────────────────
-- Expected: "... | OK (no error raised)"
SELECT _test103_call(
  _test103_uid('admin'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000003', jsonb_build_object('notes', 'catatan diedit admin'))$sql$
);
SELECT notes, tarif, subtotal_sewa FROM rentals WHERE id = 'cccccccc-0103-4000-8000-000000000003';
-- Expect: notes='catatan diedit admin'; tarif=40000, subtotal_sewa=40000 (BR-6: untouched).


-- ── Section G: notes on COMPLETED, as ops → RAISE (admin-only tier) ─────────
-- Expected: "... | ERROR: unauthorized"
SELECT _test103_call(
  _test103_uid('ops'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000003', jsonb_build_object('notes', 'ops mencoba edit'))$sql$
);


-- ── Section H: notes on CANCELLED, even as admin → RAISE ────────────────────
-- Expected: "... | ERROR: Catatan tidak dapat diubah pada rental yang sudah dibatalkan"
SELECT _test103_call(
  _test103_uid('admin'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000004', jsonb_build_object('notes', 'admin mencoba edit'))$sql$
);


-- ── Section I: last-photo rule — ops RAISEs, admin succeeds ─────────────────
-- R-ACTIVE now has 2 photos after Section B; reduce to empty explicitly.
-- Expected (ops): "... | ERROR: Foto terakhir tidak bisa dihapus. Minta Farrel untuk menghapusnya."
SELECT _test103_call(
  _test103_uid('ops'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000001',
    jsonb_build_object('kondisiKeluar', jsonb_build_object('bensinKotak', 6, 'km', 1234, 'keepPhotoIds', '[]'::jsonb, 'newPhotos', '[]'::jsonb)))$sql$
);
-- Confirm it did NOT change (still 2 photos).
SELECT jsonb_array_length(kondisi_keluar->'photos') AS photo_count FROM rentals WHERE id = 'cccccccc-0103-4000-8000-000000000001';
-- Expect: 2 (unchanged).

-- Expected (admin): "... | OK (no error raised)" — admin may always empty it.
SELECT _test103_call(
  _test103_uid('admin'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000001',
    jsonb_build_object('kondisiKeluar', jsonb_build_object('bensinKotak', 6, 'km', 1234, 'keepPhotoIds', '[]'::jsonb, 'newPhotos', '[]'::jsonb)))$sql$
);
SELECT jsonb_array_length(kondisi_keluar->'photos') AS photo_count FROM rentals WHERE id = 'cccccccc-0103-4000-8000-000000000001';
-- Expect: 0.


-- ── Section J: the mandatory edge case — ops editing a rental that ALREADY ──
-- had zero exit photos must SUCCEED (existing was empty, so this is not a
-- "reduction"). Without the "AND existing was non-empty" clause this would
-- wrongly RAISE and block a legitimate fuel/km-only correction.
-- Expected: "... | OK (no error raised)"
SELECT _test103_call(
  _test103_uid('ops'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000002',
    jsonb_build_object('kondisiKeluar', jsonb_build_object('bensinKotak', 7, 'km', 999, 'keepPhotoIds', '[]'::jsonb, 'newPhotos', '[]'::jsonb)))$sql$
);
SELECT kondisi_keluar->>'bensinKotak' AS bensin_kotak, jsonb_array_length(kondisi_keluar->'photos') AS photo_count
  FROM rentals WHERE id = 'cccccccc-0103-4000-8000-000000000002';
-- Expect: bensin_kotak=7, photo_count=0 (the fuel correction went through).


-- ── Section K: a caller with NULL identity is rejected by the in-function ───
--    role checks — proves Fix 1 ONLY (not Fix 2; see Section K2 below).
-- R-ACTIVE-0PH (…0002) is ACTIVE, so status alone would let this through if
-- the role check silently no-opped on NULL. Both a kondisiKeluar patch and a
-- notes patch must RAISE.
--
-- ⚠️ Read the result EXACTLY, not just "did an ERROR appear". The helper's
-- `EXCEPTION WHEN OTHERS` catches and stringifies ANY failure inside p_sql —
-- a typo'd fixture UUID, a dropped/renamed function, a constraint violation —
-- not just an auth rejection. "impersonated=NULL | ERROR: <anything>" is NOT
-- a pass. The only passing result is the message matching EXACTLY:
--   impersonated=NULL | ERROR: unauthorized
-- Anything else (a different message, or "OK") is a FAIL and must be
-- investigated before this gate is considered proven.
SELECT _test103_call_unauth(
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000002',
    jsonb_build_object('kondisiKeluar', jsonb_build_object('bensinKotak', 99, 'km', 1, 'keepPhotoIds', '[]'::jsonb, 'newPhotos', '[]'::jsonb)))$sql$
);
SELECT _test103_call_unauth(
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000002', jsonb_build_object('notes', 'anon mencoba edit'))$sql$
);
-- Confirm neither call mutated anything (still whatever Section J left it at).
SELECT kondisi_keluar->>'bensinKotak' AS bensin_kotak, notes
  FROM rentals WHERE id = 'cccccccc-0103-4000-8000-000000000002';
-- Expect: bensin_kotak=7 (from Section J, unchanged by the rejected 99), notes
-- still the original TEST_V103 fixture note (not 'anon mencoba edit').


-- ── Section K2: EXECUTE grant is exactly {authenticated}, not PUBLIC/anon ───
-- Proves Fix 2 directly, independent of who the *script itself* is allowed to
-- call as (the Management API connects as an elevated role — postgres /
-- service_role — which always has EXECUTE on every function regardless of any
-- GRANT/REVOKE, so Section K's _test103_call_unauth can never exercise this
-- privilege check no matter how it's written). has_function_privilege reads
-- the grant itself, which is the only way to actually prove Fix 2.
SELECT
  has_function_privilege('anon',          'rpc_update_rental(uuid, jsonb)', 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', 'rpc_update_rental(uuid, jsonb)', 'EXECUTE') AS auth_exec;
-- Expect: anon_exec = false, auth_exec = true.


-- ── Section L: bensinKotak guard — missing/NULL is rejected, not defaulted ──
-- rental-math-reviewer blocking finding, Fix 3. Omits `bensinKotak` entirely
-- (the absent-key case; ->>'bensinKotak' treats this identically to explicit
-- JSON null) on an authorized ops/ACTIVE call that would otherwise succeed.
-- Expected: "... | ERROR: Kondisi keluar wajib menyertakan bensinKotak"
SELECT _test103_call(
  _test103_uid('ops'),
  $sql$SELECT rpc_update_rental('cccccccc-0103-4000-8000-000000000002',
    jsonb_build_object('kondisiKeluar', jsonb_build_object('km', 500, 'keepPhotoIds', '[]'::jsonb, 'newPhotos', '[]'::jsonb)))$sql$
);
-- Confirm no partial write: bensinKotak/km still whatever they were before
-- this call (7 / 999 from Section J), not silently defaulted or set to 500.
SELECT kondisi_keluar->>'bensinKotak' AS bensin_kotak, kondisi_keluar->>'km' AS km
  FROM rentals WHERE id = 'cccccccc-0103-4000-8000-000000000002';
-- Expect: bensin_kotak=7, km=999 (unchanged — the rejected patch wrote nothing).


-- ── Section Z: cleanup — remove fixtures, drop helpers ──────────────────────

DELETE FROM rentals  WHERE notes LIKE 'TEST_V103%';
DELETE FROM vehicles WHERE name LIKE 'TEST_V103%';
DELETE FROM users    WHERE name LIKE 'TEST_V103%';

-- Final sweep: every row here should be 0.
SELECT 'users' AS tbl, count(*) FROM users WHERE name LIKE 'TEST_V103%'
UNION ALL SELECT 'vehicles', count(*) FROM vehicles WHERE name LIKE 'TEST_V103%'
UNION ALL SELECT 'rentals', count(*) FROM rentals WHERE notes LIKE 'TEST_V103%';

DROP FUNCTION IF EXISTS _test103_call(text, text);
DROP FUNCTION IF EXISTS _test103_call_unauth(text);
DROP FUNCTION IF EXISTS _test103_uid(text);
