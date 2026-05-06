# Hosted Tenant Isolation Architecture v1

- status: local-hosted-tenant-isolation-architecture-current
- localDate: 2026-05-06
- decision: do-not-claim-hosted-multi-tenant-isolation-without-approved-target-evidence
- scope: hosted tenant isolation architecture decision and evidence contract
- productionReadyClaim: false
- hostedTenantIsolationApproved: false
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedTargetTenantIsolationOperations: [target-tenant-isolation-operations-v1.md](target-tenant-isolation-operations-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the hosted tenant isolation decision and evidence requirements that must be satisfied before describing the system as hosted multi-tenant or tenant-isolated for another company.

It is not hosted tenant isolation implementation, not production tenant evidence, not proof of per-tenant encryption, not backup or restore isolation evidence, not a hosted control-plane approval, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Hosted tenant isolation remains blocked until a replacement architecture decision is approved and target evidence is generated from the approved hosted or production-like environment.

## Isolation Decision Areas

| Area | Required Hosted Decision Before Multi-Tenant Claim | Current Position | Status |
| --- | --- | --- | --- |
| Tenant identity source | customer tenant id source, organization/user mapping, tenant lifecycle, and IdP trust model | local OIDC tenant claim can bind API access only inside pilot boundary | blocked |
| Authorization boundary | tenant-aware permission model, service-to-service tenant propagation, admin impersonation rules, and denial semantics | local RBAC and OIDC tenant API smoke gates exist without hosted session administration | blocked |
| Storage partitioning | tenant database/schema/bucket/keyspace boundary, artifact partitioning, index partitioning, and migration safety | local tenant export/delete and storage admin gates are not hosted storage partition proof | blocked |
| Encryption and key ownership | per-tenant encryption model, key ownership, rotation, revocation, escrow, and break-glass policy | target secret manager and backup gates define requirements but do not prove hosted keys | blocked |
| Backup and restore isolation | tenant-scoped backup selection, restore authorization, other-tenant non-interference, and post-restore denial checks | local backup/restore drill proves only local runtime behavior | blocked |
| Tenant administration | tenant create, suspend, restore, delete, role delegation, audit packet, and customer approval workflow | local tenant admin packet is documented without hosted control-plane workflow | blocked |
| Cross-tenant denial testing | negative test matrix for API, storage, search, export, delete, backup, support, and observability paths | local OIDC tenant isolation smoke covers API workspace/mission boundary only | blocked |
| Observability and support isolation | tenant-scoped logs, traces, alerts, support ticket visibility, incident review, and customer status routing | local target observability/support gates are not hosted tenant-aware evidence | blocked |
| Data lifecycle isolation | retention class, export, delete, provider transcript handling, legal hold, backup expiry, and post-delete absence per tenant | local retention and target intake gates define requirements without target execution proof | blocked |

## Required Evidence Packet

Any future hosted tenant isolation approval must include:

- tenant identity source and customer organization mapping
- tenant lifecycle state machine and ownership model
- tenant-aware authorization policy and service propagation rules
- storage partitioning proof for runtime state, artifacts, memory, search, and exports
- per-tenant encryption, key rotation, revocation, and break-glass evidence
- tenant-scoped backup creation, restore authorization, and post-restore denial proof
- tenant administration workflow with audit history and customer approval trail
- cross-tenant negative test matrix covering API, storage, export, delete, backup, support, and observability surfaces
- tenant-scoped telemetry, support ticket, incident review, and customer status communication proof
- retention, export, delete, provider transcript, legal hold, backup expiry, and post-delete absence evidence per tenant
- migration plan from self-hosted/local-first runtime roots to hosted tenant partitions
- explicit rollback and tenant data containment plan

## Required Commands

```bash
npm run smoke:hosted-tenant-isolation-architecture
npm run smoke:hosted-saas-architecture-decision
npm run smoke:tenant-storage-admin
npm run smoke:target-tenant-isolation-operations
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the hosted tenant isolation decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `hostedTenantIsolationApproved: false`.

## Production Gap

This is a local hosted tenant isolation architecture contract. It does not approve hosted multi-tenancy, implement hosted tenant isolation, prove per-tenant encryption, prove tenant-scoped backup/restore, prove centralized tenant administration, prove support/observability isolation, or satisfy target environment production evidence.

Hosted multi-tenant isolation remains blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved hosted or production-like environment, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
