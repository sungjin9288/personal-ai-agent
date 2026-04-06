# Roadmap

## Current Milestone

- milestone: v1 managed multi-agent foundation
- status: in progress

## Completed In This Milestone

- CLI-first Node.js ESM scaffold
- managed role order: `manager -> planner -> executor -> reviewer`
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
