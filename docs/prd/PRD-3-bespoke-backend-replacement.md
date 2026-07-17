# PRD-3 — Replace the Supabase client with a bespoke backend

- **PRD:** 3 — refer to this as **PRD-3**.
- **Status:** **not committed.** This is a **decision artifact**, not a feature PRD. No validated user
  problem drives it, so it has no buildable feature acceptance — only a **go/no-go gate**.
- **Target release (if ever):** v1.1 (`docs/releases/v1-1.md`, which itself recommends *do not
  schedule*).
- **Author:** Product · 2026-07-17
- **Related:** PRD-2 — the PDDIKTI Edge Function is an argument **for keeping** Supabase, not this.

## Why this PRD reads differently

Product's duty here is to **insist on the problem before the solution.** Writing a normal feature PRD —
problem, users, desired behaviour, acceptance — would manufacture a justification this idea does not
have. So this doc frames the decision honestly and stops there. It is self-contained: the go/no-go gate
below is the whole requirement.

## Problem statement — **currently undefined (this is the crux)**

The proposal: stop talking to Supabase directly via `@supabase/supabase-js` from the device and instead
call a backend service of our own.

**No end-user problem has been identified.** Neither Mom nor Farrel experiences pain today that this
would relieve — the app works, and the setup is **zero-ops** (no server to run, monitor, or pay for).
*"Supabase is a dependency"* is not a problem. Until a **specific limit we have hit** or a **concrete
cost we are paying** is named, there is nothing for a PRD to solve.

The one thing that *is* true — that the connector-contract architecture (`docs/02` §3) would make such
a swap a connector-layer-only change — argues this is **doable**, not that it is **worth doing**.

## Affected users

- **Mom / Farrel (end users):** no user-facing change is proposed or promised; the app behaves the same.
- **Farrel (operator/maintainer):** the *real* party this touches — he would inherit a server to keep
  alive, secure, patch, and pay for, replacing today's zero-ops posture. The "user" of this change is
  an operator, not an operator-of-vehicles.

## Current vs "desired" (not established)

| | Current | Proposed (not established) |
|---|---|---|
| Data path | Device → Supabase via `@supabase/supabase-js` | Device → our backend → database |
| Security boundary | **RLS** (`0006`, `0016`, `0017`), enforced by Postgres | RLS re-implemented in app code, and *trusted* to be correct |
| Auth | `useSession`, `ops`/`admin` gating, `expo-secure-store` tokens | Re-built against the new backend |
| Ops burden | **Zero** — nothing to run | A service to deploy, monitor, patch, and pay for |

There is no established "desired" state, because no motivating problem defines what "better" is.

## Acceptance — a go/no-go gate, not a build checklist

Before **any** implementation PRD, plan, or code for this item:

- [ ] **A concrete motivating problem is named** — a specific limit hit or cost paid, in one sentence,
      not "Supabase is a dependency."
- [ ] It is shown **what breaks or gets harder if we do nothing.**
- [ ] The **smaller-change alternative is ruled out first** — could Supabase **Edge Functions** cover
      the handful of operations that genuinely want server-side logic? (PRD-2 already proves that path
      works and is an argument for *keeping* Supabase.)
- [ ] An **honest security answer** — does re-implementing RLS in app code make the system **more or
      less** secure? (Default expectation: less.)
- [ ] The **ongoing ops cost** (a permanently-running server for a two-person internal tool) is
      explicitly accepted by Farrel as worth it.

If these gates aren't met, the answer is **keep Supabase** — and this doc is closed, not built.

## Non-goals

- **PDDIKTI verification is NOT a reason to do this.** PRD-2 is served by a Supabase **Edge Function** —
  the *smaller change* this doc's gate names — and is an argument for keeping Supabase. Do not chain the
  two.
- Any device/UI change — none is proposed.
- Treating the connector layer's swap-ability as a reason to swap. Cheap ≠ worth it.

## Open questions (must be answered before designing anything)

1. **What problem does this actually solve?** Name it concretely. *(Blocking — everything waits on this.)*
2. What specifically breaks or gets harder if we *don't* do it?
3. Who operates the service — and is a permanently-running server acceptable against today's zero-ops
   setup, for a two-person internal tool?
4. Does re-implementing RLS in app code make the system more or less secure, honestly?
5. Is there a smaller change that gets most of the benefit (Edge Functions for the few operations that
   want server-side logic)?

## Product recommendation

**Do not schedule.** Keep Supabase until open-question 1 has a concrete, validated answer. If a real
motivating problem appears, run `superpowers:brainstorming` on *that problem* — and be genuinely
willing to conclude "keep Supabase."
