# Hosted Identity Session Architecture v1

- status: local-hosted-identity-session-architecture-current
- localDate: 2026-05-06
- decision: do-not-claim-hosted-identity-backed-rbac-without-approved-target-evidence
- scope: hosted identity-backed RBAC, session administration, and permission lifecycle architecture contract
- productionReadyClaim: false
- hostedIdentitySessionApproved: false
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTargetIdentitySessionOperations: [target-identity-session-operations-v1.md](target-identity-session-operations-v1.md)
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the hosted identity/session architecture decision and evidence requirements that must be satisfied before describing the system as hosted identity-backed, enterprise RBAC-ready, or session-administered for another company.

It is not hosted identity implementation, not customer SSO production evidence, not proof of persistent role administration, not logout or revocation evidence, not a hosted control-plane approval, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Hosted identity-backed RBAC and session administration remain blocked until a replacement architecture decision is approved and target evidence is generated from the approved hosted or production-like environment.

## Identity Decision Areas

| Area | Required Hosted Decision Before Identity Claim | Current Position | Status |
| --- | --- | --- | --- |
| Customer identity provider | customer IdP ownership, metadata onboarding, issuer/audience policy, JWKS rotation, and emergency IdP fallback | local OIDC/JWKS validation smoke exists only for pilot boundary | blocked |
| User lifecycle | user provisioning, deprovisioning, invitation, suspension, tenant/org mapping, and account recovery | no hosted persistent user directory is approved in v1 | blocked |
| Session lifecycle | login, expiry, refresh, logout, revocation, idle timeout, device/session inventory, and re-auth policy | local token validation rejects invalid/expired JWTs without hosted session state | blocked |
| Role administration | persistent role assignment, role revocation, delegated admin, separation of duties, and approval workflow | local RBAC can enforce request roles but does not provide central role admin | blocked |
| Permission propagation | service-to-service subject propagation, tenant role propagation, cache invalidation, and stale permission denial | local API checks do not prove distributed hosted permission propagation | blocked |
| Audit and evidence | actor, subject, tenant, role, session, reason, timestamp, before/after state, and immutable audit export | local release artifacts document gate status without hosted identity audit log | blocked |
| Break-glass access | emergency access owner, approval, scope, expiry, monitoring, customer notification, and post-use review | no hosted break-glass identity procedure is approved | blocked |
| Support impersonation | support access boundary, customer approval, session scoping, action logging, and denial rules | support operation gates define requirements without hosted identity implementation | blocked |
| Compliance and retention | identity log retention, legal hold, audit export, privacy deletion, and customer evidence handoff | target retention/support gates define requirements without target execution proof | blocked |

## Required Evidence Packet

Any future hosted identity/session approval must include:

- customer IdP onboarding, metadata ownership, issuer/audience policy, and JWKS rotation evidence
- user lifecycle state machine for provision, invite, suspend, recover, and deprovision
- tenant organization mapping and identity subject normalization rules
- login, refresh, expiry, logout, revocation, idle timeout, and re-auth proof
- persistent role assignment, delegated admin, revocation, and separation-of-duties workflow
- permission propagation and cache invalidation proof across API, worker, agent, support, and observability surfaces
- immutable audit log with actor, subject, tenant, role, session, reason, before/after state, and timestamp
- break-glass access approval, expiry, monitoring, customer notification, and incident review evidence
- support impersonation approval, scoped session, action log, customer-safe update, and denial test evidence
- identity audit retention, export, legal hold, privacy deletion, and customer handoff evidence
- migration plan from local shared-secret/OIDC pilot mode to hosted identity control plane
- explicit rollback, lockout recovery, and customer access containment plan

## Required Commands

```bash
npm run smoke:hosted-identity-session-architecture
npm run smoke:hosted-saas-architecture-decision
npm run smoke:identity-session-admin
npm run smoke:target-identity-session-operations
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the hosted identity decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `hostedIdentitySessionApproved: false`.

## Production Gap

This is a local hosted identity/session architecture contract. It does not approve hosted identity-backed RBAC, implement customer SSO, prove persistent role administration, prove session logout/revocation, prove break-glass access, prove support impersonation controls, or satisfy target environment production evidence.

Hosted identity-backed RBAC and session administration remain blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved hosted or production-like environment, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
