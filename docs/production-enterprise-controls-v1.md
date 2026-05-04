# Production Enterprise Controls Rehearsal v1

- status: local-enterprise-controls-current
- generatedAt: 2026-05-04T16:26:50.470Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: b3954bc02e7c3bdfb01bc3ddff631df44aac206e
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local auth, RBAC, artifact hygiene, runtime isolation, and provider-readiness controls rehearsal
- productionReadyClaim: false
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)

## Decision Boundary

This rehearsal proves that local shared-secret API authentication, local RBAC enforcement, release artifact hygiene, one-runtime-per-customer isolation, and provider-readiness blockers can be checked together before a pilot handoff.

It is not identity-backed hosted RBAC, not hosted tenant isolation, not centralized permission administration, not customer identity lifecycle evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment provides identity provider integration, session lifecycle management, persistent role assignment, centralized tenant administration, tenant isolation, and audited permission changes.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
| `npm run smoke:web-auth-rbac` | pass | 0 | 1381 |
| `npm run smoke:web-rbac` | pass | 0 | 1519 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 166 |
| `npm run smoke:runtime-isolation` | pass | 0 | 626 |
| `npm run smoke:production-provider-readiness` | pass | 0 | 172 |

## Key Signals

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

### npm run smoke:web-rbac

```json
{
    "mode": "web-rbac",
    "roleChecks": {
      "adminOnlySnapshotBlockedForOperator": true,
      "approverResolvedApproval": true,
      "operatorMissionCreated": true,
      "viewerMutationBlocked": true
    }
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 15,
    "secretFindingCount": 0,
    "verifiedCommit": "613d8a375099eba74ac7d26790049131a8c4abf2"
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

### npm run smoke:production-provider-readiness

```json
{
    "mode": "production-provider-readiness",
    "productionReadyClaim": false,
    "providerCount": 4
  }
```

## Operating Interpretation

- shared-secret web auth is only a local pilot access gate, not enterprise identity
- RBAC enforcement proves route-level role boundaries locally, not centralized permission lifecycle management
- artifact hygiene proves shareable release artifacts avoid credential and machine-local path leaks
- runtime isolation proves one-runtime-per-customer pilot separation, not hosted multi-tenant isolation
- provider readiness proves missing provider blockers remain explicit before expanding the release label

## Operator Re-Run

```bash
npm run rehearsal:production-enterprise-controls
npm run smoke:production-enterprise-controls
```

## Acceptance Rule

The rehearsal is acceptable only when every command passes, artifact hygiene reports zero credential and machine-local path findings, and local auth/RBAC boundaries remain explicit.

The rehearsal must keep `productionReadyClaim: false` until the same controls are backed by an approved identity provider, audited hosted role administration, tenant isolation, and production-like deployment evidence.
