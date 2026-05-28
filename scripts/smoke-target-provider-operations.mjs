import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetProviderOperationsPath = path.join(docsDir, 'target-provider-operations-v1.md');
const targetProviderEvidenceIntakePath = path.join(docsDir, 'target-provider-evidence-intake-v1.md');
const productionProviderReadinessPath = path.join(docsDir, 'production-provider-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const targetEnvironmentPath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetProviderOperations = readRequiredFile(targetProviderOperationsPath);
const targetProviderEvidenceIntake = readRequiredFile(targetProviderEvidenceIntakePath);
const productionProviderReadiness = readRequiredFile(productionProviderReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const targetEnvironment = readRequiredFile(targetEnvironmentPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-provider-operations'], 'node scripts/smoke-target-provider-operations.mjs');
assert.equal(packageJson.scripts['smoke:provider-fallback-policy'], 'node scripts/smoke-provider-fallback-policy.mjs');
assert.equal(packageJson.scripts['smoke:provider-events'], 'node scripts/smoke-provider-events.mjs');
assert.equal(packageJson.scripts['smoke:provider-attention-remediation'], 'node scripts/smoke-provider-attention-remediation.mjs');
assert.equal(packageJson.scripts['smoke:mission-timeline'], 'node scripts/smoke-mission-timeline.mjs');
assert.equal(packageJson.scripts['smoke:workspace-timeline'], 'node scripts/smoke-workspace-timeline.mjs');
assert.equal(packageJson.scripts['smoke:operator-timeline'], 'node scripts/smoke-operator-timeline.mjs');

assert.match(targetProviderOperations, /^# Target Provider Operations v1$/m);
assert.match(targetProviderOperations, /^- status: local-target-provider-operations-current$/m);
assert.match(targetProviderOperations, /^- productionReadyClaim: false$/m);
assert.match(targetProviderOperations, /not provider account approval/);
assert.match(targetProviderOperations, /not target-boundary live validation proof/);
assert.match(targetProviderOperations, /not billing or quota proof/);
assert.match(targetProviderOperations, /not runtime endpoint approval/);
assert.match(targetProviderOperations, /not production traffic proof/);
assert.match(targetProviderOperations, /not permission to claim `production-ready`/);
assert.match(targetProviderOperations, /Target provider operations remain blocked for production-ready claims/);
assert.match(
  targetProviderOperations,
  /Production-ready remains blocked until the approved target environment proves provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, provider telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, and evidence retention proof/,
);
assert.doesNotMatch(
  targetProviderOperations,
  /model\/endpoint pinning|quota\/cost\/resource guard|fallback\/disable path|data\/transcript handling|remediation\/renewal/,
);
assert.doesNotMatch(
  targetProviderOperations,
  /billing\/credit\/quota state|billing\/credit remediation|endpoint\/model renewal|regenerated release artifacts/,
);

for (const heading of [
  '## Decision Boundary',
  '## Provider Operation Controls',
  '## Provider Operations Evidence Packet',
  '## Target Evidence Capture Template',
  '## Release Blocker Closure Linkage',
  '## Provider Operation Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetProviderOperations, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Provider account approval',
  'Target secret injection',
  'Target-boundary live validation',
  'Model and endpoint pinning',
  'Quota, cost, and resource guard',
  'Fallback and disable path',
  'Provider fallback runtime audit',
  'Provider telemetry',
  'Provider incident triage',
  'Data and transcript handling',
  'Remediation and renewal review',
]) {
  assert.match(targetProviderOperations, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const packetItem of [
  /completed target provider operations evidence capture template for every provider included in the target provider claim/,
  /provider inventory with OpenAI, Anthropic, local, and Hermes inclusion state, owner, customer\/workspace approval, account or architecture record, and operating decision/,
  /provider account approval proof with account owner proof, customer or workspace approval proof, billing and credit or quota state proof, provider terms proof, model access proof, and renewal owner proof for each included provider/,
  /target secret injection proof with approved secret manager platform proof, secret owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, credential containment proof, and artifact hygiene result/,
  /target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, and operator owner/,
  /model and endpoint pinning proof with model id, endpoint\/base URL alias, retry policy, concurrency limit, fallback route, and approval owner/,
  /quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route/,
  /fallback and disable proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision/,
  /provider fallback runtime audit proof with `mission run --fallback-provider --fallback-policy`, `mission timeline`, `workspace timeline`, `overview operator-timeline`, `provider events --family fallback`, and `action remediate-provider-attention --fallback-provider --fallback-policy` evidence/,
  /target blocker closure verification proof from \[target-environment-evidence-intake-v1\.md\]\(target-environment-evidence-intake-v1\.md\) with provider blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, regenerated execution snapshot evidence, and refreshed release artifact references for every included provider/,
  /provider telemetry proof with health signal, latency\/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner/,
  /provider incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes/,
  /data and transcript handling proof with data classification, provider transcript policy, retention class, export\/delete handling, redaction rule, and post-delete absence requirement/,
  /remediation and renewal review proof with billing and credit remediation proof, endpoint renewal proof, model access renewal proof, key rotation proof, provider terms review proof, accepted-risk owner proof, and next review date proof/,
  /artifact hygiene and production readiness gate result/,
  /residual risk, decision owner, next review date, and provider failure containment plan/,
]) {
  assert.match(targetProviderOperations, packetItem);
}

assert.match(targetProviderOperations, /## Target Evidence Capture Template/);
assert.match(
  targetProviderOperations,
  /Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, customer personal data, tenant payloads, private account identifiers, or machine-local absolute paths/,
);
for (const field of [
  'targetProviderOperationName',
  'providerInventoryDecision',
  'accountApprovalEvidence',
  'secretInjectionEvidence',
  'liveValidationEvidence',
  'modelEndpointPinning',
  'quotaCostResourceGuard',
  'fallbackDisableDecision',
  'fallbackRuntimeAuditEvidence',
  'blockerClosureVerificationEvidence',
  'telemetryIncidentEvidence',
  'dataTranscriptHandling',
  'remediationRenewalEvidence',
  'productionReadyClaimDecision',
]) {
  assert.match(targetProviderOperations, new RegExp(`\\| ${escapeRegExp(field)} \\|`), field);
}
assert.match(
  targetProviderOperations,
  /must document the customer-approved behavior for provider outage, quota exhaustion, non-provider failure, and non-recoverable provider failure/,
);
assert.match(
  targetProviderOperations,
  /must prove provider-failure-only failover and recoverable-provider-failure-only stop conditions are archived from the target boundary/,
);
assert.match(
  targetProviderOperations,
  /must prove provider blocker closure is tied to target-boundary command evidence and cannot bypass `productionReadyClaim: false` while any stop-condition remains/,
);
assert.match(
  targetProviderOperations,
  /target provider evidence intake, provider-specific account or architecture approvals, target secret manager evidence, target observability operations, provider fallback policy, provider events, provider attention remediation, mission timeline, operator timeline, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence/,
);
assert.match(targetProviderOperations, /## Release Blocker Closure Linkage/);
assert.match(
  targetProviderOperations,
  /\| Provider \| Provider-Specific Blocker \| Shared Operations Blocker \| Stop Reason \| Shared Commands \| Linked Commands \| Linked Evidence Docs \| Linked Proofs \| Production Claim \|/,
);
for (const [provider, providerBlocker, evidenceDocCount] of [
  ['openai', 'target-openai-provider-account-remains-blocked-until-target-open', 5],
  ['anthropic', 'anthropic-live-validation-remains-blocked-until-target-anthropic', 6],
  ['local', 'target-local-provider-architecture-remains-blocked-until-endpoin', 5],
  ['hermes', 'hermes-live-validation-is-blocked-until-target-hermes-provider-a', 5],
]) {
  assert.match(
    targetProviderOperations,
    new RegExp(
      `\\| ${provider} \\| ${escapeRegExp(providerBlocker)} \\| target-provider-operations-evidence-remains-blocked-until-comple \\| target provider operations lacks accepted same-boundary runtime audit and blocker closure verification evidence \\| 9 \\| 12 \\| ${evidenceDocCount} \\| 14 \\| blocked \\|`,
    ),
    provider,
  );
}
assert.match(
  targetProviderOperations,
  /Every provider row must close the provider-specific blocker and the shared `provider-operations` blocker from the same approved target boundary/,
);
assert.match(
  targetProviderOperations,
  /The shared operations blocker cannot be closed globally by one provider packet/,
);
assert.match(
  targetProviderOperations,
  /provider operations packet, fallback runtime audit, target blocker closure verification proof, release artifact hygiene result, and regenerated execution-v1 snapshot evidence/,
);
assert.match(
  targetProviderOperations,
  /The shared provider operations closure command set is `npm run smoke:target-provider-operations`, `npm run smoke:target-provider-evidence-intake`, `npm run smoke:provider-fallback-policy`, `npm run smoke:provider-events`, `npm run smoke:provider-attention-remediation`, `npm run smoke:mission-timeline`, `npm run smoke:workspace-timeline`, `npm run smoke:operator-timeline`, and `npm run smoke:release-artifact-hygiene`/,
);
assert.match(
  targetProviderOperations,
  /provider-specific account or architecture gate, target-boundary live validation command, production provider readiness smoke, and any provider-specific evidence docs required by the current blocker/,
);
assert.match(
  targetProviderOperations,
  /Keep `productionReadyClaim: false` until every linked closure verification records same-boundary provider account or architecture proof, target secret injection proof, target-boundary live validation proof, provider fallback policy and stop reason proof, provider failure containment proof, release artifact hygiene pass proof, and regenerated execution-v1 artifact snapshot proof/,
);
assert.doesNotMatch(targetProviderOperations, /target secret injection proof with secret manager alias/);
assert.doesNotMatch(targetProviderOperations, /secretInjectionEvidence \| target secret manager alias/);
assert.match(targetProviderOperations, /target environment evidence intake, blocker closure verification matrix, production readiness gate, and artifact hygiene/);
assert.match(targetEnvironment, /## Blocker Closure Verification Matrix/);
assert.match(targetEnvironment, /anthropic-live-validation-missing-or-failed/);
assert.match(targetEnvironment, /target-hermes-provider-approval-missing/);
assert.match(targetEnvironment, /target-local-provider-approval-missing/);

for (const command of [
  'npm run smoke:target-provider-operations',
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:provider-fallback-policy',
  'npm run smoke:provider-events',
  'npm run smoke:provider-attention-remediation',
  'npm run smoke:mission-timeline',
  'npm run smoke:workspace-timeline',
  'npm run smoke:operator-timeline',
  'npm run rehearsal:production-provider-readiness',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:target-secret-manager',
  'npm run smoke:target-observability-operations',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(targetProviderOperations, new RegExp(escapeRegExp(command)));
}

assert.match(targetProviderEvidenceIntake, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(
  targetProviderEvidenceIntake,
  /target provider operations evidence remains the runtime operations gate for model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment/i,
);
assert.match(productionProviderReadiness, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(productionProviderReadiness, /target provider operations contract remains the gate/);
assert.match(targetContract, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(targetContract, /target provider operations evidence is captured/);
assert.match(targetEnvironment, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(
  targetEnvironment,
  /target provider operations evidence for account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment/,
);
assert.match(releaseReadiness, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(
  releaseReadiness,
  /target provider operations gate: passed, with provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, target blocker closure verification matrix proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment requirements, and `productionReadyClaim: false`/,
);
assert.match(
  releaseReadiness,
  /target provider operations evidence contract for account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment/,
);
assert.match(
  releaseReadiness,
  /target provider operations evidence for completed per-provider operations capture template, branch and commit, release label and deployment boundary, provider inventory proof with OpenAI, Anthropic, local, and Hermes inclusion state, owner, customer\/workspace approval, account or architecture record, and operating decision, provider account approval proof with account owner proof, customer or workspace approval proof, billing and credit or quota state proof, provider terms proof, model access proof, and renewal owner proof, target secret injection proof with approved secret manager platform proof, secret owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, credential containment proof, and artifact hygiene result, target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, and operator owner, model and endpoint pinning proof with model id, endpoint\/base URL alias, retry policy, concurrency limit, fallback route, and approval owner, quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route, fallback and disable proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop conditions, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof with provider blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, regenerated execution snapshot evidence, and refreshed release artifact references, provider telemetry proof with health signal, latency\/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner, provider incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes, data and transcript handling proof with data classification, provider transcript policy, retention class, export\/delete handling, redaction rule, and post-delete absence requirement, remediation and renewal review proof with billing and credit remediation proof, endpoint renewal proof, model access renewal proof, key rotation proof, provider terms review proof, accepted-risk owner proof, and next review date proof, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and provider failure containment plan is not generated from a production-like environment/,
);
assert.match(
  releaseReadiness,
  /target provider operations evidence remains blocked until completed per-provider operations capture template, branch and commit, release label and deployment boundary, provider inventory proof with OpenAI, Anthropic, local, and Hermes inclusion state, owner, customer\/workspace approval, account or architecture record, and operating decision, provider account approval proof with account owner proof, customer or workspace approval proof, billing and credit or quota state proof, provider terms proof, model access proof, and renewal owner proof, target secret injection proof with approved secret manager platform proof, secret owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, credential containment proof, and artifact hygiene result, target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, and operator owner, model and endpoint pinning proof with model id, endpoint\/base URL alias, retry policy, concurrency limit, fallback route, and approval owner, quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route, fallback and disable proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop conditions, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof with provider blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, regenerated execution snapshot evidence, and refreshed release artifact references, provider telemetry proof with health signal, latency\/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner, provider incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes, data and transcript handling proof with data classification, provider transcript policy, retention class, export\/delete handling, redaction rule, and post-delete absence requirement, remediation and renewal review proof with billing and credit remediation proof, endpoint renewal proof, model access renewal proof, key rotation proof, provider terms review proof, accepted-risk owner proof, and next review date proof, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and provider failure containment plan are recorded from the approved target boundary/,
);
assert.doesNotMatch(
  releaseReadiness,
  /provider account approval proof with billing\/credit\/quota state|remediation and renewal review proof with billing\/credit remediation, endpoint\/model renewal|regenerated release artifacts/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'target provider operations evidence for provider inventory/account approval, target secret injection, ' +
      'target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, ' +
      'fallback/disable path, provider fallback runtime audit, telemetry, incident triage, ' +
      'data/transcript handling, remediation/renewal, evidence retention, and provider failure ' +
      'containment is not generated from a production-like environment',
  ),
);
assert.match(security, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(deployment, /## Target Provider Operations/);
assert.match(deployment, /npm run smoke:target-provider-operations/);
assert.match(productPlan, /\[x\] Target provider operations gate implemented/);
assert.match(readme, /docs\/target-provider-operations-v1\.md/);
assert.match(readme, /npm run smoke:target-provider-operations/);
assert.match(
  readme,
  /local target provider operations can be verified with `npm run smoke:target-provider-operations`; it proves provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, and evidence retention proof requirements are present/,
);

console.log(
  JSON.stringify(
    {
      controlCount: 11,
      mode: 'target-provider-operations',
      ok: true,
      path: 'docs/target-provider-operations-v1.md',
      productionReadyClaim: false,
      providerPacketItemCount: 18,
      requiredCommandCount: 20,
      targetCaptureTemplate: true,
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

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
