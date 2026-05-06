# Target Provider Evidence Intake v1

- status: local-target-provider-evidence-intake-current
- localDate: 2026-05-05
- scope: target provider account, environment, live validation, quota, and recovery evidence intake contract
- productionReadyClaim: false
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This gate defines the evidence packet an operator must collect before adding OpenAI, Anthropic, local, or Hermes to a target production provider claim.

It is not provider account remediation proof, not live-provider-complete evidence, not target deployment proof, and not permission to claim `production-ready`.

Production-ready remains blocked until every provider included in the target release has approved account status, target secret injection, target-boundary live validation, quota/cost guard evidence, and rollback/fallback evidence.

## Required Evidence Packet

| Evidence Item | Required Proof | Current Local Evidence | Status |
| --- | --- | --- | --- |
| Provider account approval | account owner, billing/credit status, allowed workspace/customer, provider terms, and Hermes provider architecture approval are approved when Hermes is included | OpenAI archived pass exists; Anthropic account execution remains failed; local/Hermes require configuration; target Hermes provider architecture contract is present with targetHermesProviderApproved false | blocked |
| Target secret injection | provider credentials are injected through the approved target secret manager and are absent from logs/artifacts | local secret management and target secret manager gates pass | blocked |
| Target live validation | `live:execution-v1:<provider>` succeeds from the approved deployment boundary and is archived in execution-v1 evidence | OpenAI local-first live validation is archived; Anthropic/local/Hermes are not complete | blocked |
| Quota and cost guard | quota, concurrency, timeout, spend owner, and retry guard are documented before live use | provider preflight and telemetry smoke exist locally | blocked |
| Model and endpoint pinning | provider model, endpoint/base URL, timeout, and fallback route are recorded without secrets | provider readiness matrix lists env keys and commands | blocked |
| Failure triage route | account failure, missing env, live runtime failure, and fallback decision have named owners | release readiness and handoff list current blockers | blocked |

## Provider Intake Checklist

Every provider promoted into a target release must record:

- provider owner and customer/account approval
- Hermes provider architecture approval when Hermes is included in the target provider claim
- target environment name and deployment boundary
- secret manager path or key alias, never the secret value
- model name, endpoint/base URL alias, timeout, and retry/concurrency limits
- live validation command and archived execution-v1 evidence commit
- quota/spend owner and expected usage envelope
- fallback provider or stop condition when live validation fails
- account remediation note for billing, credit, region, or terms blockers
- artifact hygiene result after evidence refresh
- productionReadyClaim remains false unless every mandatory target deployment control also has target evidence

## Required Commands

```bash
npm run smoke:target-provider-evidence-intake
npm run smoke:target-hermes-provider-architecture
npm run smoke:production-provider-readiness
npm run smoke:target-deployment-contract
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Production Gap

This is a local target provider evidence intake contract. It does not prove Anthropic account remediation, local provider endpoint readiness, target Hermes provider architecture approval, Hermes runtime readiness, target secret manager injection, target-boundary live validation, quota enforcement, or production fallback execution.

Target provider readiness remains blocked for production-ready claims until each provider in the production claim has a complete evidence packet and successful target-boundary live validation archived from the approved production-like or hosted environment.
