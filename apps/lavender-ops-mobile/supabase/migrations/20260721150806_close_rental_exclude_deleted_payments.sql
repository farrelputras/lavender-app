-- ─── rpc_close_rental: exclude soft-deleted payments from v_total_paid ────────
--
-- WHAT THIS FILE CHANGES (complete list — this header is exhaustive by design;
-- see "why" below for what happens when a migration header is not):
--
--   1. `-- Compute sisa and conditionally create hutang`
--      → `-- Compute sisa (exclude soft-deleted payments) and conditionally create hutang.`
--   2. `SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM payments WHERE rental_id = p_rental_id;`
--      → the same statement with `AND deleted_at IS NULL` restored, wrapped to two
--        lines exactly as 0014 wrote it.
--
-- Nothing else. Every other line of the function body is byte-identical to
-- 20260720103317_rpc_auth_gate_hardening.sql's version — including the NULL-safe
-- `IS NOT TRUE` guard, which this migration must NOT undo. That invariance is
-- machine-checked by test/closeRentalBodyInvariance.test.ts.
--
-- ─── WHY ──────────────────────────────────────────────────────────────────────
--
-- This is a REGRESSION, not legacy debt. 0014_payment_edit_delete.sql:338-340
-- added the `AND deleted_at IS NULL` filter deliberately, with a comment saying so.
-- 0015_close_rental_tujuan.sql then CREATE OR REPLACE'd the whole function to add a
-- single `tujuan` line (its header claims only that) and silently dropped the filter.
--
-- Impact while unfixed: `v_rentals` DOES filter soft-deleted payments (0014:89), so
-- PengembalianScreen displays the CORRECT sisa. rpc_close_rental did not, so it
-- computed a LARGER total_paid → a SMALLER sisa → an auto-created hutang smaller
-- than the screen promised, or none at all (`IF v_sisa > 0` skips the INSERT).
-- Reachable by ops alone: PengembalianScreen calls deletePayment itself (:1022) and
-- RentalDetailScreen:719 lets ops edit/delete payments on an ACTIVE rental. Nothing
-- self-heals it — recompute_rental_hutang filters correctly but only runs on a later
-- payment edit, which on a COMPLETED rental is admin-only.
--
-- Violates docs/02-demo-development.md §6: "Sisa" = Total Tagihan − Σ pembayaran.
-- A soft-deleted payment has been retracted; it is not a pembayaran.
--
-- ─── ORDERING (load-bearing) ──────────────────────────────────────────────────
--
-- This file MUST sort after 20260720103317_rpc_auth_gate_hardening.sql, which also
-- CREATE OR REPLACEs rpc_close_rental. `db push` applies pending migrations in
-- version order, so the last definition wins. The body below is therefore based on
-- the HARDENED body, not 0015's — rebasing it on 0015 would restore the money filter
-- while silently reverting the auth fix, which is the same failure mode as 0015.
--
-- Kept as its own file (not folded into the hardening migration) so that migration's
-- body-invariance property stays intact, and so this money change is independently
-- reviewable and revertible.

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

-- Idempotent re-assertion of the hardening migration's end state. Not load-bearing
-- for the CREATE OR REPLACE above: that preserves an existing function's ownership
-- and ACL, so the REVOKE/GRANT applied by 20260720103317 survives it. Restated
-- anyway because the cost is two lines and the failure mode is severe in both
-- directions — a lost GRANT locks Mom out mid-handover, a lost REVOKE reopens the
-- function to `anon` (whose key ships in the sideloaded APK).
--
-- ⚠️ These lines ARE load-bearing in one direction. If an operator has run
-- supabase/ROLLBACK_restore_rpc_grants.sql during an outage (it re-GRANTs
-- rpc_close_rental to PUBLIC), a later `db push` that applies this migration will
-- silently re-REVOKE PUBLIC and undo that part of the rollback, with no warning.
-- After any emergency rollback, re-check grants before pushing again.
REVOKE EXECUTE ON FUNCTION rpc_close_rental(uuid, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION rpc_close_rental(uuid, jsonb) TO authenticated;
