# PROJECT CONTINUATION DOCUMENT
## Session — 12 July 2026, 17:20

> **Read `docs/releases/v1-0-2.md` before writing any code.** It is the spec. This document is the
> briefing *around* it — the reasoning, the traps, and the things that are true but not written down
> anywhere else. It does not replace the spec.

---

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`lavender-app` monorepo, app at `apps/lavender-ops-mobile`)
- **What This Project Is:** An internal Android app for a small vehicle-rental business in Indonesia.
  It tracks rentals, customers, payments, and debt (*hutang*). Two users, total: **mom** (the
  operator, `ops` role, uses it daily) and **Farrel** (owner/developer, `admin` role).
- **Primary Objective for this session's successor:** Implement and ship **v1.0.2** as an OTA update
  to mom's phone, per `docs/releases/v1-0-2.md`.
- **Strategic Intent:** This is a real tool for a real business, not a portfolio project. Mom is a
  non-technical daily user. Every change is judged by whether it makes *her* day easier. The app is
  not on the Play Store — the APK is sideloaded, and updates reach her over-the-air.
- **Hard Constraints:**
  1. **Do not bump `version` in `app.json`.** It must stay `"1.0.0"`. See §5 — this is the single
     most dangerous mistake available in v1.0.2.
  2. **v1.0.2 is pure OTA.** No migration, no native dependency, no APK, no `version` bump. If a task
     seems to need one, it is out of scope — it belongs in v1.0.3.
  3. **Connector-contract rules** (`docs/02-demo-development.md` §3) are the project's most important
     architectural rules. UI never touches raw data; connector signatures are locked; all connectors
     are `async`; UI types are camelCase.
  4. **The rental math must be correct** (`docs/02` §6). v1.0.2 must not touch it.

---

### 2. WHAT EXISTS RIGHT NOW

**Built and working:**
- v1.0.0 (APK, sideloaded on mom's phone) and v1.0.1 (shipped OTA on 2026-07-12, earlier today).
- Full rental lifecycle: create rental → record payments → return vehicle (with fuel adjustment) →
  auto-create Hutang if a balance remains. Customer CRUD. Hutang CRUD. Photo upload (KTP/KTM/vehicle
  condition). Auth with `ops` / `admin` roles. Admin-only hard-delete across four entities.
- 19 Jest suites / 80 tests, green as of the v1.0.1 ship.
- 17 migrations applied and tracked (`0001`–`0017`).

**Partially built:**
- `KendaraanScreen` — a 25-line stub, commented out of `MainNavigator`, still typed in
  `navigationTypes.ts`, still on the pre-Stitch token system. Because it doesn't exist,
  `hardDeleteVehicle` shipped in v1.0.1 as an RPC + connector **with no UI**. See
  `docs/known-technical-debt.md` #3.
- The Phase-0 shared form library (`app/components/form/`) — built and tested, but **the two biggest
  screens don't use it.** See §5. This is the most important thing in this document that isn't a
  v1.0.2 task.

**Broken or blocked:**
- Nothing is broken in production.
- **v1.0.2 item 1 (text sizes) is blocked** on mom's input and ships nothing this release.

**Not started:**
- **All of v1.0.2.** Zero lines of code have been written. Only the spec exists.
- v1.0.3 (editing an active rental) — scoped, not designed. `docs/releases/v1-0-3.md`.

---

### 3. ARCHITECTURE & TECHNICAL MAP

**Stack:** Expo SDK 55 (dev-client) · React Native 0.83 · **Ignite** (React Navigation — *not* Expo
Router) · TypeScript strict · Supabase (`@supabase/supabase-js` v2) · EAS Build (APK) + Expo Updates
(OTA).

**Key paths:**

| Path | What |
|---|---|
| `app/screens/` | All 15 screens |
| `app/components/form/` | Shared form primitives — **see §5, they are under-used** |
| `app/services/rentals/index.ts` | The connector layer. Every read/write goes through here. |
| `app/theme/tokens.ts` | Design tokens. Note the hard-coded `lineHeight` on every tier. |
| `app/navigators/` | `MainNavigator` (bottom tabs) + stack navigators |
| `supabase/migrations/` | `0001`–`0017`, all applied |
| `docs/releases/v1-0-2.md` | **The spec for the work you are about to do** |
| `docs/known-technical-debt.md` | Standing debt register |
| `docs/02-demo-development.md` | Connector-contract rules (§3), rental math (§6) |

**End-to-end flow (the core one):**
1. `BerandaScreen` → "Sewa Baru" → `PilihUserScreen` (choose customer) →
   `PilihKendaraanScreen` (choose vehicle) → `DetailSewaScreen` (duration, tarif, tujuan, exit
   condition photos + fuel) → `createRental()`.
2. Rental is now `ACTIVE`. `RentalDetailScreen` shows it; payments can be added.
3. `PengembalianScreen` handles return: records fuel/photos back, computes the fuel adjustment
   against the *exit* fuel level, totals the bill, and calls `closeRental()`.
4. If `Sisa > 0` at return, a **Hutang is auto-created**. It then lives in the Hutang tab.

**Conventions:**
- Connector functions are **all `async`**, even trivially. Their signatures are a locked contract.
- UI types are camelCase; the connector translates Postgres `snake_case` rows at the boundary.
- Screen styles use the Ignite theme; import via `useAppTheme()`, type with `ThemedStyle<ViewStyle>`.
- Migrations are `0001`-style, **not** the 14-digit Supabase default.

**External dependencies:** Supabase project `tuufzjxoprjsrrkagncz` (Postgres + Auth + Storage) and
Expo/EAS (project `19ddf167-…`, OTA channel `preview`).

---

### 4. RECENT WORK — WHAT JUST HAPPENED

**This session was a design/docs session. No code was written, by explicit instruction.**

#### What was worked on

`docs/feedback-and-improvements.md` had grown into four different kinds of thing at once: shipped
history, a living debt register, an open release, and an undesigned far-future idea. It was split so
each file has one job:

```
docs/feedback-and-improvements.md   → CLOSED history: v1.0 Phase 7 + v1.0.1 only
docs/known-technical-debt.md        → NEW. Living register, 5 items, triaged per release.
docs/releases/v1-0-2.md             → NEW. The open release. THE SPEC.
docs/releases/v1-0-3.md             → NEW. Scoping note: editing an active rental.
docs/releases/v1-1.md               → NEW. The "replace Supabase" question.
CLAUDE.md                           → updated: status, doc map, app.json warning
```

Committed as **`729b238`** on `master`.

#### Decisions made, and WHY (do not undo these)

1. **v1.0.2's theme is "polish + honesty," and it is pure OTA.** Every candidate that would have
   added a migration was pushed out. Rationale: it keeps the release cheap to verify and cheap to
   roll back, and it keeps the rental math untouched.

2. **The version display comes from a JS constant, not `app.json`.** The obvious implementation
   (`Application.nativeApplicationVersion`) is *wrong here* — see §5. A JS constant also gives a free
   diagnostic: if an OTA silently fails to apply, mom's screen still shows the old number, so Farrel
   knows immediately.

3. **Version goes in the `BerandaScreen` scroll footer, not the splash screen.** The version is
   needed *when something is already wrong* and Farrel is on the phone asking "what version are you
   on?" Mom must be able to **find it on demand from a verbal instruction**. The splash flashes past
   in under a second and cannot be summoned back. "Scroll to the bottom of the home screen" works.

4. **The original item 3 ("no 'belum tersedia' anywhere") turned out to be three items.** Only the
   cheap one ships. `PilihUserScreen`'s "Daftarkan User Baru" is a nav wire-up. But the two
   `RentalDetailScreen` Edit buttons need a **whole feature** — there is **no `updateRental`
   connector at all**; a rental is write-once after creation. Those two buttons are **deleted** in
   v1.0.2 and rebuilt properly in v1.0.3. Farrel chose deletion over leaving the honest-but-dead
   "Akan segera tersedia" toast.

5. **Text sizes (item 1) carries over again, doing nothing.** But a finding was recorded that may
   dissolve the item entirely — see §5.

6. **Debt #1 (the ~24 connectors throwing raw postgrest objects) was explicitly kept OUT of v1.0.2.**
   The clean fix is `.throwOnError()` on the client, which changes error behaviour in every connector
   at once. That is a wider blast radius than anything else in the release. It wants its own review.

#### Discussed but NOT implemented

Everything. **v1.0.2 has zero code written.** The spec is complete; the work is not started.

#### Open threads

- **v1.0.2 item 3a:** where does the user land after creating a customer from inside the rental
  flow? Returning to `PilihUser` with the new user already selected is the flow that respects why she
  was there — but confirm the `SewaBaru` stack can express that before assuming it.
- **v1.0.2 item 2.3:** `PilihUserScreen` has an `isSearchMode` state that the shared `SearchField`
  may not account for. Check before ripping out the local search box.
- **v1.0.2 item 1** remains blocked on mom.

---

### 5. WHAT COULD GO WRONG

#### 🚨 The `app.json` version trap — the #1 way to break this release

`app.json` reads `"version": "1.0.0"`, and `runtimeVersion.policy` is **`appVersion`**.

If you bump `version` to `"1.0.2"`, OTA updates will be published against runtime `1.0.2`, while
**mom's installed APK is runtime `1.0.0`.** She would **silently stop receiving every future
update.** Nothing would error. You would not find out until she reported that a fix never arrived.

**Leave it at `1.0.0`.** The displayed version comes from `app/config/release.ts` instead. This is
counter-intuitive enough that a fresh AI will very plausibly "fix" it. Do not.

#### 🚨 Supabase errors are NOT `Error` instances

The client is not configured with `.throwOnError()`, so `supabase.rpc()` / `.from()` return `error`
as a **plain object** (`{message, details, hint, code}`). A connector doing `if (error) throw error`
throws *that*, and any caller doing `e instanceof Error ? e.message : "…"` gets **`false` every
time**, silently discarding the real Postgres message.

Only the four `hardDelete*` connectors were fixed (v1.0.1). ~24 other sites still have the bug
(`docs/known-technical-debt.md` #1).

> **Never mock a Supabase failure as `new Error(...)` in tests.** Supabase never produces that shape,
> so the test proves your belief about the library rather than its behaviour. **This exact mock hid a
> real bug through two green reviews.** Mock the plain-object shape.

#### ⚠️ The Phase-0 shared form library is barely used — and it's a trap for the eager

`app/components/form/` contains `FieldCard`, `FuelGauge`, `SectionLabel`, `Stepper`, `RupiahInput` —
all with passing tests. But **`DetailSewaScreen` and `PengembalianScreen` (48KB and 50KB, the two
biggest files in the app) import only `PhotoRow`** and redefine everything else locally:

| Helper | Local copies | Shared version exists? |
|---|---|---|
| `showToast` | **6** | no — v1.0.2 item 5 extracts it |
| `SectionLabel` | 3 | ✅ |
| `FuelGauge` | 3 (one renamed `BensinGauge`) | ✅ |
| `FieldCard` | 2 | ✅ |
| `Stepper` | 2 | ✅ |
| `parseRupiahInput` | 2 | ✅ (`RupiahInput`) |

This is the **root cause** of the recurring "minor UI inconsistency" feedback, and of v1.0.2 items
2.1 and 2.3. It is *very* tempting to fix while you are in there.

**Do not.** `DetailSewaScreen` is **tariff composition**; `PengembalianScreen` is **fuel adjustment
and auto-debt creation**. That is the highest-risk code in the app. The copies have **already
diverged** — `DetailSewa`'s local `FuelGauge` takes `max = 8`; `Pengembalian`'s takes no `max` at
all — so a naive swap changes behaviour. It needs characterisation tests first and its own release.
Logged as `docs/known-technical-debt.md` #4.

v1.0.2 takes only the one piece with no math surface: extracting `showToast` (item 5).

#### ⚠️ Assumption that may be wrong: `allowFontScaling`

`allowFontScaling` appears **nowhere** in the codebase, so RN's default (`true`) applies — meaning
**Android's system font-size slider already resizes the app's text today.** This was inferred from
RN's documented default, **not verified on device.** If you act on it, verify first.

If true, v1.0.2 item 1 may not need code at all — mom may just need to be shown the OS setting. But
`theme/tokens.ts` hard-codes `lineHeight` on every tier (`labelMd: 14/18`, `bodyMd: 16/24`, …), which
is exactly the pattern that clips under scaling. Untested at scale.

#### ⚠️ Other known issues (all deliberately out of scope)

- **Offline saves hang forever.** RN's `fetch` never times out. Mom taps "Simpan" with no signal and
  the app waits indefinitely — no error, no timeout. (`known-technical-debt.md` #5.)
- **No in-flight state on destructive actions** — admin-only surface. (#2.)
- **`KendaraanScreen` is dead code**, which is why `hardDeleteVehicle` has no UI. (#3.)

#### ⚠️ Migration hygiene (relevant only if you somehow need a migration — you should not)

- **Never hand-paste migration SQL into the Supabase web SQL editor.** It applies the schema without
  recording it, and `migration list` goes blind. `0001`–`0016` were applied that way and had to be
  back-filled; `0016` was found never to have run at all.
- Always `npx supabase` (CLI is a devDependency, no global install), run from
  `apps/lavender-ops-mobile`. Run `npx supabase migration list` **first**, always.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1. The core pattern: the connector layer is a firewall.**
Every read and write goes through `app/services/rentals/index.ts`. The UI never sees a Postgres row,
never sees `snake_case`, and never holds a raw data array. Connectors are all `async` — even the ones
that don't need to be — specifically so the in-memory implementation could be swapped for Supabase
without touching a single screen. That swap already happened successfully (Phase 4). The discipline
paid for itself once; keep it.

**2. The most common mistake a newcomer would make:** treating this like a generic React Native app
and "fixing" things that are load-bearing. The three biggest traps, in order: bumping `app.json`
version (breaks OTA delivery, silently); refactoring `DetailSewaScreen`/`PengembalianScreen` to use
the shared components (changes the money math); and mocking Supabase errors as `Error` instances in
tests (produces a green test that proves nothing).

**3. What looks refactorable but must NOT be touched right now:** the duplicated form components in
`DetailSewaScreen` and `PengembalianScreen`. Every instinct says "extract these, they're obviously
copy-paste." They *are* copy-paste. But they are copy-paste **inside the tariff and fuel-adjustment
math**, they have already drifted, and there are no characterisation tests protecting the current
behaviour. Fixing this correctly is a release of its own. Fixing it casually, inside a polish release,
is how mom starts getting the wrong numbers.

---

### 7. DO NOT TOUCH LIST

- ❌ **Do NOT bump `version` in `app.json`.** It stays `"1.0.0"`.
- ❌ **Do NOT add a migration in v1.0.2.** If something seems to need one, it belongs in v1.0.3.
- ❌ **Do NOT refactor `DetailSewaScreen` or `PengembalianScreen`** beyond the `showToast` extraction
  (v1.0.2 item 5). Do not touch their tariff, fuel-adjustment, or hutang logic.
- ❌ **Do NOT enable `.throwOnError()`** or sweep the ~24 raw-error connectors. Out of scope; wants its
  own review.
- ❌ Do NOT mock a Supabase failure as `new Error(...)` in a test.
- ❌ Do NOT change a connector's name, parameters, or return type. Signatures are a locked contract.
- ❌ Do NOT introduce a new library or framework without asking.
- ✅ **DO** preserve Indonesian user-facing copy. The app's language is Indonesian; mom does not read
  English.
- ✅ **DO** run `pnpm run compile`, `pnpm run lint`, and `pnpm test` before claiming anything is done.

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence | Note |
|---|---|---|
| §1 Identity, constraints | ✅ HIGH | Established this session; `app.json` and `CLAUDE.md` verified. |
| §2 What exists | ✅ HIGH | Screens, migrations, and connector exports read directly this session. |
| §3 Architecture | ⚠️ MEDIUM | Paths and conventions verified; the end-to-end flow narrative is carried forward from `CLAUDE.md` and not re-traced in code this session. |
| §4 Recent work | ✅ HIGH | This session. Commit `729b238`. |
| §5 `app.json` version trap | ✅ HIGH | `"version": "1.0.0"` and `runtimeVersion.policy: "appVersion"` both read directly from `app.json`. |
| §5 Supabase error shape | ✅ HIGH | Documented in `CLAUDE.md`; confirmed by a real bug fixed in v1.0.1. |
| §5 Form-library duplication | ✅ HIGH | Verified by grep this session: both screens import only `PhotoRow`; the `max = 8` divergence is real. |
| §5 `allowFontScaling` | ❓ **LOW** | `allowFontScaling` is genuinely absent from the codebase (grepped). But the conclusion — that Android's font slider therefore already works, and how `lineHeight` behaves under it — is **inferred from RN's documented default and NOT verified on device.** Validate before acting. |
| §5 Offline `fetch` timeout | ⚠️ MEDIUM | Carried forward from v1.0.1 notes; not re-tested. |
| §6–§7 | ✅ HIGH | Decisions made and confirmed with Farrel this session. |

---

**Absolute path of this document:**

`C:\Users\ferna\dev\personal_projects\lavender-app\AI_Continuation_Document-12Jul2026-1720.md`
