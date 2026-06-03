# Personal AI Agent

CLI-first local-first personal AI agent for two classes of work:

- `engineering`: implementation planning, verification planning, repo-oriented execution proposals
- `knowledge`: PRDs, decision memos, research briefs, execution plans, and checklists

## v1 Direction

This repo is building a managed multi-agent runtime first:

`manager -> planner -> executor -> reviewer`

The runtime stays intentionally narrow in v1:

- Node.js ESM
- CLI-first
- OpenAI as the operational default when `OPENAI_API_KEY` is configured; stub remains the offline fallback and bootstrap default
- Anthropic remains available as an explicit comparison or fallback provider behind provider-specific configuration
- optional manager-controlled parallel specialist fan-out across `research`, `implementation`, `verification`, `design`, and `documentation`
- explicit approval gates before risky actions
- runtime state under `var/`
- repo-tracked strategy and incident docs under `docs/`

현재 runtime 상한은 `core 4 roles + parallel specialist 5 lanes = 총 9 agent surfaces`입니다. specialist fan-out은 `parallel-specialists:<kinds>` 또는 `orchestration-profile:<id>`로 선택하며, quality gate는 여전히 `research`와 `verification` 신호만 특별 취급합니다.

## Reference Direction

Reference repos are design input, not vendored implementation:

- `fireauto`: commandized workflow boundaries
- `oh-my-codex`: thin workflow layer over an existing coding agent
- `everything-claude-code`: `agents / skills / hooks / rules` separation
- `mrstack`: persistent memory mindset
- `multi-agent-workflow`: deterministic role sequencing
- `openclaw/openclaw`: OpenClaw as the orchestration backbone for gateway, channels, sessions, workspaces, routing, permissions, and sandbox policy
- `ultraworkers/claw-code`: CLI harness, doctor/parity, and provider/runtime separation discipline
- `OpenHarness`: harness boundary, governance hooks, session-first orchestration
- `harness/harness`: pipeline, artifact registry, and local runner boundary as operating-system-level harness input
- `Claude Code Harness`: agent loop, tool orchestration, permissions, hooks, context, skills, and fail-closed engineering principles
- `hermes-agent`: Hermes-style self-improvement engine for provider-aware tool calling, parallel subagents, memory/session lifecycle, learning candidates, skill/template promotion, gateway-style approval/interrupt patterns, and Hermes-compatible tool-call parsing

See [docs/reference-repos.md](docs/reference-repos.md) for the borrowed and rejected patterns.

## Product Plan

The product planning source of record is [docs/product-plan-v1.md](docs/product-plan-v1.md).
The OpenClaw-style orchestration backbone source of record is [docs/orchestration-backbone-v1.md](docs/orchestration-backbone-v1.md).
The Hermes-style self-improvement engine source of record is [docs/self-improvement-engine-v1.md](docs/self-improvement-engine-v1.md).
Learning candidates now have a read-only operator audit packet: `overview learning-candidates` summarizes promotion status, record type, proposed target, scope, provider fallback lesson evidence, promotion verification status/type/stop reason, retention/expiration policy, rollback eligibility, gateway event bindings, and no-raw-secrets/no-raw-customer-payload counters while keeping autonomous promotion disabled.
Resolved learning promotions also persist `promotionVerification` with deterministic check counts, evidence bindings, `productionReadyClaim=false`, and a rollback target so approve/reject decisions remain auditable in artifacts and mission timelines.
Failed promotion verification is a stop-condition, not a partial mutation: unsafe candidates move to `verification-blocked`, store `promotionStopCondition`, remain visible in audit/queue/timeline surfaces, and do not write promoted memory.
The channel adapter seam is manifest-only for now: `channel adapters` exposes local `cli`/`web` adapters and future `schedule`/external messaging adapters, while Slack/Telegram/WhatsApp/Discord/email remain disabled by default with `channel-adapter-disabled-by-default` and `externalMessagingEnabled=false`.
Gateway events now also carry `identitySessionContext` records, so mission/workspace/session/provider binding, source surface, channel adapter metadata, memory scope, trust boundary, and no-secret evidence policy are visible in mission, workspace, and operator timelines before memory lookup or promotion review.
The v1 security planning source of record is [docs/security-model-v1.md](docs/security-model-v1.md).
The v1 operator runbook is [docs/operator-runbook-v1.md](docs/operator-runbook-v1.md).
The self-hosted pilot deployment guide is [docs/deployment-pilot-v1.md](docs/deployment-pilot-v1.md).
The customer pilot onboarding guide is [docs/pilot-onboarding-v1.md](docs/pilot-onboarding-v1.md).
The customer demo scenario catalog is [docs/demo-scenarios-v1.md](docs/demo-scenarios-v1.md).
The current release readiness decision is [docs/release-readiness-v1.md](docs/release-readiness-v1.md).
The pilot retention/delete policy is [docs/retention-delete-v1.md](docs/retention-delete-v1.md).
The local SLO operating rehearsal is [docs/production-slo-operating-v1.md](docs/production-slo-operating-v1.md).
The local retention operating rehearsal is [docs/production-retention-operating-v1.md](docs/production-retention-operating-v1.md).
The local provider readiness rehearsal is [docs/production-provider-readiness-v1.md](docs/production-provider-readiness-v1.md).
The local target provider evidence intake gate is [docs/target-provider-evidence-intake-v1.md](docs/target-provider-evidence-intake-v1.md).
The local target provider operations gate is [docs/target-provider-operations-v1.md](docs/target-provider-operations-v1.md).
The target OpenAI provider account gate is [docs/target-openai-provider-account-v1.md](docs/target-openai-provider-account-v1.md).
The target Anthropic provider account gate is [docs/target-anthropic-provider-account-v1.md](docs/target-anthropic-provider-account-v1.md).
The target local provider architecture gate is [docs/target-local-provider-architecture-v1.md](docs/target-local-provider-architecture-v1.md).
The target Hermes provider architecture gate is [docs/target-hermes-provider-architecture-v1.md](docs/target-hermes-provider-architecture-v1.md).
The local enterprise controls rehearsal is [docs/production-enterprise-controls-v1.md](docs/production-enterprise-controls-v1.md).
The local identity session administration gate is [docs/identity-session-admin-v1.md](docs/identity-session-admin-v1.md).
The local tenant storage administration gate is [docs/tenant-storage-admin-v1.md](docs/tenant-storage-admin-v1.md).
The target deployment contract is [docs/target-deployment-contract-v1.md](docs/target-deployment-contract-v1.md).
The hosted SaaS architecture decision gate is [docs/hosted-saas-architecture-decision-v1.md](docs/hosted-saas-architecture-decision-v1.md).
The hosted identity session architecture gate is [docs/hosted-identity-session-architecture-v1.md](docs/hosted-identity-session-architecture-v1.md).
The target identity session operations gate is [docs/target-identity-session-operations-v1.md](docs/target-identity-session-operations-v1.md).
The hosted tenant isolation architecture gate is [docs/hosted-tenant-isolation-architecture-v1.md](docs/hosted-tenant-isolation-architecture-v1.md).
The target tenant isolation operations gate is [docs/target-tenant-isolation-operations-v1.md](docs/target-tenant-isolation-operations-v1.md).
The local target environment evidence intake gate is [docs/target-environment-evidence-intake-v1.md](docs/target-environment-evidence-intake-v1.md).
The local backup/restore drill is [docs/backup-restore-drill-v1.md](docs/backup-restore-drill-v1.md).
The target data lifecycle architecture gate is [docs/target-data-lifecycle-architecture-v1.md](docs/target-data-lifecycle-architecture-v1.md).
The local target retention operations gate is [docs/target-retention-operations-v1.md](docs/target-retention-operations-v1.md).
The local target backup operations gate is [docs/target-backup-operations-v1.md](docs/target-backup-operations-v1.md).
The local customer support operations gate is [docs/customer-support-operations-v1.md](docs/customer-support-operations-v1.md).
The local support escalation review gate is [docs/support-escalation-review-v1.md](docs/support-escalation-review-v1.md).
The target support architecture gate is [docs/target-support-architecture-v1.md](docs/target-support-architecture-v1.md).
The local target support operations gate is [docs/target-support-operations-v1.md](docs/target-support-operations-v1.md).
The local secret management gate is [docs/secret-management-v1.md](docs/secret-management-v1.md).
The target secret manager architecture gate is [docs/target-secret-manager-architecture-v1.md](docs/target-secret-manager-architecture-v1.md).
The local target secret manager gate is [docs/target-secret-manager-v1.md](docs/target-secret-manager-v1.md).
The local observability telemetry gate is [docs/observability-telemetry-v1.md](docs/observability-telemetry-v1.md).
The target observability architecture gate is [docs/target-observability-architecture-v1.md](docs/target-observability-architecture-v1.md).
The local target observability operations gate is [docs/target-observability-operations-v1.md](docs/target-observability-operations-v1.md).
The target SLO architecture gate is [docs/target-slo-architecture-v1.md](docs/target-slo-architecture-v1.md).
The local target SLO operations gate is [docs/target-slo-operations-v1.md](docs/target-slo-operations-v1.md).
The target clean deployment architecture gate is [docs/target-clean-deployment-architecture-v1.md](docs/target-clean-deployment-architecture-v1.md).
The local target clean deployment operations gate is [docs/target-clean-deployment-operations-v1.md](docs/target-clean-deployment-operations-v1.md).
The clean deployment release rehearsal is [docs/clean-deployment-release-v1.md](docs/clean-deployment-release-v1.md).

Current planning status:

- execution-v1 is provider-scoped pilot-ready for OpenAI-backed local-first operation
- OpenAI and local provider live validation are archived; Anthropic is currently blocked by provider account billing/credit, Hermes still requires target Hermes provider architecture evidence for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, customer approval proof, provider operations proof, target-boundary live:execution-v1:hermes proof, release artifact hygiene result, and regenerated execution snapshot evidence, and target local provider architecture still requires endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence
- security model documentation now covers workspace isolation policy, RBAC matrix, secret handling, audit/retention/export/delete policy, tool permission model, and threat model
- self-hosted runtime isolation can be verified with `npm run smoke:runtime-isolation`
- operator runbook now covers daily start, UI operation, workspace/mission flow, approval handling, live validation, evidence refresh, artifact hygiene, incident triage, and release decision gates
- pilot deployment guide now covers install/bootstrap, runtime isolation, provider env injection, validation gates, operation loop, export, cleanup, and rollback
- pilot onboarding guide now covers participant roles, Day 0 preparation, first session agenda, first demo mission, provider onboarding, UI walkthrough, success criteria, stop conditions, and outcome template
- demo scenario catalog now covers release readiness, engineering mission with approval, provider validation, document and memory grounding, and multi-specialist analysis
- release readiness decision is recorded as `provider-scoped pilot ready for OpenAI-backed local-first path`
- production-like release drill evidence can be regenerated with `npm run drill:production-like-release`, but it intentionally keeps `productionReadyClaim: false`
- pilot export package evidence can be regenerated with `npm run package:pilot-export` and verified with `npm run smoke:pilot-export-package`
- retention/export/delete policy evidence can be verified with `npm run smoke:retention-delete-policy`, but it intentionally keeps `productionReadyClaim: false`
- local SLO operating rehearsal evidence can be regenerated with `npm run rehearsal:production-slo-operating` and verified with `npm run smoke:production-slo-operating`, but it intentionally keeps `productionReadyClaim: false`
- local retention operating rehearsal evidence can be regenerated with `npm run rehearsal:production-retention-operating` and verified with `npm run smoke:production-retention-operating`, but it intentionally keeps `productionReadyClaim: false`
- local provider readiness rehearsal evidence can be regenerated with `npm run rehearsal:production-provider-readiness` and verified with `npm run smoke:production-provider-readiness`, but it intentionally keeps `productionReadyClaim: false`
- release blocker handoff can be inspected without the web console using `node src/cli.mjs overview release-blockers --provider hermes`, from the operator API with `/api/execution-v1/release-blockers?provider=hermes`, or from the release tab `API 링크 복사` action; these surfaces return provider-specific stop reasons plus the shared provider-operations closure requirements unless `--without-shared`, `withoutShared=true`, `includeShared=false`, or the release tab `provider-only API 링크 복사` / `provider-only package 복사` / `provider-only closure checklist 복사` / `provider-only closure matrix 복사` / `provider-only handoff 복사` / `provider-only slice 명령 복사` / `provider-only slice 근거 복사` / `provider-only target packet 복사` / `provider-only commands 복사` / `provider-only gap 복사` / `provider-only exception 복사` / `provider-only risk 복사` / `provider-only refs 복사` / `provider-only residual 복사` / `provider-only closure 복사` / `provider-only manifest 복사` / `provider-only sanitized 복사` / `provider-only boundary 복사` / `provider-only command log 복사` / `provider-only decision 복사` / `provider-only disposition 복사` / `provider-only refresh 복사` actions are used; verify this surface with `npm run smoke:release-blocker-handoff`
- release tab blocker copy actions preserve the active provider filter across slice summary, package, closure checklist, closure matrix, target evidence packet, handoff, commands, and evidence bundles, so Anthropic/Hermes/local closure handoffs do not accidentally mix unrelated provider blockers; use `provider-only package 복사`, `provider-only closure checklist 복사`, `provider-only closure matrix 복사`, `provider-only handoff 복사`, `provider-only slice 명령 복사`, `provider-only slice 근거 복사`, `provider-only target packet 복사`, `provider-only commands 복사`, `provider-only gap 복사`, `provider-only exception 복사`, `provider-only risk 복사`, `provider-only refs 복사`, `provider-only residual 복사`, `provider-only closure 복사`, `provider-only manifest 복사`, `provider-only sanitized 복사`, `provider-only boundary 복사`, `provider-only command log 복사`, `provider-only decision 복사`, `provider-only disposition 복사`, or `provider-only refresh 복사` only when the shared provider-operations closure row is intentionally handled in a separate packet
- local target provider evidence intake can be verified with `npm run smoke:target-provider-evidence-intake`; it proves provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, fallback route proof, and blocker closure verification proof requirements are present, but it does not provide target provider account remediation or production live validation proof
- local target provider operations can be verified with `npm run smoke:target-provider-operations`; it proves provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, and evidence retention proof requirements are present, but it does not provide target provider production operations proof
- target OpenAI provider account evidence can be verified with `npm run smoke:target-openai-provider-account`; it proves account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetOpenAIProviderApproved: false`
- target Anthropic provider account evidence can be verified with `npm run smoke:target-anthropic-provider-account`; it proves account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetAnthropicProviderApproved: false`
- target local provider architecture evidence can be verified with `npm run smoke:target-local-provider-architecture`; it proves endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetLocalProviderApproved: false`
- target Hermes provider architecture evidence can be verified with `npm run smoke:target-hermes-provider-architecture`; it proves endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetHermesProviderApproved: false`
- local enterprise controls rehearsal evidence can be regenerated with `npm run rehearsal:production-enterprise-controls` and verified with `npm run smoke:production-enterprise-controls`, but it intentionally keeps `productionReadyClaim: false`
- local identity session administration evidence can be verified with `npm run smoke:identity-session-admin`; it proves identity controls, session lifecycle, role change audit packet requirements, and production identity gap are present, but it does not provide hosted identity/session administration proof
- local tenant storage administration evidence can be verified with `npm run smoke:tenant-storage-admin`; it proves tenant storage controls, tenant admin operations, audit packet requirements, and hosted tenant isolation gaps are present, but it does not provide hosted tenant storage or encryption proof
- target deployment contract evidence can be verified with `npm run smoke:target-deployment-contract`; it defines the hosted/production-like controls that must be proven before any production-ready or hosted SaaS claim
- hosted SaaS architecture decision evidence can be verified with `npm run smoke:hosted-saas-architecture-decision`; it proves tenant model, control plane, identity, storage/encryption, provider/secrets, billing, observability/support, data lifecycle, deployment, and compliance decision requirements are present, but it keeps `hostedSaasApproved: false`
- hosted identity session architecture evidence can be verified with `npm run smoke:hosted-identity-session-architecture`; it proves customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `hostedIdentitySessionApproved: false`
- target identity session operations evidence can be verified with `npm run smoke:target-identity-session-operations`; it proves customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it does not provide target identity/session production evidence
- hosted tenant isolation architecture evidence can be verified with `npm run smoke:hosted-tenant-isolation-architecture`; it proves tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-aware authorization proof, service-to-service tenant propagation proof, storage partitioning proof, artifact/memory/search/export/index partitioning proof, per-tenant encryption/key ownership proof, backup/restore isolation proof, tenant administration approval/audit proof, cross-tenant denial proof, observability/support isolation proof, lifecycle isolation proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `hostedTenantIsolationApproved: false`
- target tenant isolation operations evidence can be verified with `npm run smoke:target-tenant-isolation-operations`; it proves tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption/key ownership proof, backup/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it does not provide hosted multi-tenant production proof
- local target environment evidence intake can be verified with `npm run smoke:target-environment-evidence-intake`; it proves deployment boundary, identity/session, tenant storage/encryption, provider/secrets, observability/SLO, retention/backup, support, clean release, and artifact hygiene evidence requirements are present, but it does not provide target environment production proof
- local backup/restore drill evidence can be verified with `npm run smoke:backup-restore-drill`; it proves manifest-backed local restore integrity and tenant-isolated recovery behavior, but it does not provide hosted backup durability or encrypted storage proof
- target data lifecycle architecture evidence can be verified with `npm run smoke:target-data-lifecycle-architecture`; it proves customer data class, retention enforcement, export/delete, provider transcript, post-delete absence, backup, restore, key ownership, and disaster recovery decision requirements are present, but it keeps `targetDataLifecycleApproved: false`
- local target retention operations evidence can be verified with `npm run smoke:target-retention-operations`; it proves customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it does not provide target retention enforcement proof
- local target backup operations evidence can be verified with `npm run smoke:target-backup-operations`; it proves backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry/deletion proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it does not provide production backup execution or disaster recovery proof
- local customer support operations evidence can be verified with `npm run smoke:customer-support-operations`; it proves support roles, intake classes, escalation matrix, communication rules, and handoff checklist are present, but it does not provide staffed production support proof
- local support escalation review evidence can be verified with `npm run smoke:support-escalation-review`; it proves escalation routes, audit packet requirements, incident review cadence, and customer update rules are present, but it does not provide staffed production support audit history
- target support architecture evidence can be verified with `npm run smoke:target-support-architecture`; it proves staffing model, support queue, severity routing, customer communication, ticket audit, on-call handoff, incident commander, escalation, support data handling, and incident review governance decision requirements are present, but it keeps `targetSupportApproved: false`
- local target support operations evidence can be verified with `npm run smoke:target-support-operations`; it proves staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it does not provide production support rota or ticketing proof
- local secret management evidence can be verified with `npm run smoke:secret-management`; it proves secret classes, injection rules, redaction/hygiene rules, and rotation checklist are present, but it does not provide target secret manager or production rotation proof
- target secret manager architecture evidence can be verified with `npm run smoke:target-secret-manager-architecture`; it proves approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetSecretManagerApproved: false`
- local target secret manager evidence can be verified with `npm run smoke:target-secret-manager`; it proves secret manager controls, rotation evidence packet, break-glass rules, and production target secret manager gaps are present, but it does not provide target secret manager injection or rotation proof
- local observability telemetry evidence can be verified with `npm run smoke:observability-telemetry`; it proves local telemetry signals, alert triggers, and handoff requirements are present, but it does not provide hosted telemetry, alert delivery, or staffed on-call proof
- target observability architecture evidence can be verified with `npm run smoke:target-observability-architecture`; it proves approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, migration, rollback, false-positive triage, alert fatigue, customer communication containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetObservabilityApproved: false`
- local target observability operations evidence can be verified with `npm run smoke:target-observability-operations`; it proves telemetry ingestion proof, alert delivery proof, log/trace retention proof, staffed on-call routing and acknowledgement proof, customer status communication proof, incident response proof, incident review proof, audit export proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it does not provide production telemetry backend or staffed on-call proof
- target SLO architecture evidence can be verified with `npm run smoke:target-slo-architecture`; it proves customer-approved SLO/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call proof, customer communication proof, incident review proof, provider outage playbook proof, maintenance/degradation proof, service credit and contractual escalation proof, migration, rollback, communication misfire containment, false-positive alert containment, alert fatigue containment, missed-SLO containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetSloApproved: false`
- local target SLO operations evidence can be verified with `npm run smoke:target-slo-operations`; it proves customer-approved SLO/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it does not provide customer production SLO/SLA proof
- target clean deployment architecture evidence can be verified with `npm run smoke:target-clean-deployment-architecture`; it proves source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback, and release approval decision requirements are present, but it keeps `targetCleanDeploymentApproved: false`
- local target clean deployment operations evidence can be verified with `npm run smoke:target-clean-deployment-operations`; it proves source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, evidence retention, and failed-deployment containment requirements are present, but it does not provide target deployment execution proof
- OIDC/JWKS web auth can be verified with `npm run smoke:web-oidc-rbac`; it validates RS256 bearer token issuer/audience/expiry and token role claims, but it does not provide hosted session administration by itself
- OIDC tenant-claim API isolation can be verified with `npm run smoke:web-tenant-isolation`; it binds workspace/mission API access to token tenant claims, but it does not provide hosted tenant storage, encryption, backup, or tenant administration by itself
- tenant-scoped runtime export/delete can be verified with `npm run smoke:tenant-data-lifecycle`; it proves local tenant-filtered export and delete behavior inside one runtime root, but it does not provide hosted tenant storage, encryption, backup, or tenant administration by itself
- clean deployment release rehearsal evidence can be regenerated with `npm run rehearsal:clean-deployment-release`, but it intentionally keeps `productionReadyClaim: false`
- enterprise/company pilot readiness is scoped to the validated OpenAI provider and documented self-hosted/local-first deployment boundary
- the current release label should not move to `production-ready` until Anthropic account remediation, target Hermes provider architecture evidence, target local provider architecture evidence, enforced enterprise controls, and production-like deployment release evidence are complete

## Current Commands

Local bootstrap for first test run:

```bash
npm run bootstrap:local
```

Production-like local release drill:

```bash
npm run drill:production-like-release
npm run smoke:production-like-release-drill
```

Production SLO operating rehearsal:

```bash
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
```

Production retention operating rehearsal:

```bash
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
```

Production provider readiness rehearsal:

```bash
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
npm run smoke:hosted-tenant-isolation-architecture
npm run smoke:target-environment-evidence-intake
```

Production enterprise controls rehearsal:

```bash
npm run rehearsal:production-enterprise-controls
npm run smoke:production-enterprise-controls
```

Identity session administration gate:

```bash
npm run smoke:identity-session-admin
```

Tenant storage administration gate:

```bash
npm run smoke:tenant-storage-admin
```

Target deployment contract gate:

```bash
npm run smoke:target-deployment-contract
```

Backup/restore drill gate:

```bash
npm run smoke:backup-restore-drill
```

Target data lifecycle architecture gate:

```bash
npm run smoke:target-data-lifecycle-architecture
```

Target retention operations gate:

```bash
npm run smoke:target-retention-operations
```

Target backup operations gate:

```bash
npm run smoke:target-backup-operations
```

Customer support operations gate:

```bash
npm run smoke:customer-support-operations
```

Support escalation review gate:

```bash
npm run smoke:support-escalation-review
```

Target support architecture gate:

```bash
npm run smoke:target-support-architecture
```

Target support operations gate:

```bash
npm run smoke:target-support-operations
```

Secret management gate:

```bash
npm run smoke:secret-management
```

Target secret manager gate:

```bash
npm run smoke:target-secret-manager-architecture
npm run smoke:target-secret-manager
```

Observability telemetry gate:

```bash
npm run smoke:observability-telemetry
```

Target observability architecture gate:

```bash
npm run smoke:target-observability-architecture
```

Target observability operations gate:

```bash
npm run smoke:target-observability-operations
```

Target SLO architecture gate:

```bash
npm run smoke:target-slo-architecture
```

Target SLO operations gate:

```bash
npm run smoke:target-slo-operations
```

Target clean deployment architecture gate:

```bash
npm run smoke:target-clean-deployment-architecture
```

Target clean deployment operations gate:

```bash
npm run smoke:target-clean-deployment-operations
```

Self-hosted runtime isolation smoke:

```bash
npm run smoke:runtime-isolation
npm run smoke:tenant-data-lifecycle
```

Retention/export/delete policy gate:

```bash
npm run smoke:retention-delete-policy
```

Clean deployment release rehearsal:

```bash
npm run rehearsal:clean-deployment-release
npm run smoke:clean-deployment-release
```

Authenticated web RBAC gate:

```bash
npm run smoke:web-auth-rbac
npm run smoke:web-oidc-rbac
npm run smoke:web-tenant-isolation
```

Pilot export package manifest:

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
```

로컬 운영 콘솔 실행:

```bash
npm run ui
```

기본 주소는 `http://127.0.0.1:4317`이며, 해당 포트가 사용 중이면 다음 사용 가능한 포트로 자동 fallback합니다. 실제 접속 URL과 pid는 `var/server.json`에 기록되고, `/api/health`는 현재 host/port/discovery path와 request id 응답 header를 확인할 수 있는 운영용 health endpoint입니다. `/api/runtime/requests`는 non-sensitive active/recent API request 상태를 request id, method, path, status, duration 기준으로 보여주며, 상단 metric도 active/recent request 수를 함께 표시합니다. 콘솔은 `한 화면` 안에서 `미션 정하기 → 실행하기 → 검토하기 → 결과 보기` 순서로 따라가는 한국어 operator flow로 동작합니다.

- 좌측 rail에서 workspace 선택과 mission queue 탐색
- 상단 운영 헤더에서 현재 mission, 현재 단계, 지금 해야 할 일, 막힌 이유를 한 번에 확인
- 상단 진행 흐름 strip에서 `완료 / 현재 / 다음 단계`를 같은 문맥 안에서 읽고 바로 이동
- 좌측 mission queue는 `표시 중 / 검토 필요 / 완료` 요약과 `다음 액션` 중심 행 디자인으로 빠르게 스캔
- 좌측 mission queue는 밝은 카드 더미 대신 dark inbox 밀도로 정리되어, 어떤 mission을 먼저 열어야 하는지 한눈에 판단
- 각 mission row는 기본적으로 `단계 · 제목 · 한 줄 요약 · 상태`만 보여 주고, 선택된 row에서만 다음 액션과 현재 단계가 펼쳐져 queue 높이가 과도하게 커지지 않도록 정리
- 좌측 rail 상단에는 `현재 workspace` 카드가 있어, 지금 선택한 repo 이름·경로·미션 수를 mission queue와 분리해서 바로 확인 가능
- 선택한 mission은 메인 작업면 상단 `선택한 미션` bridge strip으로 다시 보여 주되, `현재 단계 / 최근 실행 / 하네스 / 다음 액션`만 남긴 compact summary로 줄여 왼쪽 queue 선택과 중앙 작업판의 연결만 빠르게 읽게 구성
- 활성 mission row에는 `현재 작업 중`과 현재 열린 단계가 같이 보이도록 정리해, queue 포커스와 workspace 포커스가 분리돼 보이지 않도록 보정
- 좌측 rail 폭과 mission row 패딩을 더 줄여, queue는 덜 무겁게 보이고 메인 작업면은 더 넓고 선명하게 읽히도록 조정
- 상단 command header는 핵심 3개 메트릭과 짧은 상태 신호만 남겨, 첫 화면에서 현재 단계와 다음 행동이 바로 읽히도록 압축
- `지금 할 일` 패널과 진행 흐름 strip은 하나의 상단 control surface처럼 이어져, 현재 단계 판단과 다음 이동을 같은 문맥에서 처리
- 현재 선택한 `workspace / mission / 단계 / 세부 탭 / session / artifact`는 URL query로 같이 동기화되며, 직접 클릭해 바꾼 상태는 browser history에도 쌓여 새로고침, 링크 공유, 뒤로가기/앞으로가기까지 같은 작업면 기준으로 복원 가능
- 상단 `지금 해야 할 일` 패널에는 `현재 링크 복사`와 `보기 초기화` 액션이 있어, operator가 현재 작업면을 바로 공유하거나 추천 단계 기준 기본 보기로 빠르게 되돌릴 수 있음
- `미션 정하기` 단계에서 playbook 선택, 템플릿 선택, mission 작성
- `실행하기` 단계에서 provider 지정 실행과 manager → planner → executor → reviewer 흐름 확인
- `결과 보기` 단계는 대표 결과물, 검토 상태, 마무리 체크리스트를 먼저 보여주고, 아래 `결과와 기록` workbench에서 본문과 실행 타임라인을 함께 확인
- `검토하기` 단계에서 review readiness, action queue, approval inbox를 묶어서 처리
- `결과 보기` 단계에서 최종 결과 요약을 먼저 보고, 아래 `결과와 기록` 작업 영역에서 현재 세부 보기 맥락과 함께 결과물·실행 기록·검토 이력·입력값과 설정을 분리해서 확인
- `결과와 기록`에 `하네스` 탭을 추가해 문서 source-of-record, 미션/워크스페이스 메모리, 유지보수·검토·provider 상태를 한 번에 확인
- `결과와 기록`의 `v1 마감 상태` 탭에서 deterministic smoke 4종, reference adoption gate, browser interaction readiness, live validation 상태, execution closeout checklist, evidence 문서를 같은 화면에서 확인하고 새로고침할 수 있음
- `v1 마감 상태` 탭은 provider별 `env 준비 여부 / 실행 명령 / live validation 실행 버튼`을 함께 보여 주므로, 남은 closeout gap이 코드 문제인지 credential 미주입인지 화면에서 바로 구분 가능
- `미션 정하기` 단계와 상단 `지금 해야 할 일`에도 하네스 권장 조치를 끌어올려, review/action/maintenance 압력이 있으면 바로 관련 단계나 탭으로 이동
- `하네스 > 메모리 레이어`에서 fact / decision / preference 메모를 바로 추가할 수 있어, 미션 실행 문맥을 UI에서 직접 누적하며, `kind=fact` 메모는 provenance와 revision history를 가진 local fact graph node로도 동기화됨
- `하네스 > 메모리 레이어`는 미션 메모뿐 아니라 워크스페이스 메모도 같은 화면에서 저장할 수 있어, 장기 운영 규칙과 현재 실행 문맥을 분리해 누적
- `하네스 > 메모리 레이어`에서 저장된 미션/워크스페이스 메모를 `불러오기 → 수정 저장 / 삭제`까지 처리할 수 있어, add-only가 아니라 실제 운영용 memory curation surface로 사용할 수 있음
- `하네스 > 메모리 레이어`는 전체 미션/워크스페이스 메모를 `내용 검색 + 범위 필터 + kind 필터`로 바로 좁혀 볼 수 있어, recent entry 몇 개를 넘어서 누적된 layered memory를 같은 화면에서 큐레이션 가능
- `하네스 > 메모리 레이어`와 `하네스 > 소스 오브 레코드`는 각각 `정렬 + 페이지 탐색`을 지원하므로, 누적된 메모/문서가 길어져도 전용 browse API 기준으로 이전/다음 페이지를 넘기며 안정적으로 스캔 가능
- 하네스 browse API는 `currentPage / totalPages / hasPrev / hasNext / pageStart / pageEnd`를 함께 내려주므로, 프론트는 offset 계산 없이 현재 범위와 페이지 이동 가능 여부를 그대로 렌더링
- 하네스에서 메모/문서를 추가·수정·삭제한 뒤에도 현재 검색/필터/페이지 상태를 유지한 채 재조회하며, 문서·메모리 탐색 모두 `페이지 크기 변경`과 `필터 초기화`를 같은 패널에서 바로 처리할 수 있음
- 하네스 탐색 패널은 현재 `검색 / 유형·범위 / 정렬 / 페이지 크기`를 chip으로 바로 노출하고, 이전·다음 버튼도 현재 페이지 크기에 맞춰 표기하므로 operator가 지금 어떤 조건으로 기록을 보고 있는지 즉시 파악 가능
- 하네스 문서/메모리 탐색은 전용 browse API로 분리되어, `showMission` payload는 recent summary만 유지하고 실제 검색·정렬·더 보기는 server-side filtered result로 처리
- `npm run smoke:ui-harness-browse`는 임시 root에 seed data를 만든 뒤 served UI asset과 하네스 browse API의 검색, 필터, 페이지 이동, reset contract를 함께 검증하는 UI contract smoke 경로
- 수동 Playwright CLI 확인에서 생기는 `.playwright-cli/` 세션 아티팩트는 `.gitignore`로 제외되어, 브라우저 확인 뒤에도 워크트리가 불필요하게 dirty 상태로 남지 않음
- `하네스 > 소스 오브 레코드`에서 핵심 내용을 Markdown 본문으로 바로 기록해 `reference/devlog/incident` 문서에 남길 수 있어, 문서 intake를 콘솔 안에서 시작 가능
- `하네스 > 소스 오브 레코드`는 Markdown/txt/json 파일을 브라우저에서 바로 읽어 제목과 본문에 채워 넣을 수 있어, 외부 작업 메모를 dependency 없이 Markdown source-of-record로 흡수 가능
- `하네스 > 소스 오브 레코드`에서 저장된 tracked Markdown entry를 `불러오기 → 수정 저장 / 삭제`까지 처리할 수 있어, source log도 add-only가 아니라 실제 운영용 기록면으로 다룰 수 있음
- `하네스 > 소스 오브 레코드`는 예전 append-only `devlog` 섹션을 `기존 개발 로그 전환` 한 번으로 tracked entry로 감싸므로, 과거 로그도 같은 화면에서 수정/삭제 가능한 기록으로 정리할 수 있음
- `하네스 > 소스 오브 레코드`는 tracked 문서 기록 전체를 `제목 / 본문 / 경로` 검색과 `reference/devlog/incident` 필터로 바로 좁혀 볼 수 있어, 누적된 기록이 많아져도 최근 6건만 보는 대신 전체 source log를 같은 화면에서 탐색할 수 있음
- `하네스 > 미션 첨부 입력`은 Markdown/txt/json/log/source code 같은 텍스트 기반 파일을 미션 입력으로 저장하고, `PERSONAL_AI_AGENT_MARKITDOWN_BIN` 또는 `markitdown`이 준비된 경우 PDF/Office 문서도 서버 변환 boundary를 거쳐 Markdown attachment로 저장함
- `미션 정하기 > AI 구성` 카드는 `Core 4`, `구현+검증`, `트라이어드`, `풀 스펙트럼` 같은 composition을 직접 고르게 해 주고, 선택한 카드에 맞는 `orchestration-profile:*` directive를 자동으로 constraint에 반영함
- 같은 화면은 `작업 모드 선택 → AI 카드 선택 → 읽힐 자료 넣기` 3-step onboarding으로 구성되어, operator가 AI를 어떻게 추가하는지와 무엇을 먼저 준비해야 하는지 카드 설명을 길게 읽지 않아도 파악할 수 있음
- 같은 surface 상단의 intent pill은 `빠르게 초안`, `구현 + 검증`, `리서치 포함`, `끝까지 handoff`처럼 목적 중심으로 AI 구성을 먼저 고르게 해 주고, 실제 specialist profile 선택은 그 intent에 맞춰 바로 따라오게 구성됨
- `AI가 지금 읽는 자료` 패널은 현재 지식 루프가 `prompt grounding + retrieval memory` 범위라는 점을 명시하고, fine-tuning·OCR·binary understanding·vector retrieval index는 아직 지원하지 않는다고 분리해서 보여 줌
- 같은 패널에는 `다음 실행 retrieval preview`가 함께 보여서, 첨부/메모를 넣었을 때 실제로 어떤 snippet이 다음 run 앞단에 먼저 올라가는지 source label과 역할별 coverage 기준으로 바로 확인 가능
- runtime은 미션/워크스페이스 메모와 텍스트 첨부에서 lexical overlap 기반 `retrieved context`를 뽑아 manager/planner/executor/reviewer prompt 앞단에 올리므로, 같은 자료를 통째로 다시 읽기 전에 역할별 핵심 snippet부터 보게 됨
- 각 agent run은 `*-retrieval.md` artifact를 같이 남기므로, 결과 탭의 세션 산출물 목록에서 이번 실행에 실제로 주입된 retrieval 근거를 run evidence로 다시 열어볼 수 있음
- `하네스 > 메모리`와 `결과 보기`는 가장 최근 실행의 retrieval artifact를 `retrieval 근거 열기`로 바로 열 수 있어, preview로 본 snippet이 실제 어떤 run evidence로 남았는지 세션 전환과 artifact 포커스까지 한 번에 따라갈 수 있음
- 같은 surface에는 `preview vs 최근 retrieval evidence` compare callout도 함께 보여서, 다음 run에서 새로 들어올 source와 직전 run에서만 쓰였던 source를 빠르게 구분할 수 있음
- compare callout의 `다음 · …` `이전 · …` source chip을 누르면 `하네스` 탭으로 바로 이동해 메모 source는 scope/kind filter로, 첨부 source는 해당 파일 row highlight로 바로 좁혀 볼 수 있음
- focus로 이동한 뒤에는 하네스 상단에 `현재 retrieval source focus` 배너와 `focus 해제` 버튼이 같이 보여서, 지금 어떤 source 기준으로 좁혀 본 상태인지와 reset 경로를 바로 확인할 수 있음
- 같은 source chip이 이미 적용 중이면 compare callout 안에서 `현재 · …` active 상태와 `현재 source 해제` 액션이 같이 보여서, 다시 하네스로 내려가지 않아도 현재 narrowing 상태를 즉시 읽고 풀 수 있음
- retrieval source focus는 URL의 `hstype` / `hsource`로도 같이 동기화되므로, 새로고침이나 링크 공유 뒤에도 같은 focus 상태와 active chip 문맥이 복원됨
- `npm run smoke:retrieval-memory`는 relevant memory/attachment snippet만 `Retrieved Context` 섹션으로 승격되고 무관한 문장은 제외되는지 manager prompt와 manager context 기준으로 검증함
- `npm run smoke:fact-graph-memory`는 fact memory 생성/수정/삭제가 JSON-backed temporal fact graph의 active/retired node, shared-keyword edge, provenance, revision contract와 `memory facts --compact` operator preview로 동기화되는지 검증함
- `npm run smoke:reference-adoptions`는 output compaction, provider guard, Hermes provider, mission quality gate, document conversion, runtime discovery, visual evidence, retrieval, fact graph, instruction-boundary, orchestration profile, UI agent blueprint, parallel specialist, process timeout smoke를 한 번에 실행하는 외부 reference adoption 회귀 게이트임. 각 하위 smoke는 process-group hard timeout으로 실행되며, 기본 5분 per-script budget은 `PERSONAL_AI_AGENT_REFERENCE_ADOPTION_SCRIPT_TIMEOUT_MS`로 조정할 수 있음
- `npm run smoke:ui-execution-browser-e2e-artifact-restore`는 browser E2E가 실패하거나 중단돼도 기존 release report/screenshot artifact가 복원되어 `smoke:execution-v1-status`가 깨지지 않는지 확인하는 artifact lifecycle 회귀 게이트임
- retrieval ranking은 lexical overlap과 BM25 candidate scoring을 함께 사용하며, attachment chunk는 인접 chunk도 query overlap이 있을 때만 함께 확장해 관련 문맥은 살리고 무관한 appendix 유입은 막음
- `npm run smoke:ui-mission-attachments`는 served UI asset에 mission attachment form/harness upload wiring이 살아 있는지, text attachment와 MarkItDown-compatible document upload가 같은 public mission attachment contract로 저장되는지 함께 검증함
- `npm run smoke:ui-agent-blueprints`는 served UI asset 기준으로 AI composition 카드, `AI가 지금 읽는 자료` 패널, specialist lane style contract가 모두 살아 있는지 검증함
- `npm run smoke:ui-execution-browser-e2e`는 실제 브라우저에서 미션 생성, retrieval input seed, compare chip 직접 링크 복사와 `복사됨` 상태, memory/attachment source의 direct/focused copy prompt fallback path, retrieval focus URL 복원, memory/attachment fresh browser handoff 재진입, fallback deep-link의 fresh browser reopen, execution approval/start, release tab navigation, browser history 복원, release handoff preview deep-link의 clipboard success/fallback path와 fresh browser reopen, non-previewable `browser-e2e.png`의 direct open-link copy/fallback path와 fresh browser reopen, screenshot artifact 저장, main/handoff browser console/page error 부재, handoff session result/coverage summary JSON, release handoff preview session result/coverage summary JSON, `browser-report`/`handoff-digest.json`/`handoff-digest.txt`/`handoff-digest.md`/`handoff-manifest.json`/`handoff-manifest.txt`/`handoff-manifest.md`/`handoff-index.json`/`handoff-index.txt`/`handoff-index.md`/`manifest-json`/`manifest-text`/`manifest-markdown`/`digest-json`/`digest-text`/`digest-markdown`/`index-json`/`index-text`/`index-markdown` 기준 release handoff link verification stable summary line/sha256, 별도 `browser-screenshot` 기준 release handoff open-link stable summary line/sha256, 그리고 `execution-v1-release-handoff-digest.json`/`execution-v1-release-handoff-manifest.json`/`execution-v1-release-handoff-index.json` 모두에 공통 `releaseHandoffStructuredSummary.preview/open` object, 그 object의 deterministic line set, overview line, sha256가 persisted 되는지뿐 아니라 `execution-v1-release-handoff-digest.txt/.md`, `execution-v1-release-handoff-manifest.txt/.md`, `execution-v1-release-handoff-index.txt/.md`에도 같은 structured summary signature가 함께 handoff surface로 남는지까지 검증함. 추가로 `execution-v1-release-handoff-manifest.json`/`execution-v1-release-handoff-manifest.txt`/`execution-v1-release-handoff-manifest.md` manifest, release 탭의 `browser-e2e.json`/`handoff-digest.json`/`handoff-digest.txt`/`handoff-digest.md`/`handoff-manifest.json`/`handoff-manifest.txt`/`handoff-manifest.md`/`handoff-index.json`/`handoff-index.txt`/`handoff-index.md`/`manifest.json`/`manifest.txt`/`manifest.md`/`digest.json`/`digest.txt`/`digest.md` card render/open/inline preview, saved report artifact의 read-back equality, 그리고 screenshot bytes/sha256/modifiedAt/width/height와 viewport/DPR 기반 capture context, expected full-page dimensions, structured capture target metadata, release surface summary, summary chip label/value metrics, recommendation/provider card visible summary, checklist/current status/doc status summary, release action history summary, base64 transport sanity와 doc head HTML snapshot, injected browser code의 whitespace normalization, closeout/evidence doc kind mismatch 0건, 정확한 label 일치, expected markdown path suffix, doc head HTML marker/path 일치, `releaseDocVerificationSummary`의 kind별 exact-match 상태, expected/actual pair, stable `actualPathSuffix`, stable head label/path suffix, failure reason, overall exact-match summary, stable digest, per-doc stable signature line/sha256, keyed stable digest index, stable digest line signature, overall sha256, stable overview line, 그리고 별도 `execution-v1-release-doc-digest.json`/`execution-v1-release-doc-digest.txt`/`execution-v1-release-doc-digest.md` artifact와 `execution-v1-release-doc-manifest.json`/`execution-v1-release-doc-manifest.txt`/`execution-v1-release-doc-manifest.md` manifest surface, 추가로 `execution-v1-release-doc-index.json`/`execution-v1-release-doc-index.txt`/`execution-v1-release-doc-index.md` index surface의 read-back equality·doc kind 목록·artifact group/order·report/screenshot 포함 keyed artifact lookup·artifact path/bytes/sha256/line count consistency·bundle line set/order·bundle sha256/overview line consistency·plain-text handoff consistency·Markdown handoff consistency까지 한 번에 검증함
- release 탭의 `검토용 artifact 바로가기`는 위 browser report/screenshot과 release handoff `handoff-digest.json`/`handoff-digest.txt`/`handoff-digest.md`/`handoff-manifest.json`/`handoff-manifest.txt`/`handoff-manifest.md`/`handoff-index.json`/`handoff-index.txt`/`handoff-index.md`, release-doc `index/manifest/digest` artifact 경로를 같은 surface에서 노출하고, 존재하는 artifact는 `열기` 링크로 바로 새 탭에서 확인 가능하며 `markdown/text/json` 계열은 `미리보기`로 같은 탭 안에서 inline preview도 바로 확인 가능함. 선택한 preview는 `rartifact` query state로도 동기화돼 reload 뒤에도 같은 panel을 복원하고, previewable card는 `링크`와 preview panel의 `현재 링크 복사`로 release deep-link handoff를 수행하며, non-previewable binary card는 `링크`로 direct open route handoff를 수행함. clipboard success 시 해당 버튼은 잠시 `복사됨` 상태로 바뀌어 어떤 artifact 링크를 막 복사했는지 같은 surface에서 바로 읽을 수 있음. 추가로 `handoff-*` artifact card와 해당 inline preview panel은 compact JSON sibling에서 읽은 `preview/open` error-free session summary, `summary copy`/`summary copy preview`/`summary detail copy`/`summary stable line copy`/`summary stable line copy preview`/`summary stable line copy preview body`/`summary stable line copy preview body line copy`/`summary stable line copy preview body line copy body`/`summary stable line copy preview body line copy body line copy`/`summary stable line copy preview body line copy body line copy body`/`summary stable line copy preview body line copy body line copy body line copy`/`summary stable line copy preview body line copy body line copy body line copy body`/`summary stable line copy preview body line copy body line copy body line copy body line copy`/`summary stable line copy preview body line copy body line copy body line copy body line copy line copy`/`summary detail copy preview`/`summary detail copy preview line copy`/`summary detail copy preview line copy body` exact-match row, combined structured summary overview line/sha뿐 아니라 각 entry의 overview line detail도 함께 보여 준다. 특히 `summary detail copy` entry는 이제 4-check matrix stable line 4개를 card/preview detail 아래에 그대로 노출해 어떤 surface가 exact-match를 만들었는지 바로 읽을 수 있고, 각 stable line도 `stable line 복사` / `현재 stable line 복사`로 직접 handoff할 수 있다. human-readable handoff txt/md sibling은 이제 `summary-stable-line-copy`뿐 아니라 `summary-stable-line-copy-preview` dedicated section까지 포함해 `summary-detail-copy-preview-line-copy-body`와 같은 수준의 counter/signature line을 같이 기록하고, browser preview smoke는 stable-line body section marker와 preview body section marker를 모두 실제로 렌더링하는지 검증한다. 이번 단계부터는 그 preview body verification 결과도 compact handoff JSON trio와 release UI surface의 별도 `summary stable line copy preview body` row로 같이 올라가서, JSON structured summary row와 txt/md preview body verification을 같은 release surface에서 분리해서 대조할 수 있다. 여기에 더해 compact handoff JSON trio와 release UI surface도 `summary stable line copy preview body line copy` row를 직접 들고, browser report에서 계산한 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary`를 same-surface exact-match row와 stable line detail로 바로 대조할 수 있다. 이제 human-readable handoff txt/md sibling에도 `summary-stable-line-copy-preview-body-line-copy` dedicated section이 추가되어 같은 line-copy evidence의 counter/overview/stable line을 preview body에서 직접 확인하고, 그 body-section verification도 compact handoff JSON trio와 release UI surface의 `summary stable line copy preview body line copy body` row로 다시 올라간다. 새 browser report는 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary`도 기록해 해당 body-section row의 card/current-preview stable line copy fallback까지 검증하고, compact handoff JSON trio와 release UI surface도 이를 `summary stable line copy preview body line copy body line copy` row/detail/stable-line metadata로 직접 노출한다. 이제 human-readable handoff txt/md sibling에도 `summary-stable-line-copy-preview-body-line-copy-body-line-copy` dedicated section이 추가되어 같은 body-section stable-line copy evidence의 counter/overview/stable line을 preview body에서 직접 확인하고, browser preview smoke가 해당 marker/counter를 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary`로 별도 기록한다. 이번 단계부터는 그 browser-report-only body verification도 compact handoff JSON trio와 release UI surface의 `summary stable line copy preview body line copy body line copy body` row/detail/stable-line metadata로 승격되어, body-section 자체와 body-section verification evidence를 같은 release surface에서 분리해서 바로 대조할 수 있다. 이제 compact handoff JSON trio와 release UI surface는 `summary stable line copy preview body line copy body line copy body line copy` row/detail도 직접 들고, browser report의 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary`를 same-surface detail line-copy evidence로 바로 대조할 수 있다. 이제 human-readable handoff txt/md sibling에도 `summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy` dedicated section이 추가되어 같은 promoted row의 counter/overview/stable line을 preview body에서 직접 확인하고, browser preview smoke는 그 marker/counter를 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary`로 별도 기록한다. 이번 단계부터는 그 browser-report-only evidence도 compact handoff JSON trio와 release UI surface의 `summary stable line copy preview body line copy body line copy body line copy body` row/detail/stable-line metadata로 승격되어, promoted row와 human-readable body verification evidence를 같은 release surface에서 분리해 바로 대조할 수 있다. 이제 browser report는 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary`도 별도 기록해 그 promoted row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다. 이번 단계부터는 compact handoff JSON trio와 release UI surface도 그 evidence를 `summary stable line copy preview body line copy body line copy body line copy body line copy` row/detail/stable-line metadata로 직접 들고, browser report의 latest line-copy verification summary와 같은 surface에서 바로 대조할 수 있다. 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary`까지 추가로 기록해 그 승격된 row의 card/current-preview `line 복사` fallback까지 다시 증명한다. 이번 단계부터는 compact handoff JSON trio와 release UI surface도 그 evidence를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy` row/detail/stable-line metadata로 직접 들고, browser report의 latest line-copy verification summary와 같은 surface에서 바로 대조할 수 있다. 이제 browser report는 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary`도 추가로 기록해 그 latest row 자체의 card/current-preview `line 복사` fallback까지 한 번 더 증명한다. 각 detail row에서도 `line 복사` / `현재 line 복사`로 근거 line 자체를 바로 handoff할 수 있고, stable line copy contract는 compact handoff JSON trio와 human-readable txt/md body section 양쪽에서 같은 release surface로 읽힌다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, browser report의 latest line-copy verification summary와 같은 release surface에서 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 그 promoted row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, browser report-only였던 latest line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 그 promoted row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, browser report-only였던 newest line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 newest row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 newest row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, newest promoted-row line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, newest promoted-row line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 newest row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 newest row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, newest promoted-row line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, newest promoted-row line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 newest row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, newest promoted-row line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 newest row 자체의 card/current-preview `line 복사` fallback까지 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, newest promoted-row line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 newest row의 card/current-preview detail line-copy fallback을 report-only evidence로 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, 방금 report-only였던 newest line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 count-16 row의 card/current-preview detail line-copy fallback을 report-only evidence로 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, 방금 report-only였던 newest line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 count-17 row의 card/current-preview detail line-copy fallback을 report-only evidence로 다시 증명한다
- 이번 단계부터 compact handoff JSON trio와 release UI surface도 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출해, 방금 report-only였던 newest line-copy evidence를 handoff artifact와 UI에서 바로 대조할 수 있다
- 새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록해 방금 승격된 count-18 row의 card/current-preview detail line-copy fallback을 report-only evidence로 다시 증명한다
- browser smoke는 temp workspace에 deterministic handoff fixture를 먼저 심은 뒤 최소 `index.md`/`index.txt`/`index.json`, `handoff-digest.json`, `handoff-digest.txt`, `handoff-digest.md`, `handoff-manifest.json`, `handoff-manifest.txt`, `handoff-manifest.md`, `handoff-index.json`, `handoff-index.txt` card가 실제 `ready` badge, non-empty path, `/api/execution-v1/handoff-artifacts/:id` direct-open href, `200 + expected content-type` 응답, release 탭 안의 inline preview 본문, `rartifact=index-markdown` reload restore, `index-json`/`handoff-digest.json` card-level link copy와 `index-markdown` current-preview link copy의 `rartifact` deep-link 및 `복사됨` label transition, `handoff-digest.json` card overview copy와 `handoff-index.md` current-preview overview copy의 clipboard success/fallback 및 copied-state transition, `summary copy preview` detail line뿐 아니라 `summary detail copy preview`, `summary detail copy preview line copy`, `summary detail copy preview line copy body` detail line의 card/current-preview line copy success/fallback 및 copied-state reset, 그리고 이제 `summary detail copy` stable line 자체의 card/current-preview copy success/fallback 및 copied-state reset까지 같이 검증한다. 또한 compact `handoff-*` JSON artifact의 structured summary가 `preview/open`뿐 아니라 `summary copy`, `summary copy preview`, `summary detail copy`, `summary detail copy preview`, `summary detail copy preview line copy`, `summary detail copy preview line copy body` exact-match row와 verification summary까지 함께 유지하는지, 추가로 handoff `digest/manifest/index`의 txt/md sibling artifact에도 `summary-copy`, `summary-copy-preview`, `summary-detail-copy`, `summary-detail-copy-preview`, `summary-detail-copy-preview-line-copy`, `summary-detail-copy-preview-line-copy-body` dedicated section, exact-match counter/sha, stable line set이 persisted 되고 release 탭 inline preview body에서도 같은 marker/counter가 실제로 렌더링되는지까지 모두 만족하는지 같이 잠금
- `결과와 기록` 상단에는 현재 detail mode, 최근 세션, 결과물 수, 검토 상태를 먼저 보여 주는 context strip을 배치
- `하네스` 탭은 MarkItDown식 Markdown source-of-record 원칙, text-first retrieval memory, Hermes/OpenAI식 session-first 운영 루프를 현재 런타임 데이터 위에서 읽기 좋은 형태로 묶어 주며, `다음 실행 retrieval preview`로 snippet transparency도 함께 보여 줌
- 세션 목록과 provider 상태는 항상 열어 두는 inspector 대신, 하단 세부 탭 안에서 필요할 때만 확인
- `결과와 기록` workbench는 결과 본문이 더 넓고 또렷하게 읽히도록 비율과 타이포를 조정했고, 실행/승인/산출물 목록은 더 얇은 검사 패널처럼 분리
- `검토하기` 단계와 검토 탭은 `승인 대기 → 후속 작업 → 준비 상태` 순서로 재배치해, 사람이 먼저 결정해야 하는 항목이 가장 먼저 보이도록 정리

현재 playbook presets는 공개 agent repo 운영 패턴을 참고해 구성되어 있습니다.

- `Team Pipeline`: staged multi-agent handoff
- `Research First`: evidence before build
- `Review Stack`: product / design / engineering readiness
- `Verify Before Close`: verification evidence and completion gates

환경 변수로 호스트와 포트를 바꿀 수 있습니다.

```bash
PERSONAL_AI_AGENT_UI_HOST=127.0.0.1 PERSONAL_AI_AGENT_UI_PORT=4400 npm run ui
```

`bootstrap:local` registers the current repo as a workspace, creates a starter mission, runs it with the `stub` provider, and prints the workspace/mission/run payload so you can inspect the full flow without external API keys. Use `node scripts/bootstrap-local.mjs --workspace /path --name my-repo --run --provider stub` for custom paths or providers.

Register a workspace:

```bash
node src/cli.mjs workspace add /absolute/path/to/repo --name my-repo
```

Show or list workspaces:

```bash
node src/cli.mjs overview global
node src/cli.mjs overview providers
node src/cli.mjs overview operator-timeline
node src/cli.mjs overview operator-timeline --provider-since 2026-04-02T00:00:00.000Z
node src/cli.mjs provider list
node src/cli.mjs provider check openai
node src/cli.mjs provider activity
node src/cli.mjs provider activity-timeline --provider stub
node src/cli.mjs provider events --provider local
node src/cli.mjs provider probe openai
node src/cli.mjs provider history
node src/cli.mjs provider timeline
node src/cli.mjs workspace list
node src/cli.mjs workspace show workspace_xxx
node src/cli.mjs workspace overview workspace_xxx
node src/cli.mjs workspace timeline workspace_xxx
node src/cli.mjs workspace timeline workspace_xxx --provider-since 2026-04-02T00:00:00.000Z
```

`workspace overview`와 `overview global`은 mission/session/approval 집계뿐 아니라 open escalation pressure, escalation tier 분포, breach count total, reminder count total, needs-reminder count, owner transition total, pending owner handoff overdue count, pending owner handoff reminder count, next pending owner handoff due/reminder timestamp, 그리고 maintenance가 실제로 영향을 준 mission breadth까지 함께 보여줍니다. `overview global`은 여기에 provider health summary와 nested `providerOverview`도 포함해서 configured/ready provider 수, latest probe success or failure, unprobed provider 수, pending provider attention overdue count, pending provider attention needs-reminder count, next provider attention due/reminder timestamp, latest provider attention reminder를 top-level control-plane에서 바로 확인할 수 있습니다. `overview operator-timeline --provider-since ...`는 이 operator chronology 위에 같은 recent provider window contract를 덧붙여, 최근 provider execution or attention trend를 operator event stream과 같은 응답에서 같이 읽을 수 있게 합니다. `workspace timeline --provider-since ...`도 같은 recent provider window contract를 받아서, workspace chronology와 recent workspace-bound provider execution or attention trend를 한 surface에서 같이 읽을 수 있습니다. `workspace overview`는 workspace-scope run뿐 아니라 global sweep나 mission-scope sweep가 이 workspace mission에 남긴 maintenance impact도 함께 집계하고, 이 workspace에서 실제로 발생한 provider execution 실패와 provider attention pending/reminder 상태도 별도 summary field로 노출합니다.

Create missions:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode knowledge \
  --deliverable prd \
  --title "Draft agent roadmap" \
  --objective "Draft the next milestone PRD"

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Stabilize release smoke" \
  --objective "Produce a bounded implementation proposal" \
  --constraints "Keep blast radius small|Preserve release evidence flow" \
  --attachment docs/reference-repos.md

# If MarkItDown is installed, CLI attachments can also use local document files.
# Set PERSONAL_AI_AGENT_MARKITDOWN_BIN when the converter is not on PATH.
# The same env var is used by `npm run ui` for browser-uploaded PDF/Office attachments.
PERSONAL_AI_AGENT_MARKITDOWN_BIN=markitdown node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode knowledge \
  --title "Review converted source packet" \
  --objective "Use converted Markdown from the attached document as retrieval input" \
  --attachment ./source-packet.pdf

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Parallel specialist dry run" \
  --objective "Validate manager-controlled specialist fan-out and merge" \
  --constraints "parallel-specialists:research,implementation,verification|Keep blast radius small"

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode knowledge \
  --title "Profile-driven specialist dry run" \
  --objective "Validate orchestration profile preset selection" \
  --constraints "orchestration-profile:knowledge-triad|Keep blast radius small"

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Full-spectrum specialist dry run" \
  --objective "Validate five-lane specialist fan-out and merge" \
  --constraints "parallel-specialists:research,implementation,verification,design,documentation|Keep blast radius small"

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Full-spectrum profile dry run" \
  --objective "Validate engineering full-spectrum orchestration profile" \
  --constraints "orchestration-profile:engineering-full-spectrum|Keep blast radius small"
```

Run and inspect missions:

```bash
node src/cli.mjs mission list
node src/cli.mjs mission run mission_xxx
node src/cli.mjs mission run mission_xxx --provider stub
node src/cli.mjs mission run mission_xxx --provider anthropic --fallback-provider stub
node src/cli.mjs mission run mission_xxx --provider anthropic --fallback-provider stub --fallback-policy recoverable-provider-failure-only
OPENAI_API_KEY=... node src/cli.mjs mission run mission_xxx --provider openai
ANTHROPIC_API_KEY=... node src/cli.mjs mission run mission_xxx --provider anthropic
LOCAL_PROVIDER_MODEL=llama3.1 LOCAL_PROVIDER_BASE_URL=http://127.0.0.1:11434/v1 node src/cli.mjs mission run mission_xxx --provider local
HERMES_PROVIDER_MODEL=nous-hermes-4 HERMES_PROVIDER_BASE_URL=http://127.0.0.1:8000/v1 node src/cli.mjs mission run mission_xxx --provider hermes
node src/cli.mjs mission execution preflight mission_xxx
node src/cli.mjs mission execution preflight mission_xxx --request-approval
node src/cli.mjs mission execution start mission_xxx
node src/cli.mjs mission execution status mission_xxx
node src/cli.mjs mission execution logs mission_xxx
node src/cli.mjs mission execution stop mission_xxx
node src/cli.mjs mission show mission_xxx
node src/cli.mjs mission timeline mission_xxx
node src/cli.mjs session list mission_xxx
node src/cli.mjs session show mission_xxx
node src/cli.mjs session show mission_xxx --session session_xxx
node src/cli.mjs overview profiles --used-only
node src/cli.mjs overview profiles --workspace workspace_xxx --used-only
node src/cli.mjs overview profiles --drift-only --status follow-up-required
node src/cli.mjs overview profiles --reason-code quality-gate-blocked
node src/cli.mjs overview profiles --usage-trend growing --used-only
node src/cli.mjs overview profiles --workspace-usage-trend declining --used-only
node src/cli.mjs overview profiles --adoption-drift-status growing --used-only
node src/cli.mjs overview profiles --workspace-adoption-drift-status growing --used-only
node src/cli.mjs overview profiles --workspace-adoption-drift-reason-code workspace-profile-footprint-declining --used-only
node src/cli.mjs overview profiles --workspace-drift-only
node src/cli.mjs overview profiles --workspace-reason-code specialist-follow-up-open
node src/cli.mjs overview profiles --workspace-status follow-up-required --used-only
node src/cli.mjs overview maintenance
node src/cli.mjs overview maintenance --outcome effective
node src/cli.mjs overview maintenance --since 2026-04-01T00:00:00.000Z
```

`mission run mission_xxx` without `--provider` now resolves to `openai` when `OPENAI_API_KEY` is present. If OpenAI is not configured, it falls back to `stub` so local smoke runs and bootstrap still work without external credentials. Use `--provider anthropic` for side-by-side comparison or fallback experiments rather than the default execution path.

`mission run mission_xxx --provider anthropic --fallback-provider stub` enables explicit mission-level failover. The default `--fallback-policy provider-failure-only` retries only when the failed attempt has normalized provider failure metadata, so deterministic reviewer failures, approval gates, and specialist quality gates do not get hidden by provider fallback. Use `--fallback-policy recoverable-provider-failure-only` when fallback must be limited to recoverable transport/timeout/rate-limit style provider failures and must stop on non-recoverable config, schema, or deterministic output failures. `--fallback-policy` is accepted only with at least one distinct `--fallback-provider`, avoiding a policy-looking no-op when no fallback provider can run. CLI output includes `providerFallback` with attempted providers, selected provider, fallback usage, policy id, stop-reason counts, session ids, and provider failure summaries. `mission timeline`, `mission show`, `workspace timeline`, `overview operator-timeline`, `provider events`, and `overview providers` also expose fallback policy and stop-reason metadata so failover remains auditable after the run output is gone.

Provider fallback attempts now also expose a `providerRouteDecision` record. The record links the fallback attempt to the mission route, gateway event id, permission/sandbox decision ids, primary provider, active provider, fallback provider set, next provider, fallback policy, stop reason, and sanitized provider failure metadata. The same decision id appears in immediate `providerFallback.attempts[]`, mission/workspace/operator timelines, `provider events --family fallback`, and `overview providers`, so the route that produced a fallback or stop condition can be inspected without rebuilding state from raw session history.

Channel adapter manifests now expose the OpenClaw-style gateway seam without enabling external messaging. `channel adapters` returns the `personal-ai-agent-channel-adapter-registry/v1` registry, local CLI/web adapter status, disabled future channel stop reasons, no-secret evidence policy, and required enablement gates. CLI `mission create/run` gateway events also carry `source.channelAdapterId`, `source.channelAdapterPolicyId`, `source.channelAdapterStatus`, and `source.externalMessagingEnabled=false` so channel policy is visible without adding send/receive or webhook behavior.

Identity/session binding is now first-class gateway evidence. CLI `mission create/run` events expose `personal-ai-agent-identity-session-context/v1` under `identitySessionContext`, retain legacy `identity` compatibility fields, and add `gatewayIdentitySessionContextId` to mission run session source context. `mission timeline`, `workspace timeline`, and `overview operator-timeline` include `identity-session-context-recorded` events plus binding-status, policy, and source-type summary counts. `overview identity-sessions` provides the same records as a filtered operator audit packet with workspace, mission, session, binding status, source type, channel adapter status, memory scope, and no-raw-secrets/no-raw-customer-payload counters.

Gateway events now also have a direct operator audit packet. `overview gateway-events` summarizes full gatewayEvent records by event type, route, source/channel adapter, identity binding, permission decision, sandbox mode, provider route, fallback policy, workspace, and mission while preserving no-raw-secrets/no-raw-customer-payload counters and keeping `productionReadyClaim=false`.

Gateway event와 provider attention remediation은 이제 같은 `permissionDecision` record shape를 노출합니다. `mission create/run`의 gateway event는 `local-runtime-gateway-permission/v1` policy id, allow/approval/deny decision, route/resource binding, capability metadata, no-secret evidence policy를 남기고, `action remediate-provider-attention`은 `provider-attention-remediation-permission/v1` decision으로 same-provider rerun 또는 explicit fallback rerun capability를 기록합니다. 기존 `permissionPolicy` field는 compatibility 용도로 유지됩니다.

Gateway event는 같은 방식으로 `sandboxDecision` record도 노출합니다. `mission create/run`은 `personal-ai-agent-sandbox-decision/v1` schema와 `local-runtime-sandbox-policy/v1` policy id로 selected sandbox mode, denied capability metadata, route/resource binding, no-secret evidence policy를 남기며, mission timeline의 `gateway-event-recorded`와 별도 `sandbox-decision-recorded` event에 함께 표시됩니다. `workspace timeline`과 `overview operator-timeline`도 `sandbox-decision-recorded` chronology와 sandbox mode/policy summary를 반환하므로 sandbox boundary를 gateway payload 재해석 없이 audit할 수 있습니다.

운영 콘솔에서도 같은 정책이 적용됩니다. UI 실행 제어는 primary provider, fallback provider, fallback policy를 같은 mission run API로 전달하며, fallback provider를 고르지 않으면 fallback policy selector는 비활성화됩니다. UI에서 provider를 비워 두고 실행하면 현재 런타임 기본 provider 정책을 그대로 따릅니다. Web action inbox의 provider-attention 항목도 `action remediate-provider-attention`과 같은 service path를 호출하므로 same-provider 복구, default `provider-failure-only` fallback 복구, strict `recoverable-provider-failure-only` fallback 복구를 버튼 단위로 실행할 수 있습니다.

`mission execution ...` 명령군은 execution-capable `engineering` mission 전용입니다.

- `preflight`: 실행 가능 여부, policy verdict, blocked reason, current or latest lease 확인
- `preflight --request-approval`: 1회 실행용 `execution_lease` approval 생성
- `start`: active lease가 있을 때 foreground execution session 시작
- `status`: latest execution session, verification, changed files, lease 상태 확인
- `logs`: 저장된 execution log line 확인
- `stop`: 현재 foreground execution session 중단 요청

v1 execution은 이제 현재 리포만이 아니라 configured trusted workspace root 아래 workspace까지 지원합니다. 즉, `engineering` mission은 같은 trusted root 아래에 추가한 sibling repo에서도 `preflight -> approval lease -> start` 경로를 탈 수 있고, execution policy는 전체 trusted root가 아니라 선택한 workspace root를 boundary로 사용합니다. root 밖 경로는 여전히 proposal-only로 남고, `preflight`에서 `실행 미지원`으로 명확히 드러납니다.

execution policy는 shell 기반 실행의 blast radius를 줄이기 위해 workspace-local 단일 명령만 허용하는 보수적 allow path를 사용합니다. `preflight`는 shell chaining, pipe, redirection, command substitution, 절대/홈 경로 직접 참조, network/remote shell/file transfer, dependency install/update/publish/exec, git remote/history/worktree mutation, deploy/release/external platform mutation을 차단하고, non-recursive file delete/move와 parent path reference는 warning으로 표시합니다.

`overview profiles`는 preset catalog와 health drift뿐 아니라 top-level summary에 workspace별 preset footprint와 monthly usage trend도 함께 올립니다. 그래서 `workspaceProfileCounts`, `workspaceMissionCounts`, `usedWorkspaceCount`, `latestUsedWorkspace`만으로 어떤 workspace가 어떤 orchestration profile을 실제로 많이 쓰는지 바로 읽을 수 있고, `workspaceHealthDriftProfileCounts`, `workspaceHealthDriftStatusCounts`, `latestHealthDriftWorkspace`로 unstable preset pressure가 어느 workspace에서 올라오는지도 바로 확인할 수 있습니다. root-level `workspaceHealthDrift`는 workspace layer 전체의 current status를 quick field로 보여주고, `workspaceProfileCounts`, `workspaceStatusCounts`, `latestFollowUpRequiredWorkspace`, `latestWatchWorkspace`도 함께 반환하므로 unstable preset pressure가 어느 workspace에서 몇 개 profile로 쌓였는지뿐 아니라 가장 최근 follow-up-required workspace와 watch workspace도 root field만으로 바로 식별할 수 있습니다. root-level `workspaceUsageTrend`는 catalog 전체 workspace footprint가 month-over-month로 growing인지 declining인지 빠르게 읽게 해 주고, 이 `workspaceUsageTrend`도 `workspaceCount`, `workspaceProfileCounts`, `workspaceStatusCounts`, `workspaceIdsByStatus`, `latestWorkspaceId`, `latestWorkspaceName`, `latestWorkspaceProfileId`, `latestWorkspaceStatus`, `latestGrowingWorkspace`, `latestDecliningWorkspace`를 같이 반환하므로, profile-level workspace trend가 어느 workspace에 분포하는지와 최근 어떤 workspace가 growth or decline를 만들었는지도 root quick field만으로 바로 확인할 수 있습니다. 여기에 root-level `workspaceAdoptionDrift`도 추가되어 workspace 기준 mission volume 변화와 preset footprint 변화를 함께 해석한 combined adoption status를 quick field로 제공합니다. `workspaceAdoptionDrift`는 `statusCounts`, `reasonCodeCounts`, `missionTrendStatusCounts`, `profileFootprintTrendStatusCounts`, `workspaceIdsByStatus`, `latestWorkspace`를 같이 반환하므로, 어떤 workspace가 preset mission volume을 늘리고 있는지와 어떤 workspace가 footprint 자체를 확장 또는 축소하는지도 catalog root에서 바로 읽을 수 있습니다. 이번 단계부터 root quick field는 `latestGrowingProfile`, `latestDecliningProfile`, `latestGrowingWorkspace`, `latestDecliningWorkspace`도 같이 반환하므로, workspace adoption pressure를 만든 최신 preset과 최신 workspace를 방향별로 바로 식별할 수 있습니다. 각 profile item의 `workspaceUsageTrend`도 같은 방향으로 확장되어 `workspaceCount`, `workspaceStatusCounts`, `workspaceIdsByStatus`, `latestWorkspace`, `latestGrowingWorkspace`, `latestDecliningWorkspace`를 같이 반환하므로 한 preset 안에서 어느 workspace가 footprint growth를 만들었고 어느 workspace가 최근 decline를 만들었는지도 item payload에서 바로 읽을 수 있습니다. 각 profile item의 `workspaceAdoptionDrift`도 같이 반환하므로, 한 preset 안에서 workspace별 mission volume drift와 profile footprint drift를 combined signal로 바로 읽을 수 있고 `latestWorkspace`를 통해 가장 최근 adoption pressure를 만든 workspace도 확인할 수 있습니다. 이번 단계부터 item payload도 `latestGrowingWorkspace`, `latestDecliningWorkspace`를 같이 반환하므로 one preset 안에서 최근 growth를 만든 workspace와 decline를 만든 workspace를 root quick field와 같은 방식으로 바로 식별할 수 있습니다. 이제 `--workspace-adoption-drift-status`와 `--workspace-adoption-drift-reason-code`도 지원하므로, growing workspace adoption이나 declining workspace footprint를 만드는 preset만 catalog surface에서 직접 slice할 수 있습니다. summary 역시 `healthDriftStatus`, `healthDriftCounts`, `healthDriftReasonCodes`, `healthDriftReasonCodeCounts`, `healthDriftLatestProfile`, `workspaceHealthDriftStatus`, `workspaceHealthDriftCounts`, `workspaceHealthDriftReasonCodes`, `workspaceHealthDriftReasonCodeCounts`, `workspaceHealthDriftLatestWorkspace`, `workspaceHealthDriftLatestFollowUpRequiredWorkspace`, `workspaceHealthDriftLatestWatchWorkspace`, `workspaceHealthDriftWorkspaceCount`, `workspaceHealthDriftWorkspaceProfileCounts`, `workspaceHealthDriftWorkspaceStatusCounts`, `workspaceHealthDriftWorkspaceIdsByStatus`, `usageTrendStatus`, `usageTrendProfileCount`, `usageTrendStatusCounts`, `usageTrendLatestGrowingProfile`, `usageTrendLatestDecliningProfile`, `usageTrendLatestUnusedProfile`, `workspaceUsageTrendStatus`, `workspaceUsageTrendProfileCount`, `workspaceUsageTrendWorkspaceCount`, `workspaceUsageTrendProfileStatusCounts`, `workspaceUsageTrendWorkspaceProfileCounts`, `workspaceUsageTrendLatestGrowingProfile`, `workspaceUsageTrendLatestDecliningProfile`, `workspaceUsageTrendLatestUnusedProfile`, `workspaceUsageTrendLatestGrowingWorkspace`, `workspaceUsageTrendLatestDecliningWorkspace`, `workspaceUsageTrendLatestWorkspaceProfileId`, `workspaceUsageTrendLatestWorkspaceId`, `workspaceUsageTrendLatestWorkspaceName`, `workspaceUsageTrendLatestWorkspaceStatus`, `workspaceUsageTrendWorkspaceIdsByStatus`, `workspaceUsageTrendWorkspaceStatusCounts`, `workspaceUsageTrendProfileCounts`, `workspaceUsageTrendStatusCounts`뿐 아니라 `adoptionDriftStatus`, `adoptionDriftStatusCounts`, `adoptionDriftReasonCodes`, `adoptionDriftLatestProfile`, `adoptionDriftLatestGrowingProfile`, `adoptionDriftLatestDecliningProfile`, `adoptionDriftLatestUnusedProfile`, `workspaceAdoptionDriftProfileCounts`, `workspaceAdoptionDriftWorkspaceProfileCounts`, `workspaceAdoptionDriftStatusCounts`, `workspaceAdoptionDriftWorkspaceStatusCounts`, `workspaceAdoptionDriftCounts`, `workspaceAdoptionDriftStatus`, `workspaceAdoptionDriftReasonCodes`, `workspaceAdoptionDriftLatestGrowingProfile`, `workspaceAdoptionDriftLatestDecliningProfile`, `workspaceAdoptionDriftLatestGrowingWorkspace`, `workspaceAdoptionDriftLatestDecliningWorkspace`, `workspaceAdoptionDriftLatestWorkspace`, `workspaceAdoptionDriftMissionTrendStatusCounts`, `workspaceAdoptionDriftProfileFootprintTrendStatusCounts`, `workspaceAdoptionDriftWorkspaceIdsByStatus`, `workspaceAdoptionDriftReasonCodeCounts`, `workspaceAdoptionDriftWorkspaceCount`, `latestGrowingWorkspaceAdoptionProfile`, `latestDecliningWorkspaceAdoptionProfile`, `latestGrowingWorkspaceAdoptionWorkspace`, `latestDecliningWorkspaceAdoptionWorkspace`도 같이 반환해서 profile-level health pressure, mission volume trend, workspace footprint growth or decline, combined adoption pressure가 어느 축에서 생기는지와 최근 누가 그 신호를 만들었는지까지 post-processing 없이 읽게 합니다. root-level `usageTrend`는 catalog 전체 mission volume trend를 보여주고, `adoptionDrift`는 mission volume과 workspace footprint를 함께 해석한 combined adoption status를 quick field로 제공하며, `healthDrift`와 `workspaceHealthDrift`도 quality gate 또는 specialist follow-up pressure를 quick field로 제공합니다. 이번 단계부터 `healthDrift`는 `latestFollowUpRequiredProfile`, `latestWatchProfile`, `latestStableProfile`, summary는 `healthDriftLatestFollowUpRequiredProfile`, `healthDriftLatestWatchProfile`, `healthDriftLatestStableProfile`도 같이 반환하므로 follow-up-required preset, watch preset, stable preset의 최신 linkage도 generic latest profile과 분리해서 바로 읽을 수 있습니다. `workspaceHealthDrift`와 summary alias도 `latestStableWorkspace`와 `workspaceHealthDriftLatestStableWorkspace`를 같이 반환해 stable workspace까지 같은 direction-aware contract로 확인할 수 있습니다. 각 profile item도 `healthDrift`, `adoptionDrift`, `usageTrend`, `workspaceUsageTrend`를 같이 반환하므로 어떤 preset이 quality gate로 막혀 있는지, 실행량은 늘었지만 workspace footprint는 정체인지, 또는 둘 다 declining인지까지 profile catalog만으로 바로 확인할 수 있습니다. 이번 단계부터 item-level `healthDrift`도 `latestProfile`, `latestFollowUpRequiredProfile`, `latestWatchProfile`, `latestStableProfile`를 같이 반환하므로 root quick field와 item payload를 같은 direction-aware linkage shape로 소비할 수 있습니다. summary와 item이 모두 `usageMonthlyBuckets`, `usageMonthlyBucketCount`, `usageLatestMonthlyBucketStartDate`, `usageLatestMonthlyBucketDelta`, `usageTrend`, `workspaceUsageTrend`를 같이 반환하므로 어떤 preset이 최근 월간 사용량 기준으로 실제로 늘고 있는지뿐 아니라 workspace footprint 기준으로도 커지고 있는지 또는 줄고 있는지 profile catalog만으로 바로 확인할 수 있습니다. 이제 `--reason-code`, `--workspace-reason-code`, `--usage-trend`, `--workspace-usage-trend`, `--adoption-drift-status`, `--adoption-drift-reason-code`, `--workspace-adoption-drift-status`, `--workspace-adoption-drift-reason-code`, `--workspace-drift-only`, `--workspace-status`도 지원하므로 blocked quality gate, open specialist follow-up, adoption growth or decline를 같은 catalog surface에서 바로 slice할 수 있습니다.

이번 단계부터 item-level `workspaceHealthDrift`도 `workspaceProfileCounts`와 `workspaceStatusCounts`를 같이 반환하므로 per-profile workspace health pressure 분포를 root `workspaceHealthDrift`와 같은 field shape로 바로 읽을 수 있습니다. summary도 `workspaceUsageTrendCurrentMonthStartDate`, `workspaceUsageTrendCurrentMonthWorkspaceCount`, `workspaceUsageTrendPreviousMonthStartDate`, `workspaceUsageTrendPreviousMonthWorkspaceCount`, `workspaceUsageTrendWorkspaceCountDelta`를 직접 반환하므로 root quick field를 다시 열지 않아도 workspace footprint month-over-month comparison을 바로 읽을 수 있습니다. 같은 방식으로 `usageTrendCurrentMonthStartDate`, `usageTrendCurrentMonthMissionCount`, `usageTrendPreviousMonthStartDate`, `usageTrendPreviousMonthMissionCount`, `usageTrendMissionCountDelta`도 summary에 올라오므로 mission-volume month-over-month comparison 역시 root `usageTrend`를 다시 열지 않고 summary만으로 바로 읽을 수 있습니다. `adoptionDriftUsageTrendStatus`와 `adoptionDriftWorkspaceUsageTrendStatus`도 summary에 직접 올라오므로 combined adoption status가 mission-volume growth 때문인지 workspace footprint growth 때문인지도 root `adoptionDrift` quick field를 다시 열지 않고 바로 해석할 수 있습니다. 같은 symmetry로 `workspaceAdoptionDrift`도 이제 root quick field와 summary 모두 `missionTrendStatus`와 `profileFootprintTrendStatus`를 반환하므로 workspace-level combined adoption pressure가 어떤 축에서 올라오는지도 같은 field shape로 바로 읽을 수 있습니다. 이번 단계부터 `usageTrend`와 `workspaceUsageTrend`도 root quick field와 summary 모두 `latestProfile`, `latestWorkspace` generic linkage를 같이 반환하므로 direction-specific latest link와 별도로 해당 trend surface의 최신 preset과 최신 workspace를 빠르게 식별할 수 있습니다.

`mission timeline`은 session, approval, reviewer follow-up, memory뿐 아니라 mission-scoped escalation open/resolved/reminded event도 함께 보여주며, resolved follow-up은 `rerun-fixed`, `superseded`, `scope-reduced`, `accepted-risk` taxonomy를 detail에 포함합니다. `accepted-risk`는 close와 동시에 monitoring escalation을 열고, owner transition이 발생하면 해당 escalation은 `action inbox --class handoff-required`와 `action owner-handoffs`에서 acknowledgement queue로 다시 노출됩니다. owner handoff에는 별도 reminder trail도 붙으며, overdue acknowledgement나 re-notify 모두 timeline detail에 남습니다. mission-scoped maintenance sweep를 실행하면 mission summary와 mission timeline도 직접 maintenance evidence를 보여주고, workspace-wide maintenance sweep가 특정 mission pressure를 처리한 경우에도 mission timeline에는 related `maintenance-run` evidence가 연결됩니다. mission summary는 direct maintenance aggregate와 별도로 combined `maintenance impact` summary를 제공해, indirect workspace sweep가 이 mission에 준 reminder 효과도 한 번에 확인할 수 있습니다. mission summary는 여기에 mission-scoped provider execution and provider attention aggregate, specialist run and merge aggregate도 함께 노출해서, 해당 mission에서 어떤 provider run이 실패했고 provider attention이 pending, recovered, acknowledged, resolved, reminded 중 어디까지 진행됐는지, specialist branch가 completed, blocked, failed, abandoned 중 어디에 있는지도 바로 확인할 수 있습니다. specialist branch는 이제 typed `specialistHandoff`를 남기므로 manager merge와 specialist follow-up surface가 `currentState`, `deliverables`, `acceptanceCriteria`, `evidence`, `blockers`, `nextHandoff`를 같은 contract로 읽습니다. specialist runtime은 `orchestration-profile:<id>` constraint도 받아서 preset specialist set과 quality gate를 선택할 수 있고, mission/workspace/global/operator summary는 `specialistOrchestrationProfileId`, `specialistConfiguredKinds`, `specialistOrchestrationProfileCounts`, `specialistTouchedOrchestrationProfileIds`를 함께 반환하므로 profile-driven fan-out도 explicit specialist constraint와 같은 observability를 유지합니다. `overview profiles`는 여기에 preset catalog와 actual mission usage, latest selected mission, latest parallel group, open specialist follow-up pressure를 같은 payload로 묶어 주므로 어떤 orchestration profile이 실제 runtime에서 얼마나 쓰였고 어느 preset에 gate backlog가 남아 있는지도 별도 state reconstruction 없이 바로 읽을 수 있습니다. 이번 단계부터는 profile surface도 `specialistFollowUpRetryPolicyCounts`, `specialistFollowUpRemediationRouteCounts`, `specialistFollowUpLatestReminderAt`, `specialistFollowUpNextReminderAt`, `healthDrift`를 같이 반환하므로 triad preset이 실제로 fast verification remediation path를 얼마나 만들고 있는지와 어떤 preset이 현재 follow-up-required 상태인지도 preset 단위로 바로 읽을 수 있습니다. profile quality gate가 미충족이면 manager merge는 실제로 차단되고, mission summary에는 `specialistQualityGateStatus`, `specialistQualityGateViolationCount`, `specialistLatestQualityGateViolation`이 올라오며 mission/workspace/operator chronology에는 `specialist-quality-gate-blocked` event가 남습니다. 이 경우 `specialist-follow-up-required`는 failed or blocked branch뿐 아니라 gate-only violation도 `followUpSource=quality-gate`로 다시 열어 주므로, abandoned or missing verification signal 같은 profile policy gap도 same follow-up surface에서 복구할 수 있습니다. triad profile은 이제 `retryPolicy`를 실제 follow-up policy에 연결해서 verification gate backlog를 더 짧은 SLA와 reminder cadence로 올리고, specialist follow-up item의 기본 command hint도 direct `action remediate-specialist-follow-up` route로 바꿔서 operator가 generic mission rerun 대신 dedicated remediation path로 바로 진입하게 합니다. generic action summary도 `specialistFollowUpProviderCounts`, `specialistFollowUpKindCounts`, `specialistFollowUpStatusCounts`, `specialistFollowUpNeedsReminderCount`, `specialistFollowUpOverdueCount`, `specialistFollowUpReminderCountTotal`, `specialistFollowUpRetryPolicyCounts`, `specialistFollowUpRemediationRouteCounts`를 같이 반환하므로 mixed queue에서도 specialist pressure와 remediation route 분포를 별도 follow-up 화면 없이 읽을 수 있습니다. specialist follow-up reminder aggregate도 mission, workspace, global summary에 같이 올라오므로 `specialistFollowUpNeedsReminderCount`, `specialistFollowUpOverdueCount`, `specialistFollowUpReminderCountTotal`, `specialistLatestReminderAt`, `specialistNextReminderAt`만으로 reminder pressure의 현재 상태를 다시 계산하지 않고 바로 읽을 수 있습니다. specialist reminder record는 이제 same remediation route metadata와 fallback command를 같이 남기므로 fast-policy reminder인지와 later remediation path를 reminder trail만으로도 바로 확인할 수 있습니다. unified `action inbox`는 이제 monitoring escalation, owner handoff, provider attention reminder pressure를 공통 `--needs-reminder` slice로도 보여주고, blocked or failed specialist branch는 `specialist-follow-up-required` action으로 다시 노출합니다. `action log-overdue`도 같은 specialist aggregate를 response summary와 incident markdown에 포함하므로 queue에서 본 specialist reminder pressure를 incident trail에서 그대로 다시 확인할 수 있습니다. overdue incident markdown은 여기에 specialist follow-up retry policy aggregate, remediation route aggregate, per-item route urgency, fallback command까지 기록하므로 queue triage에서 본 recovery path가 incident trail에서도 유지됩니다. 같은 overdue incident payload는 `providerHealthDriftOverdueCount`, `providerHealthDriftProviderCounts`, `providerHealthDriftReasonCodeCounts`도 같이 노출하므로 provider drift pressure도 queue와 incident trail 사이에서 같은 summary contract를 유지합니다. specialist follow-up도 이제 dedicated reminder trail을 가지므로 `action specialist-follow-ups --needs-reminder`와 `action remind-specialist-follow-ups`가 same mission/workspace timeline에 `specialist-follow-up-reminded` evidence를 남깁니다. workspace/global operator timeline은 maintenance sweep 실행뿐 아니라 pressure를 실제로 처리한 `maintenance-required-acknowledged`, `maintenance-required-resolved` evidence, workspace-bound `provider-execution-failed` trigger, 이어지는 provider attention `opened/reminded/recovered/acknowledged/resolved` lifecycle, 그리고 specialist branch/merge chronology도 함께 보여줍니다. 이제 이 operator chronology summary도 `specialistFollowUpRequiredCount`, `specialistFollowUpNeedsReminderCount`, `specialistFollowUpOverdueCount`, `specialistLatestReminderAt`, `specialistNextReminderAt`를 직접 반환하므로 timeline payload만으로 current specialist reminder pressure를 읽을 수 있습니다.

이번 단계부터 root-level `workspaceAdoptionDrift`와 각 profile item은 generic `latestProfile`를 같이 반환하고, summary도 `workspaceAdoptionDriftLatestProfile` alias를 같이 노출합니다. 그래서 workspace adoption pressure를 만든 최신 preset을 direction-specific latest link를 다시 조합하지 않고 바로 읽을 수 있습니다.

Operator flow:

```bash
node src/cli.mjs action inbox
node src/cli.mjs action inbox --class retry-ready
node src/cli.mjs action inbox --class handoff-required
node src/cli.mjs action inbox --class maintenance-required
node src/cli.mjs action inbox --class monitoring-required
node src/cli.mjs action inbox --class specialist-follow-up-required
node src/cli.mjs action specialist-follow-ups
node src/cli.mjs action specialist-follow-ups --needs-reminder
node src/cli.mjs action specialist-follow-ups --status failed
node src/cli.mjs action remind-specialist-follow-ups --due --status failed --note "Re-check the failed specialist branch and resume if still relevant"
node src/cli.mjs action remediate-specialist-follow-up specialist-follow-up:parallel-group_xxx:implementation:agentrun_xxx
node src/cli.mjs action inbox --class monitoring-required --effective-owner human-approver
node src/cli.mjs action inbox --needs-reminder
node src/cli.mjs action provider-attention
node src/cli.mjs action provider-attention --needs-reminder
node src/cli.mjs action provider-attention --overdue
node src/cli.mjs action provider-attention --status acknowledged
node src/cli.mjs action provider-attention --status recovered
node src/cli.mjs action provider-attention --status resolved
node src/cli.mjs action inbox --priority high
node src/cli.mjs action inbox --owner human-approver
node src/cli.mjs action inbox --overdue
node src/cli.mjs action maintenance --workspace workspace_xxx --note "Sweep due reminders for escalations, owner handoffs, provider attention, and specialist follow-ups"
node src/cli.mjs action maintenance-history
node src/cli.mjs action maintenance-history --outcome no-op
node src/cli.mjs action maintenance-history --since 2026-04-01T00:00:00.000Z
node src/cli.mjs action reviewer-followups
node src/cli.mjs action reviewer-followups --status resolved
node src/cli.mjs action reviewer-followups --status resolved --kind scope-reduced
node src/cli.mjs action owner-handoffs
node src/cli.mjs action owner-handoffs --needs-reminder
node src/cli.mjs action owner-handoffs --overdue
node src/cli.mjs action owner-handoffs --status acknowledged
node src/cli.mjs action resolve-reviewer-follow-up reviewer-follow-up:mission_xxx:session_xxx --kind scope-reduced --note "Handled in a narrower follow-up plan"
node src/cli.mjs action resolve-reviewer-follow-up reviewer-follow-up:mission_xxx:session_xxx --kind accepted-risk --note "Accept risk until the next release window"
node src/cli.mjs action log-overdue
node src/cli.mjs action log-overdue --class specialist-follow-up-required
node src/cli.mjs action escalated
node src/cli.mjs action escalated --tier critical
node src/cli.mjs action escalated --needs-reminder
node src/cli.mjs action escalated --needs-reminder --effective-owner human-approver
node src/cli.mjs action sync-escalations
node src/cli.mjs action remind-escalations --due
node src/cli.mjs action remind-escalations --tier critical --overdue --note "Notify the workspace owner to re-check this pressure"
node src/cli.mjs action remind-owner-handoffs --due --note "Follow up with the human approver about the pending handoff"
node src/cli.mjs action remind-provider-attention --due --note "Re-check the pending provider failure and confirm remediation"
node src/cli.mjs action remediate-provider-attention provider-attention:stub:execution:agentrun_xxx
node src/cli.mjs action remediate-provider-attention provider-attention:anthropic:execution:agentrun_xxx --fallback-provider stub
node src/cli.mjs action remediate-provider-attention provider-attention:anthropic:execution:agentrun_xxx --fallback-provider stub --fallback-policy recoverable-provider-failure-only
node src/cli.mjs action acknowledge-provider-attention provider-attention:anthropic:probe:provider-probe_xxx --note "Anthropic probe failure acknowledged"
node src/cli.mjs action resolve-provider-attention provider-attention:anthropic:probe:provider-probe_xxx --note "Anthropic probe recovered"
node src/cli.mjs action acknowledge-owner-handoff escalation_xxx --note "Human approver acknowledged the ownership handoff"
node src/cli.mjs action resolve-escalation escalation_xxx --note "Handled manually"
node src/cli.mjs approval inbox
node src/cli.mjs approval list
node src/cli.mjs approval resolve approval_xxx --decision approve --reason "Proceed with the proposed workspace change"
```

`smoke:specialist-follow-up-inbox`와 `smoke:specialist-follow-up-reminders`는 이제 triad-era lane만이 아니라 post-triad lane도 함께 검증합니다. inbox smoke는 `design` follow-up aggregate를, reminder smoke는 `documentation` reminder lifecycle을 고정해서 five-lane specialist fan-out 이후에도 follow-up surface coverage가 lane drift 없이 유지되도록 합니다.

`smoke:operator-timeline`도 같은 post-triad follow-up pressure를 따라갑니다. workspace/global/operator chronology에서 `documentation` specialist reminder가 동일한 summary contract로 유지되는지와 recent provider weekly bucket summary가 실제 bucket payload와 일치하는지를 함께 고정해, lane 확장 이후 timeline smoke가 실행일 변화 때문에 흔들리지 않도록 했습니다.

`smoke:action-maintenance`와 `smoke:maintenance-history`도 이제 `documentation` specialist reminder origin을 따라갑니다. maintenance sweep, maintenance overview/history, affected mission breadth, reminder aggregate가 post-triad lane에서도 같은 contract를 유지하는지까지 deterministic하게 검증합니다.

`smoke:action-overdue-log`도 같은 `documentation` specialist reminder origin을 incident trail까지 이어서 검증합니다. overdue escalation markdown, provider drift summary, specialist follow-up aggregate가 post-triad lane에서도 같은 incident contract를 유지하는지 확인합니다.

`resume-research-and-verification-fast` remediation wording은 이제 triad preset 전용이 아니라 full-spectrum preset까지 포함한 generic policy copy를 사용합니다. 따라서 specialist follow-up route reason만 봐도 fast remediation이 `research`와 `verification` quality gate policy에서 왔는지 바로 구분할 수 있습니다.

`action maintenance-history`와 `overview maintenance`는 이제 reminder total뿐 아니라 affected mission breadth, latest impact run, latest impact mission ids도 같이 보여줍니다. `--workspace`는 global sweep와 mission-scope run이 이 workspace mission에 남긴 impact까지 포함하고, `--mission`은 related workspace sweep를 history item으로 포함하면서도 mission-specific reminder effect는 별도 `missionImpact*` summary field로 같이 보여줍니다. 또 maintenance 전용 summary는 `effectiveRunCount`, `noOpRunCount`, `impactRunCount`, `latestEffectiveRun`, `latestNoOpRun`, `recentRuns`를 함께 반환해서 최근 sweep trend를 raw item 재해석 없이 바로 확인할 수 있고, `--outcome <effective|no-op|impactful>`로 원하는 run slice만 직접 조회할 수 있습니다. `--since <iso-timestamp>`를 함께 주면 최근 기간 run만 남겨서 time-window audit도 할 수 있습니다. 추가로 `dailyBuckets`는 filtered run set을 날짜별로 묶어 runCount, effective/no-op split, totalRemindedCount, affected mission breadth를 같이 보여주고, `latestBucketDelta`는 최신 날짜 bucket과 직전 bucket의 차이를 바로 요약합니다. maintenance summary는 여기에 `weeklyBuckets`, `latestWeeklyBucketDelta`, `monthlyBuckets`, `latestMonthlyBucketDelta`도 같이 반환하므로, 같은 filtered slice를 더 거친 주간 and 월간 trend로도 바로 읽을 수 있습니다. 이 daily, weekly, monthly bucket plus delta payload는 이제 specialist follow-up retry policy and remediation route aggregate도 같이 보존하므로, maintenance trend만 봐도 어떤 specialist recovery path가 누적되거나 사라졌는지 바로 읽을 수 있습니다. mission, workspace, global summary뿐 아니라 workspace timeline과 operator timeline summary, immediate `action maintenance` receipt, unified `action inbox` summary, 그리고 `action log-overdue` response summary까지 여기에 `maintenanceMonthlyBucketCount`, `maintenanceLatestMonthlyBucketStartDate`, `maintenanceOldestMonthlyBucketStartDate`, `maintenanceLatestMonthlyBucketDelta` quick field를 같이 노출하므로 `overview maintenance`를 따로 열지 않아도 current month maintenance drift를 control-plane과 incident triage 경로에서 바로 읽을 수 있습니다. provider attention reminder뿐 아니라 specialist follow-up reminder도 maintenance sweep 대상에 포함되므로, maintenance summary와 mission/workspace/global overview에는 `providerAttentionRemindedCount`와 `specialistFollowUpRemindedCount` 계열 집계가 같이 올라옵니다. maintenance execution summary와 persisted maintenance run은 이제 specialist follow-up retry policy and remediation route aggregate도 같이 남기므로, maintenance sweep 결과와 later maintenance history 양쪽에서 어떤 specialist recovery path를 다시 밀었는지 바로 읽을 수 있습니다. `action remind-specialist-follow-ups` summary도 이제 provider, specialist kind, retry policy, remediation route, status aggregate를 함께 반환하므로 reminder emission 결과만으로도 어떤 recovery path를 다시 밀어야 하는지 바로 읽을 수 있습니다.

Memory and documentation:

```bash
node src/cli.mjs memory add --scope user --kind preference --content "Prefer concise decision memos."
node src/cli.mjs memory list --scope user
node src/cli.mjs doc log --type devlog --title "Kickoff" --content "Started managed multi-agent implementation."
```

## Runtime Behavior

`mission run` in v1 performs a deterministic managed sequence:

1. `manager` builds session context and loads memory
2. `planner` produces a bounded plan and adapts it with prior mission memory when available
3. if the mission constraints include `parallel-specialists:<kinds>` or `orchestration-profile:<profileId>`, the manager opens up to five specialist child branches across `research`, `implementation`, `verification`, `design`, and `documentation`
4. unresolved specialist branches surface as `specialist-follow-up-required`, and profile quality gate violations can also open the same follow-up item even when the latest branch is only `abandoned` or missing
5. manager merge runs only after the active profile quality gate passes; when it does not, the mission stops at `specialist` with `specialist-quality-gate-blocked` evidence
6. `action remediate-specialist-follow-up <actionId>` reruns the same mission and provider, so only unresolved or quality-gate-required specialist branches resume inside the same `parallelGroupId` lineage
   The Web action inbox uses the same remediation service path, so operators can trigger dedicated specialist recovery from the queue instead of falling back to a generic mission rerun.
7. `executor` writes the merged draft artifact or the standard sequential artifact and carries forward prior mission signals
8. `reviewer` validates required sections and next action
9. if the result is risky, an `Approval` is created and the mission stops at `awaiting_approval`

Engineering mode intentionally stops at proposal quality. It does not mutate registered workspaces in v1.

## Provider Notes

- `provider list` shows implementation state, env readiness, required env, and default-provider status without executing a mission.
- `provider check <id>` shows one provider's effective local configuration with secret values reduced to presence booleans, plus the latest persisted probe and latest execution when available.
- provider probes and provider-backed mission stages now share one normalized failure envelope: `failureKind`, `recoverable`, `httpStatus`, `timedOut`, `attemptCount`, `providerResponseId`, `rawMessage`.
- provider adapters now use explicit timeout plus bounded retry. retry is limited to transport failures, timeout, `429`, and `5xx`; `4xx`, empty output, non-JSON output, and schema-invalid output are treated as deterministic no-retry failures.
- probe and execution telemetry now carries `durationMs`, and provider-backed executions also normalize `usageInputTokens`, `usageOutputTokens`, and `usageTotalTokens` so provider observability can distinguish failure shape from runtime cost signals.
- provider-backed execution telemetry now also supports optional pricing envs per adapter: `OPENAI_INPUT_COST_PER_1M_USD`, `OPENAI_OUTPUT_COST_PER_1M_USD`, `ANTHROPIC_INPUT_COST_PER_1M_USD`, `ANTHROPIC_OUTPUT_COST_PER_1M_USD`, `LOCAL_INPUT_COST_PER_1M_USD`, `LOCAL_OUTPUT_COST_PER_1M_USD`. when set, executions persist `estimatedCostUsd`, so `provider check`, provider activity or events, provider overview, and mission or workspace or global summaries can inspect approximate execution spend without re-reading raw usage data.
- execution cost summary now also exposes `estimatedCostUsdByProviderId` and `estimatedCostUsdByRole`, so aggregate spend can be attributed to one provider or one stage role without rebuilding the breakdown client-side.
- retry-aware provider telemetry now also persists `retryCount` plus per-attempt `attemptHistory`, so provider probe, provider activity, provider events, provider attention, and mission or workspace or global summaries can distinguish one-shot failures from success-after-retry and retry-exhausted failures.
- `provider activity` exposes provider-backed stage execution history derived from persisted `agentRuns`, with `--provider`, `--role`, `--status`, and `--since` filters.
- `provider activity` summary now also includes execution `dailyBuckets` plus `latestBucketDelta`, and these bucket aggregates follow the same filtered slice, so recent provider spend trend can be read for the whole history or just a recent window without rebuilding timeline data client-side.
- `provider activity-timeline` turns provider execution history into chronological success or failure events so model-backed mission execution can be inspected as a time axis.
- `provider events` merges persisted probe events, provider execution events, provider attention opened, acknowledgement, recovery, resolution, reminder events, and provider fallback audit events into one chronological stream, with `--family <probe|execution|attention|fallback>`, probe- and execution-specific filters, and `--since` for recent-window provider chronology slices.
- `overview providers` now also accepts `--since` and returns a `recentWindow` summary so top-level provider health can show a recent probe or execution or attention slice without changing the existing full-history summary contract.
- `overview providers` summary now also promotes the recent monthly rollup linkage directly as `providerRecentExecutionMonthlyBucketCount`, `providerRecentExecutionLatestMonthlyBucketStartDate`, `providerRecentExecutionOldestMonthlyBucketStartDate`, and `providerRecentExecutionLatestMonthlyBucketDelta`, so the provider-only control-plane can read month-level trend without opening nested recentWindow buckets first.
- `overview providers` now also returns `healthDrift`, and `overview global` returns `providerHealthDrift`, combining current attention overdue or needs-reminder pressure with recent monthly execution drift so provider health movement can be read from one summary block.
- `mission show`, `mission timeline`, `workspace overview`, `workspace timeline`, and `overview operator-timeline` now also return `providerHealthDrift`, so provider drift can be read symmetrically from mission, workspace, operator, provider, and global surfaces.
- `action inbox` now also exposes `provider-health-drift-required`, a mission-owner follow-up action for `watch` drift that remains after provider attention has already been closed, so residual provider degradation can be triaged without reopening the provider-only overview surfaces.
- `action provider-health-drift` now exposes the same residual drift follow-up items as a dedicated query surface, so drift-only mission follow-up can be sliced by provider, workspace, mission, or overdue-only state without filtering the generic inbox manually.
- `action log-overdue` now also accepts `provider-health-drift-required`, so overdue residual drift follow-up can be promoted into the incident trail instead of staying only in queue state.
- `action inbox` and `action log-overdue` now also accept `--provider <stub|openai|anthropic|local|hermes>`, so provider-specific attention or drift work can be sliced directly from the generic control-plane surface.
- `action inbox` summary now also exposes `providerCounts`, so provider-scoped backlog can be read directly from the generic queue summary without dropping into provider-only surfaces.
- `action remediate-provider-attention <actionId>` now provides a local-first remediation path for current provider failures: probe attention reruns provider probe, execution attention reruns the same mission with the same provider, and execution attention can also accept `--fallback-provider` plus `--fallback-policy` so the mission can recover through explicit failover while preserving whether the operator allowed any normalized provider failure or only recoverable provider failures. `--fallback-policy` is rejected unless `--fallback-provider` is also supplied, avoiding a policy-looking no-op on same-provider reruns. Provider execution attention items now surface the remediation command directly, keep `inspectCommand` for failed activity review, and expose `fallbackRecommendedCommand`, `recoverableFallbackRecommendedCommand`, `fallbackPolicyId`, and `fallbackPolicyOptions` for non-stub providers.
- `overview global` now also accepts `--provider-since` and returns `providerRecentWindow` plus recent provider summary linkage, so the top-level control-plane can show overall system state and recent provider health together.
- `overview operator-timeline` now also accepts `--provider-since` and returns `providerRecentWindow` plus recent provider summary linkage, so operator chronology and recent provider execution or attention trend can be inspected from one surface.
- `workspace overview` now also accepts `--provider-since` and returns `providerRecentWindow` plus recent provider summary linkage, so a workspace owner can inspect current workspace state and recent provider execution or attention activity together.
- `workspace timeline` now also accepts `--provider-since` and returns `providerRecentWindow` plus recent provider summary linkage, so workspace chronology and recent provider execution or attention trend can be inspected together.
- `mission show` and `mission timeline` now also accept `--provider-since` and return `providerRecentWindow` plus recent provider summary linkage, so mission-level provider execution and attention activity can be inspected without leaving the mission surface.
- every `providerRecentWindow` now also includes execution `dailyBuckets`, `executionBucketCount`, `executionLatestBucketDate`, `executionOldestBucketDate`, and `executionLatestBucketDelta`, so recent provider execution trend can be read without reopening provider activity history.
- `providerRecentWindow` now also includes execution `weeklyBuckets`, `executionWeeklyBucketCount`, `executionLatestWeeklyBucketStartDate`, `executionOldestWeeklyBucketStartDate`, and `executionLatestWeeklyBucketDelta` for coarse weekly trend checks on the same recent slice.
- `providerRecentWindow` now also includes execution `monthlyBuckets`, `executionMonthlyBucketCount`, `executionLatestMonthlyBucketStartDate`, `executionOldestMonthlyBucketStartDate`, and `executionLatestMonthlyBucketDelta` so the same recent slice can be read as a coarse monthly rollup without reopening full provider activity history.
- provider-aware mission or workspace or global or operator summaries now also promote the recent monthly rollup linkage directly as `providerRecentExecutionMonthlyBucketCount`, `providerRecentExecutionLatestMonthlyBucketStartDate`, `providerRecentExecutionOldestMonthlyBucketStartDate`, and `providerRecentExecutionLatestMonthlyBucketDelta`, so the latest month trend can be read without opening the nested recentWindow payload first.
- `overview providers` combines current provider readiness with persisted probe audit so configured, ready, unprobed, latest-success, latest-failure, and latest-skipped probe state can be read in one response.
- `overview providers` now also summarizes provider execution volume, execution and probe duration totals or averages, execution token usage totals, latest successful or failed execution, latest provider attention acknowledgement, latest provider attention recovery, latest provider attention resolution, latest provider attention reminder, pending attention overdue count, pending attention needs-reminder count, next attention due/reminder timestamp, and it exposes the latest unified provider event so probe health, operator acknowledgement, recovery evidence, explicit resolution, reminder pressure, and actual mission-path usage can be inspected together.
- `provider check <id>` now includes the current pending provider attention item when it exists, including `pendingAttentionDueAt`, `pendingAttentionIsOverdue`, `pendingAttentionSlaHours`, `pendingAttentionNeedsReminder`, `pendingAttentionNextReminderAt`, and `pendingAttentionReminderCount`.
- `action inbox --class provider-attention-required` now promotes the latest failed provider probe or failed provider execution into an operator action item. probe failure becomes a global attention item, and mission-scoped execution failure becomes a workspace-bound attention item.
- `action provider-attention` exposes the provider attention lifecycle directly and supports `--status <pending|acknowledged|recovered|resolved>`, `--needs-reminder`, and `--overdue` so provider failures can be audited and re-triaged after they leave the main action inbox.
- `action acknowledge-provider-attention <actionId>` records that a specific latest provider failure was acknowledged; the pending attention item stays cleared until a newer failed provider event arrives for that provider.
- `action resolve-provider-attention <actionId>` explicitly closes an acknowledged provider attention item and adds a `provider-attention-resolved` event to the unified provider event stream.
- a newer successful probe or successful mission execution by the same provider now promotes the previous latest failure into derived `recovered` attention state, so operator surfaces can distinguish silent recovery from manual acknowledgement or explicit resolution.
- `action remind-provider-attention` records reminder emission against currently pending provider attention items, and `action maintenance` now includes provider attention due reminders in the same local-first sweep as escalations and owner handoffs.
- `provider probe <id>` attempts a lightweight endpoint reachability check and model listing when the provider is configured; if required env is missing it returns a structured non-attempted result instead of throwing.
- `provider history` shows persisted probe runs and supports `--provider`, `--ok`, and `--attempted` filtering.
- `provider timeline` turns persisted probe runs into chronological events so recent success, failure, and skipped checks can be inspected as a time axis.
- `smoke:provider-retry-telemetry` locks successful retry, retry-exhausted execution failure, pending provider attention retry metadata, and mission or workspace or global retry-summary propagation in one deterministic local scenario.
- `smoke:provider-fallback-policy` locks explicit `--fallback-provider` mission failover, including provider failure retry to `stub`, non-retry behavior for deterministic reviewer failures, and `recoverable-provider-failure-only` stop-condition behavior for non-recoverable provider failures.
- `smoke:target-provider-operations` now requires provider fallback runtime audit coverage from `mission run --fallback-provider --fallback-policy`, mission/workspace/operator timelines, `provider events --family fallback`, and `action remediate-provider-attention --fallback-provider --fallback-policy` before a target provider operations claim can advance.
- `stub` remains the deterministic default for local development and smoke coverage.
- `openai` now uses the OpenAI Responses API and reads:
  - `OPENAI_API_KEY` required
  - `OPENAI_MODEL` optional, default `gpt-5.2`
  - `OPENAI_BASE_URL` optional, default `https://api.openai.com/v1`
- if `OPENAI_API_KEY` is missing, `mission run --provider openai` returns a normalized failed mission result before any network call.
- `anthropic` now uses the Anthropic Messages API and reads:
  - `ANTHROPIC_API_KEY` required
  - `ANTHROPIC_MODEL` optional, default `claude-sonnet-4-6`
  - `ANTHROPIC_BASE_URL` optional, default `https://api.anthropic.com/v1`
  - `ANTHROPIC_VERSION` optional, default `2023-06-01`
  - `ANTHROPIC_MAX_TOKENS` optional, default `2048`
- if `ANTHROPIC_API_KEY` is missing, `mission run --provider anthropic` returns a normalized failed mission result before any network call.
- `local` targets an OpenAI-compatible local `/chat/completions` endpoint and reads:
  - `LOCAL_PROVIDER_MODEL` required
  - `LOCAL_PROVIDER_BASE_URL` optional, default `http://127.0.0.1:11434/v1`
  - `LOCAL_PROVIDER_API_KEY` optional
  - `LOCAL_PROVIDER_MAX_TOKENS` optional, default `2048`
- if `LOCAL_PROVIDER_MODEL` is missing, `mission run --provider local` returns a normalized failed mission result before any network call.
- `hermes` targets an OpenAI-compatible Hermes-style `/chat/completions` endpoint with Hermes `<tool_call>{...}</tool_call>` parsing and reads:
  - `HERMES_PROVIDER_MODEL` required
  - `HERMES_PROVIDER_BASE_URL` optional, default `http://127.0.0.1:8000/v1`
  - `HERMES_PROVIDER_API_KEY` optional
  - `HERMES_PROVIDER_MAX_TOKENS` optional, default `2048`
  - `HERMES_PROVIDER_PROBE_TIMEOUT_MS` optional, default `5000`
  - `HERMES_PROVIDER_RUN_TIMEOUT_MS` optional, default `30000`
- if `HERMES_PROVIDER_MODEL` is missing, `mission run --provider hermes` returns a normalized failed mission result before any network call.

## State Layout

```text
docs/
  roadmap.md
  reference-repos.md
  devlog.md
  incidents.md
  adr/ADR-001-runtime-and-agent-shape.md

var/
  state.json
  missions/<mission-id>/
    sessions/<session-id>/
      manager-prompt.md
      manager-context.md
      planner-prompt.md
      planner-plan.md
      executor-prompt.md
      implementation-proposal.md
      prd.md
      decision-memo.md
      reviewer-prompt.md
      reviewer-report.md
      approval-resolution.md
```

## Verification

Run the local-first smoke suite:

```bash
npm run smoke
npm run smoke:execution-flow
npm run smoke:execution-cli
npm run smoke:ui-execution-console
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:execution-v1-closeout-runtime-summary
npm run verify:execution-v1
npm run smoke:action-inbox
npm run smoke:escalated-inbox
npm run smoke:escalation-sync
npm run smoke:escalation-reminder-due
npm run smoke:escalation-reminders
npm run smoke:escalation-owner-chain
npm run smoke:escalation-owner-handoff
npm run smoke:escalation-owner-handoff-reminders
npm run smoke:escalation-owner-history
npm run smoke:action-overdue-log
npm run smoke:operator-timeline
npm run smoke:reviewer-follow-up-lifecycle
npm run smoke:reviewer-follow-up-accepted-risk
npm run smoke:approval-approve
npm run smoke:approval-inbox
npm run smoke:reviewer-fail
npm run smoke:approval
npm run smoke:approval-reject
npm run smoke:memory-rerun
npm run smoke:mission-attachments
npm run smoke:fact-graph-memory
npm run smoke:document-conversion
npm run smoke:runtime-discovery
npm run smoke:instruction-boundary
npm run smoke:ui-mission-attachments
npm run smoke:session-history
npm run smoke:mission-timeline
npm run smoke:workspace-overview
npm run smoke:global-overview
npm run smoke:provider-surface
npm run smoke:provider-overview
npm run smoke:provider-activity
npm run smoke:provider-events
npm run smoke:provider-hardening
npm run smoke:provider-telemetry
npm run smoke:provider-fallback-policy
npm run smoke:execution-v1-artifact-refresh
npm run smoke:target-provider-operations
npm run smoke:provider-action-inbox
npm run smoke:provider-attention-lifecycle
npm run smoke:provider-attention-recovery
npm run smoke:provider-attention-reminders
npm run smoke:provider-probe
npm run smoke:provider-history
npm run smoke:provider-timeline
npm run smoke:parallel-specialists
npm run smoke:openai-provider
npm run smoke:anthropic-provider
npm run smoke:local-provider
npm run smoke:hermes-provider
```

All current smokes are deterministic and require no external API key.

`npm run smoke:orchestration-profiles`는 현재 six-profile orchestration catalog 전체를 검증합니다. 특히 `knowledge-full-spectrum`와 Hermes metadata가 붙은 `engineering-full-spectrum`이 unused preset으로 summary/adoption/workspace trend에 정확히 반영되는지까지 같이 확인합니다.

`npm run verify:execution-v1`는 실행형 에이전트 v1 마감용 검증 entrypoint입니다.

- 기본 실행:
  - `smoke:execution-flow`
  - `smoke:execution-cli`
  - `smoke:ui-execution-console`
  - `smoke:ui-execution-browser-e2e`
  - `smoke:reference-adoptions`
  - `smoke:execution-v1-live-helpers`
  - `smoke:execution-v1-handoff`
  - `smoke:production-readiness-gate`
- 선택적 live validation:
  - `npm run verify:execution-v1 -- --live-openai`
  - `npm run verify:execution-v1 -- --live-anthropic`
  - `npm run verify:execution-v1 -- --live-local`
  - `npm run verify:execution-v1 -- --live-hermes`

각 deterministic npm smoke는 기본 20분 timeout으로 bounded 실행되며, 결과 JSON에는 `durationMs`, `stdoutBytes`, `stderrBytes`, `timeoutMs`가 포함됩니다. 필요하면 `PERSONAL_AI_AGENT_VERIFY_SCRIPT_TIMEOUT_MS`와 `PERSONAL_AI_AGENT_VERIFY_MAX_BUFFER_BYTES`로 로컬 검증 한계를 조정할 수 있습니다. browser E2E의 Playwright guard 설치 timeout은 기본 120초이며, timeout-only failure는 fresh browser session startup flake로 보고 1회 재시도합니다. 느린 로컬 브라우저 환경에서는 `PERSONAL_AI_AGENT_BROWSER_GUARD_TIMEOUT_MS`로 별도 조정할 수 있습니다.

live validation flag를 주면 해당 provider env가 있을 때만 실제 `engineering mission run → execution lease approval → foreground execution start → verification passed`까지 검증합니다. env가 없으면 그 provider는 `skipped`로 기록됩니다.
실행 자체가 실패하더라도 `node scripts/build-execution-v1-evidence.mjs --live-openai`는 중간에서 종료하지 않고, 실패 원인을 evidence와 closeout에 그대로 기록합니다.

`npm run evidence:execution-v1`는 위 검증 결과를 [execution-v1-evidence.md](docs/execution-v1-evidence.md)에 Markdown evidence로 저장합니다.

- 기본 실행: deterministic smoke 4개, reference adoption aggregate gate, execution-v1 live helper contract, handoff generator regression 실행 후 evidence 문서 갱신
- evidence에는 각 deterministic script의 elapsed time, stdout/stderr size, timeout budget을 담은 `Deterministic Runtime Summary`가 함께 기록됨
- archived live provider proof를 유지해야 하는 release artifact refresh에서는 `npm run refresh:execution-v1-artifacts`를 기본 경로로 사용해 evidence/closeout/handoff/provider readiness/snapshot/pilot export manifest를 함께 갱신
- 선택적 live validation 포함:
  - `node scripts/build-execution-v1-evidence.mjs --live-openai`
  - `node scripts/build-execution-v1-evidence.mjs --live-anthropic`
  - `node scripts/build-execution-v1-evidence.mjs --live-local`
  - `node scripts/build-execution-v1-evidence.mjs --live-hermes`

`npm run refresh:execution-v1-artifacts`는 execution-v1 evidence, closeout, handoff, production provider readiness, immutable snapshot, pilot export package manifest refresh 순서를 하나의 operator command로 묶습니다. 기본적으로 current evidence의 archived live validation status를 보존하고 필요한 `--live-*` flag를 자동 재사용하므로, OpenAI/Anthropic archived proof를 실수로 deterministic-only 결과로 덮어쓰지 않습니다. `npm run smoke:execution-v1-artifact-refresh`는 이 orchestration command가 package script에 등록되어 있고 dry-run에서 preserve-live flag, reuse-existing-evidence closeout, handoff, provider readiness, snapshot, pilot export package 순서를 유지하는지 검증합니다.

`npm run closeout:execution-v1`는 evidence를 다시 생성한 뒤 [execution-v1-closeout.md](docs/execution-v1-closeout.md)에 v1 마감 체크리스트를 기록합니다. 이 문서는 deterministic smoke 4종, reference adoption gate, deterministic runtime summary, browser interaction readiness, live validation 상태를 한눈에 보여 주는 closeout surface입니다.
기존 evidence를 재사용해 closeout만 다시 만들려면 `npm run closeout:execution-v1 -- --reuse-existing-evidence`를 사용합니다.
fixture나 임시 경로에서 closeout 생성기를 검증할 때는 `node scripts/build-execution-v1-closeout.mjs --evidence-path /tmp/evidence.md --output-path /tmp/closeout.md`처럼 `--output-path`를 지정해 canonical 문서를 덮어쓰지 않을 수 있습니다.
`npm run handoff:execution-v1`는 현재 evidence/closeout을 읽어 [execution-v1-handoff.md](docs/execution-v1-handoff.md)를 재생성합니다. 이 문서는 deterministic/local-first readiness, Harness-style execution surface, Hermes Agent adoption surface, reference adoption coverage, live provider missing-env blocker, 그리고 operator가 다음에 실행할 provider validation command를 한곳에 고정하는 handoff artifact입니다.
fixture나 임시 경로에서 handoff 생성기를 검증할 때는 `node scripts/build-execution-v1-handoff.mjs --evidence-path /tmp/evidence.md --closeout-path /tmp/closeout.md --output-path /tmp/handoff.md`처럼 canonical 문서를 덮어쓰지 않을 수 있습니다.
`npm run smoke:execution-v1-handoff`는 임시 evidence/closeout fixture로 handoff 생성기를 실행해 commit, reference adoption aggregate, visual artifact set, live-provider missing-env command, 다음 operator step이 handoff 문서에 다시 기록되는지 확인합니다.
`npm run smoke:execution-v1-status`는 실제 repo root로 UI server를 띄운 뒤 `/api/execution-v1/status`가 현재 HEAD 기준 evidence/closeout/handoff, deterministic 8/8, runtime summary 8개, reference adoption readiness, live helper readiness, browser E2E readiness, handoff generator readiness, production readiness gate, immutable snapshot을 모두 인식하는지 검증합니다. `결과와 기록 > v1 마감 상태` 상단 summary에도 `live helper`, `production blockers`, `open blockers`, `production status` chip이 표시되어 OpenAI/Anthropic/local/Hermes live-helper contract와 release-readiness stop-condition을 UI에서 바로 확인할 수 있습니다. Production-ready blocker callout은 production status, blocker count, stop reason, release-readiness doc link, verification commands, full blocker list를 묶은 `production summary 복사` action을 제공합니다. Production-ready blocker list는 기본 8건 요약으로 유지되며, `전체 보기`/`8개만 보기` toggle로 24개 blocker 전체를 같은 release tab에서 펼쳐 확인할 수 있습니다. 각 production-ready blocker row는 `rpblocker` deep link, focused callout, row link copy, guarded release-readiness evidence document open/copy action, verification command runbook copy action, handoff context와 verification commands와 release-readiness evidence를 묶은 package copy action, blocker index, production status, release label, guarded release-readiness link, verification commands를 포함한 `blocker handoff 복사` action도 제공합니다. Current open blocker row는 provider account, provider architecture, target deployment, release decision 같은 triage category와 관련 evidence doc, 다음 command copy action을 함께 보여 주며, release tab은 category/owner count와 top-priority blocker를 `open blocker triage` 요약으로 함께 보여 줍니다. 이 triage 요약의 category/owner control은 `rbcategory`와 `rbowner` URL state로 current open blocker list를 좁히기 때문에 operator가 provider-ops나 target-deployment 같은 blocker slice를 바로 공유할 수 있습니다. category/owner 조합이 비어 있으면 triage callout은 empty filter 상태를 표시하고 category만 유지, owner만 유지, 조합 해제 action을 제공합니다. 선택한 blocker는 `rblocker` release deep link와 focused callout으로 reload/share handoff가 가능하며, focused callout에서도 같은 guarded evidence doc open/copy action, next command copy action, closure checklist copy action, single-blocker package copy action을 바로 사용할 수 있습니다. 관련 evidence doc은 guarded `/api/execution-v1/release-doc?path=...` 링크로 바로 열거나 문서 링크를 복사할 수 있어 stop-condition row에서 근거 문서로 즉시 이동할 수 있습니다. 또한 `handoff 복사`는 blocker metadata, release deep link, evidence doc link, next command를 한 번에 담은 operator handoff text를 생성하고, `closure 체크리스트 복사`는 단일 blocker의 closing evidence, evidence docs, commands, artifact refresh rule, final verification gates를 하나로 묶으며, `blocker package 복사`는 단일 blocker의 handoff, closure checklist, command runbook, evidence bundle을 하나로 묶습니다. `slice handoff 복사`는 현재 `rbcategory`/`rbowner` 필터와 visible/total blocker count, 필터된 release link, 각 blocker의 evidence/command summary를 하나의 공유 가능한 handoff text로 생성합니다. `slice 명령 복사`는 같은 필터 slice에서 blocker id와 command label/value만 command runbook으로 뽑아 row command를 하나씩 복사하지 않고도 실행 컨텍스트를 전달할 수 있게 합니다. `slice 근거 복사`는 같은 필터 slice의 evidence doc을 deduplicated bundle로 묶고 source blocker id, guarded doc link, availability를 함께 기록해 proof-only handoff에 사용할 수 있습니다. 같은 triage callout은 active slice의 command count, deduplicated evidence doc count, top visible blocker도 함께 보여 주어 어떤 package를 복사할지 사전에 확인할 수 있습니다. `slice 요약 복사`는 같은 active slice의 category, owner, visible/total blocker count, command count, evidence doc count, top blocker, release link를 짧은 package manifest로 복사합니다. `slice package 복사`는 summary, handoff, closure checklist, command runbook, evidence bundle을 하나로 묶어 complete operator handoff package를 복사합니다. `slice closure 체크리스트 복사`는 active slice의 각 blocker별 closing evidence, evidence docs, commands, artifact refresh rule, final verification gates를 묶어 filtered stop-condition closure handoff로 복사합니다. 이 smoke는 fixture가 아니라 현재 workspace 산출물을 읽으므로 commit 전 release handoff readiness 확인에 사용합니다. 단, 현재 HEAD가 verified commit 위에서 `docs/execution-v1-*.md`와 `docs/releases/execution-v1/**`만 바꾼 release artifact sync commit이면, evidence 생성 commit과 HEAD가 달라도 `artifact-sync-current`로 인정해 evidence 커밋 직후 다시 stale이 되는 순환을 막습니다.
`npm run smoke:execution-v1-snapshot`은 현재 evidence/closeout/handoff와 `docs/releases/execution-v1/<verified-commit>/` immutable snapshot의 commit, archive metadata, source path, closeout evidence link, handoff evidence/closeout/snapshot link, deterministic/runtime summary row를 비교합니다. snapshot을 새로 쓰지 않고 기존 release artifact integrity만 확인합니다. status smoke와 동일하게 artifact-only sync commit은 verified commit의 immutable snapshot을 검증 대상으로 유지합니다.
`npm run smoke:execution-v1-closeout-runtime-summary`는 이 임시 출력 경로를 사용해 runtime summary가 완전하면 `ready`, 누락되면 `not verified`로 기록되는지 검증합니다. 이 smoke는 `verify:execution-v1`의 deterministic total을 늘리지 않는 generator regression smoke입니다.
`npm run smoke:execution-v1-live-helpers`는 OpenAI, Anthropic, local, Hermes 각각의 provider preflight가 필요한 deterministic smoke를 통과하는지 확인하고, env 누락 시 `npm run live:execution-v1:*` helper가 shell-ready `missing-env` JSON과 provider별 `export ... && npm run live:execution-v1:*` 명령을 반환하는지 검증합니다.
`npm run smoke:release-artifact-hygiene`는 현재 execution-v1 evidence/closeout/handoff, production-like release drill, pilot export package manifest, verified immutable snapshot에 실제 credential pattern 또는 machine-local path leak이 없는지 검증합니다. 같은 hygiene check는 `smoke:production-readiness-gate`에도 포함되어 production-ready overclaim 방지와 shareable artifact hygiene을 같은 gate에서 확인합니다.
`npm run smoke:target-deployment-contract`는 [target-deployment-contract-v1.md](docs/target-deployment-contract-v1.md)의 production-like and hosted SaaS deployment profiles, mandatory controls, required commands, blocking rules, 그리고 release/security/deployment/product/README 연결 상태를 검증합니다. 이 gate는 target evidence contract이며 `productionReadyClaim: false`를 유지합니다.
`npm run smoke:backup-restore-drill`은 isolated temp runtime에서 `var/` backup manifest를 만들고 sha256 digest를 검증한 뒤 clean runtime restore, restored state hash match, tenant A 삭제 후 tenant B 유지, 같은 backup에서 tenant A 재복원 가능 여부를 확인합니다. 이 gate는 local restore rehearsal이며 hosted backup durability나 encrypted backup storage 증거를 대체하지 않습니다.
`npm run smoke:web-rbac`는 `PERSONAL_AI_AGENT_RBAC_MODE=enforce`로 UI server를 띄운 뒤 `x-personal-ai-agent-role` 기반 viewer/operator/approver/admin role contract가 mutating API를 실제로 차단하거나 허용하는지 검증합니다. 기본 로컬 UI는 기존처럼 RBAC off로 동작하며, shared pilot deployment에서만 enforce mode를 켜는 구조입니다.
`npm run smoke:web-auth-rbac`는 `PERSONAL_AI_AGENT_WEB_AUTH_MODE=enforce`와 `PERSONAL_AI_AGENT_WEB_AUTH_TOKEN`을 사용해 `/api/*` 요청의 bearer/header token을 먼저 검증하고, 인증된 요청도 `x-personal-ai-agent-role` RBAC를 통과해야 mutation이 허용되는지 확인합니다. 이 gate는 local shared-secret auth evidence이며 hosted identity/session RBAC를 대체하지 않습니다.
`npm run smoke:web-oidc-rbac`는 `PERSONAL_AI_AGENT_WEB_AUTH_MODE=oidc`와 JWKS 기반 RS256 bearer token을 사용해 issuer, audience, expiry, role claim을 검증하고, viewer token이 `x-personal-ai-agent-role` spoofing으로 operator 권한을 얻지 못하는지 확인합니다.
`npm run smoke:web-tenant-isolation`은 `PERSONAL_AI_AGENT_TENANT_MODE=enforce`와 OIDC `tenant_id` claim을 사용해 workspace 생성 tenant binding, workspace/mission list filtering, cross-tenant mission create/read 차단, tenant header spoofing 무시를 검증합니다.
`npm run smoke:runtime-data-lifecycle`는 isolated temp runtime에서 `var/state.json`과 mission artifact inventory를 만들고, relative-path export manifest와 sha256 audit evidence를 생성한 뒤, exact confirmation token 없이는 delete가 실패하고 올바른 token에서는 `var/` 삭제와 post-delete absence check가 통과하는지 검증합니다.
`npm run smoke:tenant-data-lifecycle`는 하나의 isolated temp runtime 안에서 tenant A/B state와 mission artifact를 만든 뒤, tenant A export가 tenant B state/artifact를 포함하지 않고, exact tenant confirmation token 없이는 delete가 실패하며, tenant A 삭제 후 tenant B state hash와 artifact가 유지되는지 검증합니다.
`npm run smoke:runtime-isolation`은 두 개의 isolated temp runtime을 만들어 각각 workspace, memory, mission, session, artifact, export를 생성하고, 한쪽 runtime 삭제가 다른 runtime state hash와 `var/` 존재 여부를 바꾸지 않는지 검증합니다.
`npm run smoke:retention-delete-policy`는 [retention-delete-v1.md](docs/retention-delete-v1.md)의 data class retention table, export checklist, delete checklist, required commands, stop conditions, production gap, 그리고 release/security/deployment/product/README 연결 상태를 검증합니다. 이 gate는 pilot lifecycle evidence이며 `productionReadyClaim: false`를 유지합니다.
`npm run rehearsal:production-slo-operating`은 incident/SLO policy, target SLO architecture/operations, execution-v1 status/snapshot, release artifact hygiene, clean deployment rehearsal, runtime data lifecycle, runtime isolation gate를 함께 재생해 [production-slo-operating-v1.md](docs/production-slo-operating-v1.md)에 기록합니다. `npm run smoke:production-slo-operating`은 이 문서가 local SLO operating evidence와 production gap을 동시에 유지하는지 검증합니다.
`npm run rehearsal:clean-deployment-release`는 tracked files만 임시 clean checkout으로 복사하고 `var/`, `output/playwright/`, `node_modules/`, `.git/` 없이 핵심 release gates를 재실행해 [clean-deployment-release-v1.md](docs/clean-deployment-release-v1.md)에 기록합니다. `npm run smoke:clean-deployment-release`는 이 문서가 clean checkout command matrix와 production gap을 유지하는지 검증합니다.
`npm run smoke:incident-slo-policy`는 [incident-slo-v1.md](docs/incident-slo-v1.md)의 SEV1-SEV4 severity table, pilot SLO targets, incident entry criteria, required triage commands, evidence requirements, production gap wording이 release-readiness/security/product planning 문서와 일치하는지 검증합니다.
`npm run smoke:pilot-export-package`는 [pilot-export-package-v1.md](docs/pilot-export-package-v1.md)가 planning pack, release evidence, production-like drill, immutable snapshot을 repository-relative path와 sha256 digest로 묶고 `productionReadyClaim: false`를 유지하는지 검증합니다.

provider별 live validation을 한 번에 실행하려면 아래 helper를 사용하면 됩니다.

- `npm run preflight:execution-v1:all`
- `npm run preflight:execution-v1:openai`
- `npm run preflight:execution-v1:anthropic`
- `npm run preflight:execution-v1:local`
- `npm run preflight:execution-v1:hermes`
- `npm run live:execution-v1:openai`
- `npm run live:execution-v1:anthropic`
- `npm run live:execution-v1:local`
- `npm run live:execution-v1:hermes`

preflight helper는 해당 provider rerun 전에 필요한 deterministic smoke를 먼저 돌리고, env 준비 여부까지 JSON으로 요약합니다. 예를 들어 OpenAI preflight는 `smoke:openai-provider`와 `smoke:execution-flow`를 같이 확인한 뒤 `ready-for-live-validation` 또는 `ready-but-missing-env` 상태를 출력합니다.
전체 preflight helper는 OpenAI/Anthropic/local/Hermes 결과를 하나의 JSON으로 합치고, deterministic prerequisite이 막힌 provider가 없으면 env 누락 상태여도 exit 0으로 끝납니다. 이 출력의 `readyForLiveCount`, `missingEnvCount`, provider별 `envKey`, `liveCommand`, `missingEnvCommand`를 보고 실제 live validation 순서를 정하면 됩니다. 같은 aggregate check는 `결과와 기록 > v1 마감 상태`의 `전체 preflight 실행` 버튼에서도 실행할 수 있으며, 결과는 각 provider card preflight badge와 전체 provider preflight callout에 반영됩니다. aggregate check를 아직 실행하지 않은 UI 상태에서는 env count를 `not tracked`로 표시해 실제 missing count와 미실행 상태를 구분합니다.

필수 env가 없으면 helper는 실패 대신 `missing-env` JSON과 필요한 `export` 명령 형식을 먼저 출력합니다.
live validation 자체가 실패하면 helper는 `status=failed`와 함께 evidence path, closeout path, mission id, session id, temp root 경로를 출력하고 non-zero로 종료합니다.
실패 이유가 `provider live mission run failed | rootDir=... | missionId=...` 형식이면 helper와 evidence 문서가 같은 값을 구조화해서 `failure`, `rootDir`, `workspaceId`, `missionId`, `sessionId`, `artifact`, `reviewerSummary`로 다시 보여 줍니다. reviewer report와 implementation proposal이 temp root에 남아 있으면 helper는 `liveFailureTriage` 아래에 `reviewerReportPath`, `implementationProposalPath`, `failedChecks`, `findings`, `nextActionSnippet`까지 같이 출력합니다. rerun 뒤에는 터미널과 [execution-v1-evidence.md](docs/execution-v1-evidence.md)만 보면 바로 triage에 들어갈 수 있습니다.
OpenAI helper는 live validation rerun에서 planner timeout 재발을 줄이기 위해 `OPENAI_RUN_TIMEOUT_MS=60000`을 기본 child env로 자동 주입합니다. 이미 값을 export한 경우에는 사용자가 지정한 값을 그대로 우선합니다.
운영 콘솔의 `v1 마감 상태` 탭은 evidence/closeout/handoff 문서가 현재 HEAD를 가리키는지도 같이 보여 줍니다. 현재 commit과 문서가 기록한 commit이 다르거나, 세 문서가 워크트리에서 수정된 상태면 `evidence 갱신 필요`로 표시되며 closeout ready 상태로 계산하지 않습니다.
`npm run live:execution-v1:openai` helper는 이제 live evidence를 한 번만 생성하고, closeout은 그 evidence 파일을 재사용합니다. 즉, 성공한 first live run 뒤에 closeout 단계가 second live run을 다시 실행해 결과를 덮어쓰지 않습니다.
모든 `npm run live:execution-v1:*` helper는 selected provider를 재검증할 때 기존 OpenAI/Anthropic/local/Hermes archived live proof를 보존한 뒤 새 selected provider 결과만 교체합니다.

OpenAI live validation은 planner/executor 단계가 provider 응답 시간에 더 민감하므로 기본 `runTimeoutMs`를 45초로 맞췄습니다. 더 긴 응답 시간을 허용해야 하면 아래 env override를 같은 터미널 세션에 추가해서 rerun하면 됩니다.

- `OPENAI_RUN_TIMEOUT_MS=60000 npm run live:execution-v1:openai`
- `OPENAI_PROBE_TIMEOUT_MS=12000 npm run smoke:openai-provider`

engineering deliverable은 reviewer rubric과 executor output contract를 같은 규칙으로 맞춥니다. provider가 `Next Action`에 approval gate를 직접 쓰지 않더라도, normalize 단계에서 `Request explicit approval before running shell commands or mutating files ...` 문구로 canonicalize한 뒤 reviewer가 같은 기준으로 평가합니다. 같은 경로에서 `Diagnosis`, `Implementation Plan`, `Verification Plan`, `Risk Notes` 중 빠진 섹션이 있거나 `Verification Plan`에 smoke/test 언급이 없으면 execution manifest와 mission context를 기준으로 canonical section을 채워 넣습니다.
provider가 execution manifest에 `inspect`/`artifact` step만 주더라도 normalize 단계에서 최소 `test` step(`node --check src/cli.mjs`)을 강제로 추가합니다. 이 bounded verification fallback 덕분에 live validation은 reviewer markdown뿐 아니라 실제 execution session의 `verification.status`도 deterministic하게 `passed/failed`로 귀결되고, `not-run` 상태로 빠지지 않습니다.
같은 fallback 경로에서 planner/proposal이 제안한 hinted command는 그대로 실행하지 않고, 현재 리포에서 실제로 실행 가능한 command만 채택합니다. 예를 들어 `npm run <script>`는 `package.json`에 script가 있어야 하고, `python -m module` 또는 `node file`도 해당 모듈/파일이 실제로 존재할 때만 manifest에 포함됩니다. 존재하지 않는 hinted command는 버리고 bounded verification step만 유지합니다.
provider-supplied execution manifest에도 같은 정리가 적용됩니다. `TBD_AFTER_INSPECTION`, `e.g. ...`, `or equivalent`, `<runner>`, `<live-validate-entrypoint>`, `<model>` 같은 placeholder command는 실행 대상에서 제거하고, `ls -ლა`처럼 비ASCII option token이 섞인 suspicious shell command도 drop합니다. edit step 역시 `scripts/foo.{ext}` 같은 placeholder filePath나 `PLACEHOLDER:` content면 실행 대상에서 제외합니다. 그 결과 verification step이 비면 기본 `node --check src/cli.mjs` smoke로 대체합니다. 즉, live provider가 미완성 계획 텍스트를 남겨도 foreground execution session이 그 문자열을 그대로 shell이나 file write로 실행하지 않습니다.

`결과와 기록 > v1 마감 상태`의 evidence 표시는 `stale`와 `로컬 갱신됨(local-current)`을 구분합니다. evidence/closeout/handoff 문서가 현재 HEAD 기준으로 다시 생성되었지만 아직 커밋되지 않은 경우에는 stale로 보지 않고, 로컬에서 최신 근거 문서가 준비된 상태로 표시합니다. 즉, OpenAI live rerun 직후 evidence markdown이 dirty여도 현재 commit과 일치하면 release surface는 “근거 문서는 최신, 아직 미커밋”으로 보여야 합니다.

성공한 local evidence를 실제 release artifact로 남기려면 `npm run snapshot:execution-v1`를 실행합니다. 이 스크립트는 현재 [execution-v1-evidence.md](docs/execution-v1-evidence.md), [execution-v1-closeout.md](docs/execution-v1-closeout.md), [execution-v1-handoff.md](docs/execution-v1-handoff.md)를 읽어 `docs/releases/execution-v1/<verified-commit>/` 아래에 immutable snapshot을 만듭니다. current surface는 계속 dirty/local-current 상태로 유지하면서도, verified commit 기준 근거 문서는 별도 snapshot으로 커밋할 수 있습니다.

`결과와 기록 > v1 마감 상태`는 이제 이 snapshot도 함께 보여 줍니다. 즉, current evidence가 현재 HEAD와 어긋나 stale하더라도 마지막으로 고정된 verified snapshot의 commit, archivedAt, evidence/closeout/handoff 경로를 같은 화면에서 바로 확인할 수 있습니다. 또한 Anthropic/Hermes live validation과 target-boundary local provider architecture evidence는 optional provider expansion으로 분리되어, OpenAI/local 기준 v1 closeout readiness를 가리는 필수 gap처럼 집계되지 않습니다.

current surface와 verified baseline도 분리해서 읽습니다. `summary.ready`는 현재 HEAD 기준 evidence/closeout/handoff가 fresh한지를 의미하고, `verified baseline`은 마지막 immutable snapshot 기준으로 필수 closeout이 이미 닫혔는지를 의미합니다. 그래서 current evidence가 stale하더라도 verified snapshot이 있으면 UI는 `baseline ready · current surface refresh needed`처럼 두 상태를 함께 보여 줍니다.

release snapshot도 이제 콘솔에서 직접 고정할 수 있습니다. `v1 마감 상태` 탭의 `release snapshot 고정` 버튼은 current surface evidence/closeout/handoff가 fresh하고 필수 closeout이 모두 닫힌 경우에만 활성화되며, stale current surface에서는 잘못된 artifact를 남기지 않도록 비활성화됩니다. 같은 경로를 계속 터미널에서 쓰고 싶다면 `npm run snapshot:execution-v1`를 그대로 실행해도 됩니다.

provider expansion도 콘솔에서 바로 preflight할 수 있습니다. `v1 마감 상태` 탭의 provider card는 이제 `preflight 실행` 버튼을 제공하고, deterministic smoke 결과를 provider별로 `ready-for-live-validation / ready-but-missing-env / blocked`로 다시 보여 줍니다. 즉, optional provider를 붙이기 전에 `env 부족`인지 `코드 readiness 부족`인지 탭 안에서 바로 분리할 수 있습니다.

같은 provider card에서 `preflight 명령 복사`와 `live 명령 복사`도 바로 사용할 수 있습니다. provider/aggregate preflight를 먼저 실행한 경우 env가 없는 provider는 backend가 반환한 `missingEnvCommand`를 우선 복사하므로, OpenAI의 `OPENAI_RUN_TIMEOUT_MS=60000` 같은 권장 env까지 포함한 `export ... && npm run live:execution-v1:*` 명령으로 터미널 handoff가 이어집니다. preflight 결과가 아직 없으면 `export ENV_KEY=\"...\" && ...` skeleton으로 fallback합니다.

이 command-copy 경로는 `권장 다음 액션` 카드에서도 바로 시작할 수 있습니다. provider 관련 recommendation은 카드 안에서 곧바로 `preflight 명령 복사`나 `live 명령 복사`를 제공하므로, 상단 recommendation만 보고도 shell handoff까지 이어지고 provider card를 다시 찾을 필요가 없습니다.

release tab의 액션도 read-only와 mutating 동작을 분리했습니다. `상태 다시 읽기`는 `/api/execution-v1/status`만 다시 호출하는 read-only reload이고, evidence/closeout/handoff를 현재 HEAD 기준으로 다시 만드는 동작은 별도 `current surface 재생성` 버튼이나 provider별 live validation 경로로만 실행됩니다. 따라서 operator는 단순 상태 확인과 artifact regeneration을 같은 버튼으로 착각하지 않아도 됩니다.

release tab은 이제 `current surface 재생성`의 영향도 함께 보여 줍니다. 이 preview는 evidence/closeout/handoff rewrite 대상 경로, deterministic verification 재실행 여부, provider live validation 재실행 여부, snapshot 자동 갱신 여부를 같이 노출합니다. 즉, operator는 regenerate 버튼을 누르기 전에 어떤 artifact가 다시 계산되고 어떤 것은 그대로 유지되는지를 같은 화면에서 확인할 수 있습니다.

execution-v1 verification runner는 하위 `npm run` smoke를 process-group hard timeout으로 실행합니다. 특히 browser E2E의 `playwright-cli` 하위 프로세스가 멈춰도 verification 전체가 무기한 대기하지 않고 timeout failure로 수렴하므로, release evidence 재생성은 실패 원인을 남기고 종료됩니다. 이 timeout helper 자체는 `npm run smoke:process-timeout-utils`로 성공/timeout/nested child cleanup contract를 독립 검증할 수 있습니다.

`current surface 재생성`은 이제 release tab 안에서 두 단계로 동작합니다. 첫 클릭은 confirm state만 활성화하고 영향 요약을 다시 강조하며, 두 번째 `재생성 확인` 클릭에서만 실제 rewrite가 실행됩니다. 즉, read-only reload와 mutating regeneration이 분리된 것에 더해, regeneration 자체도 한 번 더 의도적으로 확인해야 실행됩니다.

이 confirm 단계는 client-side 토글만이 아니라 server-side preflight를 먼저 통과해야 armed 됩니다. UI는 먼저 `/api/execution-v1/refresh/preflight`로 현재 regenerate 가능 상태와 overwrite 영향 범위를 다시 확인하고, 실제 `/api/execution-v1/refresh` 호출에는 `confirmCurrentSurfaceRewrite` 플래그가 있어야만 current surface rewrite를 허용합니다. preflight와 no-confirm guard 모두 evidence/closeout/handoff rewrite 대상 경로를 반환하므로, 실수로 버튼을 두 번 누른다고 바로 rewrite가 일어나는 구조가 아니라 API도 명시적 확인과 handoff 포함 범위를 같이 요구합니다.

release snapshot 고정도 같은 패턴으로 정리했습니다. UI는 먼저 `/api/execution-v1/snapshot/preflight`로 snapshot freeze 가능 상태를 다시 확인하고, 실제 `/api/execution-v1/snapshot` 호출에는 `confirmSnapshotFreeze`가 있어야만 immutable snapshot을 생성합니다. 따라서 regenerate와 snapshot freeze 모두 UI confirm과 API guard가 같은 의미를 갖습니다.

provider live validation도 같은 operator contract를 따릅니다. release tab의 provider card는 첫 클릭에서 `/api/execution-v1/refresh/preflight`를 다시 호출해 해당 provider의 live validation + current surface rewrite 가능 상태를 재확인하고, 두 번째 `live 검증 확인` 클릭에서만 실제 refresh를 실행합니다. 서버도 `confirmLiveValidation` 없이는 live refresh를 거부하므로, provider action은 더 이상 one-click mutate가 아닙니다.

release tab은 이제 `권장 다음 액션`도 같이 계산합니다. 이 목록은 stale current surface, snapshot freeze 가능 여부, provider env/preflight 상태를 기반으로 `지금 눌러야 할 버튼`과 `왜 필요한지`를 먼저 보여 줍니다. 따라서 operator는 summary badge를 해석한 뒤 다음 액션을 추론하지 않고, mutable current surface 운영과 optional provider expansion을 바로 분리해서 볼 수 있습니다.

release tab에는 `recent release action history`도 함께 쌓입니다. `/api/execution-v1/refresh(preflight)`, `/api/execution-v1/snapshot(preflight)`, `/api/execution-v1/preflight`에서 발생한 `allowed / blocked / confirmation-required / completed / failed` 결과를 최근 순으로 보여 주므로, operator는 방금 어떤 release action을 눌렀고 왜 막혔는지를 같은 화면에서 다시 확인할 수 있습니다.

`권장 다음 액션` 카드도 이제 이 history와 연결됩니다. 같은 액션에 대한 최근 preflight나 confirmation-required 결과가 있으면 카드 안에서 `최근 시도 / 마지막 summary`를 바로 보여 주므로, operator는 history 섹션까지 내려가지 않아도 왜 해당 액션이 다시 필요한지 즉시 파악할 수 있습니다.

같은 카드에서 `최근 기록 보기`를 누르면 해당 release action history row로 바로 이동하고 highlight됩니다. 그래서 operator는 recommendation을 읽은 직후 관련 preflight나 blocked 이유를 같은 탭 안에서 즉시 추적할 수 있습니다.

최신 시도와 최근 문제가 다른 row일 때는 `최근 문제 보기`도 따로 보입니다. 따라서 마지막 action이 성공으로 끝났더라도, 같은 recommendation 안에서 가장 최근의 blocked/failed/confirmation-required 기록으로 바로 내려가 triage를 이어갈 수 있습니다.

이제 해당 history row는 `상세 보기`까지 지원합니다. recommendation에서 jump하면 관련 row가 자동으로 펼쳐지고, action id / outcome / scope / provider를 같은 카드 안에서 바로 확인할 수 있어 release triage가 recommendation 섹션과 history 섹션 사이를 왕복하지 않고 닫힙니다.

focused history row는 리스트 상단에 pin됩니다. 즉, recommendation에서 연 기록은 release action history가 길어져도 바로 위에 유지되고, `포커스 해제` 전까지는 현재 triage 대상이라는 문맥이 계속 보입니다.

또한 펼쳐진 history row에서 `같은 scope 보기`, `같은 provider 보기`를 바로 적용할 수 있습니다. 그래서 특정 refresh flow나 provider readiness 흐름만 빠르게 좁혀 본 뒤, 필요할 때 `필터 해제`로 전체 history로 복귀할 수 있습니다.

recommendation 카드에서도 이 흐름을 직접 시작할 수 있습니다. `같은 flow 보기`를 누르면 최신 관련 history를 포커스하고, 같은 scope/provider 기준 필터를 함께 적용해서 release tab이 바로 해당 triage 문맥으로 좁혀집니다.

문제가 있는 흐름만 보고 싶을 때는 `같은 문제 흐름 보기`와 `주의 상태만` 필터를 사용할 수 있습니다. 이 경로는 `blocked / failed / confirmation-required`만 남기므로, 성공한 action noise를 걷어낸 채 실제 triage 대상만 볼 수 있습니다.

recommendation 카드 자체도 이제 현재 triage 상태를 반영합니다. 같은 flow나 같은 문제 흐름이 이미 적용 중이면 카드가 강조되고 버튼이 `현재 flow` 또는 `현재 문제 흐름`으로 바뀌므로, operator가 같은 narrowing action을 중복으로 다시 누르지 않게 했습니다.

각 recommendation 카드는 이제 같은 flow의 총 history 수와 `문제 흐름` 건수도 같이 보여 줍니다. 그래서 operator는 버튼을 누르기 전부터 이 recommendation이 단순한 follow-up인지, 실제로 여러 번 막힌 흐름인지 바로 구분할 수 있습니다.

문제 흐름이 있는 recommendation은 `최근 문제` 시각과 summary도 같이 보여 줍니다. 즉, 카드만 봐도 이 흐름이 최근에 왜 막혔는지, 지금 다시 열어야 할 수준의 문제인지 바로 판단할 수 있습니다.

release triage 상태도 이제 URL에 실립니다. `release` 탭에서 focused history row나 `주의 상태만 / scope / provider` 필터를 건 상태는 query string으로 같이 동기화되므로, 새로고침이나 링크 공유 뒤에도 같은 triage 문맥으로 바로 복원됩니다.

이 URL state는 release tab 안에서 바로 공유 액션으로도 연결됩니다. focused history가 있을 때는 `현재 triage 링크 복사`로 지금 보고 있는 triage 전체를 복사할 수 있고, 펼친 history row 안에서는 `이 flow 링크 복사`로 특정 scope/provider 흐름만 고정한 deep link를 바로 보낼 수 있습니다.

recommendation 카드에서도 같은 share path를 바로 시작할 수 있습니다. `flow 링크 복사`와 `문제 흐름 링크 복사`는 현재 narrowing을 먼저 적용하지 않고도 같은 flow 또는 attention flow deep link를 곧바로 복사하므로, operator가 추천 액션을 읽는 순간 바로 다른 사람에게 같은 triage 문맥을 넘길 수 있습니다.

provider 관련 recommendation은 이제 `provider 카드 보기`로도 바로 이어집니다. 이 액션은 release tab의 해당 provider readiness 카드를 highlight하고 스크롤까지 맞추며, 현재 triage URL에도 `rcard` 상태를 같이 싣습니다. 그래서 recommendation에서 바로 provider readiness surface로 내려간 뒤 새로고침하거나 링크를 공유해도 같은 provider spotlight가 유지됩니다.

같은 provider spotlight는 이제 한 번에 공유할 수도 있습니다. recommendation 카드와 provider card 모두 `provider 링크 복사`를 제공하므로, 먼저 카드를 포커스한 뒤 `현재 triage 링크 복사`를 다시 누를 필요 없이 해당 provider readiness surface를 바로 handoff할 수 있습니다.

provider spotlight가 활성화되면 그 provider card는 grid 상단으로 올라오고, spotlight callout에서도 바로 `preflight 실행`, `preflight 명령 복사`, `live 검증 실행`, `live 명령 복사`를 제공합니다. recommendation 카드도 같은 provider가 이미 활성화돼 있으면 `현재 provider 적용 중` 상태를 보여 주므로, operator는 recommendation -> provider spotlight -> 실행/복사 흐름을 같은 화면 안에서 바로 이어갈 수 있습니다.

provider spotlight는 이제 원인 추적 surface도 같이 포함합니다. focused provider에 연결된 release action history가 있으면 spotlight callout 안에서 `최근 provider 시도`, `최근 provider 문제`, `같은 provider N건`, `문제 흐름 N건`을 바로 보여 주고, 같은 위치에서 `최근 provider 기록 보기`, `최근 provider 문제 보기`, `같은 provider 기록만 보기`, `주의 상태만`으로 release history triage를 바로 시작할 수 있습니다.

여기서 더 나아가 provider spotlight는 같은 provider flow 자체를 바로 좁히고 공유할 수도 있습니다. focused provider의 최신 시도와 최신 문제를 기준으로 `같은 provider flow 보기`, `provider flow 링크 복사`, `같은 provider 문제 흐름 보기`, `provider 문제 흐름 링크 복사`를 제공하므로, operator는 provider card를 본 상태에서 history filter와 deep-link handoff까지 한 번에 이어갈 수 있습니다.

같은 위치에서 `기록 링크 복사`와 `문제 기록 링크 복사`도 사용할 수 있습니다. 이 링크들은 flow 전체가 아니라 exact release action row 하나만 고정하므로, 특정 blocked/failed event를 그대로 지정해서 넘기고 싶을 때 더 적합합니다. expanded history row의 `이 기록 링크 복사`도 같은 규칙을 따릅니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 노출합니다. 이전 단계에서 browser-report-only였던 count-19 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 바로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-19 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-20 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-20 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-21 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-21 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-22 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-22 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-23 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-23 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-24 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-24 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-25 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-25 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-26 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-26 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-27 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-27 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-28 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-28 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-29 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-29 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`를 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail/stable-line metadata로 직접 노출합니다. 이전 단계에서 report-only였던 count-30 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary`도 기록합니다. 이 report-only evidence는 방금 승격된 count-30 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 count-31 `summaryStableLineCopyPreviewBody...LineCopy` report-only evidence도 구조화 요약 row/detail/stable-line metadata로 노출합니다. 이전 단계에서 browser-report-only였던 count-31 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 count-32 detail line-copy evidence도 기록합니다. 이 report-only evidence는 방금 승격된 count-31 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.

compact handoff JSON trio와 release UI surface는 이제 count-32 `summaryStableLineCopyPreviewBody...LineCopy` report-only evidence도 구조화 요약 row/detail/stable-line metadata로 노출합니다. 이전 단계에서 browser-report-only였던 count-32 line-copy evidence를 handoff artifact와 release UI에서 같은 surface로 대조할 수 있습니다.

새 browser report는 이제 count-33 detail line-copy evidence도 기록합니다. 이 report-only evidence는 방금 승격된 count-32 row의 card/current-preview detail line-copy fallback이 동일한 overview line을 복사 또는 prompt fallback으로 round-trip하는지 다시 검증합니다.
