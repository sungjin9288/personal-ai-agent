# Target Hermes Provider Architecture v1

- status: local-target-hermes-provider-architecture-current
- localDate: 2026-05-06
- decision: do-not-claim-hermes-provider-readiness-without-approved-target-evidence
- scope: Hermes-compatible provider endpoint, model, tool-call parsing, session lifecycle, secret injection, quota, telemetry, and fallback architecture decision contract
- productionReadyClaim: false
- targetHermesProviderApproved: false
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the target Hermes-compatible provider architecture decision and evidence requirements that must be satisfied before describing Hermes as production-ready, customer-ready, or included in a target production provider claim.

It is not Hermes live validation proof, not endpoint ownership proof, not model availability proof, not target secret manager injection proof, not provider transcript retention proof, not customer data approval, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Hermes provider readiness remains blocked until this architecture decision is approved and target evidence is generated for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, customer approval proof, provider operations proof, target-boundary live:execution-v1:hermes proof, release artifact hygiene result, and regenerated execution snapshot evidence from the approved production-like or hosted target environment.

## Hermes Decision Areas

| Area | Required Target Decision Before Hermes Claim | Current Position | Status |
| --- | --- | --- | --- |
| Endpoint ownership | approved Hermes-compatible endpoint owner, network boundary, base URL alias, transport, and availability owner | local adapter defaults exist without target endpoint approval | blocked |
| Model pinning | approved model id, model version/source, compatibility profile, max token policy, and fallback model | `HERMES_PROVIDER_MODEL` is missing in current live validation evidence | blocked |
| Secret injection | API key requirement decision, approved secret manager platform proof, runtime injection proof, rotation and revocation event proof, break-glass governance proof, and leakage and redaction review proof | optional local API key handling exists without target secret injection proof | blocked |
| Tool-call parsing | approved Hermes `<tool_call>` contract, malformed-call handling, execution boundary, and audit record | parser smoke exists without target provider output history | blocked |
| Session lifecycle | mission/session id mapping, provider response id retention, retry lineage, and artifact provenance | local execution records exist without Hermes target session evidence | blocked |
| Data and transcript policy | prompt data class, provider transcript retention, customer data approval, delete request path, and post-delete absence proof | data lifecycle gates exist without Hermes provider transcript proof | blocked |
| Quota and rate guard | concurrency, timeout, retry policy, cost owner, usage envelope, and saturation fallback | provider runtime guards exist without target Hermes quota evidence | blocked |
| Telemetry and failure taxonomy | probe result, run duration, retry count, failureKind, model availability, usage metrics, and incident route | local provider telemetry exists without Hermes target telemetry history | blocked |
| Fallback and stop condition | fallback provider, degraded mode, customer impact rule, manual approval path, and rollback owner | target provider intake defines fallback requirements without Hermes target proof | blocked |
| Customer approval | customer/provider terms, allowed workspace, data-processing approval, support owner, and evidence owner | no customer-approved Hermes provider evidence exists | blocked |

## Required Evidence Packet

Any future target Hermes provider approval must include:

- endpoint ownership proof with approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check record
- model pinning proof with `HERMES_PROVIDER_MODEL`, model version/source, compatibility profile, max token policy, fallback model, and owner approval
- secret injection proof with approved secret manager platform proof, API key requirement decision, runtime injection proof, rotation and revocation event proof, break-glass governance proof, secret access audit log proof, and leakage and redaction review proof
- tool-call parsing proof with Hermes `<tool_call>` sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence
- session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference
- data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence
- quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review
- telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner
- fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence
- customer approval proof with provider terms, allowed workspace/customer, data-processing approval, support owner, evidence owner, and next review date
- migration plan from local Hermes adapter smoke to approved target Hermes provider operation
- explicit containment plan for missing model, unavailable endpoint, malformed tool-call output, transcript retention gap, quota exhaustion, and fallback failure

## Target Evidence Capture Template

When a target environment is ready for Hermes provider approval, fill this template with target-boundary evidence. Do not record raw API keys, tokens, private endpoint credentials, customer secrets, or machine-local absolute paths.

| Field | Required Value | Completion Rule |
| --- | --- | --- |
| targetEnvironmentName | approved target environment name, owner, and deployment boundary | must name the customer or production-like boundary where evidence was generated |
| approvedEndpointAlias | non-secret Hermes-compatible base URL alias, endpoint owner, network boundary, transport, availability owner, and health check record | must use an alias or documented endpoint label, not a private URL containing credentials |
| hermesProviderModel | `HERMES_PROVIDER_MODEL`, model version/source, compatibility profile, max token policy, fallback model, and model owner approval | must match the model used by target-boundary live validation |
| secretInjectionPolicy | API key requirement decision, approved secret manager platform proof when credentials are used, runtime injection proof, rotation and revocation event proof, break-glass governance proof, secret access audit log proof, and leakage and redaction review proof | must prove secret values are injected and redacted through approved controls |
| toolCallContractEvidence | Hermes `<tool_call>` sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence | must prove target provider output is compatible with the approved tool-call parser and containment policy |
| sessionLifecycleEvidence | mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference | must connect target Hermes responses to durable execution evidence without exposing sensitive transcripts |
| liveValidationEvidence | `npm run live:execution-v1:hermes` command, mission id, execution session id, provider response id, retry lineage, artifact provenance, evidence commit, snapshot path, and artifact hygiene result | must reference a passed live validation generated from the approved target boundary |
| transcriptRetentionPolicy | prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence proof | must prove transcript handling and deletion are compatible with the target customer boundary |
| quotaRateGuard | concurrency limit, timeout policy, retry policy, cost owner, usage envelope, saturation fallback, and spend review | must explain how quota or endpoint saturation is contained before fallback or stop condition |
| telemetryAndIncidentRoute | probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner | must connect Hermes failures to monitoring and incident triage ownership |
| fallbackCustomerApproval | fallback provider or stop condition, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence | must document the customer-approved behavior when Hermes is unavailable, malformed, non-provider-failed, non-recoverable, or unsafe |

The completed template is still not sufficient for `production-ready` by itself. It must be paired with target provider evidence intake, target provider operations, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence.

## Required Commands

```bash
npm run smoke:target-hermes-provider-architecture
npm run smoke:hermes-provider
npm run preflight:execution-v1:hermes
npm run live:execution-v1:hermes
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the Hermes decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `targetHermesProviderApproved: false`.

## Production Gap

This is a local target Hermes provider architecture contract. It does not approve Hermes provider readiness, prove a live Hermes endpoint, prove model availability, prove target secret injection, prove transcript retention or deletion, prove target telemetry, prove quota enforcement, or satisfy target environment production evidence.

Hermes provider readiness remains blocked until a replacement architecture decision is approved, implementation is completed in the target environment, endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, customer approval proof, provider operations proof, target-boundary live:execution-v1:hermes proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved boundary, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
