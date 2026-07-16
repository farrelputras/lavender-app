# LAVENDER Agent System — Design

**Date:** 2026-07-16
**Status:** Approved design — pending implementation plan
**Scope:** A project-local, role-based agent system + workflow for LAVENDER. Built *before* any
further feature/release work, so future delivery is planned, organized, clean, and documented —
not "as long as it works, it's done."

> This system is **specific to LAVENDER** (lives in the repo's `.claude/` and `docs/`), not global.
> It anticipates more platforms later (e.g. a web admin panel), so the roles are real infrastructure,
> not one-off personas.

---

## 1. The reality that shaped this design

Claude Code subagents are **not** an org chart with peers messaging each other. They form a **star**:

- One **top-level session** is the only orchestrator.
- A dispatched subagent **runs autonomously and returns exactly one final message**. It cannot pause
  to talk to the human mid-run, cannot message another subagent, and cannot spawn its own subagents.
- A subagent `.md` file **pins one model**. Frontmatter cannot express a *fallback chain*
  ("if opus is unavailable, use fable") — fallback is inherently a runtime decision.

Two consequences drive the whole design:

1. **The human-facing roles (product, PM, lead) cannot be fire-and-forget subagents** — they need
   live back-and-forth. So they are primarily **skills** the main session runs while staying in the
   chat. The user's actual workflow (one session per role) makes this the natural fit: *the session
   is the role*, and the session's model is chosen to match.
2. **Fallback ladders live in instructions, not frontmatter** — stated in each role's playbook and
   executed by whoever dispatches (the Lead skill, or the human).

---

## 2. The cast

Six roles. Three (product, PM, lead) have **two forms**: a **skill** (primary — for the dedicated
session per role) and a thin **consult-subagent** (for pulling that role, on its own model, into
another session and returning). Developers and tester are **subagent-only**.

| Role | Form(s) | Model: primary → fallback ladder | Touches code? |
|---|---|---|---|
| **Product** | `/product` skill + `product` consult-subagent | Opus xhigh → any fitting/available model at high/xhigh | ❌ — writes only `docs/prd/` |
| **PM** | `/pm` skill + `pm` consult-subagent | Opus xhigh → any fitting/available model at high/xhigh | ❌ — writes only `docs/releases/` |
| **Lead** | `/lead` skill + `lead` consult-subagent | Fable high → Opus xhigh; **never Sonnet**; if neither Fable nor Opus is available → **stop and lay it out to Farrel, decide nothing** | ❌ — never opens code; works from reports |
| **Developer — backend** | subagent only | Sonnet high/xhigh → **stop and lay it out to Farrel** (never substitute Opus/Fable) | ✅ — Supabase, SQL, connector implementations |
| **Developer — frontend** | subagent only | Sonnet high/xhigh → **stop and lay it out to Farrel** | ✅ — RN screens, components, theme, navigation |
| **Tester** | subagent only | Sonnet high/xhigh → higher model at medium/high | ✅ — test files only |

> **Interpretation note (Lead ladder):** the original brief said "if sonnet is also not available, lay
> out to me." Since Sonnet is explicitly forbidden for Lead, this is read as *"if neither Fable nor
> Opus is available."* Confirm during review.

There is **no standalone orchestrator role**. The `/lead` skill orchestrates the delivery session;
**the human is the orchestrator across sessions.** (One fewer moving part — YAGNI.)

### Per-role charters

**Product** — takes the *user's* perspective. Turns feedback, observed bugs, and user-facing
improvement ideas into a PRD. Never touches code. **Minimizes deciding on its own** — anything needing
human judgment is surfaced to Farrel (as a skill it uses `AskUserQuestion` directly; as a
consult-subagent it returns a "draft + open questions" and the caller relays). Output: a PRD in
`docs/prd/<slug>.md`.

**PM** — the middleman between Product and Lead. Core job is **scoping**: which PRD items / features /
fixes fit into a single release, and whether a proposed release is too big, too small, or just right.
Also gives **non-technical** advice and insight to Farrel or other roles. Output: a **release plan**
in `docs/releases/<version>.md` that references the PRD(s) in `docs/prd/` and may add its own
feature/fix items.

**Lead** — advises at a **medium/high level** on the delivered code and tests. **Never opens code**
(no read/write/edit/delete of code); it works purely from the **communication/reports** handed to it.
In the delivery session it dispatches the developer(s) and tester, collects their returned reports,
advises, and authors the **release report** (see §6 for contents). Writing its own report is not
"touching code."

**Developer (backend / frontend)** — does the coding, split cleanly so neither touches the other's
domain (see §4). Iterates in discussion with Lead and Tester. If Sonnet is unavailable it does **not**
escalate to a bigger model — it stops and hands off to Farrel, who can code it himself.

**Tester** — authors **PRD-acceptance** test cases (using the Product PRD as the reference for what
"correct" means), runs the full suite against the delivered code, and outputs a **test-case report**
(pass/fail + coverage gaps vs the PRD). Lead folds this report into the release report.

---

## 3. Files are the contract between role-sessions

Because each role is usually its own session, **the document each role produces is the handoff
interface** to the next role's session. This is the connector-contract philosophy, one level up: a
stable file "signature" is the seam between independently-working sessions.

```
/product session  →  docs/prd/<slug>.md                    (PRD)
      │  (PM's session reads the PRD)
      ▼
/pm session        →  docs/releases/<version>.md            (release plan)
      │  (Lead's session reads the release plan)
      ▼
/lead session      →  dispatch developer(s) + tester
      │                    tester subagent → docs/reports/<version>-tests.md   (test report)
      ▼
                   →  docs/reports/<version>.md             (release report)
```

New directory: **`docs/prd/`** (PRDs). New directory: **`docs/reports/`** (release + test reports).
Release plans continue to live in the existing **`docs/releases/`**.

---

## 4. The developer split = the connector seam

- **Backend dev** owns Supabase — migrations, RLS, RPCs, edge functions — **plus the connector
  *implementations*** (the code that talks to Supabase and translates row ↔ UI type).
- **Frontend dev** owns React Native — screens, components, theme, navigation — consuming connectors
  through their **signatures + camelCase UI types**.
- **The seam is the connector contract.** When a new connector function is needed, Lead brokers its
  **signature** first; then the frontend dev codes against the signature while the backend dev
  implements it — in parallel, no file collisions. This is the same seam that makes the
  in-memory→Supabase swap a connector-layer-only change; here it also enables two-developer parallelism.

> **Open, next-session:** the connector layer lives at `services/rentals/` today but is likely moving
> to `services/api/`. The split above is **path-agnostic** — it binds to "the connector layer,"
> wherever that ends up. Resolve the physical path when the backend-dev playbook is written / during
> the connector refactor session. Do not harden `services/rentals/` into any playbook.

---

## 5. Testing: two layers

- **Developer** keeps the project's TDD discipline: red-green-refactor **unit** tests, colocated with
  the code (`superpowers:test-driven-development`).
- **Tester** authors higher-level **PRD-acceptance / integration** test cases — the ones the developer
  may have missed — runs the full suite, and reports pass/fail + coverage gaps against the PRD.

Different files, different altitude → no test-file collisions. "Verified green" (full suite passing)
remains the ship gate, per CLAUDE.md.

---

## 6. Model routing & fallback — where it lives

Frontmatter pins one model and cannot express fallback, so:

- The **routing ladder is stated in each role's playbook** (`docs/agents/<role>.md`) — the single
  source of truth — and mirrored in the thin wrappers.
- **"Fails" means the model is unavailable** (not enabled / capacity / rate-limited), not "produced
  bad output."
- **Session-roles (product / PM / lead):** the skill opens by declaring its wanted model + effort +
  ladder. The human sets the session model to match; the skill flags a mismatch if the session is on
  the wrong model. If the primary is unavailable, step down the ladder.
- **Dispatched subagents (dev / tester + consult forms):** the dispatcher (the Lead skill, or the
  human) dispatches on the primary via the Agent tool's `model` override; if unavailable, tries the
  next rung; if the ladder's terminal rung is "stop" (the developers), it halts and reports to Farrel
  rather than substituting a different model.

### The release report (Lead's output) must contain

Pre-execution state · post-execution state · what happened during execution (problems & their
solutions) · **decisions taken, each explicitly labelled `[by-agent]` or `[by-Farrel]`** · discussion
with PM and its resolution · bottlenecks · tech debt · best practices applied · agent/workflow
improvements · anything else that belongs in a release report.

---

## 7. Where the files live (DRY)

```
docs/agents/<role>.md         ← canonical playbook — the role's "constitution":
                                 duties, outputs, decision boundaries, model ladder, report format
.claude/skills/<role>/…        ← thin wrapper (product / pm / lead only):
                                 "adopt <role> per docs/agents/<role>.md; stay interactive with Farrel"
.claude/agents/<role>.md       ← thin wrapper + pinned-model frontmatter (all 6 subagent forms):
                                 "adopt <role> per docs/agents/<role>.md"
```

One source of truth per role — behavior is edited in exactly one file (`docs/agents/<role>.md`); the
`.claude/` files stay thin. All project-local; nothing global.

Follows the existing project agent format (`connector-contract-reviewer.md`,
`rental-math-reviewer.md`): `name` / `description` / `tools` frontmatter, plus `model` where a form
pins one.

---

## 8. To verify at build time (not blockers)

1. **Reasoning-effort frontmatter** — model pinning via `model:` is confirmed; confirm whether
   subagent **effort** (high/xhigh/etc.) is settable in the agent definition, or whether it is
   dispatch-/session-level only. Adjust §6 wording accordingly.
2. **Skill form** — confirm `.claude/skills/<role>/SKILL.md` is the right shape for a project-local,
   user-invocable skill (vs a slash-command file), and that `/product` etc. resolve as expected.

---

## 9. Out of scope (for now)

- Any actual feature/release delivery — this design builds the *machine*, not a product increment.
- The `services/rentals/` → `services/api/` connector move (separate next-session task).
- A global (cross-project) version of these agents.
- Automatic model failover — fallback is a documented, human-or-Lead-executed runtime decision, not
  an automated retry system.

---

## 10. Build order (for the implementation plan)

1. Scaffold directories: `docs/prd/`, `docs/reports/`, `docs/agents/`.
2. Write the six canonical playbooks in `docs/agents/`.
3. Write the thin `.claude/agents/*.md` wrappers (6) with pinned-model frontmatter.
4. Write the thin `.claude/skills/*` wrappers (3: product, pm, lead).
5. Verify §8 items; adjust playbooks.
6. Dry-run one thin end-to-end pass (tiny PRD → plan → delivery) to prove the handoffs and dispatch
   wiring before real use.
