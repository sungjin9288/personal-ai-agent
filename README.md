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
- stub provider by default, with OpenAI, Anthropic, and local adapters available behind provider-specific configuration
- optional manager-controlled parallel specialist fan-out across `research`, `implementation`, and `verification`
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
node src/cli.mjs overview providers
node src/cli.mjs overview operator-timeline
node src/cli.mjs provider list
node src/cli.mjs provider check openai
node src/cli.mjs provider activity
node src/cli.mjs provider activity-timeline --provider stub
node src/cli.mjs provider events --provider local
node src/cli.mjs provider probe openai
node src/cli.mjs provider history
node src/cli.mjs provider timeline
node src/cli.mjs workspace list
node src/cli.mjs workspace show workspace_xxx
node src/cli.mjs workspace overview workspace_xxx
node src/cli.mjs workspace timeline workspace_xxx
```

`workspace overview`와 `overview global`은 mission/session/approval 집계뿐 아니라 open escalation pressure, escalation tier 분포, breach count total, reminder count total, needs-reminder count, owner transition total, pending owner handoff overdue count, pending owner handoff reminder count, next pending owner handoff due/reminder timestamp, 그리고 maintenance가 실제로 영향을 준 mission breadth까지 함께 보여줍니다. `overview global`은 여기에 provider health summary와 nested `providerOverview`도 포함해서 configured/ready provider 수, latest probe success or failure, unprobed provider 수, pending provider attention overdue count, pending provider attention needs-reminder count, next provider attention due/reminder timestamp, latest provider attention reminder를 top-level control-plane에서 바로 확인할 수 있습니다. `workspace overview`는 workspace-scope run뿐 아니라 global sweep나 mission-scope sweep가 이 workspace mission에 남긴 maintenance impact도 함께 집계하고, 이 workspace에서 실제로 발생한 provider execution 실패와 provider attention pending/reminder 상태도 별도 summary field로 노출합니다.

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

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Parallel specialist dry run" \
  --objective "Validate manager-controlled specialist fan-out and merge" \
  --constraints "parallel-specialists:research,implementation,verification|Keep blast radius small"
```

Run and inspect missions:

```bash
node src/cli.mjs mission list
node src/cli.mjs mission run mission_xxx --provider stub
OPENAI_API_KEY=... node src/cli.mjs mission run mission_xxx --provider openai
ANTHROPIC_API_KEY=... node src/cli.mjs mission run mission_xxx --provider anthropic
LOCAL_PROVIDER_MODEL=llama3.1 LOCAL_PROVIDER_BASE_URL=http://127.0.0.1:11434/v1 node src/cli.mjs mission run mission_xxx --provider local
node src/cli.mjs mission show mission_xxx
node src/cli.mjs mission timeline mission_xxx
node src/cli.mjs session list mission_xxx
node src/cli.mjs session show mission_xxx
node src/cli.mjs session show mission_xxx --session session_xxx
node src/cli.mjs overview maintenance
node src/cli.mjs overview maintenance --outcome effective
node src/cli.mjs overview maintenance --since 2026-04-01T00:00:00.000Z
```

`mission timeline`은 session, approval, reviewer follow-up, memory뿐 아니라 mission-scoped escalation open/resolved/reminded event도 함께 보여주며, resolved follow-up은 `rerun-fixed`, `superseded`, `scope-reduced`, `accepted-risk` taxonomy를 detail에 포함합니다. `accepted-risk`는 close와 동시에 monitoring escalation을 열고, owner transition이 발생하면 해당 escalation은 `action inbox --class handoff-required`와 `action owner-handoffs`에서 acknowledgement queue로 다시 노출됩니다. owner handoff에는 별도 reminder trail도 붙으며, overdue acknowledgement나 re-notify 모두 timeline detail에 남습니다. mission-scoped maintenance sweep를 실행하면 mission summary와 mission timeline도 직접 maintenance evidence를 보여주고, workspace-wide maintenance sweep가 특정 mission pressure를 처리한 경우에도 mission timeline에는 related `maintenance-run` evidence가 연결됩니다. mission summary는 direct maintenance aggregate와 별도로 combined `maintenance impact` summary를 제공해, indirect workspace sweep가 이 mission에 준 reminder 효과도 한 번에 확인할 수 있습니다. mission summary는 여기에 mission-scoped provider execution and provider attention aggregate, specialist run and merge aggregate도 함께 노출해서, 해당 mission에서 어떤 provider run이 실패했고 provider attention이 pending, recovered, acknowledged, resolved, reminded 중 어디까지 진행됐는지, specialist branch가 completed, blocked, failed, abandoned 중 어디에 있는지도 바로 확인할 수 있습니다. unified `action inbox`는 이제 monitoring escalation, owner handoff, provider attention reminder pressure를 공통 `--needs-reminder` slice로도 보여주고, blocked or failed specialist branch는 `specialist-follow-up-required` action으로 다시 노출합니다. workspace/global operator timeline은 maintenance sweep 실행뿐 아니라 pressure를 실제로 처리한 `maintenance-required-acknowledged`, `maintenance-required-resolved` evidence, workspace-bound `provider-execution-failed` trigger, 이어지는 provider attention `opened/reminded/recovered/acknowledged/resolved` lifecycle, 그리고 specialist branch/merge chronology도 함께 보여줍니다.

Operator flow:

```bash
node src/cli.mjs action inbox
node src/cli.mjs action inbox --class retry-ready
node src/cli.mjs action inbox --class handoff-required
node src/cli.mjs action inbox --class maintenance-required
node src/cli.mjs action inbox --class monitoring-required
node src/cli.mjs action inbox --class specialist-follow-up-required
node src/cli.mjs action inbox --class monitoring-required --effective-owner human-approver
node src/cli.mjs action inbox --needs-reminder
node src/cli.mjs action provider-attention
node src/cli.mjs action provider-attention --needs-reminder
node src/cli.mjs action provider-attention --overdue
node src/cli.mjs action provider-attention --status acknowledged
node src/cli.mjs action provider-attention --status recovered
node src/cli.mjs action provider-attention --status resolved
node src/cli.mjs action inbox --priority high
node src/cli.mjs action inbox --owner human-approver
node src/cli.mjs action inbox --overdue
node src/cli.mjs action maintenance --workspace workspace_xxx --note "Sweep due reminders for escalations, owner handoffs, and provider attention"
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
node src/cli.mjs action remind-provider-attention --due --note "Re-check the pending provider failure and confirm remediation"
node src/cli.mjs action acknowledge-provider-attention provider-attention:anthropic:probe:provider-probe_xxx --note "Anthropic probe failure acknowledged"
node src/cli.mjs action resolve-provider-attention provider-attention:anthropic:probe:provider-probe_xxx --note "Anthropic probe recovered"
node src/cli.mjs action acknowledge-owner-handoff escalation_xxx --note "Human approver acknowledged the ownership handoff"
node src/cli.mjs action resolve-escalation escalation_xxx --note "Handled manually"
node src/cli.mjs approval inbox
node src/cli.mjs approval list
node src/cli.mjs approval resolve approval_xxx --decision approve --reason "Proceed with the proposed workspace change"
```

`action maintenance-history`와 `overview maintenance`는 이제 reminder total뿐 아니라 affected mission breadth, latest impact run, latest impact mission ids도 같이 보여줍니다. `--workspace`는 global sweep와 mission-scope run이 이 workspace mission에 남긴 impact까지 포함하고, `--mission`은 related workspace sweep를 history item으로 포함하면서도 mission-specific reminder effect는 별도 `missionImpact*` summary field로 같이 보여줍니다. 또 maintenance 전용 summary는 `effectiveRunCount`, `noOpRunCount`, `impactRunCount`, `latestEffectiveRun`, `latestNoOpRun`, `recentRuns`를 함께 반환해서 최근 sweep trend를 raw item 재해석 없이 바로 확인할 수 있고, `--outcome <effective|no-op|impactful>`로 원하는 run slice만 직접 조회할 수 있습니다. `--since <iso-timestamp>`를 함께 주면 최근 기간 run만 남겨서 time-window audit도 할 수 있습니다. 추가로 `dailyBuckets`는 filtered run set을 날짜별로 묶어 runCount, effective/no-op split, totalRemindedCount, affected mission breadth를 같이 보여주고, `latestBucketDelta`는 최신 날짜 bucket과 직전 bucket의 차이를 바로 요약합니다. provider attention reminder도 maintenance sweep 대상에 포함되므로, maintenance summary와 mission/workspace/global overview에는 `providerAttentionRemindedCount` 계열 집계가 같이 올라옵니다.

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
3. if the mission constraints include `parallel-specialists:<kinds>`, the manager opens up to three specialist child branches across `research`, `implementation`, and `verification`
4. unresolved specialist branches surface as `specialist-follow-up-required`, while completed and abandoned branches feed one manager-controlled merge step
5. `executor` writes the merged draft artifact or the standard sequential artifact and carries forward prior mission signals
6. `reviewer` validates required sections and next action
7. if the result is risky, an `Approval` is created and the mission stops at `awaiting_approval`

Engineering mode intentionally stops at proposal quality. It does not mutate registered workspaces in v1.

## Provider Notes

- `provider list` shows implementation state, env readiness, required env, and default-provider status without executing a mission.
- `provider check <id>` shows one provider's effective local configuration with secret values reduced to presence booleans, plus the latest persisted probe and latest execution when available.
- provider probes and provider-backed mission stages now share one normalized failure envelope: `failureKind`, `recoverable`, `httpStatus`, `timedOut`, `attemptCount`, `providerResponseId`, `rawMessage`.
- provider adapters now use explicit timeout plus bounded retry. retry is limited to transport failures, timeout, `429`, and `5xx`; `4xx`, empty output, non-JSON output, and schema-invalid output are treated as deterministic no-retry failures.
- probe and execution telemetry now carries `durationMs`, and provider-backed executions also normalize `usageInputTokens`, `usageOutputTokens`, and `usageTotalTokens` so provider observability can distinguish failure shape from runtime cost signals.
- provider-backed execution telemetry now also supports optional pricing envs per adapter: `OPENAI_INPUT_COST_PER_1M_USD`, `OPENAI_OUTPUT_COST_PER_1M_USD`, `ANTHROPIC_INPUT_COST_PER_1M_USD`, `ANTHROPIC_OUTPUT_COST_PER_1M_USD`, `LOCAL_INPUT_COST_PER_1M_USD`, `LOCAL_OUTPUT_COST_PER_1M_USD`. when set, executions persist `estimatedCostUsd`, so `provider check`, provider activity or events, provider overview, and mission or workspace or global summaries can inspect approximate execution spend without re-reading raw usage data.
- execution cost summary now also exposes `estimatedCostUsdByProviderId` and `estimatedCostUsdByRole`, so aggregate spend can be attributed to one provider or one stage role without rebuilding the breakdown client-side.
- retry-aware provider telemetry now also persists `retryCount` plus per-attempt `attemptHistory`, so provider probe, provider activity, provider events, provider attention, and mission or workspace or global summaries can distinguish one-shot failures from success-after-retry and retry-exhausted failures.
- `provider activity` exposes provider-backed stage execution history derived from persisted `agentRuns`, with `--provider`, `--role`, `--status`, and `--since` filters.
- `provider activity` summary now also includes execution `dailyBuckets` plus `latestBucketDelta`, and these bucket aggregates follow the same filtered slice, so recent provider spend trend can be read for the whole history or just a recent window without rebuilding timeline data client-side.
- `provider activity-timeline` turns provider execution history into chronological success or failure events so model-backed mission execution can be inspected as a time axis.
- `provider events` merges persisted probe events, provider execution events, and provider attention opened, acknowledgement, recovery, resolution, reminder events into one chronological stream, with `--family <probe|execution|attention>`, probe- and execution-specific filters, and `--since` for recent-window provider chronology slices.
- `overview providers` combines current provider readiness with persisted probe audit so configured, ready, unprobed, latest-success, latest-failure, and latest-skipped probe state can be read in one response.
- `overview providers` now also summarizes provider execution volume, execution and probe duration totals or averages, execution token usage totals, latest successful or failed execution, latest provider attention acknowledgement, latest provider attention recovery, latest provider attention resolution, latest provider attention reminder, pending attention overdue count, pending attention needs-reminder count, next attention due/reminder timestamp, and it exposes the latest unified provider event so probe health, operator acknowledgement, recovery evidence, explicit resolution, reminder pressure, and actual mission-path usage can be inspected together.
- `provider check <id>` now includes the current pending provider attention item when it exists, including `pendingAttentionDueAt`, `pendingAttentionIsOverdue`, `pendingAttentionSlaHours`, `pendingAttentionNeedsReminder`, `pendingAttentionNextReminderAt`, and `pendingAttentionReminderCount`.
- `action inbox --class provider-attention-required` now promotes the latest failed provider probe or failed provider execution into an operator action item. probe failure becomes a global attention item, and mission-scoped execution failure becomes a workspace-bound attention item.
- `action provider-attention` exposes the provider attention lifecycle directly and supports `--status <pending|acknowledged|recovered|resolved>`, `--needs-reminder`, and `--overdue` so provider failures can be audited and re-triaged after they leave the main action inbox.
- `action acknowledge-provider-attention <actionId>` records that a specific latest provider failure was acknowledged; the pending attention item stays cleared until a newer failed provider event arrives for that provider.
- `action resolve-provider-attention <actionId>` explicitly closes an acknowledged provider attention item and adds a `provider-attention-resolved` event to the unified provider event stream.
- a newer successful probe or successful mission execution by the same provider now promotes the previous latest failure into derived `recovered` attention state, so operator surfaces can distinguish silent recovery from manual acknowledgement or explicit resolution.
- `action remind-provider-attention` records reminder emission against currently pending provider attention items, and `action maintenance` now includes provider attention due reminders in the same local-first sweep as escalations and owner handoffs.
- `provider probe <id>` attempts a lightweight endpoint reachability check and model listing when the provider is configured; if required env is missing it returns a structured non-attempted result instead of throwing.
- `provider history` shows persisted probe runs and supports `--provider`, `--ok`, and `--attempted` filtering.
- `provider timeline` turns persisted probe runs into chronological events so recent success, failure, and skipped checks can be inspected as a time axis.
- `smoke:provider-retry-telemetry` locks successful retry, retry-exhausted execution failure, pending provider attention retry metadata, and mission or workspace or global retry-summary propagation in one deterministic local scenario.
- `stub` remains the deterministic default for local development and smoke coverage.
- `openai` now uses the OpenAI Responses API and reads:
  - `OPENAI_API_KEY` required
  - `OPENAI_MODEL` optional, default `gpt-5.2`
  - `OPENAI_BASE_URL` optional, default `https://api.openai.com/v1`
- if `OPENAI_API_KEY` is missing, `mission run --provider openai` returns a normalized failed mission result before any network call.
- `anthropic` now uses the Anthropic Messages API and reads:
  - `ANTHROPIC_API_KEY` required
  - `ANTHROPIC_MODEL` optional, default `claude-sonnet-4-6`
  - `ANTHROPIC_BASE_URL` optional, default `https://api.anthropic.com/v1`
  - `ANTHROPIC_VERSION` optional, default `2023-06-01`
  - `ANTHROPIC_MAX_TOKENS` optional, default `2048`
- if `ANTHROPIC_API_KEY` is missing, `mission run --provider anthropic` returns a normalized failed mission result before any network call.
- `local` targets an OpenAI-compatible local `/chat/completions` endpoint and reads:
  - `LOCAL_PROVIDER_MODEL` required
  - `LOCAL_PROVIDER_BASE_URL` optional, default `http://127.0.0.1:11434/v1`
  - `LOCAL_PROVIDER_API_KEY` optional
  - `LOCAL_PROVIDER_MAX_TOKENS` optional, default `2048`
- if `LOCAL_PROVIDER_MODEL` is missing, `mission run --provider local` returns a normalized failed mission result before any network call.

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
npm run smoke:provider-surface
npm run smoke:provider-overview
npm run smoke:provider-activity
npm run smoke:provider-events
npm run smoke:provider-hardening
npm run smoke:provider-telemetry
npm run smoke:provider-action-inbox
npm run smoke:provider-attention-lifecycle
npm run smoke:provider-attention-recovery
npm run smoke:provider-attention-reminders
npm run smoke:provider-probe
npm run smoke:provider-history
npm run smoke:provider-timeline
npm run smoke:parallel-specialists
npm run smoke:openai-provider
npm run smoke:anthropic-provider
npm run smoke:local-provider
```

All current smokes are deterministic and require no external API key.
