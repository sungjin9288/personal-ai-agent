# Target Anthropic Provider Account v1

- status: local-target-anthropic-provider-account-current
- localDate: 2026-05-06
- decision: do-not-claim-anthropic-provider-readiness-without-approved-account-evidence
- scope: Anthropic provider account, billing/credit, model access, workspace/customer approval, quota, secret injection, live validation, telemetry, fallback, and remediation evidence contract
- productionReadyClaim: false
- targetAnthropicProviderApproved: false
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the target Anthropic provider account decision and evidence requirements that must be satisfied before describing Anthropic provider operation as production-ready, customer-ready, fallback-ready, or included in a target production provider claim.

It is not Anthropic live validation proof, not account remediation proof, not billing/credit proof, not model access proof, not provider terms approval, not target secret manager proof, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Anthropic provider readiness remains blocked until this account decision is approved and target account evidence is generated for account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence from the approved production-like or hosted target environment.

## Anthropic Account Decision Areas

| Area | Required Target Decision Before Anthropic Claim | Current Position | Status |
| --- | --- | --- | --- |
| Account ownership | approved Anthropic account owner, organization/workspace, customer scope, and evidence owner | live evidence records Anthropic HTTP 400 billing/credit blocker | blocked |
| Billing and credit | active billing plan, available credit balance, payment owner, renewal path, and low-balance alert route | current live validation failed with low credit balance message | blocked |
| API key and secret injection | approved secret manager platform proof, API key owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, leakage and redaction review proof, and credential containment proof | `ANTHROPIC_API_KEY` can be injected locally but target secret evidence is absent | blocked |
| Model access | approved `ANTHROPIC_MODEL`, model availability, region/workspace access, max token policy, and fallback model | model access cannot be proven while account billing/credit is blocked | blocked |
| Provider terms and customer approval | provider terms, data processing approval, allowed customer/workspace, transcript policy, and review date | no customer-approved Anthropic provider evidence exists | blocked |
| Quota and spend guard | usage envelope, concurrency, timeout, retry policy, spend owner, and saturation fallback | provider telemetry exists without target Anthropic quota evidence | blocked |
| Target live validation | `npm run live:execution-v1:anthropic` passes from approved deployment boundary and is archived in execution-v1 evidence | archived evidence records Anthropic failed due to account billing/credit | blocked |
| Telemetry and failure taxonomy | probe result, provider response status, run duration, retry count, failureKind, alert route, and incident owner | current failure taxonomy is captured but not remediated | blocked |
| Fallback and stop condition | fallback provider, degraded mode, customer impact rule, manual approval path, and rollback owner | fallback remains OpenAI-scoped pilot policy, not target Anthropic approval | blocked |
| Remediation audit | account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene, and next review | no completed Anthropic remediation audit exists | blocked |

## Required Evidence Packet

Any future target Anthropic provider approval must include:

- account ownership proof with Anthropic account owner, organization/workspace alias, customer scope, evidence owner, and review date
- billing and credit proof with active billing plan, available credit balance, payment owner, renewal path, low-balance alert route, and screenshot-free redacted evidence summary
- API key and secret injection proof with approved secret manager platform proof, `ANTHROPIC_API_KEY` owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof
- model access proof with `ANTHROPIC_MODEL`, model availability, region/workspace access, max token policy, fallback model, and owner approval
- provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner
- quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence
- target live validation proof with `npm run live:execution-v1:anthropic`, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference
- telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner
- fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence
- remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date
- migration plan from failed Anthropic account state to approved target Anthropic provider operation
- containment plan for low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure

## Target Evidence Capture Template

When a target environment is ready for Anthropic provider account approval, fill this template with target-boundary evidence. Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, credit balances, or machine-local absolute paths.

| Field | Required Value | Completion Rule |
| --- | --- | --- |
| targetEnvironmentName | approved target environment name, owner, customer/workspace scope, and deployment boundary | must name the customer or production-like boundary where evidence was generated |
| approvedAccountAlias | non-secret Anthropic organization/workspace alias, account owner, evidence owner, and review date | must use an alias or account label, not provider console identifiers that expose billing or private account details |
| billingCreditStatus | active billing plan, available credit state, payment owner, renewal path, low-balance alert route, and redacted evidence summary | must prove the billing/credit blocker is remediated without exposing exact credit balances or billing identifiers |
| anthropicModelAccess | `ANTHROPIC_MODEL`, model availability, region/workspace access, max token policy, fallback model, and model owner approval | must match the model used by target-boundary live validation |
| secretInjectionPolicy | approved secret manager platform proof, `ANTHROPIC_API_KEY` owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof | must prove secret values are injected and redacted through approved controls |
| providerTermsCustomerApproval | provider terms, data-processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner | must show customer-approved use of Anthropic for the target data boundary |
| quotaSpendGuard | usage envelope, concurrency limit, timeout policy, retry policy, spend owner, saturation fallback, and budget review cadence | must explain how quota, spend, and rate-limit pressure are contained before fallback or stop condition |
| liveValidationEvidence | `npm run live:execution-v1:anthropic` command, mission id, execution session id, provider response status, evidence commit, snapshot path, and artifact hygiene result | must reference a passed live validation generated from the approved target boundary after account remediation |
| telemetryIncidentRoute | probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner | must connect Anthropic account/provider failures to monitoring and incident triage ownership |
| fallbackStopCondition | fallback provider or stop condition, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence | must document the customer-approved behavior when Anthropic is unavailable, credit-blocked, quota-limited, non-provider-failed, non-recoverable, or unsafe |
| remediationReviewAudit | account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date | must prove the previous billing/credit blocker has been closed and reviewed before approval |

The completed template is still not sufficient for `production-ready` by itself. It must be paired with target provider evidence intake, target provider operations, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence.

## Required Commands

```bash
npm run smoke:target-anthropic-provider-account
npm run smoke:anthropic-provider
npm run preflight:execution-v1:anthropic
npm run live:execution-v1:anthropic
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the Anthropic account decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `targetAnthropicProviderApproved: false`.

## Production Gap

This is a local target Anthropic provider account contract. It does not remediate Anthropic billing or credit, approve Anthropic provider readiness, prove model access, prove target secret manager injection, prove target-boundary live validation, prove quota enforcement, prove provider terms approval, or satisfy target environment production evidence.

Anthropic provider readiness remains blocked until a replacement account decision is approved, implementation is completed in the target environment, account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved boundary, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
