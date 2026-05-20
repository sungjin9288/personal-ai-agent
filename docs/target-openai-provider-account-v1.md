# Target OpenAI Provider Account v1

- status: local-target-openai-provider-account-current
- localDate: 2026-05-06
- decision: do-not-claim-openai-production-provider-readiness-without-approved-target-account-evidence
- scope: OpenAI provider account, organization/project, billing/quota, model access, workspace/customer approval, target secret injection, live validation, telemetry, fallback, and renewal evidence contract
- productionReadyClaim: false
- targetOpenAIProviderApproved: false
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the target OpenAI provider account decision and evidence requirements that must be satisfied before describing OpenAI provider operation as production-ready, customer-ready, fallback-ready, or included in a target production provider claim.

It is not OpenAI pilot live validation proof, not target account approval proof, not billing/quota proof, not model access approval proof, not provider terms approval, not target secret manager proof, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. OpenAI target production provider readiness remains blocked until this account decision is approved and target account evidence is generated for account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary `npm run live:execution-v1:openai` pass, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence from the approved production-like or hosted target environment.

## OpenAI Account Decision Areas

| Area | Required Target Decision Before OpenAI Production Claim | Current Position | Status |
| --- | --- | --- | --- |
| Account ownership | approved OpenAI organization/project owner, customer scope, evidence owner, and review date | archived OpenAI live validation proves only the scoped local-first pilot path | blocked |
| Billing and quota | active billing plan, quota tier, spend cap, payment owner, and low-balance/quota alert route | no target production billing/quota evidence exists | blocked |
| API key and secret injection | target secret manager alias, API key owner, rotation path, access audit, break-glass owner, and redaction result | `OPENAI_API_KEY` can be injected locally but target secret evidence is absent | blocked |
| Model access | approved `OPENAI_MODEL`, model availability, region/project access, max token policy, and fallback model | pilot model access is archived but target account model approval is absent | blocked |
| Provider terms and customer approval | provider terms, data processing approval, allowed customer/workspace, transcript policy, and review date | no customer-approved target OpenAI provider evidence exists | blocked |
| Usage and cost guard | usage envelope, concurrency, timeout, retry policy, spend owner, and saturation fallback | provider telemetry exists without target OpenAI quota evidence | blocked |
| Target live validation | `npm run live:execution-v1:openai` passes from approved deployment boundary and is archived in execution-v1 evidence | archived evidence records only local-first pilot validation | blocked |
| Telemetry and failure taxonomy | probe result, provider response status, run duration, retry count, failureKind, alert route, and incident owner | pilot telemetry exists but target environment telemetry proof is absent | blocked |
| Fallback and stop condition | fallback provider, degraded mode, customer impact rule, manual approval path, and rollback owner | fallback remains pilot policy, not target OpenAI production approval | blocked |
| Renewal and review audit | account owner recertification, quota review, model access review, artifact hygiene, and next review date | no target OpenAI renewal/review audit exists | blocked |

## Required Evidence Packet

Any future target OpenAI provider approval must include:

- account ownership proof with OpenAI organization/project owner, project/workspace alias, customer scope, evidence owner, and review date
- billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance/quota alert route, and redacted evidence summary
- API key and secret injection proof with target secret manager alias, `OPENAI_API_KEY` owner, rotation path, access audit, break-glass owner, and redaction result
- model access proof with `OPENAI_MODEL`, model availability, region/project access, max token policy, fallback model, and owner approval
- provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript/retention policy, support owner, and evidence owner
- usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence
- target live validation proof with `npm run live:execution-v1:openai`, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference
- telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner
- fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision
- renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date
- migration plan from OpenAI-scoped local-first pilot account usage to approved target OpenAI provider operation
- containment plan for missing API key, revoked key, quota exhaustion, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure

## Target Evidence Capture Template

When a target environment is ready for OpenAI provider account approval, fill this template with target-boundary evidence. Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, or machine-local absolute paths.

| Field | Required Value | Completion Rule |
| --- | --- | --- |
| targetEnvironmentName | approved target environment name, owner, customer/workspace scope, and deployment boundary | must name the customer or production-like boundary where evidence was generated |
| approvedAccountAlias | non-secret OpenAI organization/project alias, account owner, project/workspace alias, evidence owner, and review date | must use an alias or account label, not provider console identifiers that expose billing or private account details |
| billingQuotaStatus | active billing plan, quota tier, payment owner, spend cap, low-balance/quota alert route, and redacted evidence summary | must prove the target account can sustain the approved usage envelope without exposing billing identifiers |
| openaiModelAccess | `OPENAI_MODEL`, model availability, region/project access, max token policy, fallback model, and model owner approval | must match the model used by target-boundary live validation |
| secretInjectionPolicy | target secret manager alias, `OPENAI_API_KEY` owner, rotation path, access audit, break-glass owner, and redaction result | must prove secret values are injected and redacted through approved controls |
| providerTermsCustomerApproval | provider terms, data-processing approval, allowed customer/workspace, transcript/retention policy, support owner, and evidence owner | must show customer-approved use of OpenAI for the target data boundary |
| usageCostGuard | usage envelope, concurrency limit, timeout policy, retry policy, spend owner, saturation fallback, and budget review cadence | must explain how quota, spend, and rate-limit pressure are contained before fallback or stop condition |
| liveValidationEvidence | `npm run live:execution-v1:openai` command, mission id, execution session id, provider response status, evidence commit, snapshot path, and artifact hygiene result | must reference a passed live validation generated from the approved target boundary |
| telemetryIncidentRoute | probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner | must connect OpenAI account/provider failures to monitoring and incident triage ownership |
| fallbackStopCondition | fallback provider or stop condition, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision | must document the customer-approved behavior when OpenAI is unavailable, quota-limited, or unsafe |
| renewalReviewAudit | account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date | must prove the target account approval has a renewal owner and review cadence |

The completed template is still not sufficient for `production-ready` by itself. It must be paired with target provider evidence intake, target provider operations, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence.

## Required Commands

```bash
npm run smoke:target-openai-provider-account
npm run smoke:openai-provider
npm run preflight:execution-v1:openai
npm run live:execution-v1:openai
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the OpenAI account decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `targetOpenAIProviderApproved: false`.

## Production Gap

This is a local target OpenAI provider account contract. It does not convert archived OpenAI pilot live validation into target production provider approval, prove target account approval, prove target billing/quota, prove target secret manager injection, prove target-boundary live validation, prove quota enforcement, prove provider terms approval, or satisfy target environment production evidence.

OpenAI target production provider readiness remains blocked until a target account decision is approved, implementation is completed in the target environment, account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary `npm run live:execution-v1:openai` pass, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved boundary, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
