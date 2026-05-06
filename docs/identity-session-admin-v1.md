# Identity Session Administration v1

- status: local-identity-session-admin-current
- localDate: 2026-05-05
- scope: local identity-backed session administration and role lifecycle contract for self-hosted pilot
- productionReadyClaim: false
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedHostedIdentitySessionArchitecture: [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This document defines the local identity/session administration evidence required before describing the pilot as having controlled identity-backed access.

It proves that identity provider binding, session lifecycle, role assignment, token revocation, logout, and audit packet requirements are explicitly documented for the local pilot boundary.

It is not hosted identity evidence, not persistent user directory proof, not centralized permission administration, not customer SSO production evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves persistent user lifecycle management, customer identity provider integration, session administration, role assignment workflow, logout/revocation behavior, and audited permission changes.

## Identity Controls

| Control | Local Pilot Evidence | Target Production Evidence Required |
| --- | --- | --- |
| OIDC/JWKS bearer validation | issuer, audience, RS256 signature, expiry, and role claim smoke pass | approved customer IdP metadata, key rotation, and token validation evidence |
| Role claim mapping | viewer token cannot escalate through spoofed role headers | persistent role assignment workflow with audit trail |
| Shared-secret fallback | local shared-secret auth remains documented as pilot-only | disabled or replaced by target identity provider policy |
| Session boundary | token expiry and missing/invalid token rejection are documented | logout, revocation, idle timeout, session expiry, and re-auth evidence |
| Permission audit | release artifacts record gates and changed evidence status | admin audit log with actor, subject, role, timestamp, and reason |

## Session Lifecycle

| Event | Required Local Evidence | Production Gap |
| --- | --- | --- |
| Login | valid bearer token or approved local auth token is required | target IdP login proof is not captured |
| Expiry | expired or invalid token is rejected | production session expiry and refresh behavior is not captured |
| Logout | operator stop condition requires token/session invalidation before handoff changes | hosted logout endpoint and session invalidation are not implemented |
| Revocation | role/token revocation checklist exists before support handoff | target revocation propagation and audit evidence are not captured |
| Role change | role claims are treated as identity-derived, not header-derived | persistent role administration workflow is not implemented |

## Audit Packet Requirements

Every identity/session administration change must include:

- branch and commit
- release label and deployment boundary
- identity mode and token source
- affected subject, role, tenant, workspace, or mission class
- role assignment or revocation reason
- verification command and pass/fail result
- artifact hygiene result
- owner and approval record
- rollback or revocation step
- next review date

## Required Commands

```bash
npm run smoke:identity-session-admin
npm run smoke:hosted-identity-session-architecture
npm run smoke:web-auth-rbac
npm run smoke:web-oidc-rbac
npm run smoke:web-tenant-isolation
npm run smoke:production-enterprise-controls
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when identity controls, session lifecycle, audit packet requirements, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is local pilot identity/session administration evidence. It does not prove hosted identity provider integration, customer SSO readiness, persistent user directory lifecycle, central role administration, production logout/revocation behavior, or audited permission history from a target deployment.

Identity-backed RBAC and session administration remain blocked for production-ready claims until identity lifecycle and permission audit evidence are captured from the approved production-like or hosted target environment.
