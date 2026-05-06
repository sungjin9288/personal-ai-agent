# Clean Deployment Release Rehearsal v1

- status: clean-local-rehearsal-current
- generatedAt: 2026-05-06T03:40:05.619Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: 606dc2e1fe7d2e034bff241f1191eb8a06f7027c
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- cleanCheckoutMode: tracked-files-only
- cleanCheckoutFileCount: 435
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
| `npm run smoke:incident-slo-policy` | pass | 0 | 772 |
| `npm run smoke:identity-session-admin` | pass | 0 | 528 |
| `npm run smoke:tenant-storage-admin` | pass | 0 | 457 |
| `npm run smoke:customer-support-operations` | pass | 0 | 395 |
| `npm run smoke:support-escalation-review` | pass | 0 | 508 |
| `npm run smoke:target-support-operations` | pass | 0 | 545 |
| `npm run smoke:secret-management` | pass | 0 | 1091 |
| `npm run smoke:target-secret-manager` | pass | 0 | 470 |
| `npm run smoke:observability-telemetry` | pass | 0 | 668 |
| `npm run smoke:target-observability-architecture` | pass | 0 | 581 |
| `npm run smoke:target-observability-operations` | pass | 0 | 560 |
| `npm run smoke:target-data-lifecycle-architecture` | pass | 0 | 531 |
| `npm run smoke:target-retention-operations` | pass | 0 | 518 |
| `npm run smoke:target-backup-operations` | pass | 0 | 646 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 557 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 2101 |
| `npm run smoke:target-deployment-contract` | pass | 0 | 428 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 456 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 1357 |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 615 |
| `npm run smoke:backup-restore-drill` | pass | 0 | 1044 |
| `npm run smoke:runtime-isolation` | pass | 0 | 2403 |
| `npm run package:pilot-export` | pass | 0 | 485 |
| `npm run smoke:pilot-export-package` | pass | 0 | 730 |

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

### npm run smoke:target-data-lifecycle-architecture

```json
{
    "areaCount": 10,
    "mode": "target-data-lifecycle-architecture",
    "productionReadyClaim": false,
    "targetDataLifecycleApproved": false
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
    "controlCount": 15,
    "mode": "target-deployment-contract",
    "productionReadyClaim": false,
    "profileCount": 4
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 36,
    "secretFindingCount": 0,
    "verifiedCommit": "3a0be66cedbb1cd4288b45d728bf9e9710b8f000"
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
    "fileCount": 45,
    "hygiene": "passed",
    "mode": "pilot-export-package",
    "ok": true,
    "verifiedCommit": "3a0be66cedbb1cd4288b45d728bf9e9710b8f000"
  }
```

### npm run smoke:pilot-export-package

```json
{
    "fileCount": 45,
    "mode": "pilot-export-package",
    "verifiedCommit": "3a0be66cedbb1cd4288b45d728bf9e9710b8f000"
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
