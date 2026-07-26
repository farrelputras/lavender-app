# PROJECT CONTINUATION DOCUMENT
## Session 3 — 26 July 2026, 14:24 · **v1.0.5 Lead delivery session, halted before the first product-code dispatch**

> **Read this first.** You are resuming as the **Lead role** (`/lead`) mid-release. The plan is approved,
> discovery has returned, the re-gate is closed, and **the entire characterisation-test phase is finished
> and committed**. Zero product code has been written. **Your next actions are (a) a `/product` session to
> write PRD-8 A-1 + A-2, and (b) dispatch ④, the first subagent that touches `app/`.**
> `docs/reports/v1-0-5.md` is the authoritative record and your working document — this orients you to it.

---

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`lavender-app`) — mobile app at `apps/lavender-ops-mobile`
- **What This Project Is:** An internal vehicle-rental operations tool for Farrel's mom's business. Two
  users: **Mom** (role `ops`, the primary operator, ~50, Android Poco M3/MIUI at `fontScale` ≈ 1.4) and
  **Farrel** (role `admin`, the developer). Not on the Play Store — the APK is sideloaded, updates ship OTA.
- **Primary Objective (v1.0.5):** Mom can tell **by looking** which fields on a screen she can change and
  which merely display information. Delivered by **PRD-8** — one shared "field box" visual convention,
  defined once and applied to six files.
- **Strategic Intent:** Every release since v1.0.3 has been closing the gap between "the app works" and "the
  app works *for Mom*". PRD-8 also **gates PRD-6** (a dedicated rental edit screen): the convention must be
  settled and shipped before PRD-6 consumes it, or PRD-6 invents a one-screen visual language this PRD would
  then have to unpick.
- **Hard Constraints:**
  - **OTA only.** No migration, no RPC, no RLS change, no Edge Function, no native dependency. `app.json`
    `version` stays `1.0.0` — bumping it would target OTA at a runtime Mom's installed APK does not report,
    and she would **silently stop receiving updates**. The displayed version comes from the JS constant
    `app/config/release.ts`, which becomes `"1.0.5"`.
  - **No math may move.** PRD-8 AC-9 exists to prove the rental calculations came through the migration
    identical; it cannot prove that if they were edited.
  - **PRD-1's permission matrix is untouched** (BR-9 / AC-11). `editLogic.ts`'s `canEditKondisiKeluar` /
    `canEditNotes` are consumed unmodified.
  - **Lead never opens code.** Lead works from reports and specs only. Running `pnpm test` / `eslint` /
    `git` is fine; reading `app/**` is not. Dispatch a subagent to look at code.

---

### 2. WHAT EXISTS RIGHT NOW

**Built and working**
- v1.0.1 / v1.0.2 / v1.0.3 shipped. **v1.0.4 published OTA 2026-07-23** (channel `preview`, update group
  `ba4e2219`), merged to `master` 2026-07-25 — system-nav inset (PRD-4) + text-scale clamp at 1.5× (PRD-5).
- **v1.0.5's entire test phase is complete and committed.** Five dispatches returned green: ① discovery,
  ② the BR-12 characterisation suite, ②b gap-closing, ③ the math review, ②c the repair.
- **Measured on the branch at the halt (by Lead, not quoted from an agent):**
  **52 suites / 283 tests all passing** · **lint 122 real non-`prettier` errors, +0** · `npx tsc --noEmit`
  **exit 0**.

**Partially built**
- **v1.0.4's sign-off is outstanding.** Both PRD-4 AC-8 and PRD-5 AC-8 need Mom's own phone. The
  *mechanisms* are device-validated (real inset 47.27px, her `fontScale` ≈ 1.4, below the 1.5 cap). Still
  owed: the per-screen visual rows in `docs/reports/v1-0-4-visual-audit.md` **and Mom's own words**.
  **Do not claim v1.0.4 "shipped."**
- **v1.0.5 is mid-Phase-2.** Test phase done; **zero product code written**.

**Broken or blocked**
- Nothing is blocked. The release's one feasibility risk was dissolved by dispatch ①.

**Not started**
- **Every line of product code.** Dispatches ④, ④b, ⑤, ⑥, ⑦.
- **PRD-8 amendments A-1 and A-2** — a `/product` session. **A-1 blocks ⑦** (not ④). Prompt in Appendix A.

---

### 3. ARCHITECTURE & TECHNICAL MAP

- **Stack:** Expo SDK 55 (dev-client), React Native 0.83, **Ignite** scaffolding on **React Navigation —
  NOT Expo Router**. TypeScript strict. Supabase (`@supabase/supabase-js` v2). EAS Build + Expo Updates.
  `@testing-library/react-native@^13.2.0`, Jest via `jest-expo`.
- **Key paths:**

  | Path | What |
  |---|---|
  | `app/screens/` | All screens. `DetailSewaScreen.tsx` (48KB) and `PengembalianScreen.tsx` (50KB) are the biggest and most dangerous |
  | `app/components/form/` | Shared primitives (`FieldCard`, `SectionLabel`, `FuelGauge`, `Stepper`, `RupiahInput`, `PhotoRow`, `BottomActionBar`). **`FieldBox` will be created here** |
  | `app/components/AppText.tsx` | v1.0.4's API-identical passthrough exporting `Text` **and `TextInput`** with the font-scale clamp. **All screens import `TextInput` from here, never from `react-native`** |
  | `app/utils/rentalMath.ts` | The extracted math. **Now covered** by `rentalMath.test.ts` (18 tests) |
  | `app/screens/PengembalianScreen.characterization.test.tsx` | **The AC-9 instrument.** 25+ tests |
  | `app/services/rentals/` | Connector layer. `closeRental(rentalId, input)` at `index.ts:411` |
  | `app/config/release.ts` | `RELEASE` constant — becomes `"1.0.5"` |
  | `docs/02-demo-development.md` | §3 connector contract, **§6 rental math (declared must-be-correct)** |
  | `docs/reports/v1-0-5.md` | **The authoritative release record and your working document** |
  | `docs/known-technical-debt.md` | Standing debt register. Items **#4, #11, #12, #13, #15, #16** live here |

- **How the delivery chain works (not the app):**
  1. `docs/prd/PRD-8-editable-vs-readonly.md` — requirements (BR-1…BR-12, AC-1…AC-12). Product owns it.
  2. `docs/releases/v1-0-5.md` — the scoped release plan: eight guards, gates, rollback. PM owns it.
  3. `docs/reports/v1-0-5.md` — **the Lead release report.** Pre-execution baselines, decisions D-0…D-8,
     discovery findings + corrections C-1…C-4, re-gate decisions RG-1…RG-8, execution log E-1/E-2, finding
     F-7, and **the full brief for every remaining dispatch**. Use those briefs as written.
  4. Subagents do the work; Lead brokers contracts, collects reports, and fills in the post-execution
     sections labelling each decision `[by-agent]` or `[by-Farrel]`.
- **Naming/standards:** UI types camelCase; connectors always `async`; connector signatures locked; screens
  never hold raw data. Release docs use `v1-0-5.md` (hyphens); git branches/tags use `v1.0.5`.
- **External dependencies:** Supabase project `tuufzjxoprjsrrkagncz` (**not touched this release**), EAS.

---

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

#### Git state, exactly

| | |
|---|---|
| Branch | **`v1.0.5-which-fields-you-can-change`** |
| HEAD | **`b25e42d`** `docs(v1.0.5): Phase 2 execution log through the halt after dispatch 2c` |
| **AC-9's "before" state** | **`49fae63`** — ⑦ must quote **this** SHA, not `303ed6d` |
| Working tree | **clean** |
| Product code changed | **none** — every commit is tests or docs |

```
b25e42d  docs(v1.0.5): Phase 2 execution log through the halt after dispatch 2c
49fae63  test(v1.0.5): repair the characterisation suite after the math review   <-- AC-9 "before"
91e7b76  test(v1.0.5): close the four characterisation gaps under the migrations
303ed6d  test(v1.0.5): BR-12 characterisation suite — the AC-9 before state
42adf83  docs(v1.0.5): Phase 1 plan approved, discovery returned, re-gate closed
```

#### What was worked on

Session S2 (2026-07-25, 18:08–20:03) ran the **entire test phase**: ② → ②b → ③ → ②c. Lead **re-ran the
suite and lint after every single dispatch** rather than quoting the agent (D-8's mitigation). Every
reported number reproduced exactly.

| Dispatch | Agent | Outcome |
|---|---|---|
| ② | `tester` (fresh) | BR-12 suite. 51/239 → 52/266. Spike absorbed + deleted (RG-7) |
| ②b | same agent, `SendMessage` | +14 tests closing four blast-radius gaps → 52/280 |
| ③ | `rental-math-reviewer` | Reviewed the suite against `docs/02` §6. **Found two serious defects** |
| ②c | same tester | Repaired them + 3 new tests → **52/283**, `tsc` clean, lint +0 |

#### Decisions made, and WHY — do not undo these

**E-1 · ② was dispatched fresh, not as a `SendMessage` continuation `[by-agent]`.** The Phase-1 plan briefed
② as a continuation of ①, but ①'s agent died when session S1 ended at the re-gate. ①'s findings were carried
inline instead. **General lesson recorded:** a plan that routes work through `SendMessage` has an undeclared
dependency on session continuity — brief any dispatch sitting behind a gate as though its predecessor's
context is gone.

**E-2 · ②b was dispatched to close four gaps ② named itself `[by-agent]`.** Justified under D-4 (approved),
which says of characterisation depth: *"deeper is allowed; shallower is not."* The four were chosen by one
filter — **is this a field the coming migration will wrap?** `km`/`tujuan`/`notes` (⑤ boxes all three),
extra-fee/discount **removal** (⑤ boxes those rows), the `returnedAt` **picker interaction** (D-2 requires it
survive unchanged), and `PembayaranSheet` payment edit/delete (④ boxes its three inputs). Five other gaps
were **refused by name** so the omission is a choice: double-tap Save (bottom bar out of ⑤'s scope, guard 2),
`photos` wiring (`PhotoRow` is a Control), row-order assertions (**the instrument is not becoming a layout
test — the visual audit covers appearance**), `composeTarif` (belongs to `DetailSewaScreen`, debt #15).

**C-4 · A Lead correction, recorded rather than quietly patched `[by-agent]`.** Lead briefed ③ that the
`Stepper` was excluded because *"it's a Control under BR-4, untouched."* **Wrong component** —
`PengembalianScreen` uses its **own local `Stepper`** (`:105-156`), not `app/components/form/Stepper.tsx`.
The outcome holds (the 0–8 clamp is at the **call site**, `:532-533`, so nothing could move a number), but
the reasoning was wrong. Same shape as C-1.

#### ③'s two serious findings — the reason the review existed

**1 · One of the two debt-#12 tripwires COULD NOT FAIL.** The amber-unconditional test selected its target
node **by** `backgroundColor === colors.warningContainer`, then asserted that colour three times. All true
by construction. Guard 3's entire exclusion rested on it. **It was guarding nothing.** Now located by the
row's *structural* signature (`borderRadius: 12` + `gap` + `padding` + `flexDirection: row`).

**2 · Three fixture collisions made the four hydration lines (`PengembalianScreen.tsx:221-224`) unprovable.**
`bensinKotak` was `4` in every fixture *and* `4` is the `useState` default; `tujuan`/`notes` were `""` on
both sides; `tarif` = `totalBill` = `rate24h`. Nothing proved the fetched rental was ever read. If ⑤
disturbs that effect, a bike out with 8 kotak opens showing *"Bensin kurang 4 kotak — saran +Rp 20.000"* —
**real money, wrong direction** — while `tujuan`/`notes` render blank and are **overwritten with `""` on
save**. Fixtures now collide with nothing: `bensinKotak: 6`, `tujuan: "Kos Barat"`, `notes: "catatan awal"`,
`totalBill: 999999`, `rate24h: 45000`, `tarif` held at 40000.

> **Elegant side effect:** making `totalBill`/`rate24h` distinct from `tarif` **retroactively strengthened
> ~20 existing `subtotalSewa: 40000` assertions** — they would now fail if hydration were mis-wired.

#### The single most transferable lesson from S2

③ also found that `addExtraFeeRow` assumed its new pair lands at `[N-1, N]` — true **only while no Diskon
row exists**, a precondition its docstring never stated. ②c **verified this empirically before fixing it**
(throwaway debug test, run, then deleted): with a discount present the pair lands at `[4,5]`, not `[5,6]`.
Confirmed.

**And the fix exposed a second bug ③ structurally could not have seen.** The new whole-tree style scan
collided with the **Jaminan banner's inline icon row**, which carries a *byte-identical* style object and
sits later in the tree — "take the last style match" silently grabbed the wrong node. That fact does not
exist in the JSX; it exists only in the **rendered tree**. Had ②c implemented ③'s suggestion on trust, it
would have shipped a locator pointing at the wrong element **with the suite still green**.

> **A reviewer who cannot run and an implementer who does not verify produce a confident wrong answer
> between them.** This is why "verify before fixing" is in every brief.

#### Farrel's decisions this session `[by-Farrel]`

| Item | Decision |
|---|---|
| Halt after the tester returned, before ④ | ✅ Done. ④ **not** dispatched |
| **v1.0.4's overlapping visual rows** (B3/C3/F2, I6/J2/F3, B4/D1/I8, C5/I7) | **"Let it be, and keep flagged."** Do **not** block on walking them; **keep the flag standing**. Supersedes the earlier "walk before v1.0.5 publishes" recommendation. **Consequence accepted:** if v1.0.5 publishes first, the two releases' visual claims are entangled in the same pixels and a failure cannot be cleanly attributed to one release |
| **The `Terapkan` double-charge money defect** | **"I'll follow your recommendation."** See below — recorded as Farrel's adoption of Lead's recommendation |

**Lead's recommendation on the money defect, now adopted `[by-Farrel]`:**
**Do NOT fix it in v1.0.5.** Reasons: (a) it is a **behaviour/math change on a fenced rental-math screen**,
which guards 3 and 4 forbid and which AC-9 exists specifically to prove did not happen; (b) it is
**pre-existing**, not introduced by this release; (c) v1.0.5 is a presentation-only OTA whose entire safety
story is "nothing but appearance moved". **Instead:** Lead records it in `docs/known-technical-debt.md` at
ship, and it goes to Product as input for a future release — most naturally **folded into PRD-6** (the
dedicated rental edit screen), which is already licensed to change this screen's behaviour.
⚠️ **Note for whoever fixes it: the characterisation suite does NOT pin this behaviour**, so a future fix
has no "before" protection yet and will need its own.

#### Discussed but NOT implemented

Every line of product code. Remaining sequence — **full briefs are in `docs/reports/v1-0-5.md`, use them as
written**:

```
④  developer-frontend #1   Footer removal + RELEASE="1.0.5" → FieldBox → UserForm + HutangForm
                           → PembayaranSheet (RG-1). Writes a handoff note for ⑤.
④b developer-frontend #1   (SendMessage, same agent) RentalDetail strips AC-4a + AC-4c, UserDetail AC-5.
⑤  developer-frontend #2   FRESH agent. The PengembalianScreen D-5 migration. Runs the suite before AND
                           after; any delta = STOP and report, never edit the test.
⑥  rental-math-reviewer    AC-9 post-migration pass + fence check on ⑤'s diff.
⑦  tester (fresh)          AC-6/7/8 mutation-verified, acceptance ACs, full suite, lint re-count,
                           v1.0.5 visual-audit checklist. ← BLOCKED ON PRD-8 A-1
⏸  PUBLISH GATE (Farrel) → OTA → Mom relaunches → AC-12 + v1.0.4's AC-8, TWO SEPARATE VERDICTS.
```

#### Open threads

1. ⚠️ **OPEN VERIFICATION ITEM — nobody has demonstrated the repaired amber test *can* fail.** Fix #1
   existed precisely because the old one could not; the replacement's ability to fail is **reasoned, not
   measured** — the same class of claim, one level up. **Required:** temporarily change the fuel-suggestion
   row's `backgroundColor` in source, confirm the test goes **red**, revert. Two minutes. Belongs to ⑤
   (before it migrates) or ⑦ (during its mutation pass). **Until then, guard 3's debt-#12 tripwire is
   repaired but unproven.**
2. **PRD-8 A-1 + A-2 unwritten** (D-5, RG-1 consequence 5). Blocks ⑦, not ④. **Prompt in Appendix A.**
3. **Debt #14 may be mis-stated** — it claims the `tester` role cannot write `.md`; its tool list includes
   `Write`. ⑦ is briefed to try and report which is true.
4. **Debt register additions owed at ship:** F-7 (below), the `Terapkan` double-charge, ③'s three other
   Product observations, and debt #6's ledger row recorded as **repaid** (`no-restricted-imports` 37 → 0).

#### F-7 · A jest fact debt #11 does not cover `[by-agent]`

**`@react-native-community/datetimepicker` resolves to its *iOS* implementation under this jest config, no
matter what the `Platform` mock says.** The debt #11 trick overrides `Platform.OS`'s **runtime value**; it
does nothing to jest's **platform-suffixed file resolution**, a separate mechanism. It is *why* the picker
is testable at all (the Android file returns `null` and drives an imperative native dialog) — but the
library's **Android two-dialog auto-advance sequencing is never exercised in jest**, and **Mom is on
Android**. Nominated for the register as an extension of #11.

---

### 5. WHAT COULD GO WRONG

**Known issues / live debt inside the blast radius**
- **Debt #16 — `returnedAt` defaults to `new Date()` at screen-open** (`PengembalianScreen.tsx:175`),
  renders a plausible wrong time, has already produced one wrong persisted record, and has no in-app
  correction path. **v1.0.5 styles that exact row and must not touch its value** (guard 1 — the release
  plan's own nomination for the most likely misread).
- **Debt #12 — two `docs/02` §6 ↔ code divergences**, both in `PengembalianScreen`: `applyFuelSuggestion()`
  appends an extra-fee line instead of adjusting Subtotal, and the suggestion row renders amber
  unconditionally. **Zero money impact. Which side is wrong is an open Product question.** The suite pins
  them as-is; AC-9 demands identical before/after. **Do not "fix" either.**
- **Debt #4 / #15 are only PARTIALLY paid.** On ship, `PengembalianScreen`'s input-bearing primitives close
  and it gets its first coverage; **`DetailSewaScreen` stays entirely uncovered and unmigrated**, as do
  Pengembalian's local `SectionLabel` / `FuelGauge` / `Stepper` / bottom bar. **Neither item may be struck.**

**Edge cases**
- `git diff` is **blind to untracked files** (debt #13) and this release creates test files. Use
  `git status --short` before trusting any diff as a scope proof.
- `Platform.select()` **cannot** be influenced by reassigning `Platform.OS` (debt #11). Mock the
  platform-suffixed submodule by name. **Never** mock the whole `react-native` package by spreading
  `jest.requireActual` — `DevMenu` throws. See also **F-7** above.
- **Run jest from `apps/lavender-ops-mobile`, never the monorepo root.** A root run resolves a different
  config, sweeps in a stale `.worktrees/` tree, and reports failures in files nobody touched.
- Supabase errors are **plain objects, not `Error` instances**. Never mock a failure as `new Error(...)` —
  that mock hid a real bug through two green reviews.
- **PowerShell here-strings (`@'…'@`) mangled a multi-line `git commit -m` in this session.** Write the
  message to a file and use `git commit -F <file>`.

**Assumptions that could be wrong**
- ❓ **The repaired amber test can fail.** Reasoned, unmeasured. See open thread 1. **This is the sharpest
  live assumption in the release.**
- ❓ That `FieldBox` can be composed *inside* `RupiahInput` without a visual regression. Reasonable, unproven.
- ❓ That boxing `PembayaranSheet` looks right from all four consuming screens. Only a device settles it.
- ⚠️ That AC-7's layer-2 render audit can mount all in-scope screens as cheaply as `PengembalianScreen`.
  Only that one screen was spiked.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1 · Files are the handoff contract, and gates are load-bearing.**
`docs/prd/` → `docs/releases/` → `docs/reports/`. Roles hand work to each other through documents, not
conversation, so any session can be resumed by a stranger — this document exists because that works. Lead
runs **gated**: it writes its plan and **halts for Farrel's approval before dispatching anything**, because
subagents run once and cannot be recalled mid-flight. **This release's gates have now paid for themselves
three times:** ① dissolved the feasibility risk, ① found `PembayaranSheet`, and ③ found a test that could
not fail.

**2 · The most common mistake: reasoning about an artefact nobody opened.**
Four agents and a Lead spent a whole release reasoning about a "clipped Beranda label" from *prose
descriptions of a screenshot nobody had opened* — it was a ScrollView fold, not a defect (PRD-4 A-1,
withdrawn). v1.0.4's Lead asserted a belief about a lint rule as a measured fact. This session's Lead
inferred a consumer relationship from a debt-register row (C-1) and named the wrong `Stepper` (C-4). **The
habit that catches all of them: go to the source, and prove it by running something.** ②c's discovery of the
byte-identical style collision — invisible in the JSX, visible only in the rendered tree — is the sharpest
example this project has produced.

**3 · What looks refactorable but must NOT be touched:**
- **`DetailSewaScreen`** (48KB, tariff composition). Once `FieldBox` exists it will look like a
  twenty-minute win. It is behind the debt #4 fence, has **zero** tests, and opening two rental-math screens
  in one release is how a fenced migration stops being fenced. **Guard 6.**
- **Pengembalian's local `FuelGauge` / `Stepper` / `SectionLabel` / bottom bar.** The two `FuelGauge` copies
  have **already diverged on `max`** — migrating one is a *behavioural* change on a money path wearing a
  refactor's clothes. **Guard 2.**
- **Debt #12's two divergences.** **Guard 3.** Touching either turns a presentation release into a math
  change.
- **`returnedAt`'s default.** **Guard 1.**
- **The repo-wide CRLF/lint state.** Never run `eslint --fix` or `prettier --write` across the repo (debt
  #6a) — it renormalizes every file including both rental-math screens, producing an unreviewable diff.
- **`app/services/api/`** — dead Ignite demo scaffolding, deliberately kept as v1.1's future HTTP-client
  skeleton (debt #7, decided).

---

### 7. DO NOT TOUCH LIST

- **Do NOT re-run Lead Phase 1 or the re-gate.** Both are closed `[by-Farrel]`, 2026-07-25.
- **Do NOT re-run the characterisation dispatches.** ② / ②b / ③ / ②c are complete, green, and committed.
- **Do NOT open code as Lead.** Reports and specs only. Dispatch a subagent to touch `app/**`.
- **Do NOT let any developer edit a characterisation test.** If one fails after the migration, that is the
  developer's defect. **Stop and report.**
- **Do NOT dispatch ⑤ before ④ has delivered `FieldBox` and its handoff note.**
- **Do NOT grow AC-7's allow-list past `LoginScreen` + `DetailSewaScreen`.** A third entry is a scope
  breach. Controls (BR-4) and the dead-code exclusion (`TextField.tsx`, RG-6) are **separate lists** (D-7).
- **Do NOT bump `app.json` `version`.** Set `app/config/release.ts` `RELEASE` to `"1.0.5"` instead.
- **Do NOT add a native dependency.** If an approach reaches for one, stop and escalate.
- **Do NOT open a migration, RPC, RLS change, or Edge Function.** BR-9 / AC-11 / guard 5.
- **Do NOT substitute a larger model for a developer-tier subagent.** If `sonnet` is unavailable, **stop and
  hand to Farrel** (`docs/agents/lead.md`).
- **Do NOT fix the `Terapkan` double-charge, or any of ③'s Product observations, in this release.**
- **Do NOT claim v1.0.4 or v1.0.5 "shipped"** before Mom's own confirmation on her own phone.
- Preserve naming conventions; ask before introducing any framework, library, or dependency.

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence |
|---|---|
| §1 Project identity, constraints | ✅ HIGH — re-read from CLAUDE.md, PRD-8, release plan across S1/S2 |
| §2 Branch, HEAD, clean tree, **52/283 tests, lint 122, `tsc` clean** | ✅ HIGH — every number measured by Lead running the command, after each dispatch |
| §2 v1.0.4 sign-off outstanding | ✅ HIGH — read from `docs/reports/v1-0-4-visual-audit.md` |
| §3 `rentalMath.ts` locations, mount recipe, `closeRental` shape | ✅ HIGH — measured by ①, exercised by ②/②b/②c |
| §3 `<TextInput` enumeration (33 tags, per-file) | ✅ HIGH — ① verified file-by-file (correcting a prior 38) |
| §4 Dispatch outcomes, E-1, E-2, C-4, ③'s findings | ✅ HIGH — taken and recorded this session |
| §4 `addExtraFeeRow` ordering + the style collision | ✅ HIGH — **confirmed by a run**, not by reading |
| §4 Farrel's three decisions | ✅ HIGH — given verbatim this session |
| §5 Debt #4 / #11 / #12 / #13 / #15 / #16 | ⚠️ MEDIUM — read from the register, not independently re-verified in code |
| §5 / open thread 1 — **the repaired amber test can fail** | ❓ **LOW — reasoned, never measured. Settle it before trusting AC-9.** |
| `FieldBox`-inside-`RupiahInput` composability | ❓ LOW — reasonable, unproven |
| All in-scope screens mount as cheaply as `PengembalianScreen` | ❓ LOW — only that one was spiked |
| Debt #14 (tester cannot write `.md`) | ❓ LOW — contradicted by the agent's own tool list; ⑦ will settle it |

---

## APPENDIX A — Copy-pasteable prompt for the `/product` session (PRD-8 A-1 + A-2)

> Run this in its own session with `/product`. It blocks ⑦, not ④, so it can happen in parallel with the
> developer dispatches. **Lead must not write it** — the release does not get to amend a PRD by itself.

```
/product

Write two amendments to docs/prd/PRD-8-editable-vs-readonly.md. Record them the way PRD-4's
Amendment A-1 was recorded — in the PRD itself, dated, with the reasoning preserved, so a future
reader finds them in the requirements rather than only in a release report.

Context: release v1.0.5 is delivering PRD-8 right now. The test phase is complete and committed;
product code has not started. Two things the PRD says are now known to be wrong or incomplete, and
both were decided during delivery with Farrel's approval. Read docs/releases/v1-0-5.md and
docs/reports/v1-0-5.md first — the operative decisions are D-5 and RG-1.

--- AMENDMENT A-1: split AC-4 ---

AC-4 as written says RentalDetailScreen has nothing boxed. That is wrong for this release, and a
tester deriving correctness from the PRD will read it literally, see two boxed inputs, and
CORRECTLY report a failure. The amendment is what stops a true test from producing a false verdict.

Split it three ways, taking the table in docs/releases/v1-0-5.md as the source of truth:

  AC-4a  the surfaceContainerLow single-value blocks are removed (Tujuan, read-only Catatan) — IN
  AC-4b  "nothing on this screen is boxed" — explicitly OUT of v1.0.5; it belongs to the release
         that carries PRD-6, because it presumes the dedicated edit screen exists
  AC-4c  kmEditInput and notesInput DO get the box — they are live editable Fields under BR-4 today

State plainly in the amendment that AC-4b is deferred and why, so nobody reads the split as the
criterion being quietly weakened.

--- AMENDMENT A-2: PembayaranSheet ---

app/components/PembayaranSheet.tsx has three bare editable fields — Jumlah (:203), the "Lainnya"
method description (:248), and Notes (:294). It appears in NONE of PRD-8's inventory, the release
plan's rollout table, AC-7's allow-list, or the Lead's audit surface. Four documents missed the
same file simultaneously. **Its absence from the inventory is the actual defect here.**

It matters because BR-7 says "the money field is the proof case, not the cleanup item… every rupiah
entry point is a field box" — and Jumlah is where Mom types a payment amount, from both the return
screen and the rental detail screen. It is plausibly her second-most-frequent money entry in the app.

Farrel's decision, 2026-07-25: fold it into v1.0.5 (option A). Record in the PRD:

  - The three fields, with their line numbers, added to the inventory.
  - That it is a SHARED COMPONENT consumed by four screens: RentalDetailScreen and
    PengembalianScreen (in scope) plus HutangDetailScreen and DetailSewaScreen (out of scope).
  - The distinction the whole decision rests on: the two out-of-scope screens CHANGE APPEARANCE
    inside the sheet while their source changes by ZERO lines. That is not a fence breach — the
    debt #4 fence guards DetailSewaScreen's own source and its tariff math. A future reader must
    not be able to mistake this for the fence being reopened.
  - That AC-7's allow-list therefore stays at exactly two entries. Folding the sheet in was the
    only resolution that does not grow it.

--- CONSTRAINTS ---

- Amend the PRD only. Write no code, touch no release plan, touch no report.
- Do not renumber or reword any existing BR or AC beyond the AC-4 split itself.
- Do not resolve PRD-8's other open questions — OQ-1 through OQ-4 were already decided by Lead as
  D-1 through D-4 and approved by Farrel; leave them.
- If you think either amendment is wrong, say so before writing it rather than writing it and
  hedging.

--- ONE MORE THING, DO NOT FOLD INTO EITHER AMENDMENT ---

A rental-math review during delivery surfaced four pre-existing behaviour observations on
PengembalianScreen. They are NOT v1.0.5's business — guards 3 and 4 forbid touching behaviour this
release, and none was introduced by it. The sharpest one is a real money defect:

  Terapkan is repeatable and its fuel-suggestion row never dismisses, so TWO TAPS APPEND TWO
  "Bensin" LINES AND DOUBLE-CHARGE. (applyFuelSuggestion at PengembalianScreen.tsx:305-312 appends
  unconditionally; the row's render condition at :663 depends only on bensinKembali vs
  kondisiKeluar.bensinKotak, never on whether a line was already added.)

The other three: an empty "Tambah Biaya" row is persisted to the server as a junk line item; clearing
"Harga bensin / kotak" silently reverts to Rp 5.000 with nothing on screen saying so; and
parseRupiahInput accepts "-" but every onChangeText strips to digits, so the "−" Mom sees on a Bensin
line cannot be typed or hand-corrected — her only recourse is the trash icon.

Farrel has accepted the recommendation NOT to fix these in v1.0.5. Full detail is in
docs/reports/v1-0-5.md under "③'s observations for Product". Acknowledge you have seen them and say
where you think they belong — most likely folded into PRD-6, which is already licensed to change
this screen's behaviour. Do not write that PRD now.

Note for whoever eventually fixes the double-charge: the v1.0.5 characterisation suite does NOT pin
this behaviour, so the fix has no "before" protection and will need its own.
```

---

## APPENDIX B — Immediately actionable checklist for the resuming Lead

1. Confirm branch/HEAD: `v1.0.5-which-fields-you-can-change` at `b25e42d`, tree clean.
2. Re-measure the baseline yourself before dispatching: **52 suites / 283 tests**, **lint 122**, `tsc` 0.
   (`pnpm test` and the eslint JSON one-liner in `docs/reports/v1-0-5.md` § Pre-execution state. **Never
   `pnpm run lint`** — it auto-fixes.)
3. Hand Farrel the Appendix A prompt for a `/product` session (blocks ⑦, not ④).
4. **Dispatch ④** — `developer-frontend`, model `sonnet`, brief exactly as written in
   `docs/reports/v1-0-5.md` § "④ `developer-frontend` #1", amended by **RG-1** (`PembayaranSheet` folded in)
   and **C-1** (`RupiahInput`'s only production consumer is `HutangFormScreen:16`/`:132` — **not** the fenced
   screens, which carry a local `parseRupiahInput` *function*, a different thing entirely).
5. Add to ④'s or ⑤'s brief: **mutation-verify the repaired amber test** (open thread 1).
6. After each dispatch: **re-run tests and lint yourself**; never quote the agent's numbers.
7. Keep filling in `docs/reports/v1-0-5.md` — it is the record, and every decision gets `[by-agent]` or
   `[by-Farrel]`.
