# LAVENDER

Internal vehicle-rental operations tool for Farrel's mom's business.
Users: Mom (primary) + Farrel (admin). Not on the Play Store — APK sideloaded.

## Current Phase: v1.0.0 Roadmap

Demo is complete and validated. Now executing the v1.0.0 roadmap:
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

## Windows Notes

- **Developer Mode** must be enabled for npm workspace symlinks
  (Settings → For Developers → Developer Mode)
- **Long paths**: if 260-char errors appear, run as Admin:
  `reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f`
- **`.env` files**: save as UTF-8, not UTF-16 LE (use VS Code, not Notepad)
- **Watchman**: not on Windows — Metro uses fs polling (slightly slower; no config needed)
