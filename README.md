# Personal AI Agent

CLI-first local-first personal AI agent for two classes of work:

- `engineering`: implementation planning, verification planning, repo-oriented execution proposals
- `knowledge`: PRDs, decision memos, research briefs, execution plans, and checklists

## v1 Direction

This repo is building a managed multi-agent runtime first:

`manager -> planner -> executor -> reviewer`

The runtime stays intentionally narrow in v1:

- Node.js ESM
- CLI-first
- stub provider by default
- explicit approval gates before risky actions
- runtime state under `var/`
- repo-tracked strategy and incident docs under `docs/`

## Reference Direction

Reference repos are design input, not vendored implementation:

- `fireauto`: commandized workflow boundaries
- `oh-my-codex`: thin workflow layer over an existing coding agent
- `everything-claude-code`: `agents / skills / hooks / rules` separation
- `mrstack`: persistent memory mindset
- `multi-agent-workflow`: deterministic role sequencing
- `OpenHarness`: harness boundary, governance hooks, session-first orchestration

See [docs/reference-repos.md](/Users/sungjin/dev/personal/personal-ai-agent/docs/reference-repos.md) for the borrowed and rejected patterns.

## Current Commands

Register a workspace:

```bash
node src/cli.mjs workspace add /absolute/path/to/repo --name my-repo
```

Show or list workspaces:

```bash
node src/cli.mjs overview global
node src/cli.mjs overview operator-timeline
node src/cli.mjs workspace list
node src/cli.mjs workspace show workspace_xxx
node src/cli.mjs workspace overview workspace_xxx
node src/cli.mjs workspace timeline workspace_xxx
```

`workspace overview`와 `overview global`은 mission/session/approval 집계뿐 아니라 open escalation pressure, escalation tier 분포, breach count total, reminder count total, needs-reminder count도 함께 보여줍니다.

Create missions:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode knowledge \
  --deliverable prd \
  --title "Draft agent roadmap" \
  --objective "Draft the next milestone PRD"

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Stabilize release smoke" \
  --objective "Produce a bounded implementation proposal" \
  --constraints "Keep blast radius small|Preserve release evidence flow"
```

Run and inspect missions:

```bash
node src/cli.mjs mission list
node src/cli.mjs mission run mission_xxx --provider stub
node src/cli.mjs mission show mission_xxx
node src/cli.mjs mission timeline mission_xxx
node src/cli.mjs session list mission_xxx
node src/cli.mjs session show mission_xxx
node src/cli.mjs session show mission_xxx --session session_xxx
```

`mission timeline`은 session, approval, reviewer follow-up, memory뿐 아니라 mission-scoped escalation open/resolved/reminded event도 함께 보여주며, resolved follow-up은 `rerun-fixed`, `superseded`, `scope-reduced`, `accepted-risk` taxonomy를 detail에 포함합니다. `accepted-risk`는 close와 동시에 monitoring escalation을 열고, 이 escalation은 `action inbox --class monitoring-required`에서 다시 운영 큐로 노출됩니다.

Operator flow:

```bash
node src/cli.mjs action inbox
node src/cli.mjs action inbox --class retry-ready
node src/cli.mjs action inbox --class monitoring-required
node src/cli.mjs action inbox --priority high
node src/cli.mjs action inbox --owner human-approver
node src/cli.mjs action inbox --overdue
node src/cli.mjs action reviewer-followups
node src/cli.mjs action reviewer-followups --status resolved
node src/cli.mjs action reviewer-followups --status resolved --kind scope-reduced
node src/cli.mjs action resolve-reviewer-follow-up reviewer-follow-up:mission_xxx:session_xxx --kind scope-reduced --note "Handled in a narrower follow-up plan"
node src/cli.mjs action resolve-reviewer-follow-up reviewer-follow-up:mission_xxx:session_xxx --kind accepted-risk --note "Accept risk until the next release window"
node src/cli.mjs action log-overdue
node src/cli.mjs action escalated
node src/cli.mjs action escalated --tier critical
node src/cli.mjs action escalated --needs-reminder
node src/cli.mjs action sync-escalations
node src/cli.mjs action remind-escalations --due
node src/cli.mjs action remind-escalations --tier critical --overdue --note "Notify the workspace owner to re-check this pressure"
node src/cli.mjs action resolve-escalation escalation_xxx --note "Handled manually"
node src/cli.mjs approval inbox
node src/cli.mjs approval list
node src/cli.mjs approval resolve approval_xxx --decision approve --reason "Proceed with the proposed workspace change"
```

Memory and documentation:

```bash
node src/cli.mjs memory add --scope user --kind preference --content "Prefer concise decision memos."
node src/cli.mjs memory list --scope user
node src/cli.mjs doc log --type devlog --title "Kickoff" --content "Started managed multi-agent implementation."
```

## Runtime Behavior

`mission run` in v1 performs a deterministic managed sequence:

1. `manager` builds session context and loads memory
2. `planner` produces a bounded plan and adapts it with prior mission memory when available
3. `executor` writes a draft artifact or engineering proposal and carries forward prior mission signals
4. `reviewer` validates required sections and next action
5. if the result is risky, an `Approval` is created and the mission stops at `awaiting_approval`

Engineering mode intentionally stops at proposal quality. It does not mutate registered workspaces in v1.

## State Layout

```text
docs/
  roadmap.md
  reference-repos.md
  devlog.md
  incidents.md
  adr/ADR-001-runtime-and-agent-shape.md

var/
  state.json
  missions/<mission-id>/
    sessions/<session-id>/
      manager-prompt.md
      manager-context.md
      planner-prompt.md
      planner-plan.md
      executor-prompt.md
      implementation-proposal.md
      prd.md
      decision-memo.md
      reviewer-prompt.md
      reviewer-report.md
      approval-resolution.md
```

## Verification

Run the local-first smoke suite:

```bash
npm run smoke
npm run smoke:action-inbox
npm run smoke:escalated-inbox
npm run smoke:escalation-sync
npm run smoke:escalation-reminder-due
npm run smoke:escalation-reminders
npm run smoke:action-overdue-log
npm run smoke:operator-timeline
npm run smoke:reviewer-follow-up-lifecycle
npm run smoke:reviewer-follow-up-accepted-risk
npm run smoke:approval-approve
npm run smoke:approval-inbox
npm run smoke:reviewer-fail
npm run smoke:approval
npm run smoke:approval-reject
npm run smoke:memory-rerun
npm run smoke:session-history
npm run smoke:mission-timeline
npm run smoke:workspace-overview
npm run smoke:global-overview
```

All current smokes are deterministic and require no external API key.
