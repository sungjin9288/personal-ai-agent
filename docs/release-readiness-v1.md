# Release Readiness v1

- status: current-release-decision
- localDate: 2026-05-04
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- decision: pilot-ready only for OpenAI-backed bounded self-hosted/local-first operation; do not claim production-ready
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedOnboarding: [pilot-onboarding-v1.md](pilot-onboarding-v1.md)
- relatedDemoScenarios: [demo-scenarios-v1.md](demo-scenarios-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetProviderOperations: [target-provider-operations-v1.md](target-provider-operations-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedHostedIdentitySessionArchitecture: [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md)
- relatedTargetIdentitySessionOperations: [target-identity-session-operations-v1.md](target-identity-session-operations-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedTargetTenantIsolationOperations: [target-tenant-isolation-operations-v1.md](target-tenant-isolation-operations-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)
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
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-closeout.md](execution-v1-closeout.md), [execution-v1-handoff.md](execution-v1-handoff.md)

## Decision

The current v1 release is `provider-scoped pilot ready for OpenAI-backed local-first path`.

It is ready for controlled OpenAI-backed local-first pilot operation, internal demos, deterministic operator walkthroughs, and self-hosted pilot preparation.

It is `pilot-ready` only inside the validated OpenAI provider boundary and the documented self-hosted/local-first deployment boundary.

It is not `production-ready` because the OpenAI/local path is approved only for the scoped self-hosted/local-first pilot, Anthropic is blocked by provider account billing/credit, Hermes provider validation still requires target Hermes provider architecture evidence for endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and target-boundary Hermes live validation, target local provider architecture still requires endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence, and the target deployment contract still lacks hosted identity/session administration, tenant storage/encryption, target OpenAI provider account approval, target Anthropic provider account approval, target local provider architecture approval, target Hermes provider architecture approval, target secret manager injection/audit, target observability/on-call operations, target SLO architecture, target SLO operations, target retention operations, target backup operations, target support architecture, target support operations, SLO/SLA, and target clean deployment evidence for source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, smoke/health verification, rollback/recovery, release approval, and failed-deployment containment.

## Evidence Summary

Current execution evidence:

- deterministic verification: passed
- deterministic runtime summary: ready
- browser interaction E2E: passed
- reference adoption aggregate: ready, 15 scripts
- handoff generator: passed
- visual artifact set: `d58b31568fb8088dde4b8d8fa34d0af2a2f2e6012a43b1449074ab27768534ea`
- live validation: OpenAI passed, Anthropic failed with API billing/credit blocker, local provider passed for the configured pilot boundary, Hermes remains blocked until target Hermes provider architecture evidence and target-boundary live validation are approved
- local deterministic production-like release drill: passed, with `productionReadyClaim: false`
- pilot export package manifest: passed, with repository-relative paths and `productionReadyClaim: false`
- self-hosted runtime isolation smoke: passed, with `productionReadyClaim: false`
- pilot retention/export/delete policy gate: passed, with documented data classes, export checklist, delete checklist, and `productionReadyClaim: false`
- tenant-scoped runtime export/delete gate: passed, with tenant-filtered export, exact tenant delete confirmation, post-delete absence, and unchanged other-tenant state
- local backup/restore drill: passed, with manifest sha256 verification, clean-runtime restore requirement, restored state hash match, and post-restore tenant delete isolation
- local customer support operations gate: passed, with support roles, intake classes, escalation matrix, customer communication rules, and pilot handoff checklist
- local support escalation review gate: passed, with escalation routes, audit packet requirements, incident review cadence, customer update rules, and `productionReadyClaim: false`
- target support architecture gate: passed, with targetSupportApproved false, staffing model, support queue, severity routing, customer communication, ticket audit, on-call handoff, incident commander ownership, escalation, support data handling, incident review governance decision requirements, and `productionReadyClaim: false`
- local target support operations gate: passed, with staffed coverage, support queue routing, customer communication, ticket audit history, incident review cadence, on-call handoff, and `productionReadyClaim: false`
- local secret management gate: passed, with secret classes, injection rules, redaction/hygiene rules, and rotation/revocation checklist
- local observability telemetry gate: passed, with telemetry signals, alert triggers, required commands, and handoff requirements
- target clean deployment architecture gate: passed, with targetCleanDeploymentApproved false, source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback, release approval decision requirements, and `productionReadyClaim: false`
- target clean deployment operations gate: passed, with source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, evidence retention, failed-deployment containment requirements, and `productionReadyClaim: false`
- clean deployment release rehearsal: passed from tracked-files-only checkout, with `productionReadyClaim: false`
- local production SLO operating rehearsal: passed, with `productionReadyClaim: false`
- local production retention operating rehearsal: passed, with `productionReadyClaim: false`
- local provider readiness operating rehearsal: passed, with `productionReadyClaim: false`
- target provider evidence intake gate: passed, with provider account approval, target secret injection, target-boundary live validation, quota/cost guard, model/endpoint pinning, failure triage route, provider blocker closure verification, and `productionReadyClaim: false`
- target provider operations gate: passed, with provider account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, target blocker closure verification matrix, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, provider failure containment requirements, and `productionReadyClaim: false`
- target OpenAI provider account gate: passed, with targetOpenAIProviderApproved false, account ownership, billing/quota, API key injection, model access, provider terms, usage/cost guard, target live validation, telemetry, fallback, renewal/review audit requirements, and `productionReadyClaim: false`
- target Anthropic provider account gate: passed, with targetAnthropicProviderApproved false, account ownership, billing/credit, API key injection, model access, provider terms, quota/spend guard, target live validation, telemetry, fallback, remediation audit requirements, and `productionReadyClaim: false`
- target local provider architecture gate: passed, with targetLocalProviderApproved false, endpoint ownership, model pinning, network isolation, credential policy, runtime lifecycle, session provenance, data residency, quota/resource guard, telemetry, fallback, customer approval decision requirements, and `productionReadyClaim: false`
- target Hermes provider architecture gate: passed, with targetHermesProviderApproved false, endpoint ownership, model pinning, secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval decision requirements, and `productionReadyClaim: false`
- local enterprise controls rehearsal: passed, including OIDC/JWKS auth, token-claim RBAC, and API tenant isolation smoke, with `productionReadyClaim: false`
- local identity session administration gate: passed, with identity controls, session lifecycle, audit packet requirements, and `productionReadyClaim: false`
- local tenant storage administration gate: passed, with tenant storage controls, tenant admin operations, audit packet requirements, and `productionReadyClaim: false`
- target deployment contract gate: passed, with hosted production/SaaS mandatory controls explicitly blocked until target evidence exists
- hosted SaaS architecture decision gate: passed, with hostedSaasApproved false, tenant model, control plane, identity, storage, provider, billing, observability, data lifecycle, deployment, compliance decision requirements, and `productionReadyClaim: false`
- hosted identity session architecture gate: passed, with hostedIdentitySessionApproved false, customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, audit, break-glass, support impersonation, compliance, retention decision requirements, and `productionReadyClaim: false`
- target identity session operations gate: passed, with customer IdP onboarding, user lifecycle, session lifecycle, role administration, permission propagation, audit export, break-glass, support impersonation, compliance, retention, customer access containment requirements, and `productionReadyClaim: false`
- hosted tenant isolation architecture gate: passed, with hostedTenantIsolationApproved false, tenant identity, authorization, storage partitioning, encryption, backup/restore, administration, cross-tenant denial, observability/support, lifecycle decision requirements, and `productionReadyClaim: false`
- target tenant isolation operations gate: passed, with tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, tenant data containment requirements, and `productionReadyClaim: false`
- target environment evidence intake gate: passed, with deployment boundary, identity/session, tenant storage/encryption, provider/secrets, observability/SLO, retention/backup, support, clean release, artifact hygiene, sanitized submission packet, blocker disposition register, blocker closure verification matrix, stop-condition closing evidence, and `productionReadyClaim: false`
- target secret manager architecture gate: passed, with targetSecretManagerApproved false, platform, secret classes, injection path, access policy, rotation, audit, break-glass, leakage controls, disaster recovery decision requirements, and `productionReadyClaim: false`
- local target secret manager gate: passed, with secret manager controls, rotation evidence packet, break-glass rules, and `productionReadyClaim: false`
- local web auth plus RBAC gate: passed for shared-secret API auth and role enforcement, without hosted identity/session claims
- target observability architecture gate: passed, with targetObservabilityApproved false, telemetry backend, signal taxonomy, alert routing, on-call staffing, log/trace retention, customer communication, incident response, audit, disaster recovery decision requirements, and `productionReadyClaim: false`
- local target observability operations gate: passed, with telemetry pipeline, alert delivery, log/trace retention, on-call routing, customer status communication, incident review history, and `productionReadyClaim: false`
- target SLO architecture gate: passed, with targetSloApproved false, customer SLO terms, error budget, telemetry measurement, alert acknowledgement, on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, service credit decision requirements, and `productionReadyClaim: false`
- target SLO operations gate: passed, with customer-approved SLO/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, service credit, evidence retention, missed-SLO containment requirements, and `productionReadyClaim: false`
- target data lifecycle architecture gate: passed, with targetDataLifecycleApproved false, customer data classes, retention enforcement, export boundary, delete workflow, provider transcript handling, post-delete absence, backup architecture, restore isolation, key ownership, disaster recovery decision requirements, and `productionReadyClaim: false`
- local target retention operations gate: passed, with customer-approved data classes, retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, and `productionReadyClaim: false`
- local target backup operations gate: passed, with backup schedule, encrypted storage, key ownership, restore validation, tenant isolation, backup expiry/deletion, disaster recovery rules, and `productionReadyClaim: false`
- local OIDC/JWKS auth plus RBAC gate: passed for bearer JWT issuer/audience/signature/expiry and token role claim enforcement, without hosted session administration claims
- local OIDC tenant isolation gate: passed for tenant-bound workspace creation, workspace/mission filtering, cross-tenant mission create/read blocking, and tenant header spoofing prevention, without hosted tenant storage claims

Current handoff state:

- deterministic execution flow: ready
- CLI execution contract: ready
- operator console execution contract: ready
- browser interaction E2E: ready
- snapshot portability: ready
- OpenAI live validation: passed
- Anthropic live validation: failed with HTTP 400 account billing/credit blocker
- local provider live validation: passed
- Hermes live validation: blocked by missing `HERMES_PROVIDER_MODEL`

## Planning Pack Status

| Artifact | Status | Purpose |
| --- | --- | --- |
| [product-plan-v1.md](product-plan-v1.md) | ready | product scope, MVP boundary, readiness levels |
| [security-model-v1.md](security-model-v1.md) | ready | trust boundaries, RBAC policy, secrets, audit, threat model |
| [operator-runbook-v1.md](operator-runbook-v1.md) | ready | daily operation, mission flow, approval, evidence, incidents |
| [deployment-pilot-v1.md](deployment-pilot-v1.md) | ready | self-hosted pilot install, validation, export, cleanup |
| [pilot-onboarding-v1.md](pilot-onboarding-v1.md) | ready | first pilot session, roles, first mission, success/stop criteria |
| [demo-scenarios-v1.md](demo-scenarios-v1.md) | ready | customer demo catalog and scenario-specific proof paths |
| [incident-slo-v1.md](incident-slo-v1.md) | pilot-policy-ready | incident severity, SLO triage commands, response workflow |
| [production-slo-operating-v1.md](production-slo-operating-v1.md) | local-slo-operating-current | local SLO operating rehearsal and production telemetry gap |
| [production-retention-operating-v1.md](production-retention-operating-v1.md) | local-retention-operating-current | local retention/export/delete operating rehearsal and production environment gap |
| [production-provider-readiness-v1.md](production-provider-readiness-v1.md) | local-provider-readiness-current | provider preflight and live-validation blocker rehearsal |
| [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md) | local-target-provider-evidence-intake-current | target provider account, secret injection, live validation, quota, model, and fallback evidence packet |
| [target-provider-operations-v1.md](target-provider-operations-v1.md) | local-target-provider-operations-current | target provider operations evidence contract for account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment |
| [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md) | local-target-openai-provider-account-current | target OpenAI provider account decision and evidence contract with targetOpenAIProviderApproved false |
| [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md) | local-target-anthropic-provider-account-current | target Anthropic provider account decision and evidence contract with targetAnthropicProviderApproved false |
| [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md) | local-target-local-provider-architecture-current | target local provider architecture decision and evidence contract with targetLocalProviderApproved false |
| [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md) | local-target-hermes-provider-architecture-current | target Hermes-compatible provider architecture decision and evidence contract with targetHermesProviderApproved false |
| [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md) | local-enterprise-controls-current | local auth, RBAC, artifact hygiene, runtime isolation, and provider-readiness controls rehearsal |
| [identity-session-admin-v1.md](identity-session-admin-v1.md) | local-identity-session-admin-current | local identity controls, session lifecycle, role audit packet requirements, and hosted identity production gap |
| [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md) | local-tenant-storage-admin-current | local tenant storage controls, tenant admin operations, audit packet requirements, and hosted tenant isolation gap |
| [target-deployment-contract-v1.md](target-deployment-contract-v1.md) | target-contract-current | mandatory hosted/production-like deployment controls and blocking rules |
| [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md) | local-hosted-saas-architecture-decision-current | hosted SaaS and hybrid control-plane architecture decision contract with hostedSaasApproved false |
| [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md) | local-hosted-identity-session-architecture-current | hosted identity-backed RBAC and session architecture decision contract with hostedIdentitySessionApproved false |
| [target-identity-session-operations-v1.md](target-identity-session-operations-v1.md) | local-target-identity-session-operations-current | target identity/session operations evidence contract for customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, audit, break-glass, support impersonation, compliance, retention, and customer access containment |
| [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md) | local-hosted-tenant-isolation-architecture-current | hosted tenant isolation architecture decision and target evidence contract with hostedTenantIsolationApproved false |
| [target-tenant-isolation-operations-v1.md](target-tenant-isolation-operations-v1.md) | local-target-tenant-isolation-operations-current | target tenant isolation operations evidence contract for tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant containment |
| [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md) | local-target-environment-evidence-intake-current | target environment deployment, identity, tenant, provider, secret, telemetry, retention, backup, support, clean release, artifact evidence packet, sanitized submission packet, blocker disposition register, and blocker closure verification matrix |
| [backup-restore-drill-v1.md](backup-restore-drill-v1.md) | local-backup-restore-current | local runtime backup manifest, restore integrity, and tenant-isolated recovery drill |
| [customer-support-operations-v1.md](customer-support-operations-v1.md) | local-support-operations-current | local support roles, intake routing, escalation, communication, and handoff checklist |
| [support-escalation-review-v1.md](support-escalation-review-v1.md) | local-support-escalation-review-current | local support escalation routes, audit packet requirements, incident review cadence, and customer update rules |
| [target-support-architecture-v1.md](target-support-architecture-v1.md) | local-target-support-architecture-current | target support architecture decision and evidence contract with targetSupportApproved false |
| [target-support-operations-v1.md](target-support-operations-v1.md) | local-target-support-operations-current | target support operation controls, support evidence packet, customer support rules, and production target gap |
| [secret-management-v1.md](secret-management-v1.md) | local-secret-management-current | local secret classes, injection, redaction, hygiene, rotation, and production gap |
| [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md) | local-target-secret-manager-architecture-current | target secret manager architecture decision and evidence contract with targetSecretManagerApproved false |
| [target-secret-manager-v1.md](target-secret-manager-v1.md) | local-target-secret-manager-current | target secret manager controls, rotation evidence packet, break-glass rules, and production target gap |
| [observability-telemetry-v1.md](observability-telemetry-v1.md) | local-observability-telemetry-current | local telemetry signals, alert triggers, handoff requirements, and production telemetry gap |
| [target-observability-architecture-v1.md](target-observability-architecture-v1.md) | local-target-observability-architecture-current | target observability architecture decision and evidence contract with targetObservabilityApproved false |
| [target-observability-operations-v1.md](target-observability-operations-v1.md) | local-target-observability-operations-current | target observability operation controls, operations evidence packet, on-call rules, and production target gap |
| [target-slo-architecture-v1.md](target-slo-architecture-v1.md) | local-target-slo-architecture-current | target SLO/SLA architecture decision and evidence contract with targetSloApproved false |
| [target-slo-operations-v1.md](target-slo-operations-v1.md) | local-target-slo-operations-current | target SLO operations evidence contract for customer-approved SLO/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call, customer communication, incident review, provider outage, maintenance/degradation, service credit, evidence retention, and missed-SLO containment |
| [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md) | local-target-data-lifecycle-architecture-current | target data lifecycle architecture decision and evidence contract with targetDataLifecycleApproved false |
| [target-retention-operations-v1.md](target-retention-operations-v1.md) | local-target-retention-operations-current | target retention operation controls, retention evidence packet, data lifecycle rules, and production target gap |
| [target-backup-operations-v1.md](target-backup-operations-v1.md) | local-target-backup-operations-current | target backup operation controls, recovery evidence packet, disaster recovery rules, and production target gap |
| [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md) | local-target-clean-deployment-architecture-current | target clean deployment architecture decision and evidence contract with targetCleanDeploymentApproved false |
| [target-clean-deployment-operations-v1.md](target-clean-deployment-operations-v1.md) | local-target-clean-deployment-operations-current | target clean deployment operations evidence contract for source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, evidence retention, and failed-deployment containment |
| [runtime-isolation-v1.md](runtime-isolation-v1.md) | pilot-isolation-evidence-current | one-runtime-per-customer isolation smoke and production gap |
| [retention-delete-v1.md](retention-delete-v1.md) | pilot-policy-evidence-current | data class retention, export checklist, delete checklist, and production gap |
| [clean-deployment-release-v1.md](clean-deployment-release-v1.md) | clean-local-rehearsal-current | tracked-files-only clean checkout release gate replay and production gap |
| [production-like-release-drill-v1.md](production-like-release-drill-v1.md) | dry-run-evidence-current | replayable local deterministic release drill with production-ready claim blocked |
| [pilot-export-package-v1.md](pilot-export-package-v1.md) | dry-run-package-current | shareable pilot handoff package manifest with hashes and hygiene boundary |
| [execution-v1-evidence.md](execution-v1-evidence.md) | OpenAI-live-validated | current verification evidence |
| [execution-v1-closeout.md](execution-v1-closeout.md) | OpenAI-live-validated | closeout checklist with remaining provider gaps |
| [execution-v1-handoff.md](execution-v1-handoff.md) | handoff-ready | operator handoff and next live validation commands |

## Readiness Gate

### Internal Alpha

Status: pass.

Why:

- deterministic smoke gate is green
- local-first execution-v1 handoff exists
- planning pack exists
- security and operator docs exist
- known live-provider gaps are explicit
- release artifact publishing is tracked by `smoke:execution-v1-status` and must remain `artifact-sync-current` before handoff

Allowed claims:

- local-first multi-agent harness is ready for OpenAI-scoped pilot operation
- execution-v1 evidence and handoff can be reviewed
- company pilot planning can begin
- self-hosted pilot preparation can begin
- OpenAI-backed bounded local-first pilot can begin inside the documented deployment boundary

Not allowed claims:

- provider-backed production readiness
- all-provider live validation readiness
- hosted SaaS readiness
- complete enterprise RBAC enforcement
- multi-tenant production isolation

### Pilot Ready

Status: pass, scoped to OpenAI-backed local-first/self-hosted pilot.

Validated scope:

- OpenAI and local provider live validation archived in [execution-v1-evidence.md](execution-v1-evidence.md)
- deterministic execution, CLI, UI console, browser E2E, handoff, and snapshot gates passed
- security model, operator runbook, deployment guide, onboarding guide, demo scenarios, and release decision docs exist
- release evidence is synchronized through the current execution-v1 snapshot and `artifact-sync-current` smoke state

Remaining blockers outside this scope:

- Anthropic live validation remains blocked until target Anthropic provider account evidence for billing and credit remediation, active billing plan, available credit balance, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, provider terms and customer approval, quota and spend guard, target-boundary npm run live:execution-v1:anthropic pass, mission and execution session provenance, telemetry, fallback and stop-condition decision, remediation audit, release artifact hygiene result, and regenerated execution snapshot is recorded
- target local provider architecture remains blocked until endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence are recorded
- Hermes live validation remains blocked until target Hermes provider architecture evidence for endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback, customer approval, target-boundary npm run live:execution-v1:hermes pass, release artifact hygiene result, and regenerated execution snapshot is recorded

Pilot-ready can be claimed only for the validated provider and approved deployment boundary.

### Production Ready

Status: blocked.

Blockers:

- provider live validation completion evidence for Anthropic and Hermes is incomplete, and production provider live validation evidence for Anthropic billing and credit remediation, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, npm run live:execution-v1:anthropic result, Hermes target provider architecture approval, HERMES_PROVIDER_MODEL pinning, Hermes endpoint and secret injection, npm run live:execution-v1:hermes result, mission id, execution session id, provider response status, retry lineage, artifact provenance, telemetry probe result, failureKind taxonomy, fallback or disable decision, remediation owner, next review date, release artifact hygiene result, and regenerated execution snapshot is not generated from the approved production-like or hosted target environment
- target OpenAI provider account is not approved, and target OpenAI provider account evidence for account ownership proof with OpenAI organization/project owner, project/workspace alias, customer scope, evidence owner, and review date, billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance/quota alert route, and redacted evidence summary, API key and secret injection proof with target secret manager alias, OPENAI_API_KEY owner, rotation path, access audit, break-glass owner, and redaction result, model access proof with OPENAI_MODEL, model availability, region/project access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript/retention policy, support owner, and evidence owner, usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:openai, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date, migration plan, missing API key, revoked key, quota exhaustion, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment
- target provider operations evidence for completed per-provider operations capture template, branch and commit, release label and deployment boundary, provider inventory proof with OpenAI, Anthropic, local, and Hermes inclusion state, owner, customer/workspace approval, account or architecture record, and operating decision, provider account approval proof with billing/credit/quota state, provider terms, model access, and renewal owner, target secret injection proof with secret manager alias, rotation owner, access policy, redaction result, break-glass path, and revocation evidence, target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, and operator owner, model and endpoint pinning proof with model id, endpoint/base URL alias, retry policy, concurrency limit, fallback route, and approval owner, quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route, fallback and disable proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop conditions, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof with provider blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, and regenerated release artifacts, provider telemetry proof with health signal, latency/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner, provider incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes, data and transcript handling proof with data classification, provider transcript policy, retention class, export/delete handling, redaction rule, and post-delete absence requirement, remediation and renewal review proof with billing/credit remediation, endpoint/model renewal, key rotation, provider terms review, accepted-risk owner, and next review date, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and provider failure containment plan is not generated from a production-like environment
- target Anthropic provider account is not approved, and target Anthropic provider account evidence for account ownership proof with Anthropic account owner, organization/workspace alias, customer scope, evidence owner, and review date, billing and credit proof with active billing plan, available credit balance, payment owner, renewal path, low-balance alert route, and screenshot-free redacted evidence summary, API key and secret injection proof with target secret manager alias, ANTHROPIC_API_KEY owner, rotation path, access audit, break-glass owner, and redaction result, model access proof with ANTHROPIC_MODEL, model availability, region/workspace access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner, quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:anthropic, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date, migration plan, low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment
- target local provider architecture is not approved, and target local provider architecture evidence for endpoint ownership proof with approved base URL alias, runtime owner, network boundary, transport, availability owner, and health check record, model pinning proof with LOCAL_PROVIDER_MODEL, model source/version, compatibility profile, max token policy, fallback model, and owner approval, network isolation proof with host boundary, ingress policy, egress policy, tenant/customer boundary, operator access policy, and firewall decision, secret and credential policy proof with auth mode, API key requirement, target secret manager alias when used, rotation path, redaction result, and access audit, runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence, quota and resource guard proof with CPU/GPU/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval, telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage/resource metrics, alert route, and incident owner, fallback and customer approval proof with fallback provider, degraded mode, customer impact rule, manual approval path, provider terms/local model license decision, and residual risk owner, migration plan, missing base URL, missing model, unavailable runtime, model mismatch, data residency gap, resource exhaustion, and fallback failure containment is not generated from a production-like environment
- target Hermes provider architecture is not approved, and target Hermes provider architecture evidence for endpoint ownership proof with approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check record, model pinning proof with HERMES_PROVIDER_MODEL, model version/source, compatibility profile, max token policy, fallback model, and owner approval, secret injection proof with target secret manager alias, API key requirement decision, rotation path, break-glass owner, access audit, and redaction result, tool-call parsing proof with Hermes <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence, quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review, telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, customer approval proof with provider terms, allowed workspace/customer, data-processing approval, support owner, evidence owner, and next review date, migration plan, missing model, unavailable endpoint, malformed tool-call output, transcript retention gap, quota exhaustion, and fallback failure containment is not generated from a production-like environment
- hosted identity session architecture is not approved, and hosted identity/session architecture evidence for customer IdP onboarding, metadata ownership, issuer/audience policy, JWKS rotation, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance and retention, rollback and lockout recovery, and customer access containment is not generated from a production-like environment
- target identity/session operations evidence for customer IdP onboarding, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance, retention, and customer access containment is not generated from a production-like environment
- hosted tenant isolation architecture is not approved, and hosted tenant isolation architecture evidence for tenant identity source, customer organization mapping, tenant-aware authorization, service-to-service tenant propagation, storage partitioning, per-tenant encryption and key ownership, backup and restore isolation, tenant administration, cross-tenant denial across API, storage, search, export, delete, backup, support, and observability, tenant-scoped telemetry and support visibility, data lifecycle isolation, migration plan, rollback, and tenant data containment is not generated from a production-like environment
- target tenant isolation operations evidence for tenant identity source, tenant-scoped authorization, storage partitioning, per-tenant encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant data containment is not generated from a production-like environment
- target secret manager architecture is not approved, and target secret manager architecture evidence for approved platform, region, tenancy boundary, owner and fallback decision, secret class inventory, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy, service binding, deny-by-default rules, rotation and revocation event proof, secret access audit logs, break-glass approval and post-use review, leakage review across logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery, migration plan, rollback, lockout recovery, and credential containment is not generated from a production-like environment
- target observability architecture is not approved, and target observability architecture evidence for approved telemetry backend, region, tenancy boundary, owner, fallback, and data residency, signal inventory for release, provider, mission, approval, runtime, security, support, and incident domains, ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events, alert routing with severity mapping, primary and secondary routes, retry policy, acknowledgement SLA, and delivery receipts, staffed on-call proof with rota, primary and backup owner, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain, log and trace retention with storage class, redaction policy, query role, customer export boundary, and deletion path, customer status communication, incident response, audit export, disaster recovery, migration plan, rollback, false-positive triage, alert fatigue, and customer communication containment is not generated from a production-like environment
- target observability operations evidence for telemetry ingestion, alert delivery, trace/log retention, staffed on-call routing and acknowledgement, customer-facing status communication, incident response, and incident review history is not generated from a production-like environment
- target deployment contract evidence for target deployment name with approved target environment name, company/workspace scope, deployment owner, evidence owner, review date, and release label, deployment profile decision with selected deployment profile, approved architecture decision, network boundary, runtime root alias, rollback owner, and customer approval reference, mandatory control evidence with every mandatory control, required command output, production readiness gate result, and unresolved blocker list, provider readiness evidence with completed provider evidence intake, target provider operations, provider account or architecture approvals, target secret injection, target-boundary live validation, quota/cost/resource guard, fallback evidence, and provider failure containment proof, identity and tenant evidence with hosted identity/session approval, target identity/session operations, hosted tenant isolation approval, target tenant isolation operations, RBAC/session audit, tenant storage boundary, encryption/key ownership, and cross-tenant denial evidence, secret and observability evidence with target secret manager approval, rotation/revocation evidence, telemetry backend, alert route, log/trace retention, target observability operations, target SLO architecture, target SLO operations, and incident review evidence, data lifecycle and support evidence with target data lifecycle approval, retention/export/delete proof, provider transcript handling, backup/restore evidence, support architecture approval, staffed support route, escalation audit, customer communication route, and incident review cadence, clean release artifact evidence with target clean deployment architecture, target clean deployment operations, clean deployment run, dependency/runtime proof, release snapshot, export package, production-like drill, artifact hygiene result, rollback proof, and failed-deployment containment, stop-condition decision with explicit stop conditions, residual blockers, accepted risks, blocker owner, remediation owner, and next review date, and production-ready claim decision with decision owner, approval or rejection summary, allowed claim text, evidence commit, snapshot path, and regeneration command references is not generated from a production-like environment
- target SLO architecture is not approved, and target SLO/SLA architecture evidence for customer-approved availability, latency, error rate, support response, maintenance window, exclusions, decision owner, error budget policy with measurement window, budget owner, burn-rate threshold, freeze rule, exception handling, review cadence, telemetry measurement proof for metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, retention period, alert acknowledgement proof with severity mapping, route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, audit record, staffed on-call proof with rota, primary and secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, customer communication proof, incident review proof, provider outage playbook proof, maintenance and degradation proof, service credit and contractual escalation proof, migration plan, rollback, communication misfire, false-positive alert, alert fatigue, and missed-SLO containment is not generated from a production-like environment
- target SLO operations evidence for customer-approved SLO/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, service credit, evidence retention, and missed-SLO containment is not generated from a production-like environment
- target data lifecycle architecture is not approved, and target data lifecycle architecture evidence for customer-approved data class matrix with legal basis, owner, retention window, exportability, delete eligibility, and exception policy, target retention configuration with enforcement timestamp, storage boundary, policy owner, reviewer, and audit record, export request proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt, delete request proof with authorization, confirmation control, execution owner, storage scope, timestamp, and audit record, provider transcript policy proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure, post-delete absence evidence across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, backup architecture proof with schedule, encrypted storage, storage class, retention class, missed-run handling, owner acknowledgement, and access audit, restore validation proof with objective, duration, restored data class inventory, integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup key ownership proof with key owner, rotation cadence, revocation, break-glass, expiry/delete evidence, and access audit, disaster recovery evidence with owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, migration plan, rollback, legal hold, delete conflict, provider transcript exception, and customer communication containment is not generated from a production-like environment
- target retention operations evidence for customer-approved data classes, target retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, and audit history, plus target backup operations evidence for backup schedule execution, encrypted backup storage, key ownership, restore validation, tenant isolation, backup expiry/deletion, disaster recovery runbook, and audit trail is not generated from a production-like environment
- production SLO/SLA operating evidence for incident/SLO policy replay, target SLO architecture and operations gates, observability telemetry and target observability operations, support escalation and target support operations, release artifact hygiene, runtime lifecycle, runtime isolation, staffed incident ownership, customer-approved SLO/SLA terms, and provider/deployment evidence is not generated from a production-like environment
- target support architecture is not approved, and target support architecture evidence for staffing model, support queue platform, severity routing, customer communication boundary, ticket audit and retention, on-call handoff, incident commander ownership, escalation and backup coverage, support data handling, incident review governance, migration plan, and missed-acknowledgement, queue-misrouting, customer-communication, ticket-audit, and unstaffed-escalation containment is not generated from a production-like environment
- target support operations evidence for staffed support coverage, support queue routing, customer communication, ticket audit history, escalation ownership, incident review cadence, on-call handoff, and closure evidence is not generated from a production-like environment
- target clean deployment architecture is not approved, and target clean deployment architecture evidence for source provenance proof with branch, commit, review owner, build actor, release tag, and tamper-control decision, artifact registry proof with immutable artifact id, sha256, registry path, retention policy, access owner, and promotion rule, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, and bootstrap owner, secret injection proof with target secret manager alias, injection path, rotation state, redaction check, break-glass owner, and access audit, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration and data readiness proof with migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, migration plan, dependency drift, failed bootstrap, failed secret injection, rollback failure, and misleading release approval containment is not generated from a production-like environment
- target clean deployment operations evidence for source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, evidence retention, and failed-deployment containment is not generated from a production-like environment
- clean deployment release evidence for clean checkout proof with source branch, source commit, tracked-file mode, file count, excluded runtime state, and clean checkout owner, command replay proof with incident/SLO, identity/session, tenant, support, secret, observability, SLO, data lifecycle, clean deployment architecture and operations, retention, backup, provider, target deployment contract, artifact hygiene, runtime lifecycle, runtime isolation, pilot export, and package validation results, artifact synchronization proof with source commit, execution snapshot, clean deployment release artifact, production-like drill, pilot export package, release artifact hygiene, and artifact-sync-current status, production-like environment proof with approved target boundary, runtime bootstrap, secret injection, dependency install, environment boundary, rollback point, release approval, operator, and timestamp, and failure containment for stale checkout, dependency drift, local runtime leakage, missing artifact, failed smoke, failed hygiene, failed rollback, and misleading production-ready claim is not generated from a production-like environment

Production-ready must not be claimed from the current state.

## Required Commands Before Changing Release Label

Preflight:

```bash
npm run preflight:execution-v1:all
```

Live validation:

```bash
export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai
export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic
export LOCAL_PROVIDER_MODEL="..." && npm run live:execution-v1:local
export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes
```

Evidence refresh:

```bash
npm run refresh:execution-v1-artifacts
```

`refresh:execution-v1-artifacts` is the default release artifact refresh path because it preserves archived live provider proof and reuses the current evidence document's selected `--live-*` flags. Use the lower-level `node scripts/build-execution-v1-evidence.mjs --live-<provider>` flow only when intentionally replacing live provider proof for selected providers. Do not run deterministic-only evidence generation when preserving archived live provider proof matters.

Verification:

```bash
npm run smoke:execution-v1-artifact-refresh
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:execution-v1-handoff
npm run smoke:pilot-export-package
npm run smoke:production-readiness-gate
npm run drill:production-like-release
npm run smoke:production-like-release-drill
npm run smoke:runtime-isolation
npm run rehearsal:production-provider-readiness
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
npm run smoke:target-provider-operations
npm run smoke:target-openai-provider-account
npm run smoke:target-anthropic-provider-account
npm run smoke:target-local-provider-architecture
npm run smoke:target-hermes-provider-architecture
npm run smoke:hosted-saas-architecture-decision
npm run smoke:hosted-identity-session-architecture
npm run smoke:target-identity-session-operations
npm run smoke:hosted-tenant-isolation-architecture
npm run smoke:target-tenant-isolation-operations
npm run rehearsal:production-enterprise-controls
npm run smoke:production-enterprise-controls
npm run smoke:identity-session-admin
npm run smoke:tenant-storage-admin
npm run smoke:target-environment-evidence-intake
npm run smoke:retention-delete-policy
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
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
npm run smoke:target-retention-operations
npm run smoke:target-backup-operations
npm run smoke:target-clean-deployment-architecture
npm run smoke:target-clean-deployment-operations
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
npm run rehearsal:clean-deployment-release
npm run smoke:clean-deployment-release
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:ui-harness-browse
git diff --check
```

Artifact hygiene:

```bash
rg -n "(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})" README.md docs scripts src package.json || true
rg -n "/Users/[^/\\s]+|/(private/)?var/folders/" docs/execution-v1-handoff.md docs/releases/execution-v1 docs/execution-v1-evidence.md docs/execution-v1-closeout.md || true
```

## Release Decision Template

Use this when updating the decision after live validation.

```text
Decision date:
Release label:
Validated providers:
Deployment boundary:
Evidence path:
Closeout path:
Handoff path:
Snapshot path:
Artifact hygiene result:
Open blockers:
Accepted risks:
Decision owner:
Next review date:
```

## Current Open Blockers

- Anthropic live validation remains blocked until target Anthropic provider account evidence for billing and credit remediation, active billing plan, available credit balance, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, provider terms and customer approval, quota and spend guard, target-boundary npm run live:execution-v1:anthropic pass, mission and execution session provenance, telemetry, fallback and stop-condition decision, remediation audit, release artifact hygiene result, and regenerated execution snapshot is recorded
- target local provider architecture remains blocked until endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence are recorded
- Hermes live validation is blocked until target Hermes provider architecture evidence for endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and target-boundary Hermes live validation is recorded
- target deployment contract is blocked until hosted identity/session administration, target identity/session operations, tenant storage/encryption, target tenant isolation operations, target provider operations, target OpenAI provider account, target Anthropic provider account, target local provider architecture, target Hermes provider architecture, target secret manager injection/audit, target observability architecture/operations, target SLO architecture, target SLO operations, target data lifecycle architecture, target retention operations, target backup operations, target support architecture, target support operations, target clean deployment architecture, target clean deployment operations, SLO/SLA, clean deployment, and support escalation review have target-environment evidence
- production release label cannot be claimed until all target production providers and enterprise controls are verified

## Current Closeout

The planning pack and release artifacts are complete enough to support a controlled OpenAI-backed self-hosted/local-first pilot.

The product is not yet ready to be sold or represented as production-ready for other companies.
