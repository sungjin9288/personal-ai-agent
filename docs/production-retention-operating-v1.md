# Production Retention Operating Rehearsal v1

- status: local-retention-operating-current
- generatedAt: 2026-05-06T03:53:06.078Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: f54954ddc720552192a7ba2b1c43a71f908d117a
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local production-like retention, export, delete, tenant-scoped lifecycle, target data lifecycle architecture, target retention operations, backup/restore, target backup operations, and isolation rehearsal
- productionReadyClaim: false
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This rehearsal proves that pilot retention, export, delete, tenant-scoped export/delete, target data lifecycle architecture, target retention operations, local backup/restore, target backup operations, runtime isolation, pilot package, and artifact hygiene checks can be replayed together locally.

It is not hosted production retention evidence, not a customer data subject request workflow, not provider transcript deletion proof, not backup expiry evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment provides tenant-scoped retention configuration, customer-approved data classes, export approval, delete workflow, provider transcript handling, backup schedule, encrypted storage, key ownership, restore boundaries, backup expiry/deletion, and post-delete absence evidence.

## Command Matrix

| Command | Result | Exit Code | Duration Ms | Local Target | Within Target |
| --- | --- | ---: | ---: | --- | --- |
| `npm run smoke:retention-delete-policy` | pass | 0 | 247 | 5s | yes |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 708 | 10s | yes |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 255 | 10s | yes |
| `npm run smoke:backup-restore-drill` | pass | 0 | 243 | 10s | yes |
| `npm run smoke:target-data-lifecycle-architecture` | pass | 0 | 185 | 5s | yes |
| `npm run smoke:target-retention-operations` | pass | 0 | 171 | 10s | yes |
| `npm run smoke:target-backup-operations` | pass | 0 | 172 | 10s | yes |
| `npm run smoke:runtime-isolation` | pass | 0 | 668 | 10s | yes |
| `npm run package:pilot-export` | pass | 0 | 190 | 5s | yes |
| `npm run smoke:pilot-export-package` | pass | 0 | 177 | 5s | yes |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 191 | 5s | yes |

## Key Signals

### npm run smoke:retention-delete-policy

```json
{
    "dataClassCount": 8,
    "mode": "retention-delete-policy",
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
    "verifiedCommit": "f54954ddc720552192a7ba2b1c43a71f908d117a"
  }
```

### npm run smoke:pilot-export-package

```json
{
    "fileCount": 45,
    "mode": "pilot-export-package",
    "verifiedCommit": "f54954ddc720552192a7ba2b1c43a71f908d117a"
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 36,
    "secretFindingCount": 0,
    "verifiedCommit": "f54954ddc720552192a7ba2b1c43a71f908d117a"
  }
```

## Operating Interpretation

- retention/delete policy remains the source of pilot data classes, export checklist, delete checklist, stop conditions, and production gap
- runtime lifecycle remains the gate for inventory, export manifest, confirmation-token deletion, and post-delete absence
- tenant data lifecycle remains the gate for tenant-scoped export manifests, exact tenant delete confirmation, post-delete absence, and unchanged data for another tenant in the same runtime root
- target data lifecycle architecture remains the gate for customer data classes, retention enforcement, export boundary, delete workflow, provider transcript handling, post-delete absence, backup architecture, restore isolation, key ownership, and disaster recovery decisions
- target retention operations remains the gate for data class approval, target retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, and audit evidence requirements
- backup restore drill remains the gate for local backup manifest digests, clean restore enforcement, restored state hash matching, and post-restore tenant delete isolation
- target backup operations remains the gate for backup schedule, encrypted storage, key ownership, restore validation, tenant isolation, backup expiry/deletion, and disaster recovery evidence requirements
- runtime isolation remains the gate for one-runtime-per-customer separation during export and delete
- pilot export package remains the gate for repository-relative paths, sha256 digests, and immutable snapshot inclusion
- release artifact hygiene remains the gate for shareable evidence safety

## Operator Re-Run

```bash
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
```

## Acceptance Rule

The rehearsal is acceptable only when every command passes, every command remains within its local rehearsal target, tenant-scoped export/delete does not include or modify another tenant, target retention operations requirements, backup restore integrity, and target backup operations requirements remain verified, and artifact hygiene reports zero credential and machine-local path findings.

The rehearsal must keep `productionReadyClaim: false` until the same retention, export, delete, and absence evidence is generated from the approved production-like or production target environment.
