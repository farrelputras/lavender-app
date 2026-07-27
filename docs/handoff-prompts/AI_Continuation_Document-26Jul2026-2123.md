# PROJECT CONTINUATION DOCUMENT
## Session 4 — 26 July 2026, 21:23 · **v1.0.5 Lead delivery session, halted after ⑤ for device verification**

> **Read this first.** You are resuming as the **Lead role** (`/lead`) mid-release. The plan is approved,
> **all product-code dispatches through ⑤ are complete, verified and committed**, and the release is
> **halted by Farrel** so he can walk the build on his device. **⑥ is explicitly ON HOLD** — he found a bug
> being fixed in a different session. Five device findings are in **§4**, triaged. **One of them may be a
> regression and must be settled before anything else.**
> `docs/reports/v1-0-5.md` is the authoritative record and your working document.

---

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (`lavender-app`) — mobile app at `apps/lavender-ops-mobile`
- **What This Project Is:** An internal vehicle-rental operations tool for Farrel's mom's business. Two
  users: **Mom** (role `ops`, primary operator, ~50, Android Poco M3/MIUI, `fontScale` ≈ 1.4) and **Farrel**
  (role `admin`, the developer). Not on the Play Store — APK sideloaded, updates ship OTA.
- **Primary Objective (v1.0.5):** Mom can tell **by looking** which fields she can change and which merely
  display information. Delivered by **PRD-8** — one shared "field box" visual convention, defined once and
  applied across the app.
- **Strategic Intent:** Every release since v1.0.3 closes the gap between "the app works" and "the app works
  *for Mom*". PRD-8 also **gates PRD-6** (a dedicated rental edit screen): the convention must ship before
  PRD-6 consumes it, or PRD-6 invents a one-screen visual language this PRD would have to unpick.
- **Hard Constraints:**
  - **OTA only.** No migration, no RPC, no RLS change, no Edge Function, no native dependency. `app.json`
    `version` stays **`1.0.0`** — bumping it targets OTA at a runtime Mom's installed APK does not report,
    and she would **silently stop receiving updates**. Displayed version comes from `app/config/release.ts`,
    now `"1.0.5"`.
  - **No math may move.** AC-9 exists to prove the rental calculations came through the migration identical;
    it cannot prove that if they were edited.
  - **PRD-1's permission matrix is untouched** (BR-9 / AC-11).
  - **Lead never opens code.** Lead works from reports and specs only. Running `pnpm test` / `eslint` /
    `git` is fine; reading `app/**` is not. Dispatch a subagent to look at code.

---

### 2. WHAT EXISTS RIGHT NOW

**Built and working**

- v1.0.1 / v1.0.2 / v1.0.3 shipped. **v1.0.4 published OTA 2026-07-23**, merged to `master` 2026-07-25 —
  still **awaiting Mom's sign-off**; do not call it "shipped".
- **v1.0.5's entire test phase and all product-code dispatches through ⑤ are complete and committed.**
  ① discovery · ② suite · ②b gaps · ③ math review · ②c repair · ④ primitive · ④b strips · ⑤ migration.
- **Measured by Lead at the halt (not quoted from an agent):**
  **52 suites / 284 tests passing** · characterisation suite **2 suites / 46 tests, identical before and
  after ⑤** · **lint 120 real non-`prettier` errors** · `npx tsc --noEmit` **exit 0**.

**Partially built**

- **v1.0.4's sign-off is outstanding.** PRD-4 AC-8 and PRD-5 AC-8 need Mom's own phone. Mechanisms are
  device-validated (inset 47.27px, `fontScale` ≈ 1.4). Per-screen visual rows in
  `docs/reports/v1-0-4-visual-audit.md` and **Mom's own words** are still owed.
- **v1.0.5 is mid-Phase-2, halted.** ⑥ and ⑦ not run.

**Broken or blocked**

- **⑥ `rental-math-reviewer` is ON HOLD by Farrel** — he found a bug being fixed in another session.
  **Do not dispatch ⑥ until he lifts the hold**, because ⑥'s entire job is to review ⑤'s diff, and that
  diff is about to change.
- **Five device findings are open** (§4). One may be a **regression** and gates the rest.

**Not started**

- ⑥, ⑦, the publish gate, the OTA, AC-12.
- The `CLAUDE.md` pointer to `docs/field-box-convention.md`.
- Every debt-register addition owed at ship (§4, "Owed at ship").

---

### 3. ARCHITECTURE & TECHNICAL MAP

- **Stack:** Expo SDK 55 (dev-client), React Native 0.83, **Ignite** on **React Navigation — NOT Expo
  Router**. TypeScript strict. Supabase v2. EAS Build + Expo Updates.
  `@testing-library/react-native@^13.2.0`, Jest via `jest-expo`.
- **Key paths:**

  | Path | What |
  |---|---|
  | `app/components/form/FieldBox.tsx` | **The convention's one definition site (BR-6/AC-6).** Created by ④ |
  | `app/components/form/RupiahInput.tsx` | Consumes `FieldBox`. Only production consumer is `HutangFormScreen` |
  | `app/components/PembayaranSheet.tsx` | Shared payment sheet, consumed by **four** screens. Its 3 `TextInput`s boxed by ④ |
  | `app/screens/PengembalianScreen.tsx` | 50KB rental-math screen. **Migrated by ⑤.** The release's dangerous file |
  | `app/screens/DetailSewaScreen.tsx` | 48KB, **fenced** (debt #4, guard 6). Zero tests. Never opened this release |
  | `app/components/AppText.tsx` | v1.0.4 passthrough exporting `Text` **and `TextInput`** with the font-scale clamp. **All screens import from here, never `react-native`** |
  | `app/utils/rentalMath.ts` | The extracted math. Covered by `rentalMath.test.ts` (18 tests) |
  | `app/screens/PengembalianScreen.characterization.test.tsx` | **The AC-9 instrument** (28 tests) |
  | `app/screens/RentalDetailScreen.editLogic.ts` | **AC-11's real path.** NOT `app/utils/editLogic.ts` — see C-5 |
  | `test/findStyledAncestor.ts` | The reliable way to reach a `FieldBox` ancestor in tests |
  | `docs/field-box-convention.md` | BR-11's rule doc (D-9). **Not yet pointed at from `CLAUDE.md`** |
  | `docs/reports/v1-0-5.md` | **The authoritative release record and your working document** |

- **How the delivery chain works (not the app):** `docs/prd/` (requirements, Product owns) →
  `docs/releases/` (scoped plan, PM owns) → `docs/reports/` (**the Lead release report**). Subagents do the
  work; Lead brokers contracts, collects reports, re-runs every number, and labels each decision
  `[by-agent]` or `[by-Farrel]`.
- **Naming/standards:** UI types camelCase; connectors always `async`; connector signatures locked; screens
  never hold raw data. Release docs `v1-0-5.md` (hyphens); git branches/tags `v1.0.5`.
- **External dependencies:** Supabase project `tuufzjxoprjsrrkagncz` (**not touched this release**), EAS.

---

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

#### Git state, exactly

| | |
|---|---|
| Branch | **`v1.0.5-which-fields-you-can-change`** |
| HEAD | **`32cfd1a`** `docs(v1.0.5): dispatch 5 recorded — the migration is done and E-3 is closed` |
| **Working tree** | **NOT clean — 1 modified file, and it is FARREL'S OWN EDIT** (see below) |
| **AC-9's "before" state** | **`49fae63`** — quote this SHA, not `303ed6d` |

```
32cfd1a  docs(v1.0.5): dispatch 5 recorded — the migration is done and E-3 is closed
99a179b  feat(v1.0.5): the PengembalianScreen D-5 migration — dispatch 5
6e97bcf  docs(v1.0.5): dispatches 4 and 4b recorded, verified and committed
0eb4150  feat(v1.0.5): RentalDetailScreen strips + the two boxes — dispatch 4b
79e776b  feat(v1.0.5): FieldBox, the one definition site — dispatch 4
c82cc24  docs(prd-8): amendments A-1 (AC-4 split) and A-2 (PembayaranSheet)
407a55b  docs(v1.0.5): S3 resume — halt lifted, baselines re-measured, dispatch 4 issued
49fae63  test(v1.0.5): repair the characterisation suite after the math review   <-- AC-9 "before"
```

> ⚠️ **`M apps/lavender-ops-mobile/app/screens/PengembalianScreen.tsx` (+4 / −8) is Farrel's own
> uncommitted fix**, not an agent's. **Do not revert, stash, or overwrite it.** It moves the *Kembali*
> label outside the `FieldBox`. **Re-run the characterisation suite before committing it** — it touches the
> migrated screen and nobody has verified it against AC-9's instrument yet.

#### What was worked on this session (Lead session S3)

Resumed from `AI_Continuation_Document-26Jul2026-1424.md`. Baselines re-measured, halt lifted by Farrel,
then four dispatches:

| Dispatch | Agent | Outcome |
|---|---|---|
| ④ | `developer-frontend` #1, `sonnet` | `FieldBox` (TDD'd), `RupiahInput` consumes it, both form screens, `PembayaranSheet`, footer removed, `RELEASE="1.0.5"`, the rule doc |
| ④b | same agent, `SendMessage` | `RentalDetailScreen` AC-4a strips + AC-4c boxes; `UserDetailScreen` AC-5 audit (already compliant) |
| — | Farrel's parallel `/product` session | **PRD-8 Amendments A-1 + A-2 written.** ⑦'s blocker cleared, D-5 discharged |
| ⑤ | `developer-frontend` #2, `sonnet`, fresh | The `PengembalianScreen` D-5 migration. **E-3's mutation check discharged** |

**Lead re-ran the full suite, lint and `tsc` after every dispatch.** Every reported number reproduced.

#### Decisions made, and WHY — do not undo these

**E-3 · The mutation check went to ⑤, not ④ `[by-agent]`.** ④'s brief fenced it off `PengembalianScreen`
entirely; instructing the same agent to temporarily edit that exact file contradicts its own guards, and a
brief that contradicts itself is how guards get misread. ⑤ already opened the file and already ran the
suite before migrating.

**D-9 · BR-11's rule doc is `docs/field-box-convention.md`, standalone `[by-agent]`.** Not a subsection of
`docs/02` — a UI convention lodged inside the connector-contract document is discoverable only by someone
who already knows it is there, which is the decay BR-11 exists to prevent.

**⑤'s two judgment calls, both endorsed `[by-agent]`:** *Diskon* was boxed although AC-1 does not name it,
because it shares `amountInputRow` with the fields that were migrated — leaving it would have **silently
stripped a money field's border**, a new BR-1 violation. And *"the local `FieldCard` goes"* was read as
"remove the local duplicate declaration", not "adopt the shared `FieldCard`", whose different spacing
defaults carried real doubled-spacing risk on the release's most dangerous file.

#### ⚠️ E-3 DISCHARGED — the release's last open assumption, closed by measurement

**The repaired amber test CAN fail, and now that is measured rather than reasoned.** ⑤ changed
`fuelSuggestionRow.backgroundColor` to `colors.errorContainer` and the test went red:

```
Expected: "#FEF7E0"    Received: "#ffdad6"
```

**A genuine value mismatch, not a thrown locator error** — the distinction is the whole point, because the
original test's only failure mode was a throw, which reads as a broken test and invites the next agent to
loosen the predicate. Reverted byte-identical; suite green at 46/46. **Guard 3's debt-#12 tripwire is
repaired *and proven*.** Chain: ③ found a test that could not fail → ②c repaired it → nobody could show the
repair worked → ⑤ showed it.

#### 🔴 FARREL'S FIVE DEVICE FINDINGS — triaged, and #2 gates everything

He is walking the dev build. **These are his words, with Lead's triage. Item 2 must be settled first.**

| # | Finding | Lead's triage |
|---|---|---|
| **1** | *"kembali field in waktu sewa section. the kembali label should be outside the fieldbox. fixed it myself (uncommitted change)"* | ✅ **Presentation, in scope, already done by Farrel.** Sitting uncommitted in the tree. **Re-run the characterisation suite, then commit it.** |
| **2** | *"why is the pembayaran section cant be edited? it should be editable or removable when selesaikan pengembalian hasnt been clicked yet (like the tambah biaya and diskon fields)"* | 🔴 **SETTLE THIS FIRST — it is either a regression or new scope, and the answer changes the release.** See below. |
| **3** | *"catatan field should be FieldBox as well (it is not currently)"* | ✅ **Confirms Lead's own open recommendation with device evidence.** Cheap fix; needs a PRD note. See below. |
| **4** | *"the 'Tambah Pembayaran' button styling should be like the 'Tambah Biaya' or 'Diskon' button styling"* | ⚠️ **Presentation, but arguably outside PRD-8.** Needs a scope call. See below. |
| **5** | *"the tanggal field in PembayaranSheet should be using the FieldBox as well"* | ✅ **Correct, and it exposes a structural gap in AC-7.** See F-10. |

**Finding 2 — the question that must be answered before any fix.** *Is the payment section's
non-editability a **regression introduced by ④ or ⑤**, or a **pre-existing capability gap**?* The two have
opposite answers:

- **If ④/⑤ removed an edit/delete affordance** → it is a defect of this release and **must** be fixed here.
- **If it never existed on `PengembalianScreen`** → adding it is a **behaviour change on a fenced
  rental-math screen**, which **guards 3 and 4 forbid** and which **AC-9 exists specifically to prove did
  not happen**. It belongs to **PRD-6**, alongside the `Terapkan` double-charge already routed there.

**Evidence pointing at "pre-existing":** ②b pinned `PembayaranSheet` existing-payment **edit and delete**
(`updatePayment` / `deletePayment` and their effect on `Sisa` and the close payload) — so the capability
exists in the connector layer and is exercised by tests. ⑤ reported the characterisation suite green and
identical before and after, which a removed affordance would likely have disturbed. **But this is inference,
not proof — dispatch a read-only agent to establish it with `file:line` evidence and the `git log` history
of that section.** Do not guess; this project has paid five times this release for reasoning about a file
nobody opened.

**Finding 3 — Lead had already flagged this independently, before Farrel's device confirmed it.**
AC-1 enumerates six things and stops; *Catatan* is absent. But it **is** a live editable Field under BR-4
(②b pinned its text flowing to the close payload), and the characterisation suite's own `describe` title
reads *"text entry into ⑤'s boxed fields — KM Kembali / Tujuan / **Catatan**"*. **Same shape as the AC-4
defect Amendment A-1 fixed this morning:** a criterion's literal enumeration contradicting the PRD's
governing principle. It also **likely fails AC-7 layer 2** at ⑦, because the fixed manifest puts
`PengembalianScreen`'s 8 `<TextInput` tags in the *"must have a `FieldBox` ancestor"* category.
**Farrel's device is now the third independent signal. Box it.**

**Finding 4 — the scope question.** PRD-8's non-goals say *"The **placement** and **prominence** of edit
**buttons** — that is PRD-6."* A button's *visual consistency with its siblings* is arguably not that, but
it is also not "which fields you can change". **Lead's read: it is a one-line style alignment with real user
value and near-zero risk, but it is Farrel's scope call, and it should be recorded either way rather than
absorbed silently.**

**Finding 5 / F-10 · A structural gap in AC-7, and Farrel found it by eye `[by-agent]`.**
`PembayaranSheet`'s *Tanggal* row is a **Field** under BR-4 — a recorded value Mom picks — and **D-2
already established the precedent** by boxing `PengembalianScreen`'s *Kembali* date/time row. ④ skipped it,
correctly by its own brief (it is a `TouchableOpacity`, not a `TextInput`, and absent from ①'s enumeration).

**The generalisable fact: AC-7 audits `<TextInput` tags, so every date/time picker Field is invisible to it
by construction.** Two such Fields exist — *Kembali* (caught only because D-2 named it explicitly) and
*Tanggal* (missed by every document and every audit, found by a human looking at a screen). **No automated
criterion in this release can catch a third.** Record as **F-10**; it belongs in the debt register and in
⑦'s visual checklist, which is the only instrument that can see them.

#### Farrel's standing decisions, carried forward `[by-Farrel]`

| Item | Decision |
|---|---|
| **⑥ `rental-math-reviewer`** | **ON HOLD.** A bug is being fixed in another session. Do not dispatch |
| **v1.0.4's overlapping visual rows** (B3/C3/F2, I6/J2/F3, B4/D1/I8, C5/I7) | *"Let it be, and keep flagged."* **Not** a pre-publish blocker; the flag **stays standing**. Accepted consequence: if v1.0.5 publishes first, the two releases' visual claims are entangled in the same pixels and a failure cannot be cleanly attributed |
| **The `Terapkan` double-charge** and ③'s three other observations | **Not fixed in v1.0.5.** Debt register at ship, then Product for **PRD-6** |

#### Corrections and findings recorded this session

- **C-5 · There is no `app/utils/editLogic.ts`.** AC-11's file is
  **`app/screens/RentalDetailScreen.editLogic.ts`**. The wrong path is in **PRD-8's BR-9 text**, in the
  **release report's ④b brief**, and in the **previous handoff document**. AC-11 is satisfied regardless
  (zero diff), but **⑦ must audit the real path or it will report a false pass on a file that does not
  exist.**
- **F-8 · A one-off flake on the AC-9 instrument.** `PembayaranSheet — existing-payment edit and delete ›
  deleting an existing payment` failed once under full-suite load during ④. **Did not reproduce in ~9
  subsequent clean runs across three parties.** Kept flagged, not closed: a 1-in-N failure corrupts ⑤/⑦'s
  "any delta = STOP" rule in both directions, and the worse direction is teaching someone that a red
  characterisation test can be waved off.
- **F-9 · `react-native/sort-styles` compares case-**sensitively** (UTF-16 `<`/`>`), not case-insensitively
  — so `infoRow` must precede `inlineEditBtn`. And `checkIsSorted` **returns on the first violation per
  pass**, so a clean-looking run *under-reports* how many pairs are out of order.
- **D-6's ratchet moved.** The approved ceiling is *"lowest measured baseline + 10"*. Baseline is now
  **120**, so the ceiling is **130**, not 132 and not 169.

#### Owed at ship (none of this is done)

Debt-register additions: **F-7** (jest resolves `datetimepicker` to its **iOS** implementation regardless of
the `Platform` mock — Mom is on Android), **F-8**, **F-9**, **F-10**, the `Terapkan` double-charge, ③'s
three other observations, **C-5**'s wrong path, and debt **#6**'s ledger row recorded as **repaid**
(`no-restricted-imports` 37 → 0). Plus the `CLAUDE.md` pointer to `docs/field-box-convention.md`, and debt
**#4 / #15** recorded as **partially** paid — **never struck**.

---

### 5. WHAT COULD GO WRONG

**Known issues / live debt inside the blast radius**

- **Debt #16 — `returnedAt` defaults to `new Date()` at screen-open** (~`PengembalianScreen.tsx:175`),
  renders a plausible wrong time, has already produced one wrong persisted record, and has no in-app
  correction path. **v1.0.5 styles that exact row and must not touch its value** (guard 1). ⑤ verified the
  seed is byte-identical.
- **Debt #12 — two `docs/02` §6 ↔ code divergences**, both in `PengembalianScreen`: `applyFuelSuggestion()`
  appends an extra-fee line instead of adjusting Subtotal, and the suggestion row renders amber
  unconditionally. **Zero money impact. Which side is wrong is an open Product question.** The suite pins
  them as-is. **Do not "fix" either.**
- **Debt #4 / #15 are only PARTIALLY paid.** `PengembalianScreen`'s input-bearing primitives closed and it
  has its first coverage; **`DetailSewaScreen` stays entirely uncovered and unmigrated**, as do
  Pengembalian's local `SectionLabel` / `FuelGauge` / `Stepper` / bottom bar. **Neither may be struck.**

**Edge cases**

- **`git diff` is blind to untracked files** (debt #13). Use `git status --short` before trusting any diff.
- **`Platform.select()` cannot be influenced by reassigning `Platform.OS`** (debt #11). And per **F-7**,
  the platform mock does **not** change jest's platform-suffixed *file resolution*. Never mock the whole
  `react-native` package by spreading `jest.requireActual` — `DevMenu` throws.
- **Run jest from `apps/lavender-ops-mobile`, never the monorepo root.** A root run resolves a different
  config, sweeps in a stale `.worktrees/` tree, and reports failures in files nobody touched.
- **Supabase errors are plain objects, not `Error` instances.** Never mock a failure as `new Error(...)`.
- **PowerShell here-strings mangle multi-line `git commit -m`**, and `Set-Content -Encoding utf8` writes a
  **BOM** that lands in the commit subject. Write the message with the `Write` tool, then `git commit -F`.
- **Never `pnpm run lint`** (auto-fixes) and **never `eslint --fix` / `prettier --write`** repo-wide
  (debt #6a — renormalizes every file including both rental-math screens).

**Assumptions that could be wrong**

- ❓ **That finding 2 is pre-existing rather than a regression.** Inference from ②b's pinned tests and ⑤'s
  identical before/after run. **Unproven. This is the sharpest live assumption in the release.**
- ❓ That *Catatan* is one of `PengembalianScreen`'s 8 enumerated `<TextInput` tags (which is what would
  make AC-7 layer 2 fail). Highly likely, unconfirmed — Lead cannot open code.
- ⚠️ That AC-7's layer-2 render audit can mount **all** in-scope screens as cheaply as
  `PengembalianScreen`. Only that one was ever spiked.
- ⚠️ That `FieldBox` looks right on Mom's device at `fontScale` 1.4. Only a device settles it — that is
  exactly what Farrel is doing now.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1 · Files are the handoff contract, and gates are load-bearing.**
`docs/prd/` → `docs/releases/` → `docs/reports/`. Roles hand work to each other through documents, not
conversation, so any session can be resumed by a stranger. Lead runs **gated**: it writes its plan and
**halts for Farrel's approval before dispatching anything**, because subagents run once and cannot be
recalled mid-flight. **This release's gates have paid for themselves five times:** ① dissolved the
feasibility risk, ① found `PembayaranSheet`, ③ found a test that could not fail, ⑤ proved the repair, and
Farrel's own device found three things no automated criterion could see.

**2 · The most common mistake: reasoning about an artefact nobody opened.**
**Six documented claims failed this release, every one caught by an agent reading a file and none by a
reviewer reading a document:** C-1 (a consumer relationship inferred from a name collision), C-2 (a tag
count), C-3 (four line numbers pointing at style blocks), C-4 (the wrong `Stepper`), the
"bare treatment #8" claim about `PembayaranSheet` (carried through **five** documents, and independently
disproved the same day by two agents with no shared context), and C-5 (a file path that never existed).
Add the historical PRD-4 A-1 case — four agents and a Lead reasoned for a whole release about a "clipped
label" from prose descriptions of a screenshot nobody opened; it was a ScrollView fold, not a defect.
**The habit that catches all of them: go to the source, and prove it by running something.**

**3 · What looks refactorable but must NOT be touched:**
- **`DetailSewaScreen`** (48KB, tariff composition). Now that `FieldBox` exists it looks like a
  twenty-minute win. It is behind the debt #4 fence, has **zero** tests, and opening two rental-math
  screens in one release is how a fenced migration stops being fenced. **Guard 6.**
- **Pengembalian's local `FuelGauge` / `Stepper` / `SectionLabel` / bottom bar.** The two `FuelGauge` copies
  have **already diverged on `max`** — migrating one is a *behavioural* change on a money path wearing a
  refactor's clothes. **Guard 2.**
- **Debt #12's two divergences (guard 3)** and **`returnedAt`'s default (guard 1).**
- **The repo-wide CRLF/lint state** (debt #6a) and **`app/services/api/`** (dead Ignite scaffolding, kept
  deliberately as v1.1's HTTP-client skeleton, debt #7).

---

### 7. DO NOT TOUCH LIST

- **Do NOT dispatch ⑥ `rental-math-reviewer`.** Farrel has it on hold pending a bug fix in another session.
- **Do NOT revert, stash, or overwrite the uncommitted change in `PengembalianScreen.tsx`** — it is
  **Farrel's own fix**.
- **Do NOT re-run Lead Phase 1, the re-gate, or any completed dispatch.** ①–⑤ are closed, green, committed.
- **Do NOT open code as Lead.** Reports and specs only. Dispatch a subagent to touch `app/**`.
- **Do NOT let any developer edit a characterisation test.** If one fails after a change, that is the
  developer's defect. **Stop and report.**
- **Do NOT fix the `Terapkan` double-charge or ③'s three other observations** in this release.
- **Do NOT add payment editability to `PengembalianScreen` before settling whether it is a regression** —
  if it is not, that is a behaviour change AC-9 exists to disprove.
- **Do NOT grow AC-7's allow-list past `LoginScreen` + `DetailSewaScreen`.** A third entry is a scope
  breach. Controls (BR-4) and the dead-code exclusion (`TextField.tsx`) are **separate lists** (D-7).
- **Do NOT bump `app.json` `version`.** It stays `1.0.0`.
- **Do NOT add a native dependency**, open a migration/RPC/RLS/Edge Function, or touch `app/services/`.
- **Do NOT substitute a larger model for a developer-tier subagent.** If `sonnet` is unavailable, **stop
  and hand to Farrel**.
- **Do NOT claim v1.0.4 or v1.0.5 "shipped"** before Mom's own confirmation on her own phone.
- Preserve naming conventions; ask before introducing any framework, library, or dependency.

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence |
|---|---|
| §1 Project identity, constraints | ✅ HIGH — re-read from CLAUDE.md, PRD-8, release plan across S1–S3 |
| §2 Branch, HEAD, **52/284 tests, lint 120, `tsc` 0, characterisation 46/46** | ✅ HIGH — every number measured by Lead running the command, after each dispatch |
| §4 Git log, the uncommitted change (+4/−8) | ✅ HIGH — read from `git status --short` / `git diff --stat` at 21:23 |
| §4 E-3's mutation result | ✅ HIGH — **the failure output was produced by a run**, not reasoned |
| §4 ④/④b/⑤ outcomes, fences proven by diff | ✅ HIGH — Lead re-ran and re-verified scope after each |
| §4 PRD-8 A-1 + A-2 contents | ✅ HIGH — read from the amended PRD by Lead |
| §4 C-5, F-9 | ✅ HIGH — found by agents reading source, one from the eslint rule's own implementation |
| §4 Farrel's five findings, verbatim | ✅ HIGH — given this session |
| §4 **Triage of finding 2 (regression vs pre-existing)** | ❓ **LOW — inference only. Settle it with a read-only dispatch before acting.** |
| §4 Finding 3 likely failing AC-7 layer 2 | ⚠️ MEDIUM — reasoned from ①'s manifest; Lead cannot open code to confirm |
| §5 Debt #4 / #11 / #12 / #13 / #15 / #16 | ⚠️ MEDIUM — read from the register, not independently re-verified in code |
| §5 F-8's flake being benign | ⚠️ MEDIUM — ~9 clean runs, no reproduction, but no root cause |
| v1.0.4's AC-8 / v1.0.5's AC-12 | ❓ **Structurally PENDING** — only Mom's own phone can close them |

---

## APPENDIX A — The immediate sequence for the resuming Lead

1. **Confirm state:** branch `v1.0.5-which-fields-you-can-change` at `32cfd1a`, **one uncommitted file that
   is Farrel's** — do not touch it destructively.
2. **Re-measure before anything:** `npx jest` from `apps/lavender-ops-mobile` (expect **52 / 284**, but the
   uncommitted edit may move it — that is information, not a failure), the eslint JSON one-liner (**120**),
   `npx tsc --noEmit` (**0**). **Never `pnpm run lint`.**
3. **Settle finding 2 first** with a **read-only** dispatch: is the payment section's non-editability on
   `PengembalianScreen` a regression from ④/⑤, or pre-existing? Demand `file:line` evidence and
   `git log`/`git show` history. **The answer decides whether it is a v1.0.5 defect or PRD-6 scope.**
4. **Get Farrel's scope call on finding 4** (button styling) and confirm finding 3 (*Catatan*) — Lead
   already recommends boxing it, and Farrel's device is the third independent signal.
5. **Bundle findings 1, 3, 5** (+ 4 if approved) into **one `developer-frontend` dispatch on `sonnet`**,
   briefed standalone with the guards verbatim, ④'s handoff note, and the instruction to **run the
   characterisation suite before and after — any delta = STOP, never edit the test.**
6. **Re-run everything yourself after it returns.** Never quote an agent's numbers.
7. **⑥ only when Farrel lifts the hold.** Then ⑦, then the publish gate.
8. Keep filling in `docs/reports/v1-0-5.md` — it is the record, and every decision gets `[by-agent]` or
   `[by-Farrel]`.
