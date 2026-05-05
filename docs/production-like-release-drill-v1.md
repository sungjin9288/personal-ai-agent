# Production-Like Release Drill v1

- status: dry-run-evidence-current
- generatedAt: 2026-05-05T01:28:30.612Z
- branch: codex/managed-multi-agent-v1-foundation
- verifiedCommit: c0055ea17e7f6ac6737a20e39fd6440c350570c2
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local deterministic production-like release drill
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
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
| `npm run smoke:incident-slo-policy` | pass | 0 | 197 |
| `npm run smoke:production-slo-operating` | pass | 0 | 202 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 1426 |
| `npm run smoke:production-enterprise-controls` | pass | 0 | 202 |
| `npm run smoke:production-provider-readiness` | pass | 0 | 197 |
| `npm run smoke:target-deployment-contract` | pass | 0 | 178 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 185 |
| `npm run smoke:production-retention-operating` | pass | 0 | 189 |
| `npm run smoke:clean-deployment-release` | pass | 0 | 207 |
| `npm run smoke:execution-v1-status` | pass | 0 | 503 |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 229 |
| `npm run smoke:production-readiness-gate` | pass | 0 | 183 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 184 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 469 |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 234 |
| `npm run smoke:backup-restore-drill` | pass | 0 | 219 |
| `npm run smoke:runtime-isolation` | pass | 0 | 755 |

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

### npm run smoke:production-enterprise-controls

```json
{
    "commandCount": 7,
    "mode": "production-enterprise-controls",
    "productionReadyClaim": false
  }
```

### npm run smoke:production-provider-readiness

```json
{
    "mode": "production-provider-readiness",
    "productionReadyClaim": false,
    "providerCount": 4
  }
```

### npm run smoke:target-deployment-contract

```json
{
    "controlCount": 8,
    "mode": "target-deployment-contract",
    "productionReadyClaim": false,
    "profileCount": 4
  }
```

### npm run smoke:retention-delete-policy

```json
{
    "dataClassCount": 8,
    "mode": "retention-delete-policy",
    "productionReadyClaim": false
  }
```

### npm run smoke:production-retention-operating

```json
{
    "commandCount": 8,
    "mode": "production-retention-operating",
    "productionReadyClaim": false
  }
```

### npm run smoke:clean-deployment-release

```json
{
    "commandCount": 12,
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
    "snapshotCommit": "3e3d1ee4c0f2f137914cc8518789c3de06231117"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": true,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "3e3d1ee4c0f2f137914cc8518789c3de06231117"
  }
```

### npm run smoke:production-readiness-gate

```json
{
    "blockedProductionReady": true,
    "label": "provider-scoped pilot ready for OpenAI-backed local-first path",
    "openaiLiveValidation": "passed",
    "pilotCleanDeploymentRelease": "present",
    "pilotProductionEnterpriseControls": "present",
    "pilotIncidentSloPolicy": "present",
    "pilotProductionProviderReadiness": "present",
    "pilotProductionRetentionOperating": "present",
    "pilotProductionSloOperating": "present",
    "pilotRetentionDeletePolicy": "present",
    "productionLikeReleaseDrill": "present",
    "productionBlockerCount": 7,
    "releaseArtifactHygiene": "passed",
    "releaseArtifactHygieneScannedFiles": 17
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 17,
    "secretFindingCount": 0,
    "verifiedCommit": "3e3d1ee4c0f2f137914cc8518789c3de06231117"
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

### npm run smoke:tenant-data-lifecycle

```json
{
    "deletedTenantA": true,
    "exportedFileCount": 2,
    "mode": "tenant-data-lifecycle"
  }
```

### npm run smoke:backup-restore-drill

```json
{
    "backupFileCount": 3,
    "mode": "backup-restore-drill",
    "restoredFileCount": 3,
    "tenantDeleteIsolated": true
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
- target deployment contract is not satisfied by target-environment evidence
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
