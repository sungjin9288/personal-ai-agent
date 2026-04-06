# Devlog

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
