# Phase 1: Native-Dependency Bake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and configure the seven APK-locked native dependencies (plus the `react-native-url-polyfill` JS shim) into `apps/lavender-ops-mobile`, so the v1.0.0 APK ships with every native module **and permission declaration** the post-ship OTA roadmap will need — verified by a clean type-check and Metro bundle, with a documented (deferred) EAS preview-build gate.

**Architecture:** The active app is `apps/lavender-ops-mobile` (Ignite + React Navigation, managed Expo workflow — no committed `android/`/`ios/`; EAS regenerates them via prebuild on Linux, and `.easignore` excludes them). Native modules autolink simply by being in `package.json`; the only hand-edited config is `app.json`'s `plugins` array, which is where each library's **permission strings** are declared. Permission declarations end up in `AndroidManifest.xml`/`Info.plist` at build time and **cannot be added via OTA** — same constraint as the app icon — so they must be baked in this phase even though the JS wiring (camera capture, auth-token storage, etc.) is deferred to later phases.

**Tech Stack:** Expo SDK 55, React Native 0.83, React 19.2, EAS Build, pnpm (app-local package manager — the app has its own `pnpm-lock.yaml`; the monorepo-root `package-lock.json` governs only the legacy `apps/mobile`).

**Scope guardrails (per roadmap spec §5, Phase 1 = "bake + smoke build" only):**
- DO install the libs and declare permissions. DO verify type-check + Metro bundle.
- Do NOT wire Supabase or any connector code (Phase 4). The only JS-side addition is the `react-native-url-polyfill/auto` import at the entry point.
- Do NOT touch the app icon / splash / branding (Phase 2 owns those assets — including the `expo-notifications` icon/color).
- Do NOT add camera/photo capture UI (Phase 6).

---

## File Structure

In-session changes (all under `apps/lavender-ops-mobile/`):

| File | Change | Responsibility |
|---|---|---|
| `package.json` | Modify (via `expo install`, not hand-edited) | Declares the 8 new dependencies so Expo autolinks the native ones |
| `pnpm-lock.yaml` | Modify (auto, by `expo install`) | Pins resolved versions |
| `app.json` | Modify — extend `plugins` array | Declares APK-locked permissions for camera, image-picker, secure-store |
| `index.tsx` | Modify — add one import | Installs the URL polyfill `supabase-js` needs in the RN runtime |

No new files are created. The EAS build (Task 5) is a cloud operation that touches nothing in the repo.

---

## Task 0: Pre-flight checks

**Files:** none (verification only)

- [ ] **Step 1: Confirm a clean working tree**

Run (from repo root `C:\Users\ferna\dev\personal_projects\lavender-app`):
```powershell
git status
```
Expected: `nothing to commit, working tree clean`. If there are uncommitted changes, stop and resolve them first — this phase commits incrementally and a dirty tree muddies the diffs.

- [ ] **Step 2: Confirm the active app and package manager**

Run:
```powershell
Test-Path apps\lavender-ops-mobile\pnpm-lock.yaml
```
Expected: `True`. This confirms pnpm is the app-local package manager. All install commands below run **from inside `apps/lavender-ops-mobile`**, where `npx expo install` auto-detects pnpm from this lockfile. Do NOT run `npm install` at the monorepo root for this app's deps.

- [ ] **Step 3: Confirm the baseline builds before we touch anything**

Run:
```powershell
cd apps\lavender-ops-mobile
npx tsc --noEmit -p .
```
Expected: no output, exit code 0. This is the baseline — if Phase 0's components already type-check clean, any error after our changes is ours.

---

## Task 1: Install the eight native dependencies

**Files:**
- Modify: `apps/lavender-ops-mobile/package.json` (via `expo install`)
- Modify: `apps/lavender-ops-mobile/pnpm-lock.yaml` (auto)

- [ ] **Step 1: Install all bake-list packages in one command**

Run (from `apps/lavender-ops-mobile`):
```powershell
npx expo install @supabase/supabase-js react-native-url-polyfill expo-camera expo-image-picker expo-file-system react-native-webview expo-notifications expo-secure-store
```
`expo install` resolves SDK-55-compatible versions for the `expo-*` packages and installs the others at a compatible version, then runs `pnpm add` under the hood (detected from `pnpm-lock.yaml`).

Expected: install completes; pnpm reports the 8 packages added. The native `expo-*` packages, `react-native-webview`, `react-native-url-polyfill` are now in `node_modules`.

- [ ] **Step 2: Verify all eight landed in package.json**

Run:
```powershell
Select-String -Path package.json -Pattern "supabase-js|url-polyfill|expo-camera|expo-image-picker|expo-file-system|react-native-webview|expo-notifications|expo-secure-store"
```
Expected: 8 matching lines in the `dependencies` block. If any is missing, re-run the install for that package.

- [ ] **Step 3: Verify SDK version compatibility**

Run:
```powershell
npx expo install --check
```
Expected: `Dependencies are up to date` (or it prints a list and offers to fix — if it lists mismatches, run `npx expo install --fix` and re-check). This catches the most common Phase-1 footgun: a native lib pinned to a version that doesn't match Expo SDK 55.

- [ ] **Step 4: Type-check still passes**

Run:
```powershell
npx tsc --noEmit -p .
```
Expected: no output, exit 0. The new packages ship their own types; this confirms they resolve and don't conflict with strict mode.

- [ ] **Step 5: Commit**

Run (from repo root):
```powershell
git add apps/lavender-ops-mobile/package.json apps/lavender-ops-mobile/pnpm-lock.yaml
git commit -m @'
feat(deps): bake v1.0 native dependencies into lavender-ops-mobile

Install supabase-js + url-polyfill, expo-camera, expo-image-picker,
expo-file-system, react-native-webview, expo-notifications,
expo-secure-store. JS wiring deferred to later phases (roadmap Phase 1).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```
Expected: commit succeeds.

---

## Task 2: Declare APK-locked permissions via config plugins

**Files:**
- Modify: `apps/lavender-ops-mobile/app.json` (extend `plugins` array)

**Why these three plugins (and not `expo-notifications`):**
- `expo-camera`, `expo-image-picker`, `expo-secure-store` each contribute permission strings to the native manifests. Those strings are APK-locked and must be declared now.
- `expo-notifications` adds its `POST_NOTIFICATIONS` (Android 13+) permission automatically from the package's own manifest contribution when autolinked — **no plugin entry is required for the permission**. Its config plugin only customizes the notification icon/color/sounds, which are branding assets owned by Phase 2. So we install the package (Task 1) but defer its plugin entry.
- `expo-file-system` and `react-native-webview` need no plugin — they autolink and declare nothing permission-gated for our use.

- [ ] **Step 1: Replace the `plugins` array in app.json**

The current `plugins` array (`apps/lavender-ops-mobile/app.json`) ends with `"expo-build-properties"`. Replace the entire array with the block below (appends the three permission plugins; leaves the existing entries untouched):

```json
  "plugins": [
    "expo-localization",
    "expo-font",
    [
      "expo-splash-screen",
      {
        "image": "./assets/images/app-icon-android-adaptive-foreground.png",
        "imageWidth": 300,
        "resizeMode": "contain",
        "backgroundColor": "#191015"
      }
    ],
    [
      "react-native-edge-to-edge",
      {
        "android": {
          "parentTheme": "Light",
          "enforceNavigationBarContrast": false
        }
      }
    ],
    "expo-build-properties",
    [
      "expo-camera",
      {
        "cameraPermission": "Lavender Ops menggunakan kamera untuk memotret KTP/KTM penyewa dan kondisi kendaraan saat keluar dan kembali.",
        "microphonePermission": false,
        "recordAudioAndroid": false
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "Lavender Ops mengakses galeri untuk memilih foto KTP/KTM dan kondisi kendaraan."
      }
    ],
    [
      "expo-secure-store",
      {
        "faceIDPermission": "Lavender Ops menggunakan Face ID untuk mengamankan sesi login Anda."
      }
    ]
  ],
```

Notes on the camera options: `microphonePermission: false` skips the iOS microphone usage string and `recordAudioAndroid: false` keeps `RECORD_AUDIO` out of the Android manifest — we only take stills, never video, so we don't request audio. Permission strings are in Indonesian to match the app's UI language.

> **Fallback:** if the Task 5 prebuild errors on the `expo-camera` plugin schema (some versions don't accept a literal `false` for `microphonePermission`), remove the `microphonePermission` key entirely and keep only `recordAudioAndroid: false` — that alone suppresses the Android `RECORD_AUDIO` permission, which is the part that matters for our Android APK.

- [ ] **Step 2: Verify app.json is still valid and config resolves**

Run (from `apps/lavender-ops-mobile`):
```powershell
npx expo config --type public > $null; if ($?) { "config resolves OK" }
```
Expected: `config resolves OK`. This evaluates `app.config.ts` (which spreads `app.json`'s `plugins`) and fails loudly if the JSON is malformed or a plugin name is wrong. (`app.config.ts` merges `config.plugins ?? []`, so the new entries flow through automatically — no edit to `app.config.ts` needed.)

- [ ] **Step 3: Type-check**

Run:
```powershell
npx tsc --noEmit -p .
```
Expected: no output, exit 0 (config edits shouldn't affect TS, but confirm nothing regressed).

- [ ] **Step 4: Commit**

Run (from repo root):
```powershell
git add apps/lavender-ops-mobile/app.json
git commit -m @'
feat(config): declare APK-locked camera/photo/secure-store permissions

Add expo-camera, expo-image-picker, expo-secure-store config plugins with
Indonesian permission strings. These bake into AndroidManifest/Info.plist at
build time and cannot be added via OTA, so they must ship in v1.0.0 even
though JS wiring lands in later phases. expo-notifications plugin (icon/color)
deferred to Phase 2 branding.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```
Expected: commit succeeds.

---

## Task 3: Add the URL polyfill at the entry point

**Files:**
- Modify: `apps/lavender-ops-mobile/index.tsx`

`@supabase/supabase-js` uses the WHATWG `URL` API, which React Native's runtime implements incompletely. `react-native-url-polyfill/auto` patches `global.URL` and must be imported **before** any code that constructs a URL — i.e. at the very top of the entry file. Importing it now (rather than in Phase 4) is correct and harmless: it makes the bake self-proving (the polyfill must resolve and bundle) and means Supabase "just works" when the connector swap happens.

- [ ] **Step 1: Add the polyfill import as the first line of `index.tsx`**

The file currently starts with `import "@expo/metro-runtime"`. Add the polyfill import as the new first line:

```tsx
import "react-native-url-polyfill/auto"
import "@expo/metro-runtime" // this is for fast refresh on web w/o expo-router
import { registerRootComponent } from "expo"

import { App } from "@/app"

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
```

- [ ] **Step 2: Type-check**

Run (from `apps/lavender-ops-mobile`):
```powershell
npx tsc --noEmit -p .
```
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

Run (from repo root):
```powershell
git add apps/lavender-ops-mobile/index.tsx
git commit -m @'
feat(boot): install react-native-url-polyfill for supabase-js

supabase-js needs a complete WHATWG URL implementation; the polyfill must
load before any URL is constructed, so it goes first in the entry file.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```
Expected: commit succeeds.

---

## Task 4: Verify the JS bundle (Metro) builds with everything baked

This is the strongest verification available **without a native build**: Metro resolves and bundles every JS import, so it proves `react-native-url-polyfill`, `@supabase/supabase-js`, and the JS facades of all native modules resolve. (Native autolinking itself can only be proven by Task 5's real build.)

**Files:** none (verification only; `dist/` output is throwaway and gitignored via `.easignore` patterns)

- [ ] **Step 1: Export an Android bundle**

Run (from `apps/lavender-ops-mobile`):
```powershell
npx expo export --platform android
```
Expected: completes with `Exported: dist` (or similar) and no "Unable to resolve module" errors. Any unresolved import from the new packages would fail here.

- [ ] **Step 2: Clean up the throwaway bundle output**

Run:
```powershell
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
```
Expected: `dist/` removed. (It is build output, not committed.)

- [ ] **Step 3: Optional health check**

Run:
```powershell
npx expo-doctor
```
Expected: all checks pass (or only warnings unrelated to our changes). `expo-doctor` flags version mismatches and plugin misconfigurations — a good final gate before the build. Not a hard blocker; note any warnings for Farrel.

No commit — this task produces no source changes.

---

## Task 5: Deferred EAS preview-build smoke test (manual — run by Farrel later)

**This task is NOT executed in the implementation session.** Per the decision to defer the build, an agent should stop after Task 4 and hand this procedure to Farrel. The cloud build takes ~10–30 min (longer if on the EAS free-tier queue) and requires an interactive Expo login, so it can't run unattended.

The `preview` profile in `eas.json` builds an internal-distribution **APK** (`"android": { "buildType": "apk" }`) — the closest thing to what eventually ships to mom, which makes it the right smoke target.

- [ ] **Step 1: Pre-flight — confirm EAS auth**

```powershell
eas whoami
```
Expected: prints Farrel's Expo account. If it errors with "not logged in," run `eas login` first. If `eas` is not found, install the CLI: `npm install -g eas-cli`. (Tip: in a Claude Code session, prefix interactive commands with `!`, e.g. `!eas login`.)

- [ ] **Step 2: Kick off the cloud APK build**

Run (from `apps/lavender-ops-mobile`):
```powershell
eas build --profile preview --platform android
```
Expected: build is queued, then runs. The build performs `expo prebuild` on a Linux runner (regenerating `android/`, which is why `.easignore` excludes the local one), autolinks the native modules, and compiles the APK. **A green build is the proof that the seven native modules autolink correctly.**

- [ ] **Step 3: Download and install the APK on a real Android device**

Use the EAS build URL (printed at completion) to download the APK, then install it (`adb install <path>.apk`, or open the link on the device). Launch the app.
Expected: the app boots to the Beranda screen and Phase 0 screens render — i.e., no native crash from a mismatched/missing native module.

- [ ] **Step 4: Verify the baked permissions are actually declared**

With the app installed, confirm the permission declarations made it into the manifest:
```powershell
adb shell dumpsys package com.lavender.ops | Select-String "permission"
```
Expected to see, among others:
- `android.permission.CAMERA`
- `android.permission.READ_MEDIA_IMAGES` (or `READ_EXTERNAL_STORAGE` on older Android) — from `expo-image-picker`
- `android.permission.POST_NOTIFICATIONS` — from `expo-notifications`

You should NOT see `android.permission.RECORD_AUDIO` (we disabled it). Alternatively, check **Settings → Apps → Lavender Ops → Permissions** on the device.

If a permission is missing, the corresponding config plugin (Task 2) wasn't applied — re-check `app.json` and rebuild. **Catching this now, in Phase 1, is the entire point** — discovering it in Phase 6 would force a new APK trip to mom.

---

## Definition of Done

**In-session (Tasks 0–4):**
- All 8 packages present in `package.json`; `expo install --check` clean.
- `app.json` declares camera / photo / secure-store permission plugins.
- `react-native-url-polyfill/auto` imported first in `index.tsx`.
- `npx tsc --noEmit -p .` passes; `npx expo export --platform android` bundles with no unresolved modules.
- Three clean commits (deps, config, polyfill).

**Deferred gate (Task 5, Farrel runs later):**
- `eas build --profile preview --platform android` produces a green APK.
- APK installs and launches to Beranda without a native crash.
- `dumpsys` shows CAMERA + READ_MEDIA_IMAGES + POST_NOTIFICATIONS declared, and no RECORD_AUDIO.

Once the deferred gate is green, Phase 1 is complete and Phase 2 (branding) can proceed on a known-good native baseline.
