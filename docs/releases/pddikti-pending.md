# PDDIKTI student verification — unnumbered backlog

> **Renumbered 2026-07-22 (Farrel's call).** This was `v1-0-4.md`. It gave up the number because it is
> **gated on an unresolved brainstorm** and therefore not schedulable, while PRD-4 + PRD-5 are P0 and
> ready. **`v1.0.4` now means PRD-4 + PRD-5** (`docs/releases/v1-0-4.md`). This release takes a version
> number only when its open questions resolve — deliberately, so a version number never again points at
> work nobody can start.

- **Status:** open — **gated on the PRD-2 brainstorm.** Requirements live in **PRD-2** (partially
  locked); this release is **not yet schedulable** — OQ-2 … OQ-8 must be settled first.
- **Version:** **none assigned.** Do not pre-allocate one; number it when it is scheduled.
- **Delivers:** **PRD-2** (`docs/prd/PRD-2-pddikti-student-verification.md`) — authoritative
  requirements + acceptance (partially locked); not restated here.
- **Ships as (expected):** OTA (device/JS) **+** a Supabase **Edge Function** deploy **+** one small
  migration (adds the `nim` field) via `db push`. No native dep → **no APK, no `version` bump**.
- **Sequencing:** independent of v1.0.3 (shipped) and of **v1.0.4** (PRD-4 + PRD-5) — **do not fold
  any of them together.** Also distinct from **PRD-3 / v1.1** ("replace Supabase"); the stale
  `// v1.1 PDDikti` comments in `types.ts` are a naming trap (see PRD-2).

## Scope & sequencing

- **Gated on its brainstorm.** PRD-2 has resolved OQ-1 (the lookup keys on **NIM**); OQ-2 … OQ-8 remain
  and must be settled via `superpowers:brainstorming` **before** this release is planned or scheduled.
- **Order:** v1.0.3 shipped 2026-07-21; **v1.0.4** (PRD-4 + PRD-5, both P0) goes next. This release
  follows once its open questions resolve. Do **not** start implementation ahead of that.

## Delivery model

- OTA JS + **Edge Function deploy** (`supabase functions deploy`) + one small migration (adds `nim`).
- **Server-side patchability is the point:** the PDDIKTI source is unofficial and fragile, so a break
  is fixed by redeploying the function — **no OTA, no APK, no waiting for Mom to relaunch.** (Why the
  Edge Function, and why Supabase can serve this: PRD-2 §Decisions #2.)

## Dependencies & risks

- **Net-new Edge Function tooling.** No `supabase/functions/` directory exists yet, so first-time
  scaffold + secrets + deploy is part of this release's cost/risk.
- A **write path** to persist results is required (`CreateUserInput`/`UpdateUserInput` do not carry the
  PDDIKTI fields today) — the trust model is PRD-2 OQ-8.

## Verify & rollback

- **Verify:** compile/lint/test green; plus the found / not-found / upstream-failure behaviour the
  brainstorm defines (PRD-2 AC-1 … AC-8).
- **Rollback:** the Edge Function has its **own** rollback (redeploy the prior function version),
  independent of the OTA bundle; the migration is additive.

## Open questions

See **PRD-2** — **OQ-1 resolved → NIM**; **OQ-2 … OQ-8 open**, to be settled in the brainstorm before
planning. (This replaces the earlier list that lived here, which still marked NIM-vs-name as open and
now contradicts PRD-2.)
