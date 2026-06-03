# LAVENDER v1.0.0 Roadmap — Demo → Day-to-Day App

**Status:** Phases 0–6 complete. **Phase 7 in progress** — Stage A (UUID + OTA infra)
shipped in the v1.0.0 `preview` APK (2026-06-02); Stage B (core-screen Stitch redesign,
screens 09–15) shipped via OTA (2026-06-03). Remaining: Stage B2 (rental-flow redesign +
copy items 4/5/6/8) and Stage C (features 3 & 7). See
`docs/superpowers/specs/2026-06-02-phase-7-iteration-1-design.md` for the stage breakdown.
**Author:** Brainstorming session, 2026-05-26
**Owner:** Farrel
**Target ship:** Single APK to mom; everything post-APK delivered via OTA

---

## 1. Context

The demo built per `docs/02-demo-development.md` is functionally complete and has been
exercised by mom on Farrel's demo phone — she has provided feedback but has not used
the app for real rentals yet. The full MVP scope from `docs/00-initial-handoff.md` is
significantly larger than the demo: it includes User Management, Vehicle Management,
a Hutang tab, PDDikti verification, photo capture/storage, auth, and (optionally)
realtime multi-operator sync.

The next APK that lands on mom's phone is intended to be **the real day-to-day app**,
not an extended demo. After it ships, all further iteration must be delivered via OTA
(Expo Updates) because mom cannot install APKs herself — they reach her via WhatsApp
and require Farrel to sideload.

## 2. Strategic framing

> **The only thing an APK truly locks is native dependencies. Everything else — UI,
> business logic, connector internals, screens, copy fixes, even backend integration —
> is deliverable via OTA.**

This collapses the strategic decision to: **which native libs do we pre-bake into the
APK so we never have to re-ship until something genuinely native changes.**

### Native-dep bake list (pre-APK)

The following are baked into the v1.0.0 APK even if some aren't used immediately. The
cost of an unused native lib is small (APK size); the cost of a missing one is another
WhatsApp APK trip to mom.

| Native dep | Purpose |
|---|---|
| `@supabase/supabase-js` + `react-native-url-polyfill` | Backend client (polyfill is the native shim that makes supabase-js work in RN) |
| `expo-camera` | Foto KTP/KTM, foto kondisi keluar/kembali |
| `expo-image-picker` | Gallery fallback for photo selection |
| `expo-file-system` | Local cache for photos pending upload |
| `react-native-webview` | Defensive bake for PDDikti scrape fallback in v1.1 |
| `expo-notifications` | "Harus kembali hari ini" reminder candidate |
| `expo-secure-store` | Auth token storage (`react-native-mmkv` already present for non-secret state) |

### What this enables post-APK (OTA only, no re-install)

- Backend connector swap (in-memory → Supabase) — already supported by the connector
  contract from `docs/02` §3
- All new screens added later (PDDikti UX, Vehicle CRUD, Penyewaan filters, web admin
  bridge, etc.)
- All feedback fixes (waktu sewa restructure, Paket→Durasi rename, edit/delete
  pembayaran, etc.)
- Realtime sync via Supabase Realtime (uses WebSockets, no extra native dep)
- PDDikti integration if it can be done with pure HTTP. If it requires a webview
  (scraping), `react-native-webview` is already baked in.

## 3. Scope decisions

### In scope for v1.0.0 (pre-APK ship)

- **Shared form-component library extraction** — the demo's two multi-section form
  screens (`DetailSewaScreen.tsx` at 1455 lines, `PengembalianScreen.tsx` at 1313
  lines) independently re-declare the same UI primitives inline (`Stepper`,
  `FuelGauge`, `FieldCard`, `SectionLabel`, photo row, rupiah input row, datetime
  picker flow). Extract these into `components/` so existing screens can be slimmed
  *opportunistically* when touched during the connector swap, and **new screens built
  in Phase 5 (User Detail, Hutang Detail) compose from the same primitives from day 1
  instead of becoming the 3rd and 4th 1000-line screens.** See §4.6.
- Native-dep bake (list above) + smoke EAS build to verify
- **Branding assets** — finalize app icon (adaptive icon foreground + monochrome for
  Android 13+), verify splash screen, confirm `Lavender Ops` name in `app.json`. App
  icon is a native asset baked into the APK at build time and **cannot be changed
  via OTA**, so it must be locked before the v1.0.0 ship.
- Supabase backend: schema, RLS policies, audit triggers, storage bucket layout
- Auth: minimal Supabase Auth with two manually-created accounts (mom, Farrel),
  set-and-forget session persistence
- Connector swap: replace in-memory implementations with Supabase calls; UI untouched
- User CRUD: manual entry form, edit, list, KTP/KTM photo capture (no PDDikti UX)
- Hutang tab: full feature — list, detail, manual hutang creation, payment recording
- Penyewaan tab: basic list (no filters/search/date range)
- Beranda bottom-nav label adjustment ("Sewa Aktif" → "Penyewaan")
- Photo upload: camera → Supabase Storage, with local cache fallback
- Audit log columns + triggers (`created_by`, `updated_by`, `created_at`,
  `updated_at`) on all tables; no UI per handoff
- Feedback polish (waktu sewa 3-row restructure, Paket→Durasi rename, edit/delete
  pembayaran, edit icon consistency, tujuan field adjustment, etc.) — bundled into
  the QA pass. Tracked in `docs/feedback-and-improvements.md`.
- Build and ship single APK to mom

### Deferred to v1.1+ (OTA after first ship)

- **PDDikti verification UX** — added as a "Verifikasi PDDikti" button on User Detail
  screen (see §5 below)
- **Penyewaan tab filters** — Aktif/Selesai/Semua chips, search, date range
- **Vehicle CRUD** — managed via direct DB operations in v1; UI added later. Mom's
  fleet doesn't change often.
- **Realtime sync** — pull-to-refresh is sufficient in v1 (single-operator dominant
  use; Farrel is occasional)
- **Customer-facing receipts**
- **Web admin app**
- **Optimization passes** (performance, offline behavior, etc.)

### Out of scope (not v1.x)

- Customer/renter-facing features
- Multi-tenant support
- Play Store distribution

## 4. Architecture decisions

### 4.1 Connector contract preserved

The connector layer from `docs/02` §3 is the migration backbone. UI never touches raw
data. All reads/writes go through async functions (`getUsers`, `createRental`,
`closeRental`, `getHutangByRental`, …). The function signatures are locked; only their
internal implementations change in the in-memory → Supabase swap.

This is what enables ~all post-APK work to be OTA-only.

### 4.2 Auth model

- Supabase Auth, email/password
- Two accounts manually provisioned in Supabase dashboard: `mom@lavender.local`,
  `farrel@lavender.local` (exact emails TBD at implementation time)
- Login screen appears once per device, ever; session persisted via
  `expo-secure-store` with no auto-logout
- RLS pattern: `auth.uid() IN (mom_uid, farrel_uid)` for shared data;
  `auth.uid() = farrel_uid` for admin-only mutations (e.g., delete user)
- Audit columns (`created_by`, `updated_by`) populated via DB triggers using
  `auth.uid()` — unforgeable from the client

**Why auth despite only 2 users:** the alternative (no auth, anon key on device)
exposes the entire DB to anyone who gets the APK. Sideloaded distribution = wider
attack surface than Play Store. Cost of including auth is ~2–3 hours; cost of leaking
KTP photos and customer data is unbounded.

### 4.3 PDDikti UX shape

**v1 behavior:** User Registration / Edit is a pure manual form. All fields user-editable.
KTP/KTM photo capture. No PDDikti UI anywhere. User Detail screen shows a small
"Belum Diverifikasi PDDikti" badge.

**v1.1 OTA behavior:** Add "Verifikasi PDDikti" button on User Detail. Opens modal
with NIM input (or Name + Universitas fallback). Returns matches → "Ini orangnya?"
confirmation step. On confirm: populates `nama_pddikti`, `tahun_masuk`, `universitas`,
`prodi` columns (separate from manual `nama`/`panggilan`, no overwrite). Verification
status updates.

This design works because the data model from the handoff already keeps `nama` and
`nama_pddikti` as separate fields — manual entry and verification coexist by
construction.

### 4.4 Audit trail

Per handoff §"Audit log": every record tracks `dibuat oleh, diubah oleh, timestamp,
before/after values`. No UI in v1; queryable in DB.

- Add `created_by`, `updated_by`, `created_at`, `updated_at` to every table
- Postgres triggers populate them automatically from `auth.uid()` and `now()`
- `before/after` value capture deferred to a separate audit table later if needed

### 4.5 Shared form-component library

The two oversized demo screens (`DetailSewaScreen`, `PengembalianScreen`) share the
same archetype: a vertically stacked multi-section form with sticky bottom bar. They
re-declared the same UI primitives inline. The fix is to extract those primitives once
and reuse them everywhere a form screen appears.

**Components to extract (initial list — confirm shape during extraction):**

| Component | Source (currently inline in) | Used by (existing + future) |
|---|---|---|
| `SectionLabel` | DetailSewa, Pengembalian | All form screens |
| `FieldCard` | DetailSewa, Pengembalian | All form screens |
| `Stepper` (decrement/increment) | DetailSewa, Pengembalian | DetailSewa, Pengembalian, possibly User form |
| `FuelGauge` | DetailSewa, Pengembalian | DetailSewa, Pengembalian |
| `PhotoRow` (horizontal scroll + add button + thumbs) | DetailSewa, Pengembalian | DetailSewa, Pengembalian, User Detail (KTP/KTM) |
| `RupiahInput` (Rp prefix + numeric field) | DetailSewa, Pengembalian | DetailSewa, Pengembalian, Pembayaran sheet, Hutang detail |
| `WaktuSewaPicker` (Android two-step + iOS spinner) | DetailSewa, Pengembalian | DetailSewa, Pengembalian |
| `BottomActionBar` (sticky cancel + primary button) | DetailSewa, Pengembalian | All form screens |

**Rules of engagement for Phase 0:**

- **Create the shared components in `app/components/form/` (or similar).** Don't
  rewrite existing screens yet. The goal of this phase is to *establish the
  vocabulary*, not refactor everything.
- **Validate via TypeScript + Metro.** `npx tsc --noEmit` must pass; smoke-test by
  importing each new component into a throwaway preview screen or Storybook-style
  harness. EAS is not required at this stage.
- **Don't deduplicate styles into a separate `.styles.ts` file.** Co-located styles
  inside each new component are fine. Project-wide `.styles.ts` split is a v1.x
  cosmetic decision, not a v1.0 concern.
- **Existing screens (DetailSewa, Pengembalian) are NOT rewritten in this phase.**
  Their refactor is absorbed into Phase 4 (connector swap) and Phase 7 (feedback
  polish) — whenever those screens get touched for a functional reason, the inline
  primitives are replaced with imports as a side effect. This avoids "refactor
  working code that mom already validated visually" risk.
- **New screens (Auth, User, Hutang, Penyewaan) MUST compose from this library from
  day 1.** No new inline `<Stepper>` declarations.

**Why this is Phase 0:** the component vocabulary must exist before screens that
depend on it are built. It's also the only phase with zero external dependencies
(no EAS, no Supabase, no native libs) — perfect first session.

### 4.6 Data safety / recovery

- Supabase free tier: daily automated backups (last 7 days). Point-in-Time Recovery
  is Pro+ only — for v1 we accept "lose up to 24h of data in a worst-case incident."
  If mom relies on the app heavily and this becomes intolerable, upgrade to Pro
  ($25/mo) for PITR.
- No client-side delete is hard-delete in v1: every "delete" sets a `deleted_at`
  column. Recovery is a DB UPDATE away. Cheap to add upfront, expensive to
  retrofit.
- Photos in Supabase Storage are stored in a private bucket with RLS; backed up
  alongside the database.

## 5. Phase ordering

> **EAS build was fixed prior to spec finalization** — no dedicated phase needed.

| Phase | Work | Hours |
|---|---|---|
| 0 | Shared form-component library extraction (see §4.5) | 4–6 |
| 1 | Native-dep bake + smoke EAS build to verify | 2–4 |
| 2 | Branding (app icon adaptive + monochrome, splash screen, verify `Lavender Ops` name in `app.json`) + test APK build to sanity-check icon | 1–3 |
| 3 | Backend design (schema, RLS, auth, audit, storage layout) | 4–6 |
| 4 | Supabase build (migrations, seed, audit triggers) + connector swap (existing screens opportunistically refactored to use Phase 0 components) | 16–24 |
| 5a | Auth (config + login screen + session persistence) | 2–3 |
| 5b | User CRUD (manual form, KTP/KTM photo, no PDDikti UX) | 4–7 |
| 5c | Hutang tab (full: list, detail, manual creation, payment recording) | 8–12 |
| 5d | Penyewaan tab (basic list, no filters) | 2–4 |
| 5e | Beranda nav label adjustment | 1–2 |
| 6 | Photo upload (camera capture + Supabase Storage + local cache) | 8–12 |
| 7 | Feedback polish + QA + ship APK to mom (DetailSewa/Pengembalian inline primitives replaced with shared components as side effect) | 6–10 |
| **Total** | | **58–93 hours** |

**Ordering rationale:**

- **Phase 0 first** because (a) the component vocabulary it creates is a prerequisite
  for Phase 5 screens — those must compose from it from day 1, not be written with
  the duplicated-inline pattern; (b) it's pure JS, no external dependencies; (c)
  builds momentum on familiar code before tackling backend work.
- **Phase 1 (native deps) before Phase 2 (branding)** because the smoke EAS build
  in Phase 1 doubles as a baseline verification; if it succeeds, Phase 2's test
  build with the icon is a small diff on a known-good state.
- **Phase 2 (branding) early** because the icon is APK-bound (not OTA-able), so it
  must be locked before final ship. Doing it early lets us catch icon-rendering
  bugs in test builds rather than at v1 ship time.
- **Phase 3 (backend design) before Phase 4 (build)** because schema and RLS shape
  the connector implementation.
- **Phase 5a (Auth) before 5b–5e** because RLS-gated screens need `auth.uid()` to
  exist before they can be tested end-to-end.
- **Photo upload (Phase 6) parallelizable** with Phase 5 work, listed late only
  because it's the largest non-blocking chunk.

**At 10 hrs/week part-time: ~6–9 calendar weeks. At 20 hrs/week sprint: ~3–5 weeks.**

## 6. Post-launch OTA roadmap (v1.1 and beyond)

Once v1.0.0 is on mom's phone, the following are delivered without an APK rebuild:

- **v1.1:** PDDikti verify button, Penyewaan filters, feedback polish round 2,
  performance pass on the screens she uses most
- **v1.2+:** Vehicle CRUD UI, web admin companion (handoff §"Future scope"), realtime
  sync if multi-operator pressure emerges
- **Backend tuning:** indexes, query optimizations, RLS refinements — all server-side

An APK rebuild becomes necessary only if:
- A new native lib is genuinely needed (e.g., barcode scanning for KTM QR codes)
- An Expo SDK upgrade requires it
- A security patch in a native dep requires it

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Phase 0 component extraction surfaces unforeseen dependencies between primitives | Time-box to 6h; if a component proves harder to extract than expected (e.g., `WaktuSewaPicker` has too much screen-specific state), leave it inline for now and revisit during Phase 4 connector swap |
| App icon renders incorrectly on Android 13+ (monochrome variant required) or older Android (adaptive icon foreground misaligned) | Phase 2 includes a test APK build specifically to verify icon rendering on a real device before the final ship; iterate the icon assets if needed |
| Supabase schema requires migration after v1 ships | All tables get `deleted_at` soft-delete columns upfront; migrations are SQL-only and run from the dashboard, no app change needed |
| PDDikti turns out to need a webview after v1 ship | `react-native-webview` is already baked in defensively |
| Mom finds a workflow gap on day 1 | Feedback polish phase in Phase 6 dedicates time for the issues she already raised; further gaps go to v1.1 OTA, no APK trip required |
| Photo upload fails offline | Local cache via `expo-file-system`; retry queue. Out of scope for v1 deep-design; basic local cache + manual retry button is enough |
| Mom's phone is lost/stolen | Revoke session in Supabase dashboard; data is RLS-gated, unreachable without valid session |

## 8. Definition of done for v1.0.0

- APK builds successfully on EAS
- APK installs on mom's phone
- Mom can log in once and never see the login screen again
- Mom can: register a user (manual, with KTP/KTM photos), create a rental, process a
  return, view hutang, record a hutang payment, manually create a hutang
- All data persists in Supabase (verified by closing app, reopening, data still there)
- Photos survive app restart and reach Supabase Storage
- No data is lost if app crashes mid-action (writes are committed transactionally)
- Mom uses the app for at least one full rental cycle (create → return) without Farrel
  intervention

## 9. Next step

Move to the implementation plan via the `writing-plans` skill. The plan will break
Phases 0–7 into concrete tasks with file-level changes, dependency ordering, and
acceptance criteria per task.

**Phase 0 is the immediate next session's work.** It is self-contained (~4–6h), has
no external dependencies (no EAS, no Supabase, no new libs), and unblocks Phase 5 by
establishing the shared form-component vocabulary that all new screens must compose
from.
