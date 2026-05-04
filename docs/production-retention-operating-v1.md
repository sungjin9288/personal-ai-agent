# Production Retention Operating Rehearsal v1

- status: local-retention-operating-current
- generatedAt: 2026-05-04T18:05:33.229Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: e869f5ce51783274308000027067bc224a085a85
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local production-like retention, export, delete, tenant-scoped lifecycle, and isolation rehearsal
- productionReadyClaim: false
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This rehearsal proves that pilot retention, export, delete, tenant-scoped export/delete, runtime isolation, pilot package, and artifact hygiene checks can be replayed together locally.

It is not hosted production retention evidence, not a customer data subject request workflow, not provider transcript deletion proof, not backup expiry evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment provides tenant-scoped retention configuration, customer-approved data classes, provider transcript handling, backup and restore boundaries, and post-delete absence evidence.

## Command Matrix

| Command | Result | Exit Code | Duration Ms | Local Target | Within Target |
| --- | --- | ---: | ---: | --- | --- |
| `npm run smoke:retention-delete-policy` | pass | 0 | 269 | 5s | yes |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 871 | 10s | yes |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 376 | 10s | yes |
| `npm run smoke:runtime-isolation` | pass | 0 | 1310 | 10s | yes |
| `npm run package:pilot-export` | pass | 0 | 297 | 5s | yes |
| `npm run smoke:pilot-export-package` | pass | 0 | 305 | 5s | yes |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 300 | 5s | yes |

## Key Signals

### npm run smoke:retention-delete-policy

```json
{
    "dataClassCount": 7,
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
    "fileCount": 24,
    "hygiene": "passed",
    "mode": "pilot-export-package",
    "ok": true,
    "verifiedCommit": "254aa024b0371f3af2d7f9f29e98f5a1ae720f97"
  }
```

### npm run smoke:pilot-export-package

```json
{
    "fileCount": 24,
    "mode": "pilot-export-package",
    "verifiedCommit": "254aa024b0371f3af2d7f9f29e98f5a1ae720f97"
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 15,
    "secretFindingCount": 0,
    "verifiedCommit": "254aa024b0371f3af2d7f9f29e98f5a1ae720f97"
  }
```

## Operating Interpretation

- retention/delete policy remains the source of pilot data classes, export checklist, delete checklist, stop conditions, and production gap
- runtime lifecycle remains the gate for inventory, export manifest, confirmation-token deletion, and post-delete absence
- tenant data lifecycle remains the gate for tenant-scoped export manifests, exact tenant delete confirmation, post-delete absence, and unchanged data for another tenant in the same runtime root
- runtime isolation remains the gate for one-runtime-per-customer separation during export and delete
- pilot export package remains the gate for repository-relative paths, sha256 digests, and immutable snapshot inclusion
- release artifact hygiene remains the gate for shareable evidence safety

## Operator Re-Run

```bash
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
```

## Acceptance Rule

The rehearsal is acceptable only when every command passes, every command remains within its local rehearsal target, tenant-scoped export/delete does not include or modify another tenant, and artifact hygiene reports zero credential and machine-local path findings.

The rehearsal must keep `productionReadyClaim: false` until the same retention, export, delete, and absence evidence is generated from the approved production-like or production target environment.
