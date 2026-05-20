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

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Hosted tenant isolation remains blocked until a replacement architecture decision is approved and target evidence is generated from the approved hosted or production-like environment for tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-aware authorization policy proof, service-to-service tenant propagation proof, storage partitioning proof, artifact/memory/search/export/index partitioning proof, per-tenant encryption and key ownership proof, key rotation/revocation/escrow/break-glass proof, backup creation/restore authorization/non-interference/post-restore denial proof, tenant administration approval/audit proof, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, tenant-scoped telemetry/support visibility/incident/status proof, retention/export/delete/provider transcript/legal hold/backup expiry/post-delete absence proof, migration plan, rollback, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence.

## Isolation Decision Areas

| Area | Required Hosted Decision Before Multi-Tenant Claim | Current Position | Status |
| --- | --- | --- | --- |
| Tenant identity source | tenant source owner, customer organization mapping, tenant lifecycle, trust policy, and source approval proof | local OIDC tenant claim can bind API access only inside pilot boundary | blocked |
| Authorization boundary | tenant-aware permission policy, service-to-service tenant propagation, stale permission denial, delegated admin boundary, and denial owner proof | local RBAC and OIDC tenant API smoke gates exist without hosted session administration | blocked |
| Storage partitioning | runtime state, artifact, memory, search, export, index, schema/bucket/keyspace, and migration safety proof | local tenant export/delete and storage admin gates are not hosted storage partition proof | blocked |
| Encryption and key ownership | per-tenant encryption model, key owner, rotation, revocation, escrow, break-glass, access audit, and key custody proof | target secret manager and backup gates define requirements but do not prove hosted keys | blocked |
| Backup and restore isolation | tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, and post-restore denial proof | local backup/restore drill proves only local runtime behavior | blocked |
| Tenant administration | tenant create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and admin owner proof | local tenant admin packet is documented without hosted control-plane workflow | blocked |
| Cross-tenant denial testing | negative test matrix proof for API, storage, memory, search, export, delete, backup, support, and observability paths | local OIDC tenant isolation smoke covers API workspace/mission boundary only | blocked |
| Observability and support isolation | tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, and support owner proof | local target observability/support gates are not hosted tenant-aware evidence | blocked |
| Data lifecycle isolation | per-tenant retention, export, delete, provider transcript handling, legal hold, backup expiry, post-delete absence, and lifecycle owner proof | local retention and target intake gates define requirements without target execution proof | blocked |

## Required Evidence Packet

Any future hosted tenant isolation approval must include:

- tenant identity source proof with tenant source owner, customer organization mapping, lifecycle owner, trust policy, and source approval
- tenant lifecycle proof for create, suspend, restore, delete, owner transfer, exception review, and orphan tenant review
- tenant-aware authorization policy, service-to-service tenant propagation, stale permission denial, delegated admin boundary, and denial owner proof
- storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema/bucket/keyspace boundary, and migration safety
- per-tenant encryption and key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision
- tenant-scoped backup creation, restore authorization, integrity result, other-tenant non-interference, and post-restore denial proof
- tenant administration workflow proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and tenant admin owner
- cross-tenant negative test matrix proof covering API, storage, memory, search, export, delete, backup, support, and observability surfaces
- tenant-scoped telemetry, support ticket visibility, incident review, customer status routing, evidence export, and support owner proof
- retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner evidence per tenant
- release artifact hygiene result and regenerated execution snapshot evidence from the approved hosted or production-like tenant boundary
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

This is a local hosted tenant isolation architecture contract. It does not approve hosted multi-tenancy, implement hosted tenant isolation, prove tenant identity source ownership, prove tenant-scoped authorization propagation, prove storage partitioning, prove per-tenant encryption/key ownership, prove tenant-scoped backup/restore, prove centralized tenant administration, prove cross-tenant denial across every tenant data surface, prove support/observability isolation, prove lifecycle isolation, or satisfy target environment production evidence.

Hosted multi-tenant isolation remains blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved hosted or production-like environment for tenant identity source proof with tenant source owner, customer organization mapping, lifecycle owner, trust policy, and source approval, tenant lifecycle proof with create, suspend, restore, delete, owner transfer, exception review, and orphan tenant review, tenant-aware authorization proof with policy, service-to-service tenant propagation, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema/bucket/keyspace boundary, and migration safety, per-tenant encryption and key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup/restore isolation proof with tenant-scoped backup creation, restore authorization, integrity result, other-tenant non-interference, and post-restore denial, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and tenant admin owner, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, and support owner, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner, migration plan, rollback, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence with `productionReadyClaim` still false until every mandatory production control passes.
