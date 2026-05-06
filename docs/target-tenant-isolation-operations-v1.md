# Target Tenant Isolation Operations v1

- status: local-target-tenant-isolation-operations-current
- localDate: 2026-05-06
- scope: target tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, and lifecycle evidence contract
- productionReadyClaim: false
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This document defines the evidence required before a target deployment can claim hosted multi-tenant isolation, tenant-scoped storage, per-tenant encryption, backup/restore isolation, tenant administration, or cross-tenant denial protection for another company.

It proves that target tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, and tenant lifecycle evidence requirements are explicitly documented before a hosted or production-like handoff.

It is not hosted tenant architecture approval, not target tenant isolation evidence, not hosted multi-tenant production proof, not per-tenant encryption proof, not tenant-scoped backup proof, not centralized tenant administration proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves tenant identity source, tenant-scoped authorization, storage partitioning, per-tenant encryption/key ownership, tenant-scoped backup/restore, tenant administration workflow, cross-tenant denial, support/observability isolation, and lifecycle retention/export/delete evidence.

## Tenant Isolation Controls

| Control | Local Pilot Evidence | Target Production Evidence Required |
| --- | --- | --- |
| Tenant identity source | OIDC tenant claim binds API workspace and mission access | customer tenant source, organization mapping, tenant lifecycle owner, and trust policy are captured |
| Authorization boundary | local RBAC and tenant API smoke reject cross-tenant mission access | tenant-aware permission policy, service propagation, stale permission denial, and admin delegation evidence are captured |
| Storage partitioning | tenant export/delete smoke filters local runtime state by tenant | runtime state, artifacts, memory, search, exports, and indexes are partitioned by tenant with migration proof |
| Encryption and key ownership | target secret manager and backup gates define key requirements | per-tenant encryption model, key owner, rotation, revocation, escrow, and break-glass evidence are captured |
| Backup/restore isolation | local restore drill preserves tenant delete isolation | tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, and post-restore denial are captured |
| Tenant administration | local tenant admin packet documents owner/action/review fields | tenant create, suspend, restore, delete, role delegation, approval workflow, and audit history are captured |
| Cross-tenant denial testing | local OIDC tenant isolation covers API workspace/mission boundary | negative tests across API, storage, memory, search, export, delete, backup, support, and observability are captured |
| Observability/support isolation | target observability/support gates define non-tenant-specific requirements | tenant-scoped logs, traces, alerts, support ticket visibility, incident review, and customer status routing are captured |
| Lifecycle isolation | retention/delete and target lifecycle gates define requirements | per-tenant retention, export, delete, provider transcript handling, legal hold, backup expiry, and post-delete absence are captured |

## Tenant Evidence Packet

Every target tenant isolation operations review must include:

- branch and commit
- release label and deployment boundary
- tenant identity source, customer organization mapping, tenant lifecycle owner, and trust policy
- tenant-aware authorization policy, service-to-service tenant propagation, stale permission denial, and delegated admin boundaries
- storage partitioning evidence for runtime state, artifacts, memory, search, exports, indexes, and migration safety
- per-tenant encryption, key ownership, rotation, revocation, escrow, break-glass, and access audit evidence
- tenant-scoped backup creation, restore authorization, integrity proof, other-tenant non-interference, and post-restore denial evidence
- tenant administration evidence for create, suspend, restore, delete, role delegation, customer approval, and audit history
- cross-tenant negative test matrix for API, storage, memory, search, export, delete, backup, support, and observability surfaces
- tenant-scoped observability, support ticket visibility, incident review, customer status routing, and evidence export proof
- retention, export, delete, provider transcript, legal hold, backup expiry, and post-delete absence evidence per tenant
- artifact hygiene and production readiness gate result
- residual risk, decision owner, next review date, and tenant data containment plan

## Tenant Isolation Rules

- define tenant identity owner, storage owner, encryption/key owner, backup owner, tenant admin owner, observability/support isolation owner, and evidence owner before a target deployment is presented as hosted tenant-isolated
- never treat local OIDC tenant API smoke or one-runtime-per-customer isolation as hosted tenant storage, encryption, backup, or control-plane proof
- record every tenant administration action with actor, tenant, affected workspace/runtime/export/backup class, reason, approval, before/after state, timestamp, and rollback route
- deny hosted multi-tenant isolation claims when storage partitioning, per-tenant encryption, backup/restore isolation, cross-tenant denial, or support/observability isolation evidence is missing
- rerun target tenant isolation operations, hosted tenant isolation architecture, target environment evidence intake, production readiness gate, and artifact hygiene after tenant evidence is attached

## Required Commands

```bash
npm run smoke:target-tenant-isolation-operations
npm run smoke:hosted-tenant-isolation-architecture
npm run smoke:tenant-storage-admin
npm run smoke:web-tenant-isolation
npm run smoke:tenant-data-lifecycle
npm run smoke:runtime-isolation
npm run smoke:backup-restore-drill
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when tenant isolation controls, tenant evidence packet, tenant isolation rules, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is a local target tenant isolation operations evidence contract. It does not approve hosted tenant architecture, prove hosted multi-tenant operation, prove per-tenant encryption, prove tenant-scoped backup/restore, prove centralized tenant administration, prove support/observability isolation, or satisfy target environment production evidence.

Target tenant isolation operations remain blocked for production-ready claims until tenant identity, tenant-scoped authorization, storage partitioning, per-tenant encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant data containment evidence are captured from the approved production-like or hosted target environment.
