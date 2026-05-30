-- 0009_hutang_views.sql
-- Creates v_hutang view: hutang rows + user name + payments JSONB aggregate.
-- Used by Phase 5c getHutangs/getHutangFull connectors.

DROP VIEW IF EXISTS v_hutang;
CREATE VIEW v_hutang AS
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
     WHERE p.hutang_id = h.id),
    '[]'::jsonb
  ) AS payments
FROM hutang h
JOIN users u ON u.id = h.user_id;
