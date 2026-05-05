# Backup Restore Drill v1

- status: local-backup-restore-current
- localDate: 2026-05-05
- scope: local runtime backup, restore, and tenant-isolated recovery rehearsal
- productionReadyClaim: false
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This drill proves that local runtime `var/` state can be copied into a manifest-backed backup, restored into a clean runtime root, and verified by sha256 state and file digests.

It is not hosted backup evidence, not cloud storage durability proof, not disaster recovery proof, not customer production restore evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until backup, restore, expiry, encryption, access control, and post-restore validation evidence are captured from the approved target deployment.

## Verified Local Contract

`npm run smoke:backup-restore-drill` verifies:

- backup manifest contains repository/runtime-relative `var/` paths only
- backup manifest carries sha256 digests for every backed-up file
- restore refuses a non-clean runtime `var/` directory
- restore recreates runtime state with the same state sha256 as the source runtime
- tenant A and tenant B state hashes survive restore
- deleting tenant A after restore does not modify tenant B state or the backup source
- a second restore from the same backup can still recover tenant A
- backup manifest content does not contain credential-like strings or machine-local paths

## Required Commands

```bash
npm run smoke:backup-restore-drill
npm run smoke:production-retention-operating
npm run smoke:target-deployment-contract
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The local drill is acceptable only when backup file count equals restore file count, restored state sha256 equals source state sha256, tenant delete isolation remains true after restore, and release artifact hygiene remains clean.

The drill must keep `productionReadyClaim: false` until equivalent backup and restore evidence is generated from the approved production-like or production target environment.

## Production Gap

Hosted production still requires:

- encrypted backup storage and key ownership evidence
- tenant-scoped backup partitioning and restore authorization evidence
- backup retention and expiry evidence
- restore rehearsal from the target deployment backup store
- post-restore absence checks for deleted tenant data
- audit trail for backup access, restore approval, and restore completion
