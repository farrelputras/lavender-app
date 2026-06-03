# Phase 7 — Iteration 1: Feedback Polish + QA + APK Ship (Sequencing & Stage A Design)

> **Status:** Planning — 2026-06-02. This session designs/sequences only; **no execution**.
> The executable artifact (a task-by-task implementation plan for **Stage A**) is produced
> separately via `superpowers:writing-plans` and run in another session.

## Terminology (locked this session)

- **Iteration** = one *ship-and-feedback cycle*. The entire current
  `docs/feedback-and-improvements.md` backlog (items 0–8) is **Iteration 1**.
  Whatever new feedback mom gives *after* Iteration 1 ships becomes **Iteration 2**
  (out of scope here).
- **Stage** = a *ship-round within* Iteration 1. **Stage A ships an APK; Stages B & C
  ship via OTA.** (Earlier drafts mislabeled these "iterations" — they are stages.)

## Context

- **Mom has never installed any APK.** She only tried the demo/dev build on Farrel's
  test phone. So Stage A's `preview` APK is her **first real build on her own device** —
  and that install is what turns on OTA delivery for the rest of Iteration 1.
- **OTA is not wired yet.** `app.json` has only a bare `updates.fallbackToCacheTimeout: 0`
  (no `updates.url`, no `runtimeVersion`); `eas.json` has no `channel`; `package.json`
  has no `expo-updates`, `uuid`, or `react-native-get-random-values`. The EAS `projectId`
  is already present (project is linked).
- **Mom's real APK comes from the `preview` profile** (`buildType: apk`,
  `distribution: internal`). `production` is `{}` → defaults to a store `.aab`
  (not sideloadable) and **will never be used** (app is not published publicly).
- **Chicken-and-egg:** none of the polish/features reach mom via OTA until an APK
  *with OTA config baked in* is on her phone. That is why infra goes first.

## Decisions locked this session

| Decision | Choice | Rationale |
|---|---|---|
| Iteration 1 first move | **Infra-first → ship APK fast** | OTA-capable APK is the delivery vehicle; everything after streams in OTA with no further APK trips. |
| `runtimeVersion` policy | **`fingerprint`**, with an **`appVersion` fallback** if the plan's gate shows it's JS-sensitive or unstable Windows↔EAS | Goal: a *native* change bumps the runtime (forcing a new APK) but a *JS-only* change does NOT (else mom's APK is stranded off OTA). `fingerprint` is preferred but must be verified before ship — see plan Task 4 Step 1. |
| OTA channel | **One channel `preview`** on `preview` + `preview:device`; publish via `eas update --branch preview` | Matches "no `production` profile ever." Mom and Farrel share it. |
| Update-check behavior | **Silent check-on-launch** (`fallbackToCacheTimeout` stays `0`), no in-app "Cek Update" button | YAGNI; update applies on next app open. |
| Stitch redesign (item 2) vs polish (4,5,6,8) | **Stitch first — fold polish in** | Redesign redraws every screen; standalone polish first = thrown-away work. |
| Features (3, 7) vs Stitch | **Features AFTER Stitch** (order A→B→C); their data layer *may* run parallel to Stitch's design phase | Feature UI built once, on the new design — least total work. |
| Item 7 classification | **Feature** (adds a `tujuan`/destination field to rentals), not copy-polish | Has a data layer + UI surface; behaves like item 3. |
| Build-variant identity *(session-added, not from the feedback backlog)* | Dev build = **"Lavender Ops Dev"** / `com.lavender.ops.dev`; preview build = **"Lavender Ops"** / `com.lavender.ops`. **Both installable side-by-side.** | Lets Farrel keep the dev and real builds on one phone without confusing them. Distinct `name` *and* `android.package`/`ios.bundleIdentifier` are required for coexistence. |

## Iteration 1 — Sequencing Map (Stages A → B → B2 → C)

> **Status update (2026-06-03):** Stage B's original "redesign *all* screens" scope was
> re-scoped after execution. The Stitch redesign of the **core screens (09–15)** shipped and
> is marked done; the **rental-flow screens** (Beranda, DetailSewa, PenyewaanDetail,
> Pengembalian, PilihKendaraan) plus the cross-cutting copy items 4/5/6/8 that live in them
> are carved out into a new **Stage B2**, which now sits between B and C (C's feature UI
> lands on the rental-flow screens, so those must be redesigned first).

| Stage | Items | Ships via | Status | Summary |
|---|---|---|---|---|
| **A — Infra** | 0 (UUID), 1 (OTA) | **APK** → mom | ✅ done (2026-06-02) | One native rebuild. The *only* APK trip; turns on OTA for everything after. **Zero visible change** to mom. |
| **B — Stitch redesign (core screens)** | 2 (screens 09–15) | OTA | ✅ done (2026-06-03) | UserScreen, Rental/Hutang lists, User/Hutang detail+form redesigned from Stitch. New `StatusPill`/`SearchField`, shadow-only `FieldCard`, tokens extended. 63/63 tests. |
| **B2 — Stitch redesign (rental-flow) + copy** | rest of 2, **absorbing** 4 (Paket→Durasi), 5 (Waktu Sewa 3-row), 6 (edit-icon consistency — finish), 8 (Penyewaan→Rental — finish) | OTA | ✅ done (2026-06-04) | Derived in-code from Stage-B design language. `PenyewaanDetail` route renamed → `RentalDetail`; Beranda/PilihKendaraan/DetailSewa/RentalDetail/Pengembalian redesigned; Waktu Sewa → 3-row (Option C); all "Paket"/"Penyewaan"/"Ubah" copy replaced; shadow-only cards. 63/63 tests. Tujuan field (item 7) deferred to Stage C. |
| **C — Features** | 3 (edit/delete pembayaran), 7 (Tujuan field) | OTA | ⏳ pending | Real new capability. Data/connector layer is visual-independent; UI lands on the redesigned screens. |

### Sequential vs parallel

- **Items 0 + 1 (within Stage A):** batched — one native rebuild, one QA pass.
  Code-independent but no value in splitting two tiny config tasks.
- **Stage A → B → B2 → C:** sequential by necessity — A is the delivery mechanism; B/B2
  redesign + absorb the polish; C's UI wants the new design language. (B redesigned the
  core screens; B2 finishes the rental-flow screens where items 4/5/6/8 live.)
- **Only genuine parallelism:** Stage C's *data/connector/migration layer* (edit/delete
  payment logic; `rentals.tujuan` column + connector) is visual-independent and can be
  built alongside Stage B2's Stitch design activity. The feature *UI* still waits for B2.

---

## Stage A — Detailed Design (execution-ready)

The single APK trip of Iteration 1. Two items, one native rebuild, one QA pass, one ship.

### Item 0 — Cryptographically secure UUID

- Add deps: `pnpm add react-native-get-random-values uuid` + `pnpm add -D @types/uuid`.
- In the app entry **`index.tsx`**, add `import "react-native-get-random-values"` as the
  **first line** (before the existing `react-native-url-polyfill/auto` import) — the
  polyfill must load before `uuid` is evaluated anywhere.
- Rewrite the body of **`app/utils/uuid.ts`** to delegate to `uuid`'s `v4`:
  ```ts
  import { v4 } from "uuid"
  export function uuidv4(): string {
    return v4()
  }
  ```
  The exported `uuidv4()` **signature is unchanged**, so every caller (the rentals
  connector, photo path builders) is untouched — contract-safe per CLAUDE.md §2.

### Item 1 — OTA update infrastructure

- `npx expo install expo-updates` (native module → must be in the rebuild).
- Run `eas update:configure` — it writes `updates.url` and a `runtimeVersion` block into
  `app.json`. Then set the policy to **`{ "policy": "fingerprint" }`**.
- Add `"channel": "preview"` to the `preview` and `preview:device` build profiles in
  `eas.json`.
- Keep `updates.fallbackToCacheTimeout: 0` (silent check-on-launch).
- Add a `pnpm run ota:publish` convenience script wrapping
  `eas update --branch preview -m "<msg>"`, and document the OTA flow in `CLAUDE.md`.

### Item A3 — Dev/preview build-variant identity *(session-added)*

Goal: dev and real builds coexist on one phone, clearly labeled — no confusion while testing.

- Convert the static **`app.json`** into a dynamic **`app.config.ts`** that spreads the
  existing static config (passed in as `config` — preserves `extra.eas.projectId`,
  Ignite version, icons, plugins, the `updates`/`runtimeVersion` block from Item 1) and
  overrides identity by variant:
  ```ts
  // app.config.ts
  import { ExpoConfig, ConfigContext } from "expo/config"
  const IS_DEV = process.env.APP_VARIANT === "development"
  export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: IS_DEV ? "Lavender Ops Dev" : "Lavender Ops",
    android: { ...config.android, package: IS_DEV ? "com.lavender.ops.dev" : "com.lavender.ops" },
    ios: { ...config.ios, bundleIdentifier: IS_DEV ? "com.lavender.ops.dev" : "com.lavender.ops" },
  })
  ```
- In **`eas.json`**, set `"env": { "APP_VARIANT": "development" }` on the `development` and
  `development:device` profiles. `preview`/`preview:device` leave it unset → fall through
  to the real name/package. (Keep `app.json` as the static base; `app.config.ts` only
  overrides the variant-specific fields.)
- **`scheme`** stays shared (`lavenderops`) — acceptable for MVP (email/password auth, no
  OAuth deep-link). Revisit only if deep-links/OAuth are added later.
- **Migration note:** Farrel's existing dev-client (currently `com.lavender.ops`) must be
  reinstalled under the new `com.lavender.ops.dev` package; the old install can be removed.
- Mom's real `preview` build keeps `com.lavender.ops` — unaffected.

### Rebuild + ship

- Rebuild the **dev-client** (for local verification — new native deps + the `.dev`
  package) and the **`preview` APK** via EAS.
- Send the `preview` APK to mom; **mom installs it on her own phone** (her first real build).

### DoD / Verification (Stage A)

1. `pnpm run compile` (0 errors) + `pnpm test` green.
2. **UUID:** create a rental → row persists with a valid v4 UUID, no crash (confirm in
   Supabase).
3. **Regression smoke** on the fresh native build (new native deps can break startup):
   login · user CRUD + photo · rental create/return + photos · hutang + payment recording.
4. **OTA round-trip (the real acceptance test):** install the `preview` APK on a real
   device → publish a trivial `eas update --branch preview` → reopen the app → confirm
   the update is applied on next launch.
5. **Build identity:** dev build installs as **"Lavender Ops Dev"** (`com.lavender.ops.dev`)
   and the `preview` build as **"Lavender Ops"** (`com.lavender.ops`) — both present on one
   phone at once, distinguishable in the launcher.
6. **Ship gate (non-negotiable):** mom installs the `preview` APK on her phone.
7. **runtimeVersion gate:** before building mom's APK, confirm the `fingerprint`
   policy (a) does **not** change when a JS-only dep is added (else a Stage B JS change
   strands her APK) and (b) computes identically Windows↔EAS-Linux. If either fails, fall
   back to `appVersion`. See plan Task 4 Step 1.

### Tradeoffs accepted (conscious, not overlooked)

- **Zero visible change for mom.** UUID and OTA are both invisible; with Stitch-first,
  mom sees no UI improvement until Stage B lands. Deliberate — Stage A's value is the
  delivery vehicle, not features.
- **No OTA staging/canary.** One shared `preview` channel → a published OTA hits mom
  immediately. Mitigation: test JS via Metro (dev profile) before publishing. The
  failure mode — a *release-only* bug that bypasses Metro and lands straight on mom — is
  accepted for a 2-person MVP.
- **`expo-updates` is disabled in dev/Debug builds.** A dev-profile build loads JS from
  Metro, not from the OTA channel, so you cannot truly exercise an OTA *download* on a
  dev build. OTA-fetch behavior is verified on a `preview` build (DoD step 4); day-to-day
  feature JS is verified via Metro.

---

## Stage B — Stitch UI redesign (core screens) — ✅ done (2026-06-03)

Executed directly from Stitch references (no dedicated brainstorm→spec→plan cycle was
written for it — the redesign translated screen-by-screen from the `ui-reference` artifacts).

- **Delivered:** Stitch references `ui-reference/mobile/09–15` generated and translated to
  RN — `UserScreen`, `RentalScreen` (list), `HutangScreen` (list), `UserDetailScreen`,
  `UserFormScreen`, `HutangFormScreen`, `HutangDetailScreen`.
- **New shared primitives:** `StatusPill`, `SearchField`; `FieldCard` moved to a
  shadow-only (borderless) card pattern; `theme/tokens.ts` extended.
- **Verification:** `pnpm run compile` clean, 63/63 tests green; shipped via OTA on the
  `preview` channel.
- **Stayed within baked native deps** — no new native UI lib, OTA-only promise intact.

## Stage B2 — Stitch UI redesign (rental-flow) + copy items — ⏳ pending

The remainder of the original Stage B scope. Gets its own brainstorm → spec → plan when its
turn comes (it carries unresolved sub-decisions). Sits **before Stage C** because C's feature
UI (items 3 & 7) lands on these screens.

- **Scope:** redesign the demo-era rental-flow screens via Google Stitch, OTA-delivered —
  Beranda (01), DetailSewa (04), PenyewaanDetail aktif/selesai (06/08), Pengembalian (07),
  PilihKendaraan.
- **Absorbs:** 4 (Paket→Durasi app-wide copy), 5 (Waktu Sewa → Mulai/Kembali/Durasi
  3-row), 6 (finish edit-affordance consistency → "✏️ Edit" everywhere on the legacy
  screens), 8 (finish Penyewaan→Rental — tab/list already `"Rental"`; the `PenyewaanDetail`
  screen + route still need renaming).
- **Hard constraint:** must stay within already-baked native deps. Pulling in a new native
  UI lib forces another APK trip and breaks the OTA-only promise.
- **Open sub-decisions this stage must resolve (do not let them silently vanish):**
  - Item 5: the Durasi edit affordance on DetailSewa — (A) derived from Mulai+Kembali,
    (B) tap-to-expand the existing stepper, or (C) keep stepper separate + 3-row block as
    read-only summary. (Per `feedback-and-improvements.md` §5.)
  - Should design the surfaces Stage C needs: a payment edit/delete control (item 3) and
    the Tujuan field (item 7), so feature UI is built once on the new design.

## Stage C — Features (planning altitude — own spec/plan later)

- **Item 3 — Edit/delete pembayaran:** recover from a typo/mistaken payment entry.
  Data/connector capability (edit + delete a recorded payment, with the rental's
  `Sisa = Total Tagihan − Σ payments` and auto-debt logic re-evaluated per CLAUDE.md
  Rental Math). Open sub-decisions: edit vs delete vs both; effect on an already
  auto-created Hutang.
- **Item 7 — Tujuan (destination) field:** new field on rentals so mom knows where a
  vehicle is headed. Data layer: migration adds a `tujuan` column to `rentals`; connector
  `CreateRentalInput`/types widened; form captures it; detail displays it. Open
  sub-decisions: required vs optional; free-text vs preset list.
- **Parallelism:** the data layers above are visual-independent and may be built during
  Stage B's design phase; their UI lands on the redesigned screens.

---

## Out of scope for this session

- Detailed task-by-task plans for Stages B and C (they carry unresolved sub-decisions
  above and get their own spec→plan cycles).
- Iteration 2 (new feedback that arises after Iteration 1 ships).

## Next step

Stage A (plan `docs/superpowers/plans/2026-06-02-phase-7-stage-a-infra.md`) and Stage B
(core-screen Stitch redesign) are both shipped. The next step is **Stage B2** — brainstorm →
spec → plan the rental-flow redesign (resolving item 5's Durasi-affordance decision and
designing the surfaces Stage C needs), then execute. Stage C (features 3 & 7) follows; its
visual-independent data/connector layer may be built in parallel with Stage B2's design phase.
