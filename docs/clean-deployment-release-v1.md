# Clean Deployment Release Rehearsal v1

- status: clean-local-rehearsal-current
- generatedAt: 2026-05-05T02:06:55.026Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: b4fa0cae585814c8125b7a0d6c6e86e7216b4afb
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- cleanCheckoutMode: tracked-files-only
- cleanCheckoutFileCount: 331
- excludedRuntimeState: var/, output/playwright/, node_modules/, .git/
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)

## Decision Boundary

This rehearsal proves that core release gates can be replayed from a clean tracked-file checkout without local runtime state, Playwright output, dependency folders, or git metadata.

It is not target production deployment evidence, not hosted environment proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment produces clean deployment release evidence, production SLO/SLA operating evidence, completed target provider validation, and enforced enterprise controls.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
| `npm run smoke:incident-slo-policy` | pass | 0 | 223 |
| `npm run smoke:customer-support-operations` | pass | 0 | 270 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 258 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 1584 |
| `npm run smoke:target-deployment-contract` | pass | 0 | 447 |
| `npm run smoke:production-readiness-gate` | pass | 0 | 498 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 392 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 721 |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 374 |
| `npm run smoke:backup-restore-drill` | pass | 0 | 403 |
| `npm run smoke:runtime-isolation` | pass | 0 | 1485 |
| `npm run package:pilot-export` | pass | 0 | 373 |
| `npm run smoke:pilot-export-package` | pass | 0 | 236 |

## Key Signals

### npm run smoke:incident-slo-policy

```json
{
    "mode": "incident-slo-policy",
    "severityCount": 4
  }
```

### npm run smoke:customer-support-operations

```json
{
    "intakeClassCount": 5,
    "mode": "customer-support-operations",
    "productionReadyClaim": false,
    "supportRoleCount": 5
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

### npm run smoke:target-deployment-contract

```json
{
    "controlCount": 8,
    "mode": "target-deployment-contract",
    "productionReadyClaim": false,
    "profileCount": 4
  }
```

### npm run smoke:production-readiness-gate

```json
{
    "blockedProductionReady": true,
    "openaiLiveValidation": "passed",
    "pilotCleanDeploymentRelease": "present",
    "pilotCustomerSupportOperations": "present",
    "pilotRetentionDeletePolicy": "present",
    "productionBlockerCount": 8,
    "releaseArtifactHygiene": "passed"
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 18,
    "secretFindingCount": 0,
    "verifiedCommit": "b4fa0cae585814c8125b7a0d6c6e86e7216b4afb"
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

### npm run package:pilot-export

```json
{
    "fileCount": 27,
    "hygiene": "passed",
    "mode": "pilot-export-package",
    "ok": true,
    "verifiedCommit": "b4fa0cae585814c8125b7a0d6c6e86e7216b4afb"
  }
```

### npm run smoke:pilot-export-package

```json
{
    "fileCount": 27,
    "mode": "pilot-export-package",
    "verifiedCommit": "b4fa0cae585814c8125b7a0d6c6e86e7216b4afb"
  }
```

## Operator Re-Run

```bash
npm run rehearsal:clean-deployment-release
npm run smoke:clean-deployment-release
```

## Acceptance Rule

The rehearsal is acceptable only when every command in the matrix passes from the clean tracked-file checkout and artifact hygiene reports zero secret and machine-local path findings.

The rehearsal must keep `productionReadyClaim: false` until the same release evidence is generated from the approved production-like deployment environment.
