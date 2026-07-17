# PROJECT CONTINUATION DOCUMENT
## Session — 2026-07-16 (agent-system build)

### 1. PROJECT IDENTITY

- **Project Name:** LAVENDER (agent-system sub-project)
- **What This Project Is:** LAVENDER is an internal vehicle-rental operations app (Expo/React Native + Supabase) for Farrel's mom's business. *This* sub-project builds a **role-based AI agent system + workflow** inside the repo, so future delivery is planned, organized, clean, and documented — not "as long as it works."
- **Primary Objective:** Ship a project-local set of six delivery roles (product, PM, lead, backend dev, frontend dev, tester) with a repeatable workflow, before doing any further feature/release work.
- **Strategic Intent:** LAVENDER will grow to more platforms (e.g. a web admin panel). The roles are real, reusable infrastructure — an "org chart" for AI-driven delivery — not one-off personas.
- **Hard Constraints:**
  - **Star topology only.** One top-level session is the orchestrator. Subagents run once, return one message, can't talk to the user mid-run, can't message each other, can't spawn subagents.
  - **Model pinning:** subagent `.md` frontmatter pins one `model:` (`opus`/`fable`/`sonnet`/`haiku`). Fallback ladders are **not** frontmatter — they're runtime decisions in the playbooks/dispatcher.
  - **Effort is NOT a frontmatter key** on this Claude Code version. Session effort covers skill roles; subagents run at their model default. (Do not add an `effort:` key — it can make an agent fail to load silently.)
  - Everything **project-local** (repo `docs/` + `.claude/`), nothing global.
  - Agent system is docs/config only — it changes **no application code**.

### 2. WHAT EXISTS RIGHT NOW

- **What is built and working (verified this session):**
  - All 6 roles, on branch `agents-system` (NOT merged). 3 roles have dual forms:
    - **product / pm / lead** = a `/…` **skill** (runs in your session) + a **consult-subagent** (isolated context, own model).
    - **developer-backend / developer-frontend / tester** = **subagent-only.**
  - Canonical playbooks in `docs/agents/*.md` (behavior) + thin wrappers in `.claude/agents/*.md` and `.claude/skills/<role>/SKILL.md` (mechanism).
  - `docs/agents/README.md` holds the master routing table + playbook template.
  - New dirs `docs/prd/`, `docs/reports/` (with `.gitkeep`).
  - `.gitignore` exception so `.claude/agents/` + `.claude/skills/` version while session state stays ignored.
  - CLAUDE.md has an "Agent System" pointer.
  - **Task 8 dry-run PASSED in-session:** the `product` subagent loaded on its pinned model, grounded a PRD in real source files, returned `## OPEN QUESTIONS`, and wrote nothing (Write tool withheld — hard-enforced).
- **What is partially built:** Nothing. All 8 plan tasks complete + reviewed clean (per-task reviewers + a final Opus whole-branch review: ✅ ready to merge).
- **What is broken or blocked:** Nothing blocked. The branch is intentionally **not merged** (Farrel's call — Option 3 "keep as-is").
- **What has NOT been started yet:** Any *use* of the system on a real deliverable (a genuine PRD → release plan → delivery cycle). No web-admin-panel work.

### 3. ARCHITECTURE & TECHNICAL MAP

- **Tech stack / tools:** Claude Code agents (`.claude/agents/*.md`, YAML frontmatter: `name`/`description`/`tools`/`model`) + skills (`.claude/skills/<name>/SKILL.md`, frontmatter `name`/`description`). Superpowers workflow skills (brainstorming → writing-plans → subagent-driven-development → finishing-a-development-branch) were used to build it.
- **Key files:**
  - Design spec: `docs/superpowers/specs/2026-07-16-agent-system-design.md`
  - Implementation plan: `docs/superpowers/plans/2026-07-16-agent-system.md`
  - Progress ledger: `.superpowers/sdd/progress.md` (git-ignored scratch; source of truth for what's done)
  - Playbooks: `docs/agents/{product,pm,lead,developer-backend,developer-frontend,tester}.md` + `README.md`
  - Wrappers: `.claude/agents/*.md`, `.claude/skills/{product,pm,lead}/SKILL.md`
- **How the system works end-to-end (intended workflow):**
  1. **PRD session:** open a session, set model to Opus/xhigh, `/product`. Product turns feedback/bugs/improvements into a PRD in `docs/prd/<slug>.md`, staying in dialogue with Farrel (`AskUserQuestion`).
  2. **Planning session:** Opus/xhigh, `/pm`. PM scopes the PRD(s) into a right-sized `docs/releases/<version>.md`, non-technical only.
  3. **Delivery session:** Fable/high, `/lead`. Lead reads the release plan, **dispatches** `developer-backend` + `developer-frontend` + `tester` (Sonnet), brokers the connector-signature agreement between the two devs, collects their inline reports, advises, and writes `docs/reports/<version>.md`. Lead never opens code.
  4. **Consult mid-session:** from any session, dispatch a `product`/`pm`/`lead` subagent to get that role's view on *its own* model, returned inline.
- **Naming/standards:** Files are the **handoff contract** between role-sessions: `docs/prd/` → `docs/releases/` → `docs/reports/`. Model routing table is the single source of truth in `docs/agents/README.md`.
- **Master routing table (verbatim):** product=opus/xhigh (→ any available high/xhigh); pm=opus/xhigh (→ any available high/xhigh); lead=fable/high (→ opus/xhigh; **never Sonnet**; else stop+tell Farrel); developer-backend=sonnet high/xhigh (→ **stop+tell Farrel**, never Opus/Fable); developer-frontend=sonnet (same); tester=sonnet (→ higher model medium/high). Tools: product/pm=Read,Grep,Glob; lead=Read; devs+tester=Read,Grep,Glob,Edit,Write,Bash.
- **External dependencies:** none new. (LAVENDER app itself uses Supabase; the agent system doesn't.)

### 4. RECENT WORK — WHAT JUST HAPPENED (HIGH PRIORITY)

- **Worked on this session:** Brainstormed the whole design, wrote the spec + an 8-task plan, then executed all 8 tasks subagent-driven (Haiku implementers for transcription + Haiku task-reviewers per task + one Opus final review). Ran the Task 8 dry-run.
- **Decisions made and WHY:**
  - **Skills for the interactive roles, subagents for the autonomous ones.** Farrel works one-session-per-role, so *the session is the role* — the session model honors the routing rules better than frozen frontmatter, and fallback is inherently a runtime choice. product/pm/lead ALSO get consult-subagent forms for cross-session "get an X opinion on its own model" (Farrel's stated need).
  - **Two-layer testing.** Developers keep TDD unit tests (red-green-refactor); Tester authors PRD-acceptance/integration cases above them and reports gaps. Chosen to preserve the project's existing TDD gate while adding an independent PRD-truth check. "If code contradicts the PRD, report a failure — don't adjust the test to match code."
  - **Dev split at the connector seam,** described **path-agnostically** (both `services/rentals/` today and likely `services/api/` later — the physical move is a separate future task). Backend owns Supabase + connector *implementations*; frontend owns RN UI + connector *signatures/types*; Lead brokers new signatures so both work in parallel without collision.
  - **`.claude/` gitignore exception (Farrel's call).** `.claude/` was blanket-ignored, so the 2 pre-existing reviewers were untracked. Chose to track `agents/` + `skills/` via `.claude/*` + `!.claude/agents/` + `!.claude/skills/`; session state stays ignored.
  - **No standalone orchestrator role** — absorbed into `/lead` + the human as cross-session orchestrator (YAGNI).
- **What changed in the system:** 11 commits on `agents-system` (base `ef271f6` master), +1573 lines, 24 files — all docs/`.claude`/`.gitignore`/CLAUDE.md; **zero application code**.
- **Discussed but NOT implemented:** Merging the branch; any real deliverable run; the `services/rentals/`→`services/api/` connector move.
- **Open threads:** (a) merge decision; (b) first real end-to-end use; (c) whether to also verify a full delivery-session dispatch (lead → devs → tester) before trusting it on real work.

### 5. WHAT COULD GO WRONG

- **Known issues:** None functional. Two final-review Minors were fixed (commit `49c4559`): stale `apps/mobile/` paths in the 2 reviewers → `apps/lavender-ops-mobile/`; plan's "subagents never write reports" overgeneralization → carved out the tester.
- **Edge cases:**
  - **New agents register only on session restart** (skills register live). This session, `product` dispatch first failed "Agent type not found", then succeeded later — so if a freshly-added agent won't dispatch, **restart the session**.
  - Skill-role tool limits and "never touches code" are **disciplinary** (the main session has all tools); only subagent tool lists are hard-enforced.
- **Tech debt / shortcuts:** Effort can't be pinned per-subagent (no frontmatter key) — accepted, documented. Line-ending warnings (LF→CRLF) on commit are cosmetic (Windows), consistent with the repo's known CRLF debt.
- **Assumptions that could be wrong:** The full **delivery chain** (lead dispatching devs + tester, brokering a connector signature, writing a report) has NOT been exercised end-to-end — only the single `product` consult was smoke-tested. Don't assume the multi-agent delivery flow is proven until it's run once.

### 6. HOW TO THINK ABOUT THIS PROJECT

1. **Core pattern:** *Behavior/mechanism split* — playbooks in `docs/agents/` are the versioned "constitution"; `.claude/` wrappers are thin, swappable mechanism (skill vs subagent). Same instinct as LAVENDER's connector contract: a stable interface with replaceable implementation. Chosen so a role's judgment is edited in ONE prose file, and the same role can exist as both a live skill and a pinned-model subagent without drift.
2. **Most common mistake:** Assuming subagents can talk to the user or to each other. They can't — everything routes through the top-level session. Also: adding an `effort:` frontmatter key (unsupported → silent load failure), or hardening the connector path to `services/rentals/`.
3. **Looks refactorable but must NOT be:** The apparent "duplication" between `docs/agents/<role>.md` and the thin `.claude/` wrappers is intentional — the wrappers deliberately just point at the playbook. Don't fold them together; the two-file split is what lets one role have both a skill and a subagent form.

### 7. DO NOT TOUCH LIST

- Do NOT merge `agents-system` to master without Farrel's say-so (he chose to keep it as-is).
- Do NOT `git add` `docs/releases/v1-0-3.md` or `docs/releases/v1-0-4.md` — unrelated in-flight work, left uncommitted on purpose.
- Do NOT add an `effort:` frontmatter key to any agent — it isn't supported and can break loading silently.
- Do NOT harden the connector path to `services/rentals/` — keep it path-agnostic (`services/api/` move is coming).
- Do NOT change the model routing table without updating `docs/agents/README.md` AND every affected playbook + wrapper together.
- Preserve the behavior/mechanism split and existing naming. Ask before new frameworks/deps.
- Do NOT touch LAVENDER application code as part of agent-system work — this sub-project is docs/config only.

### 8. CONFIDENCE & FRESHNESS

- §1 Identity — ✅ HIGH (defined this session)
- §2 What exists — ✅ HIGH (built + reviewed this session; Task 8 dry-run verified)
- §3 Architecture — ✅ HIGH (routing table + paths verified against committed files)
- §4 Recent work — ✅ HIGH (this session)
- §5 What could go wrong — ✅ HIGH for the reload/enforcement facts; ⚠️ MEDIUM on the delivery-chain assumption (only `product` smoke-tested)
- §6 How to think — ✅ HIGH
- §7 Do-not-touch — ✅ HIGH
