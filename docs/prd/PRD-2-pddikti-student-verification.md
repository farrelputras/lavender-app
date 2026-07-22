# PRD-2 — PDDIKTI student verification

- **PRD:** 2 — refer to this as **PRD-2**.
- **Status:** requirements **partially locked.** Purpose + architecture are decided; several flow
  decisions are open and belong to a dedicated `superpowers:brainstorming` session **before** planning.
- **Target release:** **unnumbered backlog** — `docs/releases/pddikti-pending.md`. This PRD is the
  authoritative requirements; the release plan refers to it.
  > **Renumbered 2026-07-22 (PM, Farrel's call).** This held **v1.0.4** until then. It gave the number
  > up because it is gated on an unresolved brainstorm and therefore not schedulable, while PRD-4 +
  > PRD-5 are P0 and ready. **`v1.0.4` now means PRD-4 + PRD-5** — do not read any older reference to
  > "v1.0.4" in this file or elsewhere as pointing at PDDIKTI. This release gets a number when its open
  > questions resolve.
- **Author:** Product · 2026-07-17
- **Related:** PRD-3 (the "v1.1 replace Supabase" idea — **not** this; see the naming-trap note below).
- **Resolved this session:** the lookup keys on **NIM** — Mom captures the NIM / it is legible on the
  KTM photo. So the flow is precise, ~one-match, **tap-to-confirm**, not "read a list and guess."

## Summary

Mom hands vehicles to customers, many of them students, with **no independent trust signal** beyond a
KTM (student-card) photo that can be faked or stale — and she **re-types** each student's university,
program, and entry-year by hand. This feature verifies a customer against **PDDIKTI** (the national
higher-ed database) by NIM: on a match it confirms the student is real and **autofills** those fields.
Verification is a **positive signal only** — its absence never blocks registration or renting.

## Problem statement

- **No trust signal.** Mom relies on a KTM photo — forgeable, borrowable, stale — with nothing to
  confirm the person is a real, current student before she releases a car.
- **Manual, error-prone data entry.** University / prodi / entry-year are hand-typed at exactly the
  moment she is busy at handover.

## Affected users

- **Mom (`ops`, primary).** Gains a real trust signal before releasing a vehicle, and stops hand-typing
  academic fields.
- **Farrel (`admin`).** Cares about reducing fraud exposure; may run or re-run verification.

## Decisions locked (do not relitigate)

1. **Its own release.** Not folded into v1.0.3, not into v1.0.4 (PRD-4 + PRD-5), and **not** the
   "v1.1 replace Supabase" idea despite stale `// v1.1 PDDikti` comments in the code — that label is a
   known **naming trap** (PRD-3). *The decision locked here is "its own release"; the version number
   attached to it is not part of the decision and was released on 2026-07-22 — see Target release.*
2. **A Supabase Edge Function proxies PDDIKTI.** The device calls **our** Edge Function and never calls
   PDDIKTI directly, because every "PDDIKTI API" is unofficial and fragile; a break must be fixable
   server-side (`supabase functions deploy`) with no OTA/APK and no waiting for Mom to relaunch. This
   makes the feature an argument **for keeping Supabase**, not against it.
3. **Purpose is trust + autofill; verification is a positive signal only** — its absence never blocks
   registration or renting.
4. **Lookup keys on NIM** (resolved this session). There is no `nim`/`nrp` column today, so this
   release adds that one field and the capture UX collects it.

## Goals

- **G1** Give Mom an independent trust signal (a real, current student record) before she releases a car.
- **G2** Autofill `nama_pddikti` / `universitas` / `prodi` / `tahun_masuk` instead of hand-typing.
- **G3** Never let verification block registration or renting.
- **G4** Keep the fragile PDDIKTI dependency **server-side** so a break is fixed without OTA/APK.

## Non-goals

- Gating rentals or registration on verification — never.
- A general PDDIKTI search/browser tool — this is a targeted verify-this-customer flow.
- Folding into PRD-1 or PRD-3.

## Behavioral requirements

- **BR-1 (NIM capture).** A student user record captures the NIM (typed or read from the KTM) and
  persists it. This release adds the field.
- **BR-2 (verify action).** Mom triggers verification; the app looks up the NIM against PDDIKTI **via
  our Edge Function**.
- **BR-3 (found).** Status becomes `TERVERIFIKASI_PDDIKTI`; `nama_pddikti` / `universitas` / `prodi` /
  `tahun_masuk` autofill; the fields remain editable by Mom.
- **BR-4 (not found).** Mom sees a clear "not found" message, fills the fields by hand, and the record
  stays **usable** and **unverified**.
- **BR-5 (never blocks).** Registration and rental creation are never gated on verification status.
- **BR-6 (degrade gracefully).** If the Edge Function is down / rate-limited / the upstream schema
  changed, Mom sees a clear "couldn't verify right now — try later or fill by hand," proceeds by hand,
  and nothing crashes or blocks.
- **BR-7 (visible payoff).** A verified user is visibly distinguishable from an unverified one (badge —
  exact location is an open question).
- **BR-8 (secrets server-side).** No PDDIKTI hostname or token ships on the device.
- **BR-9 (error shape).** The connector calling the Edge Function throws a real `Error(message)`; tests
  mock the **plain-object** Supabase error shape, never `new Error(...)`.

## User flow (NIM path)

Register or open a student user → enter / confirm the NIM → tap **Verify** → *[confirm the single
returned record? — OQ-2]* → **found:** autofill the four fields + mark verified · **not found:** clear
message + hand-fill, stays unverified.

## Acceptance criteria (testable)

**Locked (buildable now):**

- [ ] **AC-1** NIM is captured and persisted for a student user. *(BR-1)*
- [ ] **AC-2** A found match sets `TERVERIFIKASI_PDDIKTI` and autofills the four fields, which remain
      editable. *(BR-3)*
- [ ] **AC-3** A not-found result shows a clear message, allows hand-fill, leaves the record unverified
      and fully usable. *(BR-4)*
- [ ] **AC-4** Registration and rental creation are **never** blocked by verification. *(BR-5)*
- [ ] **AC-5** The device calls **only** our Edge Function; no PDDIKTI host/token is present on the
      device. *(BR-2, BR-8)*
- [ ] **AC-6** An upstream failure degrades to a clear message with no crash and no block. *(BR-6)*
- [ ] **AC-7** Verified users are visibly distinguishable. *(BR-7)*
- [ ] **AC-8** The connector throws a real `Error`; tests mock the plain-object error. *(BR-9)*

**Depend on open questions (finalize during the brainstorm):**

- [ ] **AC-9** Match-confirmation behaviour is defined and built (auto-accept vs one-tap confirm — OQ-2).
- [ ] **AC-10** `VERIFIKASI_GAGAL` vs `BELUM_DIVERIFIKASI` semantics are defined and applied (OQ-3).
- [ ] **AC-11** Verification entry points are defined and built (OQ-4).
- [ ] **AC-12** The visible payoff of "verified" is defined and built — badge location; dashboard count
      (OQ-7).

## Constraints the design must honor (Product-surfaced)

- **`SECURITY DEFINER` only covers what runs inside the function.** A service-role Edge Function write
  is a different trust model from a client RLS write — choose the write path deliberately (OQ-8).
- **Plain-object Supabase errors** (BR-9).
- **Edge Functions are net-new tooling** for this repo (no `supabase/functions/` yet) — first-time
  scaffold, secrets, and deploy are part of the work.
- Migration adds the **NIM** field; the PDDIKTI columns (`nama_pddikti`, `tahun_masuk`, `universitas`,
  `prodi`, `verification_status`, `verified_at`, `is_mahasiswa`) already exist, but
  `CreateUserInput`/`UpdateUserInput` do not carry them — a **write path** to persist results is
  required either way.

## Open questions (for the brainstorming session)

> **OQ-1 (NIM vs name) is resolved: NIM.** The rest remain and must be settled before planning.

- **OQ-2** Match-confirmation UX — auto-accept the single hit, or show Mom the one returned record
  (name + PT + prodi) to confirm before autofilling?
- **OQ-3** `VERIFIKASI_GAGAL` (attempted, no/mismatched result) vs staying `BELUM_DIVERIFIKASI` (never
  attempted).
- **OQ-4** When verification runs — at registration, on-demand from the user detail, or both? Is
  re-verification ever needed?
- **OQ-5** Which unofficial PDDIKTI source, its failure modes, and a sentence on legal/ToS posture.
- **OQ-6** Caching & privacy — re-use prior results? How long is scraped student data retained, and is
  that acceptable?
- **OQ-7** What "verified" visibly buys — a badge on `UserDetailScreen` / `PilihUserScreen`? Does it
  light up the existing `verifiedUsersCount` on the dashboard? Any effect in the rental flow, or purely
  informational?
- **OQ-8** Write path / trust model — a `SECURITY DEFINER` RPC (client-triggered) or the Edge Function
  writing with the service role?
