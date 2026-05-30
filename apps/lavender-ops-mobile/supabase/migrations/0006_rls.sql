-- Phase 4: Row Level Security policies
-- Both operators (ops, admin) have full CRUD on all operational tables.
-- Hard DELETE is denied everywhere (no DELETE policies created).
-- app_config: any authenticated user can SELECT; only admin can UPDATE.
-- Storage policies for the rental-photos bucket are at the bottom.

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutang      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config  ENABLE ROW LEVEL SECURITY;

-- ─── users ────────────────────────────────────────────────────────────────────

CREATE POLICY "operators_select_users" ON users
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))
    AND deleted_at IS NULL
  );

CREATE POLICY "operators_insert_users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_update_users" ON users
  FOR UPDATE TO authenticated
  USING  (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

-- ─── vehicles ─────────────────────────────────────────────────────────────────

CREATE POLICY "operators_select_vehicles" ON vehicles
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))
    AND deleted_at IS NULL
  );

CREATE POLICY "operators_insert_vehicles" ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_update_vehicles" ON vehicles
  FOR UPDATE TO authenticated
  USING  (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

-- ─── rentals ──────────────────────────────────────────────────────────────────

CREATE POLICY "operators_select_rentals" ON rentals
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_insert_rentals" ON rentals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_update_rentals" ON rentals
  FOR UPDATE TO authenticated
  USING  (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

-- ─── charges ──────────────────────────────────────────────────────────────────

CREATE POLICY "operators_select_charges" ON charges
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_insert_charges" ON charges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

-- ─── payments ─────────────────────────────────────────────────────────────────

CREATE POLICY "operators_select_payments" ON payments
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_insert_payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_update_payments" ON payments
  FOR UPDATE TO authenticated
  USING  (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

-- ─── hutang ───────────────────────────────────────────────────────────────────

CREATE POLICY "operators_select_hutang" ON hutang
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_insert_hutang" ON hutang
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

CREATE POLICY "operators_update_hutang" ON hutang
  FOR UPDATE TO authenticated
  USING  (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin')));

-- ─── app_config ───────────────────────────────────────────────────────────────
-- Any authenticated user can SELECT (required: RLS subqueries on other tables
-- reference app_config; those subqueries must succeed for any operator session).
-- Only farrel can UPDATE (UID rotation is rare and security-sensitive).
-- INSERT and DELETE are blocked by default (no permissive policies created).

CREATE POLICY "all_authenticated_select_config" ON app_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "farrel_update_config" ON app_config
  FOR UPDATE TO authenticated
  USING  (auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin'))
  WITH CHECK (auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin'));

-- ─── Storage: rental-photos bucket ────────────────────────────────────────────
-- The bucket must be created manually in the Supabase Storage dashboard as
-- PRIVATE before these policies take effect.
-- Phase 6 (photo upload) depends on these policies being in place.

CREATE POLICY "operators_select_photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'rental-photos'
    AND auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))
  );

CREATE POLICY "operators_insert_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rental-photos'
    AND auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'))
  );
