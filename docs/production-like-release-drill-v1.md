# Production-Like Release Drill v1

- status: dry-run-evidence-current
- generatedAt: 2026-05-05T12:18:24.925Z
- branch: codex/managed-multi-agent-v1-foundation
- verifiedCommit: e295cea1f7c11c573b9d568c1b37a09fd546c659
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
| `npm run smoke:incident-slo-policy` | pass | 0 | 420 |
| `npm run smoke:identity-session-admin` | pass | 0 | 504 |
| `npm run smoke:tenant-storage-admin` | pass | 0 | 446 |
| `npm run smoke:customer-support-operations` | pass | 0 | 325 |
| `npm run smoke:support-escalation-review` | pass | 0 | 382 |
| `npm run smoke:secret-management` | pass | 0 | 413 |
| `npm run smoke:target-secret-manager` | pass | 0 | 490 |
| `npm run smoke:observability-telemetry` | pass | 0 | 568 |
| `npm run smoke:target-observability-operations` | pass | 0 | 571 |
| `npm run smoke:target-backup-operations` | pass | 0 | 576 |
| `npm run smoke:production-slo-operating` | pass | 0 | 544 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 2039 |
| `npm run smoke:production-enterprise-controls` | pass | 0 | 700 |
| `npm run smoke:production-provider-readiness` | pass | 0 | 587 |
| `npm run smoke:target-deployment-contract` | pass | 0 | 559 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 601 |
| `npm run smoke:production-retention-operating` | pass | 0 | 442 |
| `npm run smoke:clean-deployment-release` | pass | 0 | 553 |
| `npm run smoke:execution-v1-status` | pass | 0 | 1029 |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 513 |
| `npm run smoke:production-readiness-gate` | pass | 0 | 328 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 476 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 1904 |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 839 |
| `npm run smoke:backup-restore-drill` | pass | 0 | 782 |
| `npm run smoke:runtime-isolation` | pass | 0 | 3315 |

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

### npm run smoke:target-backup-operations

```json
{
    "controlCount": 6,
    "mode": "target-backup-operations",
    "productionReadyClaim": false,
    "recoveryPacketItemCount": 10
  }
```

### npm run smoke:production-slo-operating

```json
{
    "commandCount": 9,
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
    "commandCount": 9,
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
    "commandCount": 9,
    "mode": "production-retention-operating",
    "productionReadyClaim": false
  }
```

### npm run smoke:clean-deployment-release

```json
{
    "commandCount": 20,
    "mode": "clean-deployment-release",
    "productionReadyClaim": false
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
    "snapshotCommit": "e295cea1f7c11c573b9d568c1b37a09fd546c659"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": false,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "e295cea1f7c11c573b9d568c1b37a09fd546c659"
  }
```

### npm run smoke:production-readiness-gate

```json
{
    "blockedProductionReady": true,
    "label": "provider-scoped pilot ready for OpenAI-backed local-first path",
    "openaiLiveValidation": "passed",
    "pilotCleanDeploymentRelease": "present",
    "pilotIdentitySessionAdmin": "present",
    "pilotTenantStorageAdmin": "present",
    "pilotCustomerSupportOperations": "present",
    "pilotSupportEscalationReview": "present",
    "pilotSecretManagement": "present",
    "pilotTargetSecretManager": "present",
    "pilotObservabilityTelemetry": "present",
    "pilotTargetObservabilityOperations": "present",
    "pilotTargetBackupOperations": "present",
    "pilotProductionEnterpriseControls": "present",
    "pilotIncidentSloPolicy": "present",
    "pilotProductionProviderReadiness": "present",
    "pilotProductionRetentionOperating": "present",
    "pilotProductionSloOperating": "present",
    "pilotRetentionDeletePolicy": "present",
    "productionLikeReleaseDrill": "present",
    "productionBlockerCount": 10,
    "releaseArtifactHygiene": "passed",
    "releaseArtifactHygieneScannedFiles": 26
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 26,
    "secretFindingCount": 0,
    "verifiedCommit": "e295cea1f7c11c573b9d568c1b37a09fd546c659"
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
- target secret manager injection, rotation, access policy, break-glass, revocation, and audit evidence is not generated from a production-like environment
- target observability telemetry, alert delivery, on-call routing, retention, customer communication, and incident review evidence is not generated from a production-like environment
- target deployment contract is not satisfied by target-environment evidence
- target backup, retention, export, delete, and post-delete absence evidence is not generated from a production-like environment
- production SLO/SLA operating evidence is not generated from a production-like environment
- staffed customer support operations, support audit history, and incident review evidence are not generated from a production-like environment
- clean deployment release evidence is not generated from a production-like environment

## Operator Re-Run

```bash
npm run drill:production-like-release
npm run smoke:production-like-release-drill
```

## Acceptance Rule

The drill is acceptable only when every command in the matrix passes and artifact hygiene reports zero secret and machine-local path findings.

The drill must keep `productionReadyClaim: false` until production-like deployment evidence is generated from the approved target environment.
