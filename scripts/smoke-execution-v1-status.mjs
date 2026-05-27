import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  referenceAdoptionSmokeScriptCount,
  requiredReferenceAdoptionSmokeScripts,
} from './reference-adoption-scripts.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const requestedPort = await getFreePort();
const serverOutput = { stderr: '', stdout: '' };

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(requestedPort),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (chunk) => {
  serverOutput.stdout += String(chunk);
});

serverProcess.stderr.on('data', (chunk) => {
  serverOutput.stderr += String(chunk);
});

try {
  const baseUrl = await waitForServer(serverProcess);
  const status = await fetchJson(`${baseUrl}/api/execution-v1/status`);
  const isArtifactSyncCommit = status.artifactSyncCommit?.detected === true;
  const verifiedCommit = isArtifactSyncCommit ? status.artifactSyncCommit.verifiedCommit : status.currentCommit;

  assert.equal(status.artifactsMatchCurrentHead, true);
  assert.match(status.artifactState, /^(current|committed-current|local-current|artifact-sync-current)$/);
  assert.equal(status.commit, verifiedCommit);
  if (isArtifactSyncCommit) {
    assert.notEqual(status.currentCommit, verifiedCommit);
    assert.equal(status.artifactSyncCommit.currentCommit, status.currentCommit);
    assert.equal(status.artifactSyncCommit.changedPaths.length > 0, true);
    assert.equal(
      status.artifactSyncCommit.changedPaths.every((filePath) => isReleaseArtifactSyncPath(filePath)),
      true,
      JSON.stringify(status.artifactSyncCommit),
    );
    assert.equal(status.stale, false);
    assert.deepEqual(status.staleReasons, []);
    assert.equal(status.snapshotEligibility.allowed, false);
    assert.match(status.snapshotEligibility.reason, /artifact sync|release artifact sync/i);
    assert.equal(
      status.recommendedActions.some((entry) => entry.action === 'archive-release-snapshot'),
      false,
      JSON.stringify(status.recommendedActions),
    );
  } else {
    assert.equal(status.currentCommit, verifiedCommit);
  }
  assert.equal(typeof status.evidence?.generatedAt, 'string');
  assert.equal(typeof status.closeout?.generatedAt, 'string');
  assert.equal(typeof status.handoff?.generatedAt, 'string');
  assert.equal(status.handoff?.commit, verifiedCommit);
  assert.equal(status.summary.handoffReady, true);
  assert.equal(
    status.refreshPlan.affectsPaths.some((item) => String(item || '').endsWith('docs/execution-v1-handoff.md')),
    true,
    JSON.stringify(status.refreshPlan),
  );

  assert.equal(status.summary.coreDeterministicPassed, 4);
  assert.equal(status.summary.coreDeterministicTotal, 4);
  assert.equal(status.summary.deterministicPassed, 8);
  assert.equal(status.summary.deterministicTotal, 8);
  assert.equal(status.summary.deterministicRuntimeTotal, 8);
  assert.equal(status.summary.referenceAdoptionPassed, 1);
  assert.equal(status.summary.referenceAdoptionTotal, 1);
  assert.equal(status.summary.referenceAdoptionReady, true);
  assert.equal(status.summary.referenceAdoptionAggregateScriptCount, referenceAdoptionSmokeScriptCount);
  assert.equal(status.summary.baselineReferenceAdoptionAggregateScriptCount, referenceAdoptionSmokeScriptCount);
  assert.equal(status.summary.executionV1HelperPassed, 1);
  assert.equal(status.summary.executionV1HelperTotal, 1);
  assert.equal(status.summary.executionV1HelperReady, true);
  assert.equal(status.summary.productionReadinessGatePassed, 1);
  assert.equal(status.summary.productionReadinessGateTotal, 1);
  assert.equal(status.summary.productionReadinessGateReady, true);
  assert.equal(status.summary.productionReadyStatus, 'blocked');
  assert.equal(status.summary.productionReadyBlocked, true);
  assert.equal(status.summary.productionBlockerCount, 24);
  assert.equal(status.summary.currentOpenBlockerCount, 7);
  assert.equal(status.summary.currentOpenBlockerActionCount, 7);
  assert.equal(status.releaseReadiness?.productionReadyClaimAllowed, false);
  assert.equal(status.releaseReadiness?.productionBlockerCount, 24);
  assert.equal(status.releaseReadiness?.currentOpenBlockerCount, 7);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionCount, 7);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.actionCount, 7);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.commandCount, 29);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.evidenceDocCount, 22);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.closureVerificationCount, 7);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.closureVerificationCommandCount, 29);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.closureVerificationEvidenceDocCount, 22);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.closureVerificationTargetBoundaryCount, 7);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.closureVerificationProductionReadyBlockedCount, 7);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.runtimeAuditCommandCount, 6);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.categoryCounts?.['provider-account'], 2);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.categoryCounts?.['provider-architecture'], 2);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.categoryCounts?.['provider-operations'], 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.categoryCounts?.['target-deployment'], 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.categoryCounts?.['release-decision'], 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.commandKindCounts?.verification, 15);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.commandKindCounts?.['runtime-audit'], 6);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.commandKindCounts?.['live-validation'], 4);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.commandKindCounts?.preflight, 3);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.commandKindCounts?.rehearsal, 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.ownerCounts?.['provider-ops'], 5);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.ownerCounts?.['deployment-owner'], 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.ownerCounts?.['release-owner'], 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.providerActionCount, 4);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.providerCounts?.openai, 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.providerCounts?.anthropic, 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.providerCounts?.local, 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.providerCounts?.hermes, 1);
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.topPriorityCategory, 'provider-account');
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.topPriorityOwner, 'provider-ops');
  assert.equal(status.releaseReadiness?.currentOpenBlockerActionSummary?.topPriorityProvider, 'anthropic');
  assert.match(
    status.releaseReadiness?.currentOpenBlockerActionSummary?.topPriorityBlocker || '',
    /Anthropic live validation remains blocked until target Anthropic provider account evidence/,
  );
  assert.match(
    status.releaseReadiness?.currentOpenBlockerActionSummary?.topPriorityNextEvidence || '',
    /active billing plan proof, available credit balance proof, API key and secret injection proof/,
  );
  assert.match(
    status.releaseReadiness?.currentOpenBlockerActionSummary?.topPriorityStopReason || '',
    /active billing plan proof, available credit balance proof/,
  );
  assert.equal(
    status.releaseReadiness.productionBlockers.some((item) =>
      item.includes('provider live validation completion evidence for Anthropic and Hermes is incomplete'),
    ),
    true,
    JSON.stringify(status.releaseReadiness),
  );
  assert.equal(
    status.releaseReadiness.productionBlockers.some((item) =>
      item.includes('Anthropic and Hermes live validations are not complete'),
    ),
    false,
    JSON.stringify(status.releaseReadiness),
  );
  assert.equal(
    status.releaseReadiness.currentOpenBlockers.some((item) =>
      item.includes('Anthropic live validation remains blocked until target Anthropic provider account evidence'),
    ),
    true,
    JSON.stringify(status.releaseReadiness),
  );
  assert.equal(
    status.releaseReadiness.currentOpenBlockers.some((item) =>
      item.includes('target OpenAI provider account remains blocked until target OpenAI provider account evidence'),
    ),
    true,
    JSON.stringify(status.releaseReadiness),
  );
  assert.equal(
    status.releaseReadiness.currentOpenBlockers.some((item) =>
      item.includes('target provider operations evidence remains blocked until completed per-provider operations capture template'),
    ),
    true,
    JSON.stringify(status.releaseReadiness),
  );
  assert.equal(
    status.releaseReadiness.currentOpenBlockers.some((item) =>
      item.includes('Anthropic live validation is blocked by provider account billing/credit'),
    ),
    false,
    JSON.stringify(status.releaseReadiness),
  );
  assert.equal(
    status.releaseReadiness.currentOpenBlockers.some((item) =>
      item.includes('production release label cannot be expanded until target provider evidence intake'),
    ),
    true,
    JSON.stringify(status.releaseReadiness),
  );
  assert.equal(
    status.releaseReadiness.currentOpenBlockers.some((item) =>
      item.includes('production release label cannot be claimed until all target production providers'),
    ),
    false,
    JSON.stringify(status.releaseReadiness),
  );
  for (const action of status.releaseReadiness.currentOpenBlockerActions) {
    assertCurrentOpenBlockerClosureVerification(action);
  }
  const anthropicBlockerAction = status.releaseReadiness.currentOpenBlockerActions.find(
    (item) =>
      item.category === 'provider-account' &&
      item.owner === 'provider-ops' &&
      item.commands.some((command) => command.command === 'npm run preflight:execution-v1:anthropic'),
  );
  assert.equal(Boolean(anthropicBlockerAction), true, JSON.stringify(status.releaseReadiness.currentOpenBlockerActions));
  assert.equal(anthropicBlockerAction.provider, 'anthropic', JSON.stringify(anthropicBlockerAction));
  assert.equal(anthropicBlockerAction.closureVerification.provider, 'anthropic');
  assert.equal(anthropicBlockerAction.closureVerification.category, 'provider-account');
  assert.equal(
    anthropicBlockerAction.closureVerification.requiredProofs.includes('provider account or billing/quota approval proof'),
    true,
    JSON.stringify(anthropicBlockerAction.closureVerification),
  );
  assert.equal(
    anthropicBlockerAction.closureVerification.requiredProofs.includes('target-boundary provider live validation proof'),
    true,
    JSON.stringify(anthropicBlockerAction.closureVerification),
  );
  assert.match(
    anthropicBlockerAction.nextEvidence,
    /account ownership proof, billing and credit remediation proof, active billing plan proof, available credit balance proof/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.match(
    anthropicBlockerAction.nextEvidence,
    /ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.match(
    anthropicBlockerAction.nextEvidence,
    /mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.match(
    anthropicBlockerAction.stopReason,
    /account ownership proof, billing and credit remediation proof, active billing plan proof, available credit balance proof/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.match(
    anthropicBlockerAction.stopReason,
    /provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation pass/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.match(
    anthropicBlockerAction.stopReason,
    /mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot proof/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.doesNotMatch(
    anthropicBlockerAction.nextEvidence,
    /provider terms\/customer approval, quota\/spend guard/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.doesNotMatch(
    anthropicBlockerAction.stopReason,
    /target provider account evidence, target secret injection, model access/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.doesNotMatch(
    anthropicBlockerAction.nextEvidence,
    /account ownership, billing and credit remediation, active billing plan, available credit balance/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.doesNotMatch(
    anthropicBlockerAction.nextEvidence,
    /ANTHROPIC_MODEL access, provider terms and customer approval, quota and spend guard/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.doesNotMatch(
    anthropicBlockerAction.nextEvidence,
    /mission and execution session provenance, telemetry, fallback and stop-condition decision, remediation audit/,
    JSON.stringify(anthropicBlockerAction),
  );
  assert.doesNotMatch(
    anthropicBlockerAction.stopReason,
    /provider terms\/customer approval proof, quota\/spend guard proof/,
    JSON.stringify(anthropicBlockerAction),
  );
  const anthropicEvidenceDoc = anthropicBlockerAction.evidenceDocs.find(
    (doc) => doc.path === 'docs/target-anthropic-provider-account-v1.md',
  );
  assert.equal(Boolean(anthropicEvidenceDoc), true, JSON.stringify(anthropicBlockerAction));
  assert.equal(anthropicEvidenceDoc.exists, true, JSON.stringify(anthropicEvidenceDoc));
  assert.equal(
    anthropicEvidenceDoc.href,
    '/api/execution-v1/release-doc?path=docs%2Ftarget-anthropic-provider-account-v1.md',
    JSON.stringify(anthropicEvidenceDoc),
  );
  const anthropicEvidenceResponse = await fetch(`${baseUrl}${anthropicEvidenceDoc.href}`);
  assert.equal(anthropicEvidenceResponse.status, 200);
  assert.match(anthropicEvidenceResponse.headers.get('content-type') || '', /^text\/markdown/);
  assert.match(await anthropicEvidenceResponse.text(), /Target Anthropic Provider Account/i);
  const openaiBlockerAction = status.releaseReadiness.currentOpenBlockerActions.find(
    (item) =>
      item.provider === 'openai' &&
      item.category === 'provider-account' &&
      item.commands.some((command) => command.command === 'npm run smoke:target-openai-provider-account'),
  );
  assert.equal(Boolean(openaiBlockerAction), true, JSON.stringify(status.releaseReadiness.currentOpenBlockerActions));
  assert.match(
    openaiBlockerAction.nextEvidence,
    /Target OpenAI provider account evidence for account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof/,
    JSON.stringify(openaiBlockerAction),
  );
  assert.match(
    openaiBlockerAction.nextEvidence,
    /provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
    JSON.stringify(openaiBlockerAction),
  );
  assert.match(
    openaiBlockerAction.stopReason,
    /Target OpenAI provider account lacks account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof/,
    JSON.stringify(openaiBlockerAction),
  );
  assert.match(
    openaiBlockerAction.stopReason,
    /provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot proof/,
    JSON.stringify(openaiBlockerAction),
  );
  assert.equal(
    openaiBlockerAction.commands.some(
      (command) =>
        command.kind === 'live-validation' &&
        command.command === 'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai',
    ),
    true,
    JSON.stringify(openaiBlockerAction.commands),
  );
  const openaiEvidenceDoc = openaiBlockerAction.evidenceDocs.find(
    (doc) => doc.path === 'docs/target-openai-provider-account-v1.md',
  );
  assert.equal(Boolean(openaiEvidenceDoc), true, JSON.stringify(openaiBlockerAction));
  assert.equal(openaiEvidenceDoc.exists, true, JSON.stringify(openaiEvidenceDoc));
  assert.equal(
    openaiEvidenceDoc.href,
    '/api/execution-v1/release-doc?path=docs%2Ftarget-openai-provider-account-v1.md',
    JSON.stringify(openaiEvidenceDoc),
  );
  const openaiEvidenceResponse = await fetch(`${baseUrl}${openaiEvidenceDoc.href}`);
  assert.equal(openaiEvidenceResponse.status, 200);
  assert.match(openaiEvidenceResponse.headers.get('content-type') || '', /^text\/markdown/);
  assert.match(await openaiEvidenceResponse.text(), /Target OpenAI Provider Account/i);
  const providerOperationsBlockerAction = status.releaseReadiness.currentOpenBlockerActions.find(
    (item) =>
      item.category === 'provider-operations' &&
      item.owner === 'provider-ops' &&
      item.commands.some((command) => command.command === 'npm run smoke:target-provider-operations'),
  );
  assert.equal(
    Boolean(providerOperationsBlockerAction),
    true,
    JSON.stringify(status.releaseReadiness.currentOpenBlockerActions),
  );
  assert.match(
    providerOperationsBlockerAction.nextEvidence,
    /Completed per-provider operations capture template, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof/,
    JSON.stringify(providerOperationsBlockerAction),
  );
  assert.match(
    providerOperationsBlockerAction.nextEvidence,
    /provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, operator timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy/,
    JSON.stringify(providerOperationsBlockerAction),
  );
  assert.match(
    providerOperationsBlockerAction.nextEvidence,
    /provider-failure-only failover, recoverable-provider-failure-only stop reason, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment plan/,
    JSON.stringify(providerOperationsBlockerAction),
  );
  assert.match(
    providerOperationsBlockerAction.stopReason,
    /Target provider operations lacks same-boundary per-provider operations capture template proof, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof/,
    JSON.stringify(providerOperationsBlockerAction),
  );
  assert.match(
    providerOperationsBlockerAction.stopReason,
    /provider fallback runtime audit proof with fallback policy id, mission timeline chronology, workspace timeline chronology, operator timeline chronology, provider events family, attention remediation command, provider-failure-only failover, recoverable-provider-failure-only stop reason, selected fallback provider, and deterministic stop-condition proof/,
    JSON.stringify(providerOperationsBlockerAction),
  );
  assert.match(
    providerOperationsBlockerAction.stopReason,
    /target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment proof/,
    JSON.stringify(providerOperationsBlockerAction),
  );
  for (const command of [
    'npm run smoke:target-provider-operations',
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:release-artifact-hygiene',
  ]) {
    assert.equal(
      providerOperationsBlockerAction.commands.some((entry) => entry.command === command),
      true,
      JSON.stringify(providerOperationsBlockerAction.commands),
    );
  }
  assert.equal(
    providerOperationsBlockerAction.closureVerification.requiredProofs.includes('provider fallback runtime audit proof'),
    true,
    JSON.stringify(providerOperationsBlockerAction.closureVerification),
  );
  assert.equal(
    providerOperationsBlockerAction.closureVerification.requiredCommands.some(
      (entry) => entry.command === 'npm run smoke:workspace-timeline' && entry.kind === 'runtime-audit',
    ),
    true,
    JSON.stringify(providerOperationsBlockerAction.closureVerification),
  );
  assert.equal(
    providerOperationsBlockerAction.closureVerification.requiredEvidenceDocs.some(
      (doc) => doc.path === 'docs/target-provider-operations-v1.md' && doc.exists === true,
    ),
    true,
    JSON.stringify(providerOperationsBlockerAction.closureVerification),
  );
  for (const command of [
    'npm run smoke:provider-fallback-policy',
    'npm run smoke:provider-events',
    'npm run smoke:provider-attention-remediation',
    'npm run smoke:mission-timeline',
    'npm run smoke:workspace-timeline',
    'npm run smoke:operator-timeline',
  ]) {
    assert.equal(
      providerOperationsBlockerAction.commands.some(
        (entry) => entry.command === command && entry.kind === 'runtime-audit',
      ),
      true,
      JSON.stringify(providerOperationsBlockerAction.commands),
    );
  }
  const providerOperationsEvidenceDoc = providerOperationsBlockerAction.evidenceDocs.find(
    (doc) => doc.path === 'docs/target-provider-operations-v1.md',
  );
  assert.equal(Boolean(providerOperationsEvidenceDoc), true, JSON.stringify(providerOperationsBlockerAction));
  assert.equal(providerOperationsEvidenceDoc.exists, true, JSON.stringify(providerOperationsEvidenceDoc));
  assert.equal(
    providerOperationsEvidenceDoc.href,
    '/api/execution-v1/release-doc?path=docs%2Ftarget-provider-operations-v1.md',
    JSON.stringify(providerOperationsEvidenceDoc),
  );
  const providerOperationsEvidenceResponse = await fetch(`${baseUrl}${providerOperationsEvidenceDoc.href}`);
  assert.equal(providerOperationsEvidenceResponse.status, 200);
  assert.match(providerOperationsEvidenceResponse.headers.get('content-type') || '', /^text\/markdown/);
  assert.match(await providerOperationsEvidenceResponse.text(), /Target Provider Operations/i);
  assert.equal(
    status.releaseReadiness.currentOpenBlockerActions.some(
      (item) =>
        item.provider === 'local' &&
        item.category === 'provider-architecture' &&
        item.commands.some((command) => command.command === 'npm run smoke:target-local-provider-architecture'),
    ),
    true,
    JSON.stringify(status.releaseReadiness.currentOpenBlockerActions),
  );
  const localBlockerAction = status.releaseReadiness.currentOpenBlockerActions.find(
    (item) =>
      item.provider === 'local' &&
      item.category === 'provider-architecture' &&
      item.commands.some((command) => command.command === 'npm run smoke:target-local-provider-architecture'),
  );
  assert.equal(Boolean(localBlockerAction), true, JSON.stringify(status.releaseReadiness.currentOpenBlockerActions));
  assert.match(
    localBlockerAction.nextEvidence,
    /Endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota and resource guard, telemetry, fallback and customer approval, target-boundary local provider live validation, release artifact hygiene result, and regenerated execution snapshot evidence/,
    JSON.stringify(localBlockerAction),
  );
  assert.match(
    localBlockerAction.stopReason,
    /Target local provider architecture lacks endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation pass, release artifact hygiene result, and regenerated execution snapshot proof/,
    JSON.stringify(localBlockerAction),
  );
  assert.equal(
    status.releaseReadiness.currentOpenBlockerActions.some(
      (item) =>
        item.provider === 'hermes' &&
        item.category === 'provider-architecture' &&
        item.commands.some((command) => command.command === 'npm run smoke:target-hermes-provider-architecture'),
    ),
    true,
    JSON.stringify(status.releaseReadiness.currentOpenBlockerActions),
  );
  const hermesBlockerAction = status.releaseReadiness.currentOpenBlockerActions.find(
    (item) =>
      item.provider === 'hermes' &&
      item.category === 'provider-architecture' &&
      item.commands.some((command) => command.command === 'npm run smoke:target-hermes-provider-architecture'),
  );
  assert.equal(Boolean(hermesBlockerAction), true, JSON.stringify(status.releaseReadiness.currentOpenBlockerActions));
  assert.match(
    hermesBlockerAction.nextEvidence,
    /Endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene result, and regenerated execution snapshot evidence/,
    JSON.stringify(hermesBlockerAction),
  );
  assert.match(
    hermesBlockerAction.stopReason,
    /Target Hermes provider architecture lacks endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation pass, release artifact hygiene result, and regenerated execution snapshot proof/,
    JSON.stringify(hermesBlockerAction),
  );
  const providerArchitectureActionGuidanceText = JSON.stringify([
    localBlockerAction.nextEvidence,
    localBlockerAction.stopReason,
    hermesBlockerAction.nextEvidence,
    hermesBlockerAction.stopReason,
  ]);
  assert.doesNotMatch(
    providerArchitectureActionGuidanceText,
    /secret\/credential policy|session\/artifact provenance|data residency\/transcript policy|quota\/resource guard|fallback\/customer approval|release hygiene, and regenerated snapshot proof/,
    providerArchitectureActionGuidanceText,
  );
  assert.doesNotMatch(
    providerArchitectureActionGuidanceText,
    /HERMES_PROVIDER_MODEL pinning|fallback\/stop-condition decision|target-boundary live validation, release hygiene/,
    providerArchitectureActionGuidanceText,
  );
  const currentOpenBlockerActionsText = JSON.stringify(status.releaseReadiness.currentOpenBlockerActions);
  assert.doesNotMatch(
    currentOpenBlockerActionsText,
    /Approved endpoint\/model runtime configuration and target-boundary local provider validation evidence/,
  );
  assert.doesNotMatch(
    currentOpenBlockerActionsText,
    /Approved Hermes-compatible endpoint\/model runtime configuration and target-boundary Hermes live validation evidence/,
  );
  assert.doesNotMatch(
    currentOpenBlockerActionsText,
    /Target local provider architecture approval and target-boundary evidence are missing/,
  );
  assert.doesNotMatch(
    currentOpenBlockerActionsText,
    /Hermes endpoint\/model runtime configuration and target-boundary evidence are missing/,
  );
  assert.equal(
    status.releaseReadiness.currentOpenBlockerActions.some(
      (item) =>
        item.category === 'target-deployment' &&
        item.commands.some((command) => command.command === 'npm run smoke:target-environment-evidence-intake'),
    ),
    true,
    JSON.stringify(status.releaseReadiness.currentOpenBlockerActions),
  );
  const targetDeploymentBlockerAction = status.releaseReadiness.currentOpenBlockerActions.find(
    (item) =>
      item.category === 'target-deployment' &&
      item.owner === 'deployment-owner' &&
      item.commands.some((command) => command.command === 'npm run smoke:target-deployment-contract'),
  );
  assert.equal(Boolean(targetDeploymentBlockerAction), true, JSON.stringify(status.releaseReadiness.currentOpenBlockerActions));
  assert.match(
    targetDeploymentBlockerAction.nextEvidence,
    /Target deployment name proof, deployment profile decision proof, mandatory control evidence, provider readiness evidence, identity and tenant evidence, secret and observability evidence, data lifecycle and support evidence, clean release artifact evidence, stop-condition decision, production-ready claim decision, target environment submission packet, release artifact hygiene result, production-like drill result, reviewer decision, and regenerated execution snapshot evidence from the same target boundary/,
    JSON.stringify(targetDeploymentBlockerAction),
  );
  assert.match(
    targetDeploymentBlockerAction.stopReason,
    /same-boundary target deployment name proof, deployment profile decision proof, mandatory control evidence, provider readiness evidence, identity and tenant evidence, secret and observability evidence, data lifecycle and support evidence, clean release artifact evidence, stop-condition decision proof, production-ready claim decision proof, target environment submission packet proof, release artifact hygiene result, production-like drill result, reviewer decision proof, and regenerated execution snapshot proof/,
    JSON.stringify(targetDeploymentBlockerAction),
  );
  assert.equal(
    targetDeploymentBlockerAction.evidenceDocs.some(
      (doc) => doc.path === 'docs/target-deployment-contract-v1.md' && doc.exists === true,
    ),
    true,
    JSON.stringify(targetDeploymentBlockerAction),
  );
  const releaseDecisionBlockerAction = status.releaseReadiness.currentOpenBlockerActions.find(
    (item) =>
      item.category === 'release-decision' &&
      item.owner === 'release-owner' &&
      item.commands.some((command) => command.command === 'npm run smoke:production-enterprise-controls'),
  );
  assert.equal(Boolean(releaseDecisionBlockerAction), true, JSON.stringify(status.releaseReadiness.currentOpenBlockerActions));
  assert.equal(
    releaseDecisionBlockerAction.closureVerification.requiredProofs.includes('accepted risk register proof'),
    true,
    JSON.stringify(releaseDecisionBlockerAction.closureVerification),
  );
  assert.equal(
    releaseDecisionBlockerAction.closureVerification.requiredProofs.includes('allowed claim text proof'),
    true,
    JSON.stringify(releaseDecisionBlockerAction.closureVerification),
  );
  assert.match(
    releaseDecisionBlockerAction.nextEvidence,
    /Target provider evidence intake, provider operations, provider account or architecture approvals, target-boundary live validation for every included provider, provider failure containment, production enterprise controls, hosted identity and session evidence, hosted tenant isolation evidence, target secret manager evidence, target observability and SLO evidence, data lifecycle and support evidence, target deployment contract evidence, clean deployment release evidence, production-like drill result, release artifact hygiene result, accepted risk register, allowed claim text, release decision owner approval, next review date, and regenerated execution snapshot evidence from the same target boundary/,
    JSON.stringify(releaseDecisionBlockerAction),
  );
  assert.match(
    releaseDecisionBlockerAction.stopReason,
    /same-boundary target provider evidence intake proof, target provider operations proof, provider account or architecture approval proof, target-boundary live validation proof, provider failure containment proof, production enterprise control proof, hosted identity and session proof, hosted tenant isolation proof, target secret manager proof, target observability and SLO proof, data lifecycle and support proof, target deployment contract proof, clean deployment release proof, production-like drill result, release artifact hygiene result, accepted risk register proof, allowed claim text proof, release decision owner approval proof, next review date proof, and regenerated execution snapshot proof/,
    JSON.stringify(releaseDecisionBlockerAction),
  );
  const deploymentReleaseActionGuidanceText = JSON.stringify([
    targetDeploymentBlockerAction.nextEvidence,
    targetDeploymentBlockerAction.stopReason,
    releaseDecisionBlockerAction.nextEvidence,
    releaseDecisionBlockerAction.stopReason,
  ]);
  assert.doesNotMatch(
    deploymentReleaseActionGuidanceText,
    /identity\/tenant|secret\/observability|data lifecycle\/support|target deployment name\/profile|provider account\/architecture|hosted identity\/session|observability\/SLO|data\/support/,
    deploymentReleaseActionGuidanceText,
  );
  assert.doesNotMatch(
    deploymentReleaseActionGuidanceText,
    /artifact hygiene, production-like drill|drill, hygiene|accepted-risk|allowed-claim|decision-owner|regenerated snapshot proof/,
    deploymentReleaseActionGuidanceText,
  );
  assert.equal(
    releaseDecisionBlockerAction.evidenceDocs.some(
      (doc) => doc.path === 'docs/production-enterprise-controls-v1.md' && doc.exists === true,
    ),
    true,
    JSON.stringify(releaseDecisionBlockerAction),
  );
  assert.equal(status.referenceAdoptionAggregate?.scriptCount, referenceAdoptionSmokeScriptCount);
  assert.equal(status.baseline?.referenceAdoptionAggregate?.scriptCount, referenceAdoptionSmokeScriptCount);
  for (const scriptPath of requiredReferenceAdoptionSmokeScripts) {
    const currentAggregateScript = status.referenceAdoptionAggregate.scripts.find(
      (entry) => entry.script === scriptPath && entry.status === 'passed',
    );
    const baselineAggregateScript = status.baseline.referenceAdoptionAggregate.scripts.find(
      (entry) => entry.script === scriptPath && entry.status === 'passed',
    );
    assert.equal(
      Boolean(currentAggregateScript),
      true,
      `missing current reference adoption aggregate script: ${scriptPath}`,
    );
    assert.equal(
      Boolean(baselineAggregateScript),
      true,
      `missing baseline reference adoption aggregate script: ${scriptPath}`,
    );
    assert.equal(typeof currentAggregateScript.timeout, 'string', JSON.stringify(currentAggregateScript));
    assert.equal(currentAggregateScript.timedOut, false, JSON.stringify(currentAggregateScript));
    assert.equal(typeof baselineAggregateScript.timeout, 'string', JSON.stringify(baselineAggregateScript));
    assert.equal(baselineAggregateScript.timedOut, false, JSON.stringify(baselineAggregateScript));
  }

  assert.equal(status.values['reference adoption gate'], 'ready');
  assert.equal(status.values['deterministic runtime summary'], 'ready');
  assert.equal(status.values['handoff generator'], 'ready');
  assert.equal(status.values['browser interaction e2e'], 'ready');
  assert.equal(status.values['openai live validation'], 'passed');
  assert.match(status.values['anthropic live validation'], /^failed /);
  assert.equal(
    status.providerReadiness.some(
      (entry) =>
        entry.provider === 'openai' &&
        entry.command === 'npm run live:execution-v1:openai' &&
        entry.evidenceCommand === 'node scripts/build-execution-v1-evidence.mjs --live-openai',
    ),
    true,
    JSON.stringify(status.providerReadiness),
  );
  assert.equal(
    status.recommendedActions.some((entry) => entry.provider === 'openai'),
    false,
    JSON.stringify(status.recommendedActions),
  );
  assert.equal(
    status.recommendedActions.some(
      (entry) =>
        entry.provider === 'anthropic' &&
        entry.envKey === 'ANTHROPIC_API_KEY' &&
        entry.command === 'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic' &&
        entry.liveCommand === 'npm run live:execution-v1:anthropic' &&
        entry.evidenceCommand === 'node scripts/build-execution-v1-evidence.mjs --live-anthropic',
    ),
    true,
    JSON.stringify(status.recommendedActions),
  );
  assert.equal(
    status.recommendedActions.some(
      (entry) =>
        entry.provider === 'hermes' &&
        entry.envKey === 'HERMES_PROVIDER_MODEL' &&
        entry.command === 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes' &&
        entry.liveCommand === 'npm run live:execution-v1:hermes',
    ),
    true,
    JSON.stringify(status.recommendedActions),
  );

  const expectedScripts = [
    'smoke:execution-flow',
    'smoke:execution-cli',
    'smoke:ui-execution-console',
    'smoke:ui-execution-browser-e2e',
    'smoke:reference-adoptions',
    'smoke:execution-v1-live-helpers',
    'smoke:execution-v1-handoff',
    'smoke:production-readiness-gate',
  ];
  for (const script of expectedScripts) {
    assert.equal(
      status.deterministic.some((entry) => entry.script === script && entry.status === 'passed'),
      true,
      `missing passed deterministic script: ${script}`,
    );
    assert.equal(
      status.deterministicRuntime.some(
        (entry) =>
          entry.script === script &&
          typeof entry.elapsed === 'string' &&
          typeof entry.stdout === 'string' &&
          typeof entry.stderr === 'string' &&
          typeof entry.timeout === 'string',
      ),
      true,
      `missing deterministic runtime summary: ${script}`,
    );
  }

  assert.equal(status.snapshot?.exists, true);
  assert.equal(status.snapshot.matchesCurrentHead, true);
  assert.equal(status.snapshot.matchesGeneratedCommit, true);
  assert.equal(status.snapshot.verifiedCommit, verifiedCommit);
  assert.equal(
    String(status.snapshot.handoffPath || '').endsWith(`docs/releases/execution-v1/${verifiedCommit}/execution-v1-handoff.md`),
    true,
    JSON.stringify(status.snapshot),
  );

  const artifactIds = new Set(status.handoffArtifacts.map((artifact) => artifact.id));
  for (const artifactId of ['browser-report', 'browser-screenshot', 'visual-evidence-manifest-json']) {
    assert.equal(artifactIds.has(artifactId), true, `missing handoff artifact: ${artifactId}`);
    assert.equal(
      status.handoffArtifacts.some((artifact) => artifact.id === artifactId && artifact.exists === true),
      true,
      `handoff artifact is not available: ${artifactId}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        artifactState: status.artifactState,
        artifactSyncCommit: isArtifactSyncCommit,
        branch: status.currentBranch,
        commit: status.currentCommit,
        deterministic: `${status.summary.deterministicPassed}/${status.summary.deterministicTotal}`,
        ok: true,
        referenceAdoptionReady: status.summary.referenceAdoptionReady,
        runtimeRows: status.summary.deterministicRuntimeTotal,
        snapshotCommit: status.snapshot.verifiedCommit,
      },
      null,
      2,
    ),
  );
} finally {
  serverProcess.kill('SIGTERM');
  await waitForExit(serverProcess, { timeoutMs: 5_000 });
}

function isReleaseArtifactSyncPath(filePath) {
  const relativePath = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return [
    'docs/execution-v1-closeout.md',
    'docs/execution-v1-evidence.md',
    'docs/execution-v1-handoff.md',
    'docs/clean-deployment-release-v1.md',
    'docs/pilot-export-package-v1.md',
    'docs/production-like-release-drill-v1.md',
    'docs/production-slo-operating-v1.md',
    'docs/production-retention-operating-v1.md',
    'docs/production-provider-readiness-v1.md',
    'docs/production-enterprise-controls-v1.md',
    'docs/target-provider-operations-v1.md',
    'docs/target-slo-operations-v1.md',
    'docs/target-clean-deployment-operations-v1.md',
    'docs/release-readiness-v1.md',
  ].includes(relativePath) || relativePath.startsWith('docs/releases/execution-v1/');
}

function assertCurrentOpenBlockerClosureVerification(action) {
  assert.equal(Boolean(action?.closureVerification), true, JSON.stringify(action));
  assert.equal(action.closureVerification.blockerId, action.id, JSON.stringify(action.closureVerification));
  assert.equal(action.closureVerification.stopConditionId, action.id, JSON.stringify(action.closureVerification));
  assert.equal(action.closureVerification.status, 'blocked', JSON.stringify(action.closureVerification));
  assert.equal(action.closureVerification.currentState, 'blocked', JSON.stringify(action.closureVerification));
  assert.equal(action.closureVerification.targetBoundaryRequired, true, JSON.stringify(action.closureVerification));
  assert.equal(action.closureVerification.sameBoundaryRequired, true, JSON.stringify(action.closureVerification));
  assert.equal(action.closureVerification.productionReadyClaimAllowed, false, JSON.stringify(action.closureVerification));
  assert.match(
    action.closureVerification.productionReadyClaimRule,
    /productionReadyClaim remains false/,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.requiredCommands.length,
    action.commands.length,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.requiredEvidenceDocs.length,
    action.evidenceDocs.length,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.requiredProofs.includes('same-boundary target evidence packet proof'),
    true,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.requiredProofs.includes('release artifact hygiene pass proof'),
    true,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.requiredProofs.includes('regenerated execution-v1 artifact snapshot proof'),
    true,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.requiredDecisionFields.includes('decisionOwner'),
    true,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.acceptedDispositionValues.includes('closed-after-evidence'),
    true,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.artifactRequirements.releaseArtifactHygiene,
    true,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.artifactRequirements.executionV1ArtifactRefresh,
    true,
    JSON.stringify(action.closureVerification),
  );
  assert.equal(
    action.closureVerification.forbiddenEvidence.includes('raw API keys or tokens'),
    true,
    JSON.stringify(action.closureVerification),
  );
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function waitForServer(processHandle, { timeoutMs = 10_000 } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (processHandle.exitCode !== null) {
      throw new Error(`server exited early: ${serverOutput.stderr || serverOutput.stdout}`);
    }

    const match = serverOutput.stdout.match(/"url":\s*"([^"]+)"/);
    if (match) {
      return match[1];
    }

    await delay(100);
  }

  throw new Error(`server did not start: ${serverOutput.stderr || serverOutput.stdout}`);
}

async function waitForExit(processHandle, { timeoutMs = 5_000 } = {}) {
  if (processHandle.exitCode !== null) {
    return;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (processHandle.exitCode !== null) {
      return;
    }
    await delay(100);
  }

  processHandle.kill('SIGKILL');
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}
