# Clean Deployment Release Rehearsal v1

- status: clean-local-rehearsal-current
- generatedAt: 2026-05-05T14:45:32.243Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: 440e3ba4b3d37eda0c8f8d14707f8487bea6bc93
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- cleanCheckoutMode: tracked-files-only
- cleanCheckoutFileCount: 391
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
| `npm run smoke:incident-slo-policy` | pass | 0 | 426 |
| `npm run smoke:identity-session-admin` | pass | 0 | 328 |
| `npm run smoke:tenant-storage-admin` | pass | 0 | 359 |
| `npm run smoke:customer-support-operations` | pass | 0 | 248 |
| `npm run smoke:support-escalation-review` | pass | 0 | 234 |
| `npm run smoke:target-support-operations` | pass | 0 | 209 |
| `npm run smoke:secret-management` | pass | 0 | 208 |
| `npm run smoke:target-secret-manager` | pass | 0 | 220 |
| `npm run smoke:observability-telemetry` | pass | 0 | 205 |
| `npm run smoke:target-observability-operations` | pass | 0 | 200 |
| `npm run smoke:target-retention-operations` | pass | 0 | 197 |
| `npm run smoke:target-backup-operations` | pass | 0 | 270 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 267 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 1498 |
| `npm run smoke:target-deployment-contract` | pass | 0 | 209 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 220 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 525 |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 236 |
| `npm run smoke:backup-restore-drill` | pass | 0 | 313 |
| `npm run smoke:runtime-isolation` | pass | 0 | 940 |
| `npm run package:pilot-export` | pass | 0 | 224 |
| `npm run smoke:pilot-export-package` | pass | 0 | 262 |

## Key Signals

### npm run smoke:incident-slo-policy

```json
{
    "mode": "incident-slo-policy",
    "severityCount": 4
  }
```

### npm run smoke:identity-session-admin

```json
{
    "auditPacketItemCount": 10,
    "controlCount": 5,
    "mode": "identity-session-admin",
    "productionReadyClaim": false,
    "sessionEventCount": 5
  }
```

### npm run smoke:tenant-storage-admin

```json
{
    "auditPacketItemCount": 10,
    "controlCount": 5,
    "mode": "tenant-storage-admin",
    "operationCount": 5,
    "productionReadyClaim": false
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

### npm run smoke:target-support-operations

```json
{
    "controlCount": 6,
    "mode": "target-support-operations",
    "productionReadyClaim": false,
    "supportPacketItemCount": 10
  }
```

### npm run smoke:secret-management

```json
{
    "injectionRuleCount": 5,
    "mode": "secret-management",
    "productionReadyClaim": false,
    "secretClassCount": 5
  }
```

### npm run smoke:target-secret-manager

```json
{
    "controlCount": 6,
    "mode": "target-secret-manager",
    "productionReadyClaim": false,
    "rotationPacketItemCount": 10
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

### npm run smoke:target-observability-operations

```json
{
    "controlCount": 6,
    "mode": "target-observability-operations",
    "operationsPacketItemCount": 10,
    "productionReadyClaim": false
  }
```

### npm run smoke:target-retention-operations

```json
{
    "controlCount": 6,
    "mode": "target-retention-operations",
    "productionReadyClaim": false,
    "retentionPacketItemCount": 10
  }
```

### npm run smoke:target-backup-operations

```json
{
    "controlCount": 6,
    "mode": "target-backup-operations",
    "productionReadyClaim": false,
    "recoveryPacketItemCount": 10
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

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 28,
    "secretFindingCount": 0,
    "verifiedCommit": "440e3ba4b3d37eda0c8f8d14707f8487bea6bc93"
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
    "fileCount": 37,
    "hygiene": "passed",
    "mode": "pilot-export-package",
    "ok": true,
    "verifiedCommit": "440e3ba4b3d37eda0c8f8d14707f8487bea6bc93"
  }
```

### npm run smoke:pilot-export-package

```json
{
    "fileCount": 37,
    "mode": "pilot-export-package",
    "verifiedCommit": "440e3ba4b3d37eda0c8f8d14707f8487bea6bc93"
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
