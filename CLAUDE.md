# LAVENDER

Internal vehicle-rental operations tool for Farrel's mom's business.
Users: Mom (primary) + Farrel (admin). Not on the Play Store — APK sideloaded.

## Current Phase: Demo Build

Building a **demo with in-memory data** to validate the rental workflow with the
business owner before any backend work.

**Do NOT implement in this phase:**
- Supabase queries, auth, storage, realtime, or Edge Functions
- EAS builds or APK distribution
- User management or login screens

> After the owner validates the workflow, phase 2 replaces the connector internals
> with Supabase — without touching the UI. See `docs/02-demo-development.md` §7.

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

- Expo SDK 55 (managed), React Native 0.83, Expo Router 55 (file-based, typed routes)
- TypeScript strict mode enabled
- Supabase (`@supabase/supabase-js` v2) — wired but **unused in demo phase**
- EAS Build (APK), Expo Updates (OTA) — **not used in demo phase**

## Key Paths

| Path | What |
|------|------|
| `apps/mobile/app/(tabs)/` | Expo Router screens (file-based routes) |
| `apps/mobile/src/theme/index.ts` | Design tokens — always import from here |
| `apps/mobile/src/lib/supabase.ts` | Supabase client (unused in demo phase) |
| `packages/shared/` | Future home of shared types + business logic |
| `docs/02-demo-development.md` | Full demo spec, connector rules, rental math |

## Commands

```powershell
npm run mobile              # Expo dev server (from monorepo root)
cd apps/mobile
npx tsc --noEmit            # TypeScript type-check (must pass before shipping OTA)
npx expo start              # dev server (from mobile workspace)
```

## Windows Notes

- **Developer Mode** must be enabled for npm workspace symlinks
  (Settings → For Developers → Developer Mode)
- **Long paths**: if 260-char errors appear, run as Admin:
  `reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f`
- **`.env` files**: save as UTF-8, not UTF-16 LE (use VS Code, not Notepad)
- **Watchman**: not on Windows — Metro uses fs polling (slightly slower; no config needed)
