-- ─── 0015 — rpc_close_rental: persist tujuan on return ───────────────────────
-- Adds `tujuan = COALESCE(payload->>'tujuan', tujuan)` to the UPDATE rentals
-- block so the destination can be corrected during the return flow.
-- COALESCE keeps the original value if the key is absent — backward-safe.

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

  -- Update rental (tujuan line added in this migration)
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
