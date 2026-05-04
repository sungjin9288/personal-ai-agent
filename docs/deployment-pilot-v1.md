# Deployment Pilot v1

- status: draft-source-of-record
- localDate: 2026-05-04
- scope: self-hosted local-first pilot deployment
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
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
npm run preflight:execution-v1:all
```

Expected result:

- deterministic checks pass
- snapshot integrity passes
- handoff generator passes
- aggregate preflight has `blockedCount: 0`
- missing env providers are explicitly listed

Stop condition:

- if deterministic checks fail, do not run live validation
- if preflight is blocked, fix provider prerequisite first

## Production-Like Release Drill

Before promoting a pilot package toward a production-like deployment review, run the local deterministic drill:

```bash
npm run drill:production-like-release
npm run smoke:production-like-release-drill
```

The drill replays the incident/SLO policy gate, execution-v1 status and snapshot gates, production readiness blocker gate, release artifact hygiene, and runtime data lifecycle export/delete smoke.

Acceptance:

- every command in the drill matrix passes
- artifact hygiene reports zero secret findings and zero machine-local path findings
- the generated drill keeps `productionReadyClaim: false`
- the release label remains scoped to OpenAI-backed local-first pilot operation unless target production providers and enterprise controls are separately verified

Stop condition:

- if the drill fails, do not run live validation for a production-like review until the failed local gate is fixed
- if the drill passes, treat it only as local dry-run evidence, not production deployment evidence

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
- `docs/execution-v1-evidence.md`
- `docs/execution-v1-closeout.md`
- `docs/execution-v1-handoff.md`
- selected `docs/releases/execution-v1/<commit>/` snapshot directory
- selected non-secret browser or visual evidence artifacts if needed

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
