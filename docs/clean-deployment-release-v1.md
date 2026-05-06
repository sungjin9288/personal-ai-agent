# Clean Deployment Release Rehearsal v1

- status: clean-local-rehearsal-current
- generatedAt: 2026-05-06T05:06:57.215Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: 2d38637c39e883f54df5102ed67392e8bee41ba4
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- cleanCheckoutMode: tracked-files-only
- cleanCheckoutFileCount: 441
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
| `npm run smoke:incident-slo-policy` | pass | 0 | 399 |
| `npm run smoke:identity-session-admin` | pass | 0 | 332 |
| `npm run smoke:tenant-storage-admin` | pass | 0 | 304 |
| `npm run smoke:customer-support-operations` | pass | 0 | 526 |
| `npm run smoke:support-escalation-review` | pass | 0 | 277 |
| `npm run smoke:target-support-operations` | pass | 0 | 342 |
| `npm run smoke:secret-management` | pass | 0 | 287 |
| `npm run smoke:target-secret-manager` | pass | 0 | 256 |
| `npm run smoke:observability-telemetry` | pass | 0 | 316 |
| `npm run smoke:target-observability-architecture` | pass | 0 | 333 |
| `npm run smoke:target-observability-operations` | pass | 0 | 563 |
| `npm run smoke:target-slo-architecture` | pass | 0 | 367 |
| `npm run smoke:target-data-lifecycle-architecture` | pass | 0 | 288 |
| `npm run smoke:target-retention-operations` | pass | 0 | 318 |
| `npm run smoke:target-backup-operations` | pass | 0 | 388 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 312 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 1604 |
| `npm run smoke:target-deployment-contract` | pass | 0 | 257 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 337 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 711 |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 600 |
| `npm run smoke:backup-restore-drill` | pass | 0 | 417 |
| `npm run smoke:runtime-isolation` | pass | 0 | 1446 |
| `npm run package:pilot-export` | pass | 0 | 415 |
| `npm run smoke:pilot-export-package` | pass | 0 | 660 |

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

### npm run smoke:target-slo-architecture

```json
{
    "areaCount": 10,
    "mode": "target-slo-architecture",
    "productionReadyClaim": false,
    "targetSloApproved": false
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
    "controlCount": 16,
    "mode": "target-deployment-contract",
    "productionReadyClaim": false,
    "profileCount": 4
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 37,
    "secretFindingCount": 0,
    "verifiedCommit": "f54954ddc720552192a7ba2b1c43a71f908d117a"
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
    "fileCount": 46,
    "hygiene": "passed",
    "mode": "pilot-export-package",
    "ok": true,
    "verifiedCommit": "f54954ddc720552192a7ba2b1c43a71f908d117a"
  }
```

### npm run smoke:pilot-export-package

```json
{
    "fileCount": 46,
    "mode": "pilot-export-package",
    "verifiedCommit": "f54954ddc720552192a7ba2b1c43a71f908d117a"
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
