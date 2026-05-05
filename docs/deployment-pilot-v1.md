# Deployment Pilot v1

- status: draft-source-of-record
- localDate: 2026-05-04
- scope: self-hosted local-first pilot deployment
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-handoff.md](execution-v1-handoff.md)

## Deployment Position

The recommended v1 deployment model is a self-hosted local-first pilot. The runtime should be installed in a controlled operator environment, pointed at explicitly approved workspaces, and validated through deterministic checks before any provider-backed live validation.

The current release can be deployed as an OpenAI-scoped local-first pilot when the operator uses the archived evidence pack and approved OpenAI credentials. It is not a hosted SaaS deployment guide. Hosted multi-tenant deployment requires a separate architecture decision, authenticated RBAC, tenant isolation, centralized secret management, and production operations work.

## Pilot Architecture

```text
operator workstation or controlled VM
  personal-ai-agent repo
  Node.js runtime
  local var/ runtime state
  approved workspace repo(s)
  optional local provider endpoint
  optional external provider APIs
```

Default boundaries:

- CLI and UI run on the operator-controlled host.
- Runtime state remains local under the pilot data root.
- Workspace repositories are explicitly registered.
- Provider credentials are injected through environment variables or the deployment secret manager.
- Release artifacts are generated into tracked docs and immutable snapshot directories.

## Prerequisites

Required:

- approved pilot owner, operator, approver, and admin
- Node.js compatible with the current project runtime
- npm available in the deployment shell
- repository checkout of `personal-ai-agent`
- approved local workspace repository path
- network access only if external provider live validation is planned

Optional:

- MarkItDown-compatible converter on PATH or configured through `PERSONAL_AI_AGENT_MARKITDOWN_BIN`
- local OpenAI-compatible provider endpoint for `local`
- Hermes-compatible OpenAI-style endpoint for `hermes`
- deployment secret manager for provider credentials

Do not proceed if:

- the host is shared across unrelated customer pilots without runtime state isolation
- provider secrets would be pasted into tracked docs, shell history policy is unclear, or logs are externally collected without review
- the pilot workspace contains production data that has not been approved for model-provider use

## Directory Layout

Recommended pilot layout:

```text
pilot-root/
  personal-ai-agent/
  customer-workspace/
  exports/
```

Policy:

- keep one `pilot-root` per customer or company pilot
- keep runtime state local to the pilot environment
- keep exported handoff packages separate from the working repository
- do not reuse the same runtime state for unrelated customers

## Environment Configuration

UI host and port:

```bash
export PERSONAL_AI_AGENT_UI_HOST=127.0.0.1
export PERSONAL_AI_AGENT_UI_PORT=4317
```

OpenAI live validation:

```bash
export OPENAI_RUN_TIMEOUT_MS=60000
export OPENAI_API_KEY="..."
```

Anthropic live validation:

```bash
export ANTHROPIC_API_KEY="..."
```

Local provider live validation:

```bash
export LOCAL_PROVIDER_BASE_URL="..."
export LOCAL_PROVIDER_MODEL="..."
```

Hermes live validation:

```bash
export HERMES_PROVIDER_MODEL="..."
export HERMES_PROVIDER_BASE_URL="..."
```

Document conversion:

```bash
export PERSONAL_AI_AGENT_MARKITDOWN_BIN=markitdown
```

Secret policy:

- inject real credential values only in the approved deployment shell or secret manager
- do not write real values into docs, tickets, mission attachments, or release artifacts
- prefer short-lived shell sessions for live validation
- review shell history policy before typing real credentials

Optional web auth and RBAC for shared pilot environments:

```bash
export PERSONAL_AI_AGENT_WEB_AUTH_MODE=enforce
export PERSONAL_AI_AGENT_WEB_AUTH_TOKEN="..."
export PERSONAL_AI_AGENT_RBAC_MODE=enforce
```

When web auth is enforced, every `/api/*` request must include either `Authorization: Bearer ...` or `x-personal-ai-agent-auth-token`. RBAC role checks still require `x-personal-ai-agent-role`, so authentication and authorization remain separate gates.

Optional OIDC/JWKS web auth for identity-backed pilot environments:

```bash
export PERSONAL_AI_AGENT_WEB_AUTH_MODE=oidc
export PERSONAL_AI_AGENT_OIDC_ISSUER="https://issuer.example.com"
export PERSONAL_AI_AGENT_OIDC_AUDIENCE="personal-ai-agent-web"
export PERSONAL_AI_AGENT_OIDC_JWKS_URL="https://issuer.example.com/.well-known/jwks.json"
export PERSONAL_AI_AGENT_OIDC_ROLE_CLAIM="role"
export PERSONAL_AI_AGENT_TENANT_MODE=enforce
export PERSONAL_AI_AGENT_TENANT_CLAIM="tenant_id"
export PERSONAL_AI_AGENT_RBAC_MODE=enforce
```

When OIDC mode is enabled, `/api/*` requests must use an RS256 bearer JWT with matching issuer, audience, expiry, and JWKS key. RBAC role is derived from the configured token role claim and cannot be escalated by spoofing `x-personal-ai-agent-role`.

When tenant mode is enforced, workspace creation is bound to the configured OIDC tenant claim, workspace and mission lists are filtered by tenant, and cross-tenant mission creation/read attempts are rejected without trusting tenant headers.

## Install And Bootstrap

1. Enter the repository.

```bash
cd /path/to/pilot-root/personal-ai-agent
```

2. Install dependencies if needed.

```bash
npm install
```

3. Run the local bootstrap.

```bash
npm run bootstrap:local
```

4. Run the default deterministic smoke.

```bash
npm run smoke
```

Stop condition:

- if bootstrap or smoke fails, stop deployment and fix the local runtime before registering customer workspaces.

## Register Approved Workspace

```bash
node src/cli.mjs workspace add /path/to/pilot-root/customer-workspace --name customer-pilot
node src/cli.mjs workspace list
```

Validation:

```bash
node src/cli.mjs overview global
node src/cli.mjs workspace overview workspace_xxx
```

Rules:

- register only the approved workspace path
- do not register broad parent directories
- record workspace id in the pilot handoff

## Start UI

```bash
npm run ui
```

Validation:

- open the printed local URL
- confirm `/api/health` responds
- confirm `var/server.json` was written
- confirm `v1 마감 상태` tab shows deterministic status and provider readiness

If port binding fails:

- choose a different `PERSONAL_AI_AGENT_UI_PORT`
- rerun `npm run ui`
- verify the actual URL through `var/server.json`

## Pre-Live Validation Gate

Before any real provider run:

```bash
npm run smoke
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:execution-v1-handoff
npm run smoke:web-auth-rbac
npm run smoke:web-oidc-rbac
npm run smoke:web-tenant-isolation
npm run preflight:execution-v1:all
```

Expected result:

- deterministic checks pass
- snapshot integrity passes
- handoff generator passes
- web auth plus RBAC smoke passes when shared pilot API access is enabled
- OIDC/JWKS plus RBAC smoke passes when identity-backed pilot API access is enabled
- OIDC tenant isolation smoke passes when a shared API server is used for more than one tenant-bound workspace
- aggregate preflight has `blockedCount: 0`
- missing env providers are explicitly listed

Stop condition:

- if deterministic checks fail, do not run live validation
- if preflight is blocked, fix provider prerequisite first

## Production Provider Readiness Rehearsal

Before expanding the pilot beyond the archived OpenAI provider path, replay the provider readiness matrix:

```bash
npm run rehearsal:production-provider-readiness
npm run smoke:production-provider-readiness
```

The rehearsal runs aggregate provider preflight and records OpenAI, Anthropic, local, and Hermes env readiness, deterministic checks, archived live status, and next live-validation commands into [production-provider-readiness-v1.md](production-provider-readiness-v1.md).

Acceptance:

- aggregate preflight reports `blockedCount: 0`
- every supported provider appears in the provider matrix
- missing env and provider account blockers remain explicit
- the generated rehearsal keeps `productionReadyClaim: false`

Stop condition:

- if deterministic provider preflight is blocked, do not run live validation until the failed smoke is fixed
- if a provider has missing env or account-level failure, do not expand the release label to that provider until live validation is archived

## Production Enterprise Controls Rehearsal

Before presenting a pilot package for enterprise control review, replay the local auth, RBAC, artifact hygiene, runtime isolation, and provider-readiness controls together:

```bash
npm run rehearsal:production-enterprise-controls
npm run smoke:production-enterprise-controls
```

The rehearsal records local shared-secret API auth, OIDC/JWKS bearer auth, token-claim tenant isolation, role-gated web API access, artifact hygiene, one-runtime-per-customer isolation, and provider readiness blocker visibility into [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md).

Acceptance:

- every command in the enterprise controls matrix passes
- OIDC/JWKS bearer validation rejects invalid audience tokens and token-role header spoofing
- OIDC tenant isolation rejects cross-tenant workspace and mission access
- artifact hygiene reports zero credential and machine-local path findings
- shared-secret auth and RBAC remain described as local pilot gates, not hosted identity
- runtime isolation remains described as self-hosted one-runtime-per-customer evidence, not hosted tenant isolation
- the generated rehearsal keeps `productionReadyClaim: false`

Stop condition:

- if the rehearsal fails, do not present enterprise controls readiness in a pilot review until the failed gate is fixed
- if the rehearsal passes, treat it only as local enterprise controls evidence, not identity-backed hosted RBAC/session administration or hosted tenant isolation

## Target Deployment Contract

Before describing the system as production-ready for another company or as hosted SaaS, verify the target deployment contract:

```bash
npm run smoke:target-deployment-contract
npm run smoke:production-readiness-gate
```

The source of record is [target-deployment-contract-v1.md](target-deployment-contract-v1.md). It separates the current OpenAI-scoped self-hosted pilot from production-like single-tenant, hosted multi-tenant SaaS, and hybrid control-plane deployment claims.

Acceptance:

- target provider validation, identity-backed RBAC, hosted tenant isolation, secret management, retention/delete, SLO/SLA, clean deployment, and support operations all have explicit target-environment evidence
- hosted SaaS claims have a separate approved architecture decision record
- the release label remains scoped to OpenAI-backed local-first pilot operation until all target controls pass

Stop condition:

- if any target deployment control is missing, do not claim hosted production readiness
- if the contract passes only as a blocker checklist, treat it as production-readiness boundary evidence, not production deployment evidence

## Secret Management Gate

Before injecting real provider credentials or sharing a pilot package, verify the local secret-management policy:

```bash
npm run smoke:secret-management
npm run smoke:release-artifact-hygiene
```

The source of record is [secret-management-v1.md](secret-management-v1.md). It proves secret classes, injection rules, redaction and hygiene rules, rotation/revocation checklist, required commands, and the target secret manager production gap are present.

Acceptance:

- provider API keys, web auth tokens, OIDC/JWKS material, runtime export material, and emergency access material are classified
- examples use placeholder values and real credentials are injected only through an approved shell or deployment secret manager
- artifact hygiene reports zero credential and machine-local path findings
- the generated secret management gate keeps `productionReadyClaim: false`

Stop condition:

- if any secret appears in tracked docs or release artifacts, stop sharing, rotate the exposed credential, scrub/regenerate artifacts, and rerun hygiene
- if the gate passes, treat it only as local pilot secret-management evidence, not target secret manager injection, production rotation, or audit proof

## Observability Telemetry Gate

Before using the pilot package for an SLO/SLA or operating review, verify the local telemetry contract:

```bash
npm run smoke:observability-telemetry
```

The source of record is [observability-telemetry-v1.md](observability-telemetry-v1.md). It proves release state, snapshot integrity, provider readiness, artifact hygiene, runtime lifecycle, incident queue signals, alert triggers, required commands, and handoff requirements are present.

Acceptance:

- local telemetry signals cover release state, snapshot integrity, provider readiness, artifact hygiene, runtime lifecycle, and incident queue
- alert triggers map to severity and first-response actions
- handoff requirements include branch, commit, release label, snapshot, provider readiness, hygiene counts, owner, and changed evidence status
- the generated observability gate keeps `productionReadyClaim: false`

Stop condition:

- if telemetry signals or alert triggers are missing, do not present SLO/SLA operating readiness in a pilot review
- if the gate passes, treat it only as local observability evidence, not hosted telemetry, production alert delivery, staffed on-call, or incident review proof

## Backup Restore Drill

Before treating runtime backup or restore behavior as part of a pilot review, run the local backup/restore drill:

```bash
npm run smoke:backup-restore-drill
```

The source of record is [backup-restore-drill-v1.md](backup-restore-drill-v1.md). It proves manifest-backed local runtime backup, clean restore enforcement, restored state hash matching, and tenant-isolated recovery behavior.

Acceptance:

- backup manifest file count and restore file count match
- restored state sha256 equals source state sha256
- tenant A can be deleted after restore without modifying tenant B
- the same backup can still restore tenant A into another clean runtime root

Stop condition:

- if backup or restore hash verification fails, do not present backup/restore readiness in a pilot or production-like review
- if the drill passes, treat it only as local backup/restore evidence, not hosted encrypted backup durability or disaster recovery proof

## Customer Support Operations Gate

Before sharing a pilot package with a customer or another company, verify support ownership and escalation evidence:

```bash
npm run smoke:customer-support-operations
```

The source of record is [customer-support-operations-v1.md](customer-support-operations-v1.md). It proves support roles, intake classes, escalation matrix, customer communication rules, handoff checklist, required commands, and evidence requirements are present.

Acceptance:

- support owner, technical operator, incident commander, customer contact, and evidence owner are defined
- access, provider, data lifecycle, release evidence, and incident/security intake classes are covered
- customer communication rules prevent unverified production-ready claims and raw credential/path leakage
- the generated support gate keeps `productionReadyClaim: false`

Stop condition:

- if support ownership or escalation evidence is missing, do not present a customer pilot package as operationally ready
- if the gate passes, treat it only as local pilot support evidence, not staffed production support or contractual SLA evidence

## Production-Like Release Drill

Before promoting a pilot package toward a production-like deployment review, run the local deterministic drill:

```bash
npm run drill:production-like-release
npm run smoke:production-like-release-drill
```

The drill replays the incident/SLO policy gate, customer support operations gate, secret management gate, observability telemetry gate, target deployment contract, execution-v1 status and snapshot gates, production readiness blocker gate, release artifact hygiene, runtime data lifecycle export/delete smoke, backup/restore drill, and self-hosted runtime isolation smoke.

Acceptance:

- every command in the drill matrix passes
- artifact hygiene reports zero secret findings and zero machine-local path findings
- runtime isolation smoke confirms one-runtime-per-customer state separation
- the generated drill keeps `productionReadyClaim: false`
- the release label remains scoped to OpenAI-backed local-first pilot operation unless target production providers and enterprise controls are separately verified

Stop condition:

- if the drill fails, do not run live validation for a production-like review until the failed local gate is fixed
- if the drill passes, treat it only as local dry-run evidence, not production deployment evidence

## Production SLO Operating Rehearsal

Before using the pilot package for an operating review, replay the local SLO operating evidence:

```bash
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
```

The rehearsal runs the incident/SLO policy gate, observability telemetry gate, execution-v1 status and snapshot gates, release artifact hygiene, runtime data lifecycle, and runtime isolation checks into [production-slo-operating-v1.md](production-slo-operating-v1.md).

Acceptance:

- every command in the SLO operating matrix passes
- artifact hygiene reports zero credential findings and zero machine-local path findings
- runtime lifecycle and runtime isolation checks remain green
- the generated rehearsal keeps `productionReadyClaim: false`

Stop condition:

- if the rehearsal fails, do not present SLO/SLA operating readiness in a pilot review until the failed gate is fixed
- if the rehearsal passes, treat it only as local operating evidence, not customer production SLO/SLA evidence

## Production Retention Operating Rehearsal

Before using the pilot package for a retention/export/delete operating review, replay the local retention operating evidence:

```bash
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
```

The rehearsal runs the retention/delete policy gate, runtime data lifecycle, tenant data lifecycle, runtime isolation, pilot export package, pilot export package smoke, and release artifact hygiene into [production-retention-operating-v1.md](production-retention-operating-v1.md).

Acceptance:

- every command in the retention operating matrix passes
- artifact hygiene reports zero credential findings and zero machine-local path findings
- runtime lifecycle proves export, confirmation-token deletion, and post-delete absence
- tenant data lifecycle proves tenant-filtered export, exact tenant confirmation-token deletion, and unchanged other-tenant state
- runtime isolation proves one customer runtime can be deleted without modifying another
- the generated rehearsal keeps `productionReadyClaim: false`

Stop condition:

- if the rehearsal fails, do not present retention/export/delete operating readiness in a pilot review until the failed gate is fixed
- if the rehearsal passes, treat it only as local operating evidence, not hosted production retention or provider transcript deletion proof

## Clean Deployment Release Rehearsal

Before treating a release pack as portable, replay core release gates from a clean tracked-file checkout:

```bash
npm run rehearsal:clean-deployment-release
npm run smoke:clean-deployment-release
```

The rehearsal copies tracked files into an isolated temporary checkout and excludes `var/`, `output/playwright/`, `node_modules/`, and `.git/`. It then runs the incident/SLO policy, customer support operations gate, secret management gate, observability telemetry gate, retention/delete policy, target deployment contract, release artifact hygiene, runtime data lifecycle, tenant data lifecycle, backup/restore drill, runtime isolation, pilot export package regeneration, and pilot export package checks.

Acceptance:

- every command in the clean checkout command matrix passes
- no local runtime state, generated Playwright output, dependency folder, or git metadata is required
- release artifact hygiene reports zero credential findings and zero machine-local path findings
- the generated rehearsal keeps `productionReadyClaim: false`

Stop condition:

- if the clean rehearsal fails, do not share the pilot export package externally until the failing gate is fixed
- if the clean rehearsal passes, treat it only as local portability evidence, not target production deployment evidence

## Live Provider Validation

Run only approved providers for the pilot. It is acceptable for a pilot to validate one provider first, but the release label must reflect partial provider validation.

OpenAI:

```bash
npm run live:execution-v1:openai
```

Anthropic:

```bash
npm run live:execution-v1:anthropic
```

Local:

```bash
npm run live:execution-v1:local
```

Hermes:

```bash
npm run live:execution-v1:hermes
```

After live validation, refresh evidence with the live providers that are intentionally being rerun:

```bash
node scripts/build-execution-v1-evidence.mjs --live-openai --live-anthropic
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
```

Verification:

```bash
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
```

Do not run deterministic-only evidence generation when preserving archived live proof matters. Do not claim live-provider-complete readiness unless all supported pilot providers have archived live validation evidence.

## Pilot Operation Loop

Daily loop:

1. Run deterministic readiness checks.
2. Start UI.
3. Register or select approved workspace.
4. Create bounded mission.
5. Run with stub or approved provider.
6. Resolve approvals.
7. Review action inbox and provider attention.
8. Regenerate evidence if release or customer handoff state changed.
9. Run artifact hygiene scans before sharing.

Recommended commands:

```bash
npm run smoke
npm run preflight:execution-v1:all
node src/cli.mjs action inbox
node src/cli.mjs action maintenance
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
```

If provider proof changed, run the selected live evidence refresh first, for example:

```bash
node scripts/build-execution-v1-evidence.mjs --live-openai
```

## Backup And Export

Export package should include:

- `docs/product-plan-v1.md`
- `docs/security-model-v1.md`
- `docs/operator-runbook-v1.md`
- `docs/deployment-pilot-v1.md`
- `docs/runtime-isolation-v1.md`
- `docs/retention-delete-v1.md`
- `docs/production-slo-operating-v1.md`
- `docs/production-retention-operating-v1.md`
- `docs/production-provider-readiness-v1.md`
- `docs/production-enterprise-controls-v1.md`
- `docs/clean-deployment-release-v1.md`
- `docs/execution-v1-evidence.md`
- `docs/execution-v1-closeout.md`
- `docs/execution-v1-handoff.md`
- selected `docs/releases/execution-v1/<commit>/` snapshot directory
- selected non-secret browser or visual evidence artifacts if needed
- [pilot-export-package-v1.md](pilot-export-package-v1.md) manifest with repository-relative file paths and sha256 hashes

## Pilot Export Package

Before sharing a pilot handoff package, generate and verify the package manifest:

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

The package manifest records the minimum shareable planning pack, release evidence, production-like drill, and immutable execution-v1 snapshot using repository-relative paths, byte counts, sha256 hashes, and a bundle digest.

Acceptance:

- every required package file exists
- every package path is repository-relative
- every package entry has a sha256 digest
- release artifact hygiene reports zero credential findings and zero machine-local path findings
- the package keeps `productionReadyClaim: false`

Stop condition:

- if the manifest is missing files, do not share the handoff package
- if hygiene finds a secret or machine-local path, stop export, scrub/regenerate artifacts, and rotate any exposed secret

## Retention And Delete Policy

Before export or cleanup, verify the pilot lifecycle policy:

```bash
npm run smoke:retention-delete-policy
npm run smoke:runtime-data-lifecycle
npm run smoke:tenant-data-lifecycle
npm run smoke:runtime-isolation
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

The source of record is [retention-delete-v1.md](retention-delete-v1.md). It defines pilot data classes, retention periods, export checklist, delete checklist, provider transcript handling, stop conditions, and the production gap.

Acceptance:

- every pilot data class has an explicit retention period
- export package paths are repository-relative and hashed
- runtime deletion requires the deterministic confirmation token
- deleted runtime state has post-delete absence evidence
- release artifacts and package manifests keep `productionReadyClaim: false`

Stop condition:

- if the runtime root ownership is unclear, do not delete
- if the export package or artifact hygiene gate fails, do not share externally
- if provider transcript deletion or non-retention cannot be proven, keep production-ready blocked

Before export:

```bash
rg -n "(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})" README.md docs scripts src package.json || true
rg -n "/Users/[^/\\s]+|/(private/)?var/folders/" docs/execution-v1-handoff.md docs/releases/execution-v1 docs/execution-v1-evidence.md docs/execution-v1-closeout.md || true
```

Export decision:

- if scans are clean, package selected docs and snapshots
- if scans find real secrets, stop export, rotate secrets, scrub artifacts, regenerate evidence
- if scans find machine-local release paths, scrub/regenerate snapshot before external handoff

## Delete And Cleanup

Pilot cleanup requires admin approval.

Delete candidates:

- local runtime state under the pilot data root
- generated non-shared artifacts
- local provider logs
- temporary browser/session artifacts
- unshared exports

Keep candidates:

- approved export package
- final evidence, closeout, handoff, snapshot
- incident records
- accepted risk records

Do not delete:

- active pilot state before export approval
- evidence needed to explain a live validation failure
- incident material required by the customer agreement

## Failure And Rollback

| Failure | Rollback Or Recovery |
| --- | --- |
| dependency install fails | verify Node/npm, retry in clean shell, do not register workspace |
| UI fails to bind | change UI port, inspect `var/server.json`, run runtime discovery smoke |
| workspace registration is wrong | stop using that workspace id, register correct root, document mistake |
| deterministic smoke fails | stop live validation, fix runtime or revert only approved local changes |
| provider live validation fails | keep failure evidence, inspect provider config, do not claim provider readiness |
| credential scan finds secret | stop export, rotate secret, scrub artifacts, regenerate evidence |
| cross-customer data mixing suspected | stop pilot, preserve incident evidence, isolate runtime root, notify pilot owner |

## Pilot Acceptance Criteria

Deployment can be accepted for controlled pilot when:

- local bootstrap passes
- deterministic smoke passes
- execution-v1 status, snapshot, and handoff smokes pass
- approved workspace is registered
- UI starts and health endpoint responds
- provider preflight reports no blocked deterministic prerequisites
- security model, operator runbook, and deployment guide are present
- artifact hygiene scans are clean before sharing

OpenAI-scoped pilot readiness is accepted when archived OpenAI live validation is present and the handoff label states that provider scope. Expanded provider-backed readiness is not accepted until:

- approved provider env/configuration is injected for each expanded provider
- live validation runs successfully for each expanded provider
- evidence, closeout, handoff, and snapshot are regenerated after live validation

## Current Status

This deployment guide supports a self-hosted OpenAI-scoped local-first pilot. Anthropic remains blocked by provider billing/account credits, and local/Hermes remain blocked by missing runtime endpoint/model configuration.

The remaining blockers are Anthropic billing/account remediation, local/Hermes runtime configuration, and production-grade deployment controls.
