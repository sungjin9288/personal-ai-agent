# Target Provider Operations v1

- status: local-target-provider-operations-current
- localDate: 2026-05-06
- scope: target provider runtime operations, live validation, secret injection, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation, and evidence retention contract
- productionReadyClaim: false
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This document defines the evidence required before a target deployment can claim OpenAI, Anthropic, local, or Hermes provider runtime operation.

It proves that target provider operation evidence requirements are explicitly documented before a hosted or production-like handoff.

It is not provider account approval, not target-boundary live validation proof, not billing or quota proof, not runtime endpoint approval, not production traffic proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves provider account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, provider telemetry, incident triage, data/transcript handling, remediation/renewal, and evidence retention for every provider included in the production claim.

## Provider Operation Controls

| Control | Local Pilot Evidence | Target Production Evidence Required |
| --- | --- | --- |
| Provider account approval | target provider intake and provider-specific account/architecture gates are present | account owner, customer/workspace approval, billing/credit/quota state, provider terms, model access, and renewal review are captured for each included provider |
| Target secret injection | local secret management and target secret manager gates pass | provider credentials are injected through the approved target secret manager, never stored in release artifacts, and verified by redaction/hygiene evidence |
| Target-boundary live validation | OpenAI archived pilot live validation exists; Anthropic/local/Hermes blockers are explicit | live validation succeeds from the approved deployment boundary and is archived with branch, commit, provider, model, endpoint alias, and owner |
| Model and endpoint pinning | provider readiness matrix records env keys and live commands | model id, endpoint/base URL alias, timeout, retry policy, concurrency limit, and fallback route are approved without secret values |
| Quota, cost, and resource guard | provider preflight and telemetry gates expose missing configuration | quota, spend owner, concurrency cap, timeout, retry limit, local resource envelope, and alert threshold are enforced and evidenced |
| Fallback and disable path | release readiness lists provider blockers and fallback requirements | provider fallback, stop condition, disable switch, degradation mode, operator owner, and customer impact rule are tested or explicitly accepted |
| Provider fallback runtime audit | mission fallback policy, mission timeline, workspace timeline, operator timeline, provider events, and provider attention remediation smokes pass locally | explicit failover attempt, selected fallback provider, fallback policy id, stop-condition reason, non-provider-failure stop condition, non-recoverable provider stop condition, provider event family, operator chronology, attention remediation command, and customer impact decision are archived from the target boundary |
| Provider telemetry | local observability telemetry and target observability operations gates pass | provider health signal, latency/error metrics, token or resource usage, fallback event, quota alert, and retention proof are captured |
| Provider incident triage | incident/SLO and support gates define escalation paths | account failure, live runtime failure, quota exhaustion, provider outage, fallback decision, customer update, and review owner are captured |
| Data and transcript handling | security and data lifecycle gates document provider transcript boundaries | prompt/response classification, transcript retention, export/delete handling, provider data policy, and post-delete absence rule are captured |
| Remediation and renewal review | provider-specific gates define renewal/remediation requirements | billing/credit remediation, endpoint renewal, key rotation, model access review, accepted-risk owner, and next review date are captured |

## Provider Operations Evidence Packet

Every target provider operations review must include:

- branch and commit
- release label and deployment boundary
- provider inventory with OpenAI, Anthropic, local, and Hermes inclusion state, owner, customer/workspace approval, account or architecture record, and operating decision
- provider account approval proof with billing/credit/quota state, provider terms, model access, and renewal owner for each included provider
- target secret injection proof with secret manager alias, rotation owner, access policy, redaction result, break-glass path, and revocation evidence
- target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, and operator owner
- model and endpoint pinning proof with model id, endpoint/base URL alias, retry policy, concurrency limit, fallback route, and approval owner
- quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route
- fallback and disable proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision
- provider fallback runtime audit proof with `mission run --fallback-provider --fallback-policy`, `mission timeline`, `workspace timeline`, `overview operator-timeline`, `provider events --family fallback`, and `action remediate-provider-attention --fallback-provider --fallback-policy` evidence for provider-failure-only failover, recoverable-provider-failure-only stop conditions, selected fallback provider, and deterministic stop conditions
- provider telemetry proof with health signal, latency/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner
- provider incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes
- data and transcript handling proof with data classification, provider transcript policy, retention class, export/delete handling, redaction rule, and post-delete absence requirement
- remediation and renewal review proof with billing/credit remediation, endpoint/model renewal, key rotation, provider terms review, accepted-risk owner, and next review date
- artifact hygiene and production readiness gate result
- residual risk, decision owner, next review date, and provider failure containment plan

## Provider Operation Rules

- define provider owner, account owner, secret owner, quota/spend owner, telemetry owner, incident owner, data owner, and evidence owner before a target deployment is presented as provider-operation-ready
- never treat archived OpenAI pilot live validation as target provider production operations evidence
- require provider-specific account or architecture approval before adding OpenAI, Anthropic, local, or Hermes to a target provider production claim
- deny target provider operations claims when any included provider lacks account or architecture approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation/renewal review, or evidence retention
- rerun target provider operations, target provider evidence intake, production provider readiness, provider-specific account/architecture gates, provider fallback policy, provider events, provider attention remediation, mission timeline, operator timeline, target secret manager, target observability operations, target deployment contract, target environment evidence intake, production readiness gate, and artifact hygiene after provider evidence is attached

## Required Commands

```bash
npm run smoke:target-provider-operations
npm run smoke:target-provider-evidence-intake
npm run smoke:provider-fallback-policy
npm run smoke:provider-events
npm run smoke:provider-attention-remediation
npm run smoke:mission-timeline
npm run smoke:operator-timeline
npm run rehearsal:production-provider-readiness
npm run smoke:production-provider-readiness
npm run smoke:target-openai-provider-account
npm run smoke:target-anthropic-provider-account
npm run smoke:target-local-provider-architecture
npm run smoke:target-hermes-provider-architecture
npm run smoke:target-secret-manager
npm run smoke:target-observability-operations
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when provider operation controls, provider operations evidence packet, provider operation rules, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is a local target provider operations evidence contract. It does not approve provider accounts, prove target-boundary live validation, prove billing/credit/quota readiness, approve runtime endpoints, prove production traffic handling, or satisfy target environment production evidence.

Target provider operations remain blocked for production-ready claims until provider account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, provider telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment evidence are captured from the approved production-like or hosted target environment for every provider included in the production claim.
