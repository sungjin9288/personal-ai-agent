# Target Clean Deployment Operations v1

- status: local-target-clean-deployment-operations-current
- localDate: 2026-05-06
- scope: target clean deployment source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, and evidence retention contract
- productionReadyClaim: false
- relatedTargetCleanDeploymentArchitecture: [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This document defines the evidence required before a target deployment can claim clean deployment operation, artifact provenance, dependency reproducibility, runtime bootstrap, target secret injection, rollback readiness, or release approval readiness.

It proves that target clean deployment operating evidence requirements are explicitly documented before a hosted or production-like handoff.

It is not target clean deployment architecture approval, not target deployment execution, not artifact registry proof, not dependency install proof, not target secret injection proof, not target rollback proof, not release approval proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves source provenance, artifact registry immutability, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery execution, release approval, and evidence retention.

## Clean Deployment Operation Controls

| Control | Local Pilot Evidence | Target Production Evidence Required |
| --- | --- | --- |
| Source provenance | current branch, commit, push status, and immutable snapshot are recorded locally | approved branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval are captured |
| Artifact registry | pilot export package records repository-relative files and sha256 values | immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof are captured |
| Dependency installation | clean rehearsal runs from tracked files without local dependency folders | lockfile source, install command, cache policy, vulnerability scan, reproducibility record, and install owner are captured |
| Runtime bootstrap | local UI and CLI smoke gates verify runtime behavior | process manager, runtime root, health endpoint, startup log, bootstrap owner, restart policy, and service readiness proof are captured |
| Secret injection | local secret manager gates define secret classes and rotation packets | target secret manager alias, injection path, rotation state, redaction check, break-glass owner, and access audit are captured |
| Environment boundary | target environment intake defines required boundary proof | target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner are captured |
| Migration and data readiness | local backup/data lifecycle gates prove dry-run behavior | migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result are captured |
| Smoke and health verification | local clean release and production-like drill command matrices pass | health check, auth check, provider check, tenant isolation check, artifact hygiene check, release readiness, and target deployment contract results are captured |
| Rollback and recovery | target architecture defines rollback decisions | rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision are captured |
| Release approval | release readiness remains pilot-only | change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner are captured |

## Clean Deployment Evidence Packet

Every target clean deployment operations review must include:

- branch and commit
- release label and deployment boundary
- source provenance proof with approved branch, commit, review owner, build actor, release tag, and tamper-control decision
- artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof
- dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner
- runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner
- secret injection proof with target secret manager alias, injection path, rotation state, redaction check, break-glass owner, and access audit
- environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner
- migration and data readiness proof with migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result
- smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results
- rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision
- release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner
- artifact hygiene and production readiness gate result
- residual risk, decision owner, next review date, and failed-deployment containment plan

## Clean Deployment Operation Rules

- define release owner, build owner, artifact owner, dependency owner, runtime owner, secret owner, migration owner, rollback owner, release approver, and evidence owner before a target deployment is presented as clean-deployment-ready
- never treat tracked-files-only local clean rehearsal or manifest-only pilot export package as target clean deployment evidence
- record clean deployment events with actor, environment, artifact id, commit, command, result, timestamp, rollback state, customer communication state, and residual risk
- deny target clean deployment claims when source provenance, artifact registry, dependency install, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health, rollback, or release approval evidence is missing
- rerun target clean deployment operations, target clean deployment architecture, clean deployment rehearsal, production-like release drill, pilot export package, target environment evidence intake, production readiness gate, and artifact hygiene after clean deployment evidence is attached

## Required Commands

```bash
npm run smoke:target-clean-deployment-operations
npm run smoke:target-clean-deployment-architecture
npm run rehearsal:clean-deployment-release
npm run smoke:clean-deployment-release
npm run drill:production-like-release
npm run smoke:production-like-release-drill
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:target-secret-manager
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when clean deployment operation controls, clean deployment evidence packet, clean deployment operation rules, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is a local target clean deployment operations evidence contract. It does not approve target clean deployment architecture, execute target deployment, prove artifact registry immutability, prove dependency reproducibility, prove runtime bootstrap, prove target secret injection, prove target rollback, approve release change control, or satisfy target environment production evidence.

Target clean deployment operations remain blocked for production-ready claims until source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, evidence retention, and failed-deployment containment evidence are captured from the approved production-like or hosted target environment.
