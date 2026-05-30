# Phase 4 — Supabase Build + Connector Swap

> **Status: COMPLETE (2026-05-30)**
> All 7 tasks executed in-session. `pnpm run compile` clean (0 errors), 43/43 tests pass.
> Lint exits 1 but all 127 errors are **pre-existing** from Phase 0/demo screens — 0 new Phase 4 errors.
> All manual steps completed 2026-05-30.
>
> **Deviations from plan:**
> - `PembayaranSheet.tsx` was identified as an additional file needing ALL_CAPS enum migration (not in the original 6-file list) — caught and fixed during the sweep.
> - `rentalMath.ts:71` also had a `"active"` comparison that needed migrating — caught and fixed.
> - Both are in-scope (connector-contract correctness), not scope creep.
>
> **Post-plan amendments (2026-05-30):**
> - `app_config` roles renamed: `'mom'` → `'ops'`, `'farrel'` → `'admin'` — updated in `0002`, `0005`, `0006`, and `seed.sql`
> - `0007_vehicle_gps_imei.sql` added: `ALTER TABLE vehicles ADD COLUMN gps TEXT, imei TEXT`
> - `seed.sql` (formerly `0007_seed.sql`) replaced with real fleet data: 30 vehicles with real plates, GPS, IMEI, and rates; Ertiga and Evalia seeded as `TIDAK_AKTIF`
> - `Vehicle` type and `rowToVehicle` translator updated with `gps: string | null`, `imei: string | null`
>
> **Next phase:** Phase 5a (Auth — login screen + session persistence)

---

**Goal:** Replace every in-memory function body in the connector layer with Supabase calls, and build the SQL migrations that implement the Phase 3 backend design. Connector signatures (function name + params + return type) are locked and unchanged. UI components are not touched except for the ALL_CAPS enum literal sweep.

**Spec input:** `docs/superpowers/plans/2026-05-27-phase-3-backend-design.md`

**Roadmap ref:** `docs/superpowers/specs/2026-05-26-v1-roadmap-design.md` §5, Phase 4

---

## Decisions locked before implementation

| Decision | Choice |
|---|---|
| Supabase project state | Already created; URL + anon key in hand |
| Migration delivery | 7 numbered files in `supabase/migrations/` + `seed.sql` (unnumbered, manual-run) |
| In-memory fallback | Replaced outright — `seed.ts` deleted, no flag |
| Seed scope | Real fleet (30 vehicles) + commented `app_config` template |
| Operator roles | `'ops'` (mom) and `'admin'` (farrel) — TEXT PK values in `app_config` |

---

## Files created

### SQL Migrations — `apps/lavender-ops-mobile/supabase/migrations/`

| File | Contents |
|---|---|
| `0001_enums.sql` | 6 enum types: `user_verification_status`, `vehicle_category`, `vehicle_status`, `rental_status`, `payment_method`, `hutang_status` — ALL_CAPS values |
| `0002_app_config.sql` | `app_config(role TEXT PK, user_id UUID, updated_at)` — operator UID config table; roles are `'ops'` and `'admin'` |
| `0003_tables.sql` | 6 main tables with audit columns; `deleted_at` only on `users` and `vehicles`; `rentals.id` has no DEFAULT (client-minted); `payments` XOR check constraint; `hutang_id` FK added via ALTER TABLE after both tables exist |
| `0004_triggers.sql` | `set_audit_fields()` BEFORE INSERT/UPDATE on all 6 tables; `trg_fn_recompute_hutang_status()` AFTER INSERT/UPDATE/DELETE on `payments` — uses TG_OP to pick NEW vs OLD |
| `0005_views_rpcs.sql` | `v_rentals` (totalBill, totalPaid, payments/charges as JSONB via LATERAL joins), `v_user_summaries` (activeRentalsCount, debtAmount), `v_vehicle_summaries` (available bool), `v_rentals_due_today`; RPCs `rpc_get_dashboard_summary`, `rpc_create_rental(payload jsonb)`, `rpc_close_rental(p_rental_id uuid, payload jsonb)` — write RPCs SECURITY DEFINER with auth.uid() check |
| `0006_rls.sql` | RLS on all 7 tables; SELECT/INSERT/UPDATE for operators; no DELETE; `app_config` SELECT = all authenticated, UPDATE = `'admin'` only; storage policies for `rental-photos` |
| `0007_vehicle_gps_imei.sql` | `ALTER TABLE vehicles ADD COLUMN gps TEXT, imei TEXT` — added post-plan to store GPS tracker number and IMEI as dedicated columns |
| `seed.sql` | 30 real fleet vehicles with plate, GPS, IMEI, rates, `tahun`; Ertiga and Evalia seeded as `TIDAK_AKTIF`; commented `app_config` INSERT template. **User reviews and runs manually.** |

### TypeScript — new files

| File | Purpose |
|---|---|
| `app/services/supabase/client.ts` | Singleton Supabase client; ExpoSecureStoreAdapter for session persistence; `react-native-url-polyfill/auto` at top; reads `EXPO_PUBLIC_SUPABASE_*` env vars |
| `app/services/rentals/translators.ts` | Pure row-to-UI-type functions: `rowToRental`, `rowToUserSummary`, `rowToVehicle`, `rowToVehicleSummary`, `rowToHutang`; snake_case → camelCase; `toKondisi` strips photo `path` → `uri: null` (Phase 6 will generate signed URLs); `rowToVehicle` maps `gps` and `imei` |

---

## Files modified

| File | Change |
|---|---|
| `app/services/rentals/types.ts` | ALL_CAPS enums (`RentalStatus`, `ReturnStatus`, `VehicleCategory`, `PaymentMethod`, `JaminanItem`); new `VerificationStatus` type; `Hutang.rentalId: string \| null`; `UserSummary` widened with `isMahasiswa`, `verificationStatus`, `namaPddikti`, `tahunMasuk`, `universitas`, `prodi`; `Vehicle` widened with `gps: string \| null`, `imei: string \| null` |
| `app/services/rentals/index.ts` | Full Supabase rewrite of all 10 existing functions; 3 new connectors (`createManualHutang`, `softDeleteUser`, `softDeleteVehicle`); `createRental` mints UUID client-side then calls `rpc_create_rental`; `closeRental` calls `rpc_close_rental`; both strip `photos: []` (Phase 6 will wire real photo paths) |
| `app/services/rentals/seed.ts` | **Deleted** |
| `app/utils/rentalMath.ts` | `rental.status === "active"` → `"ACTIVE"` in `isOverdue` (line 71) |
| `app/screens/BerandaScreen.tsx` | `"terlambat"` → `"TERLAMBAT"` (6 occurrences) |
| `app/screens/DetailSewaScreen.tsx` | `"motor"` → `"MOTOR"`; `["ktp","ktm"]` → `["KTP","KTM"]`; jaminan item labels; `jaminanItems.has("lainnya")` → `"LAINNYA"` |
| `app/screens/PilihKendaraanScreen.tsx` | `vehicle.category === "motor"` → `"MOTOR"`; filter chip `setCategory` calls to `"MOTOR"` / `"MOBIL"` |
| `app/screens/PenyewaanDetailScreen.tsx` | `JAMINAN_LABELS` keys uppercase; `MAP` keys uppercase; `"lainnya"` → `"LAINNYA"`; `"mobil"` → `"MOBIL"` |
| `app/screens/PengembalianScreen.tsx` | `JAMINAN_LABELS` keys uppercase; `"lainnya"` → `"LAINNYA"` |
| `app/components/PembayaranSheet.tsx` | `METHODS` array keys uppercase; `useState("cash")` → `"CASH"`; `setMethod("cash")` → `"CASH"`; `method === "lainnya"` → `"LAINNYA"` |

---

## Architecture notes

### totalBill formula in v_rentals
```sql
CASE
  WHEN subtotal_sewa IS NOT NULL THEN
    GREATEST(0, subtotal_sewa + Σcharges - discount)     -- ACTIVE rental
  ELSE
    GREATEST(0, tarif + (add_on->>'amount')::int - discount)  -- CLOSED rental
END
```
Matches `rentalMath.ts:computeTotalBill` and `index.ts` (pre-Phase 4) line 174. `add_on.amount` included in the active branch — important.

### Hutang status trigger
`hutang.status` is **never written directly by a connector** — maintained by `trg_fn_recompute_hutang_status()` which fires AFTER INSERT/UPDATE/DELETE on `payments`. Uses `TG_OP` to pick `NEW.hutang_id` (INSERT/UPDATE) vs `OLD.hutang_id` (DELETE) — avoids referencing undefined OLD/NEW.

### Client-minted rental UUID
`createRental` calls `crypto.randomUUID()` on the client to mint `rental.id` before the RPC. This enables Phase 6's one-step photo upload: photos are stored at `rentals/{rentalId}/kondisi-keluar/{uuid}.jpg` using the pre-known rental ID, then the RPC inserts everything atomically. **Verify `crypto.randomUUID()` is available on first Phase 5a dev-client build** (Hermes ≥ 0.71 / RN 0.83 should ship it; add `react-native-get-random-values` as fallback if not).

### Photos in Phase 4
Both `createRental` and `closeRental` strip `photos: []` before sending to the RPC. `toKondisi()` in `translators.ts` maps DB `path` → `uri: null`. Phase 6 will upload real files and generate signed URLs; the translator will need updating to call `supabase.storage.from('rental-photos').createSignedUrl(path, 86400)`.

### SECURITY DEFINER RPCs
`rpc_create_rental` and `rpc_close_rental` are SECURITY DEFINER for multi-table atomicity. They both start with an `auth.uid() IN (SELECT user_id FROM app_config ...)` check — `auth.uid()` reads from the JWT (set by PostgREST before execution) and is unaffected by the SECURITY DEFINER role context. Audit triggers also use `auth.uid()` for the same reason.

---

## Verification checklist (from Phase 3 §10)

- [x] Contract coverage — all 10 functions + 3 new ones covered in connector
- [x] Type coverage — every UI type field maps to a column, JSONB key, or computed aggregate
- [x] ALL_CAPS enums — applied in all migration files and connector
- [x] Soft-delete scope — `deleted_at` only on `users` and `vehicles`; confirmed in `0003_tables.sql`
- [x] totalBill formula — active branch includes `add_on.amount`; closed branch uses `subtotal_sewa + Σcharges`
- [x] One-step photo flow documented — `createRental` and `closeRental` both strip `photos: []`; Phase 6 hook points noted
- [x] UUID strategy — `rentals.id` client-minted; all other tables use `gen_random_uuid()` default
- [x] `TIDAK_AKTIF` vs `deleted_at` semantics — in `0003_tables.sql` vehicle section
- [x] `app_config` RLS — SELECT = all authenticated; UPDATE = farrel only; INSERT/DELETE = blocked
- [x] Hutang status trigger — `trg_fn_recompute_hutang_status` in `0004_triggers.sql` with TG_OP pattern
- [x] `subtotal_sewa` always written — RPC sets it unconditionally at close
- [x] Migrations applied to Supabase project — applied 2026-05-30 (0001–0007 + seed.sql)
- [x] `app_config` rows seeded with real UIDs — `'ops'` + `'admin'` rows inserted 2026-05-30
- [x] `rental-photos` bucket created — private bucket created 2026-05-30
