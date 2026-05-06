# Target Clean Deployment Architecture v1

- status: local-target-clean-deployment-architecture-current
- localDate: 2026-05-06
- decision: do-not-claim-target-clean-deployment-readiness-without-approved-target-evidence
- scope: target clean deployment, artifact provenance, dependency, runtime, secret, rollback, and release approval architecture decision contract
- productionReadyClaim: false
- targetCleanDeploymentApproved: false
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedTargetCleanDeploymentOperations: [target-clean-deployment-operations-v1.md](target-clean-deployment-operations-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the target clean deployment architecture decision and evidence requirements that must be satisfied before describing the system as production-grade for clean checkout release, dependency installation, runtime bootstrap, secret injection, deployment provenance, rollback, or release approval.

It is not target deployment execution, not hosted environment proof, not artifact registry evidence, not dependency lock verification proof, not target secret injection proof, not rollback execution proof, not release approval proof, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Target clean deployment readiness remains blocked until a replacement architecture decision is approved and target evidence is generated from the approved production-like or hosted environment.

## Clean Deployment Decision Areas

| Area | Required Target Decision Before Clean Deployment Claim | Current Position | Status |
| --- | --- | --- | --- |
| Source provenance | approved branch, signed commit or equivalent control, build actor, review owner, and release tag policy | local git commit and push evidence exist without target provenance proof | blocked |
| Artifact registry | package registry, immutable artifact id, sha256, retention, access owner, and promotion rule | pilot export package is manifest-only without target artifact registry proof | blocked |
| Dependency installation | dependency lock source, install command, cache policy, vulnerability scan owner, and reproducibility proof | clean rehearsal runs tracked files without target dependency install evidence | blocked |
| Runtime bootstrap | deployment profile, runtime root, process manager, health endpoint, startup owner, and bootstrap log retention | local UI/runtime checks exist without target bootstrap proof | blocked |
| Secret injection | target secret manager alias, injection path, rotation state, redaction proof, and break-glass owner | local secret gates pass without target secret injection proof | blocked |
| Environment boundary | target environment name, network boundary, storage boundary, tenant profile, and operator access policy | target environment intake defines requirements without target boundary proof | blocked |
| Migration and data readiness | migration command, data seed/import policy, backup precheck, rollback point, and data owner approval | local backup/data lifecycle checks exist without target migration proof | blocked |
| Smoke and health verification | health check, auth check, provider check, tenant isolation check, artifact hygiene check, and evidence owner | local smoke matrix passes without target environment execution proof | blocked |
| Rollback and recovery | rollback artifact, rollback command, recovery time target, owner, validation command, and residual risk decision | local clean rehearsal does not execute target rollback | blocked |
| Release approval | change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner | release readiness remains pilot-only without target release approval | blocked |

## Required Evidence Packet

Any future target clean deployment approval must include:

- source provenance proof with branch, commit, review owner, build actor, release tag, and tamper-control decision
- artifact registry proof with immutable artifact id, sha256, registry path, retention policy, access owner, and promotion rule
- dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, and owner
- runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, and bootstrap owner
- secret injection proof with target secret manager alias, injection path, rotation state, redaction check, break-glass owner, and access audit
- environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner
- migration and data readiness proof with migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result
- smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results
- rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision
- release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner
- migration plan from tracked-files-only local clean rehearsal to approved target clean deployment workflow
- explicit containment plan for dependency drift, failed bootstrap, failed secret injection, rollback failure, and misleading release approval

## Required Commands

```bash
npm run smoke:target-clean-deployment-architecture
npm run smoke:target-clean-deployment-operations
npm run rehearsal:clean-deployment-release
npm run smoke:clean-deployment-release
npm run drill:production-like-release
npm run smoke:production-like-release-drill
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the target clean deployment decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `targetCleanDeploymentApproved: false`.

## Production Gap

This is a local target clean deployment architecture contract. It does not approve target clean deployment readiness, execute a target deployment, prove artifact registry immutability, prove dependency reproducibility, prove target secret injection, prove target rollback, approve release change control, or satisfy target environment production evidence.

Target clean deployment readiness remains blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved production-like or hosted environment, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
