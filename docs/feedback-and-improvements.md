# Feedback & Improvements — v1.0 and v1.0.1

> **This document is now a closed historical record.** It covers **v1.0 (Phase 7)** and **v1.0.1**,
> both shipped. Nothing here is open work.
>
> Current and future work lives elsewhere — split out on 2026-07-12 because this file had grown into
> four different kinds of thing at once:
>
> | Looking for | Go to |
> |---|---|
> | The release being worked on now | `docs/releases/v1-0-2.md` |
> | Editing an active rental (scoping note) | `docs/releases/v1-0-3.md` |
> | Replacing Supabase with our own backend | `docs/releases/v1-1.md` |
> | Standing debt, triaged per release | `docs/known-technical-debt.md` |
>
> **New feedback from mom goes into the open release doc**, not here.

Log of feedback (primarily from mom's real-world use) and improvement items. Each entry records the
resolution detail, target phase, and status.

Phase definitions live in the roadmap:
`docs/superpowers/specs/2026-05-26-v1-roadmap-design.md`. Most v1.0 feedback is
bundled into **Phase 7 (Feedback polish + QA)**.

## v1.0 — Phase 7 (Feedback polish + QA)
- **Status:** done — Stages A / B / B2 / C all shipped (2026-06-04)
- **Due:** 5 June 2026

### 0. Replace Math.random() UUID with cryptographically secure UUID
- **Detail:** `createRental` currently uses a `Math.random()`-based UUID v4 because
  `crypto.randomUUID()` wasn't available in the current dev client build. At the
  next dev client rebuild (Phase 6 or later), swap to:
  ```
  pnpm add react-native-get-random-values uuid
  pnpm add -D @types/uuid
  ```
  Then in `app/services/rentals/index.ts`, replace `uuidv4()` with:
  ```ts
  import 'react-native-get-random-values'  // must be first import in entry file
  import { v4 as uuidv4 } from 'uuid'
  ```
  Note: the polyfill import must appear before `uuid` is loaded — put it at the
  top of `index.tsx` (app entry), not in the connector file.
- **Resolution:** `app/utils/uuid.ts` now delegates to `uuid` v11's `v4()`;
  `react-native-get-random-values` is the first import in `index.tsx`. No
  `@types/uuid` needed (uuid v11 ships its own types). The `uuidv4()` signature is
  unchanged, so all callers are untouched (contract-safe). Guarded by a jest Web-Crypto
  polyfill in `test/setup.ts` so the suite stays green.
- **Status:** done (Phase 7 Stage A — shipped in v1.0.0 preview APK, 2026-06-02)

### 1. Setup OTA update infrastructure
- **Detail:** EAS Update (`expo-updates`) wired to a single `preview` channel with
  silent check-on-launch (`fallbackToCacheTimeout: 0`). `runtimeVersion` policy is
  **`appVersion`** — `fingerprint` was tried first but fell back: it computed differently
  Windows↔EAS-Linux, which would have stranded OTA delivery. JS/asset updates ship via
  `pnpm ota:publish`; bump `version` + rebuild the APK only when native deps change. See
  `docs/superpowers/specs/2026-06-02-phase-7-iteration-1-design.md`.
- **Status:** done (Phase 7 Stage A — shipped in v1.0.0 preview APK, 2026-06-02)

### 2. Make UI screen designs through Google Stitch and update all screens accordingly
- **Detail:** Redesign every screen from Google Stitch references, OTA-delivered. Absorbs
  items 4, 5, 6, 8 (see those entries).
- **Resolution (Stage B — done, 2026-06-03):** Stitch references `ui-reference/mobile/09–15`
  generated and translated to RN: `UserScreen`, `RentalScreen` (list), `HutangScreen`
  (list), `UserDetailScreen`, `UserFormScreen`, `HutangFormScreen`, `HutangDetailScreen`.
  New shared components `StatusPill` + `SearchField`; `FieldCard` moved to a shadow-only
  (borderless) card pattern; `theme/tokens.ts` extended. Tests 63/63 green; shipped via OTA.
- **Resolution (Stage B2 — done, 2026-06-04):** Rental-flow screens redesigned in-code from
  the Stage-B design language (derive-in-code, no new Stitch round-trip): `BerandaScreen`
  (shadow-only cards, StatusPill chips), `PilihKendaraanScreen` (SearchField component,
  shadow-only userStrip, icon+Edit), `DetailSewaScreen` (item 5 Option C — Durasi stepper
  section relabeled, Waktu Sewa → 3-row with editable Mulai + derived Kembali+Durasi),
  `RentalDetailScreen` (renamed from PenyewaanDetail — 3-row Waktu Sewa read-only, Terlambat
  below card, shadow-only cards), `PengembalianScreen` (3-row Waktu Sewa with editable Kembali,
  derived Durasi row, Terlambat below card, shadow-only cards). 63/63 tests green.
- **Status:** done (Stage B2 — 2026-06-04, on branch feat/phase7-stage-b2)

### 3. Edit / delete pembayaran
- **Detail:** Allow editing or deleting a recorded payment, to recover from a typo
  or mistaken entry.
- **Resolution:** Soft-delete via `payments.deleted_at` (migration `0014`). Auth-gated: active-rental + hutang payments editable by any operator (mom); closed-rental payments admin-only (Farrel emergency). New SECURITY-DEFINER RPCs `rpc_update_payment`/`rpc_delete_payment` with `recompute_rental_hutang` helper for closed-rental Hutang recompute. Four new locked connectors (`updatePayment`, `deletePayment`, `updateHutangPayment`, `deleteHutangPayment`). `useSession` extended with `role`. `PembayaranSheet` extended with edit mode + "Hapus Pembayaran" destructive action. Wired on `RentalDetailScreen`, `HutangDetailScreen`, `PengembalianScreen`.
- **Status:** done (Stage C — 2026-06-04, on branch feat/phase7-stage-c)

### 4. "Paket" → "Durasi" rename
- **Detail:** Replace all "Paket" wording with "Durasi" across the app — in
  business terms there is no "package", only a rental duration. App-wide copy change.
- **Resolution:** All user-facing "Paket Sewa" / "Paket:" copy replaced. Internal symbols
  (`durationToPaket`, `formatPaket`, `paketHari`, `paketJam`) unchanged (connector-locked).
- **Status:** done (Stage B2 — 2026-06-04)

### 5. Waktu Sewa → 3-row layout
- **Detail:** Restructure the Waktu Sewa block into three stacked rows —
  **Mulai / Kembali / Durasi**. Remove the "Paket" pill; its value becomes the
  Durasi row.
- **Resolution (Option C chosen):** Hari/Jam editable stepper section relabeled "Durasi"
  (always visible); the 3-row block (Mulai / Kembali / Durasi) is a **summary**. On
  `DetailSewaScreen`: Mulai = editable picker, Kembali + Durasi = read-only (derived from
  stepper + Mulai via useEffect; old edit-Kembali-recomputes path removed). On
  `RentalDetailScreen` and `PengembalianScreen`: all three rows read-only; "Terlambat"
  warning rendered below the card (not inside).
- **Status:** done (Stage B2 — 2026-06-04)

### 6. Edit-action consistency
- **Detail:** Standardize every edit affordance to "(pencil icon) Edit" — replace
  the scattered "edit" / "ubah" / bare-pencil variants so label and icon are
  consistent across all screens.
- **Resolution:** Two affordance roles standardized: *inline section-edit* links (previously
  "Ubah"/"Edit"/bare-pencil) → `MaterialIcons "edit"` + "Edit" label on `DetailSewaScreen`,
  `PilihKendaraanScreen`, `RentalDetailScreen`, `PengembalianScreen`; *whole-record header edit
  buttons* kept icon-only (Stage-B established pattern, e.g. `UserDetailScreen`).
- **Status:** done (Stage B2 — 2026-06-04)

### 7. Tujuan field adjustment
- **Detail:** New required "Tujuan" (destination) field on rentals.
- **Resolution:** DB column `rentals.tujuan TEXT` was already reserved in `0003`; `v_rentals` and `rpc_create_rental` were already wired. Stage C added UI only: `tujuan: string` to `Rental` type and `CreateRentalInput`, translator mapping in `rowToRental`, required-validated `TextInput` in `DetailSewaScreen`, and read-only display block in `RentalDetailScreen`. 3 new `rowToRental` translator tests added.
- **Status:** done (Stage C — 2026-06-04, on branch feat/phase7-stage-c)

### 8. Change all "Penyewaan" into "Rental"
- **Detail:** Rename "Penyewaan" → "Rental" app-wide.
- **Resolution:** `PenyewaanDetail` route renamed to `RentalDetail` in `navigationTypes.ts`
  (typed-contract change); file renamed to `RentalDetailScreen.tsx`; component/export
  renamed; all 6 `navigate("PenyewaanDetail", …)` callers updated. "Penyewaan" user-facing
  copy replaced in `BerandaScreen`, `DetailSewaScreen`, `RentalDetailScreen`.
- **Status:** done (Stage B2 — 2026-06-04)

## v1.0.1
- **Status:** ✅ **done — shipped OTA 2026-07-12** (channel `preview`, no APK / no `version` bump)
- **Design:** `docs/superpowers/specs/2026-07-02-v1-0-1-design.md`
- **Plan:** `docs/superpowers/plans/2026-07-02-v1-0-1-plan.md`
- **Shipped:** items 2, 3a, 3b, 4, 6. Item 1 closed (not needed); item 5 deferred.
- **Migrations:** `0016_admin_hard_delete` (4 admin RPCs) and `0017_storage_delete_policy`
  (DELETE policy on the photo bucket — see item 6's "Found during implementation").
- **Verification:** 19 suites / 80 tests green; migration 0016 behaviorally verified against
  production (`docs/verification/task-3.4-admin-hard-delete.sql`).

### 1. When opening camera, default to main camera instead of selfie camera
- **Detail:** TBD
- **Status:** closed (not needed)

### 2. Add "Kembali ke Beranda" button in Detail Rental Selesai screen
- **Detail:** `RentalDetailScreen` renders a sticky bottom bar only for `ACTIVE` rentals
  (the "Proses Pengembalian" CTA); a completed rental has no bottom bar, so the only way
  back is the top-left arrow. Add a mirror bottom bar for the completed state with a
  full-width **"Kembali ke Beranda"** button calling the existing `handleBack()`
  (`navigation.reset` → MainTabs).
- **Resolution:** Mirror bottom bar added for `status === "COMPLETED"`, reusing the existing
  `bottomBar` container and `handleBack()`. No new nav logic.
- **Status:** done (v1.0.1 Phase 1 — shipped OTA 2026-07-12)

### 3. Never pre-fill the following fields
- **Detail:** To make mom aware, never pre-fill these fields:
  - **Jumlah Pembayaran** (Tambah Pembayaran) — drop `defaultAmount` on the *add* path so
    the field opens empty. The *edit* path still shows the existing amount (that is the
    record, not a pre-fill).
  - **Tarif & Total, even the placeholder** (Sewa Baru) — keep the `composeTarif`-computed
    value **visible but read-only** as `Saran tarif: Rp X`; remove the numeric placeholder,
    the silent empty→default fallback, and any auto-seed of the field. An empty tarif is
    invalid (existing "Tarif harus lebih dari 0" guard); Total reads Rp 0 until mom types
    the number.
- **Resolution (3a):** `defaultAmount` dropped on the *add* path at **four** callers, not the
  three the design named — `DetailSewaScreen` was a fourth add-payment caller that also
  pre-filled. Edit path untouched (it prefills from `editingPayment`, which is the record).
- **Resolution (3b):** `DetailSewaScreen` tarif is now empty on open with a neutral
  "Masukkan tarif" placeholder; the computed value shows as a read-only `Saran tarif: Rp X`
  line. Silent empty→`defaultTarif` fallback removed (`tarifValue` is now `0` when empty),
  auto-seed effect and the unused `tarifChanged` deleted. Total reads Rp 0 until mom types.
- **Status:** done (v1.0.1 Phase 1 — shipped OTA 2026-07-12)

### 4. Zoom in and show the picture once clicked
- **Detail:** `PhotoThumb` has no tap handler today. Add a shared `PhotoViewer` full-screen
  `Modal` with pinch-zoom + pan + double-tap-to-zoom, built on the already-installed
  `react-native-gesture-handler` + `react-native-reanimated` (OTA-safe, no native rebuild).
  Wire tap on `RentalDetailScreen` (Kondisi Keluar/Kembali photos) and `UserDetailScreen`
  (KTP/KTM/profil).
- **Resolution:** New `app/components/form/PhotoViewer.tsx` — full-screen `Modal`, pinch +
  pan + double-tap-to-zoom, ✕ to close. Optional `onPress` threaded through `_PhotoThumb` →
  `PhotoRow` (`onPhotoPress`) and `PhotoSlot` (`onPress`), all back-compatible. Wired on
  `RentalDetailScreen` (Kondisi photos) and `UserDetailScreen` (KTP/KTM/profil). Required a
  `react-native-reanimated/mock` registration in `test/setup.ts` for the suite to render it.
- **Status:** done (v1.0.1 Phase 2 — shipped OTA 2026-07-12)

### 5. Adjust some text sizes
- **Detail:** Deferred — awaiting mom's specific "too small / too large" spots. Once
  gathered, likely a small pass on the smallest `labelMd`/hint tiers in `theme/tokens.ts`,
  or enabling `allowFontScaling` to respect the OS accessibility setting.
- **Status:** did not ship in v1.0.1 (deliberately deferred). **Carried over to v1.0.2 —
  see `docs/releases/v1-0-2.md` item 1**, which records a finding that may reframe it:
  `allowFontScaling` is unset app-wide, so RN's default (`true`) already applies and Android's
  system font slider resizes the app today.

### 6. Add admin-specific operations
- **Detail:** Admin-only (Farrel) hard-delete across entities, **block-if-referenced**
  (confirmed). Migration `0016` adds four `SECURITY DEFINER`, admin-gated RPCs:
  `rpc_admin_delete_rental` (cascade owned `payments`/`charges`/linked `hutang`, release an
  `ACTIVE` vehicle), `rpc_admin_delete_hutang` (delete its payments, then the hutang), and
  `rpc_admin_delete_user` / `rpc_admin_delete_vehicle` (raise if any rental/hutang still
  references them). Four locked connectors (`hardDeleteRental` / `hardDeleteHutang` /
  `hardDeleteUser` / `hardDeleteVehicle`) that also clean up owned storage photos.
  Admin-only (`isAdmin`) destructive actions on the four detail screens, behind a
  confirmation.
- **Resolution:** Migration `0016` shipped the four `SECURITY DEFINER` RPCs as designed and is
  live on production, **behaviorally verified** end-to-end (auth gate, rental cascade + vehicle
  release, both block-if-referenced paths) — script kept at
  `docs/verification/task-3.4-admin-hard-delete.sql`. Four locked connectors added, plus a
  `removePaths` storage helper. Admin-only "Hapus … Permanen" actions on `RentalDetailScreen`,
  `HutangDetailScreen`, `UserDetailScreen`. **Vehicle hard-delete ships as RPC + connector only,
  no UI** — there is no vehicle detail screen (`KendaraanScreen` is a stub); it's a one-screen
  wire-up whenever that screen exists.
- **Found during implementation — two defects the design had reasoned wrong:**
  1. **The real DB error never reached the operator.** The design assumed a failed RPC throws an
     `Error`. It does not: the Supabase client isn't configured with `.throwOnError()`, so
     `supabase.rpc()` returns its error as a **plain object** (`{message, details, hint, code}`).
     Every screen's `e instanceof Error ? e.message : "…"` was therefore always false, and the
     Postgres message was always discarded. This hit hardest on `hardDeleteUser`, where
     block-if-referenced is the *dominant* path — the admin saw only a generic "Coba lagi" and
     could never learn *why* a delete was refused. Fixed at the connector layer (`throw new
     Error(error.message || …)`), which repairs all three screens at once. The unit tests had
     hidden it by mocking `error: new Error(...)` — a shape Supabase never produces; they now
     mock the real plain-object shape and fail if the connector regresses.
  2. **Photo cleanup was a silent no-op.** The design concluded that because the RPCs are
     `SECURITY DEFINER` (bypassing RLS), "no new DELETE RLS policies are required." That is true
     for the *tables* but **not for storage** — `removePaths()` is a client-side call from the
     app, not code inside the definer function, so it is subject to RLS. `storage.objects` had
     only INSERT and SELECT policies (`0006_rls.sql` even states hard DELETE is denied
     everywhere), so the removal was blocked and its error swallowed by the deliberate
     `.catch(() => {})`. Hard-deleting a customer erased the row but left their **KTP/KTM ID
     scans in the bucket forever** — a privacy issue, not just housekeeping. Fixed by migration
     `0017_storage_delete_policy.sql`, granting DELETE on `rental-photos` to the **admin role
     only** (mom's `ops` role still cannot delete any file).
- **Also hardened past the plan:** the Rental and Hutang confirmations now *name the record*
  they will destroy (customer + plate + date; customer + outstanding amount) instead of a
  generic "Rental ini…", and `UserDetailScreen`'s permanent-delete uses a **filled** destructive
  style so it can't be confused with the reversible soft-delete sitting next to it.
- **Status:** done (v1.0.1 Phase 3 — shipped OTA 2026-07-12)

---

## Moved out of this document (2026-07-12)

- **Known technical debt** → `docs/known-technical-debt.md` (both items still open, plus a third
  found during the v1.0.2 audit)
- **v1.1 — separate backend service** → `docs/releases/v1-1.md`