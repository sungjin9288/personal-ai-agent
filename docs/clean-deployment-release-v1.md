# Clean Deployment Release Rehearsal v1

- status: clean-local-rehearsal-current
- generatedAt: 2026-05-04T14:37:18.744Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: f109cbab41f3ec9a6ee144dba11a07d0328eab4c
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- cleanCheckoutMode: tracked-files-only
- cleanCheckoutFileCount: 268
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
| `npm run smoke:incident-slo-policy` | pass | 0 | 243 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 270 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 1467 |
| `npm run smoke:production-readiness-gate` | pass | 0 | 193 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 190 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 449 |
| `npm run smoke:runtime-isolation` | pass | 0 | 1113 |
| `npm run smoke:pilot-export-package` | pass | 0 | 310 |

## Key Signals

### npm run smoke:incident-slo-policy

```json
{
    "mode": "incident-slo-policy",
    "severityCount": 4
  }
```

### npm run smoke:retention-delete-policy

```json
{
    "dataClassCount": 6,
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

### npm run smoke:production-readiness-gate

```json
{
    "blockedProductionReady": true,
    "openaiLiveValidation": "passed",
    "pilotCleanDeploymentRelease": "present",
    "pilotRetentionDeletePolicy": "present",
    "productionBlockerCount": 6,
    "releaseArtifactHygiene": "passed"
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 12,
    "secretFindingCount": 0,
    "verifiedCommit": "f109cbab41f3ec9a6ee144dba11a07d0328eab4c"
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

### npm run smoke:pilot-export-package

```json
{
    "fileCount": 21,
    "mode": "pilot-export-package",
    "verifiedCommit": "f109cbab41f3ec9a6ee144dba11a07d0328eab4c"
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
