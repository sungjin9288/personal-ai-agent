# External Evidence Blockers v1

- status: external-evidence-blockers-current
- localDate: 2026-06-23
- productionReadyClaim: false
- allProviderComplete: false
- publicHostedDemoUrl: none
- externalEvidenceRequired: true
- scope: provider account proof, target provider architecture proof, hosted/private demo URL proof, pilot feedback and metric proof
- relatedProviderReadinessMatrix: [provider-readiness-matrix-v1.md](provider-readiness-matrix-v1.md)
- relatedSmokeValidationSummary: [smoke-validation-summary-v1.md](smoke-validation-summary-v1.md)
- relatedRecordedWalkthrough: [recorded-walkthrough-v1.md](recorded-walkthrough-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)

## Purpose

This register separates work that is complete inside the repository from work that still requires external account, deployment, URL, or pilot-user evidence. It prevents portfolio, README, and release documents from treating blocked external evidence as completed engineering work.

The current repository can verify deterministic local smoke evidence and a provider-scoped local-first pilot boundary. It cannot close the items below until the required external evidence is supplied and the matching verification commands pass.

## Blocker Register

| Blocker | Current state | Required closing evidence | Next verification command | Allowed claim impact |
|---|---|---|---|---|
| Anthropic billing and live validation | blocked by provider account billing/credit evidence | target Anthropic account ownership, billing/credit remediation, secret injection, model access, quota/spend guard, telemetry, fallback stop-condition proof, target-boundary live validation, release artifact hygiene, regenerated snapshot | `npm run live:execution-v1:anthropic` after `npm run preflight:execution-v1:anthropic` passes in the approved target boundary | Anthropic adapter support only; no Anthropic readiness claim |
| Hermes target provider architecture and live validation | blocked until target Hermes endpoint/model/architecture evidence exists | endpoint ownership, `HERMES_PROVIDER_MODEL` pinning, target secret injection, tool-call parsing proof, session provenance, transcript policy, quota/rate guard, telemetry, fallback stop-condition proof, customer approval, target-boundary live validation, release artifact hygiene, regenerated snapshot | `npm run live:execution-v1:hermes` after `npm run preflight:execution-v1:hermes` passes in the approved target boundary | Hermes-compatible adapter/parser surface only; no Hermes live readiness claim |
| Target local provider architecture | blocked until target local provider ownership and runtime boundary evidence exists | endpoint ownership, `LOCAL_PROVIDER_MODEL` pinning, network isolation, credential policy, runtime lifecycle, session/artifact provenance, transcript policy, quota/resource guard, telemetry, fallback/customer approval, target-boundary live validation, release artifact hygiene, regenerated snapshot | `npm run live:execution-v1:local` after `npm run preflight:execution-v1:local` passes in the approved target boundary | archived configured local pilot proof only; no target local provider production readiness claim |
| Public or private walkthrough URL | blocked until an accessible recording or hosted preview URL is supplied and checked | URL, access policy, reviewer visibility, captured timestamp, no-secret/no-local-path hygiene, evidence index update, recorded walkthrough update | `npm run smoke:recorded-walkthrough` and `npm run smoke:demo-evidence-index` after URL is added | recording script ready only; no verified published walkthrough URL claim |
| Actual pilot feedback and metrics | blocked until real pilot-user feedback or measured usage evidence exists | pilot scope, participant role, consent/usage boundary, feedback artifact, metric definition, collection method, command/log/source reference, limitations, sanitized evidence | new or updated feedback smoke after evidence artifact is added | no customer metrics, productivity, cost, SLA, or impact claim |
| Hosted SaaS or production deployment | blocked until target deployment evidence exists | hosted identity/session, tenant isolation, target secret manager, observability/SLO, support operations, data lifecycle, clean deployment, rollback/recovery, target deployment contract, production-like drill, approval decision | `npm run smoke:target-deployment-contract` and target-domain smoke commands after target evidence is supplied | local-first/self-hosted pilot preparation only; no hosted SaaS claim |

## What Is Already Complete Inside The Repo

- Deterministic public-readiness smoke baseline is documented in [smoke-validation-summary-v1.md](smoke-validation-summary-v1.md).
- Provider adapter inventory and blocked provider readiness states are documented in [provider-readiness-matrix-v1.md](provider-readiness-matrix-v1.md).
- Provider fallback and attention remediation are documented in [provider-failure-recovery-demo-v1.md](provider-failure-recovery-demo-v1.md).
- Retrieval/fact graph/instruction-boundary fixtures are documented in [memory-retrieval-quality-fixture-v1.md](memory-retrieval-quality-fixture-v1.md).
- The current demo is a credential-free local replay with evidence artifacts, not a public hosted demo URL.

## Safe Claim Boundary

Safe to claim:

- External evidence blockers are explicitly tracked.
- The repository is ready for deterministic local review and self-hosted pilot preparation inside the documented provider-scoped boundary.
- Anthropic, Hermes, target local provider, hosted demo URL, pilot feedback, and hosted deployment claims remain blocked until evidence is supplied.

Do not claim:

- Anthropic readiness is complete.
- Hermes live readiness is complete.
- Target local provider production readiness is complete.
- A public or private walkthrough URL has been verified.
- Pilot feedback, customer impact, cost, SLA, or productivity metrics are proven.
- Hosted SaaS or production deployment readiness is complete.

## Acceptance Rule

This register is current only when `npm run smoke:external-evidence-blockers`, `npm run smoke:provider-readiness-matrix`, `npm run smoke:smoke-validation-summary`, and `npm run smoke:recorded-walkthrough` pass, and every row above keeps blocked external evidence out of the safe claim set until the named closing evidence exists.
