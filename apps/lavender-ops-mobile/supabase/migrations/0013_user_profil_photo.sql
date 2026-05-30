-- 0013_user_profil_photo.sql
-- Adds profil_photo column to users for Phase 6 portrait recognition.
-- Same {id, path} JSONB shape as ktp_photo and ktm_photo.
-- Path pattern: users/{userId}/profil/<uuid>.jpg

ALTER TABLE users
  ADD COLUMN profil_photo JSONB;

-- Rebuild v_user_summaries so the new column is visible in the view.
-- View body unchanged otherwise — only the SELECT list is widened.
DROP VIEW IF EXISTS v_user_summaries;
CREATE VIEW v_user_summaries AS
SELECT
  u.id,
  u.name,
  u.nickname,
  u.phone,
  u.is_mahasiswa,
  u.verification_status,
  u.verified_at,
  u.nama_pddikti,
  u.tahun_masuk,
  u.universitas,
  u.prodi,
  u.alamat,
  u.kontak_darurat,
  u.notes,
  u.ktp_photo,
  u.ktm_photo,
  u.profil_photo,
  u.deleted_at,
  u.created_at,
  u.updated_at,
  u.created_by,
  u.updated_by,
  COALESCE(ar.cnt, 0)::int  AS active_rentals_count,
  COALESCE(d.sisa, 0)::int  AS debt_amount
FROM users u
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS cnt
  FROM rentals r
  WHERE r.user_id = u.id AND r.status = 'ACTIVE'
) ar ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(h.jumlah_awal), 0)
       - COALESCE((
           SELECT SUM(p.amount)
           FROM payments p
           WHERE p.hutang_id IN (
             SELECT id FROM hutang h2
             WHERE h2.user_id = u.id AND h2.status = 'AKTIF'
           )
         ), 0) AS sisa
  FROM hutang h
  WHERE h.user_id = u.id AND h.status = 'AKTIF'
) d ON true
WHERE u.deleted_at IS NULL;

GRANT SELECT ON v_user_summaries TO authenticated;
