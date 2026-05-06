# Production SLO Operating Rehearsal v1

- status: local-slo-operating-current
- generatedAt: 2026-05-06T06:35:57.153Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: 5d982dd7dbb4c300cee3f022bf1026917c5acc02
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local production-like SLO/SLA operating rehearsal
- productionReadyClaim: false
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetObservabilityArchitecture: [target-observability-architecture-v1.md](target-observability-architecture-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedTargetSupportArchitecture: [target-support-architecture-v1.md](target-support-architecture-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This rehearsal proves that pilot SLO operating checks can be replayed locally and that target SLO architecture, observability telemetry, target observability architecture, target observability operations, support escalation review, target support architecture, target support operations, release, artifact hygiene, runtime lifecycle, and runtime isolation signals remain measurable together.

It is not customer production SLO/SLA evidence, not hosted telemetry, not staffed on-call proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment provides approved target SLO/SLA architecture, production telemetry, customer-approved SLO/SLA terms, staffed incident ownership, support queue routing, on-call handoff, incident review cadence, and provider/deployment evidence.

## Command Matrix

| Command | Result | Exit Code | Duration Ms | Local Target | Within Target |
| --- | --- | ---: | ---: | --- | --- |
| `npm run smoke:incident-slo-policy` | pass | 0 | 187 | 5s | yes |
| `npm run smoke:target-slo-architecture` | pass | 0 | 211 | 5s | yes |
| `npm run smoke:observability-telemetry` | pass | 0 | 211 | 5s | yes |
| `npm run smoke:target-observability-architecture` | pass | 0 | 268 | 5s | yes |
| `npm run smoke:target-observability-operations` | pass | 0 | 258 | 5s | yes |
| `npm run smoke:support-escalation-review` | pass | 0 | 195 | 5s | yes |
| `npm run smoke:target-support-architecture` | pass | 0 | 188 | 5s | yes |
| `npm run smoke:target-support-operations` | pass | 0 | 182 | 5s | yes |
| `npm run smoke:execution-v1-status` | pass | 0 | 478 | 15s | yes |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 222 | 15s | yes |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 192 | 5s | yes |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 478 | 10s | yes |
| `npm run smoke:runtime-isolation` | pass | 0 | 761 | 10s | yes |

## Key Signals

### npm run smoke:incident-slo-policy

```json
{
    "mode": "incident-slo-policy",
    "severityCount": 4
  }
```

### npm run smoke:target-slo-architecture

```json
{
    "areaCount": 10,
    "mode": "target-slo-architecture",
    "productionReadyClaim": false,
    "targetSloApproved": false
  }
```

### npm run smoke:observability-telemetry

```json
{
    "alertTriggerCount": 5,
    "mode": "observability-telemetry",
    "productionReadyClaim": false,
    "telemetrySignalCount": 6
  }
```

### npm run smoke:target-observability-architecture

```json
{
    "areaCount": 9,
    "mode": "target-observability-architecture",
    "productionReadyClaim": false,
    "targetObservabilityApproved": false
  }
```

### npm run smoke:target-observability-operations

```json
{
    "controlCount": 6,
    "mode": "target-observability-operations",
    "operationsPacketItemCount": 10,
    "productionReadyClaim": false
  }
```

### npm run smoke:support-escalation-review

```json
{
    "auditPacketItemCount": 10,
    "escalationRouteCount": 4,
    "mode": "support-escalation-review",
    "productionReadyClaim": false,
    "reviewCadenceCount": 4
  }
```

### npm run smoke:target-support-architecture

```json
{
    "areaCount": 10,
    "mode": "target-support-architecture",
    "productionReadyClaim": false,
    "targetSupportApproved": false
  }
```

### npm run smoke:target-support-operations

```json
{
    "controlCount": 6,
    "mode": "target-support-operations",
    "productionReadyClaim": false,
    "supportPacketItemCount": 10
  }
```

### npm run smoke:execution-v1-status

```json
{
    "artifactState": "local-current",
    "artifactSyncCommit": false,
    "deterministic": "8/8",
    "runtimeRows": 8,
    "snapshotCommit": "5d982dd7dbb4c300cee3f022bf1026917c5acc02"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": false,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "5d982dd7dbb4c300cee3f022bf1026917c5acc02"
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 39,
    "secretFindingCount": 0,
    "verifiedCommit": "5d982dd7dbb4c300cee3f022bf1026917c5acc02"
  }
```

### npm run smoke:runtime-data-lifecycle

```json
{
    "deleted": true,
    "exportedFileCount": 13,
    "mode": "runtime-data-lifecycle"
  }
```

### npm run smoke:runtime-isolation

```json
{
    "deletedRuntimeA": true,
    "exportAFileCount": 13,
    "exportBFileCount": 13,
    "mode": "runtime-isolation"
  }
```

## Operating Interpretation

- deterministic release status and snapshot integrity remain the gate for stale evidence detection
- release artifact hygiene remains the gate for shareable evidence safety
- runtime lifecycle and runtime isolation remain the gate for pilot data handling readiness
- incident/SLO policy remains the source of severity, response target, owner, evidence, and closure rules
- target SLO architecture remains the gate for customer SLO terms, error budget, telemetry measurement, alert acknowledgement, on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, and service credit decision requirements
- observability telemetry remains the gate for local telemetry signals, alert triggers, and handoff requirements
- target observability architecture remains the gate for telemetry backend, signal taxonomy, alert routing, on-call staffing, retention, customer communication, incident response, audit, and disaster recovery decisions
- target observability operations remains the gate for telemetry pipeline, alert delivery, on-call routing, customer status communication, and incident review evidence requirements
- support escalation review remains the gate for escalation routes, audit packet requirements, incident review cadence, and customer update rules
- target support architecture remains the gate for staffing model, support queue, severity routing, customer communication, ticket audit, on-call handoff, incident commander ownership, escalation, support data handling, and incident review governance decision requirements
- target support operations remains the gate for staffed coverage, support queue routing, customer communication, ticket audit history, incident review cadence, and on-call handoff evidence requirements

## Operator Re-Run

```bash
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
```

## Acceptance Rule

The rehearsal is acceptable only when every command passes, every command remains within its local rehearsal target, and artifact hygiene reports zero credential and machine-local path findings.

The rehearsal must keep `productionReadyClaim: false` until the target SLO architecture is approved and the same operating evidence is generated from the approved production-like or production target environment.
