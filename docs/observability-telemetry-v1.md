# Observability Telemetry v1

- status: local-observability-telemetry-current
- localDate: 2026-05-05
- scope: local pilot observability, telemetry, alert routing, and release evidence rehearsal
- productionReadyClaim: false
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetObservabilityArchitecture: [target-observability-architecture-v1.md](target-observability-architecture-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)

## Decision Boundary

This document defines the local pilot observability contract. It proves that the pilot has explicit telemetry signals, local evidence sources, alert triggers, triage commands, and handoff requirements before SLO/SLA operating evidence is shared.

It is not hosted telemetry evidence, not production log aggregation, not distributed tracing, not a customer status page, not staffed alerting proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment provides production telemetry, alert delivery evidence, trace/log retention policy, staffed on-call routing, customer-facing status communication, and incident review history.

## Telemetry Signals

| Signal | Local Source | Required Evidence |
| --- | --- | --- |
| Release state | `smoke:execution-v1-status` | artifact state, deterministic count, snapshot commit |
| Snapshot integrity | `smoke:execution-v1-snapshot` | archived snapshot path, verified commit, deterministic pass count |
| Provider readiness | `smoke:production-provider-readiness` | provider matrix, missing env count, archived live status |
| Artifact hygiene | `smoke:release-artifact-hygiene` | zero secret findings and zero machine-local path findings |
| Runtime lifecycle | `smoke:runtime-data-lifecycle`, `smoke:runtime-isolation` | export/delete result, runtime isolation result |
| Incident queue | `incident-slo-v1.md`, `action log-overdue` | severity, owner, next review, closure evidence |

## Alert Triggers

| Trigger | Severity | Required First Response |
| --- | --- | --- |
| Artifact hygiene finds a credential or machine-local path | SEV1 | stop sharing, rotate if needed, scrub and regenerate artifacts |
| OpenAI live validation regresses from passed to failed | SEV2 | run provider preflight, capture failure class, block release label expansion |
| Execution snapshot is stale or missing | SEV3 | regenerate closeout, handoff, snapshot, and pilot export package |
| Runtime lifecycle or isolation smoke fails | SEV2 | stop data lifecycle claims and isolate affected runtime root |
| Provider readiness matrix changes missing env or blocked state | SEV3 | update provider readiness evidence and release blockers |

## Required Commands

```bash
npm run smoke:observability-telemetry
npm run smoke:target-observability-architecture
npm run smoke:target-slo-architecture
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:production-provider-readiness
npm run smoke:release-artifact-hygiene
```

## Handoff Requirements

Every observability handoff must include:

- current branch and commit
- release label and productionReadyClaim state
- execution-v1 status summary
- snapshot path and verified commit
- provider readiness matrix summary
- artifact hygiene finding counts
- incident owner and next review date for any open alert trigger
- whether evidence, closeout, handoff, snapshot, or pilot package changed

## Acceptance Rule

This gate is acceptable only when telemetry signals, alert triggers, required commands, handoff requirements, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is local pilot observability evidence. It does not prove production log aggregation, metrics backend availability, distributed tracing, alert delivery, staffed on-call response, customer status page operation, or production incident review cadence.

Observability and telemetry remain blocked for production-ready claims until the approved target deployment provides production telemetry and alerting evidence.
