# Tenant Storage Administration v1

- status: local-tenant-storage-admin-current
- localDate: 2026-05-05
- scope: local tenant storage partitioning and tenant administration contract for self-hosted pilot
- productionReadyClaim: false
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This document defines the local tenant storage and administration evidence required before describing the pilot as tenant-aware.

It proves that tenant identity binding, storage partitioning, tenant admin operations, backup/restore isolation, encryption requirements, and cross-tenant denial rules are explicitly documented for the local pilot boundary.

It is not hosted tenant isolation evidence, not per-tenant encrypted storage proof, not centralized tenant administration, not shared SaaS control-plane evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves tenant identity, tenant-scoped authorization, storage partitioning, per-tenant encryption, backup/restore isolation, tenant administration workflow, and cross-tenant denial evidence.

## Tenant Storage Controls

| Control | Local Pilot Evidence | Target Production Evidence Required |
| --- | --- | --- |
| Tenant identity binding | OIDC tenant claim binds workspace and mission API access | approved tenant identity source and tenant lifecycle records |
| Storage partitioning | tenant export/delete smoke filters state and artifacts by tenant | separate tenant storage partition or equivalent isolation proof |
| Runtime boundary | one-runtime-per-customer isolation smoke proves root-level separation | hosted tenant storage boundary and shared control-plane isolation evidence |
| Backup/restore isolation | local restore drill keeps tenant delete isolation true after restore | encrypted backup partition, restore authorization, and post-restore tenant separation evidence |
| Tenant administration | tenant owner, admin action, export/delete reason, and review date are required | centralized tenant admin workflow with audit history |

## Tenant Admin Operations

| Operation | Required Local Evidence | Production Gap |
| --- | --- | --- |
| Tenant create | tenant identifier, workspace binding, owner, and runtime root boundary | hosted tenant provisioning and billing/control-plane record not captured |
| Tenant access change | tenant claim, role, workspace, mission scope, and approver | centralized tenant access administration not implemented |
| Tenant export | tenant-filtered export manifest and artifact list | customer-approved export workflow and target storage export proof not captured |
| Tenant delete | exact tenant confirmation token and post-delete absence check | target storage deletion, backup expiry, and provider transcript handling not captured |
| Tenant restore | clean restore evidence and unchanged other-tenant state | encrypted backup restore and tenant-scoped recovery authorization not captured |

## Audit Packet Requirements

Every tenant administration action must include:

- branch and commit
- release label and deployment boundary
- tenant identifier and tenant owner
- affected workspace, mission, runtime root, export, backup, or restore class
- admin operation and reason
- approval or confirmation token class
- verification command and pass/fail result
- artifact hygiene result
- rollback, restore, or deletion follow-up
- next review date

## Required Commands

```bash
npm run smoke:tenant-storage-admin
npm run smoke:web-tenant-isolation
npm run smoke:tenant-data-lifecycle
npm run smoke:runtime-isolation
npm run smoke:backup-restore-drill
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when tenant storage controls, tenant admin operations, audit packet requirements, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is local pilot tenant storage and administration evidence. It does not prove hosted tenant storage, per-tenant encryption, centralized tenant administration, shared SaaS control-plane isolation, encrypted backup partitioning, or production tenant lifecycle audit history.

Hosted tenant isolation remains blocked for production-ready claims until tenant storage, encryption, backup/restore isolation, tenant administration, and cross-tenant denial evidence are captured from the approved production-like or hosted target environment.
