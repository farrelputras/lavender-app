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
| 4 | Supabase build + connector swap | Pending |
| 5a–5e | Auth, User CRUD, Hutang, Penyewaan tabs | Pending |
| 6 | Photo upload | Pending |
| 7 | Feedback polish + QA + APK ship | Pending |

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
```

## Windows Notes

- **Developer Mode** must be enabled for npm workspace symlinks
  (Settings → For Developers → Developer Mode)
- **Long paths**: if 260-char errors appear, run as Admin:
  `reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f`
- **`.env` files**: save as UTF-8, not UTF-16 LE (use VS Code, not Notepad)
- **Watchman**: not on Windows — Metro uses fs polling (slightly slower; no config needed)
