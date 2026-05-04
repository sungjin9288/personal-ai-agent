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
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-closeout.md](execution-v1-closeout.md), [execution-v1-handoff.md](execution-v1-handoff.md)

## Decision

The current v1 release is `provider-scoped pilot ready for OpenAI-backed local-first path`.

It is ready for controlled OpenAI-backed local-first pilot operation, internal demos, deterministic operator walkthroughs, and self-hosted pilot preparation.

It is `pilot-ready` only inside the validated OpenAI provider boundary and the documented self-hosted/local-first deployment boundary.

It is not `production-ready` because Anthropic is blocked by provider account billing/credit, local and Hermes provider validation still require runtime configuration, enforced enterprise controls are not complete, and clean production-like deployment release evidence is not complete.

## Evidence Summary

Current execution evidence:

- deterministic verification: passed
- deterministic runtime summary: ready
- browser interaction E2E: passed
- reference adoption aggregate: ready, 15 scripts
- handoff generator: passed
- visual artifact set: `61b2df678feae5ca2f3d076de5db506b30e57f7e0231de33550ae0b8fd36cd6c`
- live validation: OpenAI passed, Anthropic failed with API billing/credit blocker, local/Hermes missing runtime env

Current handoff state:

- deterministic execution flow: ready
- CLI execution contract: ready
- operator console execution contract: ready
- browser interaction E2E: ready
- snapshot portability: ready
- OpenAI live validation: passed
- Anthropic live validation: failed with HTTP 400 account billing/credit blocker
- local provider live validation: blocked by missing `LOCAL_PROVIDER_BASE_URL`
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
- commit/push remains deferred by operator request

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

- OpenAI live validation archived in [execution-v1-evidence.md](execution-v1-evidence.md)
- deterministic execution, CLI, UI console, browser E2E, handoff, and snapshot gates passed
- security model, operator runbook, deployment guide, onboarding guide, demo scenarios, and release decision docs exist
- commit/push remains deferred by operator request

Remaining blockers outside this scope:

- Anthropic live validation is blocked by provider account billing/credit
- local provider live validation is blocked by missing `LOCAL_PROVIDER_BASE_URL`
- Hermes live validation is blocked by missing `HERMES_PROVIDER_MODEL`

Pilot-ready can be claimed only for the validated provider and approved deployment boundary.

### Production Ready

Status: blocked.

Blockers:

- Anthropic, local, and Hermes live validations are not complete
- authenticated RBAC is not implemented as a hosted product feature
- hosted tenant isolation is out of v1 scope
- production retention/export/delete verification is not complete
- production SLO/SLA and incident response policy are not finalized
- clean deployment release evidence is not generated from a production-like environment

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
export LOCAL_PROVIDER_BASE_URL="..." && npm run live:execution-v1:local
export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes
```

Evidence refresh:

```bash
node scripts/build-execution-v1-evidence.mjs --live-openai --live-anthropic
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
```

Use only the live provider flags that are intentionally being refreshed. Do not run deterministic-only evidence generation when preserving archived live provider proof matters.

Verification:

```bash
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:execution-v1-handoff
npm run smoke:production-readiness-gate
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

- Anthropic live validation is blocked by provider account billing/credit
- local provider live validation is blocked by missing approved endpoint/model runtime configuration
- Hermes live validation is blocked by missing approved endpoint/model runtime configuration
- production release label cannot be claimed until all target production providers and enterprise controls are verified

## Current Closeout

The planning pack and release artifacts are complete enough to support a controlled OpenAI-backed self-hosted/local-first pilot.

The product is not yet ready to be sold or represented as production-ready for other companies.
