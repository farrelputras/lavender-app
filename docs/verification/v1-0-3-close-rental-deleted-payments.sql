-- ═══════════════════════════════════════════════════════════════════════════
-- v1.0.3 — rpc_close_rental must exclude soft-deleted payments from total_paid
-- Verifies migration 20260721150806_close_rental_exclude_deleted_payments.sql
-- ═══════════════════════════════════════════════════════════════════════════
--
-- STATUS: AUTHORED, NOT YET RUN — record results in docs/verification/README.md
-- after running, per this directory's convention.
--
-- WHAT IS BEING PROVEN
--   0014 added `AND deleted_at IS NULL` to rpc_close_rental's v_total_paid sum.
--   0015 CREATE OR REPLACE'd the whole function to add one `tujuan` line and
--   silently dropped the filter. Since then the server has counted retracted
--   payments as paid: a LARGER total_paid, a SMALLER sisa, and therefore an
--   auto-created hutang smaller than PengembalianScreen promised — or none at
--   all, because `IF v_sisa > 0` skips the INSERT entirely.
--
--   Section C is the headline: a soft-deleted payment that covers the whole bill.
--   Under the bug it produces NO hutang whatsoever. Under the fix it produces the
--   full one. Section D is the inverse control — a genuinely fully-paid rental
--   must still produce NO hutang, proving the fix did not invent debt.
--
-- HOW TO RUN — run the WHOLE FILE, in one command:
--   cd apps/lavender-ops-mobile
--   npx supabase db query --linked -f ../../docs/verification/v1-0-3-close-rental-deleted-payments.sql
--
--   Whole-file is the default deliberately: a mid-file error then rolls back the
--   helper CREATEs along with everything else, so nothing is left behind.
--
--   ⚠️ If you instead paste section by section, an error before Section E leaves
--   _test103d_call LIVE in the public schema — a function that spoofs auth.uid()
--   and EXECUTEs arbitrary SQL, granted to PUBLIC by default. That is a complete
--   bypass of every authorization gate in the project. On ANY failure in a
--   section-by-section run, immediately run Section E's two DROP FUNCTION lines
--   before doing anything else, including before debugging.
--
--   Read every result LITERALLY — the helper stringifies any exception, so "an
--   ERROR appeared" is not information until you have read which error. Each
--   assertion returns PASS or FAIL as a plain text row (not RAISE NOTICE —
--   NOTICE output is not guaranteed to surface in every client).
--
-- CONVENTIONS FOLLOWED (docs/verification/README.md)
--   • Impersonation happens atomically INSIDE one plpgsql call — session-level
--     set_config does not survive across statements against this pooled project.
--   • All fixtures are tagged TEST_V103D and swept in Section E.
--   • Section E DROPs every helper. CREATE FUNCTION grants EXECUTE to PUBLIC by
--     default, and _test103d_call spoofs auth.uid() — leaving it behind is a
--     complete bypass of every authorization gate in the project. Confirm the
--     drops ran.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Section 0: helpers ────────────────────────────────────────────────────────

-- The real ops user (Mom). This test deliberately runs as ops, not admin: the bug
-- is reachable by her alone.
CREATE OR REPLACE FUNCTION _test103d_ops_uid() RETURNS text AS $$
  SELECT user_id::text FROM app_config WHERE role = 'ops' LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Impersonates p_uid and runs p_sql in the same call — one round trip, immune to
-- transaction-mode pooling handing the next statement a different backend.
CREATE OR REPLACE FUNCTION _test103d_call(p_uid text, p_sql text) RETURNS text AS $$
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

-- Sanity check: must show the ops UUID, not NULL. If this is NULL, every result
-- below is meaningless — impersonation is not working and nothing was proven.
SELECT _test103d_call((SELECT _test103d_ops_uid()), 'SELECT 1') AS section_0_sanity;


-- ── Section A: fixtures ───────────────────────────────────────────────────────
-- Two ACTIVE rentals, both billing Rp 100.000 (tarif 100000 × 1 day, no charges,
-- no discount). Deterministic UUIDs so the sweep in Section E is exact.

INSERT INTO users (id, name, phone, notes)
VALUES ('d1000000-0000-4000-8000-000000000001', 'TEST_V103D User', '080000000000', 'TEST_V103D');

INSERT INTO vehicles (id, name, plate, category, rate_6h, rate_12h, rate_24h, status, notes)
VALUES ('d2000000-0000-4000-8000-000000000001', 'TEST_V103D Vehicle', 'TEST_V103D_1',
        'MOTOR', 30000, 60000, 100000, 'DISEWA', 'TEST_V103D');

-- Rental C — the headline case. Bill 100.000. One LIVE payment of 40.000 and one
-- payment of 60.000 that is soft-deleted BEFORE close.
--   Correct: total_paid = 40.000 → sisa = 60.000 → hutang of 60.000.
--   Buggy:   total_paid = 100.000 → sisa = 0 → NO hutang at all.
INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status,
                     paket_hari, paket_jam, tarif, notes)
VALUES ('d3000000-0000-4000-8000-00000000000c',
        'd1000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000001',
        now() - interval '1 day', now(), 'ACTIVE', 1, 0, 100000, 'TEST_V103D');

INSERT INTO payments (id, rental_id, amount, method, paid_at, notes, deleted_at)
VALUES ('d4000000-0000-4000-8000-00000000000a',
        'd3000000-0000-4000-8000-00000000000c', 40000, 'CASH', now(), 'TEST_V103D live', NULL),
       ('d4000000-0000-4000-8000-00000000000b',
        'd3000000-0000-4000-8000-00000000000c', 60000, 'CASH', now(), 'TEST_V103D retracted', now());

-- Rental D — the inverse control. Bill 100.000, a single LIVE payment of 100.000,
-- nothing soft-deleted. Must produce NO hutang, before and after the fix.
INSERT INTO rentals (id, user_id, vehicle_id, start_at, due_at, status,
                     paket_hari, paket_jam, tarif, notes)
VALUES ('d3000000-0000-4000-8000-00000000000d',
        'd1000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000001',
        now() - interval '1 day', now(), 'ACTIVE', 1, 0, 100000, 'TEST_V103D');

INSERT INTO payments (id, rental_id, amount, method, paid_at, notes, deleted_at)
VALUES ('d4000000-0000-4000-8000-00000000000d',
        'd3000000-0000-4000-8000-00000000000d', 100000, 'CASH', now(), 'TEST_V103D live', NULL);


-- ── Section B: the app and the server must agree BEFORE close ─────────────────
-- v_rentals (what PengembalianScreen reads) already filters soft-deleted payments
-- (0014:89). This records the number Mom is shown, so Section C can be compared
-- against it rather than against a hardcoded expectation.
-- EXPECTED: view_total_paid = 40000, view_sisa = 60000.

SELECT
  'B: what the app shows for rental C' AS check,
  total_paid                          AS view_total_paid,
  total_bill                          AS view_total_bill,
  total_bill - total_paid             AS view_sisa,
  CASE WHEN total_paid = 40000 AND total_bill - total_paid = 60000
       THEN 'PASS' ELSE 'FAIL — v_rentals filter changed' END AS verdict
FROM v_rentals
WHERE id = 'd3000000-0000-4000-8000-00000000000c';


-- ── Section C: HEADLINE — close rental C as ops ───────────────────────────────
-- EXPECTED: "impersonated=<ops uuid> | OK (no error raised)".
-- An `unauthorized` here means the auth-gate hardening flipped polarity — stop and
-- investigate; do not proceed to the OTA publish.

SELECT _test103d_call(
  (SELECT _test103d_ops_uid()),
  'SELECT rpc_close_rental(''d3000000-0000-4000-8000-00000000000c''::uuid,
     ''{"returnedAt":"2026-07-21T12:00:00Z","kondisiKembali":{"bensinKotak":4,"km":1200,"photos":[]},
        "subtotalSewa":100000,"discount":0,"extraFees":[],"newPayments":[]}''::jsonb)'
) AS section_c_close;

-- THE ASSERTION. Under the bug this returns zero rows / hutang_count = 0.
-- EXPECTED: hutang_count = 1, jumlah_awal = 60000, status = AKTIF.
SELECT
  'C: hutang created for rental C'                      AS check,
  COUNT(*)                                              AS hutang_count,
  COALESCE(MAX(jumlah_awal), 0)                         AS jumlah_awal,
  COALESCE(MAX(status::text), '(none)')                 AS status,
  CASE
    WHEN COUNT(*) = 1 AND MAX(jumlah_awal) = 60000 THEN 'PASS'
    WHEN COUNT(*) = 0 THEN 'FAIL — NO hutang created. The soft-deleted payment was counted as paid; the fix is not live.'
    ELSE 'FAIL — hutang created with the wrong amount (expected 60000)'
  END                                                   AS verdict
FROM hutang
WHERE rental_id = 'd3000000-0000-4000-8000-00000000000c';

-- Cross-check: the hutang must equal exactly what the app promised. This is the
-- invariant that actually matters — server and screen agreeing on one number.
-- `screen_sisa` is DERIVED live from the same predicate v_rentals uses, not
-- hardcoded, so this row still means something if the fixtures are ever changed.
SELECT
  'C: server agrees with the screen'                                        AS check,
  h.jumlah_awal                                                             AS server_hutang,
  s.screen_sisa                                                             AS screen_sisa,
  CASE WHEN h.jumlah_awal = s.screen_sisa THEN 'PASS'
       ELSE 'FAIL — server and screen disagree' END                         AS verdict
FROM (
  SELECT (SELECT total_bill FROM v_rentals WHERE id = 'd3000000-0000-4000-8000-00000000000c')
       - (SELECT COALESCE(SUM(amount), 0) FROM payments
           WHERE rental_id = 'd3000000-0000-4000-8000-00000000000c' AND deleted_at IS NULL)
         AS screen_sisa
) s
CROSS JOIN hutang h
WHERE h.rental_id = 'd3000000-0000-4000-8000-00000000000c';


-- ── Section D: INVERSE CONTROL — a genuinely fully-paid rental ────────────────
-- Proves the fix did not invert the filter and start inventing debt.
-- EXPECTED: OK, then hutang_count = 0.

SELECT _test103d_call(
  (SELECT _test103d_ops_uid()),
  'SELECT rpc_close_rental(''d3000000-0000-4000-8000-00000000000d''::uuid,
     ''{"returnedAt":"2026-07-21T12:00:00Z","kondisiKembali":{"bensinKotak":4,"km":1200,"photos":[]},
        "subtotalSewa":100000,"discount":0,"extraFees":[],"newPayments":[]}''::jsonb)'
) AS section_d_close;

-- ⚠️ "No hutang" is ALSO what you get if rpc_close_rental never ran at all — the
-- helper's `EXCEPTION WHEN OTHERS` swallows an `unauthorized` into a returned
-- string, so a failed call would leave zero hutang and read as a pass. The
-- rental_closed check makes that impossible: this row cannot pass unless the RPC
-- actually completed. (A verification script in this project has already shipped
-- once that passed vacuously — see README's note on the Section K REVOKE check.)
SELECT
  'D: no hutang for a fully-paid rental' AS check,
  (SELECT status::text FROM rentals
    WHERE id = 'd3000000-0000-4000-8000-00000000000d')        AS rental_closed,
  COUNT(*)                                                     AS hutang_count,
  CASE
    WHEN (SELECT status FROM rentals
           WHERE id = 'd3000000-0000-4000-8000-00000000000d') <> 'COMPLETED'
      THEN 'FAIL — rpc_close_rental did not run; this row proves NOTHING. Read section_d_close.'
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL — fix inverted; debt invented on a fully-paid rental'
  END                                                          AS verdict
FROM hutang
WHERE rental_id = 'd3000000-0000-4000-8000-00000000000d';


-- ── Section E: cleanup + sweep ────────────────────────────────────────────────
-- Order matters: payments and hutang reference rentals; rentals reference
-- users/vehicles. Both rentals also flipped their (shared) vehicle to TERSEDIA.

DELETE FROM payments WHERE rental_id IN ('d3000000-0000-4000-8000-00000000000c',
                                         'd3000000-0000-4000-8000-00000000000d');
DELETE FROM payments WHERE hutang_id IN (SELECT id FROM hutang
                                          WHERE rental_id IN ('d3000000-0000-4000-8000-00000000000c',
                                                              'd3000000-0000-4000-8000-00000000000d'));
DELETE FROM hutang   WHERE rental_id IN ('d3000000-0000-4000-8000-00000000000c',
                                         'd3000000-0000-4000-8000-00000000000d');
DELETE FROM charges  WHERE rental_id IN ('d3000000-0000-4000-8000-00000000000c',
                                         'd3000000-0000-4000-8000-00000000000d');
DELETE FROM rentals  WHERE id IN ('d3000000-0000-4000-8000-00000000000c',
                                  'd3000000-0000-4000-8000-00000000000d');
DELETE FROM vehicles WHERE id = 'd2000000-0000-4000-8000-000000000001';
DELETE FROM users    WHERE id = 'd1000000-0000-4000-8000-000000000001';

DROP FUNCTION IF EXISTS _test103d_call(text, text);
DROP FUNCTION IF EXISTS _test103d_ops_uid();

-- EXPECTED: every count 0, including helpers_left. A non-zero helpers_left is a
-- live authorization bypass sitting in the public schema — do not stop here.
--
-- ⚠️ rentals and hutang are swept BY ID, not by the TEST_V103D tag. rpc_close_rental
-- writes `notes = COALESCE(payload->>'notes', '')` and neither payload carries a
-- `notes` key, so both rentals lose their tag the moment Sections C and D run — a
-- tag-based count would read 0 unconditionally and prove nothing. hutang never had
-- a tag column at all.
SELECT
  'E: sweep' AS check,
  (SELECT COUNT(*) FROM users    WHERE notes = 'TEST_V103D')                    AS users_left,
  (SELECT COUNT(*) FROM vehicles WHERE notes = 'TEST_V103D')                    AS vehicles_left,
  (SELECT COUNT(*) FROM rentals  WHERE id IN ('d3000000-0000-4000-8000-00000000000c',
                                              'd3000000-0000-4000-8000-00000000000d')) AS rentals_left,
  (SELECT COUNT(*) FROM hutang   WHERE rental_id IN ('d3000000-0000-4000-8000-00000000000c',
                                                     'd3000000-0000-4000-8000-00000000000d')) AS hutang_left,
  (SELECT COUNT(*) FROM payments WHERE rental_id IN ('d3000000-0000-4000-8000-00000000000c',
                                                     'd3000000-0000-4000-8000-00000000000d')
                                    OR notes LIKE 'TEST_V103D%')                AS payments_left,
  (SELECT COUNT(*) FROM pg_proc  WHERE proname LIKE '_test103d%')               AS helpers_left;
