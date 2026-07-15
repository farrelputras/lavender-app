# LAVENDER

Internal vehicle-rental operations tool for Farrel's mom's business.

**Users:** Mom (primary, ~50yo) + Farrel (admin). Not on the Play Store — APK sideloaded.

---

## Where the app lives

The shipping app is **`apps/lavender-ops-mobile/`** — Expo SDK 55 + React Native 0.83 on the
**Ignite** stack (React Navigation), with Supabase for auth/data and EAS for APK + OTA delivery.

> An earlier `apps/mobile/` prototype (Expo Router) was fully migrated into
> `apps/lavender-ops-mobile/` and then removed. The migration record — with a file-by-file source →
> destination mapping — lives in `docs/superpowers/plans/2026-05-25-ignite-migration.md`, and the
> old app is recoverable from git history if ever needed.

---

## Getting started

```powershell
cd apps/lavender-ops-mobile
pnpm install
pnpm run compile   # TypeScript check
pnpm test          # Jest unit tests
pnpm run start     # Expo dev server (requires the dev-client APK on device)
```

Copy `.env.example` → `.env.local` and fill in the Supabase keys
(Supabase dashboard → **Settings → API**):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## Build & ship

```powershell
cd apps/lavender-ops-mobile
pnpm run build:preview             # EAS cloud APK for mom's phone
pnpm ota:publish --message "..."   # JS/asset OTA to the preview channel
```

Mom runs the `preview` APK and picks up OTA updates on launch. When native deps change, bump
`version` in `app.json` and ship a fresh APK; JS-only changes go out over OTA.

See **`CLAUDE.md`** for the full operational guide — the connector-contract rules, rental math,
the OTA / `runtimeVersion` model, and the database-migration workflow.

---

## Repo layout

```
lavender-app/
├── apps/
│   └── lavender-ops-mobile/   ← the shipping app (Ignite / React Navigation)
├── packages/
│   └── shared/                ← shared types / business logic (future)
├── docs/                      ← specs, per-release notes, technical-debt register
├── CLAUDE.md                  ← operational source of truth
└── README.md
```

---

## Windows notes

- **Developer Mode** must be on — required for workspace symlinks
  (Settings → For Developers → Developer Mode)
- **Long paths**: if 260-char errors appear, run as Administrator:
  `reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f`
- Save `.env` files as **UTF-8**, not UTF-16 LE (use VS Code, not Notepad)
- **Watchman** isn't available on Windows — Metro uses fs polling (slightly slower; no config needed)
