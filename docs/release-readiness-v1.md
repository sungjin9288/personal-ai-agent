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
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
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
- local deterministic production-like release drill: passed, with `productionReadyClaim: false`
- pilot export package manifest: passed, with repository-relative paths and `productionReadyClaim: false`
- self-hosted runtime isolation smoke: passed, with `productionReadyClaim: false`
- pilot retention/export/delete policy gate: passed, with documented data classes, export checklist, delete checklist, and `productionReadyClaim: false`
- clean deployment release rehearsal: passed from tracked-files-only checkout, with `productionReadyClaim: false`
- local production SLO operating rehearsal: passed, with `productionReadyClaim: false`
- local production retention operating rehearsal: passed, with `productionReadyClaim: false`
- local provider readiness operating rehearsal: passed, with `productionReadyClaim: false`
- local enterprise controls rehearsal: passed, including OIDC/JWKS auth and token-claim RBAC smoke, with `productionReadyClaim: false`
- local web auth plus RBAC gate: passed for shared-secret API auth and role enforcement, without hosted identity/session claims
- local OIDC/JWKS auth plus RBAC gate: passed for bearer JWT issuer/audience/signature/expiry and token role claim enforcement, without hosted session administration claims

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
| [incident-slo-v1.md](incident-slo-v1.md) | pilot-policy-ready | incident severity, SLO triage commands, response workflow |
| [production-slo-operating-v1.md](production-slo-operating-v1.md) | local-slo-operating-current | local SLO operating rehearsal and production telemetry gap |
| [production-retention-operating-v1.md](production-retention-operating-v1.md) | local-retention-operating-current | local retention/export/delete operating rehearsal and production environment gap |
| [production-provider-readiness-v1.md](production-provider-readiness-v1.md) | local-provider-readiness-current | provider preflight and live-validation blocker rehearsal |
| [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md) | local-enterprise-controls-current | local auth, RBAC, artifact hygiene, runtime isolation, and provider-readiness controls rehearsal |
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
- identity-backed hosted RBAC/session administration is not implemented as a hosted product feature
- hosted tenant isolation is out of v1 scope
- production retention/export/delete verification is not complete
- production SLO/SLA operating evidence is not generated from a production-like environment
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
npm run drill:production-like-release
npm run smoke:production-like-release-drill
npm run smoke:runtime-isolation
npm run rehearsal:production-provider-readiness
npm run smoke:production-provider-readiness
npm run rehearsal:production-enterprise-controls
npm run smoke:production-enterprise-controls
npm run smoke:retention-delete-policy
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
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

- Anthropic live validation is blocked by provider account billing/credit
- local provider live validation is blocked by missing approved endpoint/model runtime configuration
- Hermes live validation is blocked by missing approved endpoint/model runtime configuration
- production release label cannot be claimed until all target production providers and enterprise controls are verified

## Current Closeout

The planning pack and release artifacts are complete enough to support a controlled OpenAI-backed self-hosted/local-first pilot.

The product is not yet ready to be sold or represented as production-ready for other companies.
