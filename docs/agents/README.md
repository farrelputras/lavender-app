# LAVENDER Agent System

Role-based agents + workflow for LAVENDER. Design: `docs/superpowers/specs/2026-07-16-agent-system-design.md`.

## How it works

- **Behavior** lives in the playbook per role: `docs/agents/<role>.md`.
- **Mechanism** lives in thin wrappers:
  - `.claude/skills/<role>/SKILL.md` — interactive roles (product, pm, lead), run in your session.
  - `.claude/agents/<role>.md` — every dispatched (subagent) form; pins the model.
- The main session is the only orchestrator. Subagents run once and return one message; they cannot
  talk to you mid-run, message each other, or spawn subagents.
- **Files are the contract between role-sessions:**
  `docs/prd/<slug>.md` → `docs/releases/<version>.md` → `docs/reports/<version>.md`.

## Usage

- Open a session per role and set the session model to match (see routing table).
  Invoke `/product`, `/pm`, or `/lead`.
- To consult a role at its own model from another session, dispatch its subagent
  (`product`, `pm`, `lead`, `developer-backend`, `developer-frontend`, `tester`).

## Effort

Effort: not settable in frontmatter on this version — stated as body guidance only. Farrel sets session effort for the skill roles (`/product`, `/pm`, `/lead`); subagent forms run at their model's default effort.

## Master routing table

| Role | Forms | model | Effort | Fallback ladder | Subagent tools |
|---|---|---|---|---|---|
| product | /product + product | opus | xhigh | Opus xhigh → any available high/xhigh | Read, Grep, Glob |
| pm | /pm + pm | opus | xhigh | Opus xhigh → any available high/xhigh | Read, Grep, Glob |
| lead | /lead + lead | fable | high | Fable high → Opus xhigh; never Sonnet; else stop + tell Farrel | Read |
| developer-backend | developer-backend | sonnet | high/xhigh | stop + tell Farrel (never Opus/Fable) | Read, Grep, Glob, Edit, Write, Bash |
| developer-frontend | developer-frontend | sonnet | high/xhigh | stop + tell Farrel | Read, Grep, Glob, Edit, Write, Bash |
| tester | tester | sonnet | high/xhigh | higher model at medium/high | Read, Grep, Glob, Edit, Write, Bash |

## Playbook template

Every `docs/agents/<role>.md` uses these sections:
`# <Role> — Playbook` · **Type** · **Model** · **Never** · `## Identity` · `## Responsibilities`
· `## Inputs` · `## Output` · `## Decision boundaries` · `## Model routing` · `## Tools` · `## Handoff`.
