# LAVENDER

Internal mobile operations tool for Mom's vehicle rental business.

**Users:** Mom (primary) + Farrel (admin)
**Distribution:** APK sideloaded — not on Play Store

---

## Stack

- Expo SDK 55 (managed workflow)
- React Native 0.83 / React 18.3
- Expo Router 55 (file-based navigation)
- Supabase (auth + database)
- EAS Build (APK generation)
- Expo Updates (OTA JS updates)

---

## Setup

### 1. Prerequisites

- Node 22 (`node --version` → `v22.x.x`)
- npm 10+ (`npm --version`)
- **Windows:** Developer Mode enabled — Settings → For Developers → Developer Mode  
  (required for npm workspace symlinks)
- EAS CLI: `npm install -g eas-cli`
- Expo account: create at [expo.dev](https://expo.dev)

### 2. Install dependencies

```powershell
npm install
```

### 3. Configure environment variables

```powershell
Copy-Item .env.example .env
```

Edit `.env` and fill in your keys:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from your Supabase project dashboard: **Settings → API**.

### 4. EAS login and project init (first time only)

```powershell
eas login
cd apps\mobile
eas init
```

After `eas init`, it prints your project UUID. Update these two fields in `apps/mobile/app.json`:
- `plugins[1][1].username` → your Expo username
- `updates.url` → `https://u.expo.dev/<YOUR_UUID>`
- `extra.eas.projectId` → `<YOUR_UUID>` (eas init writes this automatically)

---

## Running the dev server

```powershell
cd apps\mobile
npx expo start
```

Or from the monorepo root:

```powershell
npm run mobile
```

Scan the QR code with **Expo Go** on Android to preview the app.  
Press `a` in the terminal to open on an Android emulator (requires Android Studio + AVD).

---

## Building an APK

### Preview APK (for Mom and Farrel's phones)

```powershell
cd apps\mobile
eas build --profile preview --platform android
```

This runs on EAS cloud servers — no local Android SDK required.

When the build completes, EAS prints a download URL. Download the `.apk`, then:

1. Send to the phone via WhatsApp or email
2. On the phone: Settings → Install unknown apps → allow your file manager
3. Open the `.apk` to install

### Development build (connects to your local Metro server)

```powershell
eas build --profile development --platform android
```

Install this APK on your phone, start the dev server (`npx expo start`), shake the phone to connect.

---

## OTA Updates (JavaScript-only changes)

Push JS/TypeScript changes without a new APK install:

```powershell
cd apps\mobile
eas update --branch preview --message "describe what changed"
```

Phones running the `preview` APK check for updates on launch and apply them in the background.

### When OTA is NOT enough (new APK required)

- Added a new native package (anything requiring `expo prebuild`)
- Changed native fields in `app.json` (permissions, package name, etc.)
- Bumped `version` in `app.json` (OTA eligibility is tied to the version)

In these cases: rebuild with `eas build --profile preview`, reinstall the APK.

### Bumping the version

In `apps/mobile/app.json`:
- Increment `version` (e.g. `0.1.0` → `0.2.0`) for feature releases
- Increment `android.versionCode` by 1 every time you build an APK (must be strictly increasing)

---

## Project structure

```
lavender-app/
├── apps/
│   └── mobile/
│       ├── app/                    ← Expo Router file-based routes
│       │   ├── _layout.tsx         ← root Stack navigator
│       │   └── (tabs)/             ← bottom tab group
│       │       ├── _layout.tsx     ← tab bar config
│       │       ├── index.tsx       ← Beranda
│       │       ├── penyewaan.tsx
│       │       ├── user.tsx
│       │       ├── hutang.tsx
│       │       └── test.tsx        ← throwaway Supabase test screen
│       ├── src/
│       │   ├── lib/supabase.ts     ← Supabase client
│       │   └── theme/index.ts      ← design tokens
│       ├── assets/images/          ← icon, splash, adaptive-icon PNGs
│       ├── app.json
│       ├── eas.json
│       ├── metro.config.js         ← monorepo Metro config
│       └── package.json
├── packages/
│   └── shared/                     ← future: shared types and business logic
├── package.json                    ← npm workspaces root
├── .env.example
└── README.md
```

---

## Design tokens

Tokens are in `apps/mobile/src/theme/index.ts`. Import anywhere:

```typescript
import { colors, spacing, typography, borderRadius, tapTargetMin } from '../../src/theme';
```

Primary color: `#8B7AB8` (warm lavender). All tap targets are minimum 48px height.

---

## Deleting the test screen

Once Supabase is confirmed working:

1. Delete `apps/mobile/app/(tabs)/test.tsx`
2. Remove the `test` entry from the `TABS` array in `apps/mobile/app/(tabs)/_layout.tsx`
3. Run `npx expo start` — the tab disappears automatically (file-based routing)

---

## Windows gotchas

- **Developer Mode** must be on for npm workspace symlinks to work
- **Long paths**: if you hit 260-char path errors, run as Administrator:  
  `reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f`
- **`.env` encoding**: save as UTF-8 (not UTF-16 LE). Use VS Code, not Notepad
- **Watchman**: not available on Windows — Metro uses fs polling (slightly slower, no config needed)
