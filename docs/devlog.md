# Devlog

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
