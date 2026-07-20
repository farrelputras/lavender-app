-- 20260720073455_rpc_update_rental.sql
-- v1.0.3 (PRD-1): Edit an active rental — rpc_update_rental
--
-- Modeled closely on rpc_update_payment (0014_payment_edit_delete.sql): a
-- SECURITY DEFINER RPC taking a jsonb patch, gated on the parent's status,
-- because RLS cannot express "only while ACTIVE" (0006_rls.sql's
-- operators_update_rentals lets ops UPDATE any rental regardless of status).
--
-- Tiered auth gate (resolve rental status first):
--   patch has `kondisiKeluar` → ACTIVE only (ops|admin); COMPLETED/CANCELLED RAISE.
--     (The fuel-baseline argument: it is only safe to move before the return
--     calc runs. Once COMPLETED the record is settled.)
--   patch has `notes` (no kondisiKeluar requirement)
--     → ACTIVE: ops|admin · COMPLETED: admin only · CANCELLED: RAISE.
--
-- Photo rule — decided by Farrel 2026-07-20, supersedes PRD-1 BR-5/AC-5 (stale):
--   RAISE when the RESULTING kondisiKeluar.photos is empty AND the EXISTING
--   photos array was non-empty AND the caller is not admin. Admin may always
--   empty the set. Ops may not REDUCE a non-empty set to empty — but because
--   this RPC rewrites kondisi_keluar wholesale, an ops edit of a rental that
--   ALREADY had zero photos also sends photos: [], and that must succeed (a
--   legitimate fuel/km-only correction must not be blocked).
--
-- No hutang/tariff/total/payment recompute anywhere (PRD-1 BR-6) — notes is
-- free text, and kondisiKeluar only ever changes before the return calc runs
-- (ACTIVE), so nothing downstream needs to be invalidated.
--
-- Audit rides the existing trg_audit_rentals (0004_triggers.sql) — no new trigger.

CREATE OR REPLACE FUNCTION rpc_update_rental(p_rental_id uuid, patch jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status            rental_status;
  v_has_kondisi       BOOLEAN := patch ? 'kondisiKeluar';
  v_has_notes         BOOLEAN := patch ? 'notes';
  v_is_admin          BOOLEAN;
  v_is_operator       BOOLEAN;
  v_existing_photos   JSONB;
  v_keep_ids          JSONB;
  v_new_photos        JSONB;
  v_merged_photos     JSONB;
  v_existing_nonempty BOOLEAN;
  v_resulting_empty   BOOLEAN;
BEGIN
  SELECT status INTO v_status FROM rentals WHERE id = p_rental_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental % not found', p_rental_id;
  END IF;

  v_is_admin    := auth.uid() = (SELECT user_id FROM app_config WHERE role = 'admin');
  v_is_operator := auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('ops', 'admin'));

  -- ── kondisiKeluar gate: ACTIVE only ──────────────────────────────────────────
  -- NULL-safe checks throughout: `IS NOT TRUE` (not `NOT ...`), because plpgsql's
  -- `IF` treats a NULL condition as false and silently takes the else branch.
  -- v_is_operator/v_is_admin are NULL when auth.uid() is NULL (no JWT claim), and
  -- `NULL IN (...)` / `NULL = ...` both evaluate to NULL under three-valued SQL
  -- logic — so `IF NOT v_is_operator THEN RAISE` would never fire for a caller
  -- with no identity at all, letting an unauthenticated SECURITY DEFINER call
  -- through. `IS NOT TRUE` is true for both `false` and `NULL`, closing that hole.
  IF v_has_kondisi THEN
    IF v_status != 'ACTIVE' THEN
      RAISE EXCEPTION 'Kondisi keluar hanya dapat diubah selama rental berstatus aktif';
    END IF;
    IF v_is_operator IS NOT TRUE THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;
  END IF;

  -- ── notes gate: ACTIVE ops|admin · COMPLETED admin only · CANCELLED RAISE ──
  IF v_has_notes THEN
    IF v_status = 'ACTIVE' THEN
      IF v_is_operator IS NOT TRUE THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    ELSIF v_status = 'COMPLETED' THEN
      IF v_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'unauthorized';
      END IF;
    ELSE
      RAISE EXCEPTION 'Catatan tidak dapat diubah pada rental yang sudah dibatalkan';
    END IF;
  END IF;

  -- ── Apply kondisiKeluar (server-side photo merge; wholesale rewrite) ────────
  IF v_has_kondisi THEN
    -- bensinKotak is the fuel baseline the return-time adjustment reads. ->>'
    -- yields SQL NULL for both a missing key and JSON null, with no cast error —
    -- and translators.ts:28 reads a NULL/absent value back as `?? 4`, silently
    -- substituting a fake baseline. Reject here instead of writing garbage.
    IF (patch->'kondisiKeluar'->>'bensinKotak') IS NULL THEN
      RAISE EXCEPTION 'Kondisi keluar wajib menyertakan bensinKotak';
    END IF;

    SELECT COALESCE(kondisi_keluar->'photos', '[]'::jsonb)
      INTO v_existing_photos
      FROM rentals WHERE id = p_rental_id;

    v_keep_ids   := COALESCE(patch->'kondisiKeluar'->'keepPhotoIds', '[]'::jsonb);
    v_new_photos := COALESCE(patch->'kondisiKeluar'->'newPhotos', '[]'::jsonb);

    SELECT COALESCE(jsonb_agg(p), '[]'::jsonb)
      INTO v_merged_photos
      FROM jsonb_array_elements(v_existing_photos) AS p
      WHERE (p->>'id') IN (SELECT jsonb_array_elements_text(v_keep_ids));

    v_merged_photos := v_merged_photos || v_new_photos;

    v_existing_nonempty := jsonb_array_length(v_existing_photos) > 0;
    v_resulting_empty   := jsonb_array_length(v_merged_photos) = 0;

    IF v_resulting_empty AND v_existing_nonempty AND v_is_admin IS NOT TRUE THEN
      RAISE EXCEPTION 'Foto terakhir tidak bisa dihapus. Minta Farrel untuk menghapusnya.';
    END IF;

    UPDATE rentals SET
      kondisi_keluar = jsonb_build_object(
        'bensinKotak', (patch->'kondisiKeluar'->>'bensinKotak')::int,
        -- ->>'km' yields SQL NULL both when the key is absent and when it is
        -- JSON null, matching KondisiSnapshot.km: number | null.
        'km',          (patch->'kondisiKeluar'->>'km')::int,
        'photos',      v_merged_photos
      )
    WHERE id = p_rental_id;
  END IF;

  -- ── Apply notes ──────────────────────────────────────────────────────────────
  IF v_has_notes THEN
    UPDATE rentals SET notes = COALESCE(patch->>'notes', '') WHERE id = p_rental_id;
  END IF;
END;
$$;

-- PostgreSQL grants EXECUTE to PUBLIC by default on a new function, and no
-- migration in this project revokes it. Combined with the NULL-safe checks
-- above (an anon-key caller has auth.uid() = NULL), the default PUBLIC grant
-- would otherwise let that caller reach this SECURITY DEFINER body at all,
-- pass every role check by NULL, and bypass RLS. REVOKE first, then
-- GRANT only to authenticated — REVOKE here targets PUBLIC/anon specifically,
-- so it cannot strip the authenticated grant regardless of statement order,
-- but the revoke-then-grant order is kept as the conventional, easiest-to-audit
-- reading of "close the default, then open only what's needed".
REVOKE EXECUTE ON FUNCTION rpc_update_rental(uuid, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION rpc_update_rental(uuid, jsonb) TO authenticated;
