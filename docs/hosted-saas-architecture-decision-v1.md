# Hosted SaaS Architecture Decision v1

- status: local-hosted-saas-architecture-decision-current
- localDate: 2026-05-06
- decision: do-not-implement-hosted-saas-in-v1-without-new-approved-architecture-record
- scope: hosted multi-tenant SaaS and hybrid control-plane architecture decision contract
- productionReadyClaim: false
- hostedSaasApproved: false
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the architecture decision contract required before implementing hosted multi-tenant SaaS or a hybrid control plane.

It is not hosted SaaS implementation, not production tenant isolation evidence, not billing readiness proof, not a customer deployment approval, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Hosted SaaS and hybrid control-plane claims remain blocked until this decision is replaced by an approved architecture record and target evidence is generated.

## Architecture Decision

| Area | Required Decision Before Hosted SaaS | Current Position | Status |
| --- | --- | --- | --- |
| Tenant model | tenant identity source, org/user model, tenant isolation boundary, and tenant administration owner | local tenant claim and runtime isolation gates exist only for pilot boundary; hosted tenant isolation architecture remains unapproved | blocked |
| Control plane | hosted control plane ownership, agent registration, job dispatch, policy distribution, and remote execution boundary | no hosted control plane is approved in v1 | blocked |
| Identity and authorization | customer IdP integration, session administration, role lifecycle, audit trail, and emergency access are designed | local OIDC/JWKS and RBAC gates exist only as pilot controls | blocked |
| Storage and encryption | hosted storage partitioning, per-tenant encryption/key ownership, backup isolation, restore isolation, and data residency are designed | local tenant storage and backup gates are not hosted storage evidence | blocked |
| Provider and secret management | tenant-scoped provider configuration, secret manager integration, quota guard, fallback policy, and account ownership are designed | target provider intake and secret manager gates are local evidence contracts | blocked |
| Billing and entitlement | customer billing, usage metering, entitlement enforcement, plan limits, suspension, and audit are designed | billing is explicitly out of v1 scope | blocked |
| Observability and support | tenant-aware telemetry, alert routing, status communication, support ticketing, incident review, and on-call coverage are designed | local observability and support gates are not staffed hosted operations evidence | blocked |
| Data lifecycle | retention, export, delete, provider transcript policy, backup expiry, legal hold, and post-delete absence are designed for hosted tenants | local retention/export/delete gates are not hosted lifecycle proof | blocked |
| Deployment and compliance | deployment topology, CI/CD, rollback, artifact hygiene, vulnerability management, audit retention, and compliance owner are designed | clean local release rehearsal is not hosted deployment proof | blocked |

## Required Architecture Packet

Any future hosted SaaS or hybrid control-plane proposal must include:

- decision owner and approving authority
- tenant model and explicit trust boundaries
- control plane versus customer runtime responsibility split
- identity provider, session lifecycle, role lifecycle, and audit model
- hosted storage, encryption, backup, restore, and data residency model
- provider credential ownership, secret manager paths, quota/cost guard, and fallback policy
- billing, entitlement, metering, suspension, and customer account lifecycle
- observability, alert routing, support ownership, incident review, and customer status communication
- retention, export, delete, provider transcript, legal hold, backup expiry, and post-delete absence policy
- deployment, rollback, vulnerability management, artifact hygiene, and compliance evidence requirements
- migration plan from self-hosted/local-first pilot to hosted or hybrid mode
- explicit non-goals and stop conditions

## Required Commands

```bash
npm run smoke:hosted-saas-architecture-decision
npm run smoke:hosted-tenant-isolation-architecture
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Production Gap

This is a local architecture decision contract. It does not approve hosted SaaS, implement a hosted control plane, prove tenant isolation, prove billing readiness, prove hosted storage/encryption, prove staffed hosted support, or satisfy target environment production evidence.

Hosted SaaS and hybrid control-plane readiness remain blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved hosted or hybrid environment, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
