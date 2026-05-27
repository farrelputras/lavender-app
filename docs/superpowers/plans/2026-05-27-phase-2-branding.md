# Phase 2: Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default Ignite boilerplate branding with finalized Lavender Ops artwork (app icon, adaptive + monochrome variants, splash screen, notification icon) and lock it into the native build config before the v1.0.0 ship.

**Architecture:** All branding assets are **native, APK-bound** — they are baked in at build time and **cannot** be changed via OTA. This phase wires user-supplied artwork into `app.json` (the single source of truth, spread by `app.config.ts`), corrects the splash background from dark Ignite `#191015` to light `#f6faff`, adds the two config keys currently missing (`monochromeImage`, `expo-notifications` plugin), then verifies the config resolves and prebuilds cleanly. The actual APK icon-rendering smoke test on a device is deferred to Farrel (manual, interactive EAS login — same precedent as Phase 1).

**Tech Stack:** Expo SDK 55 (managed), `app.json` + `app.config.ts`, `expo-splash-screen` config plugin, `expo-notifications` config plugin, EAS Build (APK preview profile), `npx expo config` / `npx expo prebuild` for verification.

---

## Context

Why this change: The app currently ships the **default Ignite boilerplate icon** — an orange "Ignite" wordmark + lightning bolt on a dark `#191015` background. Every branding asset in `apps/lavender-ops-mobile/assets/images/` is this placeholder; no Lavender artwork exists anywhere in the repo. The splash screen reuses the same dark boilerplate image on a dark background. This is unacceptable for a v1.0.0 build the business owner will use daily.

The app icon is a **native asset** — it is compiled into the APK and **cannot be updated over-the-air**. The same is true of the splash screen and the Android notification icon. Therefore branding **must** be finalized and correct *before* the v1.0.0 APK is built; getting it wrong means a full rebuild + re-sideload, not an OTA push. That's why the v1 roadmap carves branding out as its own phase gated ahead of ship.

What prompted it: v1 roadmap spec (`docs/superpowers/specs/2026-05-26-v1-roadmap-design.md`, §5) lists Phase 2 = "Branding (app icon adaptive + monochrome, splash screen, verify `Lavender Ops` name in `app.json`) + test APK build to sanity-check icon | 1-3 hrs". Phase 1 (native dep bake) is complete; Phase 2 is the next gate.

Intended outcome: Lavender-branded icon renders correctly across Android (legacy launchers, adaptive launchers, Android 13+ themed/monochrome), iOS, and web; splash screen transitions seamlessly into the light Beranda background; notification icon is a clean white silhouette tinted brand purple. All wired into config, type-checked, config-resolved, and prebuild-clean — ready for Farrel's manual APK smoke test.

### Decisions already locked (from user)
- **Icon artwork source:** The user is designing/making the art themselves. This plan does **not** generate art — its tasks are *wiring user-supplied assets + config + verification*. Task 0 is the asset-spec checklist the user fills before wiring begins.
- **Splash background:** Light **`#f6faff`** (app's `neutral50` / `background` token) for a seamless splash → Beranda transition. Logo art in brand purple.

### Brand palette (for the artwork the user is producing — reference only)
- Primary purple `#62528d` (`palette.purple500`) — primary logo / notification tint
- `#e9ddff` (purple100), `#cfbcff` (purple200), `#4d3d76` (purple600), `#7c6ba8` (purple700), `#200f48` (purple800)
- Background `#f6faff` (neutral50) — splash background
- `primaryDark` `#6F5F99`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `apps/lavender-ops-mobile/assets/images/*.png` | All branding raster assets (icon variants, splash, notification icon) | **Replace** placeholders with user art (Task 0 + Task 1) |
| `apps/lavender-ops-mobile/app.json` | Single source of truth for icon slots, adaptiveIcon (+ new `monochromeImage`), splash bg color, new `expo-notifications` plugin, name verify | **Modify** (Tasks 2-5) |
| `apps/lavender-ops-mobile/app.config.ts` | Spreads app.json + merges plugins; new plugins flow through automatically | **No edit** — verify only |
| `apps/lavender-ops-mobile/eas.json` | `preview` profile (apk, internal) = the smoke-build target | **No edit** — referenced by deferred Task 7 |

**Asset slot reference** (current filenames in `app.json` — keep names so config keys don't churn):

| `app.json` key | Filename | Purpose |
|----------------|----------|---------|
| `icon` | `app-icon-all.png` | Universal fallback icon |
| `android.icon` | `app-icon-android-legacy.png` | Pre-adaptive (Android < 8) launcher icon |
| `android.adaptiveIcon.foregroundImage` | `app-icon-android-adaptive-foreground.png` | Adaptive foreground (logo) |
| `android.adaptiveIcon.backgroundImage` | `app-icon-android-adaptive-background.png` | Adaptive background (solid/texture) |
| `android.adaptiveIcon.monochromeImage` | `app-icon-android-adaptive-monochrome.png` | **NEW** — Android 13+ themed-icon silhouette |
| `ios.icon` | `app-icon-ios.png` | iOS icon (opaque, no transparency) |
| `web.favicon` | `app-icon-web-favicon.png` | Web favicon |
| `expo-splash-screen.image` | `splash-icon.png` | **NEW dedicated** splash logo (stop reusing adaptive-foreground) |
| `expo-notifications.icon` | `notification-icon.png` | **NEW** — white/alpha silhouette for status bar |

---

## Task 0: Asset Specification Checklist (user-supplied art)

**Files:**
- Reference only — no code. This task is the spec the user fills before any wiring.

This is the gate. Wiring tasks assume these files exist at the listed paths with the listed properties. **Do not start Task 1 until every box here is satisfied.**

- [x] **Step 1: Confirm each asset is produced to spec**

The user supplies the following PNGs into `apps/lavender-ops-mobile/assets/images/` (overwriting placeholders, keeping the exact filenames):

| Filename | Dimensions | Constraints |
|----------|-----------|-------------|
| `app-icon-ios.png` | 1024×1024 | **Fully opaque**, no alpha/transparency, **no pre-rounded corners** (Apple masks automatically). Square. |
| `app-icon-all.png` | 1024×1024 | Universal fallback. Opaque recommended. |
| `app-icon-android-legacy.png` | 1024×1024 | Pre-adaptive launcher icon. May include its own padding/shape. |
| `app-icon-android-adaptive-foreground.png` | 1024×1024 | Logo content must sit within the **central 66% safe zone** (~432×432 of the 1024 canvas effectively — keep art well inside center; outer ~17% on each edge may be clipped by launcher masks). Transparent outside the logo. |
| `app-icon-android-adaptive-background.png` | 1024×1024 | Solid fill or simple texture. Brand-appropriate (e.g. white `#f6faff` or purple). Opaque. |
| `app-icon-android-adaptive-monochrome.png` | 1024×1024 | **NEW.** Single-color (any color; system recolors it) **silhouette** of the logo on **transparent** background, same 66% safe zone. Used for Android 13+ themed icons. |
| `app-icon-web-favicon.png` | 48×48 (or 64×64) | Small favicon. |
| `splash-icon.png` | ~1024×1024 (square, generous transparent padding) | **NEW dedicated splash logo.** Logo art on transparent background; will render at `imageWidth: 300` centered on `#f6faff`. Do NOT reuse the adaptive-foreground file. |
| `notification-icon.png` | 96×96 | **NEW.** Android status-bar icon: **pure white silhouette on transparent** (alpha channel only — Android ignores color and tints it). Simple, legible at small size. |

- [x] **Step 2: Verify files are present and correctly named**

Run: `npx expo-doctor` (optional sanity) and a directory check:
```powershell
Get-ChildItem apps/lavender-ops-mobile/assets/images/*.png | Select-Object Name, Length
```
Expected: all nine filenames above present; none are zero-length; `notification-icon.png` and `app-icon-android-adaptive-monochrome.png` and `splash-icon.png` now exist.

---

## Task 1: Drop in user-supplied assets

**Files:**
- Replace: `apps/lavender-ops-mobile/assets/images/app-icon-ios.png`
- Replace: `apps/lavender-ops-mobile/assets/images/app-icon-all.png`
- Replace: `apps/lavender-ops-mobile/assets/images/app-icon-android-legacy.png`
- Replace: `apps/lavender-ops-mobile/assets/images/app-icon-android-adaptive-foreground.png`
- Replace: `apps/lavender-ops-mobile/assets/images/app-icon-android-adaptive-background.png`
- Create: `apps/lavender-ops-mobile/assets/images/app-icon-android-adaptive-monochrome.png`
- Replace: `apps/lavender-ops-mobile/assets/images/app-icon-web-favicon.png`
- Create: `apps/lavender-ops-mobile/assets/images/splash-icon.png`
- Create: `apps/lavender-ops-mobile/assets/images/notification-icon.png`

- [x] **Step 1: Copy the user's finalized PNGs into the assets folder**

The user places each file from Task 0 at its path above. (This is a file-copy action, not a code edit — the user does it, or hands the agent the files to move into place.)

- [x] **Step 2: Spot-check the most constraint-sensitive assets visually**

Open and eyeball: `app-icon-ios.png` (no transparency, no rounded corners), `app-icon-android-adaptive-foreground.png` (logo inside center safe zone), `app-icon-android-adaptive-monochrome.png` (silhouette, transparent), `notification-icon.png` (white-on-transparent). These four have hard rendering constraints; the others are forgiving.

- [x] **Step 3: Commit the assets**

```bash
git add apps/lavender-ops-mobile/assets/images/
git commit -m "chore(branding): replace Ignite boilerplate icons with Lavender Ops art"
```

---

## Task 2: Add Android monochrome icon to adaptiveIcon

**Files:**
- Modify: `apps/lavender-ops-mobile/app.json` (the `android.adaptiveIcon` block, lines 20-23)

- [x] **Step 1: Add the `monochromeImage` key**

In `app.json`, change the `adaptiveIcon` block from:

```json
"adaptiveIcon": {
  "foregroundImage": "./assets/images/app-icon-android-adaptive-foreground.png",
  "backgroundImage": "./assets/images/app-icon-android-adaptive-background.png"
},
```

to:

```json
"adaptiveIcon": {
  "foregroundImage": "./assets/images/app-icon-android-adaptive-foreground.png",
  "backgroundImage": "./assets/images/app-icon-android-adaptive-background.png",
  "monochromeImage": "./assets/images/app-icon-android-adaptive-monochrome.png"
},
```

- [x] **Step 2: Verify JSON still parses**

Run: `npx expo config --type public`
Expected: command succeeds (exit 0); output JSON shows `android.adaptiveIcon.monochromeImage` populated. No parse error.

---

## Task 3: Fix splash screen — light background + dedicated splash image

**Files:**
- Modify: `apps/lavender-ops-mobile/app.json` (the `expo-splash-screen` plugin block, lines 39-47)

- [x] **Step 1: Point splash at the dedicated image and switch to the light background**

In `app.json`, change the `expo-splash-screen` plugin entry from:

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/app-icon-android-adaptive-foreground.png",
    "imageWidth": 300,
    "resizeMode": "contain",
    "backgroundColor": "#191015"
  }
],
```

to:

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 300,
    "resizeMode": "contain",
    "backgroundColor": "#f6faff"
  }
],
```

Rationale: `#f6faff` is the app's `neutral50` / `background` token — splash now fades seamlessly into Beranda instead of flashing dark Ignite charcoal. Dedicated `splash-icon.png` decouples the splash logo from the adaptive-icon foreground (different padding needs).

- [x] **Step 2: Verify config resolves**

Run: `npx expo config --type public`
Expected: exit 0; output shows the splash plugin with `backgroundColor: "#f6faff"` and `image` pointing at `splash-icon.png`.

---

## Task 4: Add expo-notifications plugin (notification icon + color)

**Files:**
- Modify: `apps/lavender-ops-mobile/app.json` (the `plugins` array — add a new entry; `expo-notifications` was installed in Phase 1 but never configured)

- [x] **Step 1: Add the `expo-notifications` plugin entry**

In `app.json`, inside the `plugins` array (e.g. after the `expo-secure-store` entry, before the array closes at line 77), add:

```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/notification-icon.png",
    "color": "#62528d"
  }
]
```

(Add a comma after the preceding `expo-secure-store` entry's closing bracket so the array stays valid.)

Rationale: Android renders the notification small-icon as a white silhouette tinted by `color`. `#62528d` is `palette.purple500` (brand primary). This was explicitly deferred from Phase 1's native-dep bake into Phase 2 branding.

- [x] **Step 2: Verify config resolves and the plugin is registered**

Run: `npx expo config --type public`
Expected: exit 0; output `plugins` includes `expo-notifications` with the icon path and `color: "#62528d"`.

---

## Task 5: Verify the "Lavender Ops" app name

**Files:**
- Read-only: `apps/lavender-ops-mobile/app.json` (line 2)

- [x] **Step 1: Confirm the display name**

Run: `npx expo config --type public`
Expected: output shows `"name": "Lavender Ops"`. This is already correct in `app.json:2` — this step is a verification gate, not an edit. If it reads anything else, set `"name": "Lavender Ops"`.

---

## Task 6: In-session verification (type-check + config + prebuild)

**Files:**
- No edits — verification only. Run from `apps/lavender-ops-mobile/`.

- [x] **Step 1: TypeScript type-check**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors. (Branding edits are JSON/asset-only, but tsc guards against accidental breakage elsewhere.)

- [x] **Step 2: Resolve the full public config**

Run: `npx expo config --type public`
Expected: exit 0. Manually confirm in the output: `name` = "Lavender Ops"; `android.adaptiveIcon.monochromeImage` present; splash `backgroundColor` = `#f6faff` + `image` = `splash-icon.png`; `expo-notifications` plugin present with icon + `#62528d` color; all `icon` / `android.icon` / `ios.icon` / `web.favicon` paths resolve.

- [x] **Step 3: Clean prebuild to confirm native generation succeeds**

Run: `npx expo prebuild --no-install --clean --platform android`
Expected: exit 0; generates `android/` with mipmap icon resources (including `ic_launcher_monochrome` / themed-icon resources) and splash drawables without erroring on a missing/malformed asset.

> Note: `--clean` regenerates the `android/` folder. If the project is managed-workflow (no committed `android/`), this is throwaway scaffolding for verification — delete it afterward (`Remove-Item -Recurse -Force android`) or leave it gitignored. Do **not** commit the generated `android/` directory.

- [x] **Step 4: Commit the config changes**

```bash
git add apps/lavender-ops-mobile/app.json
git commit -m "feat(branding): wire Lavender Ops icon, monochrome, light splash, notification icon"
```

---

## Task 7: DEFERRED — Manual APK icon smoke test (Farrel)

**Files:**
- No edits. Manual, interactive — same precedent as Phase 1's EAS build step.

This step is **not run in-session** (EAS requires interactive `eas login` / `expo login` and ~10-30 min build time). Hand off to Farrel:

- [ ] **Step 1: Build the preview APK**

```bash
cd apps/lavender-ops-mobile
eas build --profile preview --platform android
```
(`preview` profile = `apk` buildType, internal distribution — see `eas.json`.)

- [ ] **Step 2: Sideload and verify branding on a real device**

Install the APK and confirm:
- Launcher icon renders the Lavender logo (not the orange Ignite mark) on a standard launcher.
- Adaptive icon masks correctly (circle / squircle / rounded-square) without clipping the logo.
- **Android 13+:** enable themed icons (long-press → themed icon / wallpaper-tinted) and confirm the monochrome silhouette renders.
- Splash screen shows the logo on light `#f6faff`, transitioning cleanly into Beranda.
- (When notifications are implemented) the status-bar notification icon is a clean white silhouette tinted purple — not a white square.
- iOS (if a build is run): icon corners masked by the OS, no transparency artifacts.

---

## Verification Summary

| Check | Command | Where |
|-------|---------|-------|
| TypeScript | `npx tsc --noEmit` | Task 6 — in-session |
| Config resolves | `npx expo config --type public` | Tasks 2-6 — in-session |
| Native prebuild | `npx expo prebuild --no-install --clean --platform android` | Task 6 — in-session |
| Real-device icon render | `eas build --profile preview --platform android` + sideload | Task 7 — **deferred to Farrel** |
