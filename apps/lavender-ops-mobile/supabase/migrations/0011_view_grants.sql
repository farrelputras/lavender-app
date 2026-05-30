-- 0011_view_grants.sql
-- Grant SELECT on all views to the authenticated role.
-- Views are not tables — Supabase's default ALTER DEFAULT PRIVILEGES covers tables
-- but views created in migrations must be granted explicitly.
-- RLS on the underlying tables still applies (views use SECURITY INVOKER).

GRANT SELECT ON v_rentals           TO authenticated;
GRANT SELECT ON v_user_summaries    TO authenticated;
GRANT SELECT ON v_vehicle_summaries TO authenticated;
GRANT SELECT ON v_rentals_due_today TO authenticated;
GRANT SELECT ON v_hutang            TO authenticated;
GRANT SELECT ON v_rental_list       TO authenticated;
