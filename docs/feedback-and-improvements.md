# Feedback & Improvements

Running log of feedback (primarily from mom's real-world use) and improvement
items. Each entry records the resolution detail, target phase, and status, so the
relevant implementation plan can pull from a single source as it accumulates.

Phase definitions live in the roadmap:
`docs/superpowers/specs/2026-05-26-v1-roadmap-design.md`. Most v1.0 feedback is
bundled into **Phase 7 (Feedback polish + QA)**.

## v1.0 — Phase 7 (Feedback polish + QA)

### 1. Tujuan field adjustment
- **Detail:** TBD
- **Status:** open

### 2. Edit / delete pembayaran
- **Detail:** Allow editing or deleting a recorded payment, to recover from a typo
  or mistaken entry.
- **Status:** open

### 3. "Paket" → "Durasi" rename
- **Detail:** Replace all "Paket" wording with "Durasi" across the app — in
  business terms there is no "package", only a rental duration. App-wide copy change.
- **Status:** open

### 4. Waktu Sewa → 3-row layout
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
- **Status:** open

### 5. Edit-action consistency
- **Detail:** Standardize every edit affordance to "(pencil icon) Edit" — replace
  the scattered "edit" / "ubah" / bare-pencil variants so label and icon are
  consistent across all screens. Per-screen occurrence inventory: TBD.
- **Status:** open

### 6. Replace Math.random() UUID with cryptographically secure UUID
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
- **Status:** open
