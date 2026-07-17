# Known Technical Debt

Living register of debt that outlives any single release. Split out of
`docs/feedback-and-improvements.md` on 2026-07-12, because debt is not a historical record — it is a
standing list that each release triages against.

**Each release doc should pull candidates from here, and add to it whatever it knowingly leaves
behind.** Nothing here is scheduled; if an item gets picked up, move it into that release's doc and
strike it from this file when it ships.

---

## 1. ~24 connectors still throw postgrest's raw error object

- **Status:** open — **explicitly excluded from v1.0.2** (blast radius too wide for a polish release)
- **First found:** v1.0.1, item 6

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

---

## 5. Offline saves hang forever

- **Status:** **scheduled into v1.0.3** (2026-07-18, PM) as a ride-along beside PRD-1 — the new
  handover save inherits this hang, and #5 completes PRD-1 BR-7's offline case. **Strike this item when
  v1.0.3 ships.** (Was: excluded from v1.0.2 — client-config change; blast radius comparable to #1.)
- **First found:** noted alongside #2 in v1.0.1; stated separately here on 2026-07-12

React Native's `fetch` **never times out.** With no connection, a save doesn't fail — it simply never
returns. Mom taps "Simpan", and the app sits there indefinitely with no error, no timeout, and no
indication anything is wrong.

For a tool used daily on mobile data this is a genuine honesty failure, and arguably more important
than #2 (which is admin-only). It is listed separately because the fix is different: a timeout /
abort wrapper on the Supabase client's `fetch` in `app/services/supabase/client.ts`, plus a decision
about what the UI does when it fires.

Worth pairing with #1 — both are changes to the same client, both change error behaviour
everywhere at once, and both want one careful review rather than two.

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

### The gate this forces (v1.0.2 decision, 2026-07-15)

Because "lint green" is unreachable without (a)'s deliberate renormalization, the release gate is
**"real (non-`prettier`) lint errors must not increase vs `master`"**, with `compile` and `test`
staying fully green. Counts from the v1.0.2 execution session (not re-counted since): `master` ~164
real → branch ~157 real — extracting `showToast` removed several `split-platform-components` errors,
and **zero new real errors were introduced**.

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

> **Note on `services/api` vs `services/rentals`:** these are two different layers, not a naming
> mistake. `rentals/` is the Supabase **connector seam** (stays); `api/` is dead demo scaffolding that
> becomes the mobile app's **HTTP client to the v1.1 backend** (see #7). Don't merge them.
