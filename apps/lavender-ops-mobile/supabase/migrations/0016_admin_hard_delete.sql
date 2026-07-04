-- 0016_admin_hard_delete.sql
-- v1.0.1 Item 6: admin-only hard-delete RPCs.
--
-- All four are SECURITY DEFINER, SET search_path = public, admin-gated, and
-- GRANT EXECUTE TO authenticated. Admin gate (mirrors the closed-rental gate in
-- 0014): auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin').
--
-- No FK in 0003_tables.sql declares ON DELETE CASCADE, so each RPC walks the graph:
--   rental  → cascade OWNED children (payments, charges, linked hutang + its payments),
--             release the vehicle if the rental was ACTIVE.
--   hutang  → cascade OWNED payments, then the hutang.
--   user    → BLOCK if referenced by any rental or hutang; else delete.
--   vehicle → BLOCK if referenced by any rental; else delete.

-- ─── rpc_admin_delete_rental ────────────────────────────────────────────────────
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
  IF auth.uid() != (SELECT user_id FROM app_config WHERE role = 'admin') THEN
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

-- ─── rpc_admin_delete_hutang ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_admin_delete_hutang(p_hutang_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != (SELECT user_id FROM app_config WHERE role = 'admin') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM hutang WHERE id = p_hutang_id) THEN
    RAISE EXCEPTION 'Hutang % not found', p_hutang_id;
  END IF;

  DELETE FROM payments WHERE hutang_id = p_hutang_id;
  DELETE FROM hutang   WHERE id = p_hutang_id;
END;
$$;

-- ─── rpc_admin_delete_user (BLOCK IF REFERENCED) ────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_admin_delete_user(p_user_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != (SELECT user_id FROM app_config WHERE role = 'admin') THEN
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

-- ─── rpc_admin_delete_vehicle (BLOCK IF REFERENCED) ─────────────────────────────
CREATE OR REPLACE FUNCTION rpc_admin_delete_vehicle(p_vehicle_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != (SELECT user_id FROM app_config WHERE role = 'admin') THEN
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

-- ─── Grants ─────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION rpc_admin_delete_rental(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_admin_delete_hutang(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_admin_delete_user(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_admin_delete_vehicle(uuid) TO authenticated;
