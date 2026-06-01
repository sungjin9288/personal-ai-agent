# Target Secret Manager v1

- status: local-target-secret-manager-current
- localDate: 2026-05-05
- scope: target secret manager evidence contract for self-hosted pilot to production-like handoff
- productionReadyClaim: false
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManagerArchitecture: [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This document defines the evidence required before a target deployment can claim production-grade secret manager usage.

It proves that secret manager injection, access policy, rotation cadence, audit trail, break-glass, revocation, and leakage review requirements are explicitly documented before a production-like handoff.

It is not target secret manager evidence, not cloud KMS evidence, not production credential rotation proof, not break-glass approval history, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves secret manager injection, scoped access policy, rotation, audit trail, break-glass approval, revocation, and zero secret leakage in production logs and artifacts.

## Secret Manager Controls

| Control | Local Pilot Evidence | Target Production Evidence Required |
| --- | --- | --- |
| Secret injection | env variable names and placeholder commands are documented | provider credentials are injected from approved secret manager at runtime |
| Access policy | owner and admin role are documented by secret class | least-privilege access policy, reviewer, and service binding are captured |
| Rotation cadence | rotation and revocation checklist exists | rotation event, previous secret revocation, and downstream redeploy evidence are captured |
| Audit trail | release artifacts prove zero tracked secret findings | secret read/write audit log with actor, timestamp, action, and target secret class exists |
| Break-glass | emergency access material is classified without usable values | break-glass approval, expiry, revocation, and post-use review are captured |
| Leakage review | artifact hygiene blocks shareable release evidence on credential patterns | production logs, support packets, and release artifacts show zero secret leakage |

## Rotation Evidence Packet

Every target secret rotation or revocation must include:

- branch and commit
- release label and deployment boundary
- secret class and provider
- secret manager path or logical secret identifier without the value
- owner, approver, and reason
- rotation or revocation timestamp
- affected service, workspace, provider, or runtime class
- redeploy or reload command result
- artifact hygiene result
- rollback, break-glass, or follow-up review date

## Release Blocker Closure Linkage

| Blocker | Evidence Stop Condition | Architecture Stop Condition | Boundary Stop Condition | Closure Verifications | Required Proofs | Required Commands | Required Evidence Docs | Production Claim |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| target secret manager | target-secret-manager-evidence-missing | target-secret-manager-architecture-missing | target-secret-manager-boundary-missing-or-mismatched | 3 | 10 | 7 | 6 | blocked |

Target secret manager owns the target injection, scoped access policy, rotation and revocation packet, audit trail, break-glass governance, leakage review, rollback, and follow-up review evidence contract. Target secret manager architecture owns the approved platform and secret manager decision proof. Secret management owns the local redaction and artifact hygiene stop condition. Target provider operations and target clean deployment operations own provider credential injection and clean deployment secret injection integration proof. Target deployment contract and target environment evidence intake own the same-boundary secret manager evidence verification. Keep `productionReadyClaim: false` until linked closure verifications have target secret manager evidence packet proof, target secret manager architecture approval proof, secret injection proof, least-privilege access policy proof, rotation and revocation proof, secret access audit proof, break-glass governance proof, leakage review proof, credential containment proof, release artifact hygiene result, production readiness gate result, and regenerated execution-v1 snapshot evidence from the same approved production-like or hosted target secret manager boundary.

## Break-Glass Rules

- define one owner and one approver before emergency access is used
- record the reason, affected secret class, expected expiry, and revocation deadline
- never copy usable secret values into docs, tickets, support updates, artifacts, screenshots, or chat
- rerun artifact hygiene and production readiness gate after break-glass use
- close the review only after access is revoked or rotated and residual risk is recorded

## Required Commands

```bash
npm run smoke:target-secret-manager
npm run smoke:target-secret-manager-architecture
npm run smoke:secret-management
npm run smoke:release-artifact-hygiene
npm run smoke:production-readiness-gate
```

## Acceptance Rule

This gate is acceptable only when secret manager controls, rotation evidence packet, break-glass rules, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is a local target secret manager evidence contract. It does not prove that a target secret manager exists, that production provider credentials are injected from it, that rotation has occurred, that access policy is enforced, or that break-glass audit history exists.

Target secret manager readiness remains blocked for production-ready claims until secret manager injection, access policy, rotation, audit, break-glass, revocation, and leakage review evidence are captured from the approved production-like or hosted target environment.
