# Production-Like Release Drill v1

- status: dry-run-evidence-current
- generatedAt: 2026-05-04T14:51:23.609Z
- branch: codex/managed-multi-agent-v1-foundation
- verifiedCommit: 49afcc1e8e17d57edd7337aa2044989358f90e1d
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local deterministic production-like release drill
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)

## Decision Boundary

This drill proves that the release gate can be replayed in a local deterministic environment before a production-like deployment run.

It is not production deployment evidence, not customer production SLO/SLA evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the target deployment model produces clean deployment release evidence, production SLO/SLA operating evidence, completed target provider validation, and enforced enterprise controls.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
| `npm run smoke:incident-slo-policy` | pass | 0 | 112 |
| `npm run smoke:production-slo-operating` | pass | 0 | 114 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 1307 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 140 |
| `npm run smoke:production-retention-operating` | pass | 0 | 130 |
| `npm run smoke:clean-deployment-release` | pass | 0 | 114 |
| `npm run smoke:execution-v1-status` | pass | 0 | 405 |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 146 |
| `npm run smoke:production-readiness-gate` | pass | 0 | 121 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 114 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 292 |
| `npm run smoke:runtime-isolation` | pass | 0 | 451 |

## Key Signals

### npm run smoke:incident-slo-policy

```json
{
    "mode": "incident-slo-policy",
    "severityCount": 4
  }
```

### npm run smoke:production-slo-operating

```json
{
    "commandCount": 7,
    "mode": "production-slo-operating",
    "productionReadyClaim": false
  }
```

### npm run smoke:web-auth-rbac

```json
{
    "authMode": "enforce",
    "mode": "web-auth-rbac",
    "roleChecks": {
      "authenticatedOperatorMissionCreated": true,
      "authenticatedViewerMutationBlocked": true,
      "invalidTokenBlocked": true,
      "missingTokenBlocked": true
    }
  }
```

### npm run smoke:retention-delete-policy

```json
{
    "dataClassCount": 6,
    "mode": "retention-delete-policy",
    "productionReadyClaim": false
  }
```

### npm run smoke:production-retention-operating

```json
{
    "commandCount": 6,
    "mode": "production-retention-operating",
    "productionReadyClaim": false
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

### npm run smoke:execution-v1-status

```json
{
    "artifactState": "artifact-sync-current",
    "artifactSyncCommit": true,
    "branch": "codex/managed-multi-agent-v1-foundation",
    "deterministic": "8/8",
    "referenceAdoptionReady": true,
    "runtimeRows": 8,
    "snapshotCommit": "f109cbab41f3ec9a6ee144dba11a07d0328eab4c"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": true,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "f109cbab41f3ec9a6ee144dba11a07d0328eab4c"
  }
```

### npm run smoke:production-readiness-gate

```json
{
    "blockedProductionReady": true,
    "label": "provider-scoped pilot ready for OpenAI-backed local-first path",
    "openaiLiveValidation": "passed",
    "pilotCleanDeploymentRelease": "present",
    "pilotIncidentSloPolicy": "present",
    "pilotProductionRetentionOperating": "present",
    "pilotProductionSloOperating": "present",
    "pilotRetentionDeletePolicy": "present",
    "productionLikeReleaseDrill": "present",
    "productionBlockerCount": 6,
    "releaseArtifactHygiene": "passed",
    "releaseArtifactHygieneScannedFiles": 13
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 13,
    "secretFindingCount": 0,
    "verifiedCommit": "f109cbab41f3ec9a6ee144dba11a07d0328eab4c"
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
- identity-backed hosted RBAC/session administration is not implemented as a hosted product feature
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
