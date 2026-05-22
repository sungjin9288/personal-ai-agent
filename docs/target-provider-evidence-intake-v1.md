# Target Provider Evidence Intake v1

- status: local-target-provider-evidence-intake-current
- localDate: 2026-05-05
- scope: target provider account approval proof, target environment boundary proof, target-boundary live validation proof, quota and cost guard proof, blocker closure verification proof, rollback proof, and fallback decision proof intake contract
- productionReadyClaim: false
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderOperations: [target-provider-operations-v1.md](target-provider-operations-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This gate defines the evidence packet an operator must collect before adding OpenAI, Anthropic, local, or Hermes to a target production provider claim.

It is not provider account remediation proof, not live-provider-complete evidence, not target deployment proof, and not permission to claim `production-ready`.

Production-ready remains blocked until every provider included in the target release has approved account status proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, provider blocker closure verification proof, rollback proof, and fallback decision proof.

Target provider operations evidence remains the runtime operations gate for model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment.

## Required Evidence Packet

| Evidence Item | Required Proof | Current Local Evidence | Status |
| --- | --- | --- | --- |
| Provider account approval | account owner proof, billing and credit or quota status proof, allowed workspace or customer proof, provider terms proof, OpenAI provider account approval proof when OpenAI is included, Anthropic provider account approval proof when Anthropic is included, local provider architecture approval proof when local provider is included, and Hermes provider architecture approval proof when Hermes is included | OpenAI and configured local provider archived passes exist only for the local-first pilot boundary; target OpenAI provider account contract is present with targetOpenAIProviderApproved false and account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, and regenerated execution snapshot evidence are missing; Anthropic account execution remains failed; target Anthropic provider account contract is present with targetAnthropicProviderApproved false and account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, and regenerated execution snapshot evidence are missing; configured local provider pilot proof is archived but target local provider architecture remains unapproved; target Hermes provider architecture contract is present with targetHermesProviderApproved false and endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene, and regenerated execution snapshot evidence are missing | blocked |
| Target secret injection | provider credentials are injected through the approved target secret manager and are absent from logs/artifacts | local secret management and target secret manager gates pass | blocked |
| Target live validation | `live:execution-v1:<provider>` succeeds from the approved deployment boundary and is archived in execution-v1 evidence | OpenAI and configured local provider local-first live validations are archived for the pilot boundary; Anthropic and Hermes target-boundary validations are not complete; target local provider architecture approval is still required before local provider production claims | blocked |
| Quota and cost guard | quota proof, concurrency limit proof, timeout proof, spend owner proof, and retry guard proof are documented before live use | provider preflight and telemetry smoke exist locally | blocked |
| Model and endpoint pinning | provider model proof, endpoint or base URL alias proof, timeout proof, and fallback route proof are recorded without secrets | provider readiness matrix lists env keys and commands | blocked |
| Failure triage route | account failure owner proof, missing environment owner proof, live runtime failure owner proof, and fallback decision owner proof are recorded | release readiness and handoff list current blockers | blocked |
| Provider blocker closure verification | provider-specific blocker state proof, next verification command proof, required closing evidence proof, stop-condition id proof, release artifact hygiene result, and regenerated execution snapshot evidence are recorded in the target environment blocker closure verification matrix | target environment evidence intake defines the blocker closure verification matrix; provider operations requires blockerClosureVerificationEvidence | blocked |
| Target provider operations | provider runtime operation evidence covers model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment | local target provider operations contract is present without target environment evidence | blocked |

## Provider Intake Checklist

Every provider promoted into a target release must record:

- provider owner proof and customer or account approval proof
- OpenAI provider account approval when OpenAI is included in the target provider claim
- completed target OpenAI provider account evidence capture template when OpenAI is included in the target provider claim
- Anthropic provider account approval when Anthropic is included in the target provider claim
- completed target Anthropic provider account evidence capture template when Anthropic is included in the target provider claim
- local provider architecture approval when local provider is included in the target provider claim
- completed target local provider evidence capture template when local provider is included in the target provider claim
- Hermes provider architecture approval when Hermes is included in the target provider claim
- completed target Hermes provider evidence capture template when Hermes is included in the target provider claim
- target environment name and deployment boundary
- secret manager path or key alias, never the secret value
- model name proof, endpoint or base URL alias proof, timeout proof, and retry and concurrency limit proof
- live validation command and archived execution-v1 evidence commit
- quota and spend owner proof and expected usage envelope proof
- fallback provider or stop condition when live validation fails
- provider-specific blocker closure verification matrix row with current state proof, next verification command proof, required closing evidence proof, stop-condition id proof, artifact hygiene result, regenerated execution snapshot evidence, refreshed release artifact references, and decision owner proof
- account remediation proof for billing, credit, region, or terms blockers
- artifact hygiene result after evidence refresh
- target provider operations evidence with provider failure containment plan
- completed target provider operations evidence capture template for every provider included in the target provider claim
- blockerClosureVerificationEvidence from target provider operations for every provider included in the target provider claim
- productionReadyClaim remains false unless every mandatory target deployment control also has target evidence

## Required Commands

```bash
npm run smoke:target-provider-evidence-intake
npm run smoke:target-provider-operations
npm run smoke:target-openai-provider-account
npm run smoke:target-anthropic-provider-account
npm run smoke:target-local-provider-architecture
npm run smoke:target-hermes-provider-architecture
npm run smoke:production-provider-readiness
npm run smoke:target-deployment-contract
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Production Gap

This is a local target provider evidence intake contract. It does not prove target OpenAI provider account approval, Anthropic account remediation, target Anthropic provider account approval, target local provider architecture approval, local provider endpoint readiness, target Hermes provider architecture approval, Hermes runtime readiness, target provider operations execution, target secret manager injection, target-boundary live validation, quota enforcement, provider blocker closure verification, or production fallback execution.

Target provider readiness remains blocked for production-ready claims until each provider in the production claim has a complete evidence packet and successful target-boundary live validation archived from the approved production-like or hosted environment.
