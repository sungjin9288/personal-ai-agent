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
- relatedTargetProviderOperations: [target-provider-operations-v1.md](target-provider-operations-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedHostedIdentitySessionArchitecture: [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md)
- relatedTargetIdentitySessionOperations: [target-identity-session-operations-v1.md](target-identity-session-operations-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedTargetTenantIsolationOperations: [target-tenant-isolation-operations-v1.md](target-tenant-isolation-operations-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedTargetSupportArchitecture: [target-support-architecture-v1.md](target-support-architecture-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManagerArchitecture: [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetObservabilityArchitecture: [target-observability-architecture-v1.md](target-observability-architecture-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedTargetSloOperations: [target-slo-operations-v1.md](target-slo-operations-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedTargetRetentionOperations: [target-retention-operations-v1.md](target-retention-operations-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedTargetCleanDeploymentArchitecture: [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md)
- relatedTargetCleanDeploymentOperations: [target-clean-deployment-operations-v1.md](target-clean-deployment-operations-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)

## Decision Boundary

This contract defines what must be proven before the system can be described as production-ready for another company or as hosted SaaS.

It is not hosted production evidence, not a completed SaaS architecture decision, not a billing or account readiness proof, and not permission to claim `production-ready`.

The current release remains OpenAI-scoped pilot-ready only. Production-ready remains blocked until every mandatory control below has evidence from the approved target deployment and the target environment evidence intake packet is complete.

## Target Deployment Profiles

| Profile | Current Status | Required Decision Before Use |
| --- | --- | --- |
| Self-hosted local-first pilot | supported for OpenAI-scoped pilot | pilot owner approves isolated runtime root, provider env injection, and export boundary |
| Production-like single-tenant deployment | not yet proven | target environment, secret manager, backup, telemetry, retention, and clean release evidence must be captured |
| Hosted multi-tenant SaaS | blocked by unapproved ADR | hosted SaaS architecture decision record must be approved with tenant model, billing, identity, storage, encryption, backup, and support operations |
| Hybrid control plane | blocked by unapproved ADR | hosted SaaS architecture decision record must be approved with agent registration, remote job dispatch, fleet observability, and policy distribution |

## Mandatory Controls

| Control | Required Production Evidence | Current Local Evidence | Current Status |
| --- | --- | --- | --- |
| Hosted SaaS architecture decision | hosted SaaS architecture decision is approved with tenant model, control plane, identity, storage, provider, billing, observability, lifecycle, deployment, and compliance decisions | local hosted SaaS architecture decision contract is present with hostedSaasApproved false | blocked |
| Hosted identity session architecture | hosted identity session architecture is approved with customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, audit, break-glass, support impersonation, compliance, and retention decisions | local hosted identity session architecture contract is present with hostedIdentitySessionApproved false | blocked |
| Target identity session operations | target identity session operations evidence is captured with customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, audit export, break-glass, support impersonation, compliance, and retention proof | local target identity session operations contract is present without target environment evidence | blocked |
| Hosted tenant isolation architecture | hosted tenant isolation architecture is approved with tenant identity, authorization, storage partitioning, encryption, backup/restore, administration, cross-tenant denial, observability/support, and lifecycle decisions | local hosted tenant isolation architecture contract is present with hostedTenantIsolationApproved false | blocked |
| Target tenant isolation operations | target tenant isolation operations evidence is captured with tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant containment proof | local target tenant isolation operations contract is present without target environment evidence | blocked |
| Target secret manager architecture | target secret manager architecture is approved with platform, secret classes, injection path, access policy, rotation, audit, break-glass, leakage controls, and disaster recovery decisions | local target secret manager architecture contract is present with targetSecretManagerApproved false | blocked |
| Target environment evidence intake | deployment boundary, identity/session, tenant storage/encryption, provider/secrets, observability/SLO, retention/backup, support, clean release, and artifact hygiene evidence packet is complete | local target environment evidence intake contract is present | blocked |
| Target provider validation | every provider in the production claim has provider account approval, target secret injection, target-boundary live validation, quota/cost guard, model/endpoint pinning, and fallback evidence | OpenAI and configured local provider live evidence are archived for the pilot boundary; Anthropic account blocker, target local provider architecture gap, and target Hermes provider architecture approval gap are explicit; target provider evidence intake contract is present | blocked |
| Target provider operations | target provider operations evidence is captured with provider account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment proof | local target provider operations contract is present without target environment evidence | blocked |
| Target OpenAI provider account | target OpenAI provider account is approved with account ownership, billing/quota, API key injection, model access, provider terms, usage/cost guard, live validation, telemetry, fallback, and renewal/review audit decisions | local target OpenAI provider account contract is present with targetOpenAIProviderApproved false | blocked |
| Target Anthropic provider account | target Anthropic provider account is approved with account ownership, billing/credit, API key injection, model access, provider terms, quota/spend guard, live validation, telemetry, fallback, and remediation audit decisions | local target Anthropic provider account contract is present with targetAnthropicProviderApproved false | blocked |
| Target local provider architecture | target local provider architecture is approved with endpoint ownership, model pinning, network isolation, credential policy, runtime lifecycle, session provenance, data residency, quota/resource guard, telemetry, fallback, and customer approval decisions | local target local provider architecture contract is present with targetLocalProviderApproved false | blocked |
| Target Hermes provider architecture | target Hermes provider architecture is approved with endpoint ownership, model pinning, secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, and customer approval decisions | local target Hermes provider architecture contract is present with targetHermesProviderApproved false | blocked |
| Identity-backed RBAC and session administration | persistent users, sessions, role assignment, token rotation, logout/revocation, and audit trail are proven | local identity session administration, shared-secret, OIDC/JWKS, and RBAC gates pass | blocked |
| Hosted tenant isolation | tenant identity, authorization, storage partitioning, tenant admin, per-tenant encryption, backup/restore isolation, and cross-tenant denial are proven | local tenant storage administration, OIDC tenant API isolation, tenant lifecycle, and runtime isolation gates pass | blocked |
| Secret management | provider credentials are injected through target secret manager and never appear in logs or artifacts | local secret management, target secret manager contract, and release artifact hygiene pass | blocked |
| Target observability architecture | target observability architecture is approved with telemetry backend, signal taxonomy, alert routing, on-call staffing, log/trace retention, customer communication, incident response, audit, and disaster recovery decisions | local target observability architecture contract is present with targetObservabilityApproved false | blocked |
| Target SLO architecture | target SLO architecture is approved with customer SLO terms, error budget, telemetry measurement, alert acknowledgement, on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, and service credit decisions | local target SLO architecture contract is present with targetSloApproved false | blocked |
| Target SLO operations | target SLO operations evidence is captured with customer-approved SLO/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, service credit, and evidence retention proof | local target SLO operations contract is present without target environment evidence | blocked |
| Target support architecture | target support architecture is approved with staffing model, support queue, severity routing, customer communication, ticket audit, on-call handoff, incident commander ownership, escalation, support data handling, and incident review governance decisions | local target support architecture contract is present with targetSupportApproved false | blocked |
| Target data lifecycle architecture | target data lifecycle architecture is approved with customer data classes, retention enforcement, export boundary, delete workflow, provider transcript handling, post-delete absence, backup architecture, restore isolation, key ownership, and disaster recovery decisions | local target data lifecycle architecture contract is present with targetDataLifecycleApproved false | blocked |
| Retention, export, delete | customer-approved retention classes, export package, delete request workflow, provider transcript policy, backup expiry, and post-delete absence are proven | local retention, tenant lifecycle, target data lifecycle architecture, target retention operations, backup/restore drill, and target backup operations gates pass | blocked |
| SLO/SLA operations | target telemetry, alerting, staffed on-call, incident trail, and customer SLO/SLA review are proven | local SLO operating, observability telemetry, target observability architecture, target observability operations, and target SLO architecture gates pass | blocked |
| Target clean deployment architecture | target clean deployment architecture is approved with source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback, and release approval decisions | local target clean deployment architecture contract is present with targetCleanDeploymentApproved false | blocked |
| Target clean deployment operations | target clean deployment operations evidence is captured with source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, and evidence retention proof | local target clean deployment operations contract is present without target environment evidence | blocked |
| Clean deployment release | the target package is deployed from a clean environment with dependency, secret, runtime, and rollback evidence | tracked-files-only clean rehearsal passes locally | blocked |
| Customer support operations | escalation route, support owner, incident communications, customer handoff process, audit history, and incident review cadence are proven | pilot runbook, incident policy, and local support operations, support escalation review, target support architecture, and target support operations gates pass | blocked |

## Target Evidence Capture Template

When an approved production-like or hosted deployment boundary is ready for review, fill this template with target-boundary evidence. Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, customer personal data, tenant payloads, private account identifiers, or machine-local absolute paths.

| Field | Required Value | Completion Rule |
| --- | --- | --- |
| targetDeploymentName | approved target environment name, company/workspace scope, deployment owner, evidence owner, review date, and release label | must identify the exact target boundary and release decision being evaluated |
| deploymentProfileDecision | selected deployment profile, approved architecture decision, network boundary, runtime root alias, rollback owner, and customer approval reference | must map the deployment to one target deployment profile without claiming an unapproved profile |
| mandatoryControlEvidence | evidence references for every mandatory control, required command output, production readiness gate result, and unresolved blocker list | must prove every control row was reviewed against target evidence from the same boundary |
| providerReadinessEvidence | completed provider evidence intake, target provider operations, provider account or architecture approvals, target secret injection, target-boundary live validation, quota/cost/resource guard, fallback evidence, and provider failure containment proof | must prove all providers included in the target claim are approved and live-validated from the target boundary |
| identityTenantEvidence | hosted identity/session approval, target identity/session operations, hosted tenant isolation approval, target tenant isolation operations, RBAC/session audit, tenant storage boundary, encryption/key ownership, and cross-tenant denial evidence | must prove user, session, role, tenant, storage, and key boundaries before any hosted or multi-tenant claim |
| secretObservabilityEvidence | target secret manager approval, rotation/revocation evidence, telemetry backend, alert route, log/trace retention, target observability operations, target SLO architecture, target SLO operations, and incident review evidence | must prove secrets and monitoring are operated through target-approved controls |
| dataLifecycleSupportEvidence | target data lifecycle approval, retention/export/delete proof, provider transcript handling, backup/restore evidence, support architecture approval, staffed support route, escalation audit, customer communication route, and incident review cadence | must prove lifecycle and support operations are staffed and auditable for the target customer boundary |
| cleanReleaseArtifactEvidence | target clean deployment architecture, target clean deployment operations, clean deployment run, dependency/runtime proof, release snapshot, export package, production-like drill, artifact hygiene result, rollback proof, and failed-deployment containment | must reference passed release artifacts generated from the same target review boundary |
| stopConditionDecision | explicit stop conditions, residual blockers, accepted risks, blocker owner, remediation owner, and next review date | must record why `productionReadyClaim` remains false when any mandatory target evidence is missing |
| productionReadyClaimDecision | decision owner, approval or rejection summary, allowed claim text, evidence commit, snapshot path, and regeneration command references | must keep `productionReadyClaim` false unless every mandatory target deployment control is satisfied by target evidence |

The completed template is still not sufficient for `production-ready` by itself. It must be paired with target environment evidence intake, target provider evidence intake, target provider operations, target identity/session operations, target tenant isolation operations, target SLO operations, target clean deployment operations, release artifact hygiene, production-like release drill, clean deployment release, and production readiness gate evidence.

## Required Commands

```bash
npm run smoke:target-deployment-contract
npm run smoke:production-readiness-gate
npm run smoke:hosted-saas-architecture-decision
npm run smoke:hosted-identity-session-architecture
npm run smoke:target-identity-session-operations
npm run smoke:hosted-tenant-isolation-architecture
npm run smoke:target-tenant-isolation-operations
npm run smoke:target-environment-evidence-intake
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
npm run smoke:target-provider-operations
npm run smoke:target-openai-provider-account
npm run smoke:target-anthropic-provider-account
npm run smoke:target-local-provider-architecture
npm run smoke:target-hermes-provider-architecture
npm run smoke:production-enterprise-controls
npm run smoke:identity-session-admin
npm run smoke:tenant-storage-admin
npm run smoke:production-retention-operating
npm run smoke:backup-restore-drill
npm run smoke:target-retention-operations
npm run smoke:target-backup-operations
npm run smoke:customer-support-operations
npm run smoke:support-escalation-review
npm run smoke:target-support-architecture
npm run smoke:target-support-operations
npm run smoke:secret-management
npm run smoke:target-secret-manager-architecture
npm run smoke:target-secret-manager
npm run smoke:observability-telemetry
npm run smoke:target-observability-architecture
npm run smoke:target-observability-operations
npm run smoke:target-slo-architecture
npm run smoke:target-slo-operations
npm run smoke:target-data-lifecycle-architecture
npm run smoke:target-clean-deployment-architecture
npm run smoke:target-clean-deployment-operations
npm run smoke:production-slo-operating
npm run smoke:clean-deployment-release
```

## Blocking Rules

- stop production-ready claims if any provider included in the production claim lacks provider account approval, target secret injection, target-boundary live validation, quota/cost guard, model/endpoint pinning, and fallback evidence
- stop target provider operations claims until provider inventory, account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment evidence are captured
- stop OpenAI production provider claims until the target OpenAI provider account record is approved and OpenAI target-boundary live validation evidence is generated
- stop Anthropic provider claims until the target Anthropic provider account record is approved and Anthropic live validation evidence is generated
- stop local provider claims until the target local provider architecture record is approved and target-boundary endpoint/model, network isolation, telemetry, quota/resource guard, and local provider live validation evidence are generated
- stop Hermes provider claims until the target Hermes provider architecture record is approved and endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and Hermes live validation evidence are generated
- stop production-ready claims if the target environment evidence intake packet is incomplete
- stop hosted SaaS claims until the hosted SaaS architecture decision record is approved and target evidence is generated
- stop hosted identity-backed RBAC claims until the hosted identity session architecture record is approved and target identity/session evidence is generated
- stop target identity/session operations claims until customer IdP integration, user lifecycle, session lifecycle, role administration, permission propagation, audit export, break-glass, support impersonation, compliance, retention, and customer access containment evidence are captured
- stop hosted multi-tenant isolation claims until the hosted tenant isolation architecture record is approved and target isolation evidence is generated
- stop target tenant isolation operations claims until tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant data containment evidence are captured
- stop multi-tenant claims until tenant storage, encryption, backup, restore, and tenant administration evidence exist
- stop enterprise RBAC claims until identity-backed user/session lifecycle and persistent role administration are implemented and tested
- stop target secret manager claims until the target secret manager architecture record is approved and target secret manager evidence is generated
- stop secret management claims until target secret manager injection, rotation, access policy, audit trail, break-glass, and revocation evidence are captured
- stop target observability claims until the target observability architecture record is approved and target observability evidence is generated
- stop target SLO/SLA claims until the target SLO architecture record is approved and target SLO evidence is generated
- stop target SLO operations claims until customer-approved SLO/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, service credit, evidence retention, and missed-SLO containment evidence are captured
- stop target support claims until the target support architecture record is approved and target support evidence is generated
- stop target data lifecycle claims until the target data lifecycle architecture record is approved and target data lifecycle evidence is generated
- stop retention/delete claims until target retention configuration, export approval, delete workflow, provider transcript handling, target backup execution, encrypted storage, backup expiry, and post-delete absence evidence are captured
- stop observability claims until target observability telemetry, alert delivery, log/trace retention, staffed on-call route, customer status communication, and incident review evidence are captured
- stop SLO/SLA claims until target telemetry, alerting, on-call, incident response, customer SLO terms, error budget, and service credit evidence exist
- stop target clean deployment claims until the target clean deployment architecture record is approved and source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, smoke/health verification, rollback/recovery, release approval, and failed-deployment containment evidence are generated
- stop target clean deployment operations claims until source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, evidence retention, and failed-deployment containment evidence are captured
- stop clean deployment claims until source provenance, artifact registry, dependency install, runtime bootstrap, secret injection, environment boundary, smoke/health, rollback, and release approval evidence are captured
- stop customer support claims until staffed ownership, support queue routing, customer communication route, ticket audit history, on-call handoff, and incident review cadence are proven in the target environment
- stop external handoff if artifact hygiene finds credentials or machine-local paths

## Operator Handoff

The operator can use this contract as the production readiness checklist when a company asks whether the system is ready for broader deployment.

If every required control has target deployment evidence, regenerate execution evidence, closeout, handoff, snapshot, pilot export package, and production operating rehearsals before changing the release label.

Until then, the only allowed claim is OpenAI-scoped self-hosted/local-first pilot readiness.
