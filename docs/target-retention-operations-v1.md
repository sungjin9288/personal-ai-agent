# Target Retention Operations v1

- status: local-target-retention-operations-current
- localDate: 2026-05-05
- scope: target retention, export, delete, provider transcript handling, post-delete absence, and audit evidence contract
- productionReadyClaim: false
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This document defines the evidence required before a target deployment can claim production-grade retention, export, delete, provider transcript, and post-delete absence operations.

It proves that data classes, retention policy enforcement, export packaging, delete workflow, provider transcript handling, post-delete absence, and audit trail requirements are explicitly documented before a production-like handoff.

It is not target retention evidence, not customer data subject request proof, not provider transcript deletion proof, not target post-delete absence proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves tenant-scoped retention configuration, customer-approved data classes, export package approval, delete request workflow, provider transcript handling, post-delete absence, and audit history.

## Retention Operation Controls

| Control | Local Pilot Evidence | Target Production Evidence Required |
| --- | --- | --- |
| Customer-approved data classes | local retention/delete policy defines pilot data classes | customer-approved data classes, retention window, legal basis, and owner are captured |
| Retention configuration | local policy and operating rehearsal can be replayed | target retention configuration, enforcement timestamp, exception policy, and audit record are captured |
| Export package approval | local pilot export package produces repository-relative manifest | customer-approved export request, export package hash, reviewer, and delivery boundary are captured |
| Delete workflow | local runtime and tenant delete flows require exact confirmation tokens | target delete request id, authorization, execution timestamp, and owner approval are captured |
| Provider transcript handling | local policy forbids raw provider transcript persistence in tracked artifacts | provider-side transcript retention, deletion or non-retention proof, and exception review are captured |
| Post-delete absence | local runtime and tenant lifecycle checks verify absence after delete | target post-delete absence checks across runtime, storage, backup, provider, and handoff package boundaries are captured |

## Retention Evidence Packet

Every target retention operations review must include:

- branch and commit
- release label and deployment boundary
- customer-approved data class matrix
- target retention configuration and enforcement timestamp
- export request id, package hash, reviewer, and delivery boundary
- delete request id, authorization owner, execution timestamp, and result
- provider transcript retention or deletion handling evidence
- post-delete absence checks across runtime, storage, backup, provider, and package boundaries
- artifact hygiene and production readiness gate result
- residual risk, exception owner, next review date, and customer handoff decision

## Data Lifecycle Rules

- define data class owner, retention owner, export approver, delete approver, and evidence owner before target deployment is presented as production-like
- record customer-approved data classes, retention windows, export package hashes, delete request ids, and post-delete absence results for every target lifecycle review
- never include raw secrets, customer private data, provider transcript secrets, machine-local paths, or unredacted runtime state in retention evidence packets
- rerun artifact hygiene, target retention operations, target backup operations, production retention operating, and production readiness gates after lifecycle evidence is attached
- close retention/delete incidents only after provider transcript handling, backup expiry impact, post-delete absence, residual risk, and next review date are recorded

## Required Commands

```bash
npm run smoke:target-retention-operations
npm run smoke:target-data-lifecycle-architecture
npm run smoke:retention-delete-policy
npm run smoke:tenant-data-lifecycle
npm run smoke:target-backup-operations
npm run smoke:production-retention-operating
npm run smoke:release-artifact-hygiene
npm run smoke:production-readiness-gate
```

## Acceptance Rule

This gate is acceptable only when retention operation controls, retention evidence packet, data lifecycle rules, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is a local target retention operations evidence contract. It does not prove that target retention settings are enforced, that customer export requests are approved, that target delete requests are executed, that provider transcripts are deleted or non-retained, or that post-delete absence exists in the target environment.

Target retention operations remain blocked for production-ready claims until customer-approved data classes, target retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, and audit evidence are captured from the approved production-like or hosted target environment.
