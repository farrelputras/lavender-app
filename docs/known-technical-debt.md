# Known Technical Debt

Living register of debt that outlives any single release. Split out of
`docs/feedback-and-improvements.md` on 2026-07-12, because debt is not a historical record — it is a
standing list that each release triages against.

**Each release doc should pull candidates from here, and add to it whatever it knowingly leaves
behind.** Nothing here is scheduled; if an item gets picked up, move it into that release's doc and
strike it from this file when it ships.

> **Struck items are kept as tombstones** only when a decision inside them must not be re-litigated
> (see #5's 30s timeout). Otherwise a shipped item is removed outright.

---

## 1. 24 connectors still throw postgrest's raw error object

- **Status:** open — **excluded from v1.0.2** (blast radius too wide for a polish release) and
  **explicitly declined again in v1.0.3** (Farrel, scope discipline: it looked newly urgent precisely
  *because* that release was standing in the error path — scope creep wearing a disguise).
  **Priority raised in v1.0.3**: it now has a reachable user-visible symptom, which it did not have
  before. The *count* did not grow; the *inconsistency* sharpened.
- **First found:** v1.0.1, item 6
- **Counted exactly 2026-07-21** (not "~"): **24** `throw error` sites in
  `app/services/rentals/index.ts`, versus **5** that surface the real message —
  `updateRental` (`:389`) and the four `hardDelete*` (`:564`, `:570`, `:576`, `:582`).

The Supabase client is not configured with `.throwOnError()`, so `supabase.rpc()` and `.from()`
return `error` as a **plain object** (`{message, details, hint, code}`), not an `Error`.

A connector doing `if (error) throw error` therefore throws that plain object — and any caller doing
`e instanceof Error ? e.message : "…"` gets **`false` every time** and silently discards the real
Postgres message.

v1.0.1 fixed this in the four `hardDelete*` connectors only. **Every other `if (error) throw error`
site in `app/services/rentals/index.ts` still has the bug** (~24 of them). Nothing is visibly broken
today, because those paths rarely error and their callers mostly don't branch on the message — but
the moment one does, the operator sees a generic string instead of the reason.

**Two ways to fix:**

| | |
|---|---|
| Sweep | Change every site to `throw new Error(error.message)`. Mechanical, safe, tedious. |
| Root fix | Enable `.throwOnError()` on the client in `app/services/supabase/client.ts` so postgrest wraps errors in a real `PostgrestError` itself, and drop the manual throws. Cleaner — but it changes error behaviour in **every connector at once** and needs its own review. |

> ⚠️ **Never mock a Supabase failure as `new Error(...)` in tests.** Supabase never produces that
> shape, so the test proves your belief about the library rather than its behaviour. This exact mock
> hid the original bug through two green reviews. Mock the plain-object shape.
> (A *`fetch`* rejection genuinely **is** an `Error` — know which layer you are mocking.)

### What changed in v1.0.3

1. **The inconsistency sharpened.** v1.0.3's new `updateRental` connector throws
   `new Error(error.message)` by its own constraint. With the four `hardDelete*` connectors that makes
   **5** connectors that surface the real reason against **24** that discard it. The same class of
   failure now produces a real message on the edit-rental path and a generic one everywhere else —
   non-uniformly wrong is harder to reason about than uniformly wrong.
2. **#5 gave it a live symptom.** v1.0.3's new fetch timeout raises a real `Error` with a clear
   Indonesian message. On the 24 raw-throw paths that message is discarded; and on
   `PengembalianScreen` the toast is a hardcoded `"Gagal menyimpan pengembalian"` regardless
   (`PengembalianScreen.tsx:330`). Mom's most frequent handover save therefore fails honestly but
   **anonymously** — she is told it failed, never that her connection is the reason, which is the one
   thing she could act on.

   > **Lead to confirm the exact hop** before planning a fix: whether a `fetch` rejection is *thrown*
   > by `supabase-js` or returned as an `error` object determines whether the fix belongs at the
   > connector, the screen, or both. Do not plan from this paragraph alone.

**New constraint on the root fix:** enabling `.throwOnError()` now interacts with `fetchWithTimeout`
in the same file. The two must be reviewed together, not sequentially.

**Scoping note:** this is a client-wide error-behaviour change touching every connector. It does
**not** belong as a ride-along in a release whose review surface is elsewhere — it was correctly kept
out of both v1.0.2 and v1.0.3. It wants a small release of its own, or a seat in a release already
opening the client.

---

## 2. No re-entrancy guard / in-flight state on destructive actions

- **Status:** open — low priority (admin-only surface)
- **First found:** v1.0.1, item 6

The hard-delete confirmations fire an async call with no spinner and no disabled state. The native
`Alert` dismisses on tap, so a double-fire is not realistically reachable — but on a slow connection
the screen sits idle with live buttons and no feedback, and in airplane mode nothing happens at all
(React Native's `fetch` never times out).

Only Farrel (admin) can reach these, which is why it has not been prioritised.

---

## 3. `KendaraanScreen` is dead code — there is no vehicle management

- **Status:** open — **excluded from v1.0.2** (not a UI bug; not user-visible)
- **First found:** v1.0.2 UI audit, 2026-07-12

`app/screens/KendaraanScreen.tsx` is a 25-line stub. It is:

- **commented out of `MainNavigator`** (so mom never sees it), yet
- **still typed in `navigationTypes.ts`** (`Kendaraan: undefined`), and
- **the only screen still on the pre-Stitch token system** (`typography.heading`, `colors.text`) —
  everything else migrated during Phase 7 Stage B.

The consequence is real, not cosmetic: **`hardDeleteVehicle` shipped in v1.0.1 as an RPC + connector
with no UI at all**, because there is no vehicle detail screen to hang it on. It is a one-screen
wire-up whenever that screen exists.

**Decide, don't drift:** either build vehicle management (and wire `hardDeleteVehicle` into it), or
delete the stub and its route type. Leaving it half-present is the current cost.

---

## 4. The Phase-0 shared form library is barely used by the two rental screens

- **Status:** open — **deliberately excluded from v1.0.2.** Needs its own release and its own tests.
- **First found:** v1.0.2 UI audit, 2026-07-12
- **Severity:** this is the **root cause** of the recurring "minor UI inconsistency" feedback.

`app/components/form/` is the Phase-0 shared library. It exists, and it works —
`FieldCard.tsx`, `FuelGauge.tsx`, `SectionLabel.tsx`, `Stepper.tsx`, `RupiahInput.tsx`, each with a
passing test. The roadmap marks Phase 0 ✅ Done.

But **`DetailSewaScreen` and `PengembalianScreen` — the two biggest files in the app (48KB, 50KB) —
import exactly one thing from it:**

```
DetailSewaScreen.tsx:20    import { PhotoRow } from "@/components/form/PhotoRow"
PengembalianScreen.tsx:19  import { PhotoRow } from "@/components/form/PhotoRow"
```

Everything else they redefine locally:

| Helper | Local copies | Shared version exists? |
|---|---|---|
| `SectionLabel` | 3 (DetailSewa, Pengembalian, RentalDetail) | ✅ + test |
| `FuelGauge` | 3 (DetailSewa, Pengembalian, and `BensinGauge` in RentalDetail) | ✅ + test |
| `FieldCard` | 2 (DetailSewa, Pengembalian) | ✅ + test |
| `Stepper` | 2 (DetailSewa, Pengembalian) | ✅ + test |
| `parseRupiahInput` | 2 (DetailSewa, Pengembalian) | ✅ (`RupiahInput`) + test |
| `paymentMethodLabel` | 3 (DetailSewa, RentalDetail, and `methodLabel` in HutangDetail) | — |
| `groupByFirstLetter` | 2 (PilihUser, UserScreen) | — |

The design system was built, tested, and then those screens were written **past** it. Consequences:

- **It explains the 48–50KB file sizes.** Those files are large because they contain a private copy
  of the design system.
- **Token-level fixes don't reach them.** Anything changed in `theme/tokens.ts` or in a shared
  component silently skips the app's two most important screens.
- **The copies have already diverged.** `DetailSewa`'s local `FuelGauge` takes `max = 8`;
  `Pengembalian`'s takes no `max` at all.
- It is the **parent** of v1.0.2 items 2.1 (`HutangScreen` chevron) and 2.3 (`SearchField` not
  adopted) — the same drift, one level up. Expect "minor UI inconsistency" to keep reappearing as a
  release item until this is fixed.

### Why this is not a quick win

> ⚠️ `DetailSewaScreen` is **tariff composition**. `PengembalianScreen` is **fuel adjustment and
> auto-debt creation**. That is the highest-risk code in the app, and `docs/02` §6 says the math must
> be correct.

A "just swap in the shared component" refactor here is how a safe OTA becomes a silent money bug —
especially given the copies have already drifted apart. This wants:

- its own release, not a ride-along in a polish pass;
- characterisation tests on the current math **before** anything moves;
- a `rental-math-reviewer` pass afterwards.

v1.0.2 takes only the one safe piece: extracting the 6 duplicate `showToast` copies (v1.0.2 item 5),
which has no math surface.

### What v1.0.4 added to this item (2026-07-23)

**The drift now spans the bottom-bar primitive too.** v1.0.4's PRD-5 work defined `btnLabel`
(`{ flexShrink: 1 }`) independently in **three** places — `DetailSewaScreen`, `PengembalianScreen`,
**and** `UserDetailScreen` — because all three carry a *local* bottom action bar rather than importing
the shared `components/form/BottomActionBar.tsx`. In the same release those same three bars each grew
their own copy of the system-inset logic (PRD-4).

That was the correct call for a P0 layout fix — the two rental-math screens were fenced *do not open* —
but it means this item's table above now understates the problem: the duplication reaches the one
primitive whose whole purpose was to stop it. **All three resolve when the local bars migrate onto the
shared `BottomActionBar`**, which is this item's own fenced, `rental-math-reviewer`-gated release, not
a ride-along.

See also **#15** — those two screens have zero automated coverage, which is exactly why this migration
needs characterisation tests first.

---

## 5. ~~Offline saves hang forever~~ — CLOSED in v1.0.3 (2026-07-21)

- **Status:** ✅ **struck.** A 30s `AbortController` timeout on the Supabase client's `fetch`
  (`app/services/supabase/client.ts`) shipped in v1.0.3. Every call through the client is now bounded:
  an unreachable save **fails** instead of hanging. Proven by a test simulating a never-resolving
  request, plus a no-regression pass over the existing rental / user / hutang paths.
- **First found:** noted alongside #2 in v1.0.1; stated separately here on 2026-07-12
- **Kept as a tombstone, not deleted**, because of the two notes below. Do not re-open the item; do
  not re-litigate the number.

React Native's `fetch` never times out — with no connection a save simply never returned. Mom tapped
"Simpan" and the app sat there indefinitely with no error and no indication anything was wrong.

### Do not tighten the 30s without reading this (Farrel, D-3 — v1.0.3 deviation 5)

The wrapper sits under **every** Supabase call, **including storage photo uploads**. It is a
wall-clock cap on the whole request, not a stall detector. A tighter value would abort a
slow-but-succeeding multi-photo upload on mobile data — killing work that was going to complete,
which for Mom is worse than the hang it replaced. 30s is the compromise, chosen knowingly.

**Residual to watch (not currently actionable):** the converse also holds — a genuinely slow upload
that would have finished at 40s is now killed at 30. Nobody has reported this. **If Mom ever reports
photos failing at handover, this is the first suspect**, and the honest fix is a per-operation budget
(uploads longer than RPCs) or an inactivity-based abort, not a bigger single constant.

### What #5 did *not* deliver — see #1

The timeout raises a real `Error` carrying a clear Indonesian message. **That message reaches Mom on
only a minority of paths.** 24 connectors still throw the raw postgrest object (#1), and some screens
toast a hardcoded string regardless — `PengembalianScreen.tsx:330` shows
`"Gagal menyimpan pengembalian"` on the return save, which is the save she taps most at handovers.

So the honest post-v1.0.3 statement is: **saves now fail fast everywhere; only some of them tell her
why.** The remainder is #1's, and #5 is what made #1 user-visible for the first time.

---

## 6. Lint is red on `master` — CRLF config noise + ~157 real pre-existing errors

- **Status:** open — **not fixed in v1.0.2.** The config fix would rewrite every file's line endings,
  including the two protected rental-math screens (#4).
- **First quantified:** v1.0.2 execution, 2026-07-15

`pnpm run lint` prints ~25,000+ errors on a clean `master` checkout. That is two unrelated problems
stacked on top of each other:

### a) ~25,000 phantom `Delete ␍` errors (CRLF checkout vs LF lint config)

`git config core.autocrlf` is `true`, so files check out with **CRLF** line endings on Windows.
There is **no `.gitattributes`** anywhere in the repo, and `.prettierrc` sets no `endOfLine`, so
Prettier uses its default of `"lf"`. Result: `prettier/prettier` reports `Delete ␍` on **every line
of every file**. These are not defects — they are a line-ending mismatch between checkout and lint
config. (Verified this session: no `.gitattributes`; `.prettierrc` = `printWidth`/`semi`/`singleQuote`/
`trailingComma`/`quoteProps` only, no `endOfLine`.)

- **Do NOT "fix" this by running `eslint --fix` / `prettier --write` across the repo.** That would
  rewrite the line endings of every file, including `DetailSewaScreen.tsx` and `PengembalianScreen.tsx`
  (the tariff and fuel/hutang math — #4), producing a massive, unreviewable diff over the most
  dangerous code in the app.
- **The correct fix, when done deliberately:** add a `.gitattributes` pinning `* text=auto eol=lf`
  (or set `endOfLine` in `.prettierrc`), renormalize in a single dedicated commit that touches nothing
  else, and review it as a whitespace-only change. Its own task, not a ride-along.

### b) ~157 real (non-`prettier`) pre-existing errors

Underneath the phantom noise, `master` carries genuine lint errors — `react-native/no-inline-styles`,
`no-restricted-imports` (raw `Text`/`TextInput` instead of the wrapped components),
`react-native/no-color-literals`, `react-native/sort-styles`. All pre-existing; none introduced by
v1.0.2.

### The gate this forces (v1.0.2 decision, 2026-07-15 · revised 2026-07-21 after v1.0.3)

Because "lint green" is unreachable without (a)'s deliberate renormalization, the release gate is
**"real (non-`prettier`) lint errors must not increase vs `master`"**, with `compile` and `test`
staying fully green. Counts from the v1.0.2 execution session (not re-counted since): `master` ~164
real → branch ~157 real — extracting `showToast` removed several `split-platform-components` errors,
and **zero new real errors were introduced**.

**Revision (2026-07-21).** v1.0.3 breached this gate, knowingly. The breach exposed that the gate was
not enforceable as written, so it is restated as a **budget with a ledger**:

1. **An increase is permitted only if it is not silent.** It requires (a) a named reason, (b) Farrel's
   explicit acceptance, (c) a row in the breach ledger below, and (d) a visible ⚠️ line in the release
   doc's gates section rather than an unqualified ✅. v1.0.3 satisfied all four.
2. **The baseline must be a measured number, not `~157`.** The next release that runs this gate MUST
   re-count on `master` and record the exact figure and the command used. A "must not increase" gate
   measured against an un-recounted approximation cannot be passed or failed rigorously — which is
   precisely why breaching it was cheap.
3. **The budget needs a ceiling** (⚠️ *number still owed by Farrel*). When cumulative accepted
   increases cross it, the deliberate `.gitattributes` renormalization + real-error cleanup gets
   scheduled as its own task. Without a ceiling the budget is a slow leak with a paper trail.

> **Why this matters more than the +1 suggests.** v1.0.3 held the line on two expensive scope
> questions and let the cheap one through without a ledger. Cheap breaches are the ones that
> accumulate, precisely because each one individually is obviously not worth arguing about.

### Breach ledger

| Release | File | Rule | Δ real | Accepted by | Reason | Repaid? |
|---|---|---|---|---|---|---|
| v1.0.3 | `app/screens/RentalDetailScreen.tsx` | `no-restricted-imports` (raw `TextInput`) | **+1** | Farrel | Consistent with how both rental-math screens already do it; wrapping it would have introduced a component change into a release already carrying two unplanned server migrations. | No — open |

Cumulative accepted increase since the gate was defined: **+1**.

---

## 7. Dead Ignite `services/api` demo folder — owned by the v1.1 backend swap, not now

- **Status:** open — **parked for v1.1** (PRD-3). Not scheduled; no user-facing or urgency backing.
- **First raised:** 2026-07-17, `/lead` advisory session (Farrel)

`app/services/api/` is stock Ignite boilerplate: the apisauce `Api` class fetching the React Native
Radio podcast RSS feed (`getEpisodes()`, `EpisodeItem`, `ApiFeedResponse`, `simplecast.com`). Its only
consumers live under `ignite/demo-files/`; **nothing in `app/` imports it.** The `apisauce` dependency
exists solely to feed this demo path.

It is *not* the same layer as `app/services/rentals/` — that is the **Supabase connector seam** (the
`docs/02` §3 contract), which every screen imports and which is deliberately organised per domain.
Folding the connectors into `services/api` was considered and **rejected**: it would put Supabase-client
code into an HTTP/apisauce-named folder, change ~15 screen imports for zero behaviour, and erode the
one boundary the architecture most wants to keep stable.

**Why v1.1 owns this, not now.** The v1.1 bespoke backend (PRD-3) will most likely be a **separate repo
or a sibling `apps/backend` workspace on its own deployment** — not code inside the mobile app. That
means the mobile app *will* need a real HTTP api-call service to reach it. So `services/api` is best
understood as the **empty skeleton of that future mobile HTTP client**, not a mislocated folder today.
When v1.1 lands, the connectors in `services/rentals` keep their signatures and call this HTTP client
underneath; until then the folder is inert.

**Decision (Farrel, this session):** leave it. When v1.1 starts, either delete `services/api` + drop
`apisauce` and build the client fresh, or repurpose the folder as that client. No action before then.

---

## 8. The `bensinKotak` write-boundary guard checks presence, not range

- **Status:** open — **defence-in-depth gap, not a live bug.** Not reachable through the UI.
- **First found:** v1.0.3 execution, 2026-07-21 (open thread carried out of the release)
- **Severity:** low today; the *field* it guards is high-consequence, which is why it is written down.

v1.0.3 closed a real hole: `(patch->…->>'bensinKotak')::int` yields NULL for **both** an absent key
and a JSON `null`, and `translators.ts:28` then read it back as `?? 4` — **silently substituting 4
kotak** for a value that was never sent. The new guard RAISEs instead of writing NULL.

**It only checks `IS NULL`.** A value of `-5` or `9999` still writes straight through.

- **Not reachable via the UI:** the edit control is a Stepper clamped 0–8 (`max = 8`, *derived* from
  `DetailSewaScreen`'s `Math.min(8, …)` — the control that created the value in the first place).
- **Reachable by anything that isn't that UI:** a future screen, a script, a hand-built patch, or a
  connector change that stops clamping. The server is the last boundary and it is currently only
  half-closed.
- **Why the field matters even though the gap doesn't yet:** `bensinKotak` is the **baseline for the
  fuel adjustment at return**. An out-of-range value does not produce a display glitch; it produces a
  wrong number on a customer's bill.

**Do not "fix" `translators.ts`'s `?? 4` fallback** — it is the correct defensive default for legacy
rows. The fix belongs at the write boundary, where the guard already is.

Fix shape (a server-side range check alongside the existing guard) is a **Lead** call, not specified
here. Note for whoever takes it: the 0–8 range currently lives in more than one place (the Stepper's
clamp, `DetailSewaScreen`'s `Math.min`, and the reader's `?? 4` default) — the coupling should be
acknowledged even if it is not consolidated. Cheapest folded into a release already opening a
migration; **do not** open a migration solely for this.

---

## 9. `CREATE OR REPLACE` body drift is unguarded for every RPC but one

- **Status:** open — **this class has already cost this project a real money defect once.** Partially
  mitigated in v1.0.3 (one function).
- **First found:** as a realized defect, v1.0.3 execution 2026-07-21; the drift itself shipped in `0015`.
- **Severity:** **high** — not because it is likely, but because its realized instance was invisible,
  long-lived, and financial.

Postgres has no partial edit of a function. **Every** change to an RPC rewrites the entire body, so
every migration touching a function is a full-body rewrite whose diff nobody sees unless someone
deliberately produces one. Reviewing the *new* body reads as correct; only old-vs-new reveals what was
dropped.

### The realized instance (keep this; it is the whole argument)

- `0014` added `AND deleted_at IS NULL` to `rpc_close_rental`'s payment sum, **deliberately**, with a
  comment saying so.
- `0015` `CREATE OR REPLACE`d the whole function to add **one `tujuan` line**, and silently dropped the
  filter. `0015`'s own header claims it only adds `tujuan`.
- Live from `0015` until 2026-07-21: the app screen showed the correct `sisa`, and the server would
  write a smaller hutang — or, when the deleted payment covered the bill, **none at all**. Nothing
  self-heals it; `recompute_rental_hutang` filters correctly but only runs if an admin later edits a
  payment on that rental.
- It was found **by accident**, while machine-diffing bodies for an unrelated security migration.

> **Realized damage: none.** A read-only audit on 2026-07-21 (after the fix) found **0 completed
> rentals, 0 payments, 0 hutang** in production — Mom had not yet entered real rentals, so the defect
> never fired against real money. This is luck, not a control, and does not lower the severity: the
> same latency window would have been catastrophic three months later.

### What exists today

- **One** body-invariance guard test, for `rpc_close_rental`
  (`apps/lavender-ops-mobile/test/closeRentalBodyInvariance.test.ts`). It is **index-aligned**, after a
  near-miss: the first version used a set-difference diff, which is order-blind — **hoisting a
  statement changes the money and produced an empty diff.** It was then verified non-vacuous by
  mutation (reverting the auth guard fails 2 tests; a pure reorder fails 1; dropping the filter fails
  3). Any future guard of this kind must be order-sensitive and mutation-verified, or it is decorative.
- Nothing at all for the other ~10 `SECURITY DEFINER` functions.

### The gap

There is no general control. The next `CREATE OR REPLACE` on any other RPC has exactly the protection
`0015` had: a header comment and a reviewer reading the new body.

**Interim rule — costs nothing, adopt immediately:**

> Any migration that `CREATE OR REPLACE`s an existing function must (a) state in its header **every**
> behavioural line it changes, and (b) be reviewed by diffing the **previous body against the new
> one**, never by reading the new body alone. A header that claims less than the diff shows is a
> **blocking** review finding.

The durable mechanism (snapshotting deployed bodies, generalized guard tests, a migration template
check — or something else) is a **Lead** call and is not specified here.

---

## 10. Two parallel theme systems — `theme/tokens.ts` vs `theme/typography.ts`

- **Status:** open — **explicitly logged out of v1.0.4** (discovery finding F-3). Resolving "which theme
  system is canonical" inside a P0 layout fix is debt #4's mistake wearing new clothes.
- **First found:** v1.0.4 discovery pass, 2026-07-22
- **Severity:** low — no defect and no money surface. This is a *decision that has never been made*.

`theme/tokens.ts` (what the screens import) and `theme/typography.ts` (the Ignite side) each define
**the same 8-entry M3 type scale, with the same numbers**, independently. Neither is wrong. But there is
no canonical lane, so every future "change type in one place" has two places it could land — and nothing
keeps the two in agreement.

Related, from the same pass (**F-4**): text *sizing* is actually well disciplined — only **1 of 88**
inline styles sets `fontSize` (`PilihKendaraanScreen.tsx:67`). What is undisciplined is the **import
path**: three screens hand-inline `fontFamily` + `fontSize: 40` instead of spreading
`textStyles.displayLg` (`HutangScreen.tsx:158`, `UserScreen.tsx:235`, `RentalScreen.tsx:182`).

**Fix shape:** pick one canonical scale, re-point the other at it, in a dedicated pass.

---

## 11. `Platform.select()` cannot be tested by reassigning `Platform.OS`

- **Status:** open as a **standing trap note.** Nothing to fix in product code — recorded so the
  diagnosis is not paid for a second time.
- **First found:** v1.0.4, dispatch ② (2026-07-22), at real cost.
- **Severity:** none to users; **high nuisance** — it silently lets an "Android" assertion pass against
  iOS behaviour.

jest-expo's preset sets `haste.defaultPlatform: 'ios'`, so the suite loads **`Platform.ios.js`**, whose
`select` is hardcoded to prefer `spec.ios` and **never reads `.OS` at all.** Dispatch is by *file
identity*, not runtime value — so assigning `Platform.OS = "android"` in a test changes nothing.

The only mock that works targets the platform-suffixed submodule by name:

```js
jest.mock("react-native/Libraries/Utilities/Platform.ios", () => ({
  __esModule: true,
  default: { OS: "android", select: (spec) => spec.android ?? spec.default },
}))
```

> ⚠️ **Do not** mock the whole package via `{...jest.requireActual("react-native"), Platform: …}`.
> Confirmed **by real failure**: spreading forces every lazy getter on RN's `index.js` to evaluate
> eagerly, and `DevMenu` throws under jest.

Invisible until v1.0.4 because no earlier test depended on `Platform.select` output. Note the wider
point: LAVENDER ships **Android-only**, so every `Platform.OS === "ios"` branch in the app is dead in
production as well as under test — including `KeyboardAvoidingView`'s `behavior` in both rental screens,
which is `undefined` on Android and therefore a no-op (F-7).

---

## 12. Two `docs/02` §6 ↔ rental-math divergences — which is wrong, the code or the spec?

- **Status:** open — **deliberately not taken into v1.0.4.** The rental-math freeze bound, both are
  cosmetic-or-equivalent, and neither is live harm.
- **First found:** v1.0.4 fence check, 2026-07-22. **Byte-identical to the v1.0.1-era code**, so outside
  v1.0.4's blame.
- **Severity:** **zero money impact today** — but it sits on the one document the project declares must
  be correct.

`docs/02` §6 is the authority that says this math must not be wrong, and a spec that disagrees with
shipped code is the condition under which someone eventually "fixes" the wrong one. **Both divergences
are in `PengembalianScreen`:**

| | What the code does | What `docs/02` §6 says | Money impact |
|---|---|---|---|
| 1 | `applyFuelSuggestion()` (`:306-313`) appends an extra fee line item `{description: "Bensin"}` | modify **Subtotal Sewa** — *"satu arah ke subtotal, **bukan baris terpisah**"* (`docs/02:124`), *"Menekan tombol mengubah nilai Subtotal Sewa"* (`:130`) | **None.** `computeReturnTotal` sums extras, so the total is arithmetically identical |
| 2 | the fuel-suggestion row renders `warningContainer`/`onWarningContainer` (amber) **unconditionally** (`:663-669`; styles `:1229,1237-1238`) | green when fuel is returned **in excess** (reduce), amber only when **short** (`:127-128`) | **None** — colour only |

> **State the question in this direction:** *which is wrong, the code or §6?* The code has been live and
> correct-in-total since v1.0.1; §6 may simply record an earlier intent. **Do not assume the code is the
> defect** and "fix" it into a real change to money.

---

## 13. `git diff` is blind to untracked files — and this project's new test files are untracked

- **Status:** the **specific instance is closed** (v1.0.4's `test(v1.0.4)` commit tracked all 14 files).
  Kept as a **standing note**, because the trap recurs for every newly-authored test file.
- **First found:** v1.0.4 execution, 2026-07-22 — hit **three separate times** in one release.
- **Severity:** process only — but it defeats scope-and-cleanliness proofs, which is how an unreviewed
  change ships.

`git diff` reports **nothing** for a file git has never tracked; it does not warn, it returns empty.
Three separate scope/cleanliness proofs in v1.0.4 had to fall back to file mtimes or the session's own
edit record, because the test files under review were untracked and `git diff` reported them clean.

**Check `git status --short` (or `git add -N` first) before trusting a `git diff` as a scope proof** —
especially when the work under review *creates* files, which every test-authoring dispatch does.

---

## 14. The `tester` role cannot persist its own artifacts

- **Status:** open — **agent-workflow debt, not code.** The fix lands in `docs/agents/`, not in the app.
- **First found:** v1.0.4, dispatch ⑤ (2026-07-22)
- **Severity:** medium for the delivery process — the release's *main* artifact nearly evaporated.

The `tester` subagent cannot write `.md`. So v1.0.4's visual-audit checklist — which the release report
itself calls the release's main artifact, because almost every AC in both PRDs is visual and
device-conditional and jest cannot see pixels — existed **only inside a returned agent message** until
Lead persisted it by hand to `docs/reports/v1-0-4-visual-audit.md`.

**Two candidate fixes, pick one:** name the landing path in the tester brief/playbook, or make "persist
any subagent artifact that exists only in a returned message" an explicit, non-optional Lead step.
Either way it must not depend on Lead happening to notice.

---

## 15. `DetailSewaScreen` and `PengembalianScreen` have zero automated coverage

- **Status:** open — **pre-existing, not a v1.0.4 regression.** Both screens were fenced *do not open*
  in v1.0.4, so that release could not have addressed it.
- **First found:** stated plainly in v1.0.4 (2026-07-22); the condition itself is far older.
- **Severity:** **high** — the two highest-consequence screens in the app are the two with no tests.

The app's two biggest files (48KB / 50KB) have **no test of any kind** — not unit, not acceptance, not
smoke. Per debt #4 they are also the app's tariff-composition and fuel-adjustment/auto-debt code.

**What this cost v1.0.4 concretely:** *Simpan Rental* lives in `DetailSewaScreen`, so **PRD-4 AC-1's
automated coverage is exactly zero.** Everything standing behind the release's flagship criterion was a
read-only `rental-math-reviewer` fence check plus Farrel's device walk-through — both **load-bearing,
not ceremonial**.

This is also the strongest argument for giving debt #4 its own release: the characterisation tests that
item requires *before* any component moves are the same tests missing here.

---

> **Note on `services/api` vs `services/rentals`:** these are two different layers, not a naming
> mistake. `rentals/` is the Supabase **connector seam** (stays); `api/` is dead demo scaffolding that
> becomes the mobile app's **HTTP client to the v1.1 backend** (see #7). Don't merge them.
