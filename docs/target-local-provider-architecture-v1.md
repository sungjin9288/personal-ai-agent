# Target Local Provider Architecture v1

- status: local-target-local-provider-architecture-current
- localDate: 2026-05-06
- decision: do-not-claim-local-provider-readiness-without-approved-target-evidence
- scope: local provider endpoint, model, network boundary, secret policy, session lifecycle, data residency, quota, telemetry, fallback architecture decision contract
- productionReadyClaim: false
- targetLocalProviderApproved: false
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the target local provider architecture decision and evidence requirements that must be satisfied before describing local provider operation as production-ready, customer-ready, or included in a target production provider claim.

It is not local provider live validation proof, not endpoint ownership proof, not model availability proof, not network isolation proof, not data residency proof, not target secret manager proof, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Local provider readiness remains blocked until this architecture decision is approved and target evidence is generated for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence from the approved production-like or hosted target environment.

## Local Provider Decision Areas

| Area | Required Target Decision Before Local Provider Claim | Current Position | Status |
| --- | --- | --- | --- |
| Endpoint ownership | approved local provider base URL alias, runtime owner, network boundary, transport, and availability owner | local adapter expects `LOCAL_PROVIDER_BASE_URL` but no target endpoint is approved | blocked |
| Model pinning | approved model id, model source/version, compatibility profile, max token policy, and fallback model | local provider model/runtime configuration is not approved in current evidence | blocked |
| Network isolation | approved host boundary, ingress policy, egress policy, tenant/customer boundary, and firewall decision | local endpoint boundary is operator-defined without target isolation proof | blocked |
| Secret and credential policy | API key requirement, secret manager alias when used, rotation path, redaction result, and access audit | optional local auth handling exists without target secret policy proof | blocked |
| Runtime lifecycle | process manager, startup command, health endpoint, restart policy, resource limits, and log retention | no approved target local runtime lifecycle record exists | blocked |
| Session and artifact provenance | mission/session id mapping, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference | local execution records exist without target local provider provenance evidence | blocked |
| Data residency and transcript policy | prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence proof | local data lifecycle gates exist without approved local provider transcript policy | blocked |
| Quota and resource guard | CPU/GPU/memory envelope, concurrency, timeout, retry policy, saturation fallback, and resource owner | provider runtime guards exist without target local resource evidence | blocked |
| Telemetry and failure taxonomy | probe result, model availability, run duration, retry count, failureKind, usage/resource metrics, alert route, and incident owner | local telemetry exists without target local provider telemetry history | blocked |
| Fallback and customer approval | fallback provider, degraded mode, customer impact rule, manual approval path, model license decision, and residual risk owner | target provider intake defines fallback requirements without local provider target proof | blocked |

## Required Evidence Packet

Any future target local provider approval must include:

- endpoint ownership proof with approved base URL alias, runtime owner, network boundary, transport, availability owner, and health check record
- model pinning proof with `LOCAL_PROVIDER_MODEL`, model source/version, compatibility profile, max token policy, fallback model, and owner approval
- network isolation proof with host boundary, ingress policy, egress policy, tenant/customer boundary, operator access policy, and firewall decision
- secret and credential policy proof with auth mode, API key requirement decision, approved secret manager platform proof when credentials are used, runtime injection proof, rotation and revocation event proof, leakage and redaction review proof, and secret access audit log proof
- runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention
- session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference
- data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence
- quota and resource guard proof with CPU/GPU/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval
- telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage/resource metrics, alert route, and incident owner
- fallback and customer approval proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, provider terms/local model license decision, residual risk owner, and recoverable-provider-failure-only stop evidence
- migration plan from local provider adapter smoke to approved target local provider operation
- containment plan for missing base URL, missing model, unavailable runtime, model mismatch, data residency gap, resource exhaustion, and fallback failure

## Target Evidence Capture Template

When a target environment is ready for local provider approval, fill this template with target-boundary evidence. Do not record raw API keys, tokens, private endpoint credentials, customer secrets, or machine-local absolute paths.

| Field | Required Value | Completion Rule |
| --- | --- | --- |
| targetEnvironmentName | approved target environment name, owner, and deployment boundary | must name the customer or production-like boundary where evidence was generated |
| approvedBaseUrlAlias | non-secret `LOCAL_PROVIDER_BASE_URL` alias, endpoint owner, network boundary, transport, availability owner, and health check record | must use an alias or documented endpoint label, not a private URL containing credentials |
| localProviderModel | `LOCAL_PROVIDER_MODEL`, model source/version, compatibility profile, max token policy, fallback model, and model owner approval | must match the model used by target-boundary live validation |
| networkIsolation | host boundary, ingress policy, egress policy, tenant/customer boundary, operator access policy, and firewall decision | must show how the local runtime is isolated from unauthorized tenants and networks |
| credentialPolicy | auth mode, API key requirement decision, approved secret manager platform proof when credentials are used, runtime injection proof, rotation and revocation event proof, leakage and redaction review proof, and secret access audit log proof | must prove secret values are injected and redacted through approved controls |
| runtimeLifecycle | process manager, startup command, health endpoint, restart policy, CPU/GPU/memory limits, and log retention | must identify the operational owner for start, restart, saturation, and log retention |
| liveValidationEvidence | `npm run live:execution-v1:local` command, mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, evidence commit, snapshot path, and artifact hygiene result | must reference a passed live validation generated from the approved target boundary |
| dataResidencyPolicy | prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence proof | must prove transcript handling and deletion are compatible with the target customer boundary |
| quotaResourceGuard | resource envelope, concurrency limit, timeout policy, retry policy, saturation fallback, and resource owner approval | must explain how overload is contained before fallback or stop condition |
| telemetryAndIncidentRoute | probe result, model availability, run duration, retry count, failureKind taxonomy, usage/resource metrics, alert route, and incident owner | must connect provider failures to monitoring and incident triage ownership |
| fallbackCustomerApproval | fallback provider or stop condition, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, local model license decision, residual risk owner, and recoverable-provider-failure-only stop evidence | must document the customer-approved behavior when the local provider is unavailable, non-provider-failed, non-recoverable, or unsafe |

The completed template is still not sufficient for `production-ready` by itself. It must be paired with target provider evidence intake, target provider operations, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence.

## Required Commands

```bash
npm run smoke:target-local-provider-architecture
npm run smoke:local-provider
npm run preflight:execution-v1:local
npm run live:execution-v1:local
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the local provider decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `targetLocalProviderApproved: false`.

## Production Gap

This is a local target local provider architecture contract. It does not approve local provider readiness, prove a live local endpoint, prove model availability, prove network isolation, prove data residency, prove target secret manager injection, prove target telemetry, prove quota or resource enforcement, or satisfy target environment production evidence.

Local provider readiness remains blocked until a replacement architecture decision is approved, implementation is completed in the target environment, endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved boundary, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
