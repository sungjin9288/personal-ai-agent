# Council Concurrent Schedule Shadow v1.1b

- status: synthetic/read-only projection
- contractVersion: `council-concurrent-schedule-shadow-v1.1b`
- productionReadyClaim: false
- C13 boundary: `keep-stub-only`

## Purpose

This follow-up projects the frozen v1.1a council stage graph into four candidate waves: `opening`, `rebuttal`, `chair`, and `reviewer`. It is a structural schedule shadow only. It does not dispatch concurrent work, create a mission, initialize storage, call a provider, select a model, mutate approvals, or activate a runtime.

The schedule reuses the v1.1a pure blueprint stage ids, dependencies, roles, and rebuttal targets. Every stage has the fixed synthetic record `attempt:<stageId>:1`, `attemptNumber: 1`, and `retryCount: 0`. `actualConcurrentDispatch` is always `false`.

Every response also carries `sequentialBaseline` from the unchanged v1.1a meeting-plan and authority APIs plus computed `parity`. `parity.stageIdsEqual`, `parity.dependenciesEqual`, and `parity.authorityEqual` must all be true; `matchesSequentialBaseline` is their combined result.

## Barriers and completion projection

Each wave has an `all-completed` barrier. Completion records contain exactly `stageId`, `attemptId`, and `outcome`, where outcome is `completed`, `failed`, or `timeout`.

- Same-wave event order is canonicalized by the existing canonical stage order.
- A next-wave event before its preceding all-completed barrier fails closed.
- Unknown stages, extra fields, duplicate events, stale attempts, invalid outcomes, and events after a blocked barrier fail closed with the existing Council preview validation-error payload.
- `failed` and `timeout` block downstream waves. Terminal outcomes already supplied for siblings in the same wave remain visible. A timeout stage has status `timed-out`; every downstream stage has status `dependency-blocked`.

The projection reports wave and overall `waiting`, `ready`, `in-progress`, `completed`, or `blocked` status, canonical stage records, `readyStageIds`, and the first canonical `blocker` (or `null`). The only numbers are structural `waveCount` and `stageCount`; this shadow makes no latency, resource, or performance claim.

## Read-only surfaces

- CLI: `node src/cli.mjs council concurrent-schedule-shadow --role research --role implementation --role verification`
- CLI completion record: `--completion-event 'opening:research|attempt:opening:research:1|completed'`
- HTTP: `GET /api/council/concurrent-schedule-shadow?role=research&role=implementation&role=verification`
- HTTP completion record: `&completionEvent=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A1%7Ccompleted`
- UI: the existing Council preview panel shows the sequential baseline beside the four synthetic candidate waves. It exposes no execution or dispatch action.

The CLI route dispatches before root/store/mission initialization. A fresh `PERSONAL_AI_AGENT_ROOT` remains empty. The GET route and UI are read-only viewer paths and do not feed `buildMissionConstraintPayload`.

A value-less CLI `--completion-event` and an empty HTTP `completionEvent=` both return the existing stable Council preview validation-error payload.

## Scope & Limitations

- This is not a worker scheduler, queue, retry system, provider contract, or runtime execution path.
- Attempt two and retry are deliberately out of scope.
- The frozen v1.1a response shape and C6–C13 plan, fixtures, artifacts, provider behavior, storage schema, mission flow, and approvals are unchanged.
- `keep-stub-only` remains the C13 decision. This shadow is not evidence of model compatibility, provider readiness, deployment, or production readiness.

## Verification

Run `node --test test/council-concurrent-schedule-shadow.test.mjs`, `npm run smoke:council-concurrent-schedule-shadow`, `npm run smoke:ui-agent-blueprints`, `npm run smoke:council-blueprint-preview`, `npm run smoke:council-stub-runtime`, `npm run smoke:local-council-strict-prompt-candidate-qualification`, and `npm run smoke:local-council-v6-actual-compatibility-observation`.
