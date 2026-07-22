# PROJECT CONTINUATION DOCUMENT
## v1.0.4 Lead session — 22 July 2026, 19:05 (Asia/Jakarta)

> **You are resuming as `/lead` mid-release.** The release is **Phase 2, step ④ of 5**. Steps ①–③ are
> done and green. Step ④ was dispatched and **killed by Farrel after ~1 minute** (context budget, not a
> problem with the work). Nothing is broken. Nothing is committed.

---

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`lavender-app`)
- **What This Project Is:** An internal Android vehicle-rental operations tool for Farrel's mother's
  business. Two users: **Mom** (`ops`, the primary daily operator) and **Farrel** (`admin`). Not on the
  Play Store — the APK is sideloaded, and updates ship over-the-air (OTA).
- **Primary Objective for this release (v1.0.4):** Make the app usable on Mom's actual phone (Poco M3,
  MIUI, 3-button navigation, OS text size "XL"). Two P0 defects, both found in screenshots she sent on
  2026-07-21 (`docs/mom-ss/`).
- **Strategic Intent:** This is a real business tool, not a demo. Mom runs the whole rental business
  through it during handovers. A blocked button or a misread rupiah figure is a business problem the
  same day.
- **Hard Constraints:**
  - **OTA-only release.** No migration, no Edge Function, no native dependency. `app.json` `version`
    **stays `1.0.0`**. ⚠️ Bumping it would target the OTA at a runtime Mom's installed APK does not
    report — **she would silently stop receiving updates forever.** The displayed version comes from a
    JS constant (`app/config/release.ts`) instead.
  - **Presentation only.** No rental math, no connector, no value may change.
  - `docs/prd/PRD-4-*.md` and `docs/prd/PRD-5-*.md` are the **authoritative requirements**. The release
    plan and any brief are secondary to them.
  - Portrait is locked (`app.json:6`), so left/right insets are out of scope.

---

### 2. WHAT EXISTS RIGHT NOW

**✅ Built and working (this session):**

- **Step ① Discovery** — read-only investigation. Complete, findings recorded.
- **Step ② PRD-4 (space)** — the Android system-nav fix. **Code complete, verified green, UNCOMMITTED.**
  - `pnpm test` → **34 suites / 184 tests green** (baseline was 32/174)
  - `pnpm run compile` → clean
  - Lint → **159 → 159, +0 exactly**, every rule count identical row by row
  - `git diff --stat` → 19 modified + 6 new, **+230/−39**; zero changes under `app/services/` or
    `supabase/`; `app.json` untouched
  - **All four numbers independently re-verified by Lead**, not quoted from the agent.
- **Step ③ `rental-math-reviewer` fence check** — **PASS**. Plus Lead closed the one gap it flagged.
- **Beranda diagnostic** — resolved a blocker; see §4.

**⚠️ Partially built:**

- **Step ④ PRD-5 (text)** — dispatched with a full brief, **killed after ~1 minute**. It had only
  confirmed file counts. **It changed nothing and committed nothing.** The brief is reproduced in
  `docs/reports/v1-0-4.md`; re-dispatch is straightforward.

**🔴 Blocked / awaiting Farrel:**

- **Nothing technically blocked.** Two decisions are open — see §4 "Open threads".

**Not started:**

- **Step ⑤ `tester`** — automatable ACs + the 14-screen visual-audit checklist Farrel will walk.
- **Publish** (`pnpm ota:publish`) → Mom relaunches → Mom confirms. **This is the last gate and it is
  only reachable after publish** — see §5.

---

### 3. ARCHITECTURE & TECHNICAL MAP

**Stack:** Expo SDK 55 (dev-client) · React Native **0.83.6** · React **19.2.0** · **Ignite** boilerplate
with React Navigation (**NOT** Expo Router) · TypeScript strict · Supabase (`@supabase/supabase-js` v2)
· EAS Build (APK) + Expo Updates (OTA).

**Key paths:**

| Path | What |
|---|---|
| `apps/lavender-ops-mobile/` | The mobile app. **Run every command from here, never the monorepo root.** |
| `app/screens/` | All 15 screens |
| `app/components/form/` | The shared form library actually in use |
| `app/utils/useBottomSpace.ts`, `useBottomBarPadding.ts` | **New this session** — PRD-4's shared vehicle |
| `app/navigators/tabBarMetrics.ts` | **New this session** — `TAB_BAR_BASE_HEIGHT = 70`, extracted to break a circular import |
| `test/mockSafeAreaInsets.ts` | **New this session** — reusable insets test helper |
| `app/theme/tokens.ts` | What screens actually import for `colors`/`spacing`/`textStyles` |
| `app/theme/typography.ts` | Ignite's parallel copy of the **same** type scale (see §5) |
| `docs/prd/` | PRDs — authoritative requirements |
| `docs/releases/v1-0-4.md` | The release plan (scope, waivers, guards) |
| `docs/reports/v1-0-4.md` | **THE RELEASE RECORD. Read this first — it has everything.** |
| `docs/known-technical-debt.md` | Standing debt register |

**The agent system.** Roles are files: `/product`, `/pm`, `/lead` are **session skills**;
`developer-backend`, `developer-frontend`, `tester`, `rental-math-reviewer`,
`connector-contract-reviewer` are **subagents** with models pinned in `.claude/agents/`. Playbooks live
in `docs/agents/`. **`/lead` never opens code** — it works from reports and specs, and writes only
`docs/reports/<version>.md`. It runs gated: plan → halt for Farrel → execute.

**How this release flows end-to-end:**

1. `/lead` reads the release plan + PRDs, writes the plan into `docs/reports/v1-0-4.md`, **halts for
   Farrel's approval**.
2. ① `developer-frontend` does read-only discovery → Lead re-gates with Farrel on the mechanism.
3. ② `developer-frontend` implements PRD-4 (space).
4. ③ `rental-math-reviewer` fence-checks the two math screens.
5. ④ `developer-frontend` (fresh agent) implements PRD-5 (text). ← **YOU ARE HERE**
6. ⑤ `tester` runs the suite and authors the visual-audit checklist.
7. Farrel walks the visual audit → publishes OTA → Mom confirms.

**External dependencies:** Supabase project `tuufzjxoprjsrrkagncz` (**untouched by this release**), EAS
Update channel `preview`, runtime `1.0.0`.

---

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

#### Approved decisions (all `[by-Farrel]`, do not re-litigate)

| # | Decision |
|---|---|
| D-0 | Discovery pass first, implementation plan after it, with a re-gate before any code |
| D-1a | **`MAX_FONT_SCALE = 1.5`** |
| D-1b | **Yes** to a `fontScale` + inset diagnostic line in the Beranda footer (removed next release) |
| D-3 | **Farrel runs the 14-screen visual audit himself**, on his own device at XL text + 3-button nav. The tester does **not** drive an emulator; it authors the checklist Farrel walks |
| D-4 | Lint budget ceiling set at **+10 cumulative (169)**. v1.0.4 briefed at **+0** |
| D-5 | **Clamp mechanism = Option 4**, the API-identical passthrough wrapper |
| D-6 | **PRD-4 and PRD-5 ship together.** Splitting was considered on new evidence and declined |

#### The four things this session got wrong and corrected — read these, they prevent re-derivation

1. **Lead's lint rationale was false.** Lead claimed `style={{paddingBottom: insets.bottom}}` would be a
   new `react-native/no-inline-styles` violation "on every screen". **It is not.** The rule only flags a
   property whose value is a **`Literal`** (`eslint-plugin-react-native/lib/util/stylesheet.js:394-421`).
   `insets.bottom` is a `MemberExpression`. Proven against the codebase: `DetailSewaScreen.tsx:993`
   already has an inline `{ height: spacing.xxxl + 64 }` and is **absent from the 88 flagged sites**.
   The final lint delta was **+0**, confirming it. **The `useMemo` hoisting practice is still briefed —
   as hygiene, not as a lint requirement.**
2. **"Fix the shared screen scaffolding" had no vehicle.** **None of the 14 screens imports
   `app/components/Screen.tsx`** — only `ErrorScreen/ErrorDetails.tsx` does. Each hand-rolls
   `SafeAreaView edges={["top"]}`. `useBottomSpace()` **is** the shared fix; there is no second half.
3. **`EditActionBar` must NOT get inset padding.** It renders *inline mid-scroll* (`RentalDetailScreen.tsx:535,830`),
   never pinned to a screen edge. Padding it would inject a gap in the middle of a form. Left untouched
   deliberately.
4. **PRD-4's third reported defect is not a defect.** See below — this is the most important item here.

#### 🔑 The Beranda finding — one of Mom's three screenshots was misdiagnosed

PRD-4's problem statement, bullet 3, claims `docs/mom-ss/sewa-baru-text-too-big.jpeg` shows Beranda's
"0 pelanggan" line *"clipped by the tab bar; the list cannot scroll far enough to reveal it."*

A diagnostic agent **opened the image** (the first time in the release anyone had) and zoomed 3×:

- The screenshot is at **scroll offset ≈ 0** — the entire non-sticky header renders, which is only
  possible if the list was never scrolled.
- The cut falls where the card's white background meets the tab bar, **with no card border near it** —
  the card's real bottom edge is off-screen, not truncated.
- **It is a scroll fold, not a clip.**
- The other two screenshots show what a real overlay looks like (nav icons drawn *on top of* the
  "Simpan Rental" glyphs). **That pattern does not appear in the Beranda image.**

It also proved **the tab bar structurally cannot overlay content**: `BottomTabView.tsx` root is
`flexDirection: 'column'` (`:242-249`), the screens container is `{flex: 1, overflow: 'hidden'}`
(`:254-259, 362-365`), and the tab bar is the **next sibling in normal flex flow** (`:354-357`).
`MainNavigator.tsx:31` sets no `position: "absolute"`.

And it corrected Lead's own hypothesis by checking rather than confirming it: `statCard`
(`BerandaScreen.tsx:385-392`) uses **`minHeight: 128`**, not `height`, with no `overflow: 'hidden'` and
no `numberOfLines` — nothing there can clip.

**Consequences:**
- ②'s Beranda change (trailing spacer `32 + useBottomSpace()`) **stands and is not reverted** — it
  solves a real, separate trailing-clearance problem, just not this symptom.
- **No fix is owed by ② or ④.**
- **Product owes PRD-4 an amendment** (same shape as v1.0.3's PRD-1 BR-5/AC-5 amendment). Follow-up, not
  a blocker.
- **One line joins the visual-audit checklist:** on Mom's device at her font scale, scroll Beranda to the
  very bottom and confirm all four stat cards + the footer are reachable. The code says they are; a
  static image cannot prove it, and the agent said so rather than over-claiming.

> **The lesson.** Four agents and Lead reasoned about this defect for an entire release from *prose
> descriptions of an image nobody had opened*. Product's reading was good-faith and wrong, and it
> propagated unchallenged through discovery, planning, implementation, and review. Mom's *report* was
> real (her larger font pushes the grid down so she scrolls more) — our *diagnosis* was not.

#### What ② built (PRD-4)

- **`useBottomSpace(): number`** — returns an **additive delta** beyond each screen's zero-inset
  baseline. **Returns `0` at zero inset**, tab bar or not (this is AC-5/BR-5, unit-tested 5 ways).
  Reads `BottomTabBarHeightContext` directly, so the tabbed branch is testable by wrapping in the real
  Provider with nothing to mock.
  - **Why additive, not replacement — do not "simplify" this away.** Lead's brief said to pad tabbed
    screens by tab-bar height. The agent refused, correctly: React Navigation already excludes the tab
    bar from the screen viewport, so padding by its full height would add **~70px of dead whitespace on
    every zero-inset device** — a direct violation of PRD-4 **G4**.
  - It keeps the tabbed/non-tabbed branch even though both currently reduce to `insets.bottom`, so the
    hook stays correct if `MainNavigator`'s `bottom + 70` formula ever changes.
- **`useBottomBarPadding(): number`** = `Platform.select({ios: spacing.xl, default: spacing.base}) +
  useBottomSpace()`. Deliberately separate so the platform floor has one home and four trivial call sites.
- **`tabBarMetrics.ts`** — `TAB_BAR_BASE_HEIGHT = 70` extracted from `MainNavigator.tsx` **to break a
  circular import** (`useBottomSpace` ← `MainNavigator` ← every tabbed screen ← `useBottomSpace`).
- **`test/mockSafeAreaInsets.ts`** — `ZERO_INSETS`, `THREE_BUTTON_NAV_INSETS` (`{bottom: 48}`),
  `mockInsets()`.
- Four `Platform.OS === "ios" ? … : …` bar-padding sites replaced; all 14 screens' scroll clearance made
  inset-derived as `EXISTING_BASELINE + useBottomSpace()`; `LoginScreen`'s accidental all-edges
  `SafeAreaView` made explicit without changing rendered spacing.

**Zero-inset baselines (unchanged floors):** Beranda 32 · Rental 80 · Hutang 120 · User 120 · PilihUser
48 · PilihKendaraan 48 · HutangDetail 32 · UserDetail 32 · HutangForm 160 · UserForm 160 ·
RentalDetail/DetailSewa/Pengembalian 112.

#### What ③ verified

**PASS.** The reviewer has **no Bash tool**, so instead of a PASS it couldn't back, it reconstructed the
diff from the `file:line` landmarks ① had written into the report *before any code existed*, stated
exactly what its method proved, named the one thing it could not exclude, and handed that gap to Lead.

**Lead closed it** with `git diff -U0 master --`. The complete change to both fenced files:

```
+import { useBottomBarPadding } / { useBottomSpace }      (2 lines)
+  // PRD-4 comment                                       (3 lines)
+  const barPadding = useBottomBarPadding()
+  const bottomSpace = useBottomSpace()                    (2 lines + 1 blank)
-  <View style={{ height: spacing.xxxl + 64 }} />
+  <View style={{ height: spacing.xxxl + 64 + bottomSpace }} />
-  <View style={styles.bottomBar}>
+  <View style={[styles.bottomBar, { paddingBottom: barPadding }]}>
-    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.base,
```

**8 added, 1 removed, 2 modified per file. Nothing else.** No calculation, value, clamp, connector,
argument order, string, dependency array, or early return. Hooks are unconditional at the top of each
component, above every `if (loading)` early return.

#### Open threads — decide these before or during step ④

1. **⚠️ ②'s work is UNCOMMITTED.** `git status` shows 19 modified + 6 new files on branch
   `v1.0.4-fits-moms-phone`; HEAD is still `193697f`. **Lead deliberately did not commit** — the harness
   rule is to commit only when the user asks. ②'s own brief told it to commit, but it hit a session
   limit first. **④ should commit ②'s work as its own commit before starting**, so the two diffs stay
   separable (that separability is what made ③'s review possible). **Confirm with Farrel.**
2. **Product owes PRD-4 an amendment** for the misdiagnosed third bullet.
3. **Two pre-existing `docs/02` §6 divergences** found by ③, **not taken into this release** (the freeze
   binds; neither is live harm). Both go to the debt register on ship, framed as *"which is wrong, the
   code or §6?"* — not assuming the code is:
   - `PengembalianScreen.tsx:306-313` — `applyFuelSuggestion()` appends a `"Bensin"` fee line instead of
     modifying Subtotal Sewa. §6 says explicitly *"satu arah ke subtotal, **bukan baris terpisah**"*
     (`docs/02:124`). **Arithmetically equivalent — no money impact.**
   - `PengembalianScreen.tsx:663-669` — the fuel suggestion row renders amber unconditionally; §6 wants
     green when fuel is returned in excess.

---

### 5. WHAT COULD GO WRONG

**The release's defining constraint — the verification story is inverted from v1.0.3.** v1.0.3 verified
against production *before* the OTA. Here **every** acceptance criterion that matters is visual and
device-specific, and **the only route onto Mom's device is the OTA itself**. The honest sequence is
**publish → Mom relaunches → confirm**, and *"shipped" is not claimable until she has confirmed.* This is
why D-3 (Farrel's own pre-publish visual pass) exists — so Mom is not the first person to look at 14
screens.

**Traps that will cost time if rediscovered:**

- **`Text.defaultProps` is dead.** Verified two independent ways: the automatic JSX runtime has **zero**
  `defaultProps` handling (`react-jsx-runtime.development.js`, no matches), **and** `forwardRef`
  explicitly rejects it (`react.development.js:1080-1084`). The internet's standard global-clamp recipe
  **fails silently** here. This is why Option 4 exists.
- **`Platform.select()` cannot be influenced by reassigning `Platform.OS` in a test.** jest-expo's preset
  (`haste.defaultPlatform: 'ios'`) loads `Platform.ios.js`, whose `select` is hardcoded to prefer
  `spec.ios` and **never reads `.OS`**. The only working mock:
  ```js
  jest.mock("react-native/Libraries/Utilities/Platform.ios", () => ({
    __esModule: true,
    default: { OS: "android", select: (spec) => spec.android ?? spec.default },
  }))
  ```
  Also confirmed by real failure: mocking the whole `"react-native"` package via
  `{...jest.requireActual("react-native"), Platform: …}` **crashes** — spreading forces RN's lazy getters
  to evaluate eagerly and `DevMenu` throws.
- **Always run jest/eslint from `apps/lavender-ops-mobile`, never the monorepo root.** A root run
  resolves a different config and sweeps in a stale `.worktrees/` tree, reporting a wall of failures in
  files nobody touched. It cost v1.0.3 a detour immediately before a production push.
- **RN's default `flexShrink` is `0`, not web CSS's `1`.** This is the mechanism behind the fused
  `22 JuliSisa Rp 50.000`.

**Known gaps / debt:**

- **13 of 14 screens have no test coverage at all.** Only `RentalDetailScreen` has test files. Neither
  fenced math screen (`DetailSewaScreen`, `PengembalianScreen`) has any unit test — **③'s review was the
  only automated gate those two files have.** Pre-existing, not introduced.
- **Two parallel theme systems.** `theme/tokens.ts` (what screens use) and `theme/typography.ts` (Ignite
  side) define the **same 8-entry M3 scale with the same numbers**, independently. Pre-existing.
  **Deliberately not unified in this release** — resolving "which is canonical" inside a P0 layout fix is
  debt #4's mistake wearing new clothes. Log it; don't fix it here.
- **PRD-4 BR-4 is knowingly only partly met.** Three local bottom bars got a *local* inset patch instead
  of migrating onto the shared `BottomActionBar` (waiver, Farrel 2026-07-22, because that migration *is*
  debt #4's fenced refactor inside tariff and fuel/auto-debt math). **This grows debt #4** — the local
  bars now carry inset logic too. **Record as an addendum to #4 on ship.**
- **The zero-inset breathing-room inconsistency (32/80/120/120 across four structurally similar tabbed
  lists) is untouched.** A design call, not a PRD-4 bug.
- **`DetailSewaScreen`'s sticky bar sits *outside* its `KeyboardAvoidingView`; `PengembalianScreen`'s
  sits *inside*.** Dormant, because `behavior` is `undefined` on Android and the app is Android-only.
  Verified *unchanged* by ③.

**Assumptions that could be wrong:**

- ❓ **`MAX_FONT_SCALE = 1.5` is a deliberate over-cap**, not a measured value. MIUI's "XL" is a slider
  label, not a number. **This is exactly what D-1b's diagnostic footer line is for** — it makes Mom's
  actual scale measurable from her next screenshot. If her real scale exceeds 1.5, the cap is wrong.
- ❓ **PRD-4 AC-6 (keyboard, no doubled offset) cannot be settled from source.** `KeyboardAvoidingView`
  is a **no-op on Android** (`behavior={undefined}`), so current keyboard handling is Android's native
  window resize. Whether adding inset padding produces a floating gap depends on whether
  `useSafeAreaInsets()` changes while the IME is up — device/OS dependent. **Explicit visual-audit item.**
- ⚠️ **Option 4's three kill-criteria have not been verified yet** (④ was killed before checking):
  aliased/namespace imports; sites passing `Text` as a *value* (`Animated.createAnimatedComponent`, refs
  typed as RN's `Text`); and whether a wrapped `<Text>` nested in a wrapped `<Text>` still inherits style.
  **If any bites broadly, stop and escalate — do not silently fall back to a ~380-tag sweep.**

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1. Core pattern: files are the handoff contract, and roles do not overlap.**
`docs/prd/` → `docs/releases/` → `docs/reports/`. `/lead` orchestrates and **never opens code**;
developers never review their own work; reviewers never write product code. This exists because a single
pass misses things that role separation catches — v1.0.3's clearest example is `developer-backend`
finding a bug and *correctly refusing to fix it inside a security migration*, after which
`rental-math-reviewer` corrected its provenance, and *that correction changed the decision*. Neither role
alone gets there. **This release added a fourth data point: three separate agents corrected Lead on a
lint rule, a layout instruction, and a misdiagnosed screenshot.**

**2. The most common mistake: trusting a document instead of the code — or a description instead of the
artifact.** Farrel's standing instruction is binding on every brief:

> **Verify against the codebase, not the plan.** Read the actual file before acting on any claim about
> it. Where reality diverges, **report the divergence** — do not silently follow either one.

This session produced the sharpest instance yet: an entire release chain reasoned from prose about a
screenshot nobody had opened, and the prose was wrong. **When evidence is an image, open the image.**

**3. What looks refactorable but must NOT be touched:**

- **`DetailSewaScreen.tsx` and `PengembalianScreen.tsx`.** They are 48KB/50KB and contain a private copy
  of the design system — this is debt #4, and it *looks* like an obvious cleanup. It is tariff
  composition and fuel-adjustment/auto-debt math. `docs/02` §6 says it **must be correct**. Any migration
  onto the shared components needs **its own release**, characterisation tests on the math **first**, and
  a `rental-math-reviewer` pass. A "just swap in the shared component" refactor here is how a safe OTA
  becomes a silent money bug.
- **The whole-repo lint fix.** `pnpm run lint` shows ~27,500 errors, of which **27,385 are phantom
  `prettier/prettier` CRLF noise** from a checkout/config mismatch. **Never** run `eslint --fix` or
  `prettier --write` across the repo — it would rewrite every file's line endings including the two
  protected math screens, producing an unreviewable diff over the most dangerous code in the app. The
  real count is **159**, and the fix is a dedicated `.gitattributes` commit reviewed as whitespace-only
  (debt #6a).
- **`useBottomSpace()`'s tabbed/non-tabbed branch**, which today reduces to `insets.bottom` on both
  paths and looks redundant. See §4 for why it stays.
- **`app/services/api/`** (dead Ignite apisauce demo). Parked for v1.1 as the skeleton of the future HTTP
  client. Decision already made; leave it.

---

### 7. DO NOT TOUCH LIST

- **Do NOT bump `version` in `app.json`.** It stays `1.0.0`. Mom would silently stop receiving OTA
  updates. Set `app/config/release.ts` `RELEASE = "1.0.4"` instead.
- **Do NOT run `eslint --fix`, `prettier --write`, or any formatter/codemod** anywhere in this repo.
- **Do NOT touch rental math, connectors, or any value.** This release is presentation-only.
- **Do NOT migrate the three local bottom bars onto `BottomActionBar`.** Explicit waiver; it is debt #4's
  fenced refactor.
- **Do NOT add inset padding to `EditActionBar`.** It renders inline mid-scroll.
- **Do NOT unify `theme/tokens.ts` with `theme/typography.ts`.**
- **Do NOT reduce headline sizes at default scale** (PRD-5 OQ-2, deferred) — it would breach BR-5/AC-6.
- **Do NOT add a native dependency.** It breaks OTA-only and becomes a different release. Escalate.
- **Do NOT run jest or eslint from the monorepo root.**
- **Do NOT dispatch a subagent before Farrel has approved the plan.** The v1.0.4 plan **is** approved;
  this rule governs new work.
- **Do NOT push, merge, or touch `master`.** Work stays on `v1.0.4-fits-moms-phone`.
- **Do NOT mock a Supabase failure as `new Error(...)` in tests.** Supabase returns a plain object
  `{message, details, hint, code}`. This exact mock hid a real bug through two green reviews.
  (Not relevant to this release — no backend leg — but it is a standing rule.)

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence |
|---|---|
| §1 Project identity | ✅ HIGH — from `CLAUDE.md` + the PRDs, re-read this session |
| §2 Current state | ✅ HIGH — `git status`, `pnpm test`, and `npx eslint` all run by Lead at 19:05 today |
| §3 Architecture | ✅ HIGH for paths/stack (verified); ⚠️ MEDIUM for the broader agent system (carried from `CLAUDE.md`) |
| §4 Recent work — steps ①②③ | ✅ HIGH — all numbers independently re-verified by Lead, not quoted |
| §4 Beranda finding | ✅ HIGH — pixel-level inspection plus `BottomTabView.tsx` source, both cited |
| §4 Approved decisions | ✅ HIGH — all captured `[by-Farrel]` in-session |
| §5 Traps (`defaultProps`, `Platform.select`, jest cwd) | ✅ HIGH — each proven by a real failure or source citation |
| §5 `MAX_FONT_SCALE = 1.5` adequacy | ❓ **LOW** — a deliberate over-cap, not a measurement. The diagnostic footer exists to close this |
| §5 AC-6 keyboard behavior | ❓ **LOW** — cannot be determined from source; needs the device |
| §5 Option 4 kill-criteria | ⚠️ **MEDIUM** — reasoning is sound, **not yet verified in code** |
| §6 Design philosophy | ✅ HIGH — consistent across v1.0.2/v1.0.3/v1.0.4 records |

---

## IMMEDIATE NEXT ACTION

**Re-dispatch step ④ (`developer-frontend`, model `sonnet`) for PRD-5.** The complete brief is in
`docs/reports/v1-0-4.md`; the essentials:

1. **Commit ②'s uncommitted work first**, as its own commit (confirm with Farrel).
2. Build the **Option 4** passthrough wrapper (`MAX_FONT_SCALE = 1.5`, **one definition site**), verify
   the three kill-criteria, adopt by import-line redirect across ~26 files. **All 343 `<Text>` tags stay
   as they are.** Expect the lint count to **drop**, since ~22 of the 159 are `no-restricted-imports`
   that stop firing.
3. **Audit all 14 screens at 1.5× FIRST**, then fix. **If more than 8 need structural rework, STOP and
   report to Lead** before fixing — the release would then be bigger than anyone agreed to.
4. Fix the four flagship defects: the fused date/`Sisa` row (AC-1/AC-9 — the urgent one, it is about
   money Mom is owed), the clipped `Sewa Baru`/`User Baru` labels, the truncated licence plates
   (**shrinking the plate to fit is explicitly not acceptable**), and the crowded step header (**three+
   hand-rolled implementations, no single fix point**). High-leverage: `SearchField.tsx`'s fixed
   `height: 48` is used by four screens.
5. Set `app/config/release.ts` → `"1.0.4"`; add the D-1b diagnostic footer line.
6. Gates: compile clean, tests ≥ **34 suites / 184**, lint delta vs **159** (budget +0), zero changes
   under `app/services/` or `supabase/`.

**Then:** ⑤ `tester` → Farrel's 14-screen visual audit → `pnpm ota:publish` → Mom confirms → close out the
report (post-execution sections, debt register, PRD-4 amendment follow-up).
