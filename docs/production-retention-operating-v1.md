# Production Retention Operating Rehearsal v1

- status: local-retention-operating-current
- generatedAt: 2026-05-04T15:03:22.738Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: 27a5b7146b069d674a9a062fb854de03840f1380
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local production-like retention, export, delete, and isolation rehearsal
- productionReadyClaim: false
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This rehearsal proves that pilot retention, export, delete, runtime isolation, pilot package, and artifact hygiene checks can be replayed together locally.

It is not hosted production retention evidence, not a customer data subject request workflow, not provider transcript deletion proof, not backup expiry evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment provides tenant-scoped retention configuration, customer-approved data classes, provider transcript handling, backup and restore boundaries, and post-delete absence evidence.

## Command Matrix

| Command | Result | Exit Code | Duration Ms | Local Target | Within Target |
| --- | --- | ---: | ---: | --- | --- |
| `npm run smoke:retention-delete-policy` | pass | 0 | 119 | 5s | yes |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 286 | 10s | yes |
| `npm run smoke:runtime-isolation` | pass | 0 | 457 | 10s | yes |
| `npm run package:pilot-export` | pass | 0 | 120 | 5s | yes |
| `npm run smoke:pilot-export-package` | pass | 0 | 111 | 5s | yes |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 110 | 5s | yes |

## Key Signals

### npm run smoke:retention-delete-policy

```json
{
    "dataClassCount": 6,
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
    "fileCount": 22,
    "hygiene": "passed",
    "mode": "pilot-export-package",
    "ok": true,
    "verifiedCommit": "27a5b7146b069d674a9a062fb854de03840f1380"
  }
```

### npm run smoke:pilot-export-package

```json
{
    "fileCount": 22,
    "mode": "pilot-export-package",
    "verifiedCommit": "27a5b7146b069d674a9a062fb854de03840f1380"
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 13,
    "secretFindingCount": 0,
    "verifiedCommit": "27a5b7146b069d674a9a062fb854de03840f1380"
  }
```

## Operating Interpretation

- retention/delete policy remains the source of pilot data classes, export checklist, delete checklist, stop conditions, and production gap
- runtime lifecycle remains the gate for inventory, export manifest, confirmation-token deletion, and post-delete absence
- runtime isolation remains the gate for one-runtime-per-customer separation during export and delete
- pilot export package remains the gate for repository-relative paths, sha256 digests, and immutable snapshot inclusion
- release artifact hygiene remains the gate for shareable evidence safety

## Operator Re-Run

```bash
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
```

## Acceptance Rule

The rehearsal is acceptable only when every command passes, every command remains within its local rehearsal target, and artifact hygiene reports zero credential and machine-local path findings.

The rehearsal must keep `productionReadyClaim: false` until the same retention, export, delete, and absence evidence is generated from the approved production-like or production target environment.
