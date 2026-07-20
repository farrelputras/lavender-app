-- 20260720103317_rpc_auth_gate_hardening.sql
-- v1.0.3 scope addition: close the NULL-auth + default-PUBLIC-EXECUTE hole across
-- every pre-existing SECURITY DEFINER RPC, per docs/reports/v1-0-3.md
-- ("Escalation to Farrel" + "Discussion with PM and its resolution").
--
-- Two defects, both already fixed once in 20260720073455_rpc_update_rental.sql
-- (this release's own new RPC) and now applied to the nine functions that
-- shipped before it:
--
--   F-1 (NULL-auth). `auth.uid() IN (SELECT …)` / `auth.uid() != (SELECT …)` is
--   three-valued SQL logic: when auth.uid() is NULL (no JWT claim — exactly an
--   anon-key caller), the whole comparison evaluates to NULL, not FALSE.
--   plpgsql's `IF` treats a NULL condition as false and silently takes the ELSE
--   branch, so `IF auth.uid() NOT IN (...) THEN RAISE` never fires for a caller
--   with no identity at all. Fix: wrap the *positive* form of the check in
--   `IS NOT TRUE`, which is TRUE for both FALSE and NULL — see the per-function
--   notes below for why each individual rewrite is behavior-preserving for every
--   non-NULL auth.uid() and only changes the NULL case.
--
--   F-2 (default PUBLIC EXECUTE). PostgreSQL grants EXECUTE to PUBLIC on every
--   newly created function by default, and no migration in this project ever
--   revoked it — not even the three functions below (rpc_get_dashboard_summary,
--   rpc_create_rental, rpc_close_rental) that carry no GRANT statement anywhere
--   in the migrations tree at all. Combined with F-1, an anon-key caller (the
--   key ships inside the sideloaded APK) could reach every one of these bodies,
--   pass every role check by NULL, and SECURITY DEFINER then bypasses RLS. Fix:
--   REVOKE EXECUTE FROM PUBLIC, anon explicitly (naming anon directly matters —
--   Supabase projects commonly carry a default-privileges grant straight to
--   anon that a PUBLIC-only revoke would not strip), then (re-)GRANT EXECUTE TO
--   authenticated. For three of the ten functions below this GRANT is not
--   "narrowing an existing grant" — it is the FIRST EVER explicit grant they
--   received; without it, revoking PUBLIC would have left every real user
--   locked out. That is exactly the outage this migration must not cause; see
--   the body-invariance note below and the sibling ..._restore_rpc_grants
--   rollback file (kept outside supabase/migrations/ — see its own header).
--
-- ── Body-invariance ──────────────────────────────────────────────────────────
-- Every CREATE OR REPLACE below changes exactly ONE thing inside the function
-- body: the auth-guard IF condition, rewritten to its NULL-safe equivalent
-- in place (no new DECLARE variables, no restructuring, no reformatting). This
-- is deliberate — four of these ten functions are money paths
-- (rpc_update_payment, rpc_delete_payment, rpc_close_rental, and transitively
-- recompute_rental_hutang, which it calls), and "confine the diff to guard
-- lines and grants" is the reviewable proof that no money logic moved. Any
-- real bug noticed elsewhere in a body during this work is reported to Lead,
-- not fixed here.
--
-- ── Enumeration (every SECURITY DEFINER function in the project) ───────────
-- In scope (SECURITY DEFINER AND reachable as a PostgREST RPC) — all ten below.
-- Out of scope, with reasons:
--   • set_audit_fields, trg_fn_recompute_hutang_status (0004_triggers.sql) —
--     SECURITY DEFINER but RETURNS TRIGGER. Postgres itself refuses to invoke a
--     trigger function outside trigger context ("trigger functions can only be
--     called as triggers") — this is enforced by the PL/pgSQL call handler, not
--     by GRANT/REVOKE, so no privilege change can affect it either way. Confirmed
--     by reading the function definitions, not assumed.
--   • rpc_update_rental (20260720073455_rpc_update_rental.sql) — SECURITY
--     DEFINER, RPC-reachable, but this release's OWN new function: already
--     built with NULL-safe guards and an explicit REVOKE/GRANT from the start,
--     reviewed and signed off separately. Not touched by this migration.
--   • Views (v_rentals, v_hutang, v_user_summaries, v_vehicle_summaries,
--     v_rentals_due_today) — SECURITY INVOKER by default (0005's header
--     comment), not SECURITY DEFINER; RLS applies via the caller's own
--     auth.uid(). Out of scope by the rule's first clause.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. rpc_get_dashboard_summary() — read-only. Live body is 0014's version
--    (which redefined 0005's to filter soft-deleted hutang payments); that is
--    the version reproduced below.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION rpc_get_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))) IS NOT TRUE THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'activeRentalsCount',      (SELECT COUNT(*)::int FROM rentals WHERE status = 'ACTIVE'),
    'vehiclesTotal',           (SELECT COUNT(*)::int FROM vehicles WHERE deleted_at IS NULL),
    'vehiclesAvailable',       (SELECT COUNT(*)::int FROM vehicles WHERE status = 'TERSEDIA' AND deleted_at IS NULL),
    'vehiclesRented',          (SELECT COUNT(*)::int FROM vehicles WHERE status = 'DISEWA' AND deleted_at IS NULL),
    'vehiclesMaintenance',     (SELECT COUNT(*)::int FROM vehicles WHERE status = 'MAINTENANCE' AND deleted_at IS NULL),
    'vehiclesInactive',        (SELECT COUNT(*)::int FROM vehicles WHERE status = 'TIDAK_AKTIF' AND deleted_at IS NULL),
    'totalUsers',              (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL),
    'verifiedUsersCount',      (SELECT COUNT(*)::int FROM users WHERE verification_status = 'TERVERIFIKASI_PDDIKTI' AND deleted_at IS NULL),
    'totalActiveDebt',         (
      SELECT COALESCE(SUM(
        h.jumlah_awal - COALESCE(
          (SELECT SUM(p.amount) FROM payments p WHERE p.hutang_id = h.id AND p.deleted_at IS NULL),
          0
        )
      ), 0)::int
      FROM hutang h WHERE h.status = 'AKTIF'
    ),
    'activeDebtCustomerCount', (
      SELECT COUNT(DISTINCT user_id)::int
      FROM hutang WHERE status = 'AKTIF'
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_get_dashboard_summary() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION rpc_get_dashboard_summary() TO authenticated;
-- ⚠️ No prior GRANT statement for this function exists anywhere in the
-- migrations tree — it ran on the default PUBLIC grant alone. The GRANT above
-- is therefore this function's FIRST explicit grant, not a narrowing of one.

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. rpc_create_rental(jsonb) — creates rentals. Live body is 0005's (never
--    redefined since).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION rpc_create_rental(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rental_id  UUID;
  v_payment    jsonb;
BEGIN
  IF (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))) IS NOT TRUE THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_rental_id := (payload->>'id')::uuid;

  INSERT INTO rentals (
    id, user_id, vehicle_id,
    start_at, due_at, status,
    paket_hari, paket_jam, tarif,
    add_on, jaminan, kondisi_keluar,
    discount, notes, tujuan
  ) VALUES (
    v_rental_id,
    (payload->>'userId')::uuid,
    (payload->>'vehicleId')::uuid,
    (payload->>'startAt')::timestamptz,
    (payload->>'dueAt')::timestamptz,
    'ACTIVE',
    (payload->>'paketHari')::smallint,
    (payload->>'paketJam')::smallint,
    (payload->>'tarif')::int,
    COALESCE(payload->'addOn',          '{"description":"","amount":0}'::jsonb),
    COALESCE(payload->'jaminan',        '{"items":[]}'::jsonb),
    COALESCE(payload->'kondisiKeluar',  '{"bensinKotak":4,"km":null,"photos":[]}'::jsonb),
    COALESCE((payload->>'discount')::int, 0),
    COALESCE(payload->>'notes', ''),
    payload->>'tujuan'
  );

  FOR v_payment IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'newPayments', '[]'::jsonb))
  LOOP
    INSERT INTO payments (rental_id, amount, method, method_description, paid_at, notes)
    VALUES (
      v_rental_id,
      (v_payment->>'amount')::int,
      (v_payment->>'method')::payment_method,
      v_payment->>'methodDescription',
      COALESCE((v_payment->>'paidAt')::timestamptz, now()),
      v_payment->>'notes'
    );
  END LOOP;

  UPDATE vehicles SET status = 'DISEWA' WHERE id = (payload->>'vehicleId')::uuid;

  RETURN jsonb_build_object('rentalId', v_rental_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_create_rental(jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION rpc_create_rental(jsonb) TO authenticated;
-- ⚠️ Same as above: no prior GRANT statement exists for this function anywhere.

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. rpc_close_rental(uuid, jsonb) — money. Live body is 0015's version (which
--    redefined 0014's, which redefined 0005's, to persist `tujuan` on return);
--    that is the version reproduced below.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION rpc_close_rental(p_rental_id uuid, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID;
  v_vehicle_id   UUID;
  v_subtotal     INTEGER;
  v_discount     INTEGER;
  v_charges_sum  INTEGER;
  v_total_bill   INTEGER;
  v_total_paid   INTEGER;
  v_sisa         INTEGER;
  v_fee          jsonb;
  v_payment      jsonb;
  v_hutang_id    UUID;
BEGIN
  IF (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))) IS NOT TRUE THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT user_id, vehicle_id
  INTO v_user_id, v_vehicle_id
  FROM rentals WHERE id = p_rental_id AND status = 'ACTIVE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental % not found or not ACTIVE', p_rental_id;
  END IF;

  v_subtotal := (payload->>'subtotalSewa')::int;
  v_discount := COALESCE((payload->>'discount')::int, 0);

  -- Update rental (tujuan line added in 0015)
  UPDATE rentals SET
    returned_at     = (payload->>'returnedAt')::timestamptz,
    kondisi_kembali = payload->'kondisiKembali',
    status          = 'COMPLETED',
    subtotal_sewa   = v_subtotal,
    discount        = v_discount,
    tujuan          = COALESCE(payload->>'tujuan', tujuan),
    notes           = COALESCE(payload->>'notes', '')
  WHERE id = p_rental_id;

  -- Insert return-time line items (extraFees)
  FOR v_fee IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'extraFees', '[]'::jsonb))
  LOOP
    INSERT INTO charges (rental_id, description, amount)
    VALUES (
      p_rental_id,
      v_fee->>'description',
      (v_fee->>'amount')::int
    );
  END LOOP;

  -- Compute total_bill (closed formula: subtotal_sewa + Σcharges - discount)
  SELECT COALESCE(SUM(amount), 0) INTO v_charges_sum FROM charges WHERE rental_id = p_rental_id;
  v_total_bill := GREATEST(0, v_subtotal + v_charges_sum - v_discount);

  -- Insert return payments
  FOR v_payment IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'newPayments', '[]'::jsonb))
  LOOP
    INSERT INTO payments (rental_id, amount, method, method_description, paid_at, notes)
    VALUES (
      p_rental_id,
      (v_payment->>'amount')::int,
      (v_payment->>'method')::payment_method,
      v_payment->>'methodDescription',
      COALESCE((v_payment->>'paidAt')::timestamptz, now()),
      v_payment->>'notes'
    );
  END LOOP;

  -- Compute sisa and conditionally create hutang
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM payments WHERE rental_id = p_rental_id;
  v_sisa := v_total_bill - v_total_paid;

  IF v_sisa > 0 THEN
    INSERT INTO hutang (user_id, rental_id, jumlah_awal, status)
    VALUES (v_user_id, p_rental_id, v_sisa, 'AKTIF')
    RETURNING id INTO v_hutang_id;
  END IF;

  -- Release vehicle
  UPDATE vehicles SET status = 'TERSEDIA' WHERE id = v_vehicle_id;

  RETURN jsonb_build_object(
    'rentalId', p_rental_id,
    'hutangId', v_hutang_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_close_rental(uuid, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION rpc_close_rental(uuid, jsonb) TO authenticated;
-- ⚠️ Same as above: no prior GRANT statement exists for this function anywhere.
-- 🐛 NOT FIXED HERE (reported, not touched — body-invariance): the v_total_paid
-- computation at "Compute sisa" above sums ALL payments for the rental,
-- including soft-deleted ones (missing the `AND deleted_at IS NULL` filter
-- that 0014 added to v_rentals/v_hutang/recompute_rental_hutang's equivalent
-- sums). A payment soft-deleted before this rental is ever closed would still
-- count toward "already paid" here, understating sisa and therefore the
-- auto-created hutang. Pre-existing since 0005; out of scope for this
-- security-only migration.

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. rpc_update_payment(uuid, jsonb) — money. Live body is 0014's (only ever
--    defined once). Three guard sites converted.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION rpc_update_payment(p_payment_id uuid, patch jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rental_id      UUID;
  v_hutang_id_pay  UUID;
  v_rental_status  rental_status;
BEGIN
  -- Resolve parent; reject already-soft-deleted payments.
  SELECT rental_id, hutang_id INTO v_rental_id, v_hutang_id_pay
    FROM payments WHERE id = p_payment_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found or already deleted', p_payment_id;
  END IF;

  -- Authorization gate.
  IF v_rental_id IS NOT NULL THEN
    SELECT status INTO v_rental_status FROM rentals WHERE id = v_rental_id;
    IF v_rental_status = 'COMPLETED' THEN
      -- Closed-rental edit: admin only.
      IF (auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin')) IS NOT TRUE THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    ELSE
      IF (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))) IS NOT TRUE THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    END IF;
  ELSE
    -- Hutang payment: any operator.
    IF (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))) IS NOT TRUE THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;
  END IF;

  -- Apply the patch.
  UPDATE payments SET
    amount             = (patch->>'amount')::int,
    method             = (patch->>'method')::payment_method,
    method_description = patch->>'methodDescription',
    paid_at            = (patch->>'paidAt')::timestamptz,
    notes              = patch->>'notes'
  WHERE id = p_payment_id;

  -- Closed-rental edit: recompute hutang (trigger won't fire for rental-id payments).
  IF v_rental_id IS NOT NULL AND v_rental_status = 'COMPLETED' THEN
    PERFORM recompute_rental_hutang(v_rental_id);
  END IF;
  -- Hutang-parent edits: trg_fn_recompute_hutang_status fires automatically.
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_update_payment(uuid, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION rpc_update_payment(uuid, jsonb) TO authenticated;
-- 0014 already GRANTed this to authenticated; this REVOKE/GRANT pair is the
-- first time PUBLIC/anon are explicitly closed off (F-2).

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. rpc_delete_payment(uuid) — money. Live body is 0014's (only ever defined
--    once). Three guard sites converted, identical shape to #4.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION rpc_delete_payment(p_payment_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rental_id      UUID;
  v_hutang_id_pay  UUID;
  v_rental_status  rental_status;
BEGIN
  -- Resolve parent; reject already-soft-deleted payments.
  SELECT rental_id, hutang_id INTO v_rental_id, v_hutang_id_pay
    FROM payments WHERE id = p_payment_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found or already deleted', p_payment_id;
  END IF;

  -- Authorization gate (same logic as rpc_update_payment).
  IF v_rental_id IS NOT NULL THEN
    SELECT status INTO v_rental_status FROM rentals WHERE id = v_rental_id;
    IF v_rental_status = 'COMPLETED' THEN
      IF (auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin')) IS NOT TRUE THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    ELSE
      IF (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))) IS NOT TRUE THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    END IF;
  ELSE
    IF (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))) IS NOT TRUE THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;
  END IF;

  -- Soft-delete: UPDATE fires trg_audit_payments + trg_fn_recompute_hutang_status.
  UPDATE payments SET deleted_at = now() WHERE id = p_payment_id;

  -- Closed-rental deletion: recompute hutang (rental-id → trigger no-ops).
  IF v_rental_id IS NOT NULL AND v_rental_status = 'COMPLETED' THEN
    PERFORM recompute_rental_hutang(v_rental_id);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_delete_payment(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION rpc_delete_payment(uuid) TO authenticated;
-- 0014 already GRANTed this to authenticated; this REVOKE/GRANT pair is the
-- first time PUBLIC/anon are explicitly closed off (F-2).

-- ═══════════════════════════════════════════════════════════════════════════
-- 6-9. rpc_admin_delete_rental / _hutang / _user / _vehicle (uuid) — cascade
--      delete. Live bodies are 0016's (only ever defined once each). One
--      guard site each, all the same `!=` shape.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION rpc_admin_delete_rental(p_rental_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_id UUID;
  v_status     rental_status;
BEGIN
  IF (auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin')) IS NOT TRUE THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT vehicle_id, status INTO v_vehicle_id, v_status
    FROM rentals WHERE id = p_rental_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental % not found', p_rental_id;
  END IF;

  -- Linked hutang (auto-debt) and its payments first.
  DELETE FROM payments
    WHERE hutang_id IN (SELECT id FROM hutang WHERE rental_id = p_rental_id);
  DELETE FROM hutang WHERE rental_id = p_rental_id;

  -- Rental's own payments and charges.
  DELETE FROM payments WHERE rental_id = p_rental_id;
  DELETE FROM charges  WHERE rental_id = p_rental_id;

  -- The rental itself.
  DELETE FROM rentals WHERE id = p_rental_id;

  -- Release the vehicle if the rental was ACTIVE (mirrors rpc_close_rental).
  IF v_status = 'ACTIVE' THEN
    UPDATE vehicles SET status = 'TERSEDIA' WHERE id = v_vehicle_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_admin_delete_hutang(p_hutang_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin')) IS NOT TRUE THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM hutang WHERE id = p_hutang_id) THEN
    RAISE EXCEPTION 'Hutang % not found', p_hutang_id;
  END IF;

  DELETE FROM payments WHERE hutang_id = p_hutang_id;
  DELETE FROM hutang   WHERE id = p_hutang_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_admin_delete_user(p_user_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin')) IS NOT TRUE THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM rentals WHERE user_id = p_user_id)
     OR EXISTS (SELECT 1 FROM hutang WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Tidak bisa dihapus: masih ada rental/hutang terkait';
  END IF;

  DELETE FROM users WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_admin_delete_vehicle(p_vehicle_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin')) IS NOT TRUE THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id) THEN
    RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
  END IF;

  IF EXISTS (SELECT 1 FROM rentals WHERE vehicle_id = p_vehicle_id) THEN
    RAISE EXCEPTION 'Tidak bisa dihapus: masih ada rental terkait';
  END IF;

  DELETE FROM vehicles WHERE id = p_vehicle_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_admin_delete_rental(uuid)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION rpc_admin_delete_hutang(uuid)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION rpc_admin_delete_user(uuid)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION rpc_admin_delete_vehicle(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION rpc_admin_delete_rental(uuid)  TO authenticated;
GRANT  EXECUTE ON FUNCTION rpc_admin_delete_hutang(uuid)  TO authenticated;
GRANT  EXECUTE ON FUNCTION rpc_admin_delete_user(uuid)    TO authenticated;
GRANT  EXECUTE ON FUNCTION rpc_admin_delete_vehicle(uuid) TO authenticated;
-- 0016 already GRANTed all four to authenticated; this REVOKE/GRANT pass is
-- the first time PUBLIC/anon are explicitly closed off (F-2). These four
-- guard rendering the admin-only cascade-delete surface is the single highest
-- blast-radius item in this migration.

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. recompute_rental_hutang(uuid) — the sharpest item (PM finding, see
--     docs/reports/v1-0-3.md). SECURITY DEFINER, rewrites hutang.jumlah_awal,
--     and — unlike the nine above — has NO auth guard of any kind in its body;
--     its only stated protection was the comment "No GRANT — not callable
--     directly by clients", which is FALSE under F-2 (PostgreSQL's default
--     PUBLIC EXECUTE grant was never revoked for it either).
--
--     Direct-caller search (this session): grepped app/ (the whole connector
--     layer) and every migration in supabase/migrations/ for
--     "recompute_rental_hutang". Zero client-side call sites. The only two
--     call sites in the entire project are `PERFORM recompute_rental_hutang(...)`
--     inside rpc_update_payment and rpc_delete_payment (both 0014,
--     SECURITY DEFINER) — internal server-side calls, unaffected by the
--     caller's own grants (SECURITY DEFINER functions run as their owner
--     regardless of who invoked them).
--
--     Per Farrel's decision tree (zero direct client callers → fully close):
--     REVOKE FROM PUBLIC, anon, AND authenticated. No GRANT is added back for
--     any role — nothing legitimate calls this directly, ever.
--
--     Body is NOT touched: it has no auth check to convert (there is nothing
--     to make NULL-safe), so there is no CREATE OR REPLACE for it in this
--     migration — only the REVOKE below.
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION recompute_rental_hutang(uuid) FROM PUBLIC, anon, authenticated;
