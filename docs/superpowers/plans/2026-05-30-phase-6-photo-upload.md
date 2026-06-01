# Phase 6 — Photo Upload (Camera → Supabase Storage) Implementation Plan

> **Status: ✅ COMPLETED 2026-06-02** — All 9 tasks shipped across commits `phase-6a` through `phase-6g`. Device-verified: user photos (Profil/KTP/KTM), rental kondisi photos (keluar/kembali), signed-URL hydration, PhotoRow/PhotoSlot shared components.

> **For agentic workers:** Execute with `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`, task-by-task. Steps use checkbox tracking; commit at the end of each task. `pnpm run compile` and `pnpm test` must stay green between tasks.

## Context

Phase 5 shipped the day-to-day frontend, but every photo surface is still a stub:
- `UserFormScreen` renders a `PhotoRow` whose `onAdd` just `Alert`s "Foto user akan tersedia di Phase 6".
- `DetailSewaScreen` (`addPhoto` at ~296) and `PengembalianScreen` push `{ id, uri: null }` placeholders.
- `createRental`/`closeRental` hard-code `photos: []` with `// Phase 6` comments (`index.ts:204`, `:248`).
- `rowToUser` maps KTP/KTM to `{ id, uri: null }` — `uri` is never populated.

Phase 6 (roadmap §3, §4.6, §7; backend design §7) makes photos real: capture from camera/gallery, upload to the private `rental-photos` Supabase bucket, read back via signed URLs. This is the last feature before the Phase 7 QA + APK ship, and it satisfies two Definition-of-Done items: *"register a user with KTP/KTM photos"* and *"photos survive app restart and reach Supabase Storage."*

**Two product additions confirmed this session:**
1. Cover **both** surfaces (user docs + rental kondisi) in this phase.
2. Add a third user photo — **Foto Profil** (portrait) — shown as the avatar in the User list so Mom recognizes customers by face.
3. Rental screens get **refactored to the shared `PhotoRow`** (not minimal in-place wiring).

## Critical constraint — the RN upload primitive (verified via docs this session)

React Native **cannot** upload `Blob`/`File`/`FormData` to Supabase Storage — they produce zero-byte/corrupt objects. The canonical path (confirmed in Supabase + Expo SDK 55 docs):

```ts
// app/services/photos/storage.ts
import * as FileSystem from "expo-file-system/legacy" // stable in SDK 55; new File().base64() is the alt
import { decode } from "base64-arraybuffer"
import { supabase } from "../supabase/client"

const BUCKET = "rental-photos"

export async function uploadPhoto(localUri: string, storagePath: string, contentType: string): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 })
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, decode(base64), { contentType, upsert: false })
  if (error) throw error
}

export async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (paths.length === 0) return map
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24) // 24h, §7
  if (error) throw error
  for (const row of data ?? []) if (row.signedUrl && row.path) map.set(row.path, row.signedUrl)
  return map
}
```

This primitive is the **one piece `tsc`/Jest cannot prove** — Task 1 verifies it on a real device before any screen work. `base64-arraybuffer` is a tiny pure-JS dep (no native module, OTA-safe).

## Architecture

| Concern | Where | Notes |
|---|---|---|
| **Capture** (camera/gallery picker → local uri) | `app/services/photos/capture.ts` | `expo-image-picker`; requests permission, returns `{ uri, mimeType }`. Imported by **screens**. |
| **Upload + sign** | `app/services/photos/storage.ts` | base64→ArrayBuffer upload + batch `createSignedUrls`. Imported by **connector** (`index.ts`). |
| **Pure path builders + uuid** | `app/services/photos/paths.ts` (+ `.test.ts`) | `buildUserPhotoPath(userId, slot, ext)`, `buildRentalPhotoPath(rentalId, phase, ext)`, `extFromMime(mime)`. Reuses extracted `uuidv4`. |
| **Signed-URL hydration** | inside `index.ts` connectors, **after** the pure translator | Translators stay synchronous/pure; the async `path → uri` step reads paths from the **raw row** and calls `signPaths` once (batch). |

**Contract honesty (CLAUDE.md §3):** signatures stay frozen. `createRental`/`closeRental` already accept `kondisiKeluar.photos: {id,uri}[]` — Phase 6 changes only the body: screens put **local** uris in, the connector uploads them and persists `{id,path}`. `CreateUserInput`/`UpdateUserInput` are **widened** with optional photo fields (a compatible widening of Phase-5 functions). The UI never calls `storage.*` directly for persistence — connectors own upload; screens only call `capture.*` for local preview.

**Storage RLS / delete:** migration `0006` keys `storage.objects` policies on `bucket_id = 'rental-photos'` + operator uid (no path prefix) — so `users/{id}/…` paths need **no new policy**. Storage DELETE is denied in v1, so "remove photo" = unset the JSONB pointer and orphan the object (consistent with §7; GC deferred). The `rental-photos` bucket already exists (Phase 4 manual step).

**Cache / retry policy (the "basic" bar from §7).** Capture → copy into `documentDirectory` (durable local) → show thumbnail from local uri immediately. Upload happens at **Save** (synchronous, behind the existing saving spinner). No persistent offline queue (out of scope per §7). The two surfaces use **deliberately different failure models** — this is correct, not an inconsistency:
- **Rentals (create/close):** the connector uploads *before* the RPC, so on failure **no DB row exists** — the Save fails, the form stays mounted with local photos intact, and tapping Save again cleanly re-runs (re-mints id for create). Orphaned uploads acceptable per §7.
- **User create:** the row is inserted *first* (`RETURNING id`) *then* photos upload. If a re-Save re-ran the insert it would create a **duplicate user**. So user-create photo uploads are **best-effort**: each slot wrapped in try/catch, failed slots left null, and the created `User` is returned **regardless** — creation never fails on a photo. Mom adds the missing photo later from **Edit**, where re-Save is an idempotent `update` (safe to retry). Surface a non-fatal toast: *"User tersimpan, foto gagal diupload — coba lagi dari Edit."*

---

## Task list

### Sub-phase 6a — Photo service foundation

**Task 1 — Upload primitive + on-device spike (the de-risk task).**
- Add deps: `pnpm add base64-arraybuffer` (pure JS).
- Create `app/services/photos/storage.ts` (`uploadPhoto`, `signPaths` as above) and `app/services/photos/paths.ts` (extract `uuidv4` from `rentals/index.ts` into a shared `app/utils/uuid.ts`; add `buildUserPhotoPath`/`buildRentalPhotoPath`/`extFromMime`).
- Create `paths.test.ts` (pure): path shape `users/{id}/profil/{uuid}.jpg`, `rentals/{id}/kondisi-keluar/{uuid}.jpg`; `extFromMime("image/png") === "png"`, default `jpg`.
- **Device spike (required, MCP-verifiable):** a throwaway button that picks an image and calls `uploadPhoto` then `signPaths`. Confirm with the **supabase MCP** that the object landed in the bucket and the signed URL renders. If `expo-file-system/legacy` import misbehaves on SDK 55, fall back to `new File(uri).base64()` — decide here, before screens depend on it.
- `pnpm run compile` + `pnpm test` green. Commit.

**Task 2 — Capture service.**
- Create `app/services/photos/capture.ts`: `captureFromCamera()`, `captureFromGallery()` (request perms via `ImagePicker.requestCameraPermissionsAsync`/`requestMediaLibraryPermissionsAsync`; `quality: 0.8` so KTP/KTM text like NIM stays legible, no base64 in picker), and `choosePhotoSource(): Promise<{uri, mimeType} | null>` (an `Alert` with Kamera / Galeri / Batal). Copy chosen file into `documentDirectory` (legacy `copyAsync`) and return the cached uri.
- Compile + commit.

### Sub-phase 6b — Shared photo components

**Task 3 — Upgrade `PhotoRow` (multi) + add `PhotoSlot` (single).**
- `components/form/PhotoRow.tsx`: extend `PhotoItem` to `{ id; uri: string | null; status?: "uploaded" | "pending" | "failed" }`; render real `<Image source={{ uri }}>` (replace the placeholder `image` icon); spinner overlay for `pending`, error tint for `failed`. Keep `onAdd`/`onRemove` props (screens wire `onAdd` to `choosePhotoSource`).
- New `components/form/PhotoSlot.tsx`: single labeled square (`label`, `photo: PhotoItem | null`, `onCapture`, `onRemove`) for Profil / KTP / KTM. Shares the same `<Image>` + status rendering.
- Compile + commit.

### Sub-phase 6c — User photos (Profil + KTP + KTM)

**Task 4 — Migration `0013_user_profil_photo.sql`.**
- `ALTER TABLE users ADD COLUMN profil_photo JSONB;` then `DROP VIEW … / CREATE VIEW v_user_summaries` adding `u.profil_photo` to the SELECT (follow the exact rebuild pattern in `0008_user_photos.sql`). Apply via Supabase SQL editor (or supabase MCP); verify column present on table and view. Commit.

**Task 5 — Types + translators + connector hydration.**
- `types.ts`: add `profilPhoto: { id; uri } | null` to `User`; add `profilPhoto` to `UserSummary`. Widen `CreateUserInput`/`UpdateUserInput` with per-slot photo inputs: `profilPhoto?/ktpPhoto?/ktmPhoto?: PhotoInput` where `type PhotoInput = { kind: "keep" } | { kind: "remove" } | { kind: "new"; uri: string; mimeType?: string }`.
- `translators.ts`: map `profil_photo` like ktp/ktm (`{ id, uri: null }`, pure — path stays in the raw row).
- `index.ts`:
  - `getUser`/`getUserSummary`/`getUserSummaries`: after translating, collect non-null photo paths from raw rows (across all rows for the list), call `signPaths` **once**, assign `uri` per slot by matching `path`.
  - `createUser`: insert row (no photos) → `RETURNING id` → for each `kind:"new"` slot upload to `buildUserPhotoPath(id, slot, ext)`, **each wrapped in try/catch (best-effort — never throw on a photo failure)** → `updateUser` with whatever paths succeeded. Always return the hydrated `User`; report which slots failed (non-fatal) so the screen can toast. **Do not** let a photo error abort creation (would orphan the row and risk a duplicate on re-Save).
  - `updateUser`: per slot — `new` → upload + set `{id,path}`; `remove` → set `null`; `keep` → omit from the update payload (don't touch column). Here upload failure *may* throw (re-Save is idempotent).
- Add `translators.test.ts` case for `rowToUser` profil mapping. Compile + test + commit.

**Task 6 — Wire UserForm / UserDetail / UserScreen.**
- `UserFormScreen.tsx`: add a "Foto Profil" `PhotoSlot` (single) and the KTP/KTM `PhotoSlot`s; track per-slot state (`{remoteId,uri}` unchanged | `{localUri,mimeType}` new | `null` removed); on save derive `PhotoInput` per slot and pass into create/update. Remove the Phase-6 placeholder `Alert`.
- `UserDetailScreen.tsx`: render the three photos (signed `uri`).
- `UserScreen.tsx`: in `UserRow`, show `profilPhoto.uri` as the avatar `<Image>` when present, else fall back to `initialsFromName`.
- Compile + commit. **Device check:** create user with all 3 photos → list avatar shows face → kill app → reopen → photos load.

### Sub-phase 6d — Rental kondisi photos

**Task 7 — Connector upload bodies (no signature change).**
- `index.ts` `createRental`: after minting `rentalId`, for each `kondisiKeluar.photos` entry with a local `uri`, `uploadPhoto` to `buildRentalPhotoPath(rentalId, "kondisi-keluar", ext)`, build `[{id, path}]`, pass into `rpc_create_rental` (replace `photos: []` at `:248`).
- `closeRental`: same for `kondisiKembali.photos` → `kondisi-kembali` (replace `:204`).
- `getRental`: hydrate `kondisiKeluar`/`kondisiKembali` photo `uri`s via `signPaths` from raw-row JSONB paths (batch, matched by id).
- Compile + commit.

**Task 8 — Refactor rental screens to shared `PhotoRow`.**
- `DetailSewaScreen.tsx`: replace the inline strip (~617-636) and `addPhoto`/`removePhoto` stubs (~296-301) with `<PhotoRow>` driven by `choosePhotoSource`; photos held as local-uri items, passed into `createRental` via `kondisiKeluar.photos`.
- `PengembalianScreen.tsx`: same for the inline add tile (~570-585) + `photos: []` at `:297`; pass into `closeRental` via `kondisiKembali.photos`.
- `PenyewaanDetailScreen.tsx`: render kondisi photos (signed uris) read-only if not already.
- Compile + commit. **Device check:** create rental with keluar photos, return with kembali photos, view on detail.

### Sub-phase 6e — Verification & cleanup

**Task 9 — Full DoD walkthrough + cleanup.**
- Remove the Task 1 throwaway spike button before committing. Run the device acceptance script (below). Confirm objects in Storage via supabase MCP. Update `CLAUDE.md` phase table (Phase 6 ✅), `docs/feedback-and-improvements.md` if relevant, and mark plan tasks done.

---

## Files

**New:** `app/services/photos/{storage,capture,paths,paths.test}.ts`, `app/utils/uuid.ts`, `app/components/form/PhotoSlot.tsx`, `supabase/migrations/0013_user_profil_photo.sql`.
**Modified:** `app/components/form/PhotoRow.tsx`; `app/services/rentals/{types,translators,translators.test,index}.ts`; `app/screens/{UserFormScreen,UserDetailScreen,UserScreen,DetailSewaScreen,PengembalianScreen,PenyewaanDetailScreen}.tsx`; `package.json`.

## Reused existing code
- `uuidv4()` currently private in `rentals/index.ts:224` → extract to `app/utils/uuid.ts`, import in both connector and `paths.ts`.
- `v_user_summaries` rebuild pattern: copy from `0008_user_photos.sql`.
- `initialsFromName`/`formatRupiah` in `app/utils/format` (UserScreen avatar fallback).
- `supabase` client (`app/services/supabase/client.ts`), already authenticated per session.
- Storage RLS (`0006_rls.sql:128-141`) — already permits both `users/…` and `rentals/…` paths.

## Verification

**Static:** `pnpm run compile` (0 errors) and `pnpm test` (≥ existing count, plus new `paths.test.ts` / `rowToUser` profil case) green between tasks.

**Device acceptance (required — the upload loop cannot be unit-proven; roadmap §8 DoD):**
1. Login → User Baru → capture **Foto Profil + KTP + KTM** (test camera AND gallery) → Save.
2. User list avatar shows the face photo; UserDetail shows all three.
3. **Kill the app, reopen** → photos still load (proves they reached Storage, not just local cache).
4. Sewa Baru with kondisi-keluar photos → Save; process Pengembalian with kondisi-kembali photos → view both on PenyewaanDetail.
5. Edit user → remove KTP → Save → KTP gone, Profil/KTM intact.
6. Airplane mode → capture + Save → graceful failure; back online → Save again succeeds (manual retry).

**Backend confirmation (supabase MCP):** objects exist under `users/{id}/{profil,ktp,ktm}/…` and `rentals/{id}/kondisi-{keluar,kembali}/…`; `users.profil_photo/ktp_photo/ktm_photo` JSONB and `rentals.kondisi_*` photos arrays hold `{id, path}`.
