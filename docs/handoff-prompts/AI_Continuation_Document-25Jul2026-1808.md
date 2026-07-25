# PROJECT CONTINUATION DOCUMENT
## Session — 25 July 2026, 18:08 · **v1.0.5 Lead delivery session, halted at the re-gate**

> **Read this first:** you are resuming as the **Lead role** (`/lead`) mid-release. The release plan is
> approved, discovery has returned, and the re-gate is closed. **Your next action is a single subagent
> dispatch.** Do not re-plan, do not re-gate, do not re-derive baselines. Everything you need is in
> `docs/reports/v1-0-5.md`, which is the authoritative record — this document orients you to it.

---

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`lavender-app`) — mobile app `apps/lavender-ops-mobile`
- **What This Project Is:** An internal vehicle-rental operations tool for Farrel's mom's business. Two
  users: **Mom** (role `ops`, the primary operator, ~50, runs Android `fontScale` ≈ 1.4 on a Poco M3/MIUI)
  and **Farrel** (role `admin`, the developer). Not on the Play Store — the APK is sideloaded and updates
  ship OTA.
- **Primary Objective (this release, v1.0.5):** Mom can tell **by looking** which fields on a screen she can
  change and which are just displaying information. Delivered by **PRD-8** — one shared "field box" visual
  convention, defined once and applied to six files.
- **Strategic Intent:** Every release since v1.0.3 has been paying down the gap between "the app works" and
  "the app works *for Mom*". PRD-8 also **gates PRD-6** (a dedicated rental edit screen): the convention must
  be settled and shipped before PRD-6 consumes it, or PRD-6 invents a one-screen visual language this PRD
  would then have to unpick.
- **Hard Constraints:**
  - **OTA only.** No migration, no RPC, no RLS change, no Edge Function, no native dependency.
    `app.json` `version` stays `1.0.0` (bumping it would target OTA at a runtime Mom's installed APK does
    not report — she would **silently stop receiving updates**). The displayed version comes from the JS
    constant `app/config/release.ts`.
  - **No math may move.** PRD-8 AC-9 exists to prove the rental calculations came through the migration
    identical; it cannot prove that if they were edited.
  - **PRD-1's permission matrix is untouched** (PRD-8 BR-9 / AC-11). `editLogic.ts`'s
    `canEditKondisiKeluar` / `canEditNotes` are **consumed unmodified**.
  - **Lead never opens code.** The Lead role works only from reports and specs. Running `pnpm test` /
    `eslint` is fine; reading `app/**` is not. That is why discovery exists as a dispatch.

---

### 2. WHAT EXISTS RIGHT NOW

**Built and working**
- **v1.0.4 published OTA 2026-07-23** (channel `preview`, update group `ba4e2219`), merged to `master`
  2026-07-25. Reserves the Android system-nav inset app-wide (PRD-4) and clamps text scale at 1.5× (PRD-5).
  **Status is ⏳ published, not ✅ shipped** — see "partially built".
- v1.0.1 / v1.0.2 / v1.0.3 all shipped. v1.0.3 carried PRD-1 (edit an active rental), auth-gate hardening
  across 10 `SECURITY DEFINER` RPCs, and a money-regression fix.
- Test baseline on `master`: **50 suites / 237 tests, all passing** (25.6s, verified this session).
- Lint on `master`: **122 real (non-`prettier`) errors** (verified this session).

**Partially built**
- **v1.0.4's sign-off is outstanding.** Both PRD-4 AC-8 and PRD-5 AC-8 need Mom's own phone. The
  *mechanisms* are device-validated (real inset 47.27px, her `fontScale` ≈ 1.4 — below the 1.5 cap, so the
  clamp never fights her). What is still owed: the per-screen visual rows in
  `docs/reports/v1-0-4-visual-audit.md` **and** Mom's own words. **Do not claim v1.0.4 "shipped."**
- **v1.0.5 is in Phase 2.** Plan approved, discovery complete, re-gate closed. **Zero product code written.**

**Broken or blocked**
- Nothing is blocked. The one feasibility risk this release had (see §4) was **dissolved** by discovery.

**Not started**
- Every code change in v1.0.5. Dispatches ② through ⑦ (see §4).
- Two outstanding **Farrel** actions, neither blocking the next dispatch:
  1. A `/product` session must write **PRD-8 amendment A-1** (the AC-4 split) *and* record
     `PembayaranSheet` in PRD-8, **before dispatch ⑦**.
  2. Walk v1.0.4's **overlapping visual rows** (`B3/C3/F2`, `I6/J2/F3`, `B4/D1/I8`, `C5/I7`) on the
     currently-published build **before v1.0.5 publishes**, or the two releases' visual claims become
     entangled in the same pixels.

---

### 3. ARCHITECTURE & TECHNICAL MAP

- **Stack:** Expo SDK 55 (dev-client), React Native 0.83, **Ignite** scaffolding using **React Navigation —
  NOT Expo Router**. TypeScript strict. Supabase (`@supabase/supabase-js` v2). EAS Build (APK) + Expo
  Updates (OTA). `@testing-library/react-native@^13.2.0` for render tests. Jest via `jest-expo`.
- **Key paths:**
  | Path | What |
  |---|---|
  | `apps/lavender-ops-mobile/app/screens/` | All screens. `DetailSewaScreen.tsx` (48KB) and `PengembalianScreen.tsx` (50KB) are the two biggest and most dangerous |
  | `app/components/form/` | Shared primitives (`FieldCard`, `SectionLabel`, `FuelGauge`, `Stepper`, `RupiahInput`, `PhotoRow`, `BottomActionBar`). **`FieldBox` will be created here** |
  | `app/components/AppText.tsx` | v1.0.4's API-identical passthrough exporting `Text` **and `TextInput`** with the font-scale clamp. **All screens import `TextInput` from here, never from `react-native`** |
  | `app/utils/rentalMath.ts` | **The rental math, already extracted** — `computeFuelAdjustment` `:78-87`, `computeReturnTotal` `:89-96`, `sumPayments` `:45-47`, `hoursLate` `:74-76`, `sisa` `:49-51`. **Zero test coverage today** |
  | `app/services/rentals/` | The connector layer. `closeRental(rentalId, input)` at `index.ts:411` |
  | `app/theme/tokens.ts` | The palette + type scale the screens actually use |
  | `docs/02-demo-development.md` | §3 connector contract, **§6 rental math (declared must-be-correct)** |
  | `docs/known-technical-debt.md` | Standing debt register. Items **#4, #12, #13, #15, #16** are all live in this release |
- **How the release works end-to-end (the delivery chain, not the app):**
  1. `docs/prd/PRD-8-*.md` — requirements (BR-1…BR-12, AC-1…AC-12). Product owns it.
  2. `docs/releases/v1-0-5.md` — the scoped release plan: what's in, what's cut, **eight guards**, gates,
     rollback. PM owns it.
  3. `docs/reports/v1-0-5.md` — **the Lead release report. This is your working document.** It holds the
     pre-execution baselines, nine pre-dispatch decisions (D-0…D-8), the eight-dispatch plan with full
     per-dispatch briefs, the `FieldBox` contract, discovery findings, and the re-gate.
  4. Subagents do the work; Lead brokers contracts, collects reports, and fills in the report's
     post-execution sections labelling each decision `[by-agent]` or `[by-Farrel]`.
- **Naming/standards:** UI types camelCase; connectors always `async`; connector signatures are locked;
  screens never hold raw data. Release docs use `v1-0-5.md` (hyphens); git tags/branches use `v1.0.5`.
- **External dependencies:** Supabase project `tuufzjxoprjsrrkagncz` (**not touched this release**), EAS.

---

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

#### Git state, exactly

| | |
|---|---|
| Branch | **`v1.0.5-which-fields-you-can-change`** (cut from `master` this session) |
| HEAD | **`42adf83`** `docs(v1.0.5): Phase 1 plan approved, discovery returned, re-gate closed` |
| Previous | `22b13d5` `docs(v1.0.5): track the requirements before the work starts` (on `master`) |
| Working tree | **clean** |
| Product code changed | **none** |

#### What was worked on

A full **Lead Phase 1** (plan and halt) followed by **dispatch ①** (read-only discovery) and the re-gate.

**Baselines measured, not quoted:** 50 suites / 237 tests; **122** real lint errors. The lint breakdown
revealed that `no-restricted-imports` has gone **37 → 0** since v1.0.4 — v1.0.4's `AppText` passthrough
silently repaid debt #6's one open breach-ledger row. **Cumulative accepted lint increase is now 0.**

#### Decisions made, and WHY (all approved by Farrel 2026-07-25)

Full text in `docs/reports/v1-0-5.md`. The reasoning matters — do not undo these:

| ID | Decision | Why |
|---|---|---|
| **D-0** | Discovery pass first; no implementation-plan document written up front | BR-12's characterisation suite had an unknown *shape* and an unknown *feasibility*. Planning from belief is this project's documented failure mode |
| **D-1** | Field-box fill = `surface` `#f6faff` **via token** | 4.28:1 with `outline` (clears BR-3's 3:1); smallest diff (treatments 2/3/4 already use it); gives the signal two carriers instead of one 1px border |
| **D-2** | The *Kembali* date/time row gets the box **and keeps its `inlineEditBtn`**; no interaction change | The box says "changeable", not "how" — a date opens a picker, it isn't typed. And **debt #16 lives on that row** (a confident wrong default that already produced one wrong record); reducing its affordance is the wrong direction |
| **D-3** | `extraFeeDesc` is **boxed**, not left underlined | AC-1's own wording (*"every extra-fee description and amount"*) already decides it |
| **D-4** | The **tester** writes the characterisation suite, and it must pin **the connector payload**, not just rendered numbers | An agent that writes the constraint then satisfies it has pinned its own output. And v1.0.3's `deleted_at` defect showed the *correct* `sisa` on screen while the server wrote the wrong hutang — a display-only suite would have been green through it |
| **D-5** | Product must write **PRD-8 A-1** (the AC-4 split) before ⑦ | The tester derives correctness from the PRD. Reading AC-4 as literally written, it would see the two boxed inputs on `RentalDetailScreen` and **correctly report a false failure** |
| **D-6** | Lint ceiling restated: **"lowest measured baseline + 10" = 132**, ratcheting down | v1.0.4 set "+10 = 169" against a 159 baseline. The baseline is now 122, so an absolute 169 silently grants **+47** nobody voted for. This release is briefed **+0** |
| **D-7** | AC-7 carries **two lists**, not one | `SearchField` renders a `TextInput` and is a **Control** (BR-4, exempt). Putting it on the allow-list would trip the release gate's "any third entry is a scope breach" for something that is not a breach |
| **D-8** | `tester` stays pinned `sonnet` | The ladder forbids substituting a bigger model for a developer-tier agent. Mitigated by ①'s map, ③'s review, and Lead re-running rather than quoting |

#### Dispatch ① (discovery) — what it found

**It answered the gate's question with a yes, and there is no circularity.**

1. **`PengembalianScreen` mounts in jest** — proven by a spike, not argued. ~210–230ms/test.
   `RentalDetailScreen.test.tsx` (409 lines) is a direct precedent. Mocks needed: `useSafeAreaInsets`,
   `Platform.ios`→android, `@/services/rentals`, `@/services/photos/capture`, `@/utils/showToast`. **No
   `NavigationContainer`** — the screen takes `{navigation, route}` as plain props.
   `@react-native-community/datetimepicker` and `PembayaranSheet` need **no** mocking.
2. **The math was already extracted** into `app/utils/rentalMath.ts`. Nothing needs pulling out of the
   component before tests can be written. `Sisa` is one inline line (`PengembalianScreen.tsx:242`).
   **Auto-debt creation is server-side inside `rpc_close_rental` — invisible to jest**, so the client's only
   testable contribution is the payload it sends. The spike proved that payload is fully assertable.
3. **`app/utils/rentalMath.ts` has zero coverage of its own** and is imported by **both** rental screens — so
   the pure-function half of the suite is an unplanned dividend. **It does NOT close debt #15's other half.**

**It corrected the Lead twice.** Both corrections are recorded in the report as C-1/C-2 rather than quietly
patched:

- **C-1 (important):** Lead briefed that *"the two fenced screens consume `RupiahInput`"*. **They do not.**
  Exactly one production file imports the component: `HutangFormScreen.tsx:16`, used at `:132`. What
  `DetailSewaScreen` and `PengembalianScreen` carry is a **local `parseRupiahInput` *function*** — a parsing
  helper, not the component. Lead read one row of debt #4's table as another. **Consequence: the BR-3 border
  fix has a blast radius of one screen this release already modifies.**
- **C-2:** the `<TextInput` count is **33**, not the 38 v1.0.4 recorded. Verified file-by-file.
- **C-3:** four of PRD-8's inventory line numbers point at the *style declaration*, not the JSX tag
  (`UserFormScreen` :340→**:193**, `HutangFormScreen` :229→**:138**, `kmEditInput` :1100→**:520**,
  `notesInput` :1112→**:827**).

**And it found a file four documents had missed — this became the session's one escalation:**

**`PembayaranSheet.tsx`** has three bare editable fields (*Jumlah* `:203`, method description `:248`,
*Notes* `:294`), is imported by **four** screens, and appeared in **none** of PRD-8's inventory, the release
plan's rollout table, AC-7's allow-list, or Lead's own audit surface. **One of the three is a rupiah
amount**, and BR-7 says *"every rupiah entry point is a field box"* and calls the money field *the proof
case, not the cleanup item*.

**Farrel's call (RG-1, option A): fold it in.** ✅ Recorded `[by-Farrel]`. The release therefore touches
**six files, not five**. Rationale that must survive: the fence (debt #4 / D-6) guards
`DetailSewaScreen`'s **own source** and its tariff math; `PembayaranSheet` is a **shared component**, so
boxing its inputs changes **zero lines** in either out-of-scope consumer, and it keeps AC-7's allow-list at
exactly two.

#### Re-gate decisions Lead took without escalating

**RG-2** hybrid suite shape (pure-function on `rentalMath.ts` + render-level for `Sisa`, the *Terapkan*
interaction, and the `closeRental` payload across `sisa=0` / `sisa>0` / both fuel directions / extra fees /
discount) · **RG-3** semantic lookups, **no `testID`s added** (the screen has none; wrapping in `FieldBox`
does not reorder the render tree, so index fallbacks survive) · **RG-4** fake timers for the wall-clock
`returnedAt`, never changing the seed · **RG-5** AC-7 becomes a **two-layer** audit (source manifest
app-wide + render-level "every `TextInput` has a `FieldBox` ancestor"), affordable only because ① proved
mountability · **RG-6** dead `TextField.tsx` (renders a `TextInput`, zero consumers) excluded **by name with
a reason**, not deleted · **RG-7** the spike is **absorbed into ②'s suite and deleted** · **RG-8** no
standalone implementation-plan document — the facts came back "nothing is blocked", so it would only restate
the briefs.

#### Discussed but NOT implemented

Every line of product code. The remaining sequence, with full briefs in `docs/reports/v1-0-5.md`:

```
② tester (fresh)            ← YOUR NEXT ACTION. BR-12 characterisation suite, on untouched code.
                              Green, then COMMITTED AS ITS OWN COMMIT (that commit is AC-9's "before").
③ rental-math-reviewer      Reviews THE SUITE against docs/02 §6 — does it pin the right things?
④ developer-frontend #1     Footer removal + RELEASE="1.0.5" → FieldBox → UserForm + HutangForm
                              → PembayaranSheet (RG-1). Writes a handoff note for ⑤.
④b developer-frontend #1    (SendMessage, same agent) RentalDetail strips AC-4a + AC-4c, UserDetail AC-5.
⑤ developer-frontend #2     FRESH agent. The PengembalianScreen D-5 migration. Runs ②'s suite before
                              AND after; any delta = STOP and report, never edit the test.
⑥ rental-math-reviewer      AC-9 post-migration pass + fence check on ⑤'s diff.
⑦ tester (fresh)            AC-6/7/8 mutation-verified, acceptance ACs, full suite, lint re-count,
                              v1.0.5 visual-audit checklist.
⏸ PUBLISH GATE (Farrel) → OTA → Mom relaunches → combined visit closes AC-12 AND v1.0.4's AC-8,
                          recorded as TWO SEPARATE VERDICTS.
```

#### Open threads

- **RG-1's record in PRD-8** is owed (Product, with A-1 — D-5).
- **The spike file `apps/lavender-ops-mobile/test/spike.pengembalian.discovery.test.tsx` is committed** and
  must be **deleted by ②** once absorbed (RG-7). If it survives to ⑦, that is a miss.
- **Debt #14 may be mis-stated.** It claims the `tester` role cannot write `.md`; its tool list includes
  `Write`. ⑦ is briefed to try and report which is true.

---

### 5. WHAT COULD GO WRONG

**Known issues / live debt inside this release's blast radius**
- **Debt #16 — `returnedAt` defaults to `new Date()` at screen-open** (`PengembalianScreen.tsx:175`),
  renders a plausible wrong time, has already produced one wrong persisted record, and has **no in-app
  correction path**. **v1.0.5 styles that exact row and must not touch its value.** Fixing it needs an RPC +
  a permission-matrix extension this release is forbidden to open.
- **Debt #12 — two `docs/02` §6 ↔ code divergences, both in `PengembalianScreen`:** `applyFuelSuggestion()`
  appends an extra-fee line instead of adjusting Subtotal, and the fuel-suggestion row renders amber
  unconditionally. **Zero money impact. Which side is wrong — code or §6 — is an open Product question.**
  The characterisation suite must **pin them as-is**; AC-9 demands identical before/after.
- **Debt #4 / #15** are only **partially** paid by this release. On ship, `PengembalianScreen`'s
  input-bearing primitives close and that screen gets its first coverage; **`DetailSewaScreen` stays
  entirely uncovered and unmigrated**, as do Pengembalian's local `SectionLabel` / `FuelGauge` / `Stepper` /
  bottom bar. **Neither item may be struck.**

**Edge cases**
- `git diff` is **blind to untracked files** (debt #13) and this release creates many test files. Use
  `git status --short` before trusting any diff as a scope proof.
- `Platform.select()` **cannot** be influenced by reassigning `Platform.OS` in a test (debt #11) — jest-expo
  loads `Platform.ios.js`, whose `select` never reads `.OS`. Mock the platform-suffixed submodule by name.
  **Never** mock the whole `react-native` package by spreading `jest.requireActual` — `DevMenu` throws.
- **Run jest from `apps/lavender-ops-mobile`, never the monorepo root.** A root run resolves a different
  config, sweeps in a stale `.worktrees/` tree, and reports a wall of failures in files nobody touched.
- Supabase errors are **plain objects, not `Error` instances**. Never mock a Supabase failure as
  `new Error(...)` — that mock hid a real bug through two green reviews.

**Assumptions that could be wrong**
- ❓ That `FieldBox` can be composed *inside* `RupiahInput` without a visual regression. Reasonable, unproven.
- ❓ That boxing `PembayaranSheet` looks right from all four consuming screens. Only a device settles it —
  that is why the checklist gains rows for `HutangDetailScreen` and `DetailSewaScreen`.
- ⚠️ That AC-7's layer-2 render audit can mount all in-scope screens as cheaply as `PengembalianScreen`.
  Only that one screen was spiked.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1 · The core pattern: files are the handoff contract, and gates are load-bearing.**
`docs/prd/` → `docs/releases/` → `docs/reports/`. Roles (`/product`, `/pm`, `/lead`, plus subagents) hand
work to each other through documents, not conversation, so any session can be resumed by a stranger — this
document exists because that actually works. Lead runs **gated**: it writes its plan and **halts for
Farrel's approval before dispatching anything**, because subagents run once and cannot be recalled
mid-flight. **This release's discovery gate has already paid for itself twice** (it dissolved the feasibility
risk and it found `PembayaranSheet`).

**2 · The most common mistake: reasoning about an artefact nobody opened.**
This project has paid for it repeatedly. Four agents and Lead spent a whole release reasoning about a
"clipped Beranda label" from *prose descriptions of a screenshot nobody had opened* — it turned out to be a
ScrollView fold, not a defect (PRD-4 A-1, withdrawn). v1.0.4's Lead asserted a belief about a lint rule as a
measured fact (C-1). **This session's Lead inferred a consumer relationship from a debt-register row instead
of checking imports (C-1 again, different Lead).** The habit that catches all three is identical: **go to the
source, and prove it by running something.** When a requirement rests on a screenshot, open the screenshot.

**3 · What looks refactorable but must NOT be touched:**
- **`DetailSewaScreen`** (48KB, tariff composition). Once `FieldBox` exists it will look like a
  twenty-minute win. It is behind the debt #4 fence, it has **zero** tests, and opening two rental-math
  screens in one release is how a fenced migration stops being fenced. Guard 6.
- **Pengembalian's local `FuelGauge` / `Stepper` / `SectionLabel` / bottom bar.** The two `FuelGauge` copies
  have **already diverged on `max`** — migrating that one is a *behavioural* change on a money path wearing
  a refactor's clothes. Guard 2.
- **Debt #12's two divergences.** Guard 3. Touching either turns a presentation release into a math change.
- **`returnedAt`'s default.** Guard 1, and the release plan's own nomination for the most likely misread.
- **The repo-wide CRLF/lint state.** Never run `eslint --fix` or `prettier --write` across the repo (debt
  #6a) — it renormalizes every file including both rental-math screens, producing an unreviewable diff. A
  renormalization must be its own whitespace-only commit.
- **`app/services/api/`** — dead Ignite demo scaffolding, deliberately kept as the skeleton of v1.1's future
  HTTP client (debt #7, decided).

---

### 7. DO NOT TOUCH LIST

- **Do NOT re-run Lead Phase 1.** The plan is approved (`[by-Farrel]`, 2026-07-25) and the re-gate is closed.
  Re-planning burns the approval and the trail.
- **Do NOT open code as Lead.** Read reports and specs only. Dispatch a subagent to look at `app/**`.
- **Do NOT dispatch ④ or ⑤ before ② is green and ③ has passed.** BR-12's ordering is the whole safety story:
  a suite written after the migration pins whatever the migration produced, including its bugs.
- **Do NOT let any developer edit a characterisation test.** If one fails after the migration, that is the
  developer's defect. Stop and report.
- **Do NOT grow AC-7's allow-list past `LoginScreen` + `DetailSewaScreen`.** A third entry is a scope breach.
  Controls (BR-4) and the dead-code exclusion are **separate lists** (D-7, RG-6).
- **Do NOT bump `app.json` `version`.** Set `app/config/release.ts` `RELEASE` to `"1.0.5"` instead.
- **Do NOT add a native dependency.** If an approach reaches for one, stop and escalate — it breaks the OTA
  shape and becomes a different release.
- **Do NOT open a migration, RPC, RLS change, or Edge Function.** BR-9 / AC-11 / guard 5.
- **Do NOT substitute a larger model for a developer-tier subagent.** If `sonnet` is unavailable, **stop and
  hand to Farrel** (`docs/agents/lead.md`).
- **Do NOT claim v1.0.4 "shipped"** or v1.0.5 "shipped" before Mom's own confirmation on her own phone.
- Preserve naming conventions; ask before introducing any framework, library, or dependency.

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence |
|---|---|
| §1 Project identity | ✅ HIGH — constraints re-read from CLAUDE.md, PRD-8 and the release plan this session |
| §2 Current state — v1.0.5 | ✅ HIGH — branch, HEAD, clean tree, baselines all verified by command this session |
| §2 Current state — v1.0.4 sign-off | ✅ HIGH — read from `docs/reports/v1-0-4-visual-audit.md` this session |
| §3 `rentalMath.ts` locations, mount recipe, `closeRental` shape | ✅ HIGH — measured by dispatch ①, spike runs green |
| §3 `<TextInput` enumeration (33 tags, per-file) | ✅ HIGH — ① verified file-by-file, correcting the prior 38 |
| §3 PRD-8 inventory line numbers | ✅ HIGH for the 6 confirmed and the 4 corrected (C-3) |
| §4 Decisions D-0…D-8, RG-1…RG-8 and their reasoning | ✅ HIGH — taken and recorded this session |
| §5 Debt #4 / #11 / #12 / #13 / #15 / #16 | ⚠️ MEDIUM — read from the register this session, not independently re-verified in code |
| §5 `FieldBox`-inside-`RupiahInput` composability | ❓ LOW — reasonable, unproven |
| §5 All in-scope screens mount as cheaply as `PengembalianScreen` | ❓ LOW — only that one was spiked |
| Debt #14 (tester cannot write `.md`) | ❓ LOW — contradicted by the agent's own tool list; ⑦ will settle it |
