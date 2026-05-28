# Phase 3 — Supabase Backend Design

**Status:** Design complete — ready for Phase 4 implementation
**Scope:** Schema, RLS, auth model, audit strategy, storage layout.
No SQL is written or applied in this phase. Phase 4 builds migrations from this document.

---

## 1. Tables

All tables carry these audit columns (see §6 for trigger):

```
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
created_by  UUID REFERENCES auth.users
updated_by  UUID REFERENCES auth.users
```

**Soft-delete (`deleted_at TIMESTAMPTZ`)** applies **only to `users` and `vehicles`**. The other four tables (`rentals`, `charges`, `payments`, `hutang`) have no `deleted_at` column — records are never deleted in v1.0.0.

RLS SELECT policies on `users` and `vehicles` automatically append `AND deleted_at IS NULL`.

---

### 1.1 `users`

Maps to UI type `User` / `UserSummary`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK DEFAULT gen_random_uuid() | |
| `name` | TEXT NOT NULL | ← `User.name` |
| `nickname` | TEXT | nullable ← `User.nickname` |
| `phone` | TEXT NOT NULL | ← `User.phone` |
| `is_mahasiswa` | BOOLEAN NOT NULL DEFAULT true | whether this user is a student and a PDDikti candidate ← `User.isMahasiswa` |
| `verified_at` | TIMESTAMPTZ | nullable — set when status → `TERVERIFIKASI_PDDIKTI` ← `User.verifiedAt` |
| `verification_status` | `user_verification_status` ENUM | `BELUM_DIVERIFIKASI` \| `TERVERIFIKASI_PDDIKTI` \| `VERIFIKASI_GAGAL` — **only meaningful when `is_mahasiswa = true`**; ignored for adults |
| `nama_pddikti` | TEXT | nullable — populated on successful PDDikti verify (v1.1, roadmap §4.3); surfaced to UI so Mom can view details |
| `tahun_masuk` | SMALLINT | nullable — PDDikti detail |
| `universitas` | TEXT | nullable — PDDikti detail |
| `prodi` | TEXT | nullable — PDDikti detail |
| `alamat` | TEXT | nullable — per handoff data model |
| `kontak_darurat` | TEXT | nullable — per handoff data model |
| `notes` | TEXT | nullable |
| `deleted_at` | TIMESTAMPTZ | NULL = live; non-NULL = soft-deleted (user is hidden from all pickers) |
| *(audit columns)* | | |

`UserSummary.isVerified` = `verification_status = 'TERVERIFIKASI_PDDIKTI'` (equivalently `verified_at IS NOT NULL`).
`UserSummary.isMahasiswa` = `is_mahasiswa` (direct column map).
Verification is **purely informational** — it never gates or blocks a rental.
`UserSummary.activeRentalsCount` and `debtAmount` are computed at query time (see §3).

In v1.0.0, `verification_status` is always `BELUM_DIVERIFIKASI` because PDDikti integration is deferred to v1.1. `verifiedUsersCount` in the dashboard will always be 0 until v1.1 ships.

---

### 1.2 `vehicles`

Maps to UI type `Vehicle` / `VehicleSummary`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK |  |
| `name` | TEXT NOT NULL | ← `Vehicle.name` ("merk + tipe") |
| `plate` | TEXT NOT NULL UNIQUE | ← `Vehicle.plate` |
| `category` | `vehicle_category` ENUM | `MOTOR` \| `MOBIL` ← `Vehicle.category` |
| `rate_6h` | INTEGER NOT NULL | rupiah ← `Vehicle.rate6h` |
| `rate_12h` | INTEGER NOT NULL | rupiah ← `Vehicle.rate12h` |
| `rate_24h` | INTEGER NOT NULL | rupiah ← `Vehicle.rate24h` |
| `status` | `vehicle_status` ENUM | `TERSEDIA` \| `DISEWA` \| `MAINTENANCE` \| `TIDAK_AKTIF` |
| `tahun` | SMALLINT | nullable — per handoff data model |
| `warna` | TEXT | nullable — per handoff data model |
| `notes` | TEXT | nullable |
| `deleted_at` | TIMESTAMPTZ | NULL = live; non-NULL = soft-deleted (vehicle is physically gone) |
| *(audit columns)* | | |

`Vehicle.available` = `status = 'TERSEDIA'` in the connector translation layer.
`createRental` sets vehicle to `DISEWA`; `closeRental` sets it back to `TERSEDIA`.

**Vehicle retirement state semantics (decision #21):**
- `status = 'TIDAK_AKTIF'` → vehicle is **physically present** but withheld from rental (e.g. owner's personal use, awaiting major service). Shows in fleet management UI; excluded from the rental-picker.
- `deleted_at IS NOT NULL` → vehicle is **physically gone** (sold, written off). Hidden from all UI lists; historical FK joins on rentals still resolve the vehicle's name/plate.
- These are **orthogonal** — a vehicle can be `TIDAK_AKTIF` and later soft-deleted when it is actually sold.

Day-one note: Phase 4 pre-seeds ~14 vehicles via SQL before launch; UI vehicle CRUD ships in Phase 5d for ongoing fleet edits.

---

### 1.3 `rentals`

Maps to UI type `Rental` / `CreateRentalInput`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | **client-minted** via `crypto.randomUUID()` — see §7 for rationale |
| `user_id` | UUID NOT NULL FK → users.id | ← `Rental.userId` |
| `vehicle_id` | UUID NOT NULL FK → vehicles.id | ← `Rental.vehicleId` |
| `start_at` | TIMESTAMPTZ NOT NULL | ← `Rental.startAt` |
| `due_at` | TIMESTAMPTZ NOT NULL | ← `Rental.dueAt` |
| `returned_at` | TIMESTAMPTZ | nullable ← `Rental.returnedAt` |
| `status` | `rental_status` ENUM | `ACTIVE` \| `COMPLETED` \| `CANCELLED` |
| `paket_hari` | SMALLINT NOT NULL | ← `Rental.paketHari` |
| `paket_jam` | SMALLINT NOT NULL | CHECK (paket_jam IN (0, 6, 12)) ← `Rental.paketJam` |
| `tarif` | INTEGER NOT NULL | rate snapshot at booking ← `Rental.tarif` |
| `subtotal_sewa` | INTEGER | nullable — set at close; operator-adjusted tarif rollup |
| `add_on` | JSONB NOT NULL | `{description: string, amount: integer}` ← `Rental.addOn`; see §2 |
| `jaminan` | JSONB NOT NULL | `{items: string[], lainnyaDescription?: string}` ← `Rental.jaminan`; see §2 |
| `kondisi_keluar` | JSONB NOT NULL | `KondisiSnapshot` shape; see §2 |
| `kondisi_kembali` | JSONB | nullable ← `Rental.kondisiKembali`; set at close |
| `discount` | INTEGER NOT NULL DEFAULT 0 | ← `Rental.discount` |
| `notes` | TEXT NOT NULL DEFAULT '' | ← `Rental.notes` |
| `tujuan` | TEXT | **nullable — RESERVED; Phase 7 UI** |
| *(audit columns — no `deleted_at` on this table)* | | |

**Derived / not stored:**
- `totalBill` — computed via view (see §3)
- `totalPaid` — computed via view (see §3)

**Tarif lifecycle:** `tarif` = rate snapshot at booking (`composeTarif(vehicle, hari, jam)`).
At close, `CloseRentalInput.subtotalSewa` is the operator-confirmed/adjusted base;
it is **always written** to `subtotal_sewa` (even when unchanged). `subtotal_sewa IS NULL` ⇔ rental is `ACTIVE`.
`totalBill` then = `GREATEST(0, subtotal_sewa + Σcharges - discount)`.

**Discount:** on `closeRental`, the input `discount` **REPLACES** (not adds to) the booking-time discount value.

---

### 1.4 `charges`

Return-time line items (extraFees from `closeRental`). Amount can be negative (fuel adjustment, discount lines).
Maps to `RentalAddOn` elements in `CloseRentalInput.extraFees`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `rental_id` | UUID NOT NULL FK → rentals.id | |
| `description` | TEXT NOT NULL | e.g. "Denda terlambat", "Bensin kurang" |
| `amount` | INTEGER NOT NULL | rupiah; negative allowed |
| *(audit columns — no `deleted_at` on this table)* | | |

---

### 1.5 `payments`

Polymorphic: belongs to a **rental** OR a **hutang** (exactly one must be set).
Maps to UI type `Payment`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | stable — required for Phase 7 edit/delete |
| `rental_id` | UUID FK → rentals.id | nullable |
| `hutang_id` | UUID FK → hutang.id | nullable |
| `amount` | INTEGER NOT NULL | rupiah ← `Payment.amount` |
| `method` | `payment_method` ENUM | `CASH` \| `TRANSFER` \| `QRIS` \| `LAINNYA` |
| `method_description` | TEXT | nullable ← `Payment.methodDescription` |
| `paid_at` | TIMESTAMPTZ NOT NULL | ← `Payment.paidAt` |
| `notes` | TEXT | nullable ← `Payment.notes` |
| *(audit columns — no `deleted_at` on this table)* | | |

**CHECK constraint:** `(rental_id IS NOT NULL)::int + (hutang_id IS NOT NULL)::int = 1`

Trigger `trg_recompute_hutang_status` fires AFTER INSERT/UPDATE/DELETE on this table when `hutang_id IS NOT NULL` — auto-flips `hutang.status` between `AKTIF` and `LUNAS` (see §6.1).

---

### 1.6 `hutang`

Maps to UI type `Hutang`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL FK → users.id | ← `Hutang.userId` |
| `rental_id` | UUID FK → rentals.id | **nullable** — manual hutang has no rental. Current UI type has `rentalId: string` (non-nullable); Phase 4 connector must widen this to `string \| null` |
| `jumlah_awal` | INTEGER NOT NULL | the original debt amount at creation |
| `status` | `hutang_status` ENUM | `AKTIF` \| `LUNAS` — **never written directly by the connector**; maintained by trigger `trg_recompute_hutang_status` (see §6.1) |
| `notes` | TEXT | nullable |
| *(audit columns — no `deleted_at` on this table)* | | |

**Sisa** (remaining balance) = `jumlah_awal − Σpayments.amount WHERE hutang_id = this.id`.
`Hutang.amount` in the UI currently represents `sisa` — the connector translates this.
`jumlah_awal` maps to `Hutang.amount` at creation time; the connector exposes `sisa` as the live value.

---

## 2. Embedded Objects — JSONB vs Child Tables

| Object | Decision | Rationale |
|--------|----------|-----------|
| `kondisi_keluar` / `kondisi_kembali` | **JSONB** | Snapshot-style value object. Taken once at handover/return; never mutated independently. No FK or lifecycle of its own. |
| `jaminan` | **JSONB** | Snapshot at booking. Items are a closed enum (`KTP \| KTM \| LAINNYA` — ALL_CAPS strings inside JSONB; no Postgres enum needed but values must match the UI `JaminanItem` type) with an optional free-text field. |
| `add_on` (creation-time) | **JSONB** | Single value object at booking; rarely non-zero. Separate from return-time charges which need identity. |
| `KondisiSnapshot.photos[]` | `{id: uuid, path: text}` inside JSONB | `id` = storage object UUID; `path` = storage path. Connector generates signed URL on read. No separate photos table in v1. |
| payments | **Child table** `payments` | Has identity (stable `id` for edit/delete in Phase 7), lifecycle (paid at different times), and belongs to two parent types (rental or hutang). |
| charges | **Child table** `charges` | Multiple line items per rental; amounts can be negative; need to query/sum independently. |

---

## 3. Store-vs-Compute (Derived Aggregates)

Never store what can be computed accurately. Single source of truth prevents drift.

| UI value | Strategy | Definition |
|----------|----------|------------|
| `Rental.totalBill` | Postgres view column | `CASE WHEN r.subtotal_sewa IS NOT NULL THEN GREATEST(0, r.subtotal_sewa + COALESCE(sum(c.amount), 0) - r.discount) ELSE GREATEST(0, r.tarif + (r.add_on->>'amount')::int - r.discount) END` — active rentals use `tarif + add_on.amount - discount`; closed rentals use `subtotal_sewa + Σcharges - discount`. `add_on.amount` must be included in the active-rental branch (matches in-memory connector `index.ts:174`). |
| `Rental.totalPaid` | Postgres view column | `COALESCE(sum(p.amount) WHERE p.rental_id = r.id, 0)` |
| `Rental.payments[]` | JOIN in view | full payment rows for the rental |
| `ReturnStatus` (`BELUM_KEMBALI` / `TERLAMBAT`) | Computed in connector | `dueAt < now() && status = 'ACTIVE'` → `TERLAMBAT`; **never stored** |
| `UserSummary.isVerified` | Computed | `verification_status = 'TERVERIFIKASI_PDDIKTI'` (equivalently `verified_at IS NOT NULL`). In v1.0.0 this is always `false` — PDDikti deferred to v1.1, so `verifiedUsersCount` is always 0. |
| `UserSummary.isMahasiswa` | Column map | `is_mahasiswa` direct pass-through |
| `UserSummary.verificationStatus` | Column map | `verification_status` → camelCase enum value; ignored when `is_mahasiswa = false` |
| `UserSummary.namaPddikti` / `.tahunMasuk` / `.universitas` / `.prodi` | Column map | nullable; part of `UserSummary` (returned by `getUserSummary`); populated after successful PDDikti verify; surfaced in User Detail screen for Mom |
| `UserSummary.activeRentalsCount` | Lateral subquery | `count(*) WHERE rental.user_id = user.id AND status = 'ACTIVE'` |
| `UserSummary.debtAmount` | Lateral subquery | `sum(jumlah_awal) - sum(payments on hutang) WHERE hutang.user_id = user.id AND status = 'AKTIF'` |
| `DashboardSummary` | RPC `get_dashboard_summary()` | Single round-trip: counts of active rentals, vehicles by status, users, debt totals |
| `RentalDueToday[]` | View `rentals_due_today` | `WHERE due_at::date = now()::date AND status = 'ACTIVE'` |
| `VehicleSummary.available` | Column mapping | `status = 'TERSEDIA'` in connector |
| `Hutang.amount` (sisa) | Computed in connector | `jumlah_awal - COALESCE(sum(payments.amount WHERE hutang_id = hutang.id), 0)` |

**Recommended views / RPCs:**

- `v_rentals` — rentals with computed totalBill, totalPaid, payments array (JSONB_AGG), charges array
- `v_user_summaries` — users with activeRentalsCount, debtAmount, isVerified
- `v_rentals_due_today` — filtered view joining users and vehicles
- `rpc_get_dashboard_summary()` — returns a single JSON object with all `DashboardSummary` fields
- `v_vehicle_summaries` — vehicles with `available` column

---

## 4. RLS Policies

Two operator accounts: **mom** and **farrel** (UIDs provisioned in §5, referenced via `app_config` table).

Both accounts have **identical full CRUD** across all six tables (subject to soft-delete rules in §6).

**General pattern per table:**

```
SELECT  auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('mom','farrel'))
        AND (deleted_at IS NULL  -- only for users/vehicles; other tables have no deleted_at)
INSERT  auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('mom','farrel'))
UPDATE  auth.uid() IN (SELECT user_id FROM app_config WHERE role IN ('mom','farrel'))
DELETE  DENIED — no hard DELETE on any operational table
```

**Soft-delete enforcement (`users` and `vehicles` only):** UPDATE policy allows setting `deleted_at`; SELECT policy filters it out. There is no DELETE policy.

**Views and RPCs** inherit the caller's RLS context via `SECURITY INVOKER` (default). RPCs that aggregate across tables should be `SECURITY DEFINER` with explicit uid checks inside the function body.

### 4.1 Cascade Rules (on soft-delete)

- Soft-deleting a **user** with active rentals or `AKTIF` hutang is **allowed**. The connector still finds the user in FK joins (name, phone) for historical records. The user is excluded from pickers (new rental, new hutang).
- Soft-deleting a **vehicle** with an active rental is **allowed**. Historical rental rows still resolve the vehicle's name and plate via FK join. Vehicle is excluded from the rental-picker.

### 4.2 `app_config` RLS

| Operation | Policy |
|-----------|--------|
| `SELECT` | Any authenticated user (required: RLS policies on other tables subquery `app_config` in their `USING` clause — must succeed for any operator session) |
| `UPDATE` | Farrel only (`auth.uid() = (SELECT user_id FROM app_config WHERE role = 'farrel')`) — UID rotation is rare and security-sensitive |
| `INSERT` / `DELETE` | Blocked via RLS. Table is seeded once in Phase 4 migration; further changes are manual SQL by Farrel via Supabase dashboard. |

---

## 5. Auth Model

- Provider: **Supabase Auth, email/password**
- Accounts: 2, **manually provisioned** in Phase 4:
  - `mom@lavender.local` — shared operational account
  - `farrel@lavender.local` — admin account
- Session storage: **`expo-secure-store`** (already installed in Phase 1)
- Auto-logout: **disabled** (private device, family use)
- Password reset: **out-of-band only** — Farrel resets via Supabase Auth dashboard. No in-app reset affordance in v1.0.0.

**UID config — `app_config` table:**

UIDs are stored in a DB table, not env vars:

```sql
CREATE TABLE app_config (
  role        TEXT PRIMARY KEY,     -- 'mom' | 'farrel'
  user_id     UUID NOT NULL,        -- auth.users.id
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Two rows seeded in Phase 4 migration
```

RLS policies reference `(SELECT user_id FROM app_config WHERE role = 'mom')` etc.
UID rotation = one `UPDATE` statement, no app rebuild needed.

**Phase 4 manual provisioning steps:**
1. Create both accounts via Supabase Auth dashboard
2. Note the two UUIDs
3. Run the Phase 4 seed migration which INSERTs both rows into `app_config`

---

## 6. Audit & Soft-Delete

**Audit columns** (`created_at`, `updated_at`, `created_by`, `updated_by`) apply to **all six tables**. Soft-delete (`deleted_at` column + policies that respect `NULL`) applies to **`users` and `vehicles` only**. The other four tables (`rentals`, `charges`, `payments`, `hutang`) have no `deleted_at` column in v1.0.0 — records are never deleted.

**Audit trigger function** (single reusable, applied to each table):

```sql
-- Pseudocode — Phase 4 writes the actual SQL
CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Applied as `BEFORE INSERT OR UPDATE` trigger on: `users`, `vehicles`, `rentals`,
`payments`, `charges`, `hutang`.

**Soft-delete (users + vehicles only):** Never run `DELETE`. Instead set `deleted_at = now()`. RLS SELECT policies include `AND deleted_at IS NULL`. Connectors never see deleted rows.

**Before/after value capture:** Out of scope for v1. Noted as a Phase 7+ addition.

### 6.1 Hutang Status Trigger

`hutang.status` is **never written directly by a connector** — it is maintained by a trigger that fires after any payment insert/update/delete:

```sql
CREATE FUNCTION recompute_hutang_status(h_id UUID) RETURNS void AS $$
  UPDATE hutang
  SET status = CASE
    WHEN (jumlah_awal - COALESCE(
      (SELECT SUM(amount) FROM payments WHERE hutang_id = h_id), 0
    )) <= 0 THEN 'LUNAS'
    ELSE 'AKTIF'
  END
  WHERE id = h_id;
$$ LANGUAGE sql;

CREATE TRIGGER trg_recompute_hutang_status
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  WHEN (COALESCE(NEW.hutang_id, OLD.hutang_id) IS NOT NULL)
  EXECUTE FUNCTION recompute_hutang_status(COALESCE(NEW.hutang_id, OLD.hutang_id));
```

`COALESCE(NEW.hutang_id, OLD.hutang_id)`: on DELETE only `OLD` is populated; on INSERT only `NEW`; on UPDATE both — `COALESCE` picks whichever is non-null.

---

## 7. Storage Bucket Layout

**Bucket:** `rental-photos` (private, not public)

**Path convention:**
```
rentals/{rental_id}/kondisi-keluar/{photo_uuid}.jpg
rentals/{rental_id}/kondisi-kembali/{photo_uuid}.jpg
```

**Photo object in JSONB:**
```jsonc
// KondisiSnapshot.photos[] as stored in kondisi_keluar/kondisi_kembali JSONB
{ "id": "<uuid>", "path": "rentals/{rental_id}/kondisi-keluar/<uuid>.jpg" }
```

The connector translates `path` → a signed URL (**24h expiry**) on read. The `uri` field in
the UI type carries the signed URL; `id` is the stable storage key.

**Photo upload flow — one-step (create rental):**

```
1. const rentalId = crypto.randomUUID()           // client mints rental UUID
2. for each photo: upload to rentals/{rentalId}/kondisi-keluar/{crypto.randomUUID()}.jpg
3. rpc_create_rental({ id: rentalId, kondisi_keluar: { ..., photos: [{id, path}] }, ... })
   → atomically: INSERT rental, INSERT payments, set vehicle DISEWA
```

Client mints the rental UUID so photo paths are known before the DB insert, enabling a single atomic RPC. If step 2 fails mid-flight, no DB row exists yet — clean retry. Orphaned uploads (if the app crashes after step 2 but before step 3) are acceptable in v1.0.0; a storage GC job is a Phase 7+ addition.

**Photo upload flow — one-step (close rental):**

```
1. rental_id is already known from the open rental
2. for each photo: upload to rentals/{rentalId}/kondisi-kembali/{crypto.randomUUID()}.jpg
3. rpc_close_rental(rentalId, input)
   → atomically: UPDATE rentals (kondisi_kembali, status=COMPLETED, returned_at, subtotal_sewa,
     discount), INSERT charges, INSERT payments, conditionally INSERT hutang, UPDATE vehicle TERSEDIA
```

**UUID strategy:**
- `rentals.id`: **client-minted** via `crypto.randomUUID()` (needed for photo-path pre-knowledge above)
- All other DB row IDs (`users`, `vehicles`, `payments`, `charges`, `hutang`): **server-side `gen_random_uuid()`** column default; RPCs return the new `id` via `RETURNING id`
- Photo filenames: `crypto.randomUUID()` on client (unique filename only, not a DB row ID)

**Bucket RLS:**
- SELECT: `auth.uid() IN (mom_uid, farrel_uid)` — operators can view all photos
- INSERT: `auth.uid() IN (mom_uid, farrel_uid)` — operators upload during rental flow
- DELETE: denied in v1

---

## 8. Connector-Contract Mapping

Each connector function in `apps/lavender-ops-mobile/app/services/rentals/index.ts` maps to:

| Connector | DB Target | Key Translation |
|-----------|-----------|-----------------|
| `getUserSummaries()` | `v_user_summaries` | snake_case → camelCase; `verification_status = 'TERVERIFIKASI_PDDIKTI'` → `isVerified`; `is_mahasiswa` → `isMahasiswa`; `verification_status` → `verificationStatus`; subquery counts/sums |
| `getUserSummary(id)` | `v_user_summaries WHERE id = $1` | same as `getUserSummaries` row + full PDDikti detail fields included in `UserSummary` (Phase 4 widening): `nama_pddikti` → `namaPddikti`, `tahun_masuk` → `tahunMasuk`, `universitas`, `prodi`. Return type stays `UserSummary \| null`. |
| `getVehicleSummaries()` | `v_vehicle_summaries` | `status = 'TERSEDIA'` → `available: true`; hides `deleted_at IS NOT NULL` rows |
| `getVehicle(id)` | `vehicles WHERE id = $1 AND deleted_at IS NULL` | `rate_6h` → `rate6h` etc.; `status = 'TERSEDIA'` → `available` |
| `getDashboardSummary()` | `rpc_get_dashboard_summary()` | Single RPC, returns JSON; vehicle counts by status (TERSEDIA / DISEWA / etc.) |
| `getRentalsDueToday()` | `v_rentals_due_today` | Joins users + vehicles; computes `ReturnStatus` in connector: `dueAt < now()` → `'TERLAMBAT'`, else `'BELUM_KEMBALI'` |
| `getRental(id)` | `v_rentals WHERE id = $1` | Assembles full `Rental` including `payments[]`, `kondisiKeluar/Kembali` JSONB parse, signed photo URLs (24h), computed `totalBill/totalPaid` |
| `addPayment(rentalId, input)` | INSERT `payments` then SELECT `v_rentals` | `method` enum value stored as `CASH \| TRANSFER \| QRIS \| LAINNYA`; `method_description` → `methodDescription`; returns updated Rental |
| `closeRental(rentalId, input)` | `rpc_close_rental(...)` | **One-step**: client uploads `kondisi_kembali` photos first (paths already known from `rentalId`), then atomic RPC: UPDATE rentals (`returned_at`, `kondisi_kembali`, `subtotal_sewa` always written, `status='COMPLETED'`, `discount` REPLACES, `notes`), INSERT charges, INSERT payments, conditionally INSERT hutang when `sisa > 0`, UPDATE `vehicles.status = 'TERSEDIA'` |
| `createRental(input)` | `rpc_create_rental(...)` | **One-step**: client mints `rental_id = crypto.randomUUID()`, uploads `kondisi_keluar` photos (paths use `rental_id`), then atomic RPC with `id = rental_id` and populated `kondisi_keluar.photos` array: INSERT rental, INSERT payments, UPDATE `vehicles.status = 'DISEWA'` |
| `createManualHutang(input)` | INSERT `hutang` | Inserts hutang with `rental_id = NULL`; `status = 'AKTIF'` (trigger maintains it). Signature: `createManualHutang(input: { userId: string; jumlahAwal: number; notes?: string }): Promise<Hutang>` |
| `softDeleteUser(id)` | UPDATE `users SET deleted_at = now()` | Hides from all pickers; historical FK joins still resolve |
| `softDeleteVehicle(id)` | UPDATE `vehicles SET deleted_at = now()` | Hides from all UI lists; historical FK joins still resolve name/plate |

**RPCs are required for atomicity** on `closeRental` and `createRental` — multiple
tables must mutate in a single transaction. Use `rpc_*` Supabase functions with
`SECURITY DEFINER` + explicit uid checks.

**UUID strategy:** `rentals.id` is client-minted (`crypto.randomUUID()`). All other DB row IDs use server-side `gen_random_uuid()` column default; RPCs return new IDs via `RETURNING id`.

**ALL_CAPS enum values in all DB columns and connector translations** — `ACTIVE`, `COMPLETED`, `CANCELLED`, `TERSEDIA`, `DISEWA`, `MAINTENANCE`, `TIDAK_AKTIF`, `MOTOR`, `MOBIL`, `CASH`, `TRANSFER`, `QRIS`, `LAINNYA`, `AKTIF`, `LUNAS`, `BELUM_KEMBALI`, `TERLAMBAT`.

**Phase 4 connector additions** (not in this Phase-3 design pass): `createManualHutang`, `softDeleteUser`, `softDeleteVehicle`, and the ALL_CAPS enum migration in UI string-literal types (`RentalStatus`, `ReturnStatus`, `VehicleCategory`, `PaymentMethod`, `JaminanItem`). Screens with literal comparisons (e.g. `rental.status === "active"`) must be updated. Connector contract (function names + signatures) is unchanged.

---

## 9. Open Decisions / Deferred

### Resolved (all decisions from Phase 3 Q&A)

| Item | Decision |
|------|----------|
| **ID strategy** | Split: `rentals.id` client-minted (`crypto.randomUUID()`) for one-step photo flow; all other tables use server-side `gen_random_uuid()` column default |
| **Mom/farrel UID config** | `app_config` DB table — two rows (`'mom'`, `'farrel'`); RLS policies subquery it; rotation = one UPDATE, no rebuild |
| **Vehicle retirement states** | `TIDAK_AKTIF` (present, withheld) and `deleted_at` (gone) are orthogonal with distinct business semantics |
| **Photo upload atomicity** | One-step: client mints rental UUID, uploads photos, then single atomic RPC |
| **Verification model (two-axis)** | `is_mahasiswa: boolean` + 3-value `verification_status` enum; verification is informational only, never gates a rental |
| **Vehicle foto column** | Deferred entirely to Phase 7; no `photos` JSONB column reserved on `vehicles` in v1.0.0 |
| **Hutang UI type widening** | Phase 4 connector: `Hutang.rentalId: string \| null`; no UI screens reference `rentalId` directly |
| **Manual hutang** | Yes in v1.0.0 — `createManualHutang` connector + Phase 5c UI screen |

### Phase 4 implementation work (not Phase 3 design)

- **ALL_CAPS enum migration in screens**: connector swap must update all screens comparing against lowercase literals (`rental.status === "active"`, `vehicle.category === "motor"`, etc.). Function names + shapes unchanged; only string values change case.
- **UI type widening for verification**: add `isMahasiswa: boolean`, `verificationStatus: VerificationStatus`, and nullable PDDikti detail fields (`namaPddikti`, `tahunMasuk`, `universitas`, `prodi`) to `UserSummary` (the return type of `getUserSummary`). Add `type VerificationStatus = "BELUM_DIVERIFIKASI" \| "TERVERIFIKASI_PDDIKTI" \| "VERIFIKASI_GAGAL"`. The `getUserSummary(id): Promise<UserSummary \| null>` signature is unchanged — `UserSummary` is widened additively.
- **`Hutang.rentalId` widen**: `string` → `string \| null`.

### Still deferred

| Item | Phase | Notes |
|------|-------|-------|
| **Paket → Durasi rename** | 7 | UI copy only; schema column names stay |
| **Edit/delete payment** | 7 | New signatures (`updatePayment`, `deletePayment`); stable `payments.id` makes this additive |
| **Before/after audit capture** | 7+ | v1 ships `created/updated_by/at` only |
| **Dashboard "verified" denominator** | 7 | Open: denominator = all users, or students-only? Decide at Phase 7 UI. `verifiedUsersCount` in v1.0.0 will always be 0 (PDDikti deferred to v1.1) |
| **Vehicle foto** | 7 | No column in v1.0.0 schema |

---

## 10. Verification Checklist

Run this checklist before closing Phase 3 and handing off to Phase 4.

- [ ] **Contract coverage** — every function in `index.ts` (10 functions + `CloseRentalInput`) appears in §8, plus new connectors `createManualHutang`, `softDeleteUser`, `softDeleteVehicle`
- [ ] **Type coverage** — every field in `types.ts` has a home: column, JSONB key, or documented derived value with direction stated
- [ ] **Seed fits** — demo seed (10 users, 14 vehicles, 10 rentals, 1 hutang) is expressible in schema; `hutang-001 → rental-005 → user-005 Rp 250.000` maps correctly. Production launches with vehicles-only pre-seed; users/rentals empty.
- [ ] **ALL_CAPS enums applied** — every enum value in §1.x, §3, §8 uses ALL_CAPS (`ACTIVE`, `TERSEDIA`, `CASH`, `AKTIF`, etc.)
- [ ] **Soft-delete scope correct** — `deleted_at` appears only on `users` and `vehicles` tables; the other four tables have no `deleted_at` column
- [ ] **totalBill formula correct** — active-rental branch includes `add_on.amount`; closed-rental branch uses `subtotal_sewa + Σcharges - discount`
- [ ] **One-step photo flow documented** — §7 shows client-mints rental UUID → uploads photos → single RPC for both create and close
- [ ] **UUID strategy documented** — §7 and §8 both state client-mints `rentals.id`, server `gen_random_uuid()` for all other tables
- [ ] **`TIDAK_AKTIF` vs `deleted_at` semantic split** — §1.2 documents both states and their orthogonal meaning
- [ ] **`app_config` RLS specified** — §4.2 has SELECT/UPDATE/INSERT/DELETE policy per operation
- [ ] **Hutang status trigger spec** — §6.1 has the `recompute_hutang_status` function + trigger with correct `COALESCE(NEW.hutang_id, OLD.hutang_id)` pattern
- [ ] **`subtotal_sewa` always written** — §1.3 notes `subtotal_sewa IS NULL ⇔ rental is ACTIVE`; §3 formula branches on this
- [ ] **Roadmap §4 present** — audit triggers, RLS pattern, PDDikti fields, nullable `hutang.rental_id`, reserved nullable `tujuan`, `is_mahasiswa`, 3-value `verification_status` enum all appear ✓
- [ ] **No premature build** — no `.sql` files, no `supabase/` directory created
- [ ] Optional: run `connector-contract-reviewer` agent against §8 and `index.ts`
