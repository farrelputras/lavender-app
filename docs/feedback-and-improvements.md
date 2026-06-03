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
- **Remaining (→ Stage B2):** the demo-era rental-flow screens still use the old design and
  copy — Beranda (01), DetailSewa (04), PenyewaanDetail aktif/selesai (06/08), Pengembalian
  (07), plus PilihKendaraan. Items 4, 5, 8 and the rest of item 6 live in those screens.
- **Status:** in-progress (Stage B shipped screens 09–15 via OTA; rental-flow redesign
  deferred to Stage B2 — see `docs/superpowers/specs/2026-06-02-phase-7-iteration-1-design.md`)

### 3. Edit / delete pembayaran
- **Detail:** Allow editing or deleting a recorded payment, to recover from a typo
  or mistaken entry.
- **Status:** open

### 4. "Paket" → "Durasi" rename
- **Detail:** Replace all "Paket" wording with "Durasi" across the app — in
  business terms there is no "package", only a rental duration. App-wide copy change.
- **Status:** open — slotted to **Stage B2** (rental-flow redesign). "Paket Sewa" still
  appears in `DetailSewaScreen` / `PenyewaanDetailScreen`; renamed when those screens are
  redesigned.

### 5. Waktu Sewa → 3-row layout
- **Detail:** Restructure the Waktu Sewa block into three stacked rows —
  **Mulai / Kembali / Durasi**. Remove the "Paket" pill; its value becomes the
  Durasi row.
  - **Applies to:** DetailSewa (Sewa Baru → Detail, *create*), PenyewaanDetail
    (Aktif), Pengembalian (return form).
  - **"Terlambat …" warning** sits below the card and appears only on
    PenyewaanDetail (Aktif) and Pengembalian — a brand-new rental can't be late, so
    it is omitted on DetailSewa.
  - **Open decision (deferred to Phase 7):** on DetailSewa the duration is an
    editable input (today: Hari stepper + Jam 0/6/12 segmented control), so the
    Durasi row's edit affordance must change. Options — (A) make Durasi derived:
    edit Mulai + Kembali, Durasi auto-fills; (B) tap Durasi to expand the existing
    stepper; (C) keep the editable stepper section separate and make the 3-row block
    a read-only summary. On Pengembalian, Kembali is the actual return time, so
    Durasi is naturally derived (read-only).
- **Status:** open — slotted to **Stage B2** (lands when DetailSewa / PenyewaanDetail /
  Pengembalian are redesigned). The deferred Durasi-affordance decision (A/B/C above) is
  resolved as part of that stage.

### 6. Edit-action consistency
- **Detail:** Standardize every edit affordance to "(pencil icon) Edit" — replace
  the scattered "edit" / "ubah" / bare-pencil variants so label and icon are
  consistent across all screens. Per-screen occurrence inventory: TBD.
- **Status:** in-progress — the Stage B redesign (screens 09–15) establishes a consistent
  edit affordance on the new screens; legacy rental-flow screens (`DetailSewaScreen`,
  `PenyewaanDetailScreen`, `PilihKendaraanScreen`) still vary → finished in **Stage B2**.

### 7. Tujuan field adjustment
- **Detail:** TBD
- **Status:** open

### 8. Change all "Penyewaan" into "Rental"
- **Detail:** Rename "Penyewaan" → "Rental" app-wide. The bottom-tab and list screen
  (`RentalScreen`) are already "Rental"; the `PenyewaanDetail` screen + its route name and
  the remaining "Penyewaan" copy (Beranda, navigators) still need renaming.
- **Status:** in-progress — tab/list label done in Stage B; `PenyewaanDetail` screen +
  route rename deferred to **Stage B2**.

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

## v1.1
- **Status:** open
- **Due:** TBD

### 1. Rather than using supabase library, make seperate backend service
- **Detail:** TBD (need to be discussed critically because this is a major architectural change)
- **Status:** open