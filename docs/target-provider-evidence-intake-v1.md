# Target Provider Evidence Intake v1

- status: local-target-provider-evidence-intake-current
- localDate: 2026-05-05
- scope: target provider account, environment, live validation, quota, blocker closure, and recovery evidence intake contract
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

Production-ready remains blocked until every provider included in the target release has approved account status, target secret injection, target-boundary live validation, quota/cost guard evidence, provider blocker closure verification, and rollback/fallback evidence.

Target provider operations evidence remains the runtime operations gate for model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment.

## Required Evidence Packet

| Evidence Item | Required Proof | Current Local Evidence | Status |
| --- | --- | --- | --- |
| Provider account approval | account owner, billing/credit status, allowed workspace/customer, provider terms, OpenAI provider account approval when OpenAI is included, Anthropic provider account approval when Anthropic is included, local provider architecture approval when local provider is included, and Hermes provider architecture approval when Hermes is included | OpenAI and configured local provider archived passes exist only for the local-first pilot boundary; target OpenAI provider account contract is present with targetOpenAIProviderApproved false; Anthropic account execution remains failed; target Anthropic provider account contract is present with targetAnthropicProviderApproved false; configured local provider pilot proof is archived but target local provider architecture remains unapproved; target Hermes provider architecture contract is present with targetHermesProviderApproved false and endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and target-boundary Hermes live validation evidence are missing | blocked |
| Target secret injection | provider credentials are injected through the approved target secret manager and are absent from logs/artifacts | local secret management and target secret manager gates pass | blocked |
| Target live validation | `live:execution-v1:<provider>` succeeds from the approved deployment boundary and is archived in execution-v1 evidence | OpenAI and configured local provider local-first live validations are archived for the pilot boundary; Anthropic and Hermes target-boundary validations are not complete; target local provider architecture approval is still required before local provider production claims | blocked |
| Quota and cost guard | quota, concurrency, timeout, spend owner, and retry guard are documented before live use | provider preflight and telemetry smoke exist locally | blocked |
| Model and endpoint pinning | provider model, endpoint/base URL, timeout, and fallback route are recorded without secrets | provider readiness matrix lists env keys and commands | blocked |
| Failure triage route | account failure, missing env, live runtime failure, and fallback decision have named owners | release readiness and handoff list current blockers | blocked |
| Provider blocker closure verification | provider-specific blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, and regenerated release artifacts are recorded in the target environment blocker closure verification matrix | target environment evidence intake defines the blocker closure verification matrix; provider operations requires blockerClosureVerificationEvidence | blocked |
| Target provider operations | provider runtime operation evidence covers model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment | local target provider operations contract is present without target environment evidence | blocked |

## Provider Intake Checklist

Every provider promoted into a target release must record:

- provider owner and customer/account approval
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
- model name, endpoint/base URL alias, timeout, and retry/concurrency limits
- live validation command and archived execution-v1 evidence commit
- quota/spend owner and expected usage envelope
- fallback provider or stop condition when live validation fails
- provider-specific blocker closure verification matrix row with current state, next verification command, required closing evidence, stop-condition id, artifact hygiene result, regenerated release artifact references, and decision owner
- account remediation note for billing, credit, region, or terms blockers
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
