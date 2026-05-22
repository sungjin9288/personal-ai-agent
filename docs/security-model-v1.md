# Security Model v1

- status: draft-source-of-record
- localDate: 2026-05-04
- scope: self-hosted local-first pilot
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedHostedIdentitySessionArchitecture: [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedTargetRetentionOperations: [target-retention-operations-v1.md](target-retention-operations-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)
- relatedTargetSecretManagerArchitecture: [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md)
- relatedTargetObservabilityArchitecture: [target-observability-architecture-v1.md](target-observability-architecture-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedTargetCleanDeploymentArchitecture: [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md)
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-handoff.md](execution-v1-handoff.md)

## Security Position

v1 is a self-hosted local-first multi-agent engineering harness. The security model is based on controlled local execution, explicit approval gates, provider preflight, auditable artifacts, and operator-owned credentials.

This is not yet a hosted multi-tenant SaaS security model. OpenAI live validation is archived for the current scoped pilot, but production claims require expanded target-provider validation, documented RBAC enforcement, tenant isolation verification, retention/export procedures, and deployment hardening.

## Trust Boundaries

- operator workstation: trusted execution environment for CLI, UI, local files, runtime state, and provider env values
- workspace repository: semi-trusted project data; agent may read it as task context but must not mutate production systems without approval
- mission attachments: untrusted input; attachment content can guide reasoning but must not override system, developer, workspace, or operator instructions
- provider API: external boundary; prompts, selected context, and outputs cross this boundary only when a non-stub provider is selected and configured
- local provider endpoint: operator-controlled network boundary; must be treated like an external provider unless explicitly isolated
- release artifacts: shareable evidence boundary; must avoid real credentials, machine-local temp paths, and raw provider secrets
- browser UI: local operator surface; actions that mutate release artifacts or start execution must remain explicit

## Data Classes

| Class | Examples | Default Handling |
| --- | --- | --- |
| Public project metadata | command names, provider ids, smoke status | safe to show in UI/docs |
| Workspace content | source files, docs, issues, run context | local-first, least-context retrieval, evidence references |
| Mission artifacts | plans, reviewer results, retrieval snippets, execution records | persisted locally, auditable by mission/session |
| Provider configuration | env key names, model ids, base URLs | env names may be shown; values must not be persisted in docs |
| Credentials/secrets | API keys, bearer tokens, private keys | never write to tracked docs, release artifacts, or logs |
| Incident/security evidence | failures, approvals, escalations, live validation results | persist summaries; redact secret-bearing payloads |

## Tenant And Workspace Isolation

Current v1 behavior is workspace-scoped inside one local runtime. A workspace represents a trusted local project root selected by the operator.

Current guarantees:

- mission, memory, provider, approval, and evidence records are tied to workspace and mission ids
- execution-v1 evidence is generated from the current repository state and archived into immutable snapshot paths
- external reference code is treated as design input and not vendored by default

Pilot policy:

- one customer or company environment should run one isolated runtime data directory
- do not mix unrelated customers in the same `var/` state root
- do not share release artifacts externally until the credential/path leak scan passes
- workspace roots must be explicitly registered by an operator
- `smoke:runtime-isolation` verifies that two isolated runtime roots do not share workspace, mission, memory, export, or deletion state

Production gap:

- hosted tenant isolation is not implemented
- API tenant/workspace binding is available only behind `PERSONAL_AI_AGENT_TENANT_MODE=enforce` and OIDC tenant claims; per-tenant encryption, separate auth realms, backup isolation, and centralized tenant administration are out of v1 scope
- cloud SaaS mode requires a separate architecture decision record before implementation
- [target-deployment-contract-v1.md](target-deployment-contract-v1.md) defines the mandatory target evidence for hosted identity, tenant storage, encryption, target secret manager, target retention operations, backup, SLO/SLA, clean deployment, target support architecture, target support operations, and support escalation review before any hosted production claim
- [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md) defines the hosted identity/session architecture contract for customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target evidence gap
- [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md) defines the hosted tenant isolation architecture contract for tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-aware authorization proof, service-to-service tenant propagation proof, storage partitioning proof, artifact/memory/search/export/index partitioning proof, per-tenant encryption/key ownership proof, backup/restore isolation proof, tenant administration approval/audit proof, cross-tenant denial proof, observability/support isolation proof, lifecycle isolation proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target evidence gap
- [identity-session-admin-v1.md](identity-session-admin-v1.md) defines the local identity/session administration gate for identity controls, session lifecycle, role assignment/revocation audit packets, and the remaining hosted identity production gap
- [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md) defines the local tenant storage administration gate for tenant storage controls, tenant admin operations, backup/restore isolation requirements, and the remaining hosted tenant isolation production gap
- [target-retention-operations-v1.md](target-retention-operations-v1.md) defines the local target retention operations evidence contract for customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target lifecycle production gap
- [target-backup-operations-v1.md](target-backup-operations-v1.md) defines the local target backup operations evidence contract for backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry/deletion proof, disaster recovery proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target backup production gap
- [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md) defines the target data lifecycle architecture contract for customer data classes, retention enforcement, export boundary, delete workflow, provider transcript handling, post-delete absence, backup architecture, restore isolation, key ownership, disaster recovery, and the remaining target evidence gap
- [target-support-operations-v1.md](target-support-operations-v1.md) defines the local target support operations evidence contract for staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target support production gap
- [target-support-architecture-v1.md](target-support-architecture-v1.md) defines the local target support architecture decision contract for staffing model, support queue, routing, customer communication, ticket audit, on-call handoff, incident commander ownership, escalation, support data handling, and incident review governance before any target support readiness claim
- [secret-management-v1.md](secret-management-v1.md) defines the local secret-management gate for secret classes, injection rules, redaction/hygiene rules, rotation checklist, and the remaining production secret manager gap
- [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md) defines the target secret manager architecture contract for approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target evidence gap
- [target-secret-manager-v1.md](target-secret-manager-v1.md) defines the local target secret manager evidence contract for secret manager controls, rotation evidence packets, break-glass rules, and the remaining target injection/audit gap
- [observability-telemetry-v1.md](observability-telemetry-v1.md) defines the local observability telemetry gate for release status, snapshot integrity, provider readiness, artifact hygiene, runtime lifecycle, incident queue signals, and the remaining hosted telemetry gap
- [target-observability-architecture-v1.md](target-observability-architecture-v1.md) defines the target observability architecture contract for approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, retention proof, customer communication proof, incident response proof, audit export proof, disaster recovery proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target evidence gap
- [target-observability-operations-v1.md](target-observability-operations-v1.md) defines the local target observability operations evidence contract for telemetry ingestion proof, alert delivery proof, retention proof, staffed on-call routing and acknowledgement proof, customer status communication proof, incident response proof, incident review proof, audit export proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target operations gap
- [target-slo-architecture-v1.md](target-slo-architecture-v1.md) defines the target SLO/SLA architecture contract for customer-approved SLO/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call proof, customer communication proof, incident review proof, provider outage playbook proof, maintenance/degradation proof, service credit proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target evidence gap
- [target-slo-operations-v1.md](target-slo-operations-v1.md) defines the target SLO operations evidence contract for customer-approved SLO/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene, and regenerated execution snapshot evidence while keeping production SLO/SLA claims blocked
- [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md) defines the target clean deployment architecture contract for source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback, release approval, and the remaining target evidence gap
- [target-clean-deployment-operations-v1.md](target-clean-deployment-operations-v1.md) defines the target clean deployment operations evidence contract for source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, and failed-deployment containment while keeping production clean deployment claims blocked

## RBAC Matrix

| Role | Allowed Actions | Restricted Actions |
| --- | --- | --- |
| Viewer | read evidence, closeout, handoff, run history, provider readiness summaries | cannot create missions, approve execution, change provider config |
| Operator | create missions, run stub/local deterministic flows, inspect provider preflight, refresh evidence | cannot approve risky execution unless also an approver |
| Approver | approve or reject risky execution leases, resolve approval inbox items, record approval reasons | cannot bypass audit records or mutate approval history |
| Admin | configure provider env in deployment environment, register workspaces, manage retention/export policy | cannot embed secrets into tracked docs or release artifacts |

Current implementation note:

- The web API now supports optional local shared-secret authentication with `PERSONAL_AI_AGENT_WEB_AUTH_MODE=enforce` and `PERSONAL_AI_AGENT_WEB_AUTH_TOKEN`, accepting either `Authorization: Bearer ...` or `x-personal-ai-agent-auth-token`.
- The web API now supports optional OIDC/JWKS bearer authentication with `PERSONAL_AI_AGENT_WEB_AUTH_MODE=oidc`, `PERSONAL_AI_AGENT_OIDC_ISSUER`, `PERSONAL_AI_AGENT_OIDC_AUDIENCE`, `PERSONAL_AI_AGENT_OIDC_JWKS_URL`, and `PERSONAL_AI_AGENT_OIDC_ROLE_CLAIM`, verifying RS256 signature, issuer, audience, expiry, and token-derived RBAC role.
- Identity/session administration is covered by `smoke:identity-session-admin`, which documents login, expiry, logout, revocation, role change, and audit packet requirements without claiming hosted identity lifecycle management.
- The web API supports optional local RBAC enforcement with `PERSONAL_AI_AGENT_RBAC_MODE=enforce` and `x-personal-ai-agent-role`.
- The enforced role contract is covered by `smoke:web-rbac`: viewer can read only, operator can create/run normal local work, approver can resolve approvals, and admin is required for workspace registration, release refresh/snapshot, and delete operations.
- The authenticated local role contract is covered by `smoke:web-auth-rbac`: missing or invalid tokens are rejected before RBAC, authenticated viewer mutations are still blocked, and authenticated operator mutations can proceed.
- The OIDC role contract is covered by `smoke:web-oidc-rbac`: missing tokens and invalid audience tokens are rejected, token role claims drive RBAC, and a viewer token cannot escalate by spoofing `x-personal-ai-agent-role`.
- The API tenant isolation contract is covered by `smoke:web-tenant-isolation`: OIDC `tenant_id` claims bind workspace creation, filter workspace and mission lists, block cross-tenant mission creation/read, and ignore spoofed tenant headers.
- Tenant storage administration is covered by `smoke:tenant-storage-admin`, which documents tenant storage partitioning, tenant admin operations, backup/restore isolation, and audit packet requirements without claiming hosted tenant storage or encryption.
- [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md) records local enterprise controls evidence by replaying identity/session administration, shared-secret auth, OIDC/JWKS auth, RBAC, artifact hygiene, runtime isolation, and provider readiness checks together while preserving the hosted identity and tenant isolation production gap.
- The CLI remains a local operator tool and does not yet provide user/session identity. Hosted or shared deployments still require identity-backed authentication, session lifecycle, and persistent role assignment outside this local shared-secret gate.

Pilot-ready requirement:

- document who holds each role for the pilot
- ensure risky execution approval is performed by an explicit approver
- keep provider secret injection limited to admin-controlled shells or deployment secrets

Production gap:

- hosted identity-backed users are supported only through OIDC/JWKS bearer validation at the local web API boundary, and tenant claims can bind API workspace/mission access in enforced mode; session lifecycle, persistent role assignment administration, centralized permission administration, per-tenant storage encryption, backup isolation, and hosted tenant administration are not yet implemented as a hosted control-plane feature

## Secret Handling

Rules:

- provider credentials must be injected through environment variables or the deployment secret manager
- provider credential values must not be committed, stored in release artifacts, copied into docs, or pasted into mission attachments
- evidence may mention required env variable names, but never their values
- provider live validation output must be reviewed before sharing outside the operator environment
- local provider base URLs may reveal infrastructure shape and should be treated as internal configuration
- `smoke:secret-management` verifies the local pilot secret-management policy surface while keeping target secret manager injection, rotation, audit, and revocation as production blockers
- `smoke:target-secret-manager` verifies the target secret manager evidence contract while keeping actual target secret manager injection, access policy, audit, break-glass, and revocation evidence as production blockers

Required scans before handoff:

```bash
rg -n "(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})" README.md docs scripts src package.json || true
rg -n "/Users/[^/\\s]+|/(private/)?var/folders/" docs/execution-v1-handoff.md docs/releases/execution-v1 docs/execution-v1-evidence.md docs/execution-v1-closeout.md || true
```

Current status:

- execution-v1 handoff records missing env names only
- `smoke:release-artifact-hygiene` and `smoke:production-readiness-gate` now scan current execution-v1 evidence, closeout, handoff, and the verified immutable snapshot for credential patterns and machine-local path leaks
- OpenAI live validation is archived without credential values in shareable release artifacts

## Tool Permission Model

Default policy:

- read-only repository inspection is low risk
- writing docs, local evidence, and local artifacts is allowed when scoped to the current task
- execution that can mutate source files, shell state, external systems, production data, git history, or deployment state requires explicit operator intent or approval
- destructive git operations, schema/data migrations, production deploys, and commit/push actions require explicit confirmation
- provider-backed live runs require approved credentials and should be recorded in evidence after completion

Agent runtime implication:

- managed role order remains `manager -> planner -> executor -> reviewer`
- reviewer and approval records are required for risky engineering execution proposals
- specialist fan-out is bounded by configured orchestration profiles and does not create unbounded autonomous agents

## Prompt And Input Boundary

Mission attachments, converted documents, memory entries, retrieved snippets, provider outputs, and external reference content are untrusted data.

Rules:

- untrusted content must not override higher-priority instructions
- adversarial attachment text should be quoted or summarized, not treated as executable instruction
- retrieval artifacts should preserve source labels so operators can inspect why a snippet was used
- external reference repositories are design input only; direct code vendoring requires explicit review
- generated plans must separate assumptions, success criteria, and verification

Current implementation support:

- instruction-boundary smoke coverage exists
- retrieval memory and fact graph evidence preserve source/provenance data
- reference adoption gate includes instruction-boundary, retrieval, fact graph, provider guard, Hermes provider, and process timeout coverage

## Audit And Evidence

Auditable records:

- mission sessions
- manager/planner/executor/reviewer artifacts
- approvals and approval decisions
- provider preflight/live helper output
- specialist follow-up and escalation records
- maintenance runs and reminders
- execution-v1 evidence, closeout, handoff, and immutable snapshots
- incident severity, SLO triage commands, owner, evidence, and closure records defined in [incident-slo-v1.md](incident-slo-v1.md)
- support escalation routes, audit packet requirements, incident review cadence, and customer-safe update rules defined in [support-escalation-review-v1.md](support-escalation-review-v1.md)

Policy:

- every release decision must point to current evidence and handoff artifacts
- selected-provider live validation must be regenerated into evidence before expanding provider-backed readiness beyond the current archived OpenAI/local pilot proof
- release artifacts must be reproducible from documented npm scripts
- commit/push state must be stated explicitly in handoff when deferred

Current status:

- deterministic evidence and handoff are implemented
- OpenAI and local provider live evidence are archived in the current evidence pack, with local provider proof scoped to the configured local rehearsal
- Anthropic evidence records a provider account billing/credit blocker
- target local provider architecture remains blocked until endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence is recorded
- Hermes provider evidence remains blocked until target Hermes provider architecture evidence for endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback and stop-condition decision, customer approval, target-boundary npm run live:execution-v1:hermes pass, release artifact hygiene result, and regenerated execution snapshot is recorded
- [production-provider-readiness-v1.md](production-provider-readiness-v1.md) records provider preflight readiness and live-validation blockers while keeping live-provider-complete and production-ready claims blocked
- [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md) defines the target OpenAI provider account contract for account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target account evidence gap
- [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md) defines the target Anthropic provider account contract for account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, regenerated execution snapshot evidence, and the remaining account-level evidence gap
- [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md) defines the target local provider architecture contract for endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota/resource guard, telemetry, fallback and customer approval, target-boundary local provider live validation, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target local provider evidence gap
- [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md) defines the target provider evidence intake contract for provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, fallback route proof, and the remaining provider production gap
- [target-provider-operations-v1.md](target-provider-operations-v1.md) defines the target provider operations contract for provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment
- [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md) defines the target Hermes-compatible provider architecture decision contract for endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback and stop-condition decision, customer approval, target-boundary Hermes live validation, release artifact hygiene, regenerated release artifacts, and the remaining Hermes provider approval gap
- [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md) records local enterprise controls evidence while identity-backed hosted RBAC, session lifecycle, centralized permission administration, and hosted tenant isolation remain blocked
- [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md) defines the hosted SaaS and hybrid control-plane architecture decision contract while keeping hostedSaasApproved false and hosted implementation blocked
- [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md) defines the hosted identity/session architecture proof contract while keeping hostedIdentitySessionApproved false and hosted identity-backed RBAC blocked
- [target-identity-session-operations-v1.md](target-identity-session-operations-v1.md) defines the target identity/session operations proof contract for customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target identity evidence gap
- [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md) defines the hosted tenant isolation architecture contract with proof-level tenant identity, authorization, storage, encryption, backup/restore, administration, denial, observability/support, lifecycle, artifact hygiene, and snapshot requirements while keeping hostedTenantIsolationApproved false and hosted multi-tenant isolation blocked
- [target-tenant-isolation-operations-v1.md](target-tenant-isolation-operations-v1.md) defines the target tenant isolation operations evidence contract for tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption/key ownership proof, backup/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability/support isolation proof, lifecycle isolation proof, tenant containment, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target tenant evidence gap
- [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md) defines the local target environment evidence intake contract for deployment boundary, identity/session, tenant storage/encryption, provider/secrets, observability/SLO, retention/backup, support, clean release, artifact hygiene, and the remaining target environment production gap
- [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md) defines the target secret manager architecture contract while keeping targetSecretManagerApproved false and target secret manager readiness blocked
- [production-slo-operating-v1.md](production-slo-operating-v1.md) records local operating rehearsal evidence while the production telemetry, staffed on-call, and customer SLO/SLA gap remains blocked
- [target-slo-architecture-v1.md](target-slo-architecture-v1.md) defines the target SLO/SLA architecture proof-level evidence contract while keeping targetSloApproved false and target SLO readiness blocked
- [target-slo-operations-v1.md](target-slo-operations-v1.md) defines the target SLO/SLA operations proof-level evidence contract while keeping customer production SLO/SLA readiness blocked
- `smoke:observability-telemetry` verifies local telemetry signal coverage while keeping production log aggregation, alert delivery, on-call routing, and incident review evidence as production blockers
- [target-observability-architecture-v1.md](target-observability-architecture-v1.md) defines the target observability architecture proof-level evidence contract while keeping targetObservabilityApproved false and target observability readiness blocked

## Retention, Export, And Delete

Pilot defaults:

- retain local `var/` runtime state for the pilot duration unless the operator requests cleanup
- retain `docs/releases/execution-v1/*` immutable snapshots for release review
- export shareable evidence by copying evidence, closeout, handoff, snapshot metadata, and selected non-secret artifacts
- delete customer-sensitive local runtime state by removing the pilot runtime data directory after export approval

Current implementation support:

- `smoke:runtime-data-lifecycle` verifies local runtime inventory, export manifest generation, exact confirmation-token deletion, and post-delete absence checks on an isolated temp runtime
- `smoke:tenant-data-lifecycle` verifies tenant-scoped runtime inventory, export manifest generation, exact tenant confirmation-token deletion, post-delete absence, and unchanged data for another tenant in the same runtime root
- `smoke:backup-restore-drill` verifies local runtime backup manifest digests, clean-runtime restore enforcement, restored state hash matching, and post-restore tenant delete isolation without claiming hosted backup durability
- `smoke:runtime-isolation` verifies one-runtime-per-customer pilot isolation by creating two separate runtime roots, checking state hashes and marker separation, exporting both roots, and deleting one root without modifying the other
- runtime export paths are recorded relative to the runtime root, and export manifests include file counts, byte counts, collection counts, and sha256 hashes for audit comparison
- `package:pilot-export` and `smoke:pilot-export-package` generate and verify a pilot export package manifest with repository-relative paths, sha256 hashes, immutable snapshot references, and `productionReadyClaim: false`
- [retention-delete-v1.md](retention-delete-v1.md) defines data class retention windows, export checklist, delete checklist, stop conditions, and the production gap for pilot lifecycle handling
- [production-retention-operating-v1.md](production-retention-operating-v1.md) records local retention/export/delete operating rehearsal evidence while hosted retention, provider transcript deletion, backup expiry, and production post-delete absence remain blocked
- `smoke:retention-delete-policy` verifies that the retention/export/delete policy gate remains wired into release readiness, deployment, security, product planning, and README guidance
- [clean-deployment-release-v1.md](clean-deployment-release-v1.md) records tracked-files-only clean checkout release gate replay without local runtime state, Playwright output, dependency folders, or git metadata
- the pilot export package manifest is scanned by release artifact hygiene before external handoff
- destructive runtime deletion is guarded by a deterministic confirmation token generated from the target runtime root, preventing accidental cleanup calls from proceeding without explicit operator intent

Required before production:

- target-deployment tenant retention periods approved by customer data class
- customer-specific export checklist and handoff approval evidence
- deletion checklist execution evidence for tenant-scoped local runtime state, generated artifacts, backups, and provider transcripts
- verification that deleted production-like pilot data is not still present in release artifacts, backups, provider logs, or external handoff packages
- provider-side transcript deletion or non-retention evidence for every provider included in the production claim

## Threat Model

| Threat | Risk | Current Mitigation | Remaining Gap |
| --- | --- | --- | --- |
| Prompt injection through attachments | agent follows untrusted content | instruction-boundary rule, retrieval source labeling, deterministic smoke | richer red-team corpus and policy tests |
| Credential leakage into docs | secrets shared in evidence | env-name-only guidance, executable release artifact hygiene gate | broader pre-commit coverage outside execution-v1 artifacts |
| Unapproved destructive action | source, git, deployment, or data mutation | approval gate policy, operator confirmation requirement | authenticated permission enforcement |
| Provider data exposure | sensitive context sent to external model | operator-selected provider, local-first default, retrieval scoping | data classification and provider allowlist policy |
| Cross-customer data mixing | one runtime contains multiple customers | self-hosted one-runtime-per-customer pilot policy | true hosted tenant isolation |
| Stale or misleading release evidence | outdated artifacts used for decision | evidence/closeout/handoff/snapshot regeneration scripts | mandatory release gate in CI/CD |
| Runaway or hanging execution | long-running child processes | process-group hard timeouts in smoke/verifier paths | broader execution sandbox policy |
| Malicious external reference repo | unsafe code or prompt imported | design-input-only rule, no default vendoring | formal third-party review checklist |

## Pilot Security Checklist

- [ ] assign viewer/operator/approver/admin names for the pilot
- [ ] use one isolated runtime data directory per pilot customer
- [ ] register only approved workspace roots
- [ ] run deterministic smoke and execution-v1 status checks before pilot demo
- [ ] run credential and local-path scans before sharing artifacts
- [ ] inject provider credentials only through approved environment or secret manager
- [ ] run provider live validation only in an approved environment
- [ ] refresh selected-provider evidence with `node scripts/build-execution-v1-evidence.mjs --live-<provider>` only when intentionally replacing that provider proof
- [ ] run `npm run refresh:execution-v1-artifacts` after selected-provider evidence refresh or source-of-record changes so closeout, handoff, provider readiness, immutable snapshot, and pilot export package stay aligned while preserving archived live proof by default
- [ ] document any accepted risk in the handoff or target evidence accepted risk register with owner and next review date
- [ ] delete or archive local runtime state according to the pilot agreement

## Current Readiness Decision

Security model documentation is sufficient for the current OpenAI-scoped controlled self-hosted pilot design review.

It is not sufficient for production readiness until authenticated RBAC, tenant isolation enforcement, retention/export/delete procedures, expanded target-provider validation evidence, and production-like deployment hardening are complete.
