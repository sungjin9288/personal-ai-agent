# Production SLO Operating Rehearsal v1

- status: local-slo-operating-current
- generatedAt: 2026-05-05T03:45:57.700Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: 0890545e7f4949a90dc01865494a498c562c88ab
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local production-like SLO/SLA operating rehearsal
- productionReadyClaim: false
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This rehearsal proves that pilot SLO operating checks can be replayed locally and that observability telemetry, support escalation review, release, artifact hygiene, runtime lifecycle, and runtime isolation signals remain measurable together.

It is not customer production SLO/SLA evidence, not hosted telemetry, not staffed on-call proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment provides production telemetry, customer-approved SLO/SLA terms, staffed incident ownership, incident review cadence, and provider/deployment evidence.

## Command Matrix

| Command | Result | Exit Code | Duration Ms | Local Target | Within Target |
| --- | --- | ---: | ---: | --- | --- |
| `npm run smoke:incident-slo-policy` | pass | 0 | 126 | 5s | yes |
| `npm run smoke:observability-telemetry` | pass | 0 | 130 | 5s | yes |
| `npm run smoke:support-escalation-review` | pass | 0 | 133 | 5s | yes |
| `npm run smoke:execution-v1-status` | pass | 0 | 404 | 15s | yes |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 146 | 15s | yes |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 127 | 5s | yes |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 314 | 10s | yes |
| `npm run smoke:runtime-isolation` | pass | 0 | 503 | 10s | yes |

## Key Signals

### npm run smoke:incident-slo-policy

```json
{
    "mode": "incident-slo-policy",
    "severityCount": 4
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

### npm run smoke:execution-v1-status

```json
{
    "artifactState": "local-current",
    "artifactSyncCommit": false,
    "deterministic": "8/8",
    "runtimeRows": 8,
    "snapshotCommit": "0890545e7f4949a90dc01865494a498c562c88ab"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": false,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "0890545e7f4949a90dc01865494a498c562c88ab"
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 21,
    "secretFindingCount": 0,
    "verifiedCommit": "0890545e7f4949a90dc01865494a498c562c88ab"
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
- observability telemetry remains the gate for local telemetry signals, alert triggers, and handoff requirements
- support escalation review remains the gate for escalation routes, audit packet requirements, incident review cadence, and customer update rules

## Operator Re-Run

```bash
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
```

## Acceptance Rule

The rehearsal is acceptable only when every command passes, every command remains within its local rehearsal target, and artifact hygiene reports zero credential and machine-local path findings.

The rehearsal must keep `productionReadyClaim: false` until the same operating evidence is generated from the approved production-like or production target environment.
