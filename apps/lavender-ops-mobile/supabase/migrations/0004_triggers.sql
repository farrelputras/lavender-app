-- Phase 4: Triggers
-- 1. Audit fields trigger (BEFORE INSERT OR UPDATE on all 6 tables)
-- 2. hutang status recompute trigger (AFTER INSERT OR UPDATE OR DELETE on payments)

-- ─── Audit trigger ────────────────────────────────────────────────────────────
-- Sets created_at/created_by on INSERT, and updated_at/updated_by on every write.
-- SECURITY DEFINER so it can write to the columns even with RLS; auth.uid() still
-- resolves from the JWT (not from the definer role).

CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_users
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_vehicles
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_rentals
  BEFORE INSERT OR UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_charges
  BEFORE INSERT OR UPDATE ON charges
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_payments
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_hutang
  BEFORE INSERT OR UPDATE ON hutang
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── hutang status trigger ────────────────────────────────────────────────────
-- Fires AFTER any INSERT/UPDATE/DELETE on payments where hutang_id is involved.
-- Recomputes hutang.status: LUNAS when sisa <= 0, AKTIF otherwise.
-- Status is NEVER written directly by a connector — only by this trigger.

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
        (SELECT SUM(amount) FROM payments WHERE hutang_id = h_id),
        0
      )
    ) <= 0 THEN 'LUNAS'::hutang_status
    ELSE 'AKTIF'::hutang_status
  END
  WHERE id = h_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recompute_hutang_status
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_recompute_hutang_status();
