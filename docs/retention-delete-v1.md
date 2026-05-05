# Retention And Delete Policy v1

- status: pilot-policy-evidence-current
- localDate: 2026-05-04
- scope: self-hosted local-first pilot retention, export, and delete procedure
- productionReadyClaim: false
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)

## Policy Position

This policy defines the pilot retention, export, and delete boundary for a self-hosted local-first deployment.

It is sufficient to run a controlled pilot lifecycle check, but it is not production deletion evidence. Production readiness still requires the approved target deployment to prove tenant-scoped retention configuration, provider transcript deletion handling, customer-approved export packaging, backup expiry, and post-delete absence checks.

## Data Class Retention

| Data Class | Examples | Pilot Retention Period | Delete Trigger | Evidence |
| --- | --- | --- | --- | --- |
| Local runtime state under `var/` | workspaces, missions, sessions, memory, approvals, provider status | pilot duration, then delete after export approval | pilot admin approves cleanup and confirmation token matches | `npm run smoke:runtime-data-lifecycle` |
| Tenant-scoped runtime records | tenant-bound workspaces, missions, sessions, memory, and artifacts | pilot duration, then delete after tenant export approval | tenant admin approves cleanup and tenant confirmation token matches | `npm run smoke:tenant-data-lifecycle` |
| Local runtime backup manifest | manifest-backed copy of `var/` state and mission artifacts | retained only for local restore rehearsal, then deleted with temp workspace | restore drill or backup integrity check completes | `npm run smoke:backup-restore-drill` |
| Isolated customer runtime root | one pilot root per customer or company | pilot duration, never shared between unrelated customers | customer pilot ends or cross-customer mixing is suspected | `npm run smoke:runtime-isolation` |
| Immutable release snapshots | `docs/releases/execution-v1/**`, evidence, closeout, handoff, snapshot metadata | retained for release review while the release decision remains current | scrub and regenerate when hygiene fails or release claim changes | `npm run smoke:release-artifact-hygiene` |
| Pilot export package manifest | repository-relative package file list, byte counts, sha256 digests, bundle digest | retained with release evidence for handoff audit | regenerate when package membership, evidence, or snapshot changes | `npm run package:pilot-export` |
| Provider transcript and raw provider payload | live provider request/response payloads, API error bodies, provider logs | raw provider secrets and transcripts are not persisted in tracked release artifacts | rotate/scrub immediately if a secret-bearing payload is captured | `npm run smoke:release-artifact-hygiene` |
| Visual and browser evidence artifacts | selected screenshots, browser reports, visual manifest references | retained only when hygiene-safe and selected for handoff | delete unshared local artifacts after export approval | `npm run smoke:pilot-export-package` |

## Export Checklist

- confirm the pilot owner approved external handoff
- regenerate or reuse current execution-v1 evidence intentionally
- run `npm run package:pilot-export`
- run `npm run smoke:pilot-export-package`
- run `npm run smoke:release-artifact-hygiene`
- verify every exported path is repository-relative
- verify every exported file has a sha256 digest
- verify the package keeps `productionReadyClaim: false`
- exclude raw provider payloads, local provider logs, shell history, and unshared temp/browser artifacts
- record any excluded artifact as accepted risk only when the pilot owner approves it

## Delete Checklist

- confirm the pilot admin approved cleanup
- confirm a shareable export package exists when handoff is required
- run `npm run smoke:runtime-data-lifecycle`
- run `npm run smoke:tenant-data-lifecycle` when a shared runtime root contains tenant-bound records
- run `npm run smoke:backup-restore-drill`
- run `npm run smoke:runtime-isolation`
- delete only the approved pilot runtime root or `var/` state root
- require the deterministic confirmation token before destructive runtime deletion
- verify post-delete absence for the deleted runtime state
- verify post-delete absence for the deleted tenant state when tenant-scoped deletion is used
- verify another tenant's state remains unchanged when tenant-scoped deletion is in scope
- verify another customer runtime root remains unchanged when isolation is in scope
- keep final approved evidence, closeout, handoff, snapshot, incident records, and accepted risk records
- do not delete evidence needed to explain a live validation failure before the pilot owner signs off

## Required Commands

```bash
npm run smoke:retention-delete-policy
npm run smoke:runtime-data-lifecycle
npm run smoke:tenant-data-lifecycle
npm run smoke:backup-restore-drill
npm run smoke:target-backup-operations
npm run smoke:runtime-isolation
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
```

## Stop Conditions

- stop export if any required file is missing from the package manifest
- stop export if artifact hygiene finds a credential or machine-local path
- stop deletion if the confirmation token does not match the selected runtime root
- stop tenant deletion if the tenant confirmation token does not match the selected tenant id and runtime root
- stop deletion if the operator cannot identify which customer or company owns the runtime root
- stop production-ready claims until production deletion evidence is generated from the target deployment model

## Production Gap

This policy is a pilot lifecycle policy. [production-retention-operating-v1.md](production-retention-operating-v1.md) records the current local operating rehearsal for the same retention, export, tenant-scoped delete, package, and hygiene gates, but it does not prove hosted tenant retention, centralized data subject request handling, provider-side transcript deletion, backup expiry, or production environment post-delete absence.

Production-ready remains blocked until retention, export, and delete verification is repeated in the approved production-like deployment with customer-approved data classes, retention windows, provider transcript handling, target backup operations, backup/restore boundaries, and deletion evidence.
