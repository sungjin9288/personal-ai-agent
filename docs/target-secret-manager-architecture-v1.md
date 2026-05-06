# Target Secret Manager Architecture v1

- status: local-target-secret-manager-architecture-current
- localDate: 2026-05-06
- decision: do-not-claim-target-secret-manager-readiness-without-approved-target-evidence
- scope: target secret manager architecture decision and evidence contract
- productionReadyClaim: false
- targetSecretManagerApproved: false
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the target secret manager architecture decision and evidence requirements that must be satisfied before describing the system as production-grade for secret injection, rotation, break-glass, revocation, or audit.

It is not target secret manager implementation, not cloud KMS evidence, not production credential rotation proof, not break-glass approval history, not target deployment approval, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Target secret manager readiness remains blocked until a replacement architecture decision is approved and target evidence is generated from the approved production-like or hosted environment.

## Secret Manager Decision Areas

| Area | Required Target Decision Before Secret Manager Claim | Current Position | Status |
| --- | --- | --- | --- |
| Secret manager platform | approved provider, region, tenancy boundary, owner, fallback, and operational responsibility | local env injection policy exists only for pilot boundary | blocked |
| Secret classes and ownership | provider keys, web auth tokens, OIDC material, break-glass material, runtime credentials, and owner mapping | local secret classes are documented without target ownership evidence | blocked |
| Injection path | runtime boot, worker, UI, live validation, clean deployment, and rollback injection model | placeholder env commands exist without target secret manager injection proof | blocked |
| Access policy | least-privilege readers/writers, service binding, admin delegation, reviewer, and deny-by-default rules | local admin/operator role descriptions are not target IAM policy evidence | blocked |
| Rotation and revocation | rotation cadence, revocation trigger, previous secret invalidation, redeploy/reload, and rollback proof | local rotation checklist exists without target rotation execution proof | blocked |
| Audit and monitoring | read/write audit log, anomaly alert, break-glass alert, access review, and customer evidence export | release artifact hygiene proves only local artifact cleanliness | blocked |
| Break-glass process | emergency owner, approver, scope, expiry, revocation, monitoring, and post-use review | local break-glass rules are documented without target approval history | blocked |
| Leakage controls | logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors are scanned | release artifact hygiene does not prove target log/support leakage absence | blocked |
| Disaster recovery | secret backup, restore, key recovery, region outage, credential rollback, and compromised-secret recovery | target backup gates define requirements without secret manager recovery proof | blocked |

## Required Evidence Packet

Any future target secret manager approval must include:

- approved secret manager platform, region, tenancy boundary, owner, and fallback decision
- secret class inventory with provider, environment, owner, rotation cadence, and allowed consumers
- runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths
- least-privilege access policy with reader, writer, admin, reviewer, service binding, and deny-by-default evidence
- rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result
- audit log evidence for secret read, write, rotate, revoke, break-glass, and failed access attempts
- break-glass approval, expiry, monitoring, customer notification, revocation, and post-use review evidence
- leakage review across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors
- disaster recovery evidence for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment
- migration plan from local environment injection to target secret manager injection
- explicit rollback, lockout recovery, and credential containment plan

## Required Commands

```bash
npm run smoke:target-secret-manager-architecture
npm run smoke:target-secret-manager
npm run smoke:secret-management
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the target secret manager decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `targetSecretManagerApproved: false`.

## Production Gap

This is a local target secret manager architecture contract. It does not approve target secret manager readiness, implement secret manager injection, prove rotation, prove access policy, prove audit monitoring, prove break-glass governance, prove leakage absence in target logs, or satisfy target environment production evidence.

Target secret manager readiness remains blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved production-like or hosted environment, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
