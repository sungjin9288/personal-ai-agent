# Security Model v1

- status: draft-source-of-record
- localDate: 2026-05-04
- scope: self-hosted local-first pilot
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
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
- per-tenant encryption, separate auth realms, and centralized tenant administration are out of v1 scope
- cloud SaaS mode requires a separate architecture decision record before implementation

## RBAC Matrix

| Role | Allowed Actions | Restricted Actions |
| --- | --- | --- |
| Viewer | read evidence, closeout, handoff, run history, provider readiness summaries | cannot create missions, approve execution, change provider config |
| Operator | create missions, run stub/local deterministic flows, inspect provider preflight, refresh evidence | cannot approve risky execution unless also an approver |
| Approver | approve or reject risky execution leases, resolve approval inbox items, record approval reasons | cannot bypass audit records or mutate approval history |
| Admin | configure provider env in deployment environment, register workspaces, manage retention/export policy | cannot embed secrets into tracked docs or release artifacts |

Current implementation note:

- The web API now supports optional local shared-secret authentication with `PERSONAL_AI_AGENT_WEB_AUTH_MODE=enforce` and `PERSONAL_AI_AGENT_WEB_AUTH_TOKEN`, accepting either `Authorization: Bearer ...` or `x-personal-ai-agent-auth-token`.
- The web API supports optional local RBAC enforcement with `PERSONAL_AI_AGENT_RBAC_MODE=enforce` and `x-personal-ai-agent-role`.
- The enforced role contract is covered by `smoke:web-rbac`: viewer can read only, operator can create/run normal local work, approver can resolve approvals, and admin is required for workspace registration, release refresh/snapshot, and delete operations.
- The authenticated local role contract is covered by `smoke:web-auth-rbac`: missing or invalid tokens are rejected before RBAC, authenticated viewer mutations are still blocked, and authenticated operator mutations can proceed.
- [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md) records local enterprise controls evidence by replaying shared-secret auth, RBAC, artifact hygiene, runtime isolation, and provider readiness checks together while preserving the hosted identity and tenant isolation production gap.
- The CLI remains a local operator tool and does not yet provide user/session identity. Hosted or shared deployments still require identity-backed authentication, session lifecycle, and persistent role assignment outside this local shared-secret gate.

Pilot-ready requirement:

- document who holds each role for the pilot
- ensure risky execution approval is performed by an explicit approver
- keep provider secret injection limited to admin-controlled shells or deployment secrets

Production gap:

- identity-backed hosted users, sessions, persistent role assignment, and centralized permission administration are not yet implemented as a hosted control-plane feature

## Secret Handling

Rules:

- provider credentials must be injected through environment variables or the deployment secret manager
- provider credential values must not be committed, stored in release artifacts, copied into docs, or pasted into mission attachments
- evidence may mention required env variable names, but never their values
- provider live validation output must be reviewed before sharing outside the operator environment
- local provider base URLs may reveal infrastructure shape and should be treated as internal configuration

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

Policy:

- every release decision must point to current evidence and handoff artifacts
- selected-provider live validation must be regenerated into evidence before expanding provider-backed readiness beyond the current archived OpenAI proof
- release artifacts must be reproducible from documented npm scripts
- commit/push state must be stated explicitly in handoff when deferred

Current status:

- deterministic evidence and handoff are implemented
- OpenAI live evidence is archived in the current evidence pack
- Anthropic evidence records a provider account billing/credit blocker
- local and Hermes provider evidence remain blocked until approved runtime endpoint/model configuration is injected
- [production-provider-readiness-v1.md](production-provider-readiness-v1.md) records provider preflight readiness and live-validation blockers while keeping live-provider-complete and production-ready claims blocked
- [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md) records local enterprise controls evidence while identity-backed hosted RBAC, session lifecycle, centralized permission administration, and hosted tenant isolation remain blocked
- [production-slo-operating-v1.md](production-slo-operating-v1.md) records local operating rehearsal evidence while the production telemetry, staffed on-call, and customer SLO/SLA gap remains blocked

## Retention, Export, And Delete

Pilot defaults:

- retain local `var/` runtime state for the pilot duration unless the operator requests cleanup
- retain `docs/releases/execution-v1/*` immutable snapshots for release review
- export shareable evidence by copying evidence, closeout, handoff, snapshot metadata, and selected non-secret artifacts
- delete customer-sensitive local runtime state by removing the pilot runtime data directory after export approval

Current implementation support:

- `smoke:runtime-data-lifecycle` verifies local runtime inventory, export manifest generation, exact confirmation-token deletion, and post-delete absence checks on an isolated temp runtime
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

- target-deployment retention periods approved by customer data class
- customer-specific export checklist and handoff approval evidence
- deletion checklist execution evidence for local runtime state, generated artifacts, backups, and provider transcripts
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
- [ ] refresh selected-provider evidence with `node scripts/build-execution-v1-evidence.mjs --live-<provider>` only when intentionally updating provider proof
- [ ] regenerate closeout, handoff, and snapshot after selected-provider evidence refresh
- [ ] document any accepted risk in the handoff
- [ ] delete or archive local runtime state according to the pilot agreement

## Current Readiness Decision

Security model documentation is sufficient for the current OpenAI-scoped controlled self-hosted pilot design review.

It is not sufficient for production readiness until authenticated RBAC, tenant isolation enforcement, retention/export/delete procedures, expanded target-provider validation evidence, and production-like deployment hardening are complete.
