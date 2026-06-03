# Feedback & Improvements

Running log of feedback (primarily from mom's real-world use) and improvement
items. Each entry records the resolution detail, target phase, and status, so the
relevant implementation plan can pull from a single source as it accumulates.

Phase definitions live in the roadmap:
`docs/superpowers/specs/2026-05-26-v1-roadmap-design.md`. Most v1.0 feedback is
bundled into **Phase 7 (Feedback polish + QA)**.

## v1.0 — Phase 7 (Feedback polish + QA)
- **Status:** in-progress
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
- **Status:** open

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
- **Detail:** TBD
- **Status:** open

### 8. Change all "Penyewaan" into "Rental"
- **Detail:** Rename "Penyewaan" → "Rental" app-wide.
- **Resolution:** `PenyewaanDetail` route renamed to `RentalDetail` in `navigationTypes.ts`
  (typed-contract change); file renamed to `RentalDetailScreen.tsx`; component/export
  renamed; all 6 `navigate("PenyewaanDetail", …)` callers updated. "Penyewaan" user-facing
  copy replaced in `BerandaScreen`, `DetailSewaScreen`, `RentalDetailScreen`.
- **Status:** done (Stage B2 — 2026-06-04)

## v1.0.1
- **Status:** open
- **Due:** TBD

### 1. When opening camera, default to main camera instead of selfie camera
- **Detail:** TBD
- **Status:** open

### 2. Add "Kembali ke Beranda" button in Detail Rental Selesai screen
- **Detail:** TBD
- **Status:** open

### 3. Never pre-fill the following fields
- **Detail:** To make my mom aware, never pre-fill these fields:
  - Jumlah Pembayaran (in Tambah Pembayaran)
- **Status:** open

### 4. Zoom in and show the picture once clicked
- **Detail:** TBD
- **Status:** open

### 5. Adjust some text sizes
- **Detail:** TBD
- **Status:** open

## v1.1
- **Status:** open
- **Due:** TBD

### 1. Rather than using supabase library, make seperate backend service
- **Detail:** TBD (need to be discussed critically because this is a major architectural change)
- **Status:** open