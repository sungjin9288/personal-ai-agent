# Production-Like Release Drill v1

- status: dry-run-evidence-current
- generatedAt: 2026-05-06T07:36:52.298Z
- branch: codex/managed-multi-agent-v1-foundation
- verifiedCommit: 2f0405a6a1716ce3ab2aea815d4dbb492b1dc4df
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local deterministic production-like release drill
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
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
| `npm run smoke:incident-slo-policy` | pass | 0 | 453 |
| `npm run smoke:identity-session-admin` | pass | 0 | 342 |
| `npm run smoke:hosted-identity-session-architecture` | pass | 0 | 934 |
| `npm run smoke:tenant-storage-admin` | pass | 0 | 419 |
| `npm run smoke:hosted-tenant-isolation-architecture` | pass | 0 | 402 |
| `npm run smoke:customer-support-operations` | pass | 0 | 353 |
| `npm run smoke:support-escalation-review` | pass | 0 | 407 |
| `npm run smoke:target-support-architecture` | pass | 0 | 345 |
| `npm run smoke:target-support-operations` | pass | 0 | 542 |
| `npm run smoke:secret-management` | pass | 0 | 409 |
| `npm run smoke:target-secret-manager-architecture` | pass | 0 | 373 |
| `npm run smoke:target-secret-manager` | pass | 0 | 522 |
| `npm run smoke:observability-telemetry` | pass | 0 | 590 |
| `npm run smoke:target-observability-architecture` | pass | 0 | 612 |
| `npm run smoke:target-observability-operations` | pass | 0 | 481 |
| `npm run smoke:target-slo-architecture` | pass | 0 | 460 |
| `npm run smoke:target-data-lifecycle-architecture` | pass | 0 | 308 |
| `npm run smoke:target-clean-deployment-architecture` | pass | 0 | 278 |
| `npm run smoke:target-retention-operations` | pass | 0 | 431 |
| `npm run smoke:target-backup-operations` | pass | 0 | 876 |
| `npm run smoke:production-slo-operating` | pass | 0 | 515 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 2190 |
| `npm run smoke:production-enterprise-controls` | pass | 0 | 526 |
| `npm run smoke:production-provider-readiness` | pass | 0 | 864 |
| `npm run smoke:target-local-provider-architecture` | pass | 0 | 385 |
| `npm run smoke:target-hermes-provider-architecture` | pass | 0 | 432 |
| `npm run smoke:target-deployment-contract` | pass | 0 | 360 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 316 |
| `npm run smoke:production-retention-operating` | pass | 0 | 256 |
| `npm run smoke:clean-deployment-release` | pass | 0 | 265 |
| `npm run smoke:execution-v1-status` | pass | 0 | 1146 |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 563 |
| `npm run smoke:production-readiness-gate` | pass | 0 | 437 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 398 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 671 |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 268 |
| `npm run smoke:backup-restore-drill` | pass | 0 | 570 |
| `npm run smoke:runtime-isolation` | pass | 0 | 1703 |

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

### npm run smoke:hosted-identity-session-architecture

```json
{
    "areaCount": 9,
    "hostedIdentitySessionApproved": false,
    "mode": "hosted-identity-session-architecture",
    "productionReadyClaim": false
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

### npm run smoke:hosted-tenant-isolation-architecture

```json
{
    "areaCount": 9,
    "hostedTenantIsolationApproved": false,
    "mode": "hosted-tenant-isolation-architecture",
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

### npm run smoke:target-support-architecture

```json
{
    "areaCount": 10,
    "mode": "target-support-architecture",
    "productionReadyClaim": false,
    "targetSupportApproved": false
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

### npm run smoke:target-secret-manager-architecture

```json
{
    "areaCount": 9,
    "mode": "target-secret-manager-architecture",
    "productionReadyClaim": false,
    "targetSecretManagerApproved": false
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

### npm run smoke:target-clean-deployment-architecture

```json
{
    "areaCount": 10,
    "mode": "target-clean-deployment-architecture",
    "productionReadyClaim": false,
    "targetCleanDeploymentApproved": false
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

### npm run smoke:production-slo-operating

```json
{
    "commandCount": 13,
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

### npm run smoke:target-local-provider-architecture

```json
{
    "areaCount": 10,
    "mode": "target-local-provider-architecture",
    "productionReadyClaim": false,
    "targetLocalProviderApproved": false
  }
```

### npm run smoke:target-hermes-provider-architecture

```json
{
    "areaCount": 10,
    "mode": "target-hermes-provider-architecture",
    "productionReadyClaim": false,
    "targetHermesProviderApproved": false
  }
```

### npm run smoke:target-deployment-contract

```json
{
    "controlCount": 20,
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
    "commandCount": 11,
    "mode": "production-retention-operating",
    "productionReadyClaim": false
  }
```

### npm run smoke:clean-deployment-release

```json
{
    "commandCount": 29,
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
    "snapshotCommit": "c36025b279d46e82e8bfc175e639e4bedf3edb00"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": true,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "c36025b279d46e82e8bfc175e639e4bedf3edb00"
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
    "pilotTargetSupportOperations": "present",
    "pilotSecretManagement": "present",
    "pilotTargetSecretManager": "present",
    "pilotObservabilityTelemetry": "present",
    "pilotTargetObservabilityArchitecture": "present",
    "pilotTargetObservabilityOperations": "present",
    "pilotTargetDataLifecycleArchitecture": "present",
    "pilotTargetRetentionOperations": "present",
    "pilotTargetBackupOperations": "present",
    "pilotProductionEnterpriseControls": "present",
    "pilotIncidentSloPolicy": "present",
    "pilotProductionProviderReadiness": "present",
    "pilotProductionRetentionOperating": "present",
    "pilotProductionSloOperating": "present",
    "pilotRetentionDeletePolicy": "present",
    "productionLikeReleaseDrill": "present",
    "productionBlockerCount": 17,
    "releaseArtifactHygiene": "passed",
    "releaseArtifactHygieneScannedFiles": 41
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 41,
    "secretFindingCount": 0,
    "verifiedCommit": "c36025b279d46e82e8bfc175e639e4bedf3edb00"
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
- target local provider architecture is not approved and local provider live validation evidence is not generated from a production-like environment
- target Hermes provider architecture is not approved and Hermes live validation evidence is not generated from a production-like environment
- hosted identity session architecture is not approved and target identity/session evidence is not generated
- hosted tenant isolation architecture is not approved and target tenant isolation evidence is not generated
- target secret manager architecture is not approved and target secret manager evidence is not generated from a production-like environment
- target observability architecture is not approved and target observability evidence is not generated from a production-like environment
- target observability telemetry, alert delivery, on-call routing, retention, customer communication, and incident review evidence is not generated from a production-like environment
- target deployment contract is not satisfied by target-environment evidence
- target SLO architecture is not approved and target SLO/SLA evidence is not generated from a production-like environment
- target data lifecycle architecture is not approved and target data lifecycle evidence is not generated from a production-like environment
- target retention, export, delete, provider transcript handling, target backup, and post-delete absence evidence is not generated from a production-like environment
- production SLO/SLA operating evidence is not generated from a production-like environment
- target support architecture is not approved and target support evidence is not generated from a production-like environment
- target support operations, staffed coverage, support audit history, on-call handoff, and incident review evidence are not generated from a production-like environment
- target clean deployment architecture is not approved and target clean deployment evidence is not generated from a production-like environment
- clean deployment release evidence is not generated from a production-like environment

## Operator Re-Run

```bash
npm run drill:production-like-release
npm run smoke:production-like-release-drill
```

## Acceptance Rule

The drill is acceptable only when every command in the matrix passes and artifact hygiene reports zero secret and machine-local path findings.

The drill must keep `productionReadyClaim: false` until production-like deployment evidence is generated from the approved target environment.
