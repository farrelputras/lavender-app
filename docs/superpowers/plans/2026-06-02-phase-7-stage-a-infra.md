# Phase 7 — Stage A (Infra + APK Ship) Implementation Plan

> **✅ COMPLETE — shipped 2026-06-02.** All four tasks executed.
> Commits: `9bbf269` (UUID), `e6c34bc` (OTA), `9994cc7` (build identity),
> `667f92e` (appVersion fallback). Verification:
> - `pnpm run compile` → 0 errors; `pnpm test` → 63/63 green.
> - `eas env:list --environment preview` confirms `EXPO_PUBLIC_SUPABASE_URL` +
>   `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set on the EAS server (resolves the cloud-build
>   Supabase force-close crash — local `.env` isn't uploaded by EAS).
> - `eas update:list --branch preview` shows the "stage-a OTA smoke test" update published
>   at runtime `1.0.0`, matching the `appVersion` policy → OTA round-trip (DoD step 4) passed.
> - `runtimeVersion` shipped as **`appVersion`**, not the planned `fingerprint` — it fell
>   back due to host-drift (Windows↔EAS-Linux hashed differently). Task 4 Step 1 gate fired.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bake the two invisible-but-blocking infra changes — a crypto-secure UUID and EAS Update (OTA) — plus a dev/preview build-identity split into one native rebuild, then ship mom her first real `preview` APK so every later stage reaches her via OTA.

**Architecture:** Three config/native changes (`uuid` lib + `react-native-get-random-values`; `expo-updates` wired to a single `preview` channel with `fingerprint` runtimeVersion; a dynamic `app.config.ts` that renames/repackages the dev variant). All ride one EAS rebuild. Verification is mostly device-side — only the UUID change carries a unit test (guarded by a jest Web-Crypto polyfill so existing tests stay green).

**Tech Stack:** Expo SDK 55, EAS Build + EAS Update (`expo-updates`), `uuid` v11, `react-native-get-random-values`, jest-expo.

**Design source:** `docs/superpowers/specs/2026-06-02-phase-7-iteration-1-design.md` (Stage A).

**Scope note:** This plan is Stage A only. Stage B (Stitch redesign) and Stage C (features 3 & 7) get their own spec→plan cycles per the design doc.

**Working dir for all commands:** `apps/lavender-ops-mobile` (the Expo app). `git` runs from repo root.

**Git:** Farrel drives git. The `git add`/`git commit` steps show the intended commit boundaries and messages, but confirm with Farrel at execution time whether the executor should run them or just stage the changes and let Farrel commit. Either way, keep the one-commit-per-task boundary.

**Convention guardrails (keep green between every task):**
- `pnpm run compile` → 0 TypeScript errors.
- `pnpm test` → all currently-passing tests stay green (plus the new `uuid` tests added in Task 1).

---

## Task 1: Item 0 — Cryptographically secure UUID

Replaces the `Math.random()` generator in `app/utils/uuid.ts` with the `uuid` library backed by `react-native-get-random-values`. The exported `uuidv4()` signature is unchanged → no caller edits (contract-safe). A jest Web-Crypto polyfill is added first so `paths.test.ts` (which calls `uuidv4()` transitively) and the new `uuid` test pass under `jest-expo`.

**Files:**
- Modify: `apps/lavender-ops-mobile/test/setup.ts` (add Web-Crypto polyfill)
- Modify: `apps/lavender-ops-mobile/package.json` (deps)
- Modify: `apps/lavender-ops-mobile/index.tsx:1` (polyfill import first)
- Modify: `apps/lavender-ops-mobile/app/utils/uuid.ts` (delegate to `uuid`)
- Create: `apps/lavender-ops-mobile/app/utils/uuid.test.ts`

- [ ] **Step 1: Add the jest Web-Crypto polyfill (so the swap can't break existing tests)**

In `test/setup.ts`, insert the block **after** the existing `import mockFile from "./mockFile"` line (keeps the "react-native first" import intact):

```ts
import mockFile from "./mockFile"

// Polyfill Web Crypto so `uuid` works under jest. In the app, `react-native-get-random-values`
// provides global.crypto.getRandomValues; jest-expo's sandbox may not expose it, so fall back
// to node's webcrypto (node >= 20). Guarded — won't clobber an existing global.crypto.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { webcrypto } = require("node:crypto")
if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.getRandomValues === "undefined") {
  // @ts-expect-error assign node's webcrypto to the global that `uuid` reads
  globalThis.crypto = webcrypto
}
```

- [ ] **Step 2: Verify the suite is still green with the polyfill (no behavior change yet)**

Run: `pnpm test`
Expected: PASS — same tests as before (the polyfill is inert while `uuid.ts` still uses `Math.random`).

- [ ] **Step 3: Add deps**

Run (from `apps/lavender-ops-mobile`):
```bash
npx expo install react-native-get-random-values
pnpm add uuid
```
Notes:
- `react-native-get-random-values` is a native module → installed via `expo install` so the version matches SDK 55. It will be picked up by the rebuild in Task 4.
- Do **NOT** install `@types/uuid`. `uuid` v9+ ships its own types; `@types/uuid` is now a deprecated stub that can conflict. (This intentionally deviates from the older note in `docs/feedback-and-improvements.md §0`, which predates uuid bundling types.) Only add it if Step 8's `compile` reports missing types for `"uuid"`.

- [ ] **Step 4: Import the polyfill first in the app entry**

`index.tsx` — add as the **first line**, before `react-native-url-polyfill/auto` (the polyfill must load before `uuid` is ever evaluated):

```ts
import "react-native-get-random-values"
import "react-native-url-polyfill/auto"
import "@expo/metro-runtime" // this is for fast refresh on web w/o expo-router
import { registerRootComponent } from "expo"

import { App } from "@/app"
```

- [ ] **Step 5: Write the failing test**

Create `app/utils/uuid.test.ts`:

```ts
import { uuidv4 } from "./uuid"

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe("uuidv4", () => {
  it("returns an RFC4122 v4 UUID string", () => {
    expect(uuidv4()).toMatch(V4)
  })

  it("returns a different value on each call", () => {
    expect(uuidv4()).not.toBe(uuidv4())
  })
})
```

Run: `pnpm test -- uuid.test.ts`
Expected: PASS already — the current `Math.random()` impl also yields valid v4 format. This test is a **regression guard** that must stay green across the swap (the crypto-security upgrade itself is verified on-device in Task 4, not by format).

- [ ] **Step 6: Swap the implementation to the `uuid` library**

Replace the entire contents of `app/utils/uuid.ts` with:

```ts
import { v4 } from "uuid"

export function uuidv4(): string {
  return v4()
}
```

- [ ] **Step 7: Run the uuid + path tests (prove the swap kept them green)**

Run: `pnpm test -- uuid.test.ts paths.test.ts`
Expected: PASS for both. If `paths.test.ts` fails with "crypto.getRandomValues() not supported", the Step 1 polyfill was not applied correctly — fix `test/setup.ts`.

- [ ] **Step 8: Full guardrails**

Run: `pnpm run compile` → Expected: 0 errors.
Run: `pnpm test` → Expected: all tests green (existing + 2 new uuid tests).

- [ ] **Step 9: Commit**

```bash
git add apps/lavender-ops-mobile/test/setup.ts apps/lavender-ops-mobile/index.tsx apps/lavender-ops-mobile/app/utils/uuid.ts apps/lavender-ops-mobile/app/utils/uuid.test.ts apps/lavender-ops-mobile/package.json apps/lavender-ops-mobile/pnpm-lock.yaml
git commit -m "feat(phase-7a): crypto-secure UUID via uuid lib + get-random-values polyfill"
```

---

## Task 2: Item 1 — EAS Update (OTA) infrastructure

Installs `expo-updates`, runs `eas update:configure` to wire `updates.url` + `runtimeVersion`, switches the policy to `fingerprint`, binds the `preview` profiles to a single `preview` channel, adds a publish script, and documents the flow. No unit tests — config is verified by `eas update:configure` succeeding and the on-device OTA round-trip in Task 4.

**Files:**
- Modify: `apps/lavender-ops-mobile/package.json` (`expo-updates` dep + `ota:publish` script)
- Modify: `apps/lavender-ops-mobile/app.json:9-11` (`updates.url` from configure; `runtimeVersion` → fingerprint)
- Modify: `apps/lavender-ops-mobile/eas.json:25-34` (`channel: "preview"` on preview profiles)
- Modify: `CLAUDE.md` (Commands section — OTA flow)

- [ ] **Step 1: Ensure EAS auth, then install expo-updates**

Run:
```bash
eas whoami    # if not logged in: eas login
npx expo install expo-updates
```
Expected: `eas whoami` prints your account; `expo-updates` added to `package.json` dependencies.

- [ ] **Step 2: Configure EAS Update**

Run: `eas update:configure`
Expected: interactive; it confirms the linked project (`projectId 19ddf167-0fdf-48da-abd4-60b81cc13e70`) and edits `app.json` — adds `updates.url` (`https://u.expo.dev/19ddf167-0fdf-48da-abd4-60b81cc13e70`) and a `runtimeVersion`. It may also note Android/iOS native config; for CNG (managed) this is applied at build time, no manual native edit needed.

- [ ] **Step 3: Force the fingerprint runtimeVersion policy**

In `app.json`, the `updates` + `runtimeVersion` blocks should read (preserve `fallbackToCacheTimeout: 0`):

```json
  "updates": {
    "url": "https://u.expo.dev/19ddf167-0fdf-48da-abd4-60b81cc13e70",
    "fallbackToCacheTimeout": 0
  },
  "runtimeVersion": {
    "policy": "fingerprint"
  },
```
If `eas update:configure` wrote `"runtimeVersion": "1.0.0"` or `{ "policy": "appVersion" }`, replace it with `{ "policy": "fingerprint" }` exactly as above.

- [ ] **Step 4: Bind the preview profiles to the `preview` channel**

In `eas.json`, add `"channel": "preview"` to the `preview` and `preview:device` profiles (dev profiles get no channel — dev builds don't consume OTA):

```json
    "preview": {
      "extends": "production",
      "distribution": "internal",
      "channel": "preview",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "preview:device": {
      "extends": "preview",
      "channel": "preview",
      "ios": { "simulator": false }
    },
```

- [ ] **Step 5: Add the OTA publish script**

In `package.json` `scripts`, add (next to `build:preview`):

```json
    "build:preview": "eas build --profile preview --platform android",
    "ota:publish": "eas update --branch preview"
```
Usage will be `pnpm ota:publish --message "what changed"`.

- [ ] **Step 6: Document the OTA flow in CLAUDE.md**

In `CLAUDE.md`, under the `## Commands` block, add these lines inside the existing ```powershell fence (after `pnpm run build:preview`):

```powershell
pnpm ota:publish --message "..."   # Publish an OTA JS update to mom (preview channel)
eas update:list --branch preview   # See published OTA updates
```
Then add this short note immediately after the Commands code fence:

> **OTA model:** mom runs the `preview` APK (channel `preview`). Ship JS/asset changes with
> `pnpm ota:publish` — applied on her next app launch. A new APK is only needed when native
> deps change (the `fingerprint` runtimeVersion enforces this automatically). `expo-updates`
> is disabled in `dev` builds, so verify OTA behavior on a `preview` build, not via Metro.

- [ ] **Step 7: Guardrails**

Run: `pnpm run compile` → Expected: 0 errors.
Run: `pnpm test` → Expected: all green (unchanged from Task 1).

- [ ] **Step 8: Commit**

```bash
git add apps/lavender-ops-mobile/app.json apps/lavender-ops-mobile/eas.json apps/lavender-ops-mobile/package.json apps/lavender-ops-mobile/pnpm-lock.yaml CLAUDE.md
git commit -m "feat(phase-7a): wire EAS Update (preview channel, fingerprint runtimeVersion)"
```

---

## Task 3: Item A3 — Dev/preview build-variant identity

Makes the dev build install as **"Lavender Ops Dev"** (`com.lavender.ops.dev`) and the preview build as **"Lavender Ops"** (`com.lavender.ops`) so both coexist on one phone. Done by converting the static `app.json` into a dynamic `app.config.ts` that spreads it and overrides identity by `APP_VARIANT`, set per build profile in `eas.json`.

**Files:**
- Create: `apps/lavender-ops-mobile/app.config.ts`
- Modify: `apps/lavender-ops-mobile/eas.json` (`env.APP_VARIANT` on dev profile)
- Keep: `apps/lavender-ops-mobile/app.json` as the static base (Expo passes it in as `config`)

- [ ] **Step 1: Create `app.config.ts`**

Create `apps/lavender-ops-mobile/app.config.ts` (it must run **after** Task 2 so the `updates.url`/`runtimeVersion` now in `app.json` are spread through via `...config`):

```ts
import { ExpoConfig, ConfigContext } from "expo/config"

// `config` is the fully-parsed app.json (static base). We only override the
// fields that differ between the dev variant and the real (preview) build.
const IS_DEV = process.env.APP_VARIANT === "development"

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "Lavender Ops Dev" : "Lavender Ops",
  android: {
    ...config.android,
    package: IS_DEV ? "com.lavender.ops.dev" : "com.lavender.ops",
  },
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV ? "com.lavender.ops.dev" : "com.lavender.ops",
  },
})
```

- [ ] **Step 2: Set `APP_VARIANT` on the dev build profile**

In `eas.json`, add an `env` block to the `development` profile (inherited by `development:device` via `extends`; `preview` deliberately leaves it unset → real name/package):

```json
    "development": {
      "extends": "production",
      "distribution": "internal",
      "env": { "APP_VARIANT": "development" },
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug",
        "simulator": true
      }
    },
```

- [ ] **Step 3: Sanity-check config resolution for both variants**

Run:
```bash
npx expo config --type public --json | npx --yes json5 -- 2>/dev/null || npx expo config --type public
```
Expected (no `APP_VARIANT`): `"name": "Lavender Ops"`, android `"package": "com.lavender.ops"`.

Run with the dev variant:
```bash
APP_VARIANT=development npx expo config --type public
```
(PowerShell equivalent: `$env:APP_VARIANT='development'; npx expo config --type public; Remove-Item Env:APP_VARIANT`)
Expected: `"name": "Lavender Ops Dev"`, android `"package": "com.lavender.ops.dev"`.

Confirm `extra.eas.projectId` and the `updates.url` from Task 2 are still present in **both** outputs (proves `...config` preserved them).

- [ ] **Step 4: Guardrails**

Run: `pnpm run compile` → Expected: 0 errors (the new `app.config.ts` type-checks against `expo/config`).
Run: `pnpm test` → Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/lavender-ops-mobile/app.config.ts apps/lavender-ops-mobile/eas.json
git commit -m "feat(phase-7a): split dev/preview build identity (Lavender Ops Dev vs Lavender Ops)"
```

---

## Task 4: Rebuild, QA, and ship

The only APK trip of Iteration 1. Builds the new dev-client + preview APK (now carrying `react-native-get-random-values`, `expo-updates`, and the variant identity), runs the Stage-A DoD, proves the OTA round-trip, then ships to mom. No unit tests — this task is device verification + release. Mark the backlog items done at the end.

**Files (final doc updates):**
- Modify: `docs/feedback-and-improvements.md` (items 0 & 1 → done)
- Modify: `CLAUDE.md` (phase table — Phase 7 in progress, Stage A done)

- [ ] **Step 1: runtimeVersion policy gate — confirm fingerprint isn't JS-sensitive (hard gate, BEFORE any build)**

The OTA-only premise requires that adding a **JS-only** dependency (exactly what Stage B's redesign will do) does **not** change mom's runtimeVersion — otherwise her Stage A APK silently stops receiving OTAs and needs a reinstall. `fingerprint` is the chosen default, but some `@expo/fingerprint` versions hash JS deps, and Windows↔Linux (EAS) EOL/path differences add drift risk. Test it in mom's exact config context (**no `APP_VARIANT`** → the `preview`/real identity), before building the APK that ships to her:

```bash
# from apps/lavender-ops-mobile, with NO APP_VARIANT set
npx expo-updates fingerprint:generate      # record hash A
pnpm add lodash                            # any pure-JS lib
npx expo-updates fingerprint:generate      # hash B
pnpm remove lodash
```
Decision rule:
- **A === B** → fingerprint ignores JS deps → keep `app.json` `"runtimeVersion": { "policy": "fingerprint" }`.
- **A !== B** → fingerprint is JS-sensitive → **switch to appVersion**: set `app.json` `"runtimeVersion": { "policy": "appVersion" }`, run `pnpm run compile` + `pnpm test` (green), and commit `git commit -m "fix(phase-7a): use appVersion runtimeVersion (fingerprint was JS-sensitive)"`. All JS OTA updates then share runtime `"1.0.0"`; you bump `version` + rebuild the APK only when native deps change — exactly the OTA-only model.

On Windows + a sole-builder workflow, `appVersion` is the lower-surprise outcome — but let the test decide, don't guess. Record the chosen policy; it's baked into every build below and into the OTA round-trip in Step 5.

- [ ] **Step 2: Build the dev-client APK (dev variant)**

Run: `pnpm run build:dev`  (→ `eas build --profile development --platform android`)
Expected: EAS cloud build succeeds; download/install the APK on the test phone.
Verify: launcher shows **"Lavender Ops Dev"**; Android settings → App info shows package **`com.lavender.ops.dev`**.
Note: this replaces/sits beside the old `com.lavender.ops` dev-client — uninstall the old one to avoid confusion.

- [ ] **Step 3: Regression smoke on the dev build (Metro)**

Run: `pnpm run start` and connect the dev build. Exercise every daily flow on the fresh native base (new native deps can break startup):
- Login.
- User: create + edit, capture a photo (Profil/KTP/KTM).
- Rental: create (capture kondisi-keluar photos) → return (kondisi-kembali photos).
- Hutang: view + record a payment.

Verify specifically (Item 0): creating a rental produces a valid v4 `id` with **no crash** — confirm the new row's UUID in Supabase (Table Editor or `mcp__plugin_supabase_supabase`). Expected: well-formed `xxxxxxxx-xxxx-4xxx-...` id.

- [ ] **Step 4: Build the preview APK (real variant)**

Run: `pnpm run build:preview`  (→ `eas build --profile preview --platform android`)
Expected: EAS build succeeds. Install on a real device.
Verify: launcher shows **"Lavender Ops"**; package **`com.lavender.ops`**; it installs **alongside** "Lavender Ops Dev" without replacing it.

- [ ] **Step 5: Prove the OTA round-trip (the real acceptance test)**

With the `preview` APK installed (from Step 4):
1. Make a trivial visible JS change (e.g. a label tweak) and commit it on a throwaway basis, OR just publish current bundle.
2. Run: `pnpm ota:publish --message "stage-a OTA smoke test"`
   Expected: `eas update` prints a published update on branch `preview` with a runtimeVersion (fingerprint hash).
3. Fully close and reopen the `preview` app twice (launch 1 downloads in background, launch 2 applies — `fallbackToCacheTimeout: 0`).
   Expected: the change is visible. Confirm in `eas update:list --branch preview`.
4. **Runtime match check:** confirm the runtimeVersion shown by `eas update` matches the installed `preview` build's runtime version (so the update is actually served). With `fingerprint`, a mismatch means the hash computed differently between the EAS (Linux) build and your (Windows) publish host — fall back to `appVersion` per Step 1 and rebuild. With `appVersion`, both should read `1.0.0`.

- [ ] **Step 6: Stage-A DoD checklist (all must hold)**

- [ ] `pnpm run compile` 0 errors; `pnpm test` green.
- [ ] runtimeVersion policy decided via the JS-sensitivity gate so a JS-only dep can't strand mom's APK (Step 1).
- [ ] Rental creation yields a valid v4 UUID, no crash (Step 3).
- [ ] Daily-flow regression smoke passes on the fresh native build (Step 3).
- [ ] OTA update published and applied on next launch of the `preview` build (Step 5).
- [ ] Dev build = "Lavender Ops Dev" / `com.lavender.ops.dev`; preview = "Lavender Ops" / `com.lavender.ops`; both installed at once (Steps 2, 4).

- [ ] **Step 7: Ship to mom (non-negotiable gate)**

Send the `preview` APK (from Step 4) to mom via WhatsApp; confirm she installs it on her own phone. This is her first real build and the moment OTA delivery turns on for the rest of Iteration 1.

- [ ] **Step 8: Mark the backlog items done**

In `docs/feedback-and-improvements.md`, change the `**Status:**` line under **§0** and **§1** from `open` to:
```
- **Status:** done (Phase 7 Stage A — shipped in v1.0.0 preview APK 2026-06-02)
```
For §1, also replace `- **Detail:** TBD` with a one-line summary:
```
- **Detail:** EAS Update wired — single `preview` channel, `fingerprint` runtimeVersion,
  silent check-on-launch. Publish via `pnpm ota:publish`. See
  `docs/superpowers/specs/2026-06-02-phase-7-iteration-1-design.md`.
```

In `CLAUDE.md`, update the phase table row for Phase 7 to reflect Stage A done (e.g. `7 | Feedback polish + QA + APK ship | In progress — Stage A (infra + OTA + APK) ✅`).

- [ ] **Step 9: Commit**

```bash
git add docs/feedback-and-improvements.md CLAUDE.md
git commit -m "docs(phase-7a): mark UUID + OTA done, Stage A shipped"
```

---

## Notes / gotchas for the executor

- **`pnpm test -- <file>`**: pnpm forwards args after `--` to jest; `pnpm test -- uuid.test.ts` runs only that file. If your pnpm version doesn't forward cleanly, use `pnpm exec jest uuid.test.ts`.
- **Fingerprint is on probation (pnpm monorepo + CNG + Windows):** two failure modes, both with the same fallback (`appVersion`). (1) JS-sensitivity — a JS-only dep bumps the hash and strands mom's APK → caught by **Task 4 Step 1** (hard gate before build). (2) Host drift — the EAS Linux build and your Windows publish host compute different hashes so updates aren't served → caught by **Task 4 Step 5.4** (runtime match). If either fails, switch `app.json` to `"runtimeVersion": { "policy": "appVersion" }` and rebuild. Given the platform mismatch, don't be surprised if `appVersion` wins; the gates decide empirically.
- **Local `expo run:android` dev builds** won't pick up `APP_VARIANT` unless you prefix it (`$env:APP_VARIANT='development'` on PowerShell). The supported path here is `pnpm run build:dev` (EAS sets the profile env), so prefer that for the dev variant.
- **Do not run `eas update:configure` again after `app.config.ts` exists** — it writes to `app.json`; that's fine, but re-running can reset `runtimeVersion`. If you must, re-apply Step 2.3 (fingerprint) afterward.
- **`@types/uuid`**: only if `compile` complains (it shouldn't with uuid v11).

## Self-review (done)

- **Spec coverage:** Item 0 → Task 1; Item 1 (expo-updates, `eas update:configure`, fingerprint, `preview` channel, silent check-on-launch, publish script, CLAUDE.md) → Task 2; Item A3 (app.config.ts, name/package split, eas.json env, shared scheme, migration note) → Task 3; rebuild + DoD (compile/test, uuid on-device, regression smoke, OTA round-trip, build-identity, mom-install gate, fingerprint stability) → Task 4; backlog/doc updates → Task 4 Steps 7–8. No gaps.
- **Placeholder scan:** no TBD/TODO; every code/config step shows full content; the only "fill-in" is the OTA commit message (`--message "..."`), which is intentional user text.
- **Type consistency:** `uuidv4()` signature unchanged across Task 1; `APP_VARIANT`/`com.lavender.ops.dev`/channel `preview` named identically in Tasks 2–4 and the spec.
