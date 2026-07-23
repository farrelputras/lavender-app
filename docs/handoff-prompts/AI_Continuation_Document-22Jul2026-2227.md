# PROJECT CONTINUATION DOCUMENT
## v1.0.4 Lead session (resumed) — 22 July 2026, 22:27 (Asia/Jakarta)

> **You are resuming as `/lead` mid-release.** All five planned steps ①–⑤ are **complete**. The release
> is halted at **one open decision**, deliberately, by Farrel. Nothing is broken. All product code is
> committed. **Two tests are red on purpose and must stay red until the decision is made.**

---

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`lavender-app`)
- **What This Project Is:** An internal Android vehicle-rental operations tool for Farrel's mother's
  business. Two users: **Mom** (`ops`, the primary daily operator) and **Farrel** (`admin`). Not on the
  Play Store — the APK is sideloaded and updates ship over-the-air (OTA).
- **Primary Objective (v1.0.4):** Make the app usable on Mom's actual phone — Poco M3, MIUI, 3-button
  navigation, OS text size "XL". Two P0 defects, both from screenshots she sent 2026-07-21
  (`docs/mom-ss/`).
- **Strategic Intent:** A real business tool, not a demo. Mom runs the entire rental business through it
  during handovers. A blocked button or a misread rupiah figure is a business problem the same day.
- **Hard Constraints:**
  - **OTA-only.** No migration, no Edge Function, no native dependency. `app.json` `version` **stays
    `1.0.0`**. ⚠️ Bumping it would target the OTA at a runtime Mom's installed APK does not report —
    **she would silently stop receiving updates forever.** The displayed version comes from a JS
    constant, `app/config/release.ts` (now `"1.0.4"`).
  - **Presentation only.** No rental math, no connector, no value may change.
  - `docs/prd/PRD-4-*.md` and `docs/prd/PRD-5-*.md` are the **authoritative requirements.** The release
    plan and any brief are secondary to them.
  - Portrait is locked (`app.json:6`) — left/right insets are out of scope.
  - **`/lead` never opens, reads, writes, or edits code.** It works from reports and specs and writes
    only `docs/reports/`. (Running `git` commands for verification is established practice and is not
    "opening code".)

---

### 2. WHAT EXISTS RIGHT NOW

**✅ Built, verified, and committed — three commits on `v1.0.4-fits-moms-phone`, nothing pushed,
`master` untouched:**

| SHA | Contents |
|---|---|
| `bb07bb6` | **PRD-4 (space)** — 25 app files: `useBottomSpace`, `useBottomBarPadding`, `tabBarMetrics`, `mockSafeAreaInsets`, 14 screens + 4 bar sites |
| `91533bd` | Docs through step ③ |
| `2604876` | **PRD-5 (text)** — 35 files: `AppText.tsx` clamp wrapper, import redirect across 27 files, layout fixes on 11 screens, `release.ts` → `"1.0.4"`, diagnostic footer |

**Steps, all complete:** ① discovery · ② PRD-4 · ③ fence check on ② (**PASS**) · ④ PRD-5 · ⑥ second fence
check on ④ (**PASS**) · ⑤ tester.

**Gates as they stand — every number independently re-verified by Lead, not quoted from an agent:**

| Gate | Value |
|---|---|
| `npx tsc --noEmit` | clean |
| `pnpm test` | **50 suites / 237 tests — 2 failing by design** (was 32/174 at release start) |
| Lint (real, non-`prettier`) | **122** — down from the **159** baseline. This release **pays down** debt #6 |
| Fences | **zero** changes under `app/services/`, `supabase/`; `app.json` untouched |

**⚠️ Uncommitted (working tree):** ⑤'s **14 new test-only files** (12 suites + `test/findStyledAncestor.ts`
+ `test/listAppSourceFiles.ts`), `docs/reports/v1-0-4.md`, and `docs/reports/v1-0-4-visual-audit.md`.
**No product code is uncommitted.**

**🔴 Halted on one decision — see §4.** The BR-1 miss on `SearchField` + `RupiahInput`.

**Not started:** Farrel's 14-screen device walk-through · `pnpm ota:publish` · Mom's confirmation ·
the post-execution sections of `docs/reports/v1-0-4.md` · the PRD-4 amendment Product owes.

---

### 3. ARCHITECTURE & TECHNICAL MAP

**Stack:** Expo SDK 55 (dev-client) · React Native **0.83.6** · React **19.2.0** · **Ignite** boilerplate
with React Navigation (**NOT** Expo Router) · TypeScript strict · Supabase v2 · EAS Build (APK) + Expo
Updates (OTA, channel `preview`, runtime `1.0.0`).

**Key paths:**

| Path | What |
|---|---|
| `apps/lavender-ops-mobile/` | The mobile app. **Run every command from here, never the monorepo root.** |
| `app/components/AppText.tsx` | **New this session** — the PRD-5 clamp. `MAX_FONT_SCALE = 1.5`, one definition site |
| `app/utils/useBottomSpace.ts`, `useBottomBarPadding.ts` | PRD-4's shared vehicle |
| `app/navigators/tabBarMetrics.ts` | `TAB_BAR_BASE_HEIGHT = 70`, extracted to break a circular import |
| `test/mockSafeAreaInsets.ts`, `test/findStyledAncestor.ts`, `test/listAppSourceFiles.ts` | Test helpers |
| `app/theme/tokens.ts` | What screens import for `colors`/`spacing`/`textStyles` |
| `docs/prd/` | **Authoritative requirements** |
| `docs/releases/v1-0-4.md` | Scope, waivers, guards |
| `docs/reports/v1-0-4.md` | **THE RELEASE RECORD. Read this first — it has everything.** |
| `docs/reports/v1-0-4-visual-audit.md` | **The checklist Farrel walks.** The release's main artifact |
| `docs/known-technical-debt.md` | Standing debt register |

**The agent system.** Roles are files. `/product`, `/pm`, `/lead` are **session skills**;
`developer-backend`, `developer-frontend`, `tester`, `rental-math-reviewer`, `connector-contract-reviewer`
are **subagents** with models pinned in `.claude/agents/`. Playbooks in `docs/agents/`. Lead runs gated:
plan → halt for Farrel → execute.

**How this release flowed:**

1. `/lead` wrote the plan into `docs/reports/v1-0-4.md`, halted, Farrel approved.
2. ① `developer-frontend` read-only discovery → re-gate on the clamp mechanism.
3. ② same agent implements PRD-4 (space).
4. ③ `rental-math-reviewer` fence-checks the two math screens → PASS.
5. ④ fresh `developer-frontend` implements PRD-5 (text).
6. ⑥ **second** `rental-math-reviewer` pass on ④'s diff → PASS. *(Added this session — not in the
   original plan. ④ touched the fenced files and self-certified; role separation says it doesn't get to.)*
7. ⑤ `tester` — automatable ACs + the visual-audit checklist. **← Found the open defect.**
8. **← YOU ARE HERE.** Decision → walk-through → `pnpm ota:publish` → Mom confirms.

**Model routing:** Lead = Fable high → **Opus xhigh** (sanctioned fallback; **never Sonnet**).
`developer-frontend` + `tester` pinned `sonnet`. **If a developer's Sonnet is unavailable, stop and hand
to Farrel — never substitute a larger model for a developer.**

**External dependencies:** Supabase project `tuufzjxoprjsrrkagncz` — **untouched by this release.**

---

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

#### 🔴 THE OPEN DECISION — read this first

**`components/form/SearchField.tsx` (`height: 48`) and `components/form/RupiahInput.tsx` (`height: 52`)
still pin a fixed height around a scalable `TextInput`** — a live **PRD-5 BR-1** failure. `git diff` shows
both received **only the import-line redirect**, nothing else.

**This is the exact miss the brief predicted.** Discovery's finding **F-10** named `SearchField.tsx:60-67`
as *"the highest-leverage single target in PRD-5 — one fix helps four screens; one miss repeats on four,"*
and ④'s brief repeated it verbatim under that heading. ④ missed it anyway. **Naming a risk in a brief does
not discharge it.**

**Blast radius:** `SearchField` → RentalScreen, PilihUserScreen, PilihKendaraanScreen, UserScreen.
`RupiahInput` → HutangFormScreen, UserFormScreen, and indirectly DetailSewaScreen / PengembalianScreen.

**Two tests are red against it** (`app/components/form/fixedHeightTextRow.acceptance.test.tsx`) and
**must stay red.** ⑤ was briefed to derive "correct" from the PRD, not the implementation; it wrote the
assertion BR-1 demands, watched it fail, and left it failing. **Do not weaken or delete these tests to
get a green suite.**

**Honest caveat that makes this a decision rather than an emergency:** RN's default `overflow: visible`
means taller text **spills past** the pill rather than being truncated. That is a *different* failure mode
from the flagship clips — arguably just as broken-looking (text escaping a rounded background) — and
**only a device settles whether it is visible.**

**Options as put to Farrel (he paused instead of choosing):**

| Option | Lead's read |
|---|---|
| **Fix now, one targeted dispatch** | **Recommended.** `height` → `minHeight` + `flexShrink` on two components, plus `UserDetailScreen`'s three unaudited buttons. The same closed-set change already applied 7 times this release and already reviewed as a pattern. Turns both tests green and closes the last *known* BR-1 instance before a 14-screen device walk-through. |
| **Ship as-is, add to the visual audit** | Defensible — `overflow: visible` may make it invisible. But it spends Mom's attention twice if wrong. |
| **Fix `SearchField` only** | Leaves a known BR-1 instance in the **money-entry** field. |

⚠️ **If it is fixed, checklist rows A3, I5, and I6 change meaning. Settle this before walking the list**,
or the walk-through measures a build that isn't the one that ships.

#### Approved decisions — all `[by-Farrel]`, do not re-litigate

| # | Decision |
|---|---|
| D-0 | Discovery pass first, implementation plan after, re-gate before any code |
| D-1a | **`MAX_FONT_SCALE = 1.5`** |
| D-1b | **Yes** to a `fontScale` + inset diagnostic line in the Beranda footer (removed next release) |
| D-3 | **Farrel runs the 14-screen visual audit himself** at XL text + 3-button nav. The tester authors the checklist; it does **not** drive an emulator |
| D-4 | Lint ceiling **+10 cumulative (169)**. v1.0.4 briefed at **+0** — *actual result was −37* |
| D-5 | **Clamp mechanism = Option 4**, the API-identical passthrough wrapper |
| D-6 | **PRD-4 and PRD-5 ship together.** Splitting reconsidered on new evidence and declined |
| **D-7** | **BR-1 beats BR-5 where an identifier is truncated.** ④ removed `numberOfLines={1}` from customer names, vehicle names, and plates — which *does* change default-scale rendering (a long name now wraps, making cards taller). A truncated plate is wrong at **any** scale; **BR-3 says the layout gives way, not the identifier.** Cost booked as a default-scale audit row (checklist §E), not waived |
| — | Lead commits step-by-step so each dispatch's diff stays separable |

#### What this session did

1. **Resumed from the 19:05 handoff**, re-verified tree state rather than trusting it.
2. **Committed ②'s work** (`bb07bb6` + `91533bd`) — *why it had to happen before ④:* ④'s import redirect
   lands on the same screen files, and ③'s fence check was only tractable because ②'s diff was isolated.
3. **Dispatched ④** with the brief extended by the Beranda resolution, ②'s handoff facts, and the pre-paid
   traps. Returned green: 38/201, lint 159 → 122.
4. **Escalated two calls rather than deciding alone** — the second fence check, and BR-1 vs BR-5 (→ D-7).
5. **Dispatched ⑥**, the second fence check, with the diff pre-generated as a file (the reviewer has no
   Bash tool). **PASS.**
6. **Committed ④'s work** (`2604876`).
7. **Dispatched ⑤**, which found the open defect.
8. **Persisted the checklist** to `docs/reports/v1-0-4-visual-audit.md` — see §5, it nearly evaporated.

#### Findings worth not re-deriving

- **A kill-criterion bit in a form nobody predicted.** The expected failure
  (`Animated.createAnimatedComponent(Text)`) doesn't exist in the codebase. What broke is that RN's
  `TextInput` is a **class**, so the bare identifier is used in **type position** —
  `useRef<TextInput>(null)` at `PilihUserScreen.tsx:121`, `UserScreen.tsx:107` — and would stop compiling
  against a bare `forwardRef` const. Fixed by exporting a **merged value + type** from `AppText.tsx`.
  Grepping for value-position patterns would never have surfaced it.
- **The lint delta is a completeness proof, free.** `no-restricted-imports` **37 → 0** means the redirect
  reached *every* raw `Text`/`TextInput` site; a partial adoption would leave a remainder. Every other
  rule count is byte-identical.
- **⑤ caught a test that passed for the wrong reason.** A naive single `.parent` hop from the `TextInput`
  host node lands on **`AppText`'s own wrapper**, whose style is the *input's*, not the container's — so
  the check examined the wrong node and reported green. It noticed the pass was suspicious and built
  `test/findStyledAncestor.ts`. **A test that passes for the wrong reason is worse than no test**, and
  this one would have hidden the exact defect it was written to find.
- **⑥ verified the evidence Lead handed it.** Lead generated the diff it reviewed — a real conflict of
  interest. Rather than trusting it, ⑥ counted the `+`/`−` lines and reconciled them against magnitudes
  Lead measured separately, then checked seven hunk offsets against the files on disk, *then* reviewed
  content. It also stated a limit (it couldn't speak to files outside the patch, naming `rentalMath.ts`)
  and handed it to Lead, who closed it: **`rentalMath.ts` is not in ④'s change set at all.**
- **The stop-at-8 checkpoint was exceeded (11 of 14 screens) and ④ disclosed it unprompted.** Lead
  ratified on evidence: every edit is a 1–6 line change from a closed set, no screen re-laid-out, and ⑤
  independently confirmed it (3 of the 14 got *only* the import redirect). **The threshold was written in
  units that drift** — "screens needing structural rework" — and the lesson is to write it in units that
  can't.
- **Count correction:** ④ said it fixed the CTA pattern on "6 buttons across 3 files"; ⑤'s independent
  enumeration says **7 across 4 files**.

#### Discussed but NOT implemented

- **Product owes PRD-4 an amendment.** Its third problem-statement bullet (Beranda "0 pelanggan" clipped
  by the tab bar) was **proven not to be a defect** — a scroll fold at offset ≈ 0, not a clip. Same shape
  as v1.0.3's PRD-1 BR-5/AC-5 amendment. **The PRD must be corrected, not quietly worked around.**
- **Debt-register entries owed on ship** (all logged in the report, none written to
  `known-technical-debt.md` yet): the debt-#4 addendum for the local bottom bars *and* `btnLabel` now
  duplicated in both math screens · the `theme/tokens.ts` ↔ `theme/typography.ts` duplication · the
  `Platform.ios` jest-mock trap · the two `docs/02` §6 divergences · the tester-artifact-persistence
  workflow gap.
- **⑤'s test files are uncommitted.**

---

### 5. WHAT COULD GO WRONG

**The release's defining constraint — the verification story is inverted from v1.0.3.** v1.0.3 verified
against production *before* the OTA. Here **every** acceptance criterion that matters is visual and
device-specific, and **the only route onto Mom's device is the OTA itself.** The honest sequence is
**publish → Mom relaunches → confirm**, and **"shipped" is not claimable until she has confirmed.**

**Traps that will cost hours if rediscovered:**

- **`Text.defaultProps` is dead.** Verified two ways: the automatic JSX runtime has **zero**
  `defaultProps` handling, **and** `forwardRef` explicitly rejects it (`react.development.js:1080-1084`).
  The internet's standard global-clamp recipe **fails silently**. This is why Option 4 exists.
- **`Platform.select()` cannot be influenced by reassigning `Platform.OS` in a test.** jest-expo's preset
  (`haste.defaultPlatform: 'ios'`) loads `Platform.ios.js`, whose `select` prefers `spec.ios` by *file
  identity* and never reads `.OS`. The only working mock:
  ```js
  jest.mock("react-native/Libraries/Utilities/Platform.ios", () => ({
    __esModule: true,
    default: { OS: "android", select: (spec) => spec.android ?? spec.default },
  }))
  ```
  Mocking the whole `"react-native"` package via `{...jest.requireActual("react-native"), Platform: …}`
  **crashes** — spreading forces RN's lazy getters to evaluate eagerly and `DevMenu` throws.
- **Always run jest/eslint from `apps/lavender-ops-mobile`, never the monorepo root.** A root run resolves
  a different config and sweeps in a stale `.worktrees/` tree, reporting a wall of failures in files
  nobody touched. It cost v1.0.3 a detour immediately before a production push.
- **`react-native/no-inline-styles` flags a property only when its value is a `Literal`.** `insets.bottom`
  is a `MemberExpression` and is **not** flagged. But **mixing a literal into the same object** *is*
  (`{paddingBottom: insets.bottom, marginTop: 8}`). ④ hit this 8 times and hoisted them out. The `useMemo`
  practice is **hygiene, not a lint requirement.**
- **RN's default `flexShrink` is `0`, not web CSS's `1`.** The mechanism behind the fused
  `22 JuliSisa Rp 50.000`.
- **RN's default `overflow` is `visible`.** A fixed-height row with taller text **spills** rather than
  clipping — relevant to the open BR-1 decision.
- **The lint count is `122`, not ~27,500.** `pnpm run lint` **auto-fixes** — do not use it to count. Use:
  ```powershell
  $j = npx eslint . --format json | ConvertFrom-Json
  $msgs = $j | ForEach-Object { $_.messages } | Where-Object { $_.severity -eq 2 }
  $msgs | Where-Object { $_.ruleId -ne 'prettier/prettier' } | Measure-Object
  ```
  27,385 of the raw total are phantom `prettier/prettier` CRLF noise.

**Known gaps / debt:**

- **`DetailSewaScreen` + `PengembalianScreen` have zero automated coverage of any kind**, and they hold
  *Simpan Rental* — so **PRD-4 AC-1's automated coverage is zero.** Everything resting on it is a code
  review or a human check. Both ④ and ⑤ declined to build the harness (camera, tariff, session mocking on
  two fenced 45–50KB files, for a presentation-only sweep) and Lead agreed. **This is why both fence
  checks were load-bearing, not ceremonial.**
- **"Renders without throwing at 1.5×" is a JS-crash guard, not a rendering proof.**
  `react-test-renderer` performs no text layout, so mocking `PixelRatio.getFontScale()` has *no effect on
  the tree* for any component that doesn't read that API (only `VersionFooter` does). ⑤ said so in every
  file header. 12 of 14 screens now have such a test — up from 1 of 14.
- **`UserDetailScreen`'s three action buttons** (`WhatsApp`, `Hapus User`, `Hapus Permanen`) carry the
  same fixed-height CTA pattern fixed on 7 other buttons, and the screen got **zero** PRD-5 attention.
  **The one CTA row nobody looked at.** Checklist item C5.
- **PRD-4 BR-4 is knowingly only partly met** — three local bottom bars got a local patch instead of
  migrating onto the shared `BottomActionBar` (waiver, Farrel 2026-07-22, because that migration *is*
  debt #4's fenced refactor). **This grows debt #4.**
- **The checklist nearly evaporated.** ⑤'s harness forbids it from writing `.md` files, so the release's
  main artifact existed **only inside a returned subagent message.** Lead persisted it. **An artifact that
  exists in exactly one volatile place is not delivered** — fix the tester brief or the playbook.

**Assumptions that could be wrong:**

- ❓ **`MAX_FONT_SCALE = 1.5` is a deliberate over-cap, not a measurement.** MIUI's "XL" is a slider label.
  **D-1b's diagnostic footer line is the only thing that measures it** — it prints `fontScale` + inset on
  Beranda. **Ask Mom for a screenshot after she relaunches.** If her real scale exceeds 1.5, the cap is
  wrong.
- ❓ **PRD-4 AC-6 (keyboard) cannot be settled from source.** `KeyboardAvoidingView` is a **no-op on
  Android** (`behavior={undefined}`), so keyboard handling is Android's native window resize. Whether
  inset padding produces a floating gap depends on whether `useSafeAreaInsets()` changes while the IME is
  up. **Device-only check** — checklist §F.
- ❓ **The wrap-alignment change is unverified.** `flexWrap` on a `space-between` row means that once a
  label and an amount fall onto separate lines, the amount **left-aligns** instead of right-aligning.
  Cosmetic, real, and **invisible in any 1.0× screenshot.** Checklist §D.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1. Files are the handoff contract, and roles do not overlap.** `docs/prd/` → `docs/releases/` →
`docs/reports/`. `/lead` orchestrates and **never opens code**; developers never review their own work;
reviewers never write product code. A single pass misses what role separation catches. **This release
produced the clearest evidence yet: ④ delivered every gate green — compile clean, tests up, lint down 37 —
and the gate it passed was missing the check that mattered. ⑤, deriving "correct" from the PRD rather than
the code, found it in one pass.** Four separate agents corrected Lead this release (a lint rule, a layout
instruction, a misdiagnosed screenshot, a missed component).

**2. The most common mistake: trusting a document instead of the code — or a description instead of the
artifact.** Farrel's standing instruction, binding on every brief:

> **Verify against the codebase, not the plan.** Read the actual file before acting on any claim about it.
> Where reality diverges, **report the divergence** — do not silently follow either one.

The sharpest instance: an entire release chain reasoned about a defect from **prose describing a
screenshot nobody had opened.** Product's reading was good-faith and wrong, and it propagated unchallenged
through discovery, planning, implementation, and review. The fix cost one instruction: *"look at the
pixels first."* **When the evidence is an image, open the image.**

**3. What looks refactorable but must NOT be touched:**

- **`DetailSewaScreen.tsx` and `PengembalianScreen.tsx`** (48KB/50KB, containing a private copy of the
  design system — this is debt #4, and it *looks* like an obvious cleanup). They are tariff composition
  and fuel-adjustment/auto-debt math; `docs/02` §6 says they **must be correct**. Any migration onto the
  shared components needs **its own release**, characterisation tests on the math **first**, and a
  `rental-math-reviewer` pass. "Just swap in the shared component" is how a safe OTA becomes a silent
  money bug.
- **The whole-repo lint fix.** Never run `eslint --fix` or `prettier --write` across this repo — it would
  rewrite every file's line endings including the two protected math screens, producing an unreviewable
  diff over the most dangerous code in the app. The real count is 122; the fix is a dedicated
  `.gitattributes` commit reviewed as whitespace-only (debt #6a).
- **`useBottomSpace()`'s tabbed/non-tabbed branch**, which today reduces to `insets.bottom` on both paths
  and looks redundant. It keeps the hook correct if `MainNavigator`'s `bottom + 70` formula ever changes.
- **`app/services/api/`** (dead Ignite apisauce demo) — parked for v1.1 as the future HTTP client.

---

### 7. DO NOT TOUCH LIST

- **Do NOT weaken, skip, or delete the 2 failing tests** in
  `app/components/form/fixedHeightTextRow.acceptance.test.tsx`. They are a correct PRD-5 BR-1 assertion
  against product code that does not yet satisfy it. **Fix the product or record the waiver — never the
  test.**
- **Do NOT bump `version` in `app.json`.** It stays `1.0.0`. Mom would silently stop receiving OTA updates.
- **Do NOT run `eslint --fix`, `prettier --write`, or any formatter/codemod** anywhere in this repo.
- **Do NOT touch rental math, connectors, or any value.** This release is presentation-only.
- **Do NOT migrate the three local bottom bars onto `BottomActionBar`.** Explicit waiver; debt #4's fence.
- **Do NOT add inset padding to `EditActionBar`.** It renders inline mid-scroll.
- **Do NOT unify `theme/tokens.ts` with `theme/typography.ts`.**
- **Do NOT reduce headline sizes at default scale** (PRD-5 OQ-2, deferred) — it would breach BR-5/AC-6.
- **Do NOT add a native dependency.** It breaks OTA-only and becomes a different release. Escalate.
- **Do NOT run jest or eslint from the monorepo root.**
- **Do NOT push, merge, or touch `master`.** Work stays on `v1.0.4-fits-moms-phone`.
- **Do NOT commit without Farrel asking.** Lead has committed step-by-step this release, each time on his
  explicit call.
- **Do NOT dispatch a subagent before Farrel has approved the plan.** The v1.0.4 plan **is** approved; this
  governs new work.
- **Do NOT substitute a larger model for a developer subagent.** If Sonnet is unavailable, stop and hand
  to Farrel.
- **Do NOT mock a Supabase failure as `new Error(...)` in tests.** Supabase returns a plain object
  `{message, details, hint, code}`. Standing rule; no backend leg in this release.

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence |
|---|---|
| §1 Project identity | ✅ HIGH — from `CLAUDE.md` + the PRDs, re-read this session |
| §2 Current state | ✅ HIGH — `git log`, `git status`, `tsc`, `jest`, and `eslint` all **run by Lead this session**; every agent-reported number independently re-measured |
| §3 Architecture | ✅ HIGH for paths/stack; ⚠️ MEDIUM for the broader agent system (carried from `CLAUDE.md`) |
| §4 The open BR-1 decision | ✅ HIGH — the 2 test failures reproduced by Lead directly |
| §4 Steps ①–⑥ outcomes | ✅ HIGH — all gate numbers re-verified, not quoted |
| §4 Approved decisions | ✅ HIGH — all captured `[by-Farrel]` in-session |
| §5 Traps (`defaultProps`, `Platform.select`, jest cwd, lint counting) | ✅ HIGH — each proven by a real failure or source citation |
| §5 `MAX_FONT_SCALE = 1.5` adequacy | ❓ **LOW** — a deliberate over-cap, not a measurement. The diagnostic footer exists to close this |
| §5 AC-6 keyboard behavior | ❓ **LOW** — cannot be determined from source; needs the device |
| §5 Wrap-alignment visual impact | ⚠️ MEDIUM — mechanism certain, visual consequence unverified |
| §5 Whether the BR-1 miss is *visible* | ⚠️ MEDIUM — source-level fact certain; `overflow: visible` means the visual consequence is device-only |
| §6 Design philosophy | ✅ HIGH — consistent across v1.0.2/v1.0.3/v1.0.4 records |

---

## IMMEDIATE NEXT ACTION

**Settle the BR-1 decision in §4** — it is the only thing blocking the release, and it changes the meaning
of checklist rows A3, I5, and I6. Lead recommends **one targeted `developer-frontend` dispatch**:
`height` → `minHeight` + `flexShrink` on `SearchField.tsx` and `RupiahInput.tsx`, plus `UserDetailScreen`'s
three unaudited buttons — the same closed-set change already applied 7 times this release. Then re-verify
all four gates and confirm the 2 red tests go green.

**Then, in order:** commit ⑤'s test files (Farrel's call) → Farrel walks
`docs/reports/v1-0-4-visual-audit.md` on his device at XL text + 3-button nav → `pnpm ota:publish` →
**ask Mom for a Beranda screenshot showing the diagnostic `fontScale · inset` line** → Mom confirms the
rental list reads unambiguously → fill in the report's post-execution sections, write the debt-register
entries, and hand Product the PRD-4 amendment.
