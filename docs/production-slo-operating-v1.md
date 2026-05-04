# Production SLO Operating Rehearsal v1

- status: local-slo-operating-current
- generatedAt: 2026-05-04T15:03:24.069Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: 27a5b7146b069d674a9a062fb854de03840f1380
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local production-like SLO/SLA operating rehearsal
- productionReadyClaim: false
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)

## Decision Boundary

This rehearsal proves that pilot SLO operating checks can be replayed locally and that release, artifact hygiene, clean deployment rehearsal, runtime lifecycle, and runtime isolation signals remain measurable together.

It is not customer production SLO/SLA evidence, not hosted telemetry, not staffed on-call proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment provides production telemetry, customer-approved SLO/SLA terms, staffed incident ownership, incident review cadence, and provider/deployment evidence.

## Command Matrix

| Command | Result | Exit Code | Duration Ms | Local Target | Within Target |
| --- | --- | ---: | ---: | --- | --- |
| `npm run smoke:incident-slo-policy` | pass | 0 | 122 | 5s | yes |
| `npm run smoke:execution-v1-status` | pass | 0 | 367 | 15s | yes |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 132 | 15s | yes |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 113 | 5s | yes |
| `npm run smoke:clean-deployment-release` | pass | 0 | 112 | 15s | yes |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 283 | 10s | yes |
| `npm run smoke:runtime-isolation` | pass | 0 | 449 | 10s | yes |

## Key Signals

### npm run smoke:incident-slo-policy

```json
{
    "mode": "incident-slo-policy",
    "severityCount": 4
  }
```

### npm run smoke:execution-v1-status

```json
{
    "artifactState": "local-current",
    "artifactSyncCommit": false,
    "deterministic": "8/8",
    "runtimeRows": 8,
    "snapshotCommit": "27a5b7146b069d674a9a062fb854de03840f1380"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": false,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "27a5b7146b069d674a9a062fb854de03840f1380"
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 13,
    "secretFindingCount": 0,
    "verifiedCommit": "27a5b7146b069d674a9a062fb854de03840f1380"
  }
```

### npm run smoke:clean-deployment-release

```json
{
    "commandCount": 8,
    "mode": "clean-deployment-release",
    "productionReadyClaim": false
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
- clean deployment rehearsal remains the gate for local portability without runtime state
- runtime lifecycle and runtime isolation remain the gate for pilot data handling readiness
- incident/SLO policy remains the source of severity, response target, owner, evidence, and closure rules

## Operator Re-Run

```bash
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
```

## Acceptance Rule

The rehearsal is acceptable only when every command passes, every command remains within its local rehearsal target, and artifact hygiene reports zero credential and machine-local path findings.

The rehearsal must keep `productionReadyClaim: false` until the same operating evidence is generated from the approved production-like or production target environment.
