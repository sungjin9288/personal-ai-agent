# Target Deployment Contract v1

- status: target-contract-current
- localDate: 2026-05-05
- scope: production-target evidence contract for hosted or production-like deployment claims
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedTargetRetentionOperations: [target-retention-operations-v1.md](target-retention-operations-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)

## Decision Boundary

This contract defines what must be proven before the system can be described as production-ready for another company or as hosted SaaS.

It is not hosted production evidence, not a completed SaaS architecture decision, not a billing or account readiness proof, and not permission to claim `production-ready`.

The current release remains OpenAI-scoped pilot-ready only. Production-ready remains blocked until every mandatory control below has evidence from the approved target deployment.

## Target Deployment Profiles

| Profile | Current Status | Required Decision Before Use |
| --- | --- | --- |
| Self-hosted local-first pilot | supported for OpenAI-scoped pilot | pilot owner approves isolated runtime root, provider env injection, and export boundary |
| Production-like single-tenant deployment | not yet proven | target environment, secret manager, backup, telemetry, retention, and clean release evidence must be captured |
| Hosted multi-tenant SaaS | out of v1 scope | separate architecture decision record covering tenant model, billing, identity, storage, encryption, backup, and support operations |
| Hybrid control plane | out of v1 scope | separate architecture decision record covering agent registration, remote job dispatch, fleet observability, and policy distribution |

## Mandatory Controls

| Control | Required Production Evidence | Current Local Evidence | Current Status |
| --- | --- | --- | --- |
| Target provider validation | every provider in the production claim has provider account approval, target secret injection, target-boundary live validation, quota/cost guard, model/endpoint pinning, and fallback evidence | OpenAI live evidence is archived; Anthropic/local/Hermes blockers are explicit; target provider evidence intake contract is present | blocked |
| Identity-backed RBAC and session administration | persistent users, sessions, role assignment, token rotation, logout/revocation, and audit trail are proven | local identity session administration, shared-secret, OIDC/JWKS, and RBAC gates pass | blocked |
| Hosted tenant isolation | tenant identity, authorization, storage partitioning, tenant admin, per-tenant encryption, backup/restore isolation, and cross-tenant denial are proven | local tenant storage administration, OIDC tenant API isolation, tenant lifecycle, and runtime isolation gates pass | blocked |
| Secret management | provider credentials are injected through target secret manager and never appear in logs or artifacts | local secret management, target secret manager contract, and release artifact hygiene pass | blocked |
| Retention, export, delete | customer-approved retention classes, export package, delete request workflow, provider transcript policy, backup expiry, and post-delete absence are proven | local retention, tenant lifecycle, target retention operations, backup/restore drill, and target backup operations gates pass | blocked |
| SLO/SLA operations | target telemetry, alerting, staffed on-call, incident trail, and customer SLO/SLA review are proven | local SLO operating, observability telemetry, and target observability operations gates pass | blocked |
| Clean deployment release | the target package is deployed from a clean environment with dependency, secret, runtime, and rollback evidence | tracked-files-only clean rehearsal passes locally | blocked |
| Customer support operations | escalation route, support owner, incident communications, customer handoff process, audit history, and incident review cadence are proven | pilot runbook, incident policy, and local support operations, support escalation review, and target support operations gates pass | blocked |

## Required Commands

```bash
npm run smoke:target-deployment-contract
npm run smoke:production-readiness-gate
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
npm run smoke:production-enterprise-controls
npm run smoke:identity-session-admin
npm run smoke:tenant-storage-admin
npm run smoke:production-retention-operating
npm run smoke:backup-restore-drill
npm run smoke:target-retention-operations
npm run smoke:target-backup-operations
npm run smoke:customer-support-operations
npm run smoke:support-escalation-review
npm run smoke:target-support-operations
npm run smoke:secret-management
npm run smoke:target-secret-manager
npm run smoke:observability-telemetry
npm run smoke:target-observability-operations
npm run smoke:production-slo-operating
npm run smoke:clean-deployment-release
```

## Blocking Rules

- stop production-ready claims if any provider included in the production claim lacks provider account approval, target secret injection, target-boundary live validation, quota/cost guard, model/endpoint pinning, and fallback evidence
- stop hosted SaaS claims until a separate SaaS architecture decision record exists and is approved
- stop multi-tenant claims until tenant storage, encryption, backup, restore, and tenant administration evidence exist
- stop enterprise RBAC claims until identity-backed user/session lifecycle and persistent role administration are implemented and tested
- stop secret management claims until target secret manager injection, rotation, access policy, audit trail, break-glass, and revocation evidence are captured
- stop retention/delete claims until target retention configuration, export approval, delete workflow, provider transcript handling, target backup execution, encrypted storage, backup expiry, and post-delete absence evidence are captured
- stop observability claims until target observability telemetry, alert delivery, log/trace retention, staffed on-call route, customer status communication, and incident review evidence are captured
- stop SLO/SLA claims until target telemetry, alerting, on-call, and incident response evidence exist
- stop customer support claims until staffed ownership, support queue routing, customer communication route, ticket audit history, on-call handoff, and incident review cadence are proven in the target environment
- stop external handoff if artifact hygiene finds credentials or machine-local paths

## Operator Handoff

The operator can use this contract as the production readiness checklist when a company asks whether the system is ready for broader deployment.

If every required control has target deployment evidence, regenerate execution evidence, closeout, handoff, snapshot, pilot export package, and production operating rehearsals before changing the release label.

Until then, the only allowed claim is OpenAI-scoped self-hosted/local-first pilot readiness.
