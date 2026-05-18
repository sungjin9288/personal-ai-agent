# Target Environment Evidence Intake v1

- status: local-target-environment-evidence-intake-current
- localDate: 2026-05-06
- scope: target environment identity, tenant storage, secrets, observability, retention, backup, support, clean deployment, and release decision evidence intake contract
- productionReadyClaim: false
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedTargetProviderOperations: [target-provider-operations-v1.md](target-provider-operations-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
- relatedHostedIdentitySessionArchitecture: [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md)
- relatedTargetIdentitySessionOperations: [target-identity-session-operations-v1.md](target-identity-session-operations-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedTargetTenantIsolationOperations: [target-tenant-isolation-operations-v1.md](target-tenant-isolation-operations-v1.md)
- relatedTargetSecretManagerArchitecture: [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md)
- relatedTargetObservabilityArchitecture: [target-observability-architecture-v1.md](target-observability-architecture-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedTargetSloOperations: [target-slo-operations-v1.md](target-slo-operations-v1.md)
- relatedTargetSupportArchitecture: [target-support-architecture-v1.md](target-support-architecture-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedTargetCleanDeploymentArchitecture: [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md)
- relatedTargetCleanDeploymentOperations: [target-clean-deployment-operations-v1.md](target-clean-deployment-operations-v1.md)

## Decision Boundary

This gate defines the target environment evidence packet required before the system can be described as production-ready for another company.

It is not hosted production evidence, not a completed customer deployment, not SaaS architecture approval, and not permission to claim `production-ready`.

Production-ready remains blocked until every target environment domain below has evidence from the approved production-like or hosted deployment boundary and the release evidence is regenerated from that boundary.

## Required Evidence Packet

| Domain | Required Proof | Current Local Evidence | Status |
| --- | --- | --- | --- |
| Deployment boundary | target environment name, owner, deployment profile, network boundary, runtime root, and rollback owner are recorded | target deployment contract and clean local rehearsal exist | blocked |
| Identity and sessions | user lifecycle, session lifecycle, role assignment/revocation, logout/revocation behavior, audit trail, target identity session operations evidence, and customer IdP proof are proven | local identity, OIDC/JWKS, shared-secret, RBAC, hosted identity architecture, and target identity session operations gates pass | blocked |
| Tenant storage and encryption | tenant partitioning, tenant admin workflow, per-tenant encryption/key policy, backup/restore isolation, cross-tenant denial, target tenant isolation operations evidence, and tenant data containment proof are proven | tenant storage admin, tenant lifecycle, runtime isolation, hosted tenant architecture, and target tenant isolation operations gates pass locally | blocked |
| Provider and secret manager | provider account approval, OpenAI provider account approval when OpenAI is included, Anthropic provider account approval when Anthropic is included, local provider architecture approval when local provider is included, Hermes provider architecture approval when Hermes is included, target provider operations evidence, target secret manager injection, rotation, break-glass, revocation, and live validation are proven | target provider intake, target provider operations, target OpenAI provider account, target Anthropic provider account, target local provider architecture, target Hermes provider architecture, secret management, target secret manager, and artifact hygiene gates pass locally | blocked |
| Observability and SLO/SLA | target SLO architecture approval, target SLO operations evidence, telemetry backend approval, telemetry ingestion, alert delivery, log/trace retention, staffed on-call routing, incident review, and customer SLO/SLA review are proven | target SLO architecture, target SLO operations, observability telemetry, target observability architecture, target observability operations, incident policy, and SLO rehearsal pass locally | blocked |
| Retention, export, delete, and backup | data lifecycle architecture approval, customer-approved data classes, export approval, delete workflow, provider transcript policy, post-delete absence, backup expiry, restore validation, and DR runbook are proven | retention/delete, target data lifecycle architecture, target retention, backup/restore, target backup, and retention operating gates pass locally | blocked |
| Support operations | target support architecture approval, support owner, staffed coverage, support queue routing, customer communication, ticket audit history, escalation review, and on-call handoff are proven | support operations, support escalation review, target support architecture, and target support gates pass locally | blocked |
| Clean release and artifact hygiene | clean deployment architecture approval, target clean deployment operations evidence, clean checkout deployment, dependency/runtime proof, rollback proof, release snapshot, export package, and hygiene report are generated from the target boundary | target clean deployment architecture, target clean deployment operations, clean local release rehearsal, production-like drill, pilot export package, and hygiene pass locally | blocked |

## Intake Checklist

Every target environment review must record:

- completed target environment evidence capture template for the approved production-like or hosted boundary
- target environment name, owner, profile, and deployment boundary
- target identity session operations evidence for customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, audit export, break-glass, support impersonation, compliance, and retention
- completed target identity/session operations evidence capture template for the approved production-like or hosted boundary
- target tenant isolation operations evidence for tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant data containment
- completed target tenant isolation operations evidence capture template for the approved production-like or hosted boundary
- selected production providers and completed provider evidence intake references
- target OpenAI provider account approval when OpenAI is included
- target Anthropic provider account approval when Anthropic is included
- target local provider architecture approval when local provider is included
- target Hermes provider architecture approval when Hermes is included
- identity provider, role owner, session policy, and permission audit evidence
- tenant storage boundary, encryption/key policy, backup/restore isolation, and tenant admin evidence
- target provider operations evidence for account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment
- target secret manager aliases, rotation evidence, revocation path, and break-glass approval
- target SLO/SLA terms, error budget owner, telemetry backend, alert route, on-call owner, customer status route, and incident review record
- target SLO operations evidence for customer-approved SLO/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, service credit, evidence retention, and missed-SLO containment
- retention classes, export approval, delete execution proof, provider transcript policy, and post-delete absence evidence
- backup schedule, restore validation, backup expiry/deletion, and disaster recovery evidence
- target support architecture approval, support queue, staffed coverage, escalation owner, ticket audit trail, and incident review cadence
- clean deployment architecture approval, target clean deployment operations evidence, clean deployment run, rollback proof, release snapshot, export package, artifact hygiene result, and failed-deployment containment
- completed target environment evidence submission packet with sanitized manifest, evidence register, reviewer decision, command rerun log, and residual blocker register
- completed target blocker disposition register with owner, current state, required closing evidence, allowed claim impact, and next verification command
- accepted risks, decision owner, and next review date
- `productionReadyClaim` remains false unless all mandatory target deployment controls are satisfied by target evidence

## Target Evidence Capture Template

When a production-like or hosted target boundary is ready for review, fill this template with target-boundary evidence. Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, customer personal data, tenant payloads, or machine-local absolute paths.

| Field | Required Value | Completion Rule |
| --- | --- | --- |
| targetEnvironmentName | approved environment name, environment owner, customer/workspace scope, deployment profile, network boundary, runtime root alias, and rollback owner | must name the exact production-like or hosted boundary where evidence was generated |
| deploymentBoundaryEvidence | target deployment contract reference, release label, deployment run id or equivalent, runtime/dependency proof, rollback proof, and clean checkout evidence | must prove release artifacts were generated from the approved target boundary, not from an unrelated local run |
| identitySessionEvidence | customer IdP proof, user lifecycle, session lifecycle, role assignment/revocation, permission propagation, audit export, break-glass, support impersonation, compliance, and retention evidence | must reference target identity session operations evidence generated from the same boundary |
| tenantIsolationEvidence | tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant data containment evidence | must prove tenant data isolation and key ownership without exposing tenant payloads |
| providerSecretEvidence | selected providers, completed provider evidence intake references, provider account/architecture approvals, target secret manager aliases, rotation proof, revocation path, break-glass approval, and target-boundary live validation evidence | must prove provider credentials and provider live validation are target-approved without exposing secret values |
| observabilitySloEvidence | SLO/SLA terms, error budget owner, telemetry backend, telemetry ingestion, alert route, alert acknowledgement, on-call owner, customer status route, incident review, provider outage handling, and missed-SLO containment | must prove staffed monitoring and customer-facing SLO handling from target telemetry |
| retentionBackupEvidence | retention classes, export approval, delete execution proof, provider transcript policy, post-delete absence evidence, backup schedule, restore validation, backup expiry/deletion, and disaster recovery evidence | must prove lifecycle controls and DR evidence for the target customer boundary |
| supportOperationsEvidence | target support architecture approval, support queue, staffed coverage, escalation owner, ticket audit trail, customer communication, on-call handoff, and incident review cadence | must prove support ownership and escalation routing are staffed for the target release |
| cleanReleaseEvidence | target clean deployment operations evidence, clean deployment run, dependency/runtime proof, release snapshot, pilot/export package, artifact hygiene result, rollback proof, and failed-deployment containment | must reference passed clean deployment, release drill, export package, and hygiene evidence for the same target review |
| acceptedRiskDecision | accepted risks, residual blockers, decision owner, evidence owner, next review date, and explicit productionReadyClaim decision | must keep `productionReadyClaim` false unless every mandatory target deployment control is satisfied by target evidence |

The completed template is still not sufficient for `production-ready` by itself. It must be paired with target deployment contract, target provider evidence intake, target provider operations, target identity/session operations, target tenant isolation operations, target SLO operations, target clean deployment operations, release artifact hygiene, and production readiness gate evidence.

## Target Evidence Submission Packet

After the target evidence capture template is filled, operators must package the proof as a sanitized submission packet for review. Do not attach raw tenant payloads, customer personal data, provider secret values, raw API tokens, private endpoint credentials, private tenant identifiers, billing identifiers, or machine-local absolute paths.

| Packet Item | Required Content | Completion Rule |
| --- | --- | --- |
| submissionManifest | packet id, target environment name, company/workspace scope, deployment boundary, evidence owner, reviewer, source commit, generated artifact commit, review date, and packet status | must identify the exact target boundary and artifact set under review |
| sanitizedEvidenceRegister | repository-relative evidence paths, external system aliases, redaction notes, sha256 or signed export reference, evidence owner, and retention class | must prove every evidence reference is sanitized, reproducible, and free of local machine paths or secret values |
| boundaryConsistencyMap | deployment boundary, identity/session boundary, tenant isolation boundary, provider/secret boundary, observability/SLO boundary, retention/backup boundary, support boundary, and clean release boundary | must prove every evidence domain was generated from the same approved target boundary or explicitly record an accepted exception |
| commandRerunLog | required command list, command owner, target boundary execution date, pass/fail result, artifact path, and retry/remediation note | must include fresh results for every required smoke/release command after target evidence is attached |
| reviewerDecisionRecord | reviewer, decision owner, accepted risks, rejected claims, residual blockers, allowed claim text, next review date, and productionReadyClaim decision | must keep `productionReadyClaim` false unless every mandatory target control has target-boundary evidence |
| blockerDispositionRegister | Anthropic billing/live validation, target Hermes provider approval, target local provider approval, hosted identity/session approval, hosted tenant isolation approval, target tenant evidence, target environment evidence, and any customer-specific exception | must record whether each blocker is resolved, accepted with scope, or still blocking before any release claim changes |
| releaseRefreshEvidence | execution evidence, closeout, handoff, immutable snapshot, pilot export package, production-like release drill, clean deployment release, release readiness, artifact hygiene, and production readiness gate references | must prove all review artifacts were regenerated after the target evidence packet was accepted |

The submission packet is the review envelope for target evidence, not the evidence itself. A packet without target-boundary proof, rerun command evidence, reviewer decision, and release refresh evidence remains blocked.

## Target Blocker Disposition Register

Every target evidence submission must include a blocker disposition register. The register must use public aliases or repository-relative references only; do not record customer personal data, private tenant identifiers, billing identifiers, raw provider account ids, secret names that reveal credentials, raw endpoint credentials, or machine-local absolute paths.

| Blocker | Current State | Required Closing Evidence | Claim Impact |
| --- | --- | --- | --- |
| Anthropic billing/live validation | still-blocking | target Anthropic provider account approval, billing/credit remediation proof, target secret injection, target-boundary `live:execution-v1:anthropic` pass, provider operations evidence, release artifact hygiene, and regenerated execution-v1 artifacts | Anthropic must not be included in a live-provider-complete or production-ready claim |
| target Hermes provider approval | configuration-required | target Hermes provider architecture approval, endpoint ownership, model pinning, target secret injection proof, tool-call parsing proof, session lifecycle/provenance, transcript policy, quota guard, telemetry, fallback/customer approval, target-boundary `live:execution-v1:hermes` pass, provider operations evidence, and regenerated release artifacts | Hermes must remain excluded from production provider claims |
| target local provider approval | customer-approval-required | target local provider architecture approval, target-boundary endpoint/model ownership, network isolation, data residency, quota/resource guard, telemetry, fallback evidence, target-boundary local provider live validation pass, and customer acceptance | local provider can remain pilot/local-only but cannot be production-approved |
| hosted identity/session approval | customer-approval-required | hosted identity/session architecture approval, customer IdP onboarding, user lifecycle, session lifecycle, role administration, audit export, break-glass, support impersonation, compliance, and retention proof | hosted identity/session claims remain blocked |
| hosted tenant isolation approval | customer-approval-required | hosted tenant isolation architecture approval, tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant containment proof | hosted multi-tenant isolation claims remain blocked |
| target tenant evidence | target-evidence-required | completed target tenant isolation operations evidence capture template, negative cross-tenant test matrix, tenant storage/encryption proof, backup/restore non-interference proof, lifecycle proof, artifact hygiene, and production readiness gate result | tenant-isolated production claims remain blocked |
| target environment evidence | target-evidence-required | completed target evidence capture template, sanitized submission packet, boundary consistency map, command rerun log, reviewer decision, blocker disposition register, release refresh evidence, and production readiness gate result | productionReadyClaim must remain false |
| customer-specific exceptions | accepted-scope-required | explicit exception owner, customer-approved scope, expiry date, compensating control, allowed claim text, next review date, and release readiness note | exceptions cannot convert a blocked production-ready claim into production-ready |

Blocker disposition is a stop-condition input, not a waiver. A blocker can move to `accepted-scope-required` only when the allowed claim text remains narrower than `production-ready`, the exception owner is recorded, and release readiness is regenerated. A blocker can move to `closed` only after target-boundary evidence is attached, the relevant target smoke passes, release artifact hygiene passes, and execution evidence, closeout, handoff, immutable snapshot, pilot export package, production-like release drill, clean deployment release, and production readiness gate are regenerated.

## Blocker Closure Verification Matrix

Every blocker disposition change must carry a matching verification row. The verification row is the audit trail for the next command to run, the evidence packet that must be attached, and the stop-condition that remains in force when the command is missing, stale, or generated from the wrong boundary.

| Blocker | Next Verification Command | Required Closing Evidence | Stop Condition |
| --- | --- | --- | --- |
| Anthropic billing/live validation | `npm run smoke:target-anthropic-provider-account` and target-boundary `npm run live:execution-v1:anthropic` | account approval, billing/credit remediation proof, target secret injection proof, provider operations evidence, release artifact hygiene pass, and regenerated execution-v1 artifacts | `anthropic-live-validation-missing-or-failed` |
| target Hermes provider approval | `npm run smoke:target-hermes-provider-architecture` and target-boundary `npm run live:execution-v1:hermes` | endpoint ownership, model pinning, target secret injection proof, tool-call parsing proof, session lifecycle/provenance, transcript policy, quota guard, telemetry, fallback/customer approval, Hermes live validation pass, release artifact hygiene pass, and regenerated release artifacts | `target-hermes-provider-approval-missing` |
| target local provider approval | `npm run smoke:target-local-provider-architecture` and target-boundary `npm run live:execution-v1:local` | customer approval, target-boundary endpoint/model ownership, network isolation, data residency, quota/resource guard, telemetry, fallback evidence, target-boundary local provider live validation pass, and acceptance record | `target-local-provider-approval-missing` |
| hosted identity/session approval | `npm run smoke:hosted-identity-session-architecture` and `npm run smoke:target-identity-session-operations` | hosted identity architecture approval, customer IdP onboarding, user lifecycle, session lifecycle, role administration, audit export, break-glass, support impersonation, compliance, and retention proof | `hosted-identity-session-approval-missing` |
| hosted tenant isolation approval | `npm run smoke:hosted-tenant-isolation-architecture` and `npm run smoke:target-tenant-isolation-operations` | hosted tenant architecture approval, tenant identity, authorization, storage partitioning, encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and containment proof | `hosted-tenant-isolation-approval-missing` |
| target tenant evidence | `npm run smoke:target-tenant-isolation-operations` and `npm run smoke:production-readiness-gate` | completed tenant isolation evidence capture template, negative cross-tenant test matrix, tenant storage/encryption proof, backup/restore non-interference proof, lifecycle proof, artifact hygiene pass, and production readiness gate result | `target-tenant-evidence-missing` |
| target environment evidence | `npm run smoke:target-environment-evidence-intake` and `npm run smoke:production-readiness-gate` | completed target evidence capture template, sanitized submission packet, boundary consistency map, command rerun log, reviewer decision, blocker disposition register, release refresh evidence, and production readiness gate result | `target-environment-evidence-missing` |
| customer-specific exceptions | `npm run smoke:target-environment-evidence-intake` and `npm run smoke:release-artifact-hygiene` | exception owner, customer-approved scope, expiry date, compensating control, allowed claim text, next review date, release readiness note, and regenerated release artifacts | `customer-exception-scope-missing` |

The closure matrix is mandatory for any blocker state transition. A closure row without fresh command evidence, matching target boundary, release artifact hygiene, and regenerated release artifacts must keep `productionReadyClaim: false` and must be recorded as a stop-condition.

## Required Commands

```bash
npm run smoke:target-environment-evidence-intake
npm run smoke:target-identity-session-operations
npm run smoke:target-provider-evidence-intake
npm run smoke:target-provider-operations
npm run smoke:target-openai-provider-account
npm run smoke:target-anthropic-provider-account
npm run smoke:target-local-provider-architecture
npm run smoke:target-hermes-provider-architecture
npm run smoke:hosted-identity-session-architecture
npm run smoke:hosted-tenant-isolation-architecture
npm run smoke:target-tenant-isolation-operations
npm run smoke:target-secret-manager-architecture
npm run smoke:target-secret-manager
npm run smoke:target-observability-architecture
npm run smoke:target-observability-operations
npm run smoke:target-slo-architecture
npm run smoke:target-slo-operations
npm run smoke:target-support-architecture
npm run smoke:target-support-operations
npm run smoke:target-data-lifecycle-architecture
npm run smoke:target-retention-operations
npm run smoke:target-backup-operations
npm run smoke:target-clean-deployment-architecture
npm run smoke:target-clean-deployment-operations
npm run smoke:target-deployment-contract
npm run smoke:production-readiness-gate
npm run smoke:clean-deployment-release
npm run smoke:production-like-release-drill
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Production Gap

This is a local target environment evidence intake contract. It does not prove hosted identity/session administration, hosted tenant storage or encryption, target secret injection, target telemetry, staffed on-call, target retention enforcement, production backup execution, staffed support operations, clean production deployment, or release approval.

Target environment readiness remains blocked for production-ready claims until this evidence packet is completed from the approved production-like or hosted target environment and execution evidence, closeout, handoff, snapshot, pilot export package, production-like release drill, clean deployment release, and release readiness docs are regenerated from that evidence.
