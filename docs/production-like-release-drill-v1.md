# Production-Like Release Drill v1

- status: dry-run-evidence-current
- generatedAt: 2026-07-20T04:14:08.140Z
- branch: codex/f2c11-candidate-evaluation-admission
- verifiedCommit: 9c3774d151b695144bad0a02d686376865c1b027
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local deterministic production-like release drill
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedTargetCleanDeploymentOperations: [target-clean-deployment-operations-v1.md](target-clean-deployment-operations-v1.md)

## Decision Boundary

This drill proves that the release gate can be replayed in a local deterministic environment before a production-like deployment run.

It is not production deployment evidence, not customer production SLO/SLA evidence, and not permission to claim `production-ready`.

Production-ready remains blocked until the target deployment model produces target clean deployment operations evidence, clean deployment release proof for clean checkout replay, command matrix results, artifact synchronization, production-like boundary execution, rollback readiness, release approval, and failed-release containment, production SLO/SLA operating evidence, completed target provider validation, and enforced enterprise controls.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
| `npm run smoke:incident-slo-policy` | pass | 0 | 167 |
| `npm run smoke:identity-session-admin` | pass | 0 | 168 |
| `npm run smoke:hosted-identity-session-architecture` | pass | 0 | 242 |
| `npm run smoke:target-identity-session-operations` | pass | 0 | 200 |
| `npm run smoke:tenant-storage-admin` | pass | 0 | 207 |
| `npm run smoke:hosted-tenant-isolation-architecture` | pass | 0 | 221 |
| `npm run smoke:target-tenant-isolation-operations` | pass | 0 | 202 |
| `npm run smoke:customer-support-operations` | pass | 0 | 310 |
| `npm run smoke:support-escalation-review` | pass | 0 | 171 |
| `npm run smoke:target-support-architecture` | pass | 0 | 203 |
| `npm run smoke:target-support-operations` | pass | 0 | 193 |
| `npm run smoke:secret-management` | pass | 0 | 170 |
| `npm run smoke:target-secret-manager-architecture` | pass | 0 | 151 |
| `npm run smoke:target-secret-manager` | pass | 0 | 240 |
| `npm run smoke:observability-telemetry` | pass | 0 | 240 |
| `npm run smoke:target-observability-architecture` | pass | 0 | 265 |
| `npm run smoke:target-observability-operations` | pass | 0 | 176 |
| `npm run smoke:target-slo-architecture` | pass | 0 | 161 |
| `npm run smoke:target-slo-operations` | pass | 0 | 190 |
| `npm run smoke:target-data-lifecycle-architecture` | pass | 0 | 138 |
| `npm run smoke:target-clean-deployment-architecture` | pass | 0 | 120 |
| `npm run smoke:target-clean-deployment-operations` | pass | 0 | 195 |
| `npm run smoke:target-retention-operations` | pass | 0 | 229 |
| `npm run smoke:target-backup-operations` | pass | 0 | 234 |
| `npm run smoke:production-slo-operating` | pass | 0 | 213 |
| `npm run smoke:web-auth-rbac` | pass | 0 | 1476 |
| `npm run smoke:production-enterprise-controls` | pass | 0 | 163 |
| `npm run smoke:production-provider-readiness` | pass | 0 | 162 |
| `npm run smoke:target-openai-provider-account` | pass | 0 | 169 |
| `npm run smoke:target-anthropic-provider-account` | pass | 0 | 157 |
| `npm run smoke:target-local-provider-architecture` | pass | 0 | 141 |
| `npm run smoke:target-hermes-provider-architecture` | pass | 0 | 223 |
| `npm run smoke:target-provider-operations` | pass | 0 | 256 |
| `npm run smoke:target-deployment-contract` | pass | 0 | 164 |
| `npm run smoke:retention-delete-policy` | pass | 0 | 142 |
| `npm run smoke:production-retention-operating` | pass | 0 | 137 |
| `npm run smoke:clean-deployment-release` | pass | 0 | 164 |
| `npm run smoke:execution-v1-status` | pass | 0 | 864 |
| `npm run smoke:execution-v1-snapshot` | pass | 0 | 1196 |
| `npm run smoke:production-readiness-gate` | pass | 0 | 257 |
| `npm run smoke:release-artifact-hygiene` | pass | 0 | 212 |
| `npm run smoke:runtime-data-lifecycle` | pass | 0 | 615 |
| `npm run smoke:tenant-data-lifecycle` | pass | 0 | 155 |
| `npm run smoke:backup-restore-drill` | pass | 0 | 160 |
| `npm run smoke:runtime-isolation` | pass | 0 | 908 |

## Key Signals

### npm run smoke:incident-slo-policy

```json
{
    "mode": "incident-slo-policy",
    "severityCount": 4
  }
```

### npm run smoke:identity-session-admin

```json
{
    "auditPacketItemCount": 11,
    "controlCount": 5,
    "mode": "identity-session-admin",
    "productionReadyClaim": false,
    "sessionEventCount": 5
  }
```

### npm run smoke:hosted-identity-session-architecture

```json
{
    "areaCount": 9,
    "hostedIdentitySessionApproved": false,
    "mode": "hosted-identity-session-architecture",
    "productionReadyClaim": false
  }
```

### npm run smoke:target-identity-session-operations

```json
{
    "controlCount": 9,
    "identityPacketItemCount": 16,
    "mode": "target-identity-session-operations",
    "productionReadyClaim": false
  }
```

### npm run smoke:tenant-storage-admin

```json
{
    "auditPacketItemCount": 10,
    "controlCount": 5,
    "mode": "tenant-storage-admin",
    "operationCount": 5,
    "productionReadyClaim": false
  }
```

### npm run smoke:hosted-tenant-isolation-architecture

```json
{
    "areaCount": 9,
    "hostedTenantIsolationApproved": false,
    "mode": "hosted-tenant-isolation-architecture",
    "productionReadyClaim": false
  }
```

### npm run smoke:target-tenant-isolation-operations

```json
{
    "controlCount": 9,
    "mode": "target-tenant-isolation-operations",
    "productionReadyClaim": false,
    "tenantPacketItemCount": 14
  }
```

### npm run smoke:customer-support-operations

```json
{
    "intakeClassCount": 5,
    "mode": "customer-support-operations",
    "productionReadyClaim": false,
    "supportRoleCount": 5
  }
```

### npm run smoke:support-escalation-review

```json
{
    "auditPacketItemCount": 10,
    "escalationRouteCount": 4,
    "mode": "support-escalation-review",
    "productionReadyClaim": false,
    "reviewCadenceCount": 4
  }
```

### npm run smoke:target-support-architecture

```json
{
    "areaCount": 10,
    "mode": "target-support-architecture",
    "productionReadyClaim": false,
    "targetSupportApproved": false
  }
```

### npm run smoke:target-support-operations

```json
{
    "controlCount": 8,
    "mode": "target-support-operations",
    "productionReadyClaim": false,
    "supportPacketItemCount": 12
  }
```

### npm run smoke:secret-management

```json
{
    "injectionRuleCount": 5,
    "mode": "secret-management",
    "productionReadyClaim": false,
    "secretClassCount": 5
  }
```

### npm run smoke:target-secret-manager-architecture

```json
{
    "areaCount": 9,
    "mode": "target-secret-manager-architecture",
    "productionReadyClaim": false,
    "targetSecretManagerApproved": false
  }
```

### npm run smoke:target-secret-manager

```json
{
    "controlCount": 6,
    "mode": "target-secret-manager",
    "productionReadyClaim": false,
    "rotationPacketItemCount": 10
  }
```

### npm run smoke:observability-telemetry

```json
{
    "alertTriggerCount": 5,
    "mode": "observability-telemetry",
    "productionReadyClaim": false,
    "telemetrySignalCount": 6
  }
```

### npm run smoke:target-observability-architecture

```json
{
    "areaCount": 9,
    "mode": "target-observability-architecture",
    "productionReadyClaim": false,
    "targetObservabilityApproved": false
  }
```

### npm run smoke:target-observability-operations

```json
{
    "controlCount": 6,
    "mode": "target-observability-operations",
    "operationsPacketItemCount": 10,
    "productionReadyClaim": false
  }
```

### npm run smoke:target-slo-architecture

```json
{
    "areaCount": 10,
    "mode": "target-slo-architecture",
    "productionReadyClaim": false,
    "targetSloApproved": false
  }
```

### npm run smoke:target-slo-operations

```json
{
    "controlCount": 10,
    "mode": "target-slo-operations",
    "productionReadyClaim": false,
    "sloPacketItemCount": 14
  }
```

### npm run smoke:target-data-lifecycle-architecture

```json
{
    "areaCount": 10,
    "mode": "target-data-lifecycle-architecture",
    "productionReadyClaim": false,
    "targetDataLifecycleApproved": false
  }
```

### npm run smoke:target-clean-deployment-architecture

```json
{
    "areaCount": 10,
    "mode": "target-clean-deployment-architecture",
    "productionReadyClaim": false,
    "targetCleanDeploymentApproved": false
  }
```

### npm run smoke:target-clean-deployment-operations

```json
{
    "controlCount": 10,
    "deploymentPacketItemCount": 14,
    "mode": "target-clean-deployment-operations",
    "productionReadyClaim": false
  }
```

### npm run smoke:target-retention-operations

```json
{
    "controlCount": 6,
    "mode": "target-retention-operations",
    "productionReadyClaim": false,
    "retentionPacketItemCount": 10
  }
```

### npm run smoke:target-backup-operations

```json
{
    "controlCount": 6,
    "mode": "target-backup-operations",
    "productionReadyClaim": false,
    "recoveryPacketItemCount": 10
  }
```

### npm run smoke:production-slo-operating

```json
{
    "commandCount": 14,
    "mode": "production-slo-operating",
    "productionReadyClaim": false
  }
```

### npm run smoke:web-auth-rbac

```json
{
    "authMode": "enforce",
    "mode": "web-auth-rbac",
    "roleChecks": {
      "authenticatedOperatorMissionCreated": true,
      "authenticatedViewerMutationBlocked": true,
      "invalidTokenBlocked": true,
      "missingTokenBlocked": true
    }
  }
```

### npm run smoke:production-enterprise-controls

```json
{
    "commandCount": 9,
    "mode": "production-enterprise-controls",
    "productionReadyClaim": false
  }
```

### npm run smoke:production-provider-readiness

```json
{
    "mode": "production-provider-readiness",
    "productionReadyClaim": false,
    "providerCount": 4
  }
```

### npm run smoke:target-openai-provider-account

```json
{
    "areaCount": 10,
    "mode": "target-openai-provider-account",
    "productionReadyClaim": false,
    "targetOpenAIProviderApproved": false
  }
```

### npm run smoke:target-anthropic-provider-account

```json
{
    "areaCount": 10,
    "mode": "target-anthropic-provider-account",
    "productionReadyClaim": false,
    "targetAnthropicProviderApproved": false
  }
```

### npm run smoke:target-local-provider-architecture

```json
{
    "areaCount": 10,
    "mode": "target-local-provider-architecture",
    "productionReadyClaim": false,
    "targetLocalProviderApproved": false
  }
```

### npm run smoke:target-hermes-provider-architecture

```json
{
    "areaCount": 10,
    "mode": "target-hermes-provider-architecture",
    "productionReadyClaim": false,
    "targetHermesProviderApproved": false
  }
```

### npm run smoke:target-provider-operations

```json
{
    "controlCount": 11,
    "mode": "target-provider-operations",
    "productionReadyClaim": false,
    "providerPacketItemCount": 18
  }
```

### npm run smoke:target-deployment-contract

```json
{
    "controlCount": 27,
    "mode": "target-deployment-contract",
    "productionReadyClaim": false,
    "profileCount": 4
  }
```

### npm run smoke:retention-delete-policy

```json
{
    "dataClassCount": 8,
    "mode": "retention-delete-policy",
    "productionReadyClaim": false
  }
```

### npm run smoke:production-retention-operating

```json
{
    "commandCount": 11,
    "mode": "production-retention-operating",
    "productionReadyClaim": false
  }
```

### npm run smoke:clean-deployment-release

```json
{
    "commandCount": 36,
    "mode": "clean-deployment-release",
    "productionReadyClaim": false
  }
```

### npm run smoke:execution-v1-status

```json
{
    "artifactState": "local-current",
    "artifactSyncCommit": false,
    "branch": "codex/f2c11-candidate-evaluation-admission",
    "deterministic": "8/8",
    "referenceAdoptionReady": true,
    "runtimeRows": 8,
    "snapshotCommit": "9c3774d151b695144bad0a02d686376865c1b027"
  }
```

### npm run smoke:execution-v1-snapshot

```json
{
    "artifactSyncCommit": false,
    "deterministicPassed": 8,
    "runtimeRows": 8,
    "verifiedCommit": "9c3774d151b695144bad0a02d686376865c1b027"
  }
```

### npm run smoke:production-readiness-gate

```json
{
    "blockedProductionReady": true,
    "label": "provider-scoped pilot ready for OpenAI-backed local-first path",
    "openaiLiveValidation": "passed",
    "pilotCleanDeploymentRelease": "present",
    "pilotIdentitySessionAdmin": "present",
    "pilotTenantStorageAdmin": "present",
    "pilotCustomerSupportOperations": "present",
    "pilotSupportEscalationReview": "present",
    "pilotTargetSupportOperations": "present",
    "pilotSecretManagement": "present",
    "pilotTargetSecretManager": "present",
    "pilotObservabilityTelemetry": "present",
    "pilotTargetObservabilityArchitecture": "present",
    "pilotTargetObservabilityOperations": "present",
    "pilotTargetSloOperations": "present",
    "pilotTargetDataLifecycleArchitecture": "present",
    "pilotTargetRetentionOperations": "present",
    "pilotTargetBackupOperations": "present",
    "pilotTargetCleanDeploymentOperations": "present",
    "pilotProductionEnterpriseControls": "present",
    "pilotIncidentSloPolicy": "present",
    "pilotProductionProviderReadiness": "present",
    "pilotTargetProviderOperations": "present",
    "pilotProductionRetentionOperating": "present",
    "pilotProductionSloOperating": "present",
    "pilotRetentionDeletePolicy": "present",
    "productionLikeReleaseDrill": "present",
    "productionBlockerCount": 24,
    "releaseArtifactHygiene": "passed",
    "releaseArtifactHygieneScannedFiles": 109
  }
```

### npm run smoke:release-artifact-hygiene

```json
{
    "machinePathFindingCount": 0,
    "scannedFileCount": 109,
    "secretFindingCount": 0,
    "verifiedCommit": "9c3774d151b695144bad0a02d686376865c1b027"
  }
```

### npm run smoke:runtime-data-lifecycle

```json
{
    "deleted": true,
    "exportedFileCount": 14,
    "mode": "runtime-data-lifecycle"
  }
```

### npm run smoke:tenant-data-lifecycle

```json
{
    "deletedTenantA": true,
    "exportedFileCount": 2,
    "mode": "tenant-data-lifecycle"
  }
```

### npm run smoke:backup-restore-drill

```json
{
    "backupFileCount": 3,
    "mode": "backup-restore-drill",
    "restoredFileCount": 3,
    "tenantDeleteIsolated": true
  }
```

### npm run smoke:runtime-isolation

```json
{
    "deletedRuntimeA": true,
    "exportAFileCount": 14,
    "exportBFileCount": 14,
    "mode": "runtime-isolation"
  }
```

## Production Blockers Preserved

- provider live validation completion evidence for Anthropic and Hermes is incomplete, and production provider live validation evidence for Anthropic billing and credit remediation, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, npm run live:execution-v1:anthropic result, Hermes target provider architecture approval, HERMES_PROVIDER_MODEL model pinning proof, Hermes endpoint ownership proof and target secret injection proof, npm run live:execution-v1:hermes result, mission id, execution session id, provider response status, retry lineage, artifact provenance, telemetry probe result, failureKind taxonomy, fallback or disable decision, remediation owner, next review date, release artifact hygiene result, and regenerated execution snapshot is not generated from the approved production-like or hosted target environment
- target OpenAI provider account is not approved, and target OpenAI provider account evidence for account ownership proof with OpenAI organization/project owner, project/workspace alias, customer scope, evidence owner, and review date, billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance/quota alert route, and redacted evidence summary, API key and secret injection proof with approved secret manager platform proof, OPENAI_API_KEY owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof, model access proof with OPENAI_MODEL, model availability, region/project access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript/retention policy, support owner, and evidence owner, usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:openai, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence, provider operations proof, renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date, migration plan, missing API key, revoked key, quota exhaustion, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment
- target provider operations evidence for completed per-provider operations capture template, branch and commit, release label and deployment boundary, provider inventory proof with OpenAI, Anthropic, local, and Hermes inclusion state, owner, customer/workspace approval, account or architecture record, and operating decision, provider account approval proof with account owner proof, customer or workspace approval proof, billing and credit or quota state proof, provider terms proof, model access proof, and renewal owner proof, target secret injection proof with approved secret manager platform proof, secret owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, credential containment proof, and artifact hygiene result, target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, and operator owner, model and endpoint pinning proof with model id, endpoint/base URL alias, retry policy, concurrency limit, fallback route, and approval owner, quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route, fallback and disable proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop conditions, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof with provider blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, regenerated execution snapshot evidence, and refreshed release artifact references, provider telemetry proof with health signal, latency/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner, provider incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes, data and transcript handling proof with data classification, provider transcript policy, retention class, export/delete handling, redaction rule, and post-delete absence requirement, remediation and renewal review proof with billing and credit remediation proof, endpoint renewal proof, model access renewal proof, key rotation proof, provider terms review proof, accepted-risk owner proof, and next review date proof, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and provider failure containment plan is not generated from a production-like environment
- target Anthropic provider account is not approved, and target Anthropic provider account evidence for account ownership proof with Anthropic account owner, organization/workspace alias, customer scope, evidence owner, and review date, billing and credit proof with active billing plan, available credit balance, payment owner, renewal path, low-balance alert route, and screenshot-free redacted evidence summary, API key and secret injection proof with approved secret manager platform proof, ANTHROPIC_API_KEY owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof, model access proof with ANTHROPIC_MODEL, model availability, region/workspace access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner, quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:anthropic, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence, provider operations proof, remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date, migration plan, low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment
- target local provider architecture is not approved, and target local provider architecture evidence for endpoint ownership proof with approved base URL alias, runtime owner, network boundary, transport, availability owner, and health check record, model pinning proof with LOCAL_PROVIDER_MODEL, model source/version, compatibility profile, max token policy, fallback model, and owner approval, network isolation proof with host boundary, ingress policy, egress policy, tenant/customer boundary, operator access policy, and firewall decision, secret and credential policy proof with auth mode, API key requirement decision, approved secret manager platform proof when credentials are used, runtime injection proof, rotation and revocation event proof, leakage and redaction review proof, and secret access audit log proof, runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence, quota and resource guard proof with CPU/GPU/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval, telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage/resource metrics, alert route, and incident owner, fallback and customer approval proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, provider terms/local model license decision, residual risk owner, and recoverable-provider-failure-only stop evidence, provider operations proof, migration plan, missing base URL, missing model, unavailable runtime, model mismatch, data residency gap, resource exhaustion, and fallback failure containment is not generated from a production-like environment
- target Hermes provider architecture is not approved, and target Hermes provider architecture evidence for endpoint ownership proof with approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check record, model pinning proof with HERMES_PROVIDER_MODEL, model version/source, compatibility profile, max token policy, fallback model, and owner approval, secret injection proof with approved secret manager platform proof, API key requirement decision, runtime injection proof, rotation and revocation event proof, break-glass governance proof, secret access audit log proof, and leakage and redaction review proof, tool-call parsing proof with Hermes <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence, quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review, telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner, fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence, provider operations proof, customer approval proof with provider terms, allowed workspace/customer, data-processing approval, support owner, evidence owner, and next review date, migration plan, missing model, unavailable endpoint, malformed tool-call output, transcript retention gap, quota exhaustion, and fallback failure containment is not generated from a production-like environment
- hosted identity session architecture is not approved, and hosted identity/session architecture evidence for customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target identity/session operations evidence for customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- hosted tenant isolation architecture is not approved, and hosted tenant isolation architecture evidence for tenant identity source proof with tenant source owner, customer organization mapping, lifecycle owner, trust policy, and source approval, tenant lifecycle proof with create, suspend, restore, delete, owner transfer, exception review, and orphan tenant review, tenant-aware authorization proof with policy, service-to-service tenant propagation, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema/bucket/keyspace boundary, and migration safety, per-tenant encryption and key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup/restore isolation proof with tenant-scoped backup creation, restore authorization, integrity result, other-tenant non-interference, and post-restore denial, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and tenant admin owner, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, and support owner, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner, migration plan, rollback, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target tenant isolation operations evidence for tenant identity source proof with source owner, customer organization mapping, tenant lifecycle owner, trust policy, source approval, and orphan tenant review, tenant-scoped authorization proof with permission policy, service propagation, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema/bucket/keyspace boundary, and migration safety, per-tenant encryption/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, tenant admin owner, and approval expiry, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target secret manager architecture is not approved, and target secret manager architecture evidence for approved platform proof with provider, region, tenancy boundary, owner, and fallback decision, secret class inventory proof with provider, environment, owner, rotation cadence, and allowed consumers, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy proof with reader, writer, admin, reviewer, service binding, and deny-by-default evidence, rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result, secret access audit log proof for read, write, rotate, revoke, break-glass, and failed access attempts, break-glass governance proof with approval, expiry, monitoring, customer notification, revocation, and post-use review, leakage review proof across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery proof for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target observability architecture is not approved, and target observability architecture evidence for approved telemetry backend, region, tenancy boundary, owner, fallback, and data residency, signal inventory for release, provider, mission, approval, runtime, security, support, and incident domains, ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events, alert routing with severity mapping, primary and secondary routes, retry policy, acknowledgement SLA, and delivery receipts, staffed on-call proof with rota, primary and backup owner, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain, log and trace retention with storage class, redaction policy, query role, customer export boundary, and deletion path, customer status communication, incident response, audit export, disaster recovery, migration plan, rollback, false-positive triage, alert fatigue, customer communication containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target observability operations evidence for telemetry ingestion proof with metrics, logs, traces, audit events, provider events, release events, and support events, alert delivery proof with route, severity, delivery receipt, retry policy, acknowledgement SLA, and escalation evidence, trace/log retention proof with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit, staffed on-call routing and acknowledgement proof with rota, primary and backup owner, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain, customer-facing status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence, incident response proof with timeline, mitigation owner, customer impact, review decision, corrective actions, due dates, and closure evidence, incident review history proof, audit export proof, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target deployment contract evidence for target deployment name with approved target environment name, company/workspace scope, deployment owner, evidence owner, review date, and release label, deployment profile decision with selected deployment profile, approved architecture decision, network boundary, runtime root alias, rollback owner, and customer approval reference, mandatory control evidence with every mandatory control, required command output, production readiness gate result, and unresolved blocker list, provider readiness evidence with completed provider evidence intake, target provider operations, provider account or architecture approvals, target secret injection proof, target-boundary live validation proof, quota, cost, and resource guard proof, fallback and stop-condition evidence, and provider failure containment proof, identity and tenant evidence with hosted identity/session approval, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, target identity/session operations, hosted tenant isolation approval, tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, target tenant isolation operations, RBAC/session audit, tenant storage boundary, storage partitioning proof, encryption/key ownership proof, backup/restore isolation proof, cross-tenant denial proof, observability/support isolation proof, lifecycle isolation proof, release artifact hygiene, and regenerated execution snapshot evidence, secret and observability evidence with target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, target observability architecture approval, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, target observability operations evidence, target SLO architecture approval, customer-approved SLO/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, target SLO operations evidence, incident review evidence, release artifact hygiene, and regenerated execution snapshot evidence, data lifecycle and support evidence with target data lifecycle approval, target retention operations evidence with customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene, and regenerated execution snapshot evidence, target backup operations evidence with backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry/deletion proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence, target support operations evidence with staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, and regenerated execution snapshot evidence, clean release artifact evidence with target clean deployment architecture, target clean deployment operations, clean deployment run, dependency/runtime proof, release snapshot, export package, production-like drill, artifact hygiene result, rollback proof, and failed-deployment containment, stop-condition decision with explicit stop conditions, residual blockers, accepted risks, blocker owner, remediation owner, and next review date, and production-ready claim decision with decision owner, approval or rejection summary, allowed claim text, evidence commit, snapshot path, and regeneration command references is not generated from a production-like environment
- target SLO architecture is not approved, and target SLO/SLA architecture evidence for customer-approved availability, latency, error rate, support response, maintenance window, exclusions, decision owner, error budget policy with measurement window, budget owner, burn-rate threshold, freeze rule, exception handling, review cadence, telemetry measurement proof for metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, retention period, alert acknowledgement proof with severity mapping, route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, audit record, staffed on-call proof with rota, primary and secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, customer communication proof, incident review proof, provider outage playbook proof, maintenance and degradation proof, service credit and contractual escalation proof, migration plan, rollback, communication misfire, false-positive alert, alert fatigue, missed-SLO containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target SLO operations evidence for customer-approved SLO/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target data lifecycle architecture is not approved, and target data lifecycle architecture evidence for customer-approved data class matrix with legal basis, owner, retention window, exportability, delete eligibility, and exception policy, target retention configuration with enforcement timestamp, storage boundary, policy owner, reviewer, and audit record, export request proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt, delete request proof with authorization, confirmation control, execution owner, storage scope, timestamp, and audit record, provider transcript policy proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure, post-delete absence evidence across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, backup architecture proof with schedule, encrypted storage, storage class, retention class, missed-run handling, owner acknowledgement, and access audit, restore validation proof with objective, duration, restored data class inventory, integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup key ownership proof with key owner, rotation cadence, revocation, break-glass, expiry/delete evidence, and access audit, disaster recovery evidence with owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, migration plan, rollback, legal hold, delete conflict, provider transcript exception, and customer communication containment is not generated from a production-like environment
- target retention operations evidence for customer-approved data class proof with class owner, legal basis, retention window, exportability, delete eligibility, and exception policy, target retention configuration proof with storage boundary, enforcement timestamp, policy owner, reviewer, and audit record, export approval proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt, delete workflow proof with authorization, confirmation control, execution owner, storage scope, timestamp, result, and audit record, provider transcript handling proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure, post-delete absence proof across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, audit history proof, release artifact hygiene result, and regenerated execution snapshot evidence, plus target backup operations evidence for backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement, encrypted backup storage proof with storage class, encryption mode, retention class, location alias, and access audit, backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry/delete evidence, and access audit, restore validation proof with objective, duration, restored data class inventory, checksum or integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup expiry/deletion proof with expiry schedule, delete proof, post-delete absence check, and audit record, disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- production SLO/SLA operating evidence for incident/SLO policy replay, target SLO architecture and operations gates, observability telemetry and target observability operations, support escalation and target support operations, release artifact hygiene, runtime lifecycle, runtime isolation, staffed incident ownership, customer-approved SLO/SLA terms, and provider/deployment evidence is not generated from a production-like environment
- target support architecture is not approved, and target support architecture evidence for staffing model, support queue platform, severity routing, customer communication boundary, ticket audit and retention, on-call handoff, incident commander ownership, escalation and backup coverage, support data handling, incident review governance, migration plan, and missed-acknowledgement, queue-misrouting, customer-communication, ticket-audit, and unstaffed-escalation containment is not generated from a production-like environment
- target support operations evidence for staffed support coverage proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, absence handling, and acknowledgement evidence, support queue routing proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, access policy, assignment audit, and escalation evidence, customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, message reference, and closure message, ticket audit history proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, evidence owner, and closure audit, escalation ownership proof with incident commander, engineering escalation, provider escalation, executive/customer escalation, backup owner, retry history, failure fallback, and audit record, incident review cadence proof with review cadence, timeline, mitigation owner, customer impact summary, corrective action owner, due date, review decision, closure evidence, and evidence retention, on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, and escalation chain, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment
- target clean deployment architecture is not approved, and target clean deployment architecture evidence for source provenance proof with branch, commit, review owner, build actor, release tag, and tamper-control decision, artifact registry proof with immutable artifact id, sha256, registry path, retention policy, access owner, and promotion rule, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, and bootstrap owner, secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration and data readiness proof with migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, migration plan, dependency drift, failed bootstrap, failed secret injection, rollback failure, and misleading release approval containment is not generated from a production-like environment
- target clean deployment operations evidence for source provenance proof with approved branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval, artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner, secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration and data readiness proof with migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and failed-deployment containment plan is not generated from a production-like environment
- clean deployment release evidence for clean checkout proof with source branch, source commit, tracked-file mode, file count, excluded runtime state, and clean checkout owner, command replay proof with incident/SLO, identity/session, tenant, support, secret, observability, SLO, data lifecycle, clean deployment architecture and operations, retention, backup, provider, target deployment contract, artifact hygiene, runtime lifecycle, runtime isolation, pilot export, and package validation results, artifact synchronization proof with source commit, execution snapshot, clean deployment release artifact, production-like drill, pilot export package, release artifact hygiene, and artifact-sync-current status, production-like environment proof with approved target boundary, runtime bootstrap, secret injection, dependency install, environment boundary, rollback point, release approval, operator, and timestamp, and failure containment for stale checkout, dependency drift, local runtime leakage, missing artifact, failed smoke, failed hygiene, failed rollback, and misleading production-ready claim is not generated from a production-like environment

## Operator Re-Run

```bash
npm run drill:production-like-release
npm run smoke:production-like-release-drill
```

## Acceptance Rule

The drill is acceptable only when every command in the matrix passes and artifact hygiene reports zero secret and machine-local path findings.

The drill must keep `productionReadyClaim: false` until production-like deployment evidence is generated from the approved target environment.
