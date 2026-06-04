-- 0014_payment_edit_delete.sql
-- Phase 7 Stage C: soft-delete payments + edit/delete RPCs
--
-- Changes:
--   1. ADD COLUMN payments.deleted_at TIMESTAMPTZ  (soft-delete marker)
--   2. Thread `deleted_at IS NULL` through all payment-summing SQL objects
--   3. New helper: recompute_rental_hutang (for closed-rental admin edits)
--   4. New RPCs: rpc_update_payment, rpc_delete_payment (with auth gates)
--
-- Approach: CREATE OR REPLACE throughout (never DROP) to preserve the
-- GRANT SELECT/EXECUTE grants applied by 0011_view_grants.sql and prior
-- migrations. v_rental_list depends on v_rentals via JOIN — DROP would cascade.

-- ─── 1. Soft-delete column ──────────────────────────────────────────────────────

ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ─── 2a. v_rentals — filter soft-deleted payments ──────────────────────────────

CREATE OR REPLACE VIEW v_rentals AS
SELECT
  r.id,
  r.user_id,
  r.vehicle_id,
  r.start_at,
  r.due_at,
  r.returned_at,
  r.status,
  r.paket_hari,
  r.paket_jam,
  r.tarif,
  r.subtotal_sewa,
  r.add_on,
  r.jaminan,
  r.kondisi_keluar,
  r.kondisi_kembali,
  r.discount,
  r.notes,
  r.tujuan,
  r.created_at,
  r.updated_at,
  r.created_by,
  r.updated_by,
  CASE
    WHEN r.subtotal_sewa IS NOT NULL THEN
      GREATEST(0, r.subtotal_sewa + COALESCE(c_agg.charges_sum, 0) - r.discount)
    ELSE
      GREATEST(0, r.tarif + COALESCE((r.add_on->>'amount')::int, 0) - r.discount)
  END AS total_bill,
  COALESCE(p_agg.total_paid, 0) AS total_paid,
  COALESCE(p_agg.payments_json, '[]'::jsonb) AS payments,
  COALESCE(c_agg.charges_json, '[]'::jsonb) AS charges
FROM rentals r
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(amount), 0) AS charges_sum,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'rentalId', rental_id,
          'description', description,
          'amount', amount
        ) ORDER BY created_at
      ),
      '[]'::jsonb
    ) AS charges_json
  FROM charges
  WHERE rental_id = r.id
) c_agg ON true
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(amount), 0) AS total_paid,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'rentalId', rental_id,
          'amount', amount,
          'method', method,
          'methodDescription', method_description,
          'paidAt', paid_at,
          'notes', notes
        ) ORDER BY paid_at
      ),
      '[]'::jsonb
    ) AS payments_json
  FROM payments
  WHERE rental_id = r.id AND deleted_at IS NULL
) p_agg ON true;

-- ─── 2b. v_hutang — filter soft-deleted payments ───────────────────────────────

CREATE OR REPLACE VIEW v_hutang AS
SELECT
  h.id,
  h.user_id,
  u.name        AS user_name,
  h.rental_id,
  h.jumlah_awal,
  h.status,
  h.notes,
  h.created_at,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'id', p.id,
         'amount', p.amount,
         'method', p.method,
         'method_description', p.method_description,
         'paid_at', p.paid_at,
         'notes', p.notes
       ) ORDER BY p.paid_at
     )
     FROM payments p
     WHERE p.hutang_id = h.id AND p.deleted_at IS NULL),
    '[]'::jsonb
  ) AS payments
FROM hutang h
JOIN users u ON u.id = h.user_id;

-- ─── 2c. v_user_summaries — filter soft-deleted hutang payments ─────────────────
-- Must DROP+CREATE because 0008 and 0013 used DROP+CREATE (not CREATE OR REPLACE),
-- so PostgreSQL tracks this view as one created by CREATE VIEW, not REPLACE.
-- Column list matches the live definition from 0013 (ktp_photo, ktm_photo, profil_photo).
-- Debt formula matches 0013's live formula; only adds AND p.deleted_at IS NULL.
-- GRANT is re-added below (DROP removes it).

DROP VIEW IF EXISTS v_user_summaries;
CREATE VIEW v_user_summaries AS
SELECT
  u.id,
  u.name,
  u.nickname,
  u.phone,
  u.is_mahasiswa,
  u.verification_status,
  u.verified_at,
  u.nama_pddikti,
  u.tahun_masuk,
  u.universitas,
  u.prodi,
  u.alamat,
  u.kontak_darurat,
  u.notes,
  u.ktp_photo,
  u.ktm_photo,
  u.profil_photo,
  u.deleted_at,
  u.created_at,
  u.updated_at,
  u.created_by,
  u.updated_by,
  COALESCE(ar.cnt, 0)::int  AS active_rentals_count,
  COALESCE(d.sisa, 0)::int  AS debt_amount
FROM users u
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS cnt
  FROM rentals r
  WHERE r.user_id = u.id AND r.status = 'ACTIVE'
) ar ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(h.jumlah_awal), 0)
       - COALESCE((
           SELECT SUM(p.amount)
           FROM payments p
           WHERE p.hutang_id IN (
             SELECT id FROM hutang h2
             WHERE h2.user_id = u.id AND h2.status = 'AKTIF'
           ) AND p.deleted_at IS NULL
         ), 0) AS sisa
  FROM hutang h
  WHERE h.user_id = u.id AND h.status = 'AKTIF'
) d ON true
WHERE u.deleted_at IS NULL;

GRANT SELECT ON v_user_summaries TO authenticated;

-- ─── 2d. rpc_get_dashboard_summary — filter soft-deleted hutang payments ────────

CREATE OR REPLACE FUNCTION rpc_get_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() NOT IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')) THEN
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

-- ─── 2e. trg_fn_recompute_hutang_status — filter soft-deleted payments ──────────
-- The trigger fires AFTER INSERT/UPDATE/DELETE on payments.
-- Soft-delete is an UPDATE; the trigger fires and correctly excludes the
-- soft-deleted row (deleted_at IS NULL filter below).

CREATE OR REPLACE FUNCTION trg_fn_recompute_hutang_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h_id UUID;
BEGIN
  -- On DELETE only OLD exists; on INSERT only NEW; on UPDATE both exist.
  IF TG_OP = 'DELETE' THEN
    h_id := OLD.hutang_id;
  ELSE
    h_id := NEW.hutang_id;
  END IF;

  IF h_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE hutang
  SET status = CASE
    WHEN (
      jumlah_awal - COALESCE(
        (SELECT SUM(amount) FROM payments WHERE hutang_id = h_id AND deleted_at IS NULL),
        0
      )
    ) <= 0 THEN 'LUNAS'::hutang_status
    ELSE 'AKTIF'::hutang_status
  END
  WHERE id = h_id;

  RETURN NULL;
END;
$$;

-- ─── 2f. rpc_close_rental — filter soft-deleted payments in total_paid sum ──────

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
  IF auth.uid() NOT IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')) THEN
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

  -- Update rental
  UPDATE rentals SET
    returned_at     = (payload->>'returnedAt')::timestamptz,
    kondisi_kembali = payload->'kondisiKembali',
    status          = 'COMPLETED',
    subtotal_sewa   = v_subtotal,
    discount        = v_discount,
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

  -- Compute sisa (exclude soft-deleted payments) and conditionally create hutang.
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments WHERE rental_id = p_rental_id AND deleted_at IS NULL;
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

-- ─── 3. recompute_rental_hutang — helper for closed-rental payment edits ────────
-- Recomputes the hutang linked to a COMPLETED rental after any of its payments
-- are edited or soft-deleted.
--
-- Invariant: jumlah_awal = total_bill − Σ non-deleted rental payments.
--            hutang's own payments are netted separately in v_hutang.sisa.
-- Status CASE kept byte-identical to trg_fn_recompute_hutang_status above.
-- SECURITY DEFINER; called only by rpc_update_payment / rpc_delete_payment.
-- No GRANT — not callable directly by clients.

CREATE OR REPLACE FUNCTION recompute_rental_hutang(p_rental_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_bill   INTEGER;
  v_rental_paid  INTEGER;
  v_sisa         INTEGER;
  v_new_jumlah   INTEGER;
  v_hutang_id    UUID;
  v_hutang_paid  INTEGER;
  v_user_id      UUID;
BEGIN
  -- Compute rental-side totals from the live view (handles COMPLETED correctly).
  SELECT total_bill INTO v_total_bill FROM v_rentals WHERE id = p_rental_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_rental_paid
    FROM payments WHERE rental_id = p_rental_id AND deleted_at IS NULL;

  v_sisa       := v_total_bill - v_rental_paid;
  v_new_jumlah := GREATEST(0, v_sisa);

  -- Check for an existing hutang linked to this rental.
  SELECT id INTO v_hutang_id FROM hutang WHERE rental_id = p_rental_id LIMIT 1;

  IF FOUND THEN
    -- Update jumlah_awal + recompute status.
    -- Formula identical to trg_fn_recompute_hutang_status (using new jumlah_awal).
    SELECT COALESCE(SUM(amount), 0) INTO v_hutang_paid
      FROM payments WHERE hutang_id = v_hutang_id AND deleted_at IS NULL;

    UPDATE hutang
    SET jumlah_awal = v_new_jumlah,
        status = CASE
          WHEN (v_new_jumlah - v_hutang_paid) <= 0 THEN 'LUNAS'::hutang_status
          ELSE 'AKTIF'::hutang_status
        END
    WHERE id = v_hutang_id;

  ELSIF v_sisa > 0 THEN
    -- Rental was fully paid at close; this edit created a new shortfall — create hutang.
    SELECT user_id INTO v_user_id FROM rentals WHERE id = p_rental_id;
    INSERT INTO hutang (user_id, rental_id, jumlah_awal, status)
    VALUES (v_user_id, p_rental_id, v_new_jumlah, 'AKTIF');
  END IF;
  -- If v_sisa <= 0 and no hutang: nothing to do (already fully paid).
  -- If hutang exists with v_new_jumlah = 0: set LUNAS with jumlah_awal=0 (zombie row).
END;
$$;

-- ─── 4. rpc_update_payment ──────────────────────────────────────────────────────
-- Auth gates:
--   rental + ACTIVE    → ops | admin (any operator, including mom)
--   rental + COMPLETED → admin only  (Farrel emergency correction)
--   hutang             → ops | admin (any operator)
-- Rejects already-soft-deleted payments (idempotency guard).
-- For COMPLETED-rental edits: calls recompute_rental_hutang after applying patch.
-- For hutang-parent edits: trg_fn_recompute_hutang_status fires automatically.

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
      IF auth.uid() != (SELECT user_id FROM app_config WHERE role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    ELSE
      IF auth.uid() NOT IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')) THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    END IF;
  ELSE
    -- Hutang payment: any operator.
    IF auth.uid() NOT IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')) THEN
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

-- ─── 5. rpc_delete_payment ──────────────────────────────────────────────────────
-- Same auth gate as rpc_update_payment.
-- Sets deleted_at = now() (soft-delete via UPDATE).
-- The UPDATE fires: trg_audit_payments (updated_at/by), and for hutang-parent
-- payments: trg_fn_recompute_hutang_status (status recomputed automatically).
-- For COMPLETED-rental deletions: calls recompute_rental_hutang.

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
      IF auth.uid() != (SELECT user_id FROM app_config WHERE role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    ELSE
      IF auth.uid() NOT IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')) THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    END IF;
  ELSE
    IF auth.uid() NOT IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')) THEN
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

-- ─── 6. Grants ──────────────────────────────────────────────────────────────────
-- Only the two client-callable RPCs need GRANT EXECUTE.
-- recompute_rental_hutang is internal-only; no client grant.

GRANT EXECUTE ON FUNCTION rpc_update_payment(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_delete_payment(uuid)        TO authenticated;
