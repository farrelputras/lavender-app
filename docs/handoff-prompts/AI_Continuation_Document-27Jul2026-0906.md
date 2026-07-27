# PROJECT CONTINUATION DOCUMENT
## Session 5 — 27 July 2026, 09:06 · **v1.0.5 Lead delivery session, resuming to finish the sequence**

> **Read this first.** You are resuming as the **Lead role** (`/lead`) mid-release. The plan is approved and
> **eight dispatches are complete and committed**. The release is **not** halted any more — Farrel has lifted
> both holds and asked to finish. **Two Lead sessions ran this release concurrently on 2026-07-26; Farrel
> ruled the S4 line (this document's lineage) the driver.** The other session stopped and handed off through
> two sidecar files you must read. **The working tree is red by one test, deliberately and explainedly.**
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
- **v1.0.5: eight dispatches complete and committed.**
  ① discovery · ② suite · ②b gaps · ③ math review · ②c repair · ④ primitive · ④b strips · ⑤ migration ·
  **⑥ math review of ⑤'s committed diff** (ran in the *other* Lead session) · **⑩ the `returnedAt` display
  fix** (ran in the other session, commit `f0a965e`).
- **Measured by Lead on resume 2026-07-27 (not quoted from any agent):**
  **52 suites / 288 tests — 287 passing, 1 failing** · **lint 121** real non-`prettier` errors ·
  `npx tsc --noEmit` **exit 0**.

**Partially built**

- **v1.0.4's sign-off is outstanding.** PRD-4 AC-8 and PRD-5 AC-8 need Mom's own phone. Mechanisms are
  device-validated (inset 47.27px, `fontScale` ≈ 1.4). Per-screen visual rows in
  `docs/reports/v1-0-4-visual-audit.md` and **Mom's own words** are still owed.
- **v1.0.5 is mid-Phase-2.** ⑧, ⑨, the second `rental-math-reviewer` pass, ⑦, the publish gate and the OTA
  are all outstanding.
- **The release report needs a merge pass.** Two sessions wrote into it; there are stale lines and two
  sidecar files awaiting absorption. See §4 "Merge obligations".

**Broken or blocked**

- **One failing test, and it is expected.** `PengembalianScreen.characterization.test.tsx` —
  *"pressing the inline Edit control opens the Android picker, and a chosen value reaches the payload"* fails
  with `Unable to find an element with text: Edit`. **This is F-11**, caused by Farrel's own uncommitted edit
  removing that control, which he then **ruled intentional**. **⑧ owns the fix.** Do not treat it as a
  regression and do not let a developer touch the test.
- **Lint is 121, one above ⑤'s 120.** The delta is `react-native/no-unused-styles` 3 → 4: the now-orphaned
  `styles.inlineEditBtn` at `PengembalianScreen.tsx:1242-1246`. **⑨ item 1 closes it.**

**Not started**

- ⑧, ⑨, the second `rental-math-reviewer` pass, ⑦, the publish gate, the OTA, AC-12, AC-13.
- The `CLAUDE.md` pointer to `docs/field-box-convention.md`.
- Every debt-register addition owed at ship (§4, "Owed at ship").
- v1.0.4's overlapping visual rows (approved 2026-07-25 `[by-Farrel]`, then downgraded from a pre-publish
  blocker to *"let it be, and keep flagged"* — **still not walked**).

---

### 3. ARCHITECTURE & TECHNICAL MAP

- **Stack:** Expo SDK 55 (dev-client), React Native 0.83, **Ignite** on **React Navigation — NOT Expo
  Router**. TypeScript strict. Supabase v2. EAS Build + Expo Updates.
  `@testing-library/react-native@^13.2.0`, Jest via `jest-expo`.
- **Key paths:**

  | Path | What |
  |---|---|
  | `app/components/form/FieldBox.tsx` | **The convention's one definition site (BR-6/AC-6).** `<View style={[styles.box, style]}>{children}</View>` — no `cloneElement`, no prop injection, so it *structurally cannot* alter what it wraps |
  | `app/components/PembayaranSheet.tsx` | Shared payment sheet, consumed by **four** screens. Its 3 `TextInput`s boxed by ④. **Its `dateRow` is a rogue second box style — see F-12** |
  | `app/screens/PengembalianScreen.tsx` | 50KB rental-math screen. **Migrated by ⑤.** The release's dangerous file. **Carries Farrel's uncommitted edit** |
  | `app/screens/RentalDetailScreen.tsx` | Stripped by ④b; **fixed by ⑩** (`f0a965e`) to render `returnedAt` on COMPLETED rentals |
  | `app/screens/DetailSewaScreen.tsx` | 48KB, **fenced** (debt #4, guard 6). Zero tests. Never opened this release |
  | `app/components/AppText.tsx` | v1.0.4 passthrough exporting `Text` **and `TextInput`** with the font-scale clamp. **All screens import from here, never `react-native`** |
  | `app/utils/rentalMath.ts` | The extracted math. Covered by `rentalMath.test.ts` (18 tests) |
  | `app/screens/PengembalianScreen.characterization.test.tsx` | **The AC-9 instrument** (2 suites / 46 tests with `rentalMath.test.ts`) |
  | `app/screens/RentalDetailScreen.editLogic.ts` | **AC-11's real path.** NOT `app/utils/editLogic.ts` — see C-5 |
  | `docs/field-box-convention.md` | BR-11's rule doc (D-9). **Not yet pointed at from `CLAUDE.md`** |
  | `docs/reports/v1-0-5.md` | **The authoritative release record and your working document** (~2598 lines) |
  | `docs/reports/v1-0-5-dispatch-6.md` | ⑥'s full record. **Untracked sidecar, awaiting merge** |
  | `docs/reports/v1-0-5-lead-session-2117-handoff.md` | The other Lead session's decision log. **Untracked sidecar. READ IT — it holds eight Farrel decisions found nowhere else** |

- **How the delivery chain works (not the app):** `docs/prd/` (requirements, Product owns) →
  `docs/releases/` (scoped plan, PM owns) → `docs/reports/` (**the Lead release report**). Subagents do the
  work; Lead brokers contracts, collects reports, **re-runs every number**, and labels each decision
  `[by-agent]` or `[by-Farrel]`.
- **Naming/standards:** UI types camelCase; connectors always `async`; connector signatures locked; screens
  never hold raw data. Release docs `v1-0-5.md` (hyphens); git branches/tags `v1.0.5`.
- **External dependencies:** Supabase project `tuufzjxoprjsrrkagncz` (**not touched this release**), EAS.

---

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

#### Git state, exactly — measured 2026-07-27 09:06

| | |
|---|---|
| Branch | **`v1.0.5-which-fields-you-can-change`** |
| HEAD | **`f0a965e`** `fix(v1.0.5): RentalDetailScreen shows the actual Kembali/returnedAt, not the planned dueAt` |
| **Working tree** | **NOT clean** — see below |
| **AC-9's "before" state** | **`49fae63`** — quote this SHA, not `303ed6d` |

```
 M apps/lavender-ops-mobile/app/screens/PengembalianScreen.tsx   (+4 / −8 — FARREL'S OWN EDIT)
 M docs/reports/v1-0-5.md                                        (+783 — two sessions' notes)
?? docs/handoff-prompts/AI_Continuation_Document-26Jul2026-2123.md
?? docs/reports/v1-0-5-dispatch-6.md                             (⑥'s record — sidecar)
?? docs/reports/v1-0-5-lead-session-2117-handoff.md              (the other session's decision log)
```

```
f0a965e  fix(v1.0.5): RentalDetailScreen shows the actual Kembali/returnedAt, not the planned dueAt   <-- ⑩
32cfd1a  docs(v1.0.5): dispatch 5 recorded — the migration is done and E-3 is closed
99a179b  feat(v1.0.5): the PengembalianScreen D-5 migration — dispatch 5
6e97bcf  docs(v1.0.5): dispatches 4 and 4b recorded, verified and committed
0eb4150  feat(v1.0.5): RentalDetailScreen strips + the two boxes — dispatch 4b
79e776b  feat(v1.0.5): FieldBox, the one definition site — dispatch 4
c82cc24  docs(prd-8): amendments A-1 (AC-4 split) and A-2 (PembayaranSheet)
49fae63  test(v1.0.5): repair the characterisation suite after the math review   <-- AC-9 "before"
```

> ⚠️ **`M PengembalianScreen.tsx` (+4 / −8) is Farrel's own uncommitted fix**, not an agent's. **Do not
> revert, stash, or overwrite it.** It moves the *Kembali* label outside the `FieldBox` **and removes the
> row's inline "Edit" control** — both intentional, both ruled `[by-Farrel]`. It is the sole cause of the
> one failing test and of lint's +1.

#### ⚠️ TWO LEAD SESSIONS RAN THIS RELEASE CONCURRENTLY — read this before anything else

On 2026-07-26 two Lead sessions orchestrated v1.0.5 at the same time (S4 from ~21:23, and another from
~21:17). **Farrel ruled the S4 line the driver `[by-Farrel]`.** The other session stopped editing the report
and handed off. **No work was lost and no file was clobbered — but that was luck, not design:** the two
sessions happened to touch disjoint product files.

**Two untracked sidecars carry work that exists nowhere else. Read both in full:**

1. **`docs/reports/v1-0-5-lead-session-2117-handoff.md`** — a decision log holding **eight Farrel decisions**
   (A-3a, A-3b, A-4a, A-4a′, A-4b, the label ruling, the severity ruling, the PRD-9 ruling) plus ⑩'s full
   record and findings F-10/F-11 *in that session's own numbering* (which **collides** with this
   document's F-10/F-11 — see the numbering warning below).
2. **`docs/reports/v1-0-5-dispatch-6.md`** — ⑥'s full `rental-math-reviewer` record.

> 🔢 **NUMBERING IS SETTLED BUT COLLIDES ACROSS DOCUMENTS. Use this table and nothing else.**
>
> | Number | Dispatch | Status |
> |---|---|---|
> | **⑥** | `rental-math-reviewer` on ⑤'s **committed** diff (`0eb4150 → 99a179b`) | ✅ **RAN.** Record: `v1-0-5-dispatch-6.md`. **Does NOT discharge the final-diff review** |
> | **⑦** | `tester` — durability layer, acceptance, visual checklist | ⏸ not started |
> | **⑧** | `tester` — re-point the D-2 pinned interaction | ⏸ not started |
> | **⑨** | `developer-frontend` — the device-findings bundle | ⏸ not started |
> | **⑩** | `developer-frontend` — the `returnedAt` display fix | ✅ **DONE**, `f0a965e` |
>
> **The other session's own F-10 / F-11 are DIFFERENT findings from this document's F-10 / F-11.** Theirs:
> F-10 = *no test crosses a screen boundary*; F-11 = *the `durationToPaket` reuse trap*. This document's:
> F-10 = *AC-7 is blind to date-picker Fields*; F-11 = *Farrel's edit turns the AC-9 instrument red*.
> **Renumber on merge; do not assume a shared namespace.**

#### What was worked on in this session (Lead session S4)

Resumed from `AI_Continuation_Document-26Jul2026-2123.md`. **No product code was dispatched.** The session
re-measured everything, ran one read-only investigation, recorded five device findings, and took two rulings
from Farrel.

| Activity | Outcome |
|---|---|
| Re-measurement | Found the tree **red** — F-11, below. Numbers reproduced independently of both prior sessions |
| Read-only `Explore` dispatch (`sonnet`, no `Edit`/`Write`) | Settled finding 2 with `file:line` + git evidence; established F-11's mechanism; confirmed *Catatan*; discovered **F-12** |
| Farrel's rulings | F-11 intentional (D-2's second clause superseded) · finding 4 in scope · alignment target `minHeight: 48` on both |

#### 🔴 FARREL'S FIVE DEVICE FINDINGS — all triaged, all resolved or assigned

His words, verbatim, from walking the dev build:

| # | Finding | Resolution |
|---|---|---|
| **1** | *"kembali field in waktu sewa section. the kembali label should be outside the fieldbox. fixed it myself (uncommitted change)"* | ✅ **Kept.** The label move is right. Its side effect — removing the inline "Edit" control — is **ruled intentional** (below). **⑧ re-points the test; ⑨ cleans up the orphaned style + stale comment** |
| **2** | *"why is the pembayaran section cant be edited? it should be editable or removable when selesaikan pengembalian hasnt been clicked yet (like the tambah biaya and diskon fields)"* | 🟢 **SETTLED: PRE-EXISTING, not a regression → PRD-6.** Evidence below |
| **3** | *"catatan field should be FieldBox as well (it is not currently)"* | ✅ **⑨ item 3, and it is MANDATORY** — ⑥ independently confirmed it is a live AC-7 scope breach that would fail the release at ⑦ |
| **4** | *"the 'Tambah Pembayaran' button styling should be like the 'Tambah Biaya' or 'Diskon' button styling"* | ✅ **In scope `[by-Farrel]`.** Alignment target **`minHeight: 48` on both** styles, not `height: 44` |
| **5** | *"the tanggal field in PembayaranSheet should be using the FieldBox as well"* | ✅ **⑨ item 4.** Bigger than it looks — see **F-12** |

#### 🟢 Finding 2 — SETTLED. The Pembayaran section is **two** sections, and nobody had noticed.

This was the release's sharpest open assumption. A read-only dispatch settled it with evidence:

| Rendering | Lines | Edit / delete affordance |
|---|---|---|
| `rental.payments.map` — payments **already persisted** | `:822-853` | ✅ **Has one.** `editPayBtn` at `:842-852` → `PembayaranSheet` in edit mode + *Hapus Pembayaran* wired to `deletePayment` (`:1052-1062`) |
| `pendingPayments.map` — payments added **this session, before Save** | `:855-879` | ❌ **None.** Every element is a plain `View`/`Text`. No `TouchableOpacity`, no icon, no `onPress`, no swipe |

**Farrel was looking at the second, and his own analogy proves it:** *Tambah Biaya* and *Diskon* are also
session-scoped unsaved rows, and they **do** carry trash icons (`:729-734`, `:763-771`).

**Evidence, strongest first:** the `pendingPayments` block is **byte-identical to `git show 49fae63:…`** ·
`git show --stat 79e776b` and `0eb4150` **do not list the file at all** · `git show 3244ab6` (June, *"edit/
delete pembayaran"*) added `editPayBtn` **only** to the persisted branch, with `pendingPayments` appearing as
unchanged context.

> **The consequence is sharper than "it's PRD-6 scope."** `pendingPayments` feeds `totalPaid` → `Sisa`
> (`:242`) → **the `closeRental` payload and therefore server-side auto-debt creation**. A row Mom can delete
> is a row that changes what gets written at close. That is **guards 3 and 4**, and exactly what **AC-9
> exists to disprove**. Identical shape to the `Terapkan` double-charge Farrel already routed to PRD-6.
> **Carry-forward: the characterisation suite does not pin this**, so its eventual fix needs its own
> "before" protection.

**Why the earlier inference was right for the wrong reason** — the previous session argued from ②b having
pinned *"`PembayaranSheet` existing-payment edit and delete"*. Those tests **do** mount `PengembalianScreen`
and **do** press a real control, but only on a payment supplied via `rental.payments`. They never construct
a `pendingPayments` entry, because no control exists there to press.

#### 🔴 F-11 · Farrel's edit turned the AC-9 instrument red — then he ruled it intentional `[by-Farrel]`

```
FAIL app/screens/PengembalianScreen.characterization.test.tsx
● returnedAt — the Kembali picker interaction (D-2: gets the box, keeps its inlineEditBtn,
  no interaction change) › pressing the inline Edit control opens the Android picker,
  and a chosen value reaches the payload
    Unable to find an element with text: Edit
```

**Mechanism, established by the read-only dispatch:** the diff deletes
`<View style={styles.inlineEditBtn}>` with its `MaterialIcons name="edit" size={16}` and `<Text>Edit</Text>`.
**The row is still fully tappable** — the same `TouchableOpacity` survives at `:425` with
`onPress={openPicker}` and `activeOpacity={0.7}` untouched; `openPicker` (`:249-253`) is byte-identical. The
diff touches **no** value, handler, math, string, or the `returnedAt` seed (`:172`). Its second hunk is a
cosmetic line-wrap of the extra-fee row's `"Rp"` `Text`.

**Farrel's ruling, verbatim:** *"removing the inline 'Edit' button is intended since clicking the fieldbox
already give interaction on editing"*

**D-2's first clause stands** (*the Kembali row wears the box*). **D-2's second clause — "keep the
`inlineEditBtn`, no interaction change" — is superseded as of 2026-07-26 `[by-Farrel]`.**

> **The accepted consequence, and it earns a named acceptance row.** This is the row **debt #16** lives on —
> `returnedAt` defaults to `new Date()` at screen-open, has already produced one wrong persisted record, and
> has no in-app correction path. After this change the box is the **only** signal on that row that the value
> can be corrected. Every other boxed Field also contains a caret, placeholder or keyboard; this one holds
> nothing but a formatted date inside a border. **It is therefore the purest test of PRD-8's premise in the
> app.** ⑦'s checklist and Mom's AC-12 walk carry it as a task, not a look:
> **"Ask Mom to change the return time without showing her how."**

#### F-12 · `PembayaranSheet`'s *Tanggal* row carries a **second, rogue field-box style** `[by-agent]`

Finding 5 is bigger than "wrap it". `dateRow` (`PembayaranSheet.tsx:373-383`) is a hand-declared box:

| Property | `dateRow` | `FieldBox` (`:52-61`) | Verdict |
|---|---|---|---|
| Fill | `colors.surfaceContainerLowest` | `colors.surface` (D-1) | wrong token |
| Border | **`colors.outlineVariant`** | `colors.outline` | **the token BR-3 retired from field borders** |
| Radius | `8` | `borderRadius.default` (12) | inconsistent |
| Height | **`height: 56`** | **`minHeight: 52`** | **a fixed `height` — what BR-8/AC-2 exist to eliminate** |

**Three audits are blind to it, each structurally:** ④ skipped it correctly by its own brief (not a
`TextInput`) · **AC-7 cannot see it** (it audits `<TextInput` tags — this is F-10 in the concrete) ·
**AC-6 probably cannot either** (it matches the exact field-box style set; a near-miss duplicate with
different tokens and `height` instead of `minHeight` slips through). **⑦ must re-examine AC-6's mutation
test because of this.**

**It is a live PRD-5 risk, not a cosmetic one:** a fixed `height: 56` on a `bodyLg` row is the clipping shape
v1.0.4 shipped to fix, on a sheet Mom opens at **every** handover. 56 clears 48dp, so it is a growth problem
rather than a touch problem — which is why no v1.0.4 audit row caught it either.

#### F-10 · AC-7 is blind to date/time-picker Fields **by construction** `[by-agent]`

`PembayaranSheet`'s *Tanggal* is a **Field** under BR-4, and **D-2 set the precedent** by boxing
`PengembalianScreen`'s *Kembali* date/time row. **AC-7 audits `<TextInput` tags, so every picker Field is
invisible to it.** Exactly two exist — *Kembali* (caught only because D-2 named it) and *Tanggal* (missed by
PRD-8's inventory, the release plan, ①'s enumeration, AC-7's manifest, ④'s brief and Lead's audit surface,
simultaneously). **No automated criterion in this release can catch a third.** Only ⑦'s visual checklist can.

#### Decisions made, and WHY — do not undo these

**`[by-Farrel]`, this session:**

1. **F-11 is intentional.** D-2's second clause superseded. Rationale: the box itself now carries the
   affordance, which is PRD-8's own proposition.
2. **Finding 4 is in scope**, recorded rather than absorbed silently. PRD-8's non-goal (*"the placement and
   prominence of edit buttons — that is PRD-6"*) is **not** reopened: this is three sibling buttons on one
   screen made to look like each other.
3. **The alignment target is `minHeight: 48` on both** styles — correcting `addLineBtn`'s fixed sub-48dp
   `height: 44` rather than propagating it. *Tambah Biaya* and *Diskon* therefore change appearance too.

**`[by-agent]` refinements inside decision 3 — neither changes what Farrel chose:**

- **(a) `paddingVertical` is NOT removed.** `minHeight` alone lets text touch the border once content
  exceeds 48dp at `fontScale` 1.5 — the failure v1.0.4 spent a release learning to avoid. The established
  pattern is **`minHeight` + padding, never a fixed `height`**.
- **(b) 🔴 The buttons must NOT adopt `FieldBox`'s tokens.** `addLineBtn` uses `outlineVariant` + radius 10;
  `FieldBox` uses `outline` + radius 12 + `surface`. **Unifying them would break the release**: a bordered,
  filled control wearing the field-box border colour and radius **reads as a field box**, and BR-1's whole
  proposition is *boxed = a value Mom can change*. **BR-3 retired `outlineVariant` from *field* borders
  only** — on a Control it is the signal that this is not a Field. **Nothing currently written down says the
  two must differ**, so a future agent "tidying" them would be doing something reasonable-looking and
  destructive. **Goes into `docs/field-box-convention.md` at ship.**

**`[by-Farrel]`, from the other session (full detail in its handoff file):**

| # | Decision |
|---|---|
| **A-3a** | **Fold the `returnedAt` display fix into v1.0.5** rather than hotfix a v1.0.6 — it fixes *the build Mom validates* |
| **A-3b** | **Tripwire pre-authorised:** anything beyond `RentalDetailScreen`'s render + tests drops to v1.0.6 automatically, no renegotiation. **It fired the same day and was allowed to** |
| **A-4a** | **The Durasi change defers to v1.0.6.** ⑩ shipped the return-time row only. Verbatim: *"Split but make sure it is extracted into a shared util, not as a new helper"* |
| **A-4a′** | When A-4a ships it must **extract `formatActualDuration` into a shared util**, never define a parallel helper |
| **A-4b** | **Substitutive:** on a COMPLETED rental the row shows the **actual** return only — no planned value, no second row. Chosen with all three ⚠ costs displayed |
| **Labels** | **`Dikembalikan`** — *"let it be, no need to ratify"* |
| **Severity** | **P1/high**, not P0 — recorded so *"it's P0"* cannot later buy a guard-5 waiver |
| **PRD-9** | Opened **after** the OQ-5 visit: *"a completed rental's record tells the truth about what actually happened"* |
| **AC-12** | **Does not grow.** Stays three verdicts. **AC-13 goes on Farrel's device pass instead** |

**Standing `[by-Farrel]` decisions carried from earlier sessions:**

- **v1.0.4's overlapping visual rows** (B3/C3/F2, I6/J2/F3, B4/D1/I8, C5/I7): *"let it be, and keep
  flagged."* **Not** a pre-publish blocker; the flag **stays standing**. Accepted consequence: if v1.0.5
  publishes first, the two releases' visual claims are entangled in the same pixels.
- **The `Terapkan` double-charge** and ③'s three other observations: **not fixed in v1.0.5.** Debt register
  at ship, then Product for **PRD-6**.

#### ⑥'s findings — it ran, and it found two things that matter

**Verdict: PASS on the money fence; PASS-WITH-CONCERNS overall.** Method was hunk arithmetic, not
impression: it derived cumulative old→new offsets across all 14 hunks and computed the untouched old-line
ranges. **Old lines 90–403 — the entire logic body of the screen — appear in no hunk at all.**

- **⛔ D-2 (⑥'s numbering) · *Catatan* is a CONFIRMED AC-7 scope breach**, not a suspicion. ⑤ guessed; ⑥
  verified from source: snapshot `:993` renders a bare `<TextInput value={notes} onChangeText={setNotes}
  multiline>` and `notes.trim()` reaches the close payload at `:328`. **⑨ item 3 is mandatory, not
  optional — ⑦ would be correct to fail the release on it.**
- **⚠️ D-1 (⑥'s numbering) · ⑤ reported something FALSE.** ⑤ claimed *"the only two remaining `height:`
  declarations are `backBtn` and `stepperBtn`."* **There are seven** — `addLineBtn` (44), `backBtn` (40),
  `fuelSegment` (12), `fuelSuggestionIcon` (36), `paymentIcon` (36), `rowDivider` (1), `stepperBtn` (40).
  AC-2 still holds (none is a field box), **but `addLineBtn`'s `height: 44` is a live PRD-5 exposure and a
  sub-48dp tap target that ⑤'s claim would have kept off Lead's desk.** **⑤'s sentence must not be repeated
  in the report as written.**
  **Independently corroborated:** this session found the same defect from the opposite direction (finding 4 /
  Q3.3). **Two agents, no shared context, same defect.**
- **D-4 (⑥'s numbering) · a stale comment inside the AC-9 instrument.**
  `characterization.test.tsx:464` claims `amountInputRow` uses `height: 40`. It no longer has `height` at
  all; the helper works for a different reason (`FieldBox`'s `minHeight: 52` ≠ 40). Harmless today. **Owed to
  whoever closes AC-9.**
- **⑥ could not run the suite** (no Bash tool) and said so rather than issuing a PASS it could not back.
  AC-9's "identical before and after" is **observed** from the other side: Lead measured 46/46 on a clean
  tree at `99a179b`.

#### Merge obligations — the report needs a pass before ship

1. **Stale lines: `docs/reports/v1-0-5.md` lines ~1818 and ~1945 say "⑥ still on hold" / "⑥ remains on hold
   independently."** ⑥ ran. Correct them, and state ⑥'s scope precisely: **it reviewed ⑤'s committed
   migration only** — not Farrel's F-11 edit, not anything ⑨ changes.
2. **Merge `v1-0-5-dispatch-6.md`** into the main report, then delete the sidecar.
3. **Merge the other session's handoff file's decision log** (A-3a…PRD-9, its F-10/F-11), **renumbering its
   findings** to avoid the collision documented above.
4. **Record ⑩ in the main report** — it is done and Lead-verified; only bookkeeping is outstanding, plus
   **AC-13** on `docs/releases/v1-0-5.md` and **debt #17** opened-and-struck at ship.
5. **The report's tail (lines ~2541-2598) is stale on A-4a** — it shows Lead still scoping additive-vs-
   substitutive. Farrel has since ruled **substitutive** and **defer to v1.0.6**. The handoff file supersedes.
6. **⑤'s false "only two `height:` declarations" sentence** must be corrected wherever it appears.

#### What was discussed but NOT yet implemented

- **⑧, ⑨, the second `rental-math-reviewer` pass, ⑦.** Full briefs are in `docs/reports/v1-0-5.md`
  under *"The remaining plan"*. Nothing is dispatched.
- **PRD-9** (opened after the OQ-5 visit) and **v1.0.6** (Lead's recommendation: bundle **A-4a** with
  **debt #16** and **PRD-9**, since extracting `formatActualDuration` properly wants the debt-#4 fence
  legitimately open).

#### Open threads

- **Farrel's device list may still grow.** Findings 1–5 were explicitly *"so far"*. He has now said the bug
  is fixed and asked to finish the sequence, which reads as the list being closed — **confirm before
  dispatching ⑨**, because a sixth finding after bundling costs a dispatch.
- **Farrel's own-device round trip** — edit the return time on Android → *Selesaikan Pengembalian* → the
  detail screen shows it. **The only check in the release that crosses a screen boundary.** Recommended by
  the other session as a blocking pre-publish gate; **not yet confirmed by him**.

#### Owed at ship (none of this is done)

Debt-register additions: **F-7** (jest resolves `datetimepicker` to its **iOS** implementation regardless of
the `Platform` mock — Mom is on Android), **F-8** (a one-off flake on the AC-9 instrument, ~9 clean runs, not
reproduced, not closed), **F-9** (`sort-styles` compares case-**sensitively** and `checkIsSorted` returns on
the first violation per pass, so a clean run *under-reports*), **F-10**, **F-11**, **F-12**, the
`pendingPayments` edit/delete gap, the `Terapkan` double-charge, ③'s three other observations, **C-5**'s
wrong `editLogic` path, **#17** (the read-side `returnedAt` omission, opened and immediately struck),
**#18** (no cross-screen integration coverage), the other session's `durationToPaket` reuse trap, ⑥'s D-4
stale comment, and debt **#6**'s ledger row recorded as **repaid** (`no-restricted-imports` 37 → 0). Plus the
`CLAUDE.md` pointer to `docs/field-box-convention.md`, and debt **#4 / #15** recorded as **partially** paid —
**never struck**.

---

### 5. WHAT COULD GO WRONG

**Known issues / live debt inside the blast radius**

- **Debt #16 — `returnedAt` defaults to `new Date()` at screen-open** (`PengembalianScreen.tsx:172`, moved
  from `:175` by ⑤ — see ⑥'s D-3), renders a plausible wrong time, has already produced one wrong persisted
  record, and has no in-app correction path. **Guard 1: do not touch its value.** F-11 has now removed the
  only explicit affordance on that row, which raises the stakes on Mom's AC-12 answer.
- **Debt #12 — two `docs/02` §6 ↔ code divergences**, both in `PengembalianScreen`: `applyFuelSuggestion()`
  appends an extra-fee line instead of adjusting Subtotal, and the suggestion row renders amber
  unconditionally. **Zero money impact. Which side is wrong is an open Product question.** ⑥ confirmed both
  preserved. **Do not "fix" either.**
- **Debt #4 / #15 are only PARTIALLY paid.** `PengembalianScreen`'s input-bearing primitives closed and it
  has its first coverage; **`DetailSewaScreen` stays entirely uncovered and unmigrated**, as do
  Pengembalian's local `SectionLabel` / `FuelGauge` / `Stepper` / bottom bar. **Neither may be struck.**
- **The extra-fee row now stacks two ≥52pt boxes plus a trash icon on one line** (`:707-739`). Horizontal
  room at `fontScale` 1.5 is a device question. **⑦'s AC-10 pass must look there specifically.**

**Edge cases**

- **`npx jest 2>&1 | …` in PowerShell 5.1 dies with EMPTY output and exit 1.** Jest writes progress and its
  summary to **stderr**; redirecting a native exe's stderr wraps each line in a `NativeCommandError` and
  kills the pipeline. It reads exactly like catastrophic failure and is nothing of the kind. **Measure with
  `npx jest --json --outputFile=<path>`** and parse `numTotalTestSuites` / `numPassedTests` /
  `numFailedTests`.
- **`git diff` is blind to untracked files** (debt #13). Use `git status --short` before trusting any diff.
- **`Platform.select()` cannot be influenced by reassigning `Platform.OS`** (debt #11). And per **F-7**, the
  platform mock does **not** change jest's platform-suffixed *file resolution*. Never mock the whole
  `react-native` package by spreading `jest.requireActual` — `DevMenu` throws.
- **Run jest from `apps/lavender-ops-mobile`, never the monorepo root.** A root run resolves a different
  config, sweeps in a stale `.worktrees/` tree, and reports failures in files nobody touched.
- **Supabase errors are plain objects, not `Error` instances.** Never mock a failure as `new Error(...)`.
- **PowerShell here-strings mangle multi-line `git commit -m`**, and `Set-Content -Encoding utf8` writes a
  **BOM** that lands in the commit subject. Write the message with the `Write` tool, then `git commit -F`.
- **Never `pnpm run lint`** (auto-fixes) and **never `eslint --fix` / `prettier --write`** repo-wide
  (debt #6a — renormalizes every file including both rental-math screens).

**Assumptions that could be wrong**

- ⚠️ That AC-7's layer-2 render audit can mount **all** in-scope screens as cheaply as `PengembalianScreen`.
  Only that one was ever spiked.
- ⚠️ That **AC-6's mutation test would catch a near-miss duplicate** like F-12's `dateRow`. **Probably not.**
  ⑦ must verify rather than assume.
- ⚠️ That `FieldBox` looks right on Mom's device at `fontScale` 1.4 — only a device settles it.
- ❓ **That Farrel's device-findings list is closed.** He said *"so far"*, then asked to finish. **Confirm.**
- ⚠️ **That the two Lead sessions' concurrent report edits merged cleanly.** No clobber was observed, but
  **nobody has read the merged report end-to-end.**

---

### 6. HOW TO THINK ABOUT THIS PROJECT

**1 · Files are the handoff contract, and gates are load-bearing.**
`docs/prd/` → `docs/releases/` → `docs/reports/`. Roles hand work to each other through documents, not
conversation, so any session can be resumed by a stranger. Lead runs **gated**: it writes its plan and
**halts for Farrel's approval before dispatching anything**, because subagents run once and cannot be
recalled mid-flight. **This release's gates have paid for themselves repeatedly:** ① dissolved the
feasibility risk, ① found `PembayaranSheet`, ③ found a test that could not fail, ⑤ proved the repair, ⑥
found a false claim hiding a live defect, and **Farrel's own device found five things no automated criterion
could see.**

**2 · The most common mistake: reasoning about an artefact nobody opened.**
**Seven documented claims have failed this release, every one caught by an agent reading a file and none by
a reviewer reading a document:** C-1 (a consumer relationship inferred from a name collision), C-2 (a tag
count), C-3 (four line numbers pointing at style blocks), C-4 (the wrong `Stepper`), the "bare treatment #8"
claim about `PembayaranSheet` (carried through **five** documents), C-5 (a file path that never existed), and
⑥'s D-1 (⑤'s false `height:` count, which concealed a live PRD-5 exposure). Add the historical PRD-4 A-1
case — four agents and a Lead reasoned for a whole release about a "clipped label" from prose descriptions
of a screenshot nobody opened; it was a ScrollView fold, not a defect.
**The habit that catches all of them: go to the source, and prove it by running something.**

**Two useful corollaries this release added.** First, **the conclusion can be right while the reasoning is
wrong** — finding 2's "pre-existing" verdict was correct, but the argument offered for it did not actually
support it. Second, **a reviewer who cannot run and an implementer who does not verify produce a confident
wrong answer between them** (③ reasoned correctly from JSX and still could not see a style collision that
exists only in the rendered tree; ②c caught it by running).

**3 · What looks refactorable but must NOT be touched:**
- **`DetailSewaScreen`** (48KB, tariff composition). Now that `FieldBox` exists it looks like a
  twenty-minute win. It is behind the debt #4 fence, has **zero** tests, and opening two rental-math screens
  in one release is how a fenced migration stops being fenced. **Guard 6.**
- **Pengembalian's local `FuelGauge` / `Stepper` / `SectionLabel` / bottom bar.** The two `FuelGauge` copies
  have **already diverged on `max`** — migrating one is a *behavioural* change on a money path wearing a
  refactor's clothes. **Guard 2.**
- **Debt #12's two divergences (guard 3)** and **`returnedAt`'s default (guard 1).**
- **The buttons' `outlineVariant` + radius 10** — see decision refinement (b). Unifying Control and Field
  tokens looks tidy and would put counter-examples to PRD-8 on its proudest screen.
- **The repo-wide CRLF/lint state** (debt #6a) and **`app/services/api/`** (dead Ignite scaffolding, kept
  deliberately as v1.1's HTTP-client skeleton, debt #7).

---

### 7. DO NOT TOUCH LIST

- **Do NOT revert, stash, or overwrite the uncommitted change in `PengembalianScreen.tsx`** — it is
  **Farrel's own fix** and it is **approved**.
- **Do NOT re-run any completed dispatch.** ①–⑥ and ⑩ are closed, verified, committed.
- **Do NOT open code as Lead.** Reports and specs only. Dispatch a subagent to touch `app/**`.
- **Do NOT let any developer edit a characterisation test.** ⑧ is a `tester` dispatch precisely because the
  one legitimate change to that suite must be made by the right role. If a characterisation test fails after
  a developer's change, that is the **developer's** defect. **Stop and report.**
- **Do NOT add `pendingPayments` edit/delete to `PengembalianScreen`.** Settled as pre-existing; it changes
  the `closeRental` payload and belongs to PRD-6.
- **Do NOT fix the `Terapkan` double-charge or ③'s three other observations** in this release.
- **Do NOT implement the Durasi/`formatActualDuration` change** — A-4a defers it to v1.0.6, and reaching the
  helper would touch `PengembalianScreen` and trip A-3b's tripwire.
- **Do NOT grow AC-7's allow-list past `LoginScreen` + `DetailSewaScreen`.** A third entry is a scope
  breach. Controls (BR-4) and the dead-code exclusion (`TextField.tsx`) are **separate lists** (D-7).
- **Do NOT bump `app.json` `version`.** It stays `1.0.0`.
- **Do NOT add a native dependency**, open a migration/RPC/RLS/Edge Function, or touch `app/services/`.
- **Do NOT substitute a larger model for a developer-tier subagent.** If `sonnet` is unavailable, **stop
  and hand to Farrel**.
- **Do NOT claim v1.0.4 or v1.0.5 "shipped"** before Mom's own confirmation on her own phone.
- **Do NOT append to `docs/reports/v1-0-5.md` after an unexplained "file modified on disk" warning** —
  treat it as a **stop-and-check**. Two sessions raced on this file and only luck prevented a clobber.
- Preserve naming conventions; ask before introducing any framework, library, or dependency.

---

### 8. CONFIDENCE & FRESHNESS

| Section | Confidence |
|---|---|
| §1 Project identity, constraints | ✅ HIGH — re-read from CLAUDE.md, PRD-8, release plan across S1–S4 |
| §2 Branch, HEAD, **52/288 (287 pass, 1 fail), lint 121, `tsc` 0** | ✅ HIGH — every number measured by Lead running the command on 2026-07-27, and **independently reproducing the other session's figures** |
| §4 Git log, the uncommitted change (+4/−8), the three untracked files | ✅ HIGH — `git status --short` / `git diff --numstat` / `git show --stat` at 09:06 |
| §4 F-11's mechanism (row still tappable, style orphaned, nothing else touched) | ✅ HIGH — read-only dispatch, `file:line` + eslint output + the test re-run by the agent itself |
| §4 **Finding 2 = pre-existing** | ✅ HIGH — was ❓ LOW one session ago. Settled by byte-comparison against `git show 49fae63`, `--stat` on two commits, and the June commit that introduced the asymmetry |
| §4 *Catatan* unboxed = AC-7 breach | ✅ HIGH — **two independent confirmations**: this session's dispatch (tag 8 of 8) and ⑥'s source verification |
| §4 F-12 `dateRow`'s token/height values | ✅ HIGH — quoted from source with `file:line` |
| §4 Farrel's rulings (F-11, finding 4, `minHeight: 48`) | ✅ HIGH — given verbatim this session |
| §4 The other session's decisions A-3a…PRD-9, ⑩'s record, ⑥'s findings | ⚠️ MEDIUM — read from its handoff file and ⑥'s sidecar, **written by another session and not independently re-verified**, except ⑩'s commit stat and the suite/lint numbers, which this session reproduced |
| §4 **AC-6 being blind to a near-miss duplicate** | ❓ **LOW — reasoned, not tested. ⑦ must verify by mutation.** |
| §4 Whether Farrel's device list is closed | ❓ **LOW — "so far" was never formally retracted. Confirm before ⑨.** |
| §5 Debt #4 / #11 / #12 / #13 / #15 / #16 | ⚠️ MEDIUM — read from the register, not independently re-verified in code |
| §5 F-8's flake being benign | ⚠️ MEDIUM — ~9 clean runs, no reproduction, no root cause |
| v1.0.4's AC-8 / v1.0.5's AC-12 / AC-13 | ❓ **Structurally PENDING** — only Mom's own phone (and Farrel's round trip) can close them |

---

## APPENDIX A — The immediate sequence for the resuming Lead

1. **Confirm state:** branch `v1.0.5-which-fields-you-can-change` at `f0a965e`; **one uncommitted product
   file that is Farrel's**; three untracked docs. Do not touch any of them destructively.
2. **Read the two sidecars in full** — `docs/reports/v1-0-5-lead-session-2117-handoff.md` and
   `docs/reports/v1-0-5-dispatch-6.md`. They hold decisions and findings that exist nowhere else.
3. **Re-measure before anything:** `npx jest --json --outputFile=…` from `apps/lavender-ops-mobile` (expect
   **52 / 288, 287 passing, 1 failing** — the F-11 `"Edit"` locator, which is **expected**), the eslint JSON
   one-liner (**121**), `npx tsc --noEmit` (**0**). **Never `pnpm run lint`.**
4. **Confirm with Farrel that the device-findings list is closed** before bundling ⑨.
5. **Dispatch ⑧ `tester` (`sonnet`)** — re-point the D-2 pinned interaction:
   `characterization.test.tsx:1034`'s `getAllByText("Edit")[0]` becomes a press on the *Kembali* row's
   `TouchableOpacity` (still at `PengembalianScreen.tsx:425`, still `onPress={openPicker}`). **The payload
   assertions must not weaken.** Update the `describe` title, which still says *"keeps its inlineEditBtn"*.
   **Touch no product code.**
6. **Then Lead commits Farrel's edit + ⑧'s re-point as ONE commit**, so the branch never carries a red
   commit and D-2's supersession is in the message.
7. **Dispatch ⑨ `developer-frontend` (`sonnet`, fresh)** — briefed standalone with the guards verbatim and
   the instrument protocol (*run the characterisation suite before and after; any delta = STOP; never edit a
   test*). Five items: delete `styles.inlineEditBtn` · rewrite the stale JSX comment at `:419-422` · **box
   *Catatan* (mandatory — ⑥ confirmed it is an AC-7 breach)** · replace `PembayaranSheet`'s `dateRow` with
   `FieldBox` · align the three buttons at **`minHeight: 48` + padding**, keeping Controls visually distinct
   from Fields.
8. **Then the second `rental-math-reviewer` pass on the FINAL diff** — `v1-0-5-dispatch-6.md` does **not**
   discharge it. Use the pristine-artifact technique: `git diff <base> <head> -- <path> > scratchpad/*.diff`
   and `git show <head>:<path> > scratchpad/*.tsx`, so a reviewer with no Bash tool reads an immutable view
   and Lead supplies code without reading any itself.
9. **Then ⑦ `tester` (fresh)** — durability layer (AC-6/7/8, mutation-verified, **including a near-miss
   duplicate like F-12's `dateRow`**), acceptance ACs, full suite, lint re-count, and the visual checklist —
   carrying the *Kembali* AC-12 task row, F-10's picker-Field rows, F-12's `PembayaranSheet` rows, the two
   button rows, and the AC-10 extra-fee-row-width flag.
10. **Do the report merge pass** (§4 "Merge obligations") before the publish gate.
11. **Re-run everything yourself after each dispatch. Never quote an agent's numbers.**
12. **Publish gate → OTA → Mom's combined visit** (AC-12 + v1.0.4's outstanding AC-8 rows, recorded as
    separate verdicts), plus Farrel's own-device cross-screen round trip for AC-13.
