# Operator Runbook v1

- status: draft-source-of-record
- localDate: 2026-05-04
- scope: self-hosted local-first pilot operation
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-closeout.md](execution-v1-closeout.md), [execution-v1-handoff.md](execution-v1-handoff.md)

## Purpose

This runbook tells an operator how to run the v1 multi-agent harness from a clean local pilot state through mission execution, provider validation, evidence regeneration, release handoff, and incident triage.

The current release state is `provider-scoped pilot ready for OpenAI-backed local-first path`. OpenAI live validation is archived in the current evidence pack. The release is not production-ready or live-provider-complete because Anthropic is blocked by provider account credit/billing, and local/Hermes validation is blocked until approved runtime endpoint and model configuration are injected.

## Operator Roles

- viewer: reads evidence, closeout, handoff, provider readiness, and mission history.
- operator: creates missions, runs deterministic checks, starts UI, runs preflight, regenerates evidence.
- approver: approves or rejects risky execution leases and records the reason.
- admin: injects provider configuration, registers approved workspaces, controls retention/export/delete.

For pilot use, assign named people to each role before running provider-backed validation.

## Daily Start

1. Enter the project root.

```bash
cd /path/to/personal-ai-agent
```

2. Confirm dependency and script availability.

```bash
npm run smoke
```

3. Check release status.

```bash
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
```

4. Check provider readiness.

```bash
npm run preflight:execution-v1:all
```

Expected OpenAI-scoped pilot-ready state:

- `blockedCount` is `0`
- OpenAI live evidence is already archived in the current evidence pack
- providers without runtime/env show `ready-but-missing-env`
- Anthropic may show a provider-account failure until billing/credits are remediated
- live commands are shown but not run automatically

Stop condition:

- if `blockedCount` is greater than `0`, do not claim readiness; fix the failed deterministic provider prerequisite first.

## Start Operator UI

Run:

```bash
npm run ui
```

Then open the URL printed by the server or read `var/server.json`.

Operator UI checks:

- health endpoint responds
- mission queue is visible
- `v1 마감 상태` tab shows deterministic status, reference adoption, provider readiness, closeout, evidence, handoff, and snapshot state
- provider cards distinguish missing env from runtime failure
- release action history shows recent refresh/snapshot jobs when applicable

If the UI does not start:

- check whether the preferred port is already used
- inspect `var/server.json`
- rerun `npm run smoke:runtime-discovery`
- do not delete runtime state unless the pilot admin approves cleanup

## Register Workspace

Register only approved workspace roots.

```bash
node src/cli.mjs workspace add /absolute/path/to/repo --name customer-pilot-repo
node src/cli.mjs workspace list
```

Policy:

- use one isolated runtime data directory per customer or company pilot
- do not mix unrelated customers in the same local runtime state
- do not register arbitrary home or system directories as workspaces

## Create Mission

Use the smallest objective that can be verified.

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Verify release readiness" \
  --objective "Produce evidence-backed release readiness summary" \
  --constraints "Keep blast radius small|Require verification before closeout"
```

Recommended mission inputs:

- objective
- constraints
- expected deliverable
- relevant docs or logs as attachments
- selected orchestration profile if specialist lanes are needed
- explicit success criteria

Bad mission inputs:

- vague instruction such as "make it better"
- raw secrets
- production mutation request without approval path
- unrelated customer data

## Run Mission

Default safe run:

```bash
node src/cli.mjs mission run mission_xxx --provider stub
```

Provider-backed run:

```bash
node src/cli.mjs mission run mission_xxx --provider openai
node src/cli.mjs mission run mission_xxx --provider anthropic
node src/cli.mjs mission run mission_xxx --provider local
node src/cli.mjs mission run mission_xxx --provider hermes
```

Before provider-backed runs:

- confirm provider env/configuration is approved
- run provider preflight
- confirm prompt/data boundary is acceptable for the provider
- ensure the run objective does not include unapproved destructive action

After each run:

```bash
node src/cli.mjs mission show mission_xxx
node src/cli.mjs mission timeline mission_xxx
node src/cli.mjs action inbox --mission mission_xxx
```

## Approval Handling

Risky engineering execution must go through explicit approval.

Check pending approvals:

```bash
node src/cli.mjs approval inbox
node src/cli.mjs approval list --status pending
```

Approve:

```bash
node src/cli.mjs approval resolve approval_xxx --decision approve --reason "Approved for bounded local execution"
```

Reject:

```bash
node src/cli.mjs approval resolve approval_xxx --decision reject --reason "Scope is too broad for pilot"
```

Approval rules:

- approver must understand the action, workspace, blast radius, and verification path
- approval reason must be concrete
- approval does not permit unrelated git commit, push, deployment, or data mutation
- rejected approvals should feed a smaller follow-up mission

## Provider Live Validation

Run only in an environment approved to use real provider credentials or local model endpoints.

Preflight:

```bash
npm run preflight:execution-v1:all
```

OpenAI:

```bash
export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..."
npm run live:execution-v1:openai
```

Anthropic:

```bash
export ANTHROPIC_API_KEY="..."
npm run live:execution-v1:anthropic
```

Local provider:

```bash
export LOCAL_PROVIDER_BASE_URL="..."
npm run live:execution-v1:local
```

Hermes:

```bash
export HERMES_PROVIDER_MODEL="..."
npm run live:execution-v1:hermes
```

After live validation:

```bash
node scripts/build-execution-v1-evidence.mjs --live-openai --live-anthropic
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
```

Use only the provider flags that are intentionally being refreshed. Do not run deterministic-only evidence generation when preserving archived live proof matters.

Do not claim expanded provider-backed readiness until the refreshed evidence records the selected live validation result.

## Release Evidence Refresh

Use this sequence after material planning source-of-record changes when live evidence does not need to be replaced.

```bash
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
```

Use this sequence only when intentionally refreshing live provider proof.

```bash
node scripts/build-execution-v1-evidence.mjs --live-openai --live-anthropic
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
```

For a selected-provider refresh, pass only the selected live flag and preserve existing blocker wording for providers that are not being rerun.

Then verify:

```bash
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:execution-v1-handoff
git diff --check
```

Shareable artifacts:

- `docs/execution-v1-evidence.md`
- `docs/execution-v1-closeout.md`
- `docs/execution-v1-handoff.md`
- `docs/releases/execution-v1/<commit>/snapshot.json`

## Artifact Hygiene Before Sharing

Run scans before sending evidence outside the operator environment.

```bash
rg -n "(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})" README.md docs scripts src package.json || true
rg -n "/Users/[^/\\s]+|/(private/)?var/folders/" docs/execution-v1-handoff.md docs/releases/execution-v1 docs/execution-v1-evidence.md docs/execution-v1-closeout.md || true
```

Expected result:

- no real credential values
- no machine-local paths in shareable release artifacts

If a scan finds a real secret:

- stop sharing immediately
- rotate the secret
- remove the leaked value from local artifacts
- regenerate evidence and snapshot
- record the incident in `docs/incidents.md`

## Action And Incident Triage

Check current operator pressure:

```bash
node src/cli.mjs action inbox
node src/cli.mjs action inbox --overdue
node src/cli.mjs action inbox --needs-reminder
```

Run maintenance sweep:

```bash
node src/cli.mjs action maintenance
node src/cli.mjs action maintenance-history
```

Log overdue work:

```bash
node src/cli.mjs action log-overdue --class blocked --priority high
```

Provider attention:

```bash
node src/cli.mjs action provider-attention --overdue
node src/cli.mjs action remediate-provider-attention action_xxx
node src/cli.mjs action acknowledge-provider-attention action_xxx --note "Operator acknowledged provider issue"
node src/cli.mjs action resolve-provider-attention action_xxx --note "Provider recovered after validation"
```

Specialist follow-up:

```bash
node src/cli.mjs action specialist-follow-ups --overdue
node src/cli.mjs action remediate-specialist-follow-up action_xxx
```

Escalation rule:

- if a blocker affects release readiness, record it in the closeout/handoff path
- if a blocker affects security or customer data, treat it as an incident and stop external sharing
- if a provider failure is recovered by a later successful probe or run, confirm the recovered state before closing the action

## Failure Handling

| Failure | Immediate Action | Release Decision |
| --- | --- | --- |
| deterministic smoke fails | stop and fix root cause | not ready |
| provider preflight blocked | inspect failed provider check | not provider-ready |
| provider env missing | document missing env | do not expand provider scope |
| live provider run fails | capture failure and triage provider/runtime | provider scope limited to successful archived providers |
| browser E2E fails | rerun once only if failure is clearly transient, then fix | do not refresh evidence until stable |
| credential leak scan fails | stop sharing, rotate, regenerate | blocked |
| local path scan fails in release artifacts | scrub/regenerate snapshot | blocked for external handoff |
| approval pending | approver must approve/reject | execution not complete |
| action inbox has critical overdue item | triage or record accepted risk | pilot decision required |

## Release Decision Gate

Internal alpha can be claimed when:

- deterministic smoke gate is green
- release evidence, closeout, handoff, and snapshot exist
- missing live env/configuration is explicitly documented
- security model and operator runbook are present

Pilot-ready can be claimed when:

- at least one real provider live validation is archived
- the release label clearly identifies the validated provider scope
- pilot deployment guide is present
- pilot onboarding guide is present
- customer demo scenario is present
- artifact hygiene scans pass
- accepted risks are recorded

Production-ready cannot be claimed until:

- all supported production providers pass live validation in target deployment
- authenticated RBAC and tenant isolation are implemented or explicitly provided by the deployment environment
- retention, export, delete, incident, and SLO procedures are verified
- release evidence is generated from a clean deployment path

## Handoff Template

Use this when handing the pilot state to another operator.

```text
Date:
Workspace:
Mission:
Release label:
Evidence path:
Closeout path:
Handoff path:
Snapshot path:
Provider status:
Live validation completed:
Open actions:
Accepted risks:
Next command:
Do not do:
```

## Current Status

This runbook supports OpenAI-scoped controlled self-hosted pilot operation.

The remaining blockers are Anthropic billing/account remediation, local/Hermes runtime configuration, and production-grade deployment controls.
