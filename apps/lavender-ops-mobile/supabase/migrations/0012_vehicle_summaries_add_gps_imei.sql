-- 0012_vehicle_summaries_add_gps_imei.sql
-- v_vehicle_summaries was created in 0005 before 0007 added gps/imei columns.
-- Explicit column lists in views don't auto-update — replace the view to include them.

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
  gps,
  imei,
  notes,
  deleted_at,
  created_at,
  updated_at,
  created_by,
  updated_by,
  (status = 'TERSEDIA') AS available
FROM vehicles
WHERE deleted_at IS NULL;

GRANT SELECT ON v_vehicle_summaries TO authenticated;
