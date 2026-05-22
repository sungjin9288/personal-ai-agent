import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const drillPath = path.join(repoDir, 'docs', 'production-like-release-drill-v1.md');
const releaseReadinessPath = path.join(repoDir, 'docs', 'release-readiness-v1.md');
const deploymentPath = path.join(repoDir, 'docs', 'deployment-pilot-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const drill = readRequiredFile(drillPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const deployment = readRequiredFile(deploymentPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));
const currentCommit = runGit(['rev-parse', 'HEAD']);
const verifiedCommit = extractBulletValue(drill, 'verifiedCommit');

assert.equal(packageJson.scripts['drill:production-like-release'], 'node scripts/build-production-like-release-drill.mjs');
assert.equal(packageJson.scripts['smoke:production-like-release-drill'], 'node scripts/smoke-production-like-release-drill.mjs');

assert.match(drill, /^# Production-Like Release Drill v1$/m);
assert.match(drill, /^- status: dry-run-evidence-current$/m);
assertArtifactCommitFresh({
  artifactCommit: verifiedCommit,
  currentCommit,
  label: 'production-like-release-drill verifiedCommit',
});
assert.match(drill, /^- productionReadyClaim: false$/m);
assert.match(drill, /It is not production deployment evidence/);
assert.match(drill, /not permission to claim `production-ready`/);
assert.match(drill, /productionReadyClaim: false/);

for (const command of [
  'npm run smoke:incident-slo-policy',
  'npm run smoke:identity-session-admin',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:target-identity-session-operations',
  'npm run smoke:tenant-storage-admin',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:target-support-architecture',
  'npm run smoke:target-support-operations',
  'npm run smoke:secret-management',
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:target-secret-manager',
  'npm run smoke:observability-telemetry',
  'npm run smoke:target-observability-architecture',
  'npm run smoke:target-observability-operations',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-slo-operations',
  'npm run smoke:target-data-lifecycle-architecture',
  'npm run smoke:target-clean-deployment-architecture',
  'npm run smoke:target-clean-deployment-operations',
  'npm run smoke:target-retention-operations',
  'npm run smoke:target-backup-operations',
  'npm run smoke:production-slo-operating',
  'npm run smoke:web-auth-rbac',
  'npm run smoke:production-enterprise-controls',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:target-provider-operations',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:retention-delete-policy',
  'npm run smoke:production-retention-operating',
  'npm run smoke:clean-deployment-release',
  'npm run smoke:execution-v1-status',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:runtime-data-lifecycle',
  'npm run smoke:tenant-data-lifecycle',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:runtime-isolation',
]) {
  assert.match(drill, new RegExp(`\\| \`${escapeRegExp(command)}\` \\| pass \\| 0 \\|`));
}

for (const blocker of [
  /provider live validation completion evidence for Anthropic and Hermes is incomplete, and production provider live validation evidence for Anthropic billing and credit remediation, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, npm run live:execution-v1:anthropic result, Hermes target provider architecture approval, HERMES_PROVIDER_MODEL model pinning proof, Hermes endpoint ownership proof and target secret injection proof, npm run live:execution-v1:hermes result, mission id, execution session id, provider response status, retry lineage, artifact provenance, telemetry probe result, failureKind taxonomy, fallback or disable decision, remediation owner, next review date, release artifact hygiene result, and regenerated execution snapshot is not generated/,
  /target OpenAI provider account is not approved, and target OpenAI provider account evidence for account ownership proof with OpenAI organization\/project owner, project\/workspace alias, customer scope, evidence owner, and review date, billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance\/quota alert route, and redacted evidence summary, API key and secret injection proof with target secret manager alias, OPENAI_API_KEY owner, rotation path, access audit, break-glass owner, and redaction result, model access proof with OPENAI_MODEL, model availability, region\/project access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript\/retention policy, support owner, and evidence owner, usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:openai, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date, migration plan, missing API key, revoked key, quota exhaustion, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment/,
  /target provider operations evidence for completed per-provider operations capture template, branch and commit, release label and deployment boundary, provider inventory proof with OpenAI, Anthropic, local, and Hermes inclusion state, owner, customer\/workspace approval, account or architecture record, and operating decision, provider account approval proof with billing\/credit\/quota state, provider terms, model access, and renewal owner, target secret injection proof with secret manager alias, rotation owner, access policy, redaction result, break-glass path, and revocation evidence, target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, and operator owner, model and endpoint pinning proof with model id, endpoint\/base URL alias, retry policy, concurrency limit, fallback route, and approval owner, quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route, fallback and disable proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop conditions, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof with provider blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, and regenerated release artifacts, provider telemetry proof with health signal, latency\/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner, provider incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes, data and transcript handling proof with data classification, provider transcript policy, retention class, export\/delete handling, redaction rule, and post-delete absence requirement, remediation and renewal review proof with billing\/credit remediation, endpoint\/model renewal, key rotation, provider terms review, accepted-risk owner, and next review date, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and provider failure containment plan is not generated/,
  /target Anthropic provider account is not approved, and target Anthropic provider account evidence for account ownership proof with Anthropic account owner, organization\/workspace alias, customer scope, evidence owner, and review date, billing and credit proof with active billing plan, available credit balance, payment owner, renewal path, low-balance alert route, and screenshot-free redacted evidence summary, API key and secret injection proof with target secret manager alias, ANTHROPIC_API_KEY owner, rotation path, access audit, break-glass owner, and redaction result, model access proof with ANTHROPIC_MODEL, model availability, region\/workspace access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript retention policy, support owner, and evidence owner, quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:anthropic, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date, migration plan, low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment/,
  /target local provider architecture is not approved, and target local provider architecture evidence for endpoint ownership proof with approved base URL alias, runtime owner, network boundary, transport, availability owner, and health check record, model pinning proof with LOCAL_PROVIDER_MODEL, model source\/version, compatibility profile, max token policy, fallback model, and owner approval, network isolation proof with host boundary, ingress policy, egress policy, tenant\/customer boundary, operator access policy, and firewall decision, secret and credential policy proof with auth mode, API key requirement, target secret manager alias when used, rotation path, redaction result, and access audit, runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence, quota and resource guard proof with CPU\/GPU\/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval, telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage\/resource metrics, alert route, and incident owner, fallback and customer approval proof with fallback provider, degraded mode, customer impact rule, manual approval path, provider terms\/local model license decision, and residual risk owner, migration plan, missing base URL, missing model, unavailable runtime, model mismatch, data residency gap, resource exhaustion, and fallback failure containment is not generated from a production-like environment/,
  /target Hermes provider architecture is not approved, and target Hermes provider architecture evidence for endpoint ownership proof with approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check record, model pinning proof with HERMES_PROVIDER_MODEL, model version\/source, compatibility profile, max token policy, fallback model, and owner approval, secret injection proof with target secret manager alias, API key requirement decision, rotation path, break-glass owner, access audit, and redaction result, tool-call parsing proof with Hermes <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence, quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review, telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, customer approval proof with provider terms, allowed workspace\/customer, data-processing approval, support owner, evidence owner, and next review date, migration plan, missing model, unavailable endpoint, malformed tool-call output, transcript retention gap, quota exhaustion, and fallback failure containment is not generated/,
  /hosted identity session architecture is not approved, and hosted identity\/session architecture evidence for customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before\/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated/,
  /target identity\/session operations evidence for customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before\/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated/,
  /hosted tenant isolation architecture is not approved, and hosted tenant isolation architecture evidence for tenant identity source proof with tenant source owner, customer organization mapping, lifecycle owner, trust policy, and source approval, tenant lifecycle proof with create, suspend, restore, delete, owner transfer, exception review, and orphan tenant review, tenant-aware authorization proof with policy, service-to-service tenant propagation, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema\/bucket\/keyspace boundary, and migration safety, per-tenant encryption and key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup\/restore isolation proof with tenant-scoped backup creation, restore authorization, integrity result, other-tenant non-interference, and post-restore denial, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and tenant admin owner, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability\/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, and support owner, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner, migration plan, rollback, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated/,
  /target tenant isolation operations evidence for tenant identity source proof with source owner, customer organization mapping, tenant lifecycle owner, trust policy, source approval, and orphan tenant review, tenant-scoped authorization proof with permission policy, service propagation, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema\/bucket\/keyspace boundary, and migration safety, per-tenant encryption\/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup\/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, tenant admin owner, and approval expiry, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability\/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated/,
  /target secret manager architecture is not approved, and target secret manager architecture evidence for approved platform proof with provider, region, tenancy boundary, owner, and fallback decision, secret class inventory proof with provider, environment, owner, rotation cadence, and allowed consumers, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy proof with reader, writer, admin, reviewer, service binding, and deny-by-default evidence, rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result, secret access audit log proof for read, write, rotate, revoke, break-glass, and failed access attempts, break-glass governance proof with approval, expiry, monitoring, customer notification, revocation, and post-use review, leakage review proof across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery proof for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated/,
  /target observability architecture is not approved, and target observability architecture evidence for approved telemetry backend, region, tenancy boundary, owner, fallback, and data residency, signal inventory for release, provider, mission, approval, runtime, security, support, and incident domains, ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events, alert routing with severity mapping, primary and secondary routes, retry policy, acknowledgement SLA, and delivery receipts, staffed on-call proof with rota, primary and backup owner, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain, log and trace retention with storage class, redaction policy, query role, customer export boundary, and deletion path, customer status communication, incident response, audit export, disaster recovery, migration plan, rollback, false-positive triage, alert fatigue, customer communication containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
  /target observability operations evidence for telemetry ingestion proof with metrics, logs, traces, audit events, provider events, release events, and support events, alert delivery proof with route, severity, delivery receipt, retry policy, acknowledgement SLA, and escalation evidence, trace\/log retention proof with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit, staffed on-call routing and acknowledgement proof with rota, primary and backup owner, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain, customer-facing status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence, incident response proof with timeline, mitigation owner, customer impact, review decision, corrective actions, due dates, and closure evidence, incident review history proof, audit export proof, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
  /secret and observability evidence with target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, target observability architecture approval, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log\/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, target observability operations evidence, target SLO architecture approval, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, target SLO operations evidence, incident review evidence, release artifact hygiene, and regenerated execution snapshot evidence/,
  /target SLO architecture is not approved, and target SLO\/SLA architecture evidence for customer-approved availability, latency, error rate, support response, maintenance window, exclusions, decision owner, error budget policy with measurement window, budget owner, burn-rate threshold, freeze rule, exception handling, review cadence, telemetry measurement proof for metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, retention period, alert acknowledgement proof with severity mapping, route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, audit record, staffed on-call proof with rota, primary and secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, customer communication proof, incident review proof, provider outage playbook proof, maintenance and degradation proof, service credit and contractual escalation proof, migration plan, rollback, communication misfire, false-positive alert, alert fatigue, missed-SLO containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
  /target SLO operations evidence for customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
  /target data lifecycle architecture is not approved, and target data lifecycle architecture evidence for customer-approved data class matrix with legal basis, owner, retention window, exportability, delete eligibility, and exception policy, target retention configuration with enforcement timestamp, storage boundary, policy owner, reviewer, and audit record, export request proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt, delete request proof with authorization, confirmation control, execution owner, storage scope, timestamp, and audit record, provider transcript policy proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure, post-delete absence evidence across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, backup architecture proof with schedule, encrypted storage, storage class, retention class, missed-run handling, owner acknowledgement, and access audit, restore validation proof with objective, duration, restored data class inventory, integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup key ownership proof with key owner, rotation cadence, revocation, break-glass, expiry\/delete evidence, and access audit, disaster recovery evidence with owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, migration plan, rollback, legal hold, delete conflict, provider transcript exception, and customer communication containment is not generated from a production-like environment/,
  /target retention operations evidence for customer-approved data class proof with class owner, legal basis, retention window, exportability, delete eligibility, and exception policy, target retention configuration proof with storage boundary, enforcement timestamp, policy owner, reviewer, and audit record, export approval proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt, delete workflow proof with authorization, confirmation control, execution owner, storage scope, timestamp, result, and audit record, provider transcript handling proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure, post-delete absence proof across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, audit history proof, release artifact hygiene result, and regenerated execution snapshot evidence, plus target backup operations evidence for backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement, encrypted backup storage proof with storage class, encryption mode, retention class, location alias, and access audit, backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry\/delete evidence, and access audit, restore validation proof with objective, duration, restored data class inventory, checksum or integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup expiry\/deletion proof with expiry schedule, delete proof, post-delete absence check, and audit record, disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail, release artifact hygiene result, and regenerated execution snapshot evidence is not generated/,
  /production SLO\/SLA operating evidence for incident\/SLO policy replay, target SLO architecture and operations gates, observability telemetry and target observability operations, support escalation and target support operations, release artifact hygiene, runtime lifecycle, runtime isolation, staffed incident ownership, customer-approved SLO\/SLA terms, and provider\/deployment evidence is not generated from a production-like environment/,
  /target support architecture is not approved, and target support architecture evidence for staffing model, support queue platform, severity routing, customer communication boundary, ticket audit and retention, on-call handoff, incident commander ownership, escalation and backup coverage, support data handling, incident review governance, migration plan, and missed-acknowledgement, queue-misrouting, customer-communication, ticket-audit, and unstaffed-escalation containment is not generated/,
  /target support operations evidence for staffed support coverage proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, absence handling, and acknowledgement evidence, support queue routing proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, access policy, assignment audit, and escalation evidence, customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, message reference, and closure message, ticket audit history proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, evidence owner, and closure audit, escalation ownership proof with incident commander, engineering escalation, provider escalation, executive\/customer escalation, backup owner, retry history, failure fallback, and audit record, incident review cadence proof with review cadence, timeline, mitigation owner, customer impact summary, corrective action owner, due date, review decision, closure evidence, and evidence retention, on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, and escalation chain, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence is not generated/,
  /target clean deployment architecture is not approved, and target clean deployment architecture evidence for source provenance proof with branch, commit, review owner, build actor, release tag, and tamper-control decision, artifact registry proof with immutable artifact id, sha256, registry path, retention policy, access owner, and promotion rule, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, and bootstrap owner, secret injection proof with target secret manager alias, injection path, rotation state, redaction check, break-glass owner, and access audit, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration and data readiness proof with migration command, seed\/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, migration plan, dependency drift, failed bootstrap, failed secret injection, rollback failure, and misleading release approval containment is not generated from a production-like environment/,
  /target clean deployment operations evidence for source provenance proof with approved branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval, artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull\/download proof, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner, secret injection proof with target secret manager alias, injection path, rotation state, redaction check, break-glass owner, and access audit, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration and data readiness proof with migration command, seed\/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and failed-deployment containment plan is not generated from a production-like environment/,
  /clean deployment release evidence for clean checkout proof with source branch, source commit, tracked-file mode, file count, excluded runtime state, and clean checkout owner, command replay proof with incident\/SLO, identity\/session, tenant, support, secret, observability, SLO, data lifecycle, clean deployment architecture and operations, retention, backup, provider, target deployment contract, artifact hygiene, runtime lifecycle, runtime isolation, pilot export, and package validation results, artifact synchronization proof with source commit, execution snapshot, clean deployment release artifact, production-like drill, pilot export package, release artifact hygiene, and artifact-sync-current status, production-like environment proof with approved target boundary, runtime bootstrap, secret injection, dependency install, environment boundary, rollback point, release approval, operator, and timestamp, and failure containment for stale checkout, dependency drift, local runtime leakage, missing artifact, failed smoke, failed hygiene, failed rollback, and misleading production-ready claim is not generated from a production-like environment/,
]) {
  assert.match(drill, blocker);
}

assert.doesNotMatch(
  drill,
  new RegExp('Anthropic and Hermes live validations are not complete'),
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target OpenAI provider account is not approved and OpenAI target-boundary live ' +
      'validation evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target provider operations evidence for provider inventory/account approval, target secret injection, ' +
      'target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, ' +
      'fallback/disable path, provider fallback runtime audit, telemetry, incident triage, ' +
      'data/transcript handling, remediation/renewal, evidence retention, and provider failure ' +
      'containment is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'hosted identity session architecture is not approved and target identity/session ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  /hosted identity session architecture is not approved, and hosted identity\/session architecture evidence for customer IdP onboarding, metadata ownership, issuer\/audience policy, JWKS rotation, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance and retention, rollback and lockout recovery, and customer access containment is not generated/,
);
assert.doesNotMatch(
  drill,
  /target identity\/session operations evidence for customer IdP onboarding, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance, retention, and customer access containment is not generated/,
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target Anthropic provider account is not approved and Anthropic live validation ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target local provider architecture is not approved, and approved target-boundary ' +
      'endpoint/model, network isolation, telemetry, quota/resource guard, and local provider ' +
      'live validation evidence are not generated',
  ),
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target Hermes provider architecture is not approved, and endpoint ownership, model pinning, ' +
      'target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, ' +
      'telemetry, fallback, customer approval, and Hermes live validation evidence are not generated',
  ),
);
assert.doesNotMatch(drill, new RegExp('target deployment contract is not satisfied by target-environment evidence'));
assert.doesNotMatch(
  drill,
  new RegExp(
    'hosted tenant isolation architecture is not approved and target tenant ' +
      'isolation evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  /hosted tenant isolation architecture evidence for tenant identity source, customer organization mapping, tenant-aware authorization, service-to-service tenant propagation, storage partitioning, per-tenant encryption and key ownership, backup and restore isolation, tenant administration, cross-tenant denial across API, storage, search, export, delete, backup, support, and observability/,
);
assert.doesNotMatch(
  drill,
  /target tenant isolation operations evidence for tenant identity source, tenant-scoped authorization, storage partitioning, per-tenant encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant data containment is not generated/,
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target secret manager architecture is not approved and target secret manager ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  /target secret manager architecture evidence for approved platform, region, tenancy boundary, owner and fallback decision, secret class inventory, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy, service binding, deny-by-default rules, rotation and revocation event proof, secret access audit logs, break-glass approval and post-use review, leakage review across logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery, migration plan, rollback, lockout recovery, and credential containment/,
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target observability architecture is not approved and target observability ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  /target observability operations evidence for telemetry ingestion, alert delivery, trace\/log retention, staffed on-call routing and acknowledgement, customer-facing status communication, incident response, and incident review history is not generated/,
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target SLO architecture is not approved and target SLO/SLA ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target retention, export, delete, provider transcript handling, target backup, ' +
      'and post-delete absence evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  /target retention operations evidence for customer-approved data classes, target retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, and audit history, plus target backup operations evidence for backup schedule execution, encrypted backup storage, key ownership, restore validation, tenant isolation, backup expiry\/deletion, disaster recovery runbook, and audit trail is not generated/,
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target data lifecycle architecture is not approved and target data lifecycle ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target clean deployment architecture is not approved, and target clean deployment ' +
      'evidence for source provenance, artifact registry, dependency installation',
  ),
);
assert.doesNotMatch(
  drill,
  /target clean deployment operations evidence for source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration\/data readiness, smoke\/health verification, rollback\/recovery, release approval, evidence retention, and failed-deployment containment is not generated/,
);
assert.doesNotMatch(
  drill,
  new RegExp('production SLO/SLA operating evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  drill,
  new RegExp('clean deployment release evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  drill,
  new RegExp(
    'target support architecture is not approved and target support ' +
      'evidence is not generated',
  ),
);

assert.match(releaseReadiness, /\[production-like-release-drill-v1\.md\]\(production-like-release-drill-v1\.md\)/);
assert.match(releaseReadiness, /local deterministic production-like release drill: passed/);
assert.match(deployment, /## Production-Like Release Drill/);
assert.match(deployment, /npm run drill:production-like-release/);
assert.match(deployment, /npm run smoke:production-like-release-drill/);
assert.match(readme, /npm run drill:production-like-release/);
assert.match(readme, /productionReadyClaim: false/);

console.log(
  JSON.stringify(
    {
      artifactSyncCommit: verifiedCommit !== currentCommit,
      commandCount: 45,
      mode: 'production-like-release-drill',
      ok: true,
      path: 'docs/production-like-release-drill-v1.md',
      verifiedCommit,
    },
    null,
    2,
  ),
);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertArtifactCommitFresh({ artifactCommit, currentCommit, label }) {
  assert.match(artifactCommit, /^[a-f0-9]{40}$/i, `${label}: invalid artifact commit`);
  assert.match(currentCommit, /^[a-f0-9]{40}$/i, `${label}: invalid current commit`);
  if (artifactCommit === currentCommit) {
    return;
  }

  const changedPaths = runGit(['diff', '--name-only', `${artifactCommit}..${currentCommit}`])
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  assert.equal(changedPaths.length > 0, true, `${label}: no changed paths between artifact and current commit`);
  assert.equal(
    changedPaths.every(isReleaseArtifactSyncPath),
    true,
    JSON.stringify({ artifactCommit, changedPaths, currentCommit, label }, null, 2),
  );
}

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function isReleaseArtifactSyncPath(filePath) {
  const relativePath = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return [
    'docs/clean-deployment-release-v1.md',
    'docs/execution-v1-closeout.md',
    'docs/execution-v1-evidence.md',
    'docs/execution-v1-handoff.md',
    'docs/pilot-export-package-v1.md',
    'docs/production-enterprise-controls-v1.md',
    'docs/production-like-release-drill-v1.md',
    'docs/production-provider-readiness-v1.md',
    'docs/production-retention-operating-v1.md',
    'docs/production-slo-operating-v1.md',
    'docs/release-readiness-v1.md',
  ].includes(relativePath) || relativePath.startsWith('docs/releases/execution-v1/');
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
