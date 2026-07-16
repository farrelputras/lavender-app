# LAVENDER — Mobile Stack: Current State & Original Setup History

> **How to read this doc.** The **Current stack** section below is authoritative for anyone
> (human or agent) starting work today. The original scaffolding brief is preserved verbatim
> under **[Appendix: original scaffolding session](#appendix-original-scaffolding-session-may-2026)**
> for history and learning — it records where the project *started*, not how it is *now*.
> Do not follow the appendix as setup guidance.
>
> **Canonical references:** operational guide → `CLAUDE.md`; connector-contract rules and
> rental math → `docs/02-demo-development.md`; the app-migration record → `docs/superpowers/plans/2026-05-25-ignite-migration.md`.

---

## Current stack (as of 2026-07-16)

**Where the app lives:** `apps/lavender-ops-mobile/` (npm/pnpm package name: `lavender-ops-mobile`).
The earlier `apps/mobile/` prototype was migrated into this workspace during the Ignite migration
(see the migration plan for the file-by-file mapping) and is being retired.

| Concern | Choice | Notes |
|---|---|---|
| **Boilerplate** | **Ignite** (Infinite Red) | Opinionated RN stack; replaced the bare Expo scaffold. Drives the folder layout (`app/screens`, `app/navigators`, `app/services`, `app/theme`, `app/components`). |
| **Framework** | Expo SDK 55 (dev-client), React Native 0.83, React 19.2 | Managed workflow with a custom dev-client (not Expo Go). |
| **Navigation** | **React Navigation 7** — native-stack + bottom-tabs | **NOT Expo Router.** File-based routing was dropped in the Ignite migration. Tabs live in `app/navigators/MainNavigator`. |
| **Language** | TypeScript (strict mode) | UI types are camelCase; the connector layer translates snake_case Postgres rows. |
| **Backend** | Supabase (`@supabase/supabase-js` v2) | Auth + Postgres + Storage. All access goes through the connector layer in `app/services/rentals/`. |
| **Package manager** | **pnpm** (app-local `pnpm-lock.yaml` + `pnpm-workspace.yaml`) | The shipping app is self-contained pnpm — run commands from `apps/lavender-ops-mobile`. (The monorepo root still declares npm workspaces; that layer is legacy.) |
| **Local storage** | `react-native-mmkv` + `expo-secure-store` | Replaced AsyncStorage (Ignite default; fast synchronous storage). |
| **Styling** | Ignite theme system — `useAppTheme()`, `ThemedStyle<ViewStyle>` | The lavender M3 tokens (below) are mapped into `app/theme/` (split-file format). |
| **Fonts** | Public Sans (body) + Space Grotesk (display) | |
| **Forms** | Shared form-component library — `app/components/form/` | `SectionLabel`, `FieldCard`, `FuelGauge`, `Stepper`, `RupiahInput`, `PhotoRow`, `BottomActionBar`. |
| **i18n** | `i18next` / `react-i18next` | UI copy is Bahasa Indonesia. |
| **API client** | `apisauce` | Ignite default (rarely used directly — most data goes through the Supabase connector). |
| **Testing** | Jest (`jest-expo`) + `@testing-library/react-native`; Maestro for e2e flows (`.maestro/`) | |
| **Debugging** | Reactotron | |
| **Distribution** | EAS Build APK, sideloaded (no Play Store) | Mom runs the `preview` APK. |
| **Updates** | OTA via `expo-updates` (channel `preview`) | `runtimeVersion` policy is `appVersion`; see the CLAUDE.md OTA section before shipping. |
| **Node** | Node 22 (repo `.nvmrc`) | The app's `engines` allows `>=20`. |

### The one rule that matters most

The **connector-contract layer** (`app/services/rentals/`) is the core architectural convention:
the UI never touches raw data — every read/write goes through an `async` connector function
(`getRentals()`, `createRental()`, …) with a locked signature. This is what keeps the
in-memory → Supabase story a connector-only change. Full rules: `CLAUDE.md` → "Connector-Contract
Rules" and `docs/02-demo-development.md` §3. Rental math lives in `docs/02` §6.

### What changed from the original scaffold (the learning bit)

| Original brief (appendix below) | Now | Why it changed |
|---|---|---|
| Expo Router (file-based routing) | React Navigation 7 (imperative) | Adopted the Ignite boilerplate, which is built on React Navigation. |
| `apps/mobile` | `apps/lavender-ops-mobile` | Full migration into Ignite — see `docs/superpowers/plans/2026-05-25-ignite-migration.md`. |
| npm workspaces (as the app's manager) | app-local **pnpm** workspace | The shipping app resolves via its own `pnpm-lock.yaml`; the root npm-workspace layer is now legacy. |
| AsyncStorage | `react-native-mmkv` | Ignite default; synchronous and faster. |
| `StyleSheet` + hand-rolled token imports | Ignite `useAppTheme()` / `ThemedStyle` | Themed styling with light/dark support baked in. |
| Throwaway Supabase "test koneksi" tab | Removed | Connectivity was proven long ago; real screens replaced it. |
| Bare Expo, "no tests / no form lib this session" | Jest + RNTL + Maestro, shared form-component library | The project matured well past the bootstrap. |

The **design tokens** from the original brief (the lavender palette, the 50-year-old-friendly type
scale, 48px minimum tap targets) are still in force — they now live in `app/theme/` instead of
`apps/mobile/src/theme/`.

---

## Appendix: original scaffolding session (May 2026)

> ⚠️ **Historical record — do not follow as current setup.** Everything below is the original
> Claude Code session brief that bootstrapped the project as `apps/mobile` on Expo Router + npm
> workspaces. It is preserved for history and learning. The **Current stack** section above
> supersedes every technical choice described here.

### Context

I'm building **LAVENDER**, a mobile app for my mom's vehicle rental business in Indonesia. It's an internal operations tool used by Mom (50yo, primary user) and Farrel (admin/son, secondary). Renters don't use the app — they're managed by Mom/Farrel.

This session is **only about setting up the mobile app foundation**. No feature implementation yet. The web admin will come later as a separate workspace.

### Stack decisions (already made — don't re-litigate)

- **Mobile framework:** React Native via Expo (managed workflow)
- **Language:** TypeScript everywhere
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
- **Web admin (future, not this session):** Vite + React
- **Shared code (future):** TypeScript package for types, validation, business logic — used by both apps
- **Distribution:** APK via EAS Build, sideloaded to Mom's/Farrel's phones. No Play Store.
- **Updates:** Expo Updates (OTA) for JS changes, occasional APK rebuilds for native changes
- **Hosting cost:** $0 (Supabase free, EAS free tier, local builds as fallback)

### What I want from this session

Set up a clean, working mobile project skeleton I can build features on top of. Specifically:

1. **Monorepo structure** ready for the future web app + shared package, but only the mobile app is scaffolded for now
2. **Expo + TypeScript** project initialized inside the monorepo
3. **Supabase client** wired up with environment variables (I'll provide my own keys later)
4. **Navigation** set up with bottom tabs matching the planned app structure: Beranda, Penyewaan, User, Hutang
5. **EAS Build** configured for APK distribution (preview profile)
6. **Expo Updates** configured for OTA updates
7. **A throwaway test screen** that confirms the Supabase connection works end-to-end (e.g., reads from a `test` table and shows the result, or just confirms auth state) — I'll throw it away once I start real work
8. **Basic theming primitives** in place: color tokens for the lavender palette, typography scale sized for a 50yo user
9. **README** with: how to run dev, how to build APK, how to push OTA updates, how to add the Supabase env vars

### Monorepo structure I want

```
lavender/
├── apps/
│   └── mobile/              ← Expo React Native app (this session)
│       ├── app/             ← if using expo-router, otherwise src/
│       ├── app.json
│       ├── eas.json
│       └── package.json
├── packages/
│   └── shared/              ← placeholder for now, set up package.json but leave empty
│       └── package.json
├── package.json             ← root, with workspaces config
├── .gitignore
├── .nvmrc                   ← pin Node version
└── README.md
```

Use npm workspaces (not pnpm/yarn — keep tooling minimal for a solo dev). If you have a strong reason to recommend pnpm, ask me first.

### Specific technical choices to make (you decide, but explain why briefly)

- **Navigation library:** Expo Router (file-based) vs React Navigation (imperative). I lean Expo Router because it's the current Expo-recommended path, but pick whichever you think is more stable/sane for a beginner-to-React-Native dev.
- **State management:** None for now. We'll use React Query (TanStack Query) when we start fetching data, but don't install it yet. Just useState/useContext for the bootstrap.
- **Styling:** Use StyleSheet API or NativeWind? I have no preference. Pick one and justify in the README. Lean toward whatever has less setup friction.
- **Form library:** Not needed this session. Don't install.
- **Icons:** `@expo/vector-icons` (comes with Expo, no extra install).

### Design tokens to wire up (initial values, refine later)

```ts
colors: {
  primary: '#8B7AB8',      // warm lavender accent
  primaryDark: '#6F5F99',
  background: '#FFFFFF',
  surface: '#F9F8FB',
  border: '#E5E2EC',
  text: '#1F1B2E',
  textMuted: '#6B6577',
  success: '#4A9B6E',      // available, lunas, verified
  warning: '#D4A23E',      // sedang sewa, due soon
  danger: '#C75B5B',       // overdue, hutang
  inactive: '#A8A4B3',
}

spacing: 4, 8, 12, 16, 20, 24, 32, 48 (use a scale)

typography: slightly larger than typical, target user is 50yo
  - body: 16px
  - bodyLarge: 18px
  - heading: 22px
  - headingLarge: 28px
  - caption: 14px

tapTargetMin: 48px height
borderRadius: 12px default, 16px for cards
```

Put these in `apps/mobile/src/theme/` or wherever fits the chosen styling approach.

### Bottom tabs to scaffold (empty screens for now)

1. **Beranda** (home icon)
2. **Penyewaan** (calendar/list icon)
3. **User** (people icon)
4. **Hutang** (wallet/cash icon)

All in Bahasa Indonesia. Use sensible icons from `@expo/vector-icons`. Each screen just shows its name as a placeholder for now.

### Environment variables

Use Expo's recommended approach for env vars (`EXPO_PUBLIC_*` prefix for client-side). Create `.env.example` with:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Add `.env` to `.gitignore`. Don't ask me for real keys — I'll add them myself after setup.

### EAS configuration

`eas.json` should have at least two profiles:

- **development** — internal dev build, for development client on my phone
- **preview** — APK build for distribution to Mom/Farrel (not AAB, not Play Store)

Don't configure a production profile yet — we're not going to Play Store.

In `app.json`:
- Set `expo.android.package` to `com.lavender.app` (or ask me for preference)
- Set `expo.version` to `0.1.0`
- Set `expo.android.versionCode` to `1`
- Configure `expo-updates` with a placeholder runtime version

### Supabase client setup

- Install `@supabase/supabase-js`
- Install `@react-native-async-storage/async-storage` (needed for auth session persistence)
- Install `react-native-url-polyfill` (Supabase needs it on RN)
- Create `apps/mobile/src/lib/supabase.ts` that exports a configured client reading from env vars
- Handle the case where env vars are missing — fail with a clear error message, don't silently break

### Test screen for verifying connection

Create a screen (can be a 5th tab temporarily, or a button on Beranda) that:

1. Shows the Supabase URL it's connected to (last 8 chars only, for security)
2. Has a button "Test koneksi"
3. On tap, tries `supabase.auth.getSession()` and shows result
4. Status indicator: green if Supabase client initialized, red if not

This is throwaway — I'll delete it once I'm building real screens. Just enough to know the wiring works.

### What I do NOT want in this session

- Any actual feature screens (no rental forms, no user lists, etc.)
- Database schema / SQL migrations (separate session)
- Auth UI / login screens (separate session)
- The shared package's actual content (just the empty placeholder)
- The web admin (separate workspace, future session)
- Tests / CI / linting beyond what Expo gives by default
- A custom design system library — just tokens, no component library yet

### Constraints

- I want to **understand what's happening**, not just have it work. After each major step, briefly explain what you did and why.
- If you hit a decision point I didn't cover, **ask me** rather than making assumptions.
- If I asked for something that's a bad idea, **push back** and propose an alternative.
- I'm on [tell Claude Code your OS — macOS / Windows / Linux] and have Node installed. Tell me the Node version I should be on (set it in `.nvmrc`).
- Assume I have an Expo account but haven't run `eas login` yet — include that in the setup steps.

### My background (so you calibrate explanations)

- Final-year Information Systems student
- Used Flutter once, never built a React Native app before
- Comfortable with React (Next.js for thesis)
- Comfortable with TypeScript
- Comfortable with Supabase concepts (used Firebase before)
- Solo dev, hobby project, no timeline pressure

### Deliverables at the end of this session

1. A working `lavender/` directory I can `cd` into and run
2. `npm run dev` (or equivalent) starts Expo dev server
3. I can scan the QR code with Expo Go and see the 4 bottom tabs
4. The Supabase test screen confirms the client is wired up (will show "no env vars" until I add them)
5. `eas build --profile preview --platform android` is documented in the README and ready to run once I'm logged in
6. README explains: dev workflow, how env vars work, how to build an APK, how to push OTA updates, how to bump versions

### Start by

1. Confirming you understand the scope
2. Asking any clarifying questions before running commands
3. Then proceed step by step, explaining as you go
