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
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
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

It is not `production-ready` because Anthropic is blocked by provider account billing/credit, local and Hermes provider validation still require runtime configuration, and the target deployment contract still lacks hosted identity, tenant storage, target secret manager, production telemetry, backup, SLO/SLA, retention, customer support audit, and clean production-like evidence.

## Evidence Summary

Current execution evidence:

- deterministic verification: passed
- deterministic runtime summary: ready
- browser interaction E2E: passed
- reference adoption aggregate: ready, 15 scripts
- handoff generator: passed
- visual artifact set: `d58b31568fb8088dde4b8d8fa34d0af2a2f2e6012a43b1449074ab27768534ea`
- live validation: OpenAI passed, Anthropic failed with API billing/credit blocker, local/Hermes missing runtime env
- local deterministic production-like release drill: passed, with `productionReadyClaim: false`
- pilot export package manifest: passed, with repository-relative paths and `productionReadyClaim: false`
- self-hosted runtime isolation smoke: passed, with `productionReadyClaim: false`
- pilot retention/export/delete policy gate: passed, with documented data classes, export checklist, delete checklist, and `productionReadyClaim: false`
- tenant-scoped runtime export/delete gate: passed, with tenant-filtered export, exact tenant delete confirmation, post-delete absence, and unchanged other-tenant state
- local backup/restore drill: passed, with manifest sha256 verification, clean-runtime restore requirement, restored state hash match, and post-restore tenant delete isolation
- local customer support operations gate: passed, with support roles, intake classes, escalation matrix, customer communication rules, and pilot handoff checklist
- local support escalation review gate: passed, with escalation routes, audit packet requirements, incident review cadence, customer update rules, and `productionReadyClaim: false`
- local secret management gate: passed, with secret classes, injection rules, redaction/hygiene rules, and rotation/revocation checklist
- local observability telemetry gate: passed, with telemetry signals, alert triggers, required commands, and handoff requirements
- clean deployment release rehearsal: passed from tracked-files-only checkout, with `productionReadyClaim: false`
- local production SLO operating rehearsal: passed, with `productionReadyClaim: false`
- local production retention operating rehearsal: passed, with `productionReadyClaim: false`
- local provider readiness operating rehearsal: passed, with `productionReadyClaim: false`
- local enterprise controls rehearsal: passed, including OIDC/JWKS auth, token-claim RBAC, and API tenant isolation smoke, with `productionReadyClaim: false`
- target deployment contract gate: passed, with hosted production/SaaS mandatory controls explicitly blocked until target evidence exists
- local web auth plus RBAC gate: passed for shared-secret API auth and role enforcement, without hosted identity/session claims
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
| [target-deployment-contract-v1.md](target-deployment-contract-v1.md) | target-contract-current | mandatory hosted/production-like deployment controls and blocking rules |
| [backup-restore-drill-v1.md](backup-restore-drill-v1.md) | local-backup-restore-current | local runtime backup manifest, restore integrity, and tenant-isolated recovery drill |
| [customer-support-operations-v1.md](customer-support-operations-v1.md) | local-support-operations-current | local support roles, intake routing, escalation, communication, and handoff checklist |
| [support-escalation-review-v1.md](support-escalation-review-v1.md) | local-support-escalation-review-current | local support escalation routes, audit packet requirements, incident review cadence, and customer update rules |
| [secret-management-v1.md](secret-management-v1.md) | local-secret-management-current | local secret classes, injection, redaction, hygiene, rotation, and production gap |
| [observability-telemetry-v1.md](observability-telemetry-v1.md) | local-observability-telemetry-current | local telemetry signals, alert triggers, handoff requirements, and production telemetry gap |
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
- production secret manager injection, rotation, and audit evidence is not generated from a production-like environment
- production telemetry, alert delivery, and on-call routing evidence is not generated from a production-like environment
- target deployment contract is not satisfied by target-environment evidence
- production retention/export/delete verification is not complete
- production SLO/SLA operating evidence is not generated from a production-like environment
- staffed customer support operations, support audit history, and incident review evidence are not generated from a production-like environment
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
npm run smoke:customer-support-operations
npm run smoke:support-escalation-review
npm run smoke:secret-management
npm run smoke:observability-telemetry
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
- target deployment contract is blocked until hosted identity, tenant storage, target secret manager, production telemetry, backup, retention, SLO/SLA, clean deployment, support operations, and support escalation review have target-environment evidence
- production release label cannot be claimed until all target production providers and enterprise controls are verified

## Current Closeout

The planning pack and release artifacts are complete enough to support a controlled OpenAI-backed self-hosted/local-first pilot.

The product is not yet ready to be sold or represented as production-ready for other companies.
