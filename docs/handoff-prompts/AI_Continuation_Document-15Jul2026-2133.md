# PROJECT CONTINUATION DOCUMENT
## Session 3 — Wednesday, 15 July 2026, 21:33

> **Read `docs/releases/v1-0-2.md` (the spec) and `docs/superpowers/plans/2026-07-12-v1-0-2-polish-and-honesty.md`
> (the implementation plan) before writing any code.** This document is the briefing *around* them.
> The single most dangerous mistake available in this release is bumping `app.json`'s `version` —
> see §5 and §7. It is counter-intuitive enough that a fresh AI will be tempted to "fix" it. Do not.

---

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`lavender-app` monorepo; app at `apps/lavender-ops-mobile`).
- **What This Project Is:** An internal Android app for a small vehicle-rental business in Indonesia.
  It tracks rentals, customers, payments, and debt (*hutang*). **Two users total:** mom (the operator,
  `ops` role, uses it daily, non-technical, reads only Indonesian) and Farrel (owner/developer,
  `admin` role).
- **Primary Objective (this session's successor):** Finish and **ship v1.0.2** as an OTA update to
  mom's phone. All implementation is done and verified; what remains is the release close-out
  (docs + the actual `pnpm ota:publish`) — see §2 and §4.
- **Strategic Intent:** A real tool for a real business, not a portfolio project. Every change is
  judged by whether it makes *mom's* day easier. Not on the Play Store — the APK is sideloaded,
  updates reach her over-the-air on the `preview` channel.
- **Hard Constraints:**
  1. **Do NOT bump `version` in `app.json`.** It must stay `"1.0.0"`. See §5 — bumping it silently
     severs OTA delivery to mom's phone.
  2. **v1.0.2 is pure OTA.** No migration, no native dependency, no APK, no `version` bump.
  3. **Connector-contract rules** (`docs/02-demo-development.md` §3): UI never touches raw data;
     connector signatures are locked; all connectors are `async`; UI types are camelCase.
  4. **The rental math must be correct** (`docs/02` §6). v1.0.2 does not touch it, and verification
     this session confirmed it wasn't touched.

---

### 2. WHAT EXISTS RIGHT NOW

**Built, working, shipped:**
- v1.0.0 (APK, sideloaded on mom's phone) and v1.0.1 (shipped OTA 2026-07-12).
- Full rental lifecycle: create rental → record payments → return vehicle (fuel adjustment) →
  auto-create Hutang if a balance remains. Customer CRUD. Hutang CRUD. Photo upload (KTP/KTM/vehicle).
  Auth with `ops`/`admin` roles. Admin-only hard-delete across four entities.
- 17 migrations applied and tracked (`0001`–`0017`).

**v1.0.2 — IMPLEMENTED AND VERIFIED THIS SESSION, NOT YET SHIPPED:**
All six code tasks are committed on branch **`v1.0.2-polish-and-honesty`** (7 commits on top of
`master`'s `729b238`). The verification the USER DIRECTIVE asks for **was performed this session**
with evidence (see §4). What is **NOT done**: the release close-out — Task 7.

| Task | Item | Commit | Status |
|---|---|---|---|
| 1 | `showToast` → `app/utils/showToast.ts` (6 local copies → 1 util; Beranda's was dead) | `750bafb` | ✅ verified |
| 2 | Hutang card chevron no longer overlaps the status pill (absolute → inline flex) | `6fc5a54` | ✅ verified |
| 3 | Shared `SearchField` adopted in `UserScreen` + `PilihUserScreen` (2 new optional props) | `2832956` + `57da7d8` | ✅ verified |
| 4 | "Daftarkan User Baru" wired to `UserFormScreen`, returns into rental flow | `c067857` | ✅ verified |
| 5 | Two dead `RentalDetailScreen` "Edit" buttons deleted (feature is v1.0.3) | `8a61622` | ✅ verified |
| 6 | Version footer on Beranda (`RELEASE` constant + `expo-updates` id) + dead bell removed | `7430fb9` | ✅ verified |
| **7** | **Acceptance boxes, docs close-out, `pnpm ota:publish`** | — | ⏳ **NOT DONE** |

**Partially built / dead code (out of scope, unchanged):**
- `KendaraanScreen` — a 25-line stub, commented out of `MainNavigator`, still typed in
  `navigationTypes.ts`. Because it doesn't exist, `hardDeleteVehicle` shipped with no UI.
  `docs/known-technical-debt.md` #3.
- The Phase-0 shared form library is under-used: `DetailSewaScreen`/`PengembalianScreen` still hold
  local, **divergent** copies of `FieldCard`/`FuelGauge`/`SectionLabel`/`Stepper`. Debt #4. **Do not
  touch** (§7).

**Broken or blocked:**
- Nothing broken in production.
- **v1.0.2 item 1 (text sizes) is blocked** on mom's input and ships nothing this release. There is
  correctly no task for it.

**Not started:**
- v1.0.3 (editing an active rental — needs a migration + RPC + `updateRental` connector).
  `docs/releases/v1-0-3.md`.

---

### 3. ARCHITECTURE & TECHNICAL MAP

**Tech stack:** Expo SDK 55 (dev-client) · React Native 0.83 · **Ignite** (React Navigation v7 —
*not* Expo Router) · TypeScript strict · Supabase (`@supabase/supabase-js` v2) · EAS Build (APK) +
Expo Updates (OTA). Jest + `@testing-library/react-native`.

**Key paths:**

| Path | What |
|---|---|
| `apps/lavender-ops-mobile/` | The app. **All `pnpm` commands run from here.** |
| `app/screens/` | All 15 screens |
| `app/components/form/` | Shared form primitives (incl. `SearchField`, extended this session) |
| `app/components/VersionFooter.tsx` | **New this session** — the Beranda version footer |
| `app/config/release.ts` | **New this session** — `RELEASE = "1.0.2"` (the displayed version) |
| `app/utils/showToast.ts` | **New this session** — the single toast helper |
| `app/services/rentals/index.ts` | The connector layer. Every read/write goes through here. Untouched. |
| `app.json` | `version: "1.0.0"` + `runtimeVersion.policy: "appVersion"`. **DO NOT EDIT.** |
| `docs/releases/v1-0-2.md` | **The spec.** Acceptance checklist at the bottom (lines 297–309). |
| `docs/superpowers/plans/2026-07-12-v1-0-2-polish-and-honesty.md` | The implementation plan (7 tasks). |
| `docs/known-technical-debt.md` | Standing debt register. |
| `.superpowers/sdd/progress.md` | Durable execution ledger — records which tasks are complete. |

**End-to-end flow (the core one):** `BerandaScreen` → "Sewa Baru" → `PilihUserScreen` (choose
customer) → `PilihKendaraanScreen` (choose vehicle) → `DetailSewaScreen` (duration, tarif, photos,
fuel) → `createRental()`. Rental is `ACTIVE`; `RentalDetailScreen` shows it; payments can be added.
`PengembalianScreen` handles return, computes the fuel adjustment against the *exit* fuel level,
totals the bill, calls `closeRental()`. If `Sisa > 0` at return, a **Hutang is auto-created**.

**Conventions:** Connectors are all `async` and their signatures are a locked contract. UI types are
camelCase; the connector translates Postgres `snake_case` at the boundary. Migrations are `0001`-style.
User-facing copy is **Indonesian**.

**External dependencies:** Supabase project `tuufzjxoprjsrrkagncz`. Expo/EAS project
`19ddf167-0fdf-48da-abd4-60b81cc13e70`, OTA channel **`preview`**, update URL
`https://u.expo.dev/19ddf167-...`.

---

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

**This session did two things: (a) executed the v1.0.2 plan via Sonnet subagents with Opus
verifying each task, and (b) on resume, ran a full independent verification sweep (the USER
DIRECTIVE) after a mid-session tool outage had blocked it.**

#### Execution model used
Subagent-driven development: a fresh **Sonnet** implementer per task doing the mechanical
transcription from the plan; **Opus** (this session) acting as the brain — planning, reviewing every
diff, and verifying. Tasks 1–2 were done inline by Opus before the switch. This split was an explicit
user instruction ("you are opus and its best for you to be the brain doing verifying and thinking";
"hand it off to a sonnet agent").

#### Verification performed this session (all GREEN — evidence)
- **`app.json` / `app.config.ts` / `eas.json` vs `master`: empty diff.** `version` still `"1.0.0"`.
  The trap held. ✅
- **`supabase/` vs `master`: empty diff.** No new migration. ✅
- **`DetailSewaScreen` + `PengembalianScreen` diffs:** *only* the `showToast` swap (removed local fn,
  removed `Alert`/`ToastAndroid` imports, added `import { showToast }`). **Zero** tariff/fuel/hutang
  lines changed. ✅
- **`npx tsc --noEmit`: clean.** ✅
- **`npx jest`: 22 suites / 89 tests, all passing.** ✅
- **Mutation-tested `VersionFooter`** with 4 mutants (force-bawaan, force-OTA-line, `slice(0,7)`→
  `slice(0,6)`, `RELEASE`→`"9.9.9"`). **Every mutant killed at least one test.** Files restored
  identical to commit. ✅
- **Full acceptance checklist** (dead-end strings, chevron style, bell, `searchInputContainer`,
  SearchField imports, single `showToast`, `RELEASE=1.0.2`): all pass. ✅
- **New-file lint:** `showToast.ts`, `VersionFooter.tsx`, `release.ts` = 0 real errors.
  `SearchField.tsx` shows 1 real error (`no-restricted-imports` on `TextInput`) — **proven
  pre-existing** (the import line is unchanged from `master`, appears as a context line in the diff). ✅

#### Two bugs Opus caught during review (both instructive — do not reintroduce)
1. **A vacuous test I wrote in the plan.** The `SearchField` `onFocus` test fired a `"focus"` event
   and asserted the mock ran. RNTL's `fireEvent` **walks up the tree** for a handler and finds
   `onFocus` on the `SearchField` element itself — so the test passed *even with the prop dropped on
   the floor*. Proven by mutation (deleting `onFocus={onFocus}` left all 3 tests green). Fixed to
   assert the prop reaches the `TextInput` (`UNSAFE_getByType(TextInput).props.onFocus`). Commit
   `57da7d8`. **This is the same failure family CLAUDE.md warns about with the Supabase `new Error`
   mock: a green test proving a belief, not behaviour.**
2. **A real bug in the plan's own `VersionFooter` code.** The plan used
   `import * as Updates from "expo-updates"`. Babel's namespace-import interop
   (`_interopRequireWildcard`) **snapshots** a CommonJS module's plain data properties by value once
   and caches them — so under the test's mutated mock, the component would read stale `null` forever
   and **permanently render `pembaruan bawaan`**. Sonnet root-caused this (inspected the Babel helper)
   and switched to named imports (`import { createdAt, updateId } from "expo-updates"`), a live
   property read at each usage site, behaviour-identical in production. Correct call. It is the one
   feature whose entire job is telling the truth about what's running, so a silently-dead branch there
   would have been nasty.

#### Decisions made, and WHY (do not undo)
1. **The lint gate was redefined, by explicit user decision.** `pnpm run lint` is **RED on `master`**
   and always has been: ~25,000 **phantom** errors (`core.autocrlf=true` gives CRLF checkout, prettier
   defaults to `endOfLine: "lf"`, no `.gitattributes`/`endOfLine` config → `Delete ␍` on every line of
   every file), **plus ~157 real pre-existing errors** (inline styles, restricted `Text`/`TextInput`
   imports, color literals, sort-styles). The gate for v1.0.2 is therefore **"real (non-`prettier`)
   lint errors must not increase vs `master`"** — not "lint green." Master had 164; the branch has
   157 (extracting `showToast` removed 5 `split-platform-components` errors). **Zero new real errors
   introduced.** The CRLF config bug and the 157 real errors are to be logged to
   `docs/known-technical-debt.md` (Task 7, not yet done).
2. **Post-save landing for "Daftarkan User Baru" = auto-advance to `PilihKendaraan`** with the new
   customer selected (spec §3a's stated preference), confirmed by the user via AskUserQuestion.
   `PilihUserScreen` also switched to `useFocusEffect` so the list isn't stale on return.
3. **Version display comes from a JS constant (`app/config/release.ts`), not `app.json`.** See §5/§6.

#### What was NOT done (this is the remaining work — Task 7)
- `docs/releases/v1-0-2.md` acceptance boxes are **still all unchecked** (lines 299–309); status line
  still reads "open — not yet implemented" (line 3).
- `CLAUDE.md` "Current Status" still says v1.0.2 "designed, not built."
- `docs/known-technical-debt.md` does **not** yet contain the CRLF-config entry or the 157-real-errors
  entry.
- **The OTA has NOT been published.** `pnpm ota:publish` has not run.

#### Open threads
- None blocking. The verification is complete and green; Task 7 is a mechanical close-out plus one
  outward-facing action (the publish) that should be user-confirmed.

---

### 5. WHAT COULD GO WRONG

#### 🚨 The `app.json` version trap — the #1 way to break this release
`app.json` reads `"version": "1.0.0"` and `runtimeVersion.policy` is **`appVersion`**. OTA updates
publish *against the runtime version*. Mom's installed APK is runtime `1.0.0`. If you bump `version`
to `"1.0.2"`, updates target runtime `1.0.2`, and **she silently stops receiving every future update**
— no error, no signal. **Leave it at `1.0.0`.** The displayed version lives in `app/config/release.ts`.
Verified untouched this session. `Application.nativeApplicationVersion` is the *wrong* source for the
same reason (it reports `1.0.0` forever).

#### 🚨 After publishing, confirm the update targets runtime 1.0.0
`pnpm ota:publish` runs `eas update --branch preview`. Immediately after, run
`npx eas update:list --branch preview` and confirm the newest entry is on **runtime `1.0.0`**. If it
says `1.0.2`, `app.json` was bumped despite everything — mom will not receive it. Stop, revert, republish.

#### ⚠️ `RELEASE` is hand-maintained; nothing enforces it
`app/config/release.ts` already reads `"1.0.2"` (correct for this release). If a future OTA ships
without bumping it, mom's footer will lie about what she's running and the OTA-failure diagnostic
(a failed update leaves the *old* number on screen) is lost.

#### ⚠️ Supabase errors are NOT `Error` instances
The client isn't configured with `.throwOnError()`, so `supabase.rpc()`/`.from()` return `error` as a
**plain object** `{message, details, hint, code}`. ~24 connectors still `throw error` (debt #1). **Never
mock a Supabase failure as `new Error(...)` in a test** — mock the plain-object shape. (No v1.0.2 task
touches this.)

#### ⚠️ The shared-form-library duplication is a trap for the eager
`DetailSewaScreen`/`PengembalianScreen` hold divergent local copies of the shared form components
(`DetailSewa`'s local `FuelGauge` takes `max = 8`; `Pengembalian`'s takes none). Extracting them looks
trivial and is not — it is copy-paste *inside the tariff and fuel math*, with no characterisation tests.
Debt #4, its own future release. **Do not.**

#### ⚠️ Lint is red and mostly noise
`pnpm run lint` prints ~25,000 errors, ~25,000 of which are phantom CRLF. Do **not** try to make it
green, do **not** run `eslint --fix` repo-wide (it would rewrite every file's line endings and touch
the protected screens), do **not** "fix" unrelated errors. Gate = no new *real* errors vs master.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1. Core pattern: the connector layer is a firewall.** Every read/write goes through
`app/services/rentals/index.ts`. The UI never sees a Postgres row, never `snake_case`, never a raw
array. All connectors are `async` — even trivial ones — specifically so the in-memory implementation
could be swapped for Supabase without touching a screen. That swap already happened. Keep the discipline.

**2. Most common newcomer mistake:** treating this like a generic RN app and "fixing" load-bearing
things. The three biggest traps, in order: bumping `app.json` version (breaks OTA silently);
refactoring `DetailSewaScreen`/`PengembalianScreen` onto the shared components (changes the money math);
mocking Supabase errors as `Error` instances (a green test that proves nothing). A fourth, learned this
session: **trusting a green test without mutation-checking it** — two vacuous/broken tests slipped
through this release's own plan and were caught only by breaking the code and watching the test stay
green.

**3. What looks refactorable but must NOT be touched:** the duplicated form components in the two big
rental screens. They *are* copy-paste — but copy-paste inside the tariff and fuel-adjustment math,
already drifted, unprotected by tests. Fixing it casually inside a polish release is how mom starts
getting wrong numbers.

---

### 7. DO NOT TOUCH LIST

- ❌ **Do NOT bump `version` in `app.json`.** It stays `"1.0.0"`.
- ❌ **Do NOT add a migration** in v1.0.2. If something seems to need one, it belongs in v1.0.3.
- ❌ **Do NOT refactor `DetailSewaScreen` or `PengembalianScreen`** beyond the `showToast` extraction
  already done. Do not touch their tariff, fuel-adjustment, or hutang logic.
- ❌ **Do NOT enable `.throwOnError()`** or sweep the ~24 raw-error connectors. Out of scope.
- ❌ **Do NOT try to make `pnpm run lint` green**, and do NOT run `eslint --fix` across the repo.
- ❌ Do NOT mock a Supabase failure as `new Error(...)` in a test.
- ❌ Do NOT change a connector's name, parameters, or return type.
- ❌ Do NOT introduce a new library or framework without asking.
- ✅ **DO** preserve Indonesian user-facing copy.
- ✅ **DO** run `pnpm run compile` and `pnpm test` (both green) before claiming done; treat lint per
  the redefined gate (no new real errors vs master).
- ✅ **DO** confirm the published OTA targets runtime `1.0.0` (`eas update:list --branch preview`).

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence | Note |
|---|---|---|
| §1 Identity, constraints | ✅ HIGH | From spec + `CLAUDE.md`; `app.json` re-read this session. |
| §2 Tasks 1–6 built & verified | ✅ HIGH | All 6 commits present; full verification sweep run this session with evidence (§4). |
| §2 Task 7 not done | ✅ HIGH | Acceptance boxes unchecked, status line unchanged, no OTA published — all confirmed this session. |
| §3 Architecture / paths | ✅ HIGH | Paths verified this session; end-to-end flow carried from `CLAUDE.md`, not re-traced in code. |
| §4 Recent work | ✅ HIGH | This session. Commits `750bafb`→`7430fb9`. |
| §5 `app.json` trap | ✅ HIGH | `version: "1.0.0"` + `policy: appVersion` re-read; diff vs master empty. |
| §5 Supabase error shape | ✅ HIGH | Documented in `CLAUDE.md`; unchanged this release. |
| §5 Lint state | ✅ HIGH | Counted this session: master 164 real / branch 157 real; ~25k phantom CRLF. |
| §5 OTA-publish behaviour | ⚠️ MEDIUM | `eas update:list` runtime-check is the documented model; not re-run post-publish because nothing has been published yet. |
| §6–§7 | ✅ HIGH | Decisions confirmed with the user this session. |

---

**Absolute path of this document:**

`C:\Users\ferna\dev\personal_projects\lavender-app\AI_Continuation_Document-15Jul2026-2133.md`
