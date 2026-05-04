# Production-Like Release Drill v1

- status: dry-run-evidence-current
- generatedAt: 2026-05-04T10:07:55.614Z
- branch: codex/managed-multi-agent-v1-foundation
- verifiedCommit: 21d582db511871b8db0aa1862b658409c2b4ffb4
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local deterministic production-like release drill
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)

## Decision Boundary

This drill proves that the release gate can be replayed in a local deterministic environment before a production-like deployment run.

It is not production deployment evidence, not customer production SLO/SLA evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the target deployment model produces clean deployment release evidence, production SLO/SLA operating evidence, completed target provider validation, and enforced enterprise controls.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
| `npm run smoke:incident-slo-policy` | pass | 0 | 268 |
| `npm run smoke:execution-v1-status` | pass | 0 | 548 |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 241 |
| `npm run smoke:production-readiness-gate` | pass | 0 | 246 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 209 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 561 |
| `npm run smoke:runtime-isolation` | pass | 0 | 1040 |

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
    "branch": "codex/managed-multi-agent-v1-foundation",
    "deterministic": "8/8",
    "referenceAdoptionReady": true,
    "runtimeRows": 8,
    "snapshotCommit": "21d582db511871b8db0aa1862b658409c2b4ffb4"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": false,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "21d582db511871b8db0aa1862b658409c2b4ffb4"
  }
```

### npm run smoke:production-readiness-gate

```json
{
    "blockedProductionReady": true,
    "label": "provider-scoped pilot ready for OpenAI-backed local-first path",
    "openaiLiveValidation": "passed",
    "pilotIncidentSloPolicy": "present",
    "productionLikeReleaseDrill": "present",
    "productionBlockerCount": 6,
    "releaseArtifactHygiene": "passed",
    "releaseArtifactHygieneScannedFiles": 9
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 9,
    "secretFindingCount": 0,
    "verifiedCommit": "21d582db511871b8db0aa1862b658409c2b4ffb4"
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

## Production Blockers Preserved

- Anthropic, local, and Hermes live validations are not complete
- authenticated RBAC is not implemented as a hosted product feature
- hosted tenant isolation is out of v1 scope
- production retention/export/delete verification is not complete
- production SLO/SLA operating evidence is not generated from a production-like environment
- clean deployment release evidence is not generated from a production-like environment

## Operator Re-Run

```bash
npm run drill:production-like-release
npm run smoke:production-like-release-drill
```

## Acceptance Rule

The drill is acceptable only when every command in the matrix passes and artifact hygiene reports zero secret and machine-local path findings.

The drill must keep `productionReadyClaim: false` until production-like deployment evidence is generated from the approved target environment.
