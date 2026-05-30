-- Phase 4: Views and RPCs
-- Views use SECURITY INVOKER (default) — RLS applies via caller's auth.uid().
-- Write RPCs (create/close rental) use SECURITY DEFINER for multi-table atomicity,
-- with an explicit auth.uid() operator check inside the function body.

-- ─── v_rentals ────────────────────────────────────────────────────────────────
-- totalBill formula:
--   ACTIVE  → GREATEST(0, tarif + add_on.amount - discount)
--   CLOSED  → GREATEST(0, subtotal_sewa + Σcharges - discount)
-- totalPaid → sum of payments.amount WHERE rental_id = r.id
-- payments  → JSON array of Payment objects (camelCase keys for connector)
-- charges   → JSON array of Charge objects

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
  WHERE rental_id = r.id
) p_agg ON true;

-- ─── v_user_summaries ─────────────────────────────────────────────────────────
-- Includes all user columns plus computed activeRentalsCount and debtAmount.
-- debtAmount = sum of sisa (jumlah_awal - paid) for AKTIF hutang records.
-- Excludes soft-deleted users (deleted_at IS NULL).

CREATE OR REPLACE VIEW v_user_summaries AS
SELECT
  u.id,
  u.name,
  u.nickname,
  u.phone,
  u.is_mahasiswa,
  u.verified_at,
  u.verification_status,
  u.nama_pddikti,
  u.tahun_masuk,
  u.universitas,
  u.prodi,
  u.alamat,
  u.kontak_darurat,
  u.notes,
  u.deleted_at,
  u.created_at,
  u.updated_at,
  u.created_by,
  u.updated_by,
  COALESCE(r_agg.active_rentals_count, 0) AS active_rentals_count,
  COALESCE(h_agg.debt_amount, 0) AS debt_amount
FROM users u
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS active_rentals_count
  FROM rentals
  WHERE user_id = u.id AND status = 'ACTIVE'
) r_agg ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(
    h.jumlah_awal - COALESCE(
      (SELECT SUM(p.amount) FROM payments p WHERE p.hutang_id = h.id),
      0
    )
  ), 0)::int AS debt_amount
  FROM hutang h
  WHERE h.user_id = u.id AND h.status = 'AKTIF'
) h_agg ON true
WHERE u.deleted_at IS NULL;

-- ─── v_vehicle_summaries ──────────────────────────────────────────────────────
-- Excludes soft-deleted vehicles. Adds computed 'available' boolean.

CREATE OR REPLACE VIEW v_vehicle_summaries AS
SELECT
  id,
  name,
  plate,
  category,
  rate_6h,
  rate_12h,
  rate_24h,
  status,
  tahun,
  warna,
  notes,
  deleted_at,
  created_at,
  updated_at,
  created_by,
  updated_by,
  (status = 'TERSEDIA') AS available
FROM vehicles
WHERE deleted_at IS NULL;

-- ─── v_rentals_due_today ──────────────────────────────────────────────────────
-- Active rentals whose due_at falls on today (server date).

CREATE OR REPLACE VIEW v_rentals_due_today AS
SELECT
  r.id,
  r.user_id,
  r.vehicle_id,
  r.due_at,
  r.start_at,
  u.name  AS user_name,
  u.phone AS user_phone,
  u.nickname AS user_nickname,
  v.name  AS vehicle_name,
  v.plate AS vehicle_plate
FROM rentals r
JOIN users    u ON u.id = r.user_id
JOIN vehicles v ON v.id = r.vehicle_id
WHERE r.due_at::date = CURRENT_DATE
  AND r.status = 'ACTIVE';

-- ─── rpc_get_dashboard_summary ────────────────────────────────────────────────
-- Returns a JSON object with all DashboardSummary fields.
-- Caller must be an authenticated operator (mom or farrel).

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
          (SELECT SUM(p.amount) FROM payments p WHERE p.hutang_id = h.id),
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

-- ─── rpc_create_rental ────────────────────────────────────────────────────────
-- Atomically: INSERT rental (client-minted id), INSERT payments, set vehicle DISEWA.
-- Payload keys use camelCase to match the connector's CreateRentalInput shape.

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
  IF auth.uid() NOT IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')) THEN
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

-- ─── rpc_close_rental ─────────────────────────────────────────────────────────
-- Atomically: UPDATE rentals (status=COMPLETED, kondisi_kembali, subtotal_sewa,
-- discount REPLACES, returned_at, notes), INSERT charges (extraFees), INSERT
-- payments, conditionally INSERT hutang when sisa > 0, UPDATE vehicle TERSEDIA.

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
