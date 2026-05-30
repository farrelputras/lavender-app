-- 0010_rental_list_view.sql
-- Creates v_rental_list view for the Rental tab list screen.
-- Joins v_rentals for total_bill/total_paid aggregates.

DROP VIEW IF EXISTS v_rental_list;
CREATE VIEW v_rental_list AS
SELECT
  r.id,
  u.name        AS user_name,
  v.name        AS vehicle_name,
  v.plate       AS vehicle_plate,
  r.start_at,
  r.due_at,
  r.returned_at,
  r.status,
  vr.total_bill,
  vr.total_paid
FROM rentals r
JOIN users u ON u.id = r.user_id
JOIN vehicles v ON v.id = r.vehicle_id
JOIN v_rentals vr ON vr.id = r.id;
