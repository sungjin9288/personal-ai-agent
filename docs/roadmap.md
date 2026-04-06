# Roadmap

## Current Milestone

- milestone: v1 managed multi-agent foundation
- status: in progress

## Completed In This Milestone

- CLI-first Node.js ESM scaffold
- managed role order: `manager -> planner -> executor -> reviewer`
- runtime/provider path is now async-safe so network-backed providers can be introduced without changing the mission/session contract again
- OpenAI provider adapter now exists behind the current provider contract, with env validation and Responses API request wiring
- first-class runtime entities in `var/state.json`
- approval gate for risky engineering execution proposals
- approval approve/reject both leave deterministic handoff evidence
- deliverable-aware reviewer rubric checks
- mission-scoped decision memory persists reviewer and approval outcomes across reruns
- planner and executor adapt rerun artifacts using prior mission memory
- reruns are inspectable through explicit session history and per-session summaries
- mission-level summary and timeline aggregate session, approval, and memory evidence
- workspace overview aggregates cross-mission operational state
- global overview aggregates all workspaces and exposes a pending approval inbox
- approval inbox is available as a first-class command with contextual resolution guidance
- action inbox aggregates pending approvals and reviewer follow-up items into one operator surface
- action inbox now classifies work as `awaiting-human-decision`, `retry-ready`, or `blocked`
- action inbox now carries `priority` and `recommendedOwner` dispatch metadata for operator triage
- action inbox now carries `slaHours`, `dueAt`, `isOverdue`, and `escalationRule` for time-based dispatch
- overdue actions can now be explicitly written into `docs/incidents.md` through a dedicated CLI command
- overdue actions now create first-class escalation records with open/resolved lifecycle
- workspace and global overview now aggregate open escalation pressure for top-level control-plane visibility
- mission timeline now includes escalation open/resolved lifecycle events
- workspace and global operator timeline surfaces now aggregate approval, reviewer follow-up, and escalation events
- reviewer follow-up items now have explicit open/resolved lifecycle records and can be resolved independently from escalation state
- mission, workspace, and global timelines now show reviewer follow-up closure instead of only opened events
- reviewer follow-up resolution now carries explicit taxonomy for `rerun-fixed`, `superseded`, `scope-reduced`, and `accepted-risk`
- `accepted-risk` reviewer resolution now opens a monitoring escalation automatically so accepted risk remains visible in workspace/global control-plane surfaces
- accepted-risk monitoring escalation now re-enters `action inbox` as `monitoring-required`, including overdue slicing for workspace-owner review
- escalations now carry tiered operator severity so `action escalated` and overview surfaces can distinguish normal, warning, critical, and resolved pressure
- escalation sync now persists tier transition history and breach count so severity changes are recorded, not just derived at read time
- escalation reminders are now first-class runtime events with persisted count/history so overdue pressure can be re-issued and audited locally
- escalation reminder due policy is now derived from tier cadence and exposed through `--needs-reminder` and `--due` operator slices
- repeated due reminder pressure now derives an effective owner chain so monitoring work can escalate from workspace-owner to human-approver without external integrations
- owner chain escalation is now persisted as history and surfaced on mission/operator timelines so reviewer follow-up pressure remains auditable across reruns
- owner transition is now actionable through a pending handoff queue and explicit acknowledgement lifecycle, still fully local-first
- pending owner handoffs now carry explicit SLA, due, and overdue metadata so operator queues and overview surfaces can show acknowledgement pressure instead of only raw transition state
- pending owner handoffs now re-enter the unified `action inbox` as `handoff-required`, so owner acknowledgement work is visible in the main operator dispatch surface instead of only the dedicated handoff queue
- pending owner handoffs now have a local-first reminder policy with `--needs-reminder` slicing, re-notify command support, and reminder trail visibility on mission/workspace/global surfaces
- unified `action inbox` now exposes a cross-action `--needs-reminder` slice so monitoring-required and handoff-required work can be re-triaged from the main operator queue without switching surfaces
- `action maintenance` now runs a local-first due reminder sweep across escalation pressure and pending owner handoffs, with duplicate suppression for handoff-owned escalations
- maintenance sweeps are now persisted as first-class run history and exposed through `action maintenance-history` plus `overview maintenance`, with latest run totals surfaced on workspace/global overview
- due maintenance pressure now re-enters the unified `action inbox` as `maintenance-required`, so operators can trigger the sweep from the same dispatch surface that shows reminder work
- workspace/global operator timeline now includes `maintenance-run` events, so maintenance execution is visible in the same chronological operator stream as approvals, follow-ups, and escalations
- maintenance runs now persist acknowledged/resolved maintenance-pressure snapshot counts, so operator history can show when a derived `maintenance-required` obligation was actively handled and cleared
- mission summary and mission timeline now include mission-scoped maintenance run plus maintenance-required resolution evidence, so mission audit no longer depends on workspace/global operator surfaces only
- workspace-wide maintenance sweeps now link affected mission ids back into mission audit surfaces, so indirect maintenance effects are visible from the mission timeline without requiring operator-level drill-down
- mission summary now exposes combined maintenance impact fields so direct mission sweep totals and indirect workspace sweep effects can both be inspected without re-aggregating timeline events manually
- workspace and global overview now expose maintenance-affected mission breadth so higher-level control-plane summaries can show how many missions recent sweeps actually touched
- workspace overview now treats global sweep and mission-scope sweep results as workspace impact too, so nested workspace summaries inside global overview do not miss maintenance work executed from a broader scope
- maintenance history and maintenance overview now expose affected mission breadth and latest impact linkage, so maintenance-specific audit surfaces can answer impact questions without relying on workspace/global overview only
- mission-scoped maintenance history and overview now include related workspace sweeps and expose mission-specific `missionImpact*` totals, so maintenance audit stays consistent with mission summary/timeline semantics
- maintenance-specific summaries now expose effective/no-op run counts plus recent run trend metadata, so operators can distinguish active sweep effectiveness from idle audit runs without diffing raw history manually
- maintenance history and overview now support `--outcome <effective|no-op|impactful>` filtering, so sweep audit can be sliced directly by run quality without post-processing the summary payload
- maintenance history and overview now support `--since <iso-timestamp>` filtering, so time-window audit can be combined with workspace mission outcome slicing without adding a separate trend command
- maintenance-specific summary now exposes dailyBuckets for the current filtered slice, so time-window audit can be read as a small daily aggregate without introducing a separate reporting endpoint
- maintenance-specific summary now exposes latestBucketDelta, so operators can read latest-vs-previous daily change without manually diffing bucket arrays
- memory and document logging commands
- deterministic local-first smoke coverage

## Next Milestone Scope

- live provider adapters behind the current provider contract
- richer risk policy for path-level file and shell execution
- resumable parallel specialist roles under manager control
- stronger reviewer rubrics per deliverable type

## Deferred

- autonomous swarm execution
- background task queue
- chat or mobile surfaces
- repo mutation against registered workspaces
