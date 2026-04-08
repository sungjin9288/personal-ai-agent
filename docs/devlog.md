# Devlog

## 2026-04-07 Specialist Follow-Up Remediation

- added `action remediate-specialist-follow-up` so blocked or failed specialist branches can be resumed from the operator surface instead of requiring a manual `mission run` reconstruction
- reused the existing `runMission` resume path and `parallelGroupId` lineage contract, so remediation reruns only unresolved specialist branches while keeping prior completed specialist outputs and later merge behavior intact
- added deterministic smoke coverage for one failed `implementation` specialist branch that is remediated through the dedicated CLI command, proving same-group resume, `resumeFromRunId` preservation, merge completion, and follow-up queue clearance
- added provider context to specialist follow-up action items so generic provider filtering and remediation routing stay aligned with the same provider-aware command contract used elsewhere
- added `action specialist-follow-ups` as a dedicated read surface with `--provider`, `--workspace`, `--mission`, `--status`, and `--overdue` filters, so unresolved specialist branches can be triaged without reopening the full generic action inbox
- extended specialist follow-up items with persisted reminder state, so `action specialist-follow-ups --needs-reminder` can expose aging blocked/failed branches without relying only on overdue state
- added `action remind-specialist-follow-ups` plus persisted reminder records and `specialist-follow-up-reminded` timeline evidence, so follow-up re-notify pressure is auditable on mission/workspace/operator surfaces
- extended `action maintenance` and maintenance summaries so due specialist follow-up reminders are swept and counted alongside escalation, owner handoff, and provider attention reminder pressure
- linked specialist reminder aggregate fields into mission, workspace, and global summaries, so reminder needs, overdue count, latest reminder timestamp, and next reminder deadline can be read from the same summary surfaces already used for specialist run and merge state
- linked the same specialist reminder aggregate fields into workspace timeline and global operator timeline summaries, so operator chronology payloads can show current follow-up reminder pressure without reopening dedicated action surfaces
- extended generic action inbox summary with specialist follow-up provider, kind, status, and reminder aggregates, so mixed queue triage can distinguish specialist pressure without dropping into the dedicated specialist follow-up command
- extended `action log-overdue` response summary and incident markdown with specialist follow-up reminder aggregate, so overdue incident trails preserve the same specialist pressure context already available in queue summaries
- extended the same overdue incident payload with provider health drift provider and reason-code aggregate, so queue triage and incident documentation keep the same provider drift summary contract
- consolidated provider metadata into a shared provider catalog inspired by OpenHarness registry layering, so registry readiness rendering and adapter runtime defaults now derive from one source of truth instead of per-file literals
- added a typed `specialistHandoff` contract for specialist branches and threaded it through manager merge prompts, persisted agent runs, and specialist follow-up queue items, inspired by agency-agents handoff template discipline
- added `orchestration-profile:<id>` specialist presets and threaded profile metadata through mission/workspace/global/operator summaries plus latest parallel group state, so profile-driven fan-out stays explicit and auditable without reconstructing branch policy from raw constraints
- enforced orchestration profile quality gates at runtime, so manager merge now stops when required specialist signals are abandoned or missing and emits `specialist-quality-gate-blocked` plus gate-backed specialist follow-up items instead of silently merging incomplete branch sets
- linked orchestration profile retry policy into specialist follow-up priority, SLA, and reminder cadence so verification-heavy triad presets now create faster operator pressure than the default branch-resume policy
- switched specialist follow-up command hints to the dedicated remediation action and added profile-aware remediation route metadata, so fast verification policies now surface a concrete operator path instead of only a generic mission run fallback
- extended `action log-overdue` contract and smoke coverage so overdue `specialist-follow-up-required` items also enter the incident trail, keeping specialist pressure aligned with other tracked overdue operator classes

## 2026-04-07 Provider Cost Telemetry

- added `overview operator-timeline --provider-since` so the operator-facing chronology can carry the same recent provider window contract already used by provider, mission, workspace, and global overview surfaces
- linked recent provider counts, touched provider ids, latest recent provider event, and recent execution bucket trend into the global operator timeline summary without changing the default event stream contract
- added `workspace timeline --provider-since` so workspace-bound chronology can carry the same recent provider window contract and recent provider summary linkage as the other provider-aware timeline or overview surfaces
- added root-level `providerHealthDrift` to mission, workspace, and operator surfaces so provider drift can be inspected symmetrically without reading only summary linkage fields
- added `provider-health-drift-required` to action inbox so resolved provider failures that still leave monthly failed-execution drift can surface as explicit mission-owner follow-up work
- added `action provider-health-drift --overdue` so residual drift follow-up items can be queried directly by overdue state instead of only through generic inbox class filtering
- extended `action log-overdue` and its smoke coverage so overdue `provider-health-drift-required` items also enter the incident trail and escalation state
- added provider filtering to `action inbox` and `action log-overdue` so provider-specific attention and drift follow-up can be sliced from generic operator queues
- added `providerCounts` to generic action inbox summary so provider-scoped drift backlog can be read without leaving the unified queue surface
- added `action remediate-provider-attention` so pending or acknowledged provider failure attention can trigger a local-first re-probe or same-provider mission rerun without manually reconstructing the remediation command
- added optional pricing env parsing for OpenAI, Anthropic, and local adapters, then normalized `estimatedCostUsd` from execution token usage without changing the existing provider contract
- propagated estimated execution cost into persisted agent runs, provider execution history or timeline, unified provider events, pending provider attention failure context, provider overview, and mission or workspace or global summaries
- added deterministic cost telemetry smoke coverage for successful execution totals plus failed non-JSON execution persistence so cost evidence stays available on both completed and failed mission paths
- extended the same cost telemetry with `estimatedCostUsdByProviderId` and `estimatedCostUsdByRole` so one provider or one stage role can be identified as the primary spend source directly from existing read-models
- extended provider execution history summary with daily cost buckets and latest bucket delta so recent spend movement can be read from `provider activity` without re-aggregating timeline rows
- added `since` filtering to provider execution history and timeline so the same daily cost bucket contract can be used for recent-window execution slices without a separate endpoint

## 2026-04-07 Provider Retry Telemetry

- extended the shared provider request wrapper to persist per-attempt `attemptHistory` and normalized `retryCount` across OpenAI, Anthropic, local, and stub probe or execution paths
- propagated retry metadata into provider probe history, provider execution activity, provider event timelines, provider attention items, and mission or workspace or global summaries so retry totals are visible without reopening raw state
- added deterministic retry telemetry smoke coverage for success-after-retry probe, success-after-retry execution stages, and retry-exhausted failed execution that opens provider attention with the same normalized attempt metadata

## 2026-04-07 Provider Telemetry Baseline

- extended provider probe and execution records with `durationMs`, then propagated execution token usage as normalized `usageInputTokens`, `usageOutputTokens`, and `usageTotalTokens`
- linked telemetry into provider check, provider history, provider activity, provider events, provider overview, mission summary, workspace overview, and global overview so latency and token usage can be inspected without reopening raw state
- added `since` filtering to `provider events` so recent probe, execution, and attention chronology can be sliced without rebuilding a custom event window client-side
- added `overview providers --since` with a separate `recentWindow` summary so recent provider health can be queried without mutating the existing full-history overview aggregate
- added `overview global --provider-since` so the global control-plane can expose recent provider probe and execution activity through `providerRecentWindow` while preserving the default full-history provider aggregate
- added `workspace overview --provider-since` so workspace-bound provider execution and attention activity can be queried as `providerRecentWindow` without mutating the default workspace summary contract
- added `mission show --provider-since` and `mission timeline --provider-since` so mission-bound provider execution and attention activity can be queried as `providerRecentWindow` from the mission surface itself
- extended every `providerRecentWindow` payload with execution daily buckets and latest bucket delta so recent provider execution trend can be inspected without reopening full provider activity history
- extended every `providerRecentWindow` payload with weekly execution buckets and latest weekly delta so recent provider trend can also be read at a coarser weekly rollup
- extended every `providerRecentWindow` payload with monthly execution buckets and latest monthly delta so recent provider trend can also be read as a coarse month rollup from the same recent slice
- promoted the same recent monthly provider trend into mission or workspace or global or operator summary linkage so control-plane surfaces can read month-level direction without expanding nested bucket payloads
- promoted the same recent monthly provider trend into `overview providers` summary linkage as well, so provider-only control-plane reads stay symmetric with mission or workspace or global or operator summaries
- added provider health drift summaries to `overview providers` and `overview global`, combining current provider attention overdue or needs-reminder pressure with recent monthly execution drift in one read-model
- added deterministic telemetry smoke coverage with one local probe and one local mission run so duration and token usage propagation stay locked across provider, mission, workspace, and global surfaces

## 2026-04-07 Provider Hardening Baseline

- added a shared provider failure envelope across probe and execution paths with fixed fields for `failureKind`, `recoverable`, `httpStatus`, `timedOut`, `attemptCount`, `providerResponseId`, and `rawMessage`
- moved OpenAI, Anthropic, and local adapters onto one shared timeout and bounded retry wrapper so transport or timeout or `429/5xx` retries stay aligned while `4xx` and parsing or schema failures remain deterministic no-retry paths
- hardened structured output parsing to accept only the first valid JSON object after text extraction, while empty output, prose-only output, and missing required fields now normalize into `empty-output`, `non-json-output`, and `schema-invalid`
- propagated normalized provider failure metadata into provider history, activity, events, attention, mission summary, workspace overview, global overview, and operator surfaces, then locked the contract with deterministic provider hardening smoke coverage

## 2026-04-07 Parallel Specialist Roles v1

- added manager-controlled parallel specialist fan-out after planning, bounded to `research`, `implementation`, and `verification`, with child `agentRuns` carrying `parallelGroupId`, `parentRunId`, `resumeFromRunId`, `specialistKind`, and merge metadata
- added resumable failed or blocked specialist branches plus manager-controlled merge back into the standard executor or reviewer path so parallel work stays local-first and deterministic instead of introducing a separate queueing system
- surfaced `specialist-follow-up-required` into the unified action inbox and linked specialist branch or merge chronology into mission timeline, workspace timeline, global operator timeline, and mission or workspace or global summaries
- added deterministic smoke coverage for two-branch success merge, three-branch mixed completion, failed branch resume, blocked branch follow-up visibility, and summary or timeline propagation

## 2026-04-07 Provider Attention Recovery

- added derived `recovered` provider attention state so a newer successful probe or successful provider-backed mission run can close the latest failure pressure without requiring a manual resolution step first
- linked provider attention recovery into `provider check`, `overview providers`, `overview global`, `action provider-attention --status recovered`, mission summary, workspace summary, unified provider events, mission timeline, and workspace or global operator timeline
- added deterministic smoke coverage for one failed stub mission followed by a successful rerun on the same mission so recovery evidence stays locked across provider, mission, workspace, and global surfaces
- restored opened provider attention events into the unified provider event stream now that provider base-event assembly is separated, closing the earlier gap where current pending failures were missing from provider-only chronology

## 2026-04-06 Provider Attention Reminders

- added persisted provider attention reminder records plus `action remind-provider-attention`, so pending provider failures can be re-notified explicitly instead of only showing due or overdue state in read models
- linked provider attention reminder pressure into `provider check`, `overview providers`, `overview global`, mission timeline, workspace operator timeline, and the unified `action inbox --needs-reminder` slice
- extended `action maintenance` to sweep due provider attention reminders together with escalation and owner handoff reminders, and locked the new flow with deterministic smoke coverage for due reminder re-emission and maintenance integration

## 2026-04-06 Provider Attention Aging Summary

- extended provider status and provider overview surfaces with pending provider attention due and overdue metadata so aging provider failure pressure is visible without opening `action provider-attention` or the unified action inbox
- linked `pendingAttentionDueAt`, `pendingAttentionIsOverdue`, and `pendingAttentionSlaHours` into `provider check`, while `overview providers` and `overview global` now aggregate pending attention overdue count and next due timestamp
- strengthened provider overview smoke coverage by aging one failed anthropic probe into an overdue pending attention item and locking the same due timestamp across provider check, provider overview, and global overview

## 2026-04-06 Operator Timeline Provider Failure Trigger

- extended workspace and global operator timeline with `provider-execution-failed` so the actual failure trigger is visible before provider attention acknowledgement or resolution events
- kept successful provider execution out of the operator timeline to preserve the operator-focused signal and avoid high-volume success noise
- strengthened operator timeline smoke coverage so workspace-bound failed reviewer execution and the later provider attention lifecycle are both locked on the same time axis

## 2026-04-06 Mission Provider Audit Surface

- extended `mission show` with mission-scoped provider execution and provider attention aggregates so one mission can report its own failed provider runs and attention lifecycle state
- extended `mission timeline` with `provider-execution-succeeded`, `provider-execution-failed`, `provider-attention-opened`, `provider-attention-acknowledged`, and `provider-attention-resolved` events
- strengthened mission timeline smoke coverage with a dedicated provider-failure mission so maintenance or escalation audit and provider audit both stay locked at mission scope

## 2026-04-06 Provider Attention Inbox

- promoted latest failed provider probe or failed provider execution into `provider-attention-required` items inside the unified `action inbox`
- kept the contract read-model based so a later success event automatically clears the attention item without adding new persistence state
- added deterministic smoke coverage for one global probe failure and one workspace-bound execution failure, plus overview attention summary linkage

## 2026-04-06 Provider Attention Acknowledgement

- added `action provider-attention` and `action acknowledge-provider-attention` so provider failure attention can move from pending queue state into explicit acknowledged audit state
- persisted provider attention acknowledgements and linked them into `provider check`, `overview providers`, `overview global`, and `provider events --family attention`
- kept the lifecycle bounded so acknowledgement only clears the current latest failed provider event, while a newer provider failure still re-opens a fresh attention item

## 2026-04-06 Provider Attention Resolution

- added `action resolve-provider-attention` so acknowledged provider failures can be explicitly closed instead of remaining in an indefinitely acknowledged audit bucket
- extended the unified provider event stream with `provider-attention-resolved` while preserving the earlier acknowledgement event for the same action
- linked resolved provider attention counts and latest resolution pointers into `provider check`, `overview providers`, and `overview global`

## 2026-04-06 Provider Attention Operator Timeline

- added workspace and global operator timeline linkage for workspace-bound provider attention lifecycle events
- provider attention now appears as `provider-attention-opened`, `provider-attention-acknowledged`, and `provider-attention-resolved` alongside approval, reviewer follow-up, escalation, and maintenance events
- kept global provider probe failures on the provider event stream only, while workspace-bound execution failures are promoted into operator timeline because they map to a concrete workspace owner workflow

## 2026-04-06 Workspace Provider Attention Summary

- extended `workspace overview` with workspace-scoped provider execution and provider attention aggregates so workspace owners can see failed execution pressure without jumping into provider-only commands
- linked latest failed execution and latest pending provider attention event into workspace summary while keeping global provider readiness as a separate top-level concern
- added deterministic smoke coverage for one workspace-bound failed provider execution so workspace overview regression now locks provider attention counts and latest pointers

## 2026-04-06 Provider Events

- added `provider events` so probe and execution observability can be read as one chronological provider event stream instead of hopping between separate timelines
- linked latest provider event, latest probe event, and latest execution event into `overview providers` and `overview global`
- added deterministic smoke coverage for mixed skipped probe, successful probe, failed stub execution, and successful local execution in one unified stream

## 2026-04-06 Provider Execution Activity

- added `provider activity` and `provider activity-timeline` so actual mission-stage success or failure can be inspected per provider on top of persisted `agentRuns`
- linked latest provider execution into `provider check`, `provider list`, `overview providers`, and `overview global` so readiness and real execution evidence can be read together
- added deterministic smoke coverage for mixed `stub` success or failure plus mocked `local` mission execution, including execution history and timeline filters

## 2026-04-06 Provider Overview

- added `overview providers` so provider readiness and persisted probe health can be inspected in one control-plane response instead of stitching together `provider list` and `provider history`
- linked provider summary into `overview global`, including configured or ready counts, unprobed count, and latest success, failure, skipped probe pointers
- added deterministic smoke coverage for mixed skipped, failed, and successful provider probes plus global overview linkage

## 2026-04-06 Provider Probe Timeline

- added `provider timeline` so persisted provider probe records can be read as chronological success, failure, and skipped events instead of only raw history rows
- reused probe history filters for `--provider`, `--ok`, and `--attempted` so timeline and history slices stay aligned
- added deterministic smoke coverage for mixed successful and failed attempted probes plus timeline ordering and filtered failure slices

## 2026-04-06 Provider Probe History

- persisted provider probe results into runtime state so readiness and reachability checks leave an audit trail instead of remaining transient CLI output
- added `provider history` plus latest-probe linkage on `provider list` and `provider check`, keeping current readiness and last connectivity result visible together
- added deterministic smoke coverage for missing-env persisted failure, mocked successful local probe persistence, and history filters

## 2026-04-06 Provider Probe Surface

- added `provider probe <id>` so operator workflows can distinguish missing env from actual endpoint reachability and model-list responses
- implemented lightweight `/models` probes for OpenAI, Anthropic, and local OpenAI-compatible runtimes, plus a deterministic in-process probe for `stub`
- added deterministic smoke coverage for non-attempted missing-env results and mocked successful probe responses across all implemented providers

## 2026-04-06 Provider Status Surface

- added `provider list` and `provider check <id>` so operator-facing readiness can be inspected without creating or running a mission
- exposed implementation state, required env, missing env, default-provider status, and redacted effective configuration through the provider registry
- added deterministic smoke coverage for provider status queries with configured and unconfigured env paths

## 2026-04-06 Shared Structured Provider Utility

- extracted shared structured-output prompt building, JSON parsing, numeric env parsing, and stage normalization into a provider utility module
- rewired `openai`, `anthropic`, and `local` adapters to use the same parsing and normalization path so provider behavior does not drift by copy-pasted implementations
- kept request-shape differences provider-local and validated the refactor with the existing provider smoke suite plus base mission regression smoke

## 2026-04-06 Local Provider Adapter

- added a `local` provider adapter for OpenAI-compatible local `/chat/completions` runtimes, with fast `LOCAL_PROVIDER_MODEL` validation and optional base-url/api-key overrides
- kept the structured JSON normalization path identical to `stub`, `openai`, and `anthropic` so provider-specific wiring does not fork the mission/session contract
- added deterministic smoke coverage for the missing-model path and mocked fetch success path so local runtime wiring can be validated without an actual local model server

## 2026-04-06 Anthropic Provider Adapter

- added an Anthropic provider adapter backed by the Messages API contract, with fast `ANTHROPIC_API_KEY` validation and request wiring for `model`, `system`, `messages`, and `max_tokens`
- kept the current structured JSON contract identical to the OpenAI path so manager, planner, executor, and reviewer stage normalization does not fork by provider
- added deterministic smoke coverage for the missing-key path and mocked fetch success path so Anthropic wiring can be validated locally without a live API call

## 2026-04-06 Async Provider Runtime And OpenAI Adapter

- made `runMission`, `runAgentStage`, and the CLI mission-run path async-safe so provider implementations can await network calls without a larger runtime rewrite
- added an OpenAI provider adapter backed by the Responses API contract, with fast `OPENAI_API_KEY` validation and response JSON parsing/normalization for manager, planner, executor, and reviewer stages
- added deterministic smoke coverage for the missing-key path and mocked fetch success path so provider wiring can be validated locally without live network access

## 2026-04-06 Maintenance Bucket Delta

- added `latestBucketDelta` to maintenance-only summaries so the newest daily bucket can be compared against the immediately previous bucket without post-processing
- kept the delta contract derived from `dailyBuckets`, which avoids introducing a second parallel trend model and keeps maintenance audit math in one place
- extended maintenance history smoke coverage to lock negative and positive delta cases for full history, recent slices, and mission-scoped slices

## 2026-04-06 Maintenance Daily Buckets

- added `dailyBuckets` to maintenance-only summary payloads so filtered maintenance history and overview can be read as small day-level aggregates without a separate reporting command
- kept the new bucket contract scoped to maintenance-specific surfaces only, avoiding unnecessary payload expansion in mission, workspace, and global summary contracts
- extended maintenance history smoke coverage to lock bucket ordering, per-day effective/no-op counts, and affected mission breadth into a deterministic contract

## 2026-04-06 Maintenance Since Filter

- added `--since <iso-timestamp>` to `action maintenance-history` and `overview maintenance` so maintenance audit can be sliced by time window without inventing a separate trend endpoint
- kept the new filter run-history-only, leaving current maintenance pressure summary semantics unchanged while echoing the normalized timestamp through `filters.since`
- extended maintenance history smoke coverage with fixed maintenance run timestamps so workspace and mission time-window filtering stays deterministic

## 2026-04-06 Maintenance Outcome Filters

- added `--outcome <effective|no-op|impactful>` to `action maintenance-history` and `overview maintenance` so operators can directly slice sweep audit by run quality
- reused the same maintenance run classification helpers that feed the summary trend fields, keeping filtering semantics aligned with `effectiveRunCount`, `noOpRunCount`, and `impactRunCount`
- extended maintenance history smoke coverage to prove workspace-scope effective/no-op filters and mission-scope empty no-op filtering behave deterministically

## 2026-04-06 Maintenance Run Trend Summary

- extended maintenance-specific summaries with `effectiveRunCount`, `noOpRunCount`, `impactRunCount`, `latestEffectiveRun`, `latestNoOpRun`, and a short `recentRuns` trend window
- kept the existing affected mission breadth and missionImpact semantics intact so maintenance history can answer both scope and effectiveness questions from the same summary payload
- strengthened maintenance history smoke coverage to lock the first effective sweep, second no-op sweep, and recent run ordering into a deterministic contract

## 2026-04-06 Mission Maintenance History Linkback

- extended `action maintenance-history --mission` and `overview maintenance --mission` to include related workspace-scope maintenance runs instead of only direct mission runs
- kept run-level breadth metadata intact while adding mission-specific `missionImpact*` summary fields so cross-mission sweeps do not hide the effect on the selected mission
- strengthened maintenance history smoke coverage to prove a workspace sweep appears in mission-scoped history/overview with correct run totals and mission-local reminder impact

## 2026-04-06 Managed Runtime Kickoff

- shifted the project from single-pass pack rendering to a managed multi-agent runtime
- established first-class runtime entities for sessions, agent runs, artifacts, approvals, and memory
- kept the implementation local-first and stub-provider based for deterministic development

## 2026-04-06 Reviewer And Approval Hardening

- added deliverable-aware reviewer rubric checks instead of relying on section presence alone
- added deterministic coverage for approval rejection and reviewer rubric failure
- kept the runtime local-first without introducing live provider dependencies

## 2026-04-06 Approval Resume Evidence

- changed approval approve handling to emit an `execution-ready-brief.md` handoff artifact instead of only flipping status
- split the approval approve path into its own deterministic smoke so the lifecycle now has stop, approve, and reject coverage

## 2026-04-06 Mission Memory Carry-Forward

- reviewer failures now persist mission-scoped fact memory
- approval decisions now persist mission-scoped decision memory
- reruns now prove that prior decision memory is injected back into manager context
- planner and executor now adapt rerun artifacts using prior mission memory instead of treating memory as display-only context

## 2026-04-06 Session History Surface

- added `session list <missionId>` and per-session summaries so reruns are directly inspectable
- extended `session show` to support `--session <sessionId>` for non-latest session inspection
- added deterministic coverage for multi-session history after reject-and-rerun

## 2026-04-06 Mission Timeline Surface

- enriched `mission show` with mission-level summary counts
- added `mission timeline <missionId>` to aggregate session, approval, and memory events in chronological order
- added deterministic coverage for mission-level timeline inspection after reject-and-rerun

## 2026-04-06 Workspace Overview Surface

- added `workspace overview <workspaceId>` to aggregate mission, session, approval, and memory state across one workspace
- kept `workspace show` as the raw workspace lookup and separated the operational view into a dedicated overview command
- added deterministic coverage for mixed completed/awaiting/failed mission states in one workspace

## 2026-04-06 Global Overview Surface

- added `overview global` to aggregate all workspaces into one control-plane view
- included a pending approval inbox so cross-workspace human action items are visible without drilling into each workspace
- added deterministic coverage for multi-workspace global aggregation and inbox behavior

## 2026-04-06 Approval Inbox Surface

- split the pending approval inbox into a dedicated `approval inbox` command instead of keeping it only as a nested global-overview field
- enriched inbox items with workspace, mission, session, and resolve-command context for operator use
- added deterministic coverage for inbox filtering and exclusion of resolved approvals

## 2026-04-06 Unified Action Inbox Surface

- added `action inbox` as a broader operator queue that combines pending approvals with current reviewer follow-up items
- kept `approval inbox` intact and reused the same approval aggregation logic so approval-only and mixed-action surfaces stay consistent
- added deterministic coverage to prove resolved approvals stay out and reviewer-failed latest sessions show actionable rerun guidance

## 2026-04-06 Action Classification

- added explicit action classes so operator queues distinguish `awaiting-human-decision`, `retry-ready`, and `blocked`
- treated rejected approval outcomes as blocked follow-up items instead of silently dropping them from all operator surfaces
- added class-based filtering to `action inbox` so the queue can be used as a practical operational slice rather than a flat list

## 2026-04-06 Action Dispatch Metadata

- added `priority`, `recommendedOwner`, and `recommendedCommand` so action inbox items can be dispatched without re-deriving operator intent from raw mission state
- added priority/owner filtering and summary counts to make the queue usable for focused operational slices like “high-priority human approvals”
- kept the item contract backward-compatible by preserving `commandHint` while introducing the more explicit dispatch fields

## 2026-04-06 Action SLA And Escalation

- added `slaHours`, `dueAt`, `isOverdue`, and `escalationRule` so action inbox items can be managed as time-based operational obligations
- added `--overdue` filtering and overdue summary counts to make the queue usable for aging-based follow-up
- strengthened the deterministic smoke by rewriting temp state timestamps so overdue behavior is verified without depending on wall-clock timing

## 2026-04-06 Overdue Incident Logging

- added an explicit `action log-overdue` command so overdue operational items can be promoted into the tracked incident trail instead of remaining query-only state
- reused the existing doc logging path and generated incident entries with filters, command hints, and escalation text for each overdue item
- added deterministic smoke coverage for logged, filtered, and no-op overdue logging behavior

## 2026-04-06 Escalated Inbox Lifecycle

- added first-class escalation records so overdue action logging now persists open escalation state instead of only appending markdown incidents
- added `action escalated` and `action resolve-escalation` commands so escalations can be tracked and closed explicitly
- added deterministic smoke coverage for escalation dedupe, open/resolved filtering, and manual resolution notes

## 2026-04-06 Escalation Pressure In Overviews

- extended `workspace overview` and `overview global` so control-plane summaries now include escalation counts, open escalation ids, latest escalation context, and top-level escalated workspace visibility
- updated overview smokes to generate overdue escalation state before assertions so the top-level summaries are tested against real escalation records instead of empty defaults

## 2026-04-06 Escalation Events In Mission Timeline

- extended `mission timeline` so mission-scoped escalation open/resolved lifecycle is visible on the same chronological axis as sessions, approvals, and memory
- updated mission timeline smoke to create an overdue action, log it into escalation state, resolve it, and verify both timeline events plus mission summary escalation counts

## 2026-04-06 Workspace And Global Operator Timeline

- added workspace-level and global operator timeline surfaces that unify approval, reviewer follow-up, and escalation events into one operator-facing chronological stream
- kept mission timeline focused on mission scope while exposing broader operational history through `workspace timeline` and `overview operator-timeline`
- added deterministic smoke coverage for mixed workspace/global operator events and chronological ordering

## 2026-04-06 Reviewer Follow-Up Resolution Lifecycle

- added first-class reviewer follow-up records with open/resolved status so reviewer remediation no longer appears only as a derived failed-session artifact
- added `action reviewer-followups` and `action resolve-reviewer-follow-up` so operator workflows can inspect and explicitly close reviewer follow-up items
- persisted reviewer follow-up resolution notes back into mission memory so future reruns can see why a follow-up was closed
- extended mission, workspace, and global timeline coverage so reviewer follow-up closure is tracked alongside approval and escalation lifecycle events

## 2026-04-06 Reviewer Follow-Up Resolution Taxonomy

- added explicit reviewer follow-up resolution kinds so closure reasons are structured as `rerun-fixed`, `superseded`, `scope-reduced`, or `accepted-risk`
- extended `action reviewer-followups` with kind filtering and summary counts so resolved follow-ups can be sliced by remediation outcome
- updated mission memory and operator timeline details so closure events now preserve both taxonomy and free-text note

## 2026-04-06 Accepted Risk Monitoring Policy

- linked reviewer follow-up taxonomy to escalation policy so `accepted-risk` does not disappear after closure and instead opens a monitoring escalation automatically
- reused existing escalation overview and inbox surfaces instead of adding a parallel monitoring queue, keeping accepted-risk pressure visible at mission, workspace, and global level
- added deterministic smoke coverage to prove accepted-risk resolution creates an open escalation and that timeline plus overview surfaces reflect the policy outcome

## 2026-04-06 Monitoring Required Action Queue

- surfaced open accepted-risk monitoring escalations back into `action inbox` as `monitoring-required` items so workspace-owner review appears in the main operator queue
- reused escalation dueAt and rule metadata for the reopened action item instead of synthesizing a second policy clock
- added deterministic overdue coverage by aging the monitoring escalation and verifying `action inbox --class monitoring-required --overdue`

## 2026-04-06 Escalation Tiering

- added derived escalation tiers so open escalation pressure can be sliced as `normal`, `warning`, or `critical`, with resolved entries exposed as `resolved`
- extended `action escalated` with tier filtering and summary counts, and propagated tier counts into workspace, mission, and global overview summaries
- strengthened escalation smokes to verify both initial normal accepted-risk monitoring and aged critical escalation paths

## 2026-04-06 Escalation Sync And Breach History

- added `action sync-escalations` so tier transitions are persisted into runtime state instead of being only read-time derivations
- escalations now accumulate `breachCount`, `lastBreachAt`, `lastSyncedAt`, and `tierHistory` so operator severity has auditable history
- updated mission and overview summaries to surface escalation breach totals, and added deterministic sync smoke for `normal -> warning -> critical -> resolved`

## 2026-04-06 Escalation Reminder Trail

- added `action remind-escalations` so open escalation pressure can be re-issued through a local-first operator command without introducing external notification dependencies
- escalations now persist `reminderCount`, `lastReminderAt`, and `reminderHistory`, and mission/workspace/global summaries surface reminder totals alongside breach totals
- extended mission and operator timelines with `escalation-reminded` events and added deterministic smoke coverage for repeated reminders on an accepted-risk monitoring escalation

## 2026-04-06 Escalation Reminder Due Policy

- added cadence-derived reminder due state so escalations expose `nextReminderAt`, `needsReminder`, and `reminderCadenceHours` instead of forcing operators to infer re-notify timing manually
- extended `action escalated` with `--needs-reminder` and `action remind-escalations` with `--due` so the reminder queue can be sliced without re-sending every open escalation
- updated workspace/global summaries to surface `escalationNeedsReminderCount` and added deterministic smoke coverage for due-after-created and due-after-last-reminder transitions

## 2026-04-06 Escalation Owner Chain

- added derived effective owner escalation so repeated due monitoring pressure can move from the recorded owner to a higher operator without mutating the stored base owner
- extended `action escalated` and `action inbox` with `--effective-owner` filtering and surfaced effective owner counts in action/escalation summaries
- added deterministic smoke coverage to prove accepted-risk monitoring escalates from `workspace-owner` to `human-approver` after reminder issuance and renewed due state

## 2026-04-06 Escalation Owner History

- persisted owner chain transitions through `syncEscalations` so effective owner changes are recorded as stateful history instead of remaining read-time only derivations
- extended mission and operator timelines with `escalation-owner-changed` events and surfaced latest owner escalation timestamp plus owner transition totals in overview summaries
- added deterministic smoke coverage to prove owner history backfill, `workspace-owner -> human-approver` transition recording, and timeline visibility for accepted-risk monitoring escalation

## 2026-04-06 Escalation Owner Handoff Queue

- added a dedicated owner handoff queue so persisted owner transitions become actionable operator items instead of remaining timeline-only audit data
- added explicit `acknowledge-owner-handoff` handling and timeline visibility for owner handoff acknowledgement events, along with latest/pending handoff summary fields
- added deterministic smoke coverage for pending handoff discovery, acknowledgement, acknowledged queue visibility, and summary/timeline propagation

## 2026-04-06 Owner Handoff Due Pressure

- extended pending owner handoffs with derived SLA, dueAt, and overdue state so acknowledgement pressure is visible without manually comparing transition timestamps
- added `action owner-handoffs --overdue` and propagated pending handoff overdue counts plus next due timestamp into mission, workspace, and global summaries
- updated owner handoff acknowledgement detail so overdue acknowledgements stay visible on the mission timeline instead of disappearing into a generic resolved note

## 2026-04-06 Owner Handoff In Unified Action Inbox

- reintroduced pending owner handoff work into the main `action inbox` as `handoff-required` so operators do not have to switch to a dedicated queue to see acknowledgement work
- excluded pending owner handoff escalations from the generic accepted-risk monitoring slice to avoid duplicate operator actions for the same escalation
- strengthened `smoke-action-inbox` to verify approval, reviewer follow-up, blocked follow-up, and owner handoff all coexist in the unified queue with correct counts, filters, and overdue state

## 2026-04-06 Owner Handoff Reminder Policy

- added local-first reminder cadence for pending owner handoffs so overdue acknowledgement work can be re-notified without relying on external integrations
- extended `action owner-handoffs` with `--needs-reminder` and added `action remind-owner-handoffs` so reminder candidates can be sliced and re-issued explicitly
- propagated owner handoff reminder counts, latest reminder timestamp, and next reminder timestamp into mission/workspace/global summaries and mission/operator timeline surfaces

## 2026-04-06 Unified Action Reminder Slice

- normalized owner handoff reminder metadata onto the unified `action inbox` item shape so `handoff-required` and `monitoring-required` actions share the same reminder semantics
- extended `action inbox` with `--needs-reminder` and reminder summary counts so the main operator queue can slice reminder work without switching to queue-specific commands
- strengthened smoke coverage to prove `--needs-reminder` works for both owner handoff work and accepted-risk monitoring escalations

## 2026-04-06 Local Maintenance Sweep

- added `action maintenance` as a repo-native local-first sweep that runs escalation sync plus due reminders for monitoring pressure and pending owner handoffs in one command
- suppressed duplicate generic escalation reminders for escalations that already have a pending owner handoff, so maintenance emits one reminder path per open operator obligation
- added deterministic mixed-queue smoke coverage to prove maintenance reminds one monitoring escalation and one owner handoff without double-reminding the same escalation

## 2026-04-06 Maintenance Run History

- persisted `action maintenance` executions as first-class maintenance run records so local sweeps leave an audit trail even when they do not send any reminders
- added `action maintenance-history` and `overview maintenance` so operators can inspect latest sweep results, aggregate reminder totals, and no-op runs without reading raw state
- propagated maintenance run totals and latest run metadata into workspace/global overview so top-level control-plane surfaces now show maintenance activity as well as pressure

## 2026-04-06 Maintenance Required Action

- surfaced current due maintenance pressure as a first-class `maintenance-required` item in the unified `action inbox`
- grouped due monitoring reminders and due owner handoff reminders into one workspace-scoped maintenance action so operators can launch the sweep without manually re-deriving scope
- extended maintenance history smoke coverage to verify the maintenance-required item appears before a sweep and disappears after the sweep clears due pressure

## 2026-04-06 Maintenance Run In Operator Timeline

- added `maintenance-run` events to workspace/global operator timeline so maintenance execution is visible alongside approval, follow-up, and escalation activity
- included run outcome detail such as sync count, reminded count, and no-op marker in the timeline event body
- extended operator timeline smoke coverage to verify a no-op maintenance sweep still leaves an auditable operator event

## 2026-04-06 Maintenance Pressure Resolution Trail

- extended maintenance run records with before/after pressure snapshots plus acknowledged/resolved/remaining counts so derived `maintenance-required` work leaves explicit audit evidence
- added `maintenance-required-acknowledged` and `maintenance-required-resolved` events to workspace/global operator timeline instead of letting maintenance pressure disappear silently after a sweep
- strengthened maintenance history smoke coverage to verify the first sweep acknowledges and clears one maintenance-required obligation while a second no-op sweep leaves no false resolution record

## 2026-04-06 Mission Maintenance Audit Surface

- propagated maintenance run totals and latest maintenance metadata into mission summary so a single mission can expose its own maintenance audit state without requiring workspace/global drill-down
- extended mission timeline with mission-scoped `maintenance-run`, `maintenance-required-acknowledged`, and `maintenance-required-resolved` events
- strengthened mission timeline smoke coverage to prove an overdue escalation can be reminded through mission-scoped maintenance before escalation resolution, while leaving explicit maintenance evidence in the mission audit stream

## 2026-04-06 Workspace Maintenance Linkback In Mission Timeline

- linked workspace-scoped maintenance runs back to affected mission ids so a mission timeline can show indirect maintenance activity even when the sweep was executed at workspace scope
- kept maintenance-required acknowledgement and resolution events mission-scoped only, while mission timelines now render a mission-specific workspace maintenance detail built from affected escalation and handoff reminder counts
- updated mission timeline smoke coverage to switch from action maintenance with mission scope to action maintenance with workspace scope and verify that related maintenance evidence still appears on the mission audit surface

## 2026-04-06 Mission Maintenance Impact Summary

- added combined maintenance impact fields to mission summary so direct mission maintenance totals and indirect workspace maintenance effects are both visible without replaying timeline events by hand
- kept direct maintenance aggregate semantics unchanged and introduced impact-only fields separately to avoid overcounting existing maintenanceRunCount and maintenanceTotalRemindedCount contracts
- extended mission timeline smoke coverage to assert the new impact totals for a workspace-scoped maintenance run that affects exactly one mission

## 2026-04-06 Workspace And Global Maintenance Impact Breadth

- added maintenance-affected mission breadth fields to workspace and global overview summaries so top-level control-plane surfaces can show how many missions recent sweeps actually touched
- kept existing maintenance total/reminder counters unchanged and exposed breadth as separate affected-mission metadata to avoid changing previous summary semantics
- extended workspace and global overview smoke coverage with maintenance sweeps so affected mission counts and latest impact run linkage are verified deterministically
- corrected workspace impact lookup so workspace overview also counts global maintenance sweeps and mission-scope sweeps that affected missions inside the workspace, instead of only runs that were launched with the workspace id directly

## 2026-04-06 Maintenance History Impact Summary

- extended maintenance history and maintenance overview summaries with affected mission breadth plus latest impact linkage so maintenance-specific audit surfaces can answer reach questions directly
- reused the same maintenance impact helper already used by mission and overview summaries instead of introducing a separate maintenance-history-only contract
- strengthened maintenance history smoke coverage to verify the first effective sweep touched exactly two missions while the later no-op sweep does not replace the latest impact run metadata
