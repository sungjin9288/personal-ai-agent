# Personal AI Agent

Local-first AI agent scaffold for two modes of work:

- `engineering`: coding, implementation planning, verification, repo-oriented execution
- `knowledge`: decision support, PRD drafting, research briefs, execution plans, checklists

This repo is intentionally small. The goal is to lock the control-plane shape first:

- workspace registry
- mission creation
- pack-aware planning artifacts
- prompt bundle generation
- local state and artifact retention

## Why A Separate Repo

`orchestration` now contains repo-specific QA and verification improvements that are useful to that project and should stay there.

This repo is the actual product direction for a broader personal agent that can help with:

- coding
- decisions
- documents
- planning

## Inspirations

- `fireauto`: commandized workflows and bounded roles
- `oh-my-codex`: thin workflow layer over a coding agent
- `everything-claude-code`: `agents / skills / hooks / rules` separation
- `mrstack`: persistent memory and always-on assistant mindset
- `multi-agent-workflow`: planner / critic / checker sequencing
- `OpenHarness`: tool-use, skills, memory, governance, and swarm coordination as first-class harness layers

## What To Borrow From OpenHarness

Borrow now:

- explicit harness boundary: model intelligence vs. tools / memory / permissions
- skill loading and prompt assembly as separate layers
- governance hooks before risky execution
- session state and resumable mission history

Borrow later:

- richer provider abstraction
- interactive approvals and path-level command policy
- background subagent lifecycle
- terminal UI and channel integrations

## Current Scope

MVP features in this scaffold:

- register workspaces
- create missions
- select `engineering` or `knowledge` mode
- select `knowledge` deliverable types:
  - `decision-memo`
  - `prd`
  - `execution-plan`
  - `research-brief`
  - `checklist`
- generate:
  - a prompt bundle
  - a bounded plan artifact
  - mission state on disk

## Usage

Register a workspace:

```bash
node src/cli.mjs workspace add /absolute/path/to/repo --name my-repo
```

List workspaces:

```bash
node src/cli.mjs workspace list
```

Create an engineering mission:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Stabilize release smoke" \
  --objective "Fix flaky release evidence path" \
  --constraints "Keep blast radius small"
```

Create a knowledge mission:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode knowledge \
  --deliverable prd \
  --title "Agent roadmap draft" \
  --objective "Draft a PRD for the next milestone"
```

Run a mission:

```bash
node src/cli.mjs mission run mission_xxx
```

Show mission details:

```bash
node src/cli.mjs mission show mission_xxx
```

Run the smoke test:

```bash
node scripts/smoke.mjs
```

## State Layout

Generated local state lives under:

```text
var/
  state.json
  missions/<mission-id>/
    prompt.md
    engineering-plan.md
    decision-memo.md
    prd.md
    execution-plan.md
    research-brief.md
    checklist.md
```

## Next Steps

Natural follow-ups after this scaffold:

1. provider abstraction for OpenAI / Anthropic / local models
2. memory layers for user preferences and decision logs
3. planner / executor / reviewer role orchestration
4. approval gates for risky actions
5. OpenHarness-style hook and permission layer
6. Slack / Telegram / desktop surfaces
