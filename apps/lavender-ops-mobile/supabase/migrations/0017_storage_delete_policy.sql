-- 0017_storage_delete_policy.sql
-- v1.0.1 Phase 3 follow-up: admin-only DELETE policy on the photo bucket.
--
-- 0006_rls.sql's header states hard DELETE is denied everywhere, and that was
-- deliberate for every table — but the admin hard-delete RPCs added in
-- 0016_admin_hard_delete.sql are followed up client-side by removePaths()
-- (app/services/photos/storage.ts), which deletes the deleted record's
-- KTP/KTM photos from storage.objects. With no DELETE policy on
-- storage.objects, that call was silently blocked by RLS (the caller
-- swallows the error), so a permanently deleted customer's ID photos were
-- never actually removed from the bucket.
--
-- This policy grants DELETE on the rental-photos bucket to the admin role
-- only (mirrors the admin gate in 0016 and the farrel_update_config policy
-- in 0006) — ops (mom) still cannot delete any file, matching the existing
-- operators_select_photos / operators_insert_photos policies which grant
-- ops+admin SELECT/INSERT but never DELETE.

CREATE POLICY "admin_delete_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'rental-photos'
    AND auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin')
  );
