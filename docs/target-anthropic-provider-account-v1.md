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

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Anthropic provider readiness remains blocked until this account decision is approved and Anthropic live validation evidence is generated from the approved production-like or hosted target environment.

## Anthropic Account Decision Areas

| Area | Required Target Decision Before Anthropic Claim | Current Position | Status |
| --- | --- | --- | --- |
| Account ownership | approved Anthropic account owner, organization/workspace, customer scope, and evidence owner | live evidence records Anthropic HTTP 400 billing/credit blocker | blocked |
| Billing and credit | active billing plan, available credit balance, payment owner, renewal path, and low-balance alert route | current live validation failed with low credit balance message | blocked |
| API key and secret injection | target secret manager alias, API key owner, rotation path, access audit, and redaction result | `ANTHROPIC_API_KEY` can be injected locally but target secret evidence is absent | blocked |
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
- API key and secret injection proof with target secret manager alias, `ANTHROPIC_API_KEY` owner, rotation path, access audit, break-glass owner, and redaction result
- model access proof with `ANTHROPIC_MODEL`, model availability, region/workspace access, max token policy, fallback model, and owner approval
- provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner
- quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence
- target live validation proof with `npm run live:execution-v1:anthropic`, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference
- telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner
- fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision
- remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date
- migration plan from failed Anthropic account state to approved target Anthropic provider operation
- containment plan for low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure

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

Anthropic provider readiness remains blocked until a replacement account decision is approved, billing/credit is remediated, implementation is completed in the target environment, `npm run live:execution-v1:anthropic` passes from the approved boundary, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
