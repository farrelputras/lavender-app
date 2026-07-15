# LAVENDER

Internal vehicle-rental operations tool for Farrel's mom's business.
Users: Mom (primary) + Farrel (admin). Not on the Play Store — APK sideloaded.

## Current Status: v1.0.2 shipped ✅ · v1.0.3 scoped (needs design)

**v1.0.1 shipped OTA 2026-07-12** (channel `preview`, no APK / no `version` bump) — completed-rental
"Kembali ke Beranda" bar, no payment/tarif pre-fill, pinch-to-zoom `PhotoViewer`, and admin-only
hard-delete (migrations `0016` + `0017`). See `docs/feedback-and-improvements.md` § v1.0.1.

**v1.0.2 shipped OTA 2026-07-15** (channel `preview`, runtime `1.0.0`, update group `0ce732a0`, no
APK / no `version` bump) — theme *polish + honesty*: extracted `showToast` to a shared util, fixed the
Hutang chevron overlapping its status pill, adopted the shared `SearchField` in User/PilihUser, wired
"Daftarkan User Baru" into the rental flow, removed two dead Edit buttons + the dead notification bell,
and added the Beranda version footer. Verified green (compile clean, 22 suites / 89 tests). Spec +
outcome: `docs/releases/v1-0-2.md`.

> ⚠️ **Do not bump `version` in `app.json` for an OTA-only release** (as v1.0.2 and v1.0.1 were).
> `runtimeVersion` policy is `appVersion`, so bumping it would target OTA at a runtime mom's installed
> APK does not report (still `1.0.0`) — she would silently stop receiving updates. The displayed
> version comes from a JS constant instead (`app/config/release.ts`).

### Where work lives (docs split 2026-07-12)

| Doc | Contains |
|---|---|
| `docs/feedback-and-improvements.md` | **Closed history** — v1.0 Phase 7 + v1.0.1 only |
| `docs/releases/v1-0-2.md` | ✅ Shipped OTA 2026-07-15 (polish + honesty). |
| `docs/releases/v1-0-3.md` | Scoping note — editing an active rental (needs its own design) |
| `docs/releases/v1-1.md` | Undesigned — replacing Supabase with a bespoke backend |
| `docs/known-technical-debt.md` | Standing debt register, triaged per release |

> **Handoff docs:** `/handoff-prompt` output (AI Continuation Documents) goes in `docs/handoff-prompts/`,
> not the repo root.

### v1.0.0 Roadmap (complete)

`docs/superpowers/specs/2026-05-26-v1-roadmap-design.md`

| Phase | Work | Status |
|---|---|---|
| 0 | Shared form-component library | ✅ Done |
| 1 | Native-dep bake + EAS smoke build | ✅ Done |
| 2 | Branding (icon, splash) | ✅ Done |
| 3 | Backend design (schema, RLS, auth) | ✅ Done |
| 4 | Supabase build + connector swap | ✅ Done |
| 5a–5e | Auth, User CRUD, Hutang, Penyewaan tabs | ✅ Done |
| 6 | Photo upload | ✅ Done |
| 7 | Feedback polish + QA + APK ship | ✅ Done — Stage A (UUID, OTA, APK) ✅ · Stage B (Stitch redesign, core screens 09–15) ✅ · Stage B2 (rental-flow redesign + copy items 4/5/6/8) ✅ · Stage C (edit/delete pembayaran + Tujuan field) ✅ |

**Goal:** Single APK to mom that is the real day-to-day app. Everything post-APK via OTA.

## Connector-Contract Rules (`docs/02` §3)

These are the most important rules in the project. They make the in-memory → Supabase
swap a connector-layer-only change.

1. **UI never touches raw data.** No data arrays in screen components. All reads/writes
   go through connector functions (`getRentals()`, `createRental()`, etc.).
2. **Connector signatures are locked.** Function name, parameters, and return type
   form the contract. Implementations may change; signatures must not.
3. **All connectors are `async` (return `Promise`).** Even the in-memory ones. If
   in-memory connectors were synchronous, every UI caller would need `await` added
   during migration — that's rewriting the UI, which the architecture exists to avoid.
4. **UI owns camelCase types.** Define UI types in camelCase; never let Postgres
   row shapes (snake_case) appear in screen code. The connector translates row ↔ UI type.

### ⚠️ Supabase errors are NOT `Error` instances

The client does not use `.throwOnError()`, so `supabase.rpc()` / `.from()` return `error` as a
**plain object** (`{message, details, hint, code}`). A connector that does `if (error) throw error`
throws that plain object — and any caller doing `e instanceof Error ? e.message : "…"` gets
**`false` every time** and silently discards the real Postgres message.

- When a connector's error message must reach the UI, throw a real Error:
  `if (error) throw new Error(error.message)`. The four `hardDelete*` connectors do this; the
  ~24 other `throw error` sites in `services/rentals/index.ts` still don't (logged as debt).
- **Never mock a Supabase failure as `new Error(...)` in tests.** Supabase never produces that
  shape, so the test proves your belief about the library rather than its behavior — this exact
  mock hid a real bug through two green reviews. Mock the plain-object shape.

## Rental Math

The calculation logic in `docs/02` §6 **must be correct**. Consult it before touching
any code related to:
- Tariff composition (6h / 12h / 24h periods, multi-day combinations)
- Fuel adjustment (more fuel returned → suggest reducing subtotal; less → suggest adding)
- Payment: `Sisa = Total Tagihan − Σ payments`
- Auto-debt creation: when `Sisa > 0` at return, automatically create a Hutang record

## Stack

- Expo SDK 55 (dev-client), React Native 0.83, **Ignite** (React Navigation — NOT Expo Router)
- TypeScript strict mode enabled
- Supabase (`@supabase/supabase-js` v2)
- EAS Build (APK), Expo Updates (OTA)

## Key Paths

| Path | What |
|------|------|
| `apps/lavender-ops-mobile/app/screens/` | All screen components |
| `apps/lavender-ops-mobile/app/components/form/` | Shared form primitives (SectionLabel, FieldCard, FuelGauge, Stepper, RupiahInput, PhotoRow, BottomActionBar) |
| `apps/lavender-ops-mobile/app/navigators/` | MainNavigator (bottom tabs) + stack navigators |
| `apps/lavender-ops-mobile/app/theme/` | Ignite theme — import via `useAppTheme()` hook; type screen styles with `ThemedStyle<ViewStyle>` |
| `apps/lavender-ops-mobile/app/services/rentals/` | Connector layer (async functions, types, seed data) |
| `docs/02-demo-development.md` | Connector-contract rules, rental math |
| `docs/releases/` | Per-release specs — `v1-0-2.md` is the open one |
| `docs/known-technical-debt.md` | Standing debt register (cross-release) |
| `docs/feedback-and-improvements.md` | Closed history: v1.0 Phase 7 + v1.0.1 outcomes |
| `docs/verification/` | SQL scripts that verify live DB behavior (RLS, `SECURITY DEFINER` RPCs) — read its README before writing a new one |
| `docs/superpowers/specs/2026-05-26-v1-roadmap-design.md` | Full v1.0.0 roadmap and phase ordering |

## Commands

```powershell
cd apps/lavender-ops-mobile
pnpm run compile            # TypeScript check (npx tsc --noEmit also works)
pnpm run lint               # ESLint auto-fix
pnpm test                   # Jest unit tests
pnpm run start              # Expo dev server (requires dev-client APK on device)
pnpm run build:dev          # EAS cloud build — dev APK
pnpm run build:preview      # EAS cloud build — preview APK (for mom testing)
pnpm ota:publish --message "..."   # Publish an OTA JS update to mom (preview channel)
eas update:list --branch preview   # See published OTA updates
```

> **OTA model:** mom runs the `preview` APK (channel `preview`). Ship JS/asset changes with
> `pnpm ota:publish` — applied on her next app launch. The `runtimeVersion` policy is
> `appVersion` (fingerprint computed differently Windows↔EAS, so it would have stranded OTA
> delivery), meaning OTA updates target the app `version`; when native deps change, bump
> `version` in app.json and ship a new APK. `expo-updates` is disabled in `dev` builds, so
> verify OTA behavior on a `preview` build, not via Metro.

## Database Migrations

The project is linked to Supabase project `tuufzjxoprjsrrkagncz`. The CLI is a devDependency —
there is no global install, so **always `npx supabase`**, run from `apps/lavender-ops-mobile`.

```powershell
npx supabase migration list                 # Which migrations are applied? ALWAYS check first.
npx supabase migration new <name>           # Create a new migration file
npx supabase db push                        # Apply pending migrations to remote
npx supabase db query --linked -f x.sql     # Run a query (Management API — no DB password)
```

- **Never hand-paste migration SQL into the web SQL editor.** That applies the schema without
  recording it in `supabase_migrations.schema_migrations`, so `migration list` and the console's
  Migrations page both go blind. Migrations 0001–0016 were applied that way and had to be
  back-filled with `migration repair`; migration 0016 was found never to have run at all.
- Versions are `0001`-style, not the Supabase-default 14-digit timestamp. The CLI accepts these
  fine (it sorts version strings lexicographically), but the console cannot parse them as dates,
  so its "Inserted at" column reads *Unknown* for them. Cosmetic only. New files from
  `migration new` will be timestamped and still sort after `0016`.
- `migration repair --status applied <v>` writes a history row **without executing the SQL**.
  Only ever use it for a migration you have confirmed is already in the database — otherwise
  `db push` skips it forever and the schema silently drifts.
- `seed.sql` lives at `supabase/seed.sql` (not in `migrations/`) and runs only on local `db reset`.
- **`SECURITY DEFINER` only bypasses RLS for what runs *inside* the function.** Any client-side
  step in the same workflow — a storage call, a follow-up table write — is still an RLS subject and
  needs its own policy. This was missed once: photo cleanup after a hard-delete ran client-side,
  `storage.objects` had no DELETE policy, and the removal failed silently (fixed in `0017`).
- Verifying live DB behavior (RLS, RPC gates, cascades)? See `docs/verification/` — and note that
  session-level `set_config(..., false)` does **not** survive across statements against this project
  (pooled connections), so `auth.uid()` impersonation must happen atomically inside one function call.

## Windows Notes

- **Developer Mode** must be enabled for npm workspace symlinks
  (Settings → For Developers → Developer Mode)
- **Long paths**: if 260-char errors appear, run as Admin:
  `reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f`
- **`.env` files**: save as UTF-8, not UTF-16 LE (use VS Code, not Notepad)
- **Watchman**: not on Windows — Metro uses fs polling (slightly slower; no config needed)
