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
- stub provider by default, with an OpenAI adapter available behind `OPENAI_API_KEY`
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

`workspace overview`와 `overview global`은 mission/session/approval 집계뿐 아니라 open escalation pressure, escalation tier 분포, breach count total, reminder count total, needs-reminder count, owner transition total, pending owner handoff overdue count, pending owner handoff reminder count, next pending owner handoff due/reminder timestamp, 그리고 maintenance가 실제로 영향을 준 mission breadth까지 함께 보여줍니다. `workspace overview`는 workspace-scope run뿐 아니라 global sweep나 mission-scope sweep가 이 workspace mission에 남긴 maintenance impact도 함께 집계합니다.

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
OPENAI_API_KEY=... node src/cli.mjs mission run mission_xxx --provider openai
node src/cli.mjs mission show mission_xxx
node src/cli.mjs mission timeline mission_xxx
node src/cli.mjs session list mission_xxx
node src/cli.mjs session show mission_xxx
node src/cli.mjs session show mission_xxx --session session_xxx
node src/cli.mjs overview maintenance
node src/cli.mjs overview maintenance --outcome effective
node src/cli.mjs overview maintenance --since 2026-04-01T00:00:00.000Z
```

`mission timeline`은 session, approval, reviewer follow-up, memory뿐 아니라 mission-scoped escalation open/resolved/reminded event도 함께 보여주며, resolved follow-up은 `rerun-fixed`, `superseded`, `scope-reduced`, `accepted-risk` taxonomy를 detail에 포함합니다. `accepted-risk`는 close와 동시에 monitoring escalation을 열고, owner transition이 발생하면 해당 escalation은 `action inbox --class handoff-required`와 `action owner-handoffs`에서 acknowledgement queue로 다시 노출됩니다. owner handoff에는 별도 reminder trail도 붙으며, overdue acknowledgement나 re-notify 모두 timeline detail에 남습니다. mission-scoped maintenance sweep를 실행하면 mission summary와 mission timeline도 직접 maintenance evidence를 보여주고, workspace-wide maintenance sweep가 특정 mission pressure를 처리한 경우에도 mission timeline에는 related `maintenance-run` evidence가 연결됩니다. mission summary는 direct maintenance aggregate와 별도로 combined `maintenance impact` summary를 제공해, indirect workspace sweep가 이 mission에 준 reminder 효과도 한 번에 확인할 수 있습니다. unified `action inbox`는 이제 monitoring escalation과 owner handoff reminder pressure를 공통 `--needs-reminder` slice로도 보여줍니다. workspace/global operator timeline은 maintenance sweep 실행뿐 아니라 pressure를 실제로 처리한 `maintenance-required-acknowledged`, `maintenance-required-resolved` evidence도 함께 보여줍니다.

Operator flow:

```bash
node src/cli.mjs action inbox
node src/cli.mjs action inbox --class retry-ready
node src/cli.mjs action inbox --class handoff-required
node src/cli.mjs action inbox --class maintenance-required
node src/cli.mjs action inbox --class monitoring-required
node src/cli.mjs action inbox --class monitoring-required --effective-owner human-approver
node src/cli.mjs action inbox --needs-reminder
node src/cli.mjs action inbox --priority high
node src/cli.mjs action inbox --owner human-approver
node src/cli.mjs action inbox --overdue
node src/cli.mjs action maintenance --workspace workspace_xxx --note "Sweep due reminders for escalations and owner handoffs"
node src/cli.mjs action maintenance-history
node src/cli.mjs action maintenance-history --outcome no-op
node src/cli.mjs action maintenance-history --since 2026-04-01T00:00:00.000Z
node src/cli.mjs action reviewer-followups
node src/cli.mjs action reviewer-followups --status resolved
node src/cli.mjs action reviewer-followups --status resolved --kind scope-reduced
node src/cli.mjs action owner-handoffs
node src/cli.mjs action owner-handoffs --needs-reminder
node src/cli.mjs action owner-handoffs --overdue
node src/cli.mjs action owner-handoffs --status acknowledged
node src/cli.mjs action resolve-reviewer-follow-up reviewer-follow-up:mission_xxx:session_xxx --kind scope-reduced --note "Handled in a narrower follow-up plan"
node src/cli.mjs action resolve-reviewer-follow-up reviewer-follow-up:mission_xxx:session_xxx --kind accepted-risk --note "Accept risk until the next release window"
node src/cli.mjs action log-overdue
node src/cli.mjs action escalated
node src/cli.mjs action escalated --tier critical
node src/cli.mjs action escalated --needs-reminder
node src/cli.mjs action escalated --needs-reminder --effective-owner human-approver
node src/cli.mjs action sync-escalations
node src/cli.mjs action remind-escalations --due
node src/cli.mjs action remind-escalations --tier critical --overdue --note "Notify the workspace owner to re-check this pressure"
node src/cli.mjs action remind-owner-handoffs --due --note "Follow up with the human approver about the pending handoff"
node src/cli.mjs action acknowledge-owner-handoff escalation_xxx --note "Human approver acknowledged the ownership handoff"
node src/cli.mjs action resolve-escalation escalation_xxx --note "Handled manually"
node src/cli.mjs approval inbox
node src/cli.mjs approval list
node src/cli.mjs approval resolve approval_xxx --decision approve --reason "Proceed with the proposed workspace change"
```

`action maintenance-history`와 `overview maintenance`는 이제 reminder total뿐 아니라 affected mission breadth, latest impact run, latest impact mission ids도 같이 보여줍니다. `--workspace`는 global sweep와 mission-scope run이 이 workspace mission에 남긴 impact까지 포함하고, `--mission`은 related workspace sweep를 history item으로 포함하면서도 mission-specific reminder effect는 별도 `missionImpact*` summary field로 같이 보여줍니다. 또 maintenance 전용 summary는 `effectiveRunCount`, `noOpRunCount`, `impactRunCount`, `latestEffectiveRun`, `latestNoOpRun`, `recentRuns`를 함께 반환해서 최근 sweep trend를 raw item 재해석 없이 바로 확인할 수 있고, `--outcome <effective|no-op|impactful>`로 원하는 run slice만 직접 조회할 수 있습니다. `--since <iso-timestamp>`를 함께 주면 최근 기간 run만 남겨서 time-window audit도 할 수 있습니다. 추가로 `dailyBuckets`는 filtered run set을 날짜별로 묶어 runCount, effective/no-op split, totalRemindedCount, affected mission breadth를 같이 보여주고, `latestBucketDelta`는 최신 날짜 bucket과 직전 bucket의 차이를 바로 요약합니다.

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

## Provider Notes

- `stub` remains the deterministic default for local development and smoke coverage.
- `openai` now uses the OpenAI Responses API and reads:
  - `OPENAI_API_KEY` required
  - `OPENAI_MODEL` optional, default `gpt-5.2`
  - `OPENAI_BASE_URL` optional, default `https://api.openai.com/v1`
- if `OPENAI_API_KEY` is missing, `mission run --provider openai` fails fast before any network call.

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
npm run smoke:escalation-owner-chain
npm run smoke:escalation-owner-handoff
npm run smoke:escalation-owner-handoff-reminders
npm run smoke:escalation-owner-history
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
npm run smoke:openai-provider
```

All current smokes are deterministic and require no external API key.
