import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';
import { seedExecutionV1Docs } from './execution-v1-test-fixtures.mjs';
import {
  referenceAdoptionSmokeScriptCount,
  requiredReferenceAdoptionSmokeScripts,
} from './reference-adoption-scripts.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-harness-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'ui-harness-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'prd',
    '--title',
    'Harness Browse Smoke',
    '--objective',
    'Validate the harness browse contract and served UI assets.',
  ],
});

const missionRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(missionRun.status, 'completed');

const fallbackAuditMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Provider fallback audit smoke',
    '--objective',
    'Seed provider fallback events for the web provider event timeline API.',
  ],
});

const fallbackAuditRun = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: ['mission', 'run', fallbackAuditMission.id, '--provider', 'anthropic', '--fallback-provider', 'stub'],
});

assert.equal(fallbackAuditRun.status, 'completed');
assert.equal(fallbackAuditRun.providerFallback.policyId, 'provider-failure-only');
assert.equal(fallbackAuditRun.providerFallback.fallbackUsed, true);

const recoverableOnlyStopMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Recoverable fallback stop audit smoke',
    '--objective',
    'Seed recoverable-only provider fallback stop events for the web API.',
  ],
});

const recoverableOnlyStopRun = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: [
    'mission',
    'run',
    recoverableOnlyStopMission.id,
    '--provider',
    'anthropic',
    '--fallback-provider',
    'stub',
    '--fallback-policy',
    'recoverable-provider-failure-only',
  ],
});

assert.equal(recoverableOnlyStopRun.status, 'failed');
assert.equal(recoverableOnlyStopRun.providerFallback.policyId, 'recoverable-provider-failure-only');
assert.equal(recoverableOnlyStopRun.providerFallback.fallbackUsed, false);

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ rootDir: tempRoot, store });

for (let index = 1; index <= 27; index += 1) {
  service.logDocument({
    type: 'devlog',
    title: `${mission.title} · Harness Browse Doc ${String(index).padStart(2, '0')}`,
    content: `Harness document browse smoke entry ${String(index).padStart(2, '0')}`,
  });
}

for (let index = 1; index <= 2; index += 1) {
  service.logDocument({
    type: 'reference',
    title: `${mission.title} · Harness Reference ${String(index).padStart(2, '0')}`,
    content: `Harness reference entry ${String(index).padStart(2, '0')}`,
  });
}

service.logDocument({
  type: 'incident',
  title: `${mission.title} · Harness Incident 01`,
  content: 'Harness incident record for smoke validation.',
});

for (let index = 1; index <= 12; index += 1) {
  service.addMemory({
    scope: 'mission',
    scopeId: mission.id,
    kind: 'fact',
    content: `Mission fact ${String(index).padStart(2, '0')} for harness smoke coverage`,
  });
}

for (let index = 1; index <= 18; index += 1) {
  service.addMemory({
    scope: 'workspace',
    scopeId: workspace.id,
    kind: 'decision',
    content: `Workspace decision ${String(index).padStart(2, '0')} for harness smoke coverage`,
  });
}

const runtimeJobRegistryPath = path.join(tempRoot, 'var', 'runtime-jobs.json');
fs.mkdirSync(path.dirname(runtimeJobRegistryPath), { recursive: true });
fs.writeFileSync(
  runtimeJobRegistryPath,
  `${JSON.stringify({
    active: [],
    terminal: [
      {
        details: {
          result: {
            actionCount: 1,
            artifactCount: 2,
          },
        },
        durationMs: 1234,
        endedAt: '2026-04-27T00:01:00.000Z',
        id: 'runtimejob_ui_harness_fixture',
        kind: 'execution-v1-refresh',
        pid: process.pid,
        requestId: 'req_ui_harness_fixture',
        scope: 'current-surface',
        source: 'smoke-fixture',
        startedAt: '2026-04-27T00:00:58.766Z',
        status: 'completed',
        summary: 'UI harness fixture runtime job for release operator history.',
      },
    ],
    updatedAt: '2026-04-27T00:01:00.000Z',
  }, null, 2)}\n`,
  'utf8',
);

seedExecutionV1Docs({
  evidenceHref: '/tmp/personal-ai-agent-ui-harness/docs/execution-v1-evidence.md',
  repoDir,
  rootDir: tempRoot,
});

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = { stderr: '', stdout: '' };

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(port),
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
  await waitForServer(baseUrl, serverProcess);

  const rootHtml = await fetchText(baseUrl);
  const appJs = await fetchText(`${baseUrl}/app.js`);

  assert.equal(rootHtml.includes('data-detail-tab="harness"'), true);
  assert.equal(rootHtml.includes('data:image/svg+xml'), true);
  assert.equal(rootHtml.includes('id="run-fallback-provider-select"'), true);
  assert.equal(rootHtml.includes('id="run-fallback-policy-select"'), true);
  assert.equal(rootHtml.includes('recoverable-provider-failure-only'), true);
  assert.equal(appJs.includes('renderHarnessFilterChips'), true);
  assert.equal(appJs.includes('refreshSelectedMissionContext'), true);
  assert.equal(appJs.includes('fallbackProvider'), true);
  assert.equal(appJs.includes('fallbackPolicy'), true);
  assert.equal(appJs.includes('loadProviderEvents'), true);
  assert.equal(appJs.includes('data-provider-fallback-event-audit'), true);
  assert.equal(appJs.includes('data-provider-fallback-event-policy-filter'), true);
  assert.equal(appJs.includes('data-provider-fallback-event-stop-filter'), true);
  assert.equal(appJs.includes('data-provider-fallback-policy-count'), true);
  assert.equal(appJs.includes('data-provider-fallback-stop-reason-count'), true);
  assert.equal(appJs.includes('data-provider-fallback-event-package'), true);
  assert.equal(appJs.includes('buildProviderFallbackEventAuditPackageText'), true);
  assert.equal(appJs.includes('Provider fallback event audit package'), true);
  assert.equal(appJs.includes('copyProviderFallbackEventAuditPackage'), true);
  assert.equal(appJs.includes('data-release-provider-readiness-package'), true);
  assert.equal(appJs.includes('copy-release-provider-readiness-package'), true);
  assert.equal(appJs.includes('buildReleaseProviderReadinessPackageText'), true);
  assert.equal(appJs.includes('Provider readiness handoff package'), true);
  assert.equal(appJs.includes('Target provider evidence intake'), true);
  assert.equal(appJs.includes('getReleaseProviderBlockerActions'), true);
  assert.equal(appJs.includes('Linked provider blockers:'), true);
  assert.equal(appJs.includes('data-release-provider-blocker-count'), true);
  assert.equal(appJs.includes('data-release-provider-blocker-package'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-provider-count'), true);
  assert.equal(appJs.includes('buildReleaseBlockerClosureMatrixPackageText'), true);
  assert.equal(appJs.includes('Target environment blocker closure matrix package'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-closure-matrix'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-closure-matrix'), true);
  assert.equal(appJs.includes('targetEnvironmentEvidenceIntakeDoc'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceIntakeSummaryText'), true);
  assert.equal(appJs.includes('Target environment evidence intake summary'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-intake-summary'), true);
  assert.equal(appJs.includes('data-release-target-evidence-intake-summary'), true);
  assert.equal(appJs.includes('This summary is triage manifest only'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceCaptureTemplateText'), true);
  assert.equal(appJs.includes('Target evidence capture template'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-capture-template'), true);
  assert.equal(appJs.includes('data-release-target-evidence-capture-template'), true);
  assert.equal(appJs.includes('Target evidence capture template:'), true);
  assert.equal(appJs.includes('Capture template rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceRequiredCommandsText'), true);
  assert.equal(appJs.includes('Target evidence required commands'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-required-commands'), true);
  assert.equal(appJs.includes('data-release-target-evidence-required-commands'), true);
  assert.equal(appJs.includes('Required commands package:'), true);
  assert.equal(appJs.includes('Command rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceProductionGapText'), true);
  assert.equal(appJs.includes('Target evidence production gap guard'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-production-gap'), true);
  assert.equal(appJs.includes('data-release-target-evidence-production-gap'), true);
  assert.equal(appJs.includes('Production gap guard:'), true);
  assert.equal(appJs.includes('Production gap rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceSubmissionManifestText'), true);
  assert.equal(appJs.includes('Target evidence submission manifest'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-submission-manifest'), true);
  assert.equal(appJs.includes('data-release-target-evidence-submission-manifest'), true);
  assert.equal(appJs.includes('Submission manifest template:'), true);
  assert.equal(appJs.includes('Manifest fields:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceSanitizedRegisterText'), true);
  assert.equal(appJs.includes('Target evidence sanitized register'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-sanitized-register'), true);
  assert.equal(appJs.includes('data-release-target-evidence-sanitized-register'), true);
  assert.equal(appJs.includes('Sanitized evidence register template:'), true);
  assert.equal(appJs.includes('Evidence register rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceBoundaryConsistencyMapText'), true);
  assert.equal(appJs.includes('Target evidence boundary consistency map'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-boundary-map'), true);
  assert.equal(appJs.includes('data-release-target-evidence-boundary-map'), true);
  assert.equal(appJs.includes('Boundary consistency map template:'), true);
  assert.equal(appJs.includes('Boundary consistency rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceCommandRerunLogText'), true);
  assert.equal(appJs.includes('Target evidence command rerun log'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-command-rerun-log'), true);
  assert.equal(appJs.includes('data-release-target-evidence-command-rerun-log'), true);
  assert.equal(appJs.includes('Command rerun log template:'), true);
  assert.equal(appJs.includes('Command rerun rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceReviewerDecisionRecordText'), true);
  assert.equal(appJs.includes('Target evidence reviewer decision record'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-decision-record'), true);
  assert.equal(appJs.includes('data-release-target-evidence-decision-record'), true);
  assert.equal(appJs.includes('Reviewer decision checklist:'), true);
  assert.equal(appJs.includes('Reviewer decision record template:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceBlockerDispositionRegisterText'), true);
  assert.equal(appJs.includes('Target evidence blocker disposition register'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-blocker-disposition'), true);
  assert.equal(appJs.includes('data-release-target-evidence-blocker-disposition'), true);
  assert.equal(appJs.includes('Blocker disposition register template:'), true);
  assert.equal(appJs.includes('Disposition rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceReleaseRefreshEvidenceText'), true);
  assert.equal(appJs.includes('Target evidence release refresh evidence'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-release-refresh'), true);
  assert.equal(appJs.includes('data-release-target-evidence-release-refresh'), true);
  assert.equal(appJs.includes('Release refresh evidence template:'), true);
  assert.equal(appJs.includes('Release refresh artifact rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceIntakePacketText'), true);
  assert.equal(appJs.includes('Target environment evidence intake submission packet'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-intake-packet'), true);
  assert.equal(appJs.includes('data-release-target-evidence-intake-packet'), true);
  assert.equal(appJs.includes('Submission packet checklist:'), true);
  assert.equal(appJs.includes('/api/providers/events?'), true);
  assert.equal(appJs.includes('updateRunFallbackControls'), true);
  assert.equal(appJs.includes('/api/actions/provider-attention/'), true);
  assert.equal(appJs.includes('getProviderAttentionRemediationPayload'), true);
  assert.equal(appJs.includes('recoverableFallbackRecommendedCommand'), true);
  assert.equal(appJs.includes('data-provider-attention-remediate'), true);
  assert.equal(appJs.includes('/api/actions/specialist-follow-ups/'), true);
  assert.equal(appJs.includes('formatSpecialistFollowUpRoute'), true);
  assert.equal(appJs.includes('data-specialist-follow-up-remediate'), true);
  assert.equal(appJs.includes('document-log-search'), true);
  assert.equal(appJs.includes('harness-memory-search'), true);
  assert.equal(appJs.includes('loadRuntimeRequests'), true);
  assert.equal(appJs.includes('loadRuntimeJobs'), true);
  assert.equal(appJs.includes('data-runtime-request-metric'), true);
  assert.equal(appJs.includes('data-runtime-job-metric'), true);
  assert.equal(appJs.includes('data-release-runtime-job-metric'), true);
  assert.equal(appJs.includes('data-release-runtime-job-list'), true);
  assert.equal(appJs.includes('data-release-runtime-job-id'), true);
  assert.equal(appJs.includes('data-release-deterministic-runtime'), true);
  assert.equal(appJs.includes('data-release-deterministic-runtime-row'), true);
  assert.equal(appJs.includes('data-release-reference-adoption-aggregate'), true);
  assert.equal(appJs.includes('data-release-reference-adoption-row'), true);
  assert.equal(appJs.includes('Reference Adoption Aggregate'), true);
  assert.equal(appJs.includes('reference gate'), true);
  assert.equal(appJs.includes('data-release-production-blockers'), true);
  assert.equal(appJs.includes('buildReleaseProductionBlockerSummaryText'), true);
  assert.equal(appJs.includes('data-release-production-blocker-summary-copy'), true);
  assert.equal(appJs.includes('copy-release-production-blocker-summary'), true);
  assert.equal(appJs.includes('Production-ready blocker summary'), true);
  assert.equal(appJs.includes('data-release-production-blocker-release-doc'), true);
  assert.equal(appJs.includes('releaseProductionBlockersExpanded'), true);
  assert.equal(appJs.includes('data-release-production-blocker-list-expanded'), true);
  assert.equal(appJs.includes('data-release-production-blocker-visible-count'), true);
  assert.equal(appJs.includes('data-release-production-blocker-overflow'), true);
  assert.equal(appJs.includes('data-release-production-blocker-toggle'), true);
  assert.equal(appJs.includes('toggle-release-production-blockers'), true);
  assert.equal(appJs.includes('buildReleaseProductionBlockerHandoffText'), true);
  assert.equal(appJs.includes('data-release-production-blocker-row-index'), true);
  assert.equal(appJs.includes('data-release-production-blocker-handoff'), true);
  assert.equal(appJs.includes('copy-release-production-blocker-handoff'), true);
  assert.equal(appJs.includes('Production-ready blocker handoff'), true);
  assert.equal(appJs.includes('releaseFocusedProductionBlockerIndex'), true);
  assert.equal(appJs.includes('rpblocker'), true);
  assert.equal(appJs.includes('data-release-production-blocker-focus'), true);
  assert.equal(appJs.includes('data-release-production-blocker-focused'), true);
  assert.equal(appJs.includes('data-release-production-blocker-link'), true);
  assert.equal(appJs.includes('focus-release-production-blocker'), true);
  assert.equal(appJs.includes('copy-release-production-blocker-link'), true);
  assert.equal(appJs.includes('clear-release-production-blocker-focus'), true);
  assert.equal(appJs.includes('data-release-production-blocker-evidence-doc'), true);
  assert.equal(appJs.includes('data-release-production-blocker-evidence-doc-copy'), true);
  assert.equal(appJs.includes('release-readiness production-ready blockers'), true);
  assert.equal(appJs.includes('buildReleaseProductionBlockerCommandText'), true);
  assert.equal(appJs.includes('data-release-production-blocker-commands'), true);
  assert.equal(appJs.includes('copy-release-production-blocker-commands'), true);
  assert.equal(appJs.includes('Production-ready blocker verification commands'), true);
  assert.equal(appJs.includes('buildReleaseProductionBlockerPackageText'), true);
  assert.equal(appJs.includes('data-release-production-blocker-package'), true);
  assert.equal(appJs.includes('copy-release-production-blocker-package'), true);
  assert.equal(appJs.includes('Production-ready blocker package'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-list'), true);
  assert.equal(appJs.includes('currentOpenBlockers'), true);
  assert.equal(appJs.includes('currentOpenBlockerActions'), true);
  assert.equal(appJs.includes('currentOpenBlockerActionSummary'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-triage'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-category-count'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-owner-count'), true);
  assert.equal(appJs.includes('releaseBlockerCategoryFilter'), true);
  assert.equal(appJs.includes('releaseBlockerOwnerFilter'), true);
  assert.equal(appJs.includes('rbcategory'), true);
  assert.equal(appJs.includes('rbowner'), true);
  assert.equal(appJs.includes('filter-release-blockers'), true);
  assert.equal(appJs.includes('clear-release-blocker-filter'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-summary'), true);
  assert.equal(appJs.includes('hasEmptyBlockerFilter'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty-category'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty-owner'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty-clear'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-summary'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-command-count'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-evidence-count'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-top'), true);
  assert.equal(appJs.includes('getReleaseBlockerSliceSummary'), true);
  assert.equal(appJs.includes('buildReleaseBlockerSliceSummaryText'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-summary-copy'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-summary'), true);
  assert.equal(appJs.includes('Release blocker slice summary'), true);
  assert.equal(appJs.includes('buildReleaseBlockerSlicePackageText'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-package'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-package'), true);
  assert.equal(appJs.includes('Release blocker slice package'), true);
  assert.equal(appJs.includes('buildReleaseBlockerSliceClosureChecklistText(buildOptions)'), true);
  assert.equal(appJs.includes('buildReleaseBlockerSliceClosureChecklistText'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-closure-checklist'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-closure-checklist'), true);
  assert.equal(appJs.includes('Release blocker slice closure checklist'), true);
  assert.equal(appJs.includes('Blocker checklist:'), true);
  assert.equal(appJs.includes('Artifact refresh: npm run refresh:execution-v1-artifacts'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-handoff'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-handoff'), true);
  assert.equal(appJs.includes('Release blocker slice handoff'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-command'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-commands'), true);
  assert.equal(appJs.includes('Release blocker slice commands'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-evidence'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-evidence'), true);
  assert.equal(appJs.includes('Release blocker slice evidence'), true);
  assert.equal(appJs.includes('releaseFocusedBlockerId'), true);
  assert.equal(appJs.includes('rblocker'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-action-row'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-focus'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-handoff'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-focus-evidence-doc'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-focus-command'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-evidence-doc'), true);
  assert.equal(appJs.includes('data-release-evidence-doc-href'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-command'), true);
  assert.equal(appJs.includes('focus-release-blocker'), true);
  assert.equal(appJs.includes('copy-release-blocker-link'), true);
  assert.equal(appJs.includes('copy-release-blocker-handoff'), true);
  assert.equal(appJs.includes('Release blocker handoff'), true);
  assert.equal(appJs.includes('buildReleaseBlockerClosureChecklistText'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-closure-checklist'), true);
  assert.equal(appJs.includes('copy-release-blocker-closure-checklist'), true);
  assert.equal(appJs.includes('Release blocker closure checklist'), true);
  assert.equal(appJs.includes('Closure requirements:'), true);
  assert.equal(appJs.includes('Artifact refresh: npm run refresh:execution-v1-artifacts'), true);
  assert.equal(appJs.includes('buildReleaseBlockerPackageText'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-package'), true);
  assert.equal(appJs.includes('copy-release-blocker-package'), true);
  assert.equal(appJs.includes('Release blocker package'), true);
  assert.equal(appJs.includes('buildReleaseBlockerClosureChecklistText(blockerAction)'), true);
  assert.equal(appJs.includes('copy-release-evidence-doc-link'), true);
  assert.equal(appJs.includes('clear-release-blocker-focus'), true);
  assert.equal(appJs.includes("if (!item || typeof item !== 'object')"), true);
  assert.equal(rootHtml.includes('<option value="hermes">Hermes</option>'), true);
  assert.equal(appJs.includes('liveHermes'), true);
  assert.equal(appJs.includes('run-release-preflight-all'), true);
  assert.equal(appJs.includes('preflight:execution-v1:all'), true);
  assert.equal(appJs.includes('data-fact-graph-preview'), true);
  assert.equal(appJs.includes('data-fact-graph-node-id'), true);
  assert.equal(appJs.includes('data-fact-graph-edge-id'), true);
  assert.equal(appJs.includes('relationReason'), true);

  const runtimeRequests = await fetchJson(`${baseUrl}/api/runtime/requests`);
  assert.equal(Array.isArray(runtimeRequests.requests?.active), true);
  assert.equal(Array.isArray(runtimeRequests.requests?.recent), true);
  assert.equal(
    runtimeRequests.requests.active.some((entry) => entry.path === '/api/runtime/requests'),
    true,
  );
  const runtimeJobs = await fetchJson(`${baseUrl}/api/runtime/jobs`);
  assert.equal(Array.isArray(runtimeJobs.jobs?.active), true);
  assert.equal(Array.isArray(runtimeJobs.jobs?.recent), true);
  assert.equal(
    runtimeJobs.jobs.recent.some((entry) => entry.id === 'runtimejob_ui_harness_fixture'),
    true,
  );
  const providerFallbackEvents = await fetchJson(`${baseUrl}/api/providers/events?family=fallback`);
  assert.equal(providerFallbackEvents.summary.familyCounts.fallback, 3);
  assert.equal(providerFallbackEvents.summary.fallbackPolicyCounts['provider-failure-only'], 2);
  assert.equal(providerFallbackEvents.summary.fallbackPolicyCounts['recoverable-provider-failure-only'], 1);
  assert.equal(providerFallbackEvents.summary.fallbackStopReasonCounts['eligible-provider-failure'], 1);
  assert.equal(providerFallbackEvents.summary.fallbackStopReasonCounts['mission-status-completed'], 1);
  assert.equal(providerFallbackEvents.summary.fallbackStopReasonCounts['non-recoverable-provider-failure'], 1);
  assert.equal(providerFallbackEvents.timeline.every((event) => event.eventFamily === 'fallback'), true);
  const recoverableFallbackEvents = await fetchJson(
    `${baseUrl}/api/providers/events?fallbackPolicy=recoverable-provider-failure-only`,
  );
  assert.equal(recoverableFallbackEvents.filters.fallbackPolicy, 'recoverable-provider-failure-only');
  assert.equal(recoverableFallbackEvents.summary.familyCounts.fallback, 1);
  assert.equal(recoverableFallbackEvents.summary.fallbackStopReasonCounts['non-recoverable-provider-failure'], 1);
  assert.equal(recoverableFallbackEvents.timeline[0].fallbackStopReason, 'non-recoverable-provider-failure');
  const nonRecoverableFallbackEvents = await fetchJson(
    `${baseUrl}/api/providers/events?fallback-stop-reason=non-recoverable-provider-failure`,
  );
  assert.equal(nonRecoverableFallbackEvents.filters.fallbackStopReason, 'non-recoverable-provider-failure');
  assert.equal(nonRecoverableFallbackEvents.summary.total, 1);
  assert.equal(nonRecoverableFallbackEvents.timeline[0].fallbackPolicy, 'recoverable-provider-failure-only');
  const executionV1Status = await fetchJson(`${baseUrl}/api/execution-v1/status`);
  assert.equal(typeof executionV1Status.handoff?.generatedAt, 'string');
  assert.equal(executionV1Status.handoff?.commit, executionV1Status.commit);
  assert.equal(executionV1Status.summary.handoffReady, true);
  assert.equal(
    executionV1Status.refreshPlan.affectsPaths.some((item) => String(item || '').endsWith('docs/execution-v1-handoff.md')),
    true,
    JSON.stringify(executionV1Status.refreshPlan),
  );
  assert.equal(executionV1Status.summary.coreDeterministicPassed, 4);
  assert.equal(executionV1Status.summary.coreDeterministicTotal, 4);
  assert.equal(executionV1Status.summary.deterministicPassed, 8);
  assert.equal(executionV1Status.summary.deterministicTotal, 8);
  assert.equal(executionV1Status.summary.deterministicRuntimeTotal, 8);
  assert.equal(executionV1Status.summary.referenceAdoptionPassed, 1);
  assert.equal(executionV1Status.summary.referenceAdoptionTotal, 1);
  assert.equal(executionV1Status.summary.referenceAdoptionReady, true);
  assert.equal(executionV1Status.summary.referenceAdoptionAggregateScriptCount, referenceAdoptionSmokeScriptCount);
  assert.equal(executionV1Status.referenceAdoptionAggregate?.scriptCount, referenceAdoptionSmokeScriptCount);
  for (const scriptPath of requiredReferenceAdoptionSmokeScripts) {
    const aggregateScript = executionV1Status.referenceAdoptionAggregate.scripts.find(
      (item) => item.script === scriptPath && item.status === 'passed',
    );
    assert.equal(
      Boolean(aggregateScript),
      true,
      JSON.stringify(executionV1Status.referenceAdoptionAggregate),
    );
    assert.equal(typeof aggregateScript.timeout, 'string', JSON.stringify(aggregateScript));
    assert.equal(aggregateScript.timedOut, false, JSON.stringify(aggregateScript));
  }
  assert.equal(executionV1Status.summary.executionV1HelperPassed, 1);
  assert.equal(executionV1Status.summary.executionV1HelperTotal, 1);
  assert.equal(executionV1Status.summary.executionV1HelperReady, true);
  assert.equal(executionV1Status.summary.productionReadyStatus, 'blocked');
  assert.equal(executionV1Status.summary.productionReadyBlocked, true);
  assert.equal(executionV1Status.summary.productionBlockerCount, 2);
  assert.equal(executionV1Status.summary.currentOpenBlockerCount, 1);
  assert.equal(executionV1Status.summary.currentOpenBlockerActionCount, 1);
  assert.equal(executionV1Status.releaseReadiness?.productionReadyClaimAllowed, false);
  assert.equal(
    executionV1Status.releaseReadiness.productionBlockers.includes('fixture provider live validation is not complete'),
    true,
    JSON.stringify(executionV1Status.releaseReadiness),
  );
  assert.equal(
    executionV1Status.releaseReadiness.currentOpenBlockers.includes('fixture provider evidence is not generated from the target boundary'),
    true,
    JSON.stringify(executionV1Status.releaseReadiness),
  );
  assert.equal(executionV1Status.releaseReadiness.currentOpenBlockerActions.length, 1);
  assert.equal(executionV1Status.releaseReadiness.currentOpenBlockerActions[0].category, 'release-readiness');
  assert.equal(executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.actionCount, 1);
  assert.equal(
    executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.categoryCounts['release-readiness'],
    1,
    JSON.stringify(executionV1Status.releaseReadiness.currentOpenBlockerActionSummary),
  );
  assert.equal(
    executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.ownerCounts['release-owner'],
    1,
    JSON.stringify(executionV1Status.releaseReadiness.currentOpenBlockerActionSummary),
  );
  assert.equal(
    executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.topPriorityBlockerId,
    executionV1Status.releaseReadiness.currentOpenBlockerActions[0].id,
  );
  assert.equal(
    executionV1Status.releaseReadiness.currentOpenBlockerActions[0].evidenceDocs.some(
      (doc) =>
        doc.path === 'docs/release-readiness-v1.md' &&
        doc.exists === true &&
        doc.href === '/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md',
    ),
    true,
    JSON.stringify(executionV1Status.releaseReadiness.currentOpenBlockerActions[0].evidenceDocs),
  );
  const releaseReadinessDoc = await fetchText(`${baseUrl}/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md`);
  assert.match(releaseReadinessDoc, /Release Readiness v1/);
  assert.equal(
    executionV1Status.releaseReadiness.currentOpenBlockerActions[0].commands.some(
      (command) => command.command === 'npm run smoke:production-readiness-gate',
    ),
    true,
    JSON.stringify(executionV1Status.releaseReadiness.currentOpenBlockerActions),
  );
  assert.equal(appJs.includes('live helper'), true);
  assert.equal(executionV1Status.summary.executionV1HandoffPassed, 1);
  assert.equal(executionV1Status.summary.executionV1HandoffTotal, 1);
  assert.equal(executionV1Status.summary.executionV1HandoffReady, true);
  assert.equal(appJs.includes('handoff generator'), true);
  assert.equal(
    executionV1Status.values['reference adoption gate'],
    'ready',
    JSON.stringify(executionV1Status.values),
  );
  assert.equal(
    executionV1Status.values['deterministic runtime summary'],
    'ready',
    JSON.stringify(executionV1Status.values),
  );
  assert.equal(
    executionV1Status.values['handoff generator'],
    'ready',
    JSON.stringify(executionV1Status.values),
  );
  assert.equal(
    executionV1Status.providerReadiness.some(
      (item) =>
        item.provider === 'openai' &&
        item.command === 'npm run live:execution-v1:openai' &&
        item.evidenceCommand === 'node scripts/build-execution-v1-evidence.mjs --live-openai',
    ),
    true,
    JSON.stringify(executionV1Status.providerReadiness),
  );
  assert.equal(
    executionV1Status.recommendedActions.some(
      (item) =>
        item.provider === 'hermes' &&
        item.envKey === 'HERMES_PROVIDER_MODEL' &&
        item.command === 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes' &&
        item.liveCommand === 'npm run live:execution-v1:hermes',
    ),
    true,
    JSON.stringify(executionV1Status.recommendedActions),
  );
  assert.equal(appJs.includes("const explicitCommand = String(item?.command || '').trim();"), true);
  assert.equal(appJs.includes('function getProviderLiveCommand'), true);
  assert.equal(appJs.includes('preflight?.missingEnvCommand'), true);
  assert.equal(
    executionV1Status.deterministic.some((item) => item.script === 'smoke:reference-adoptions' && item.status === 'passed'),
    true,
    JSON.stringify(executionV1Status.deterministic),
  );
  assert.equal(
    executionV1Status.deterministic.some((item) => item.script === 'smoke:execution-v1-live-helpers' && item.status === 'passed'),
    true,
    JSON.stringify(executionV1Status.deterministic),
  );
  assert.equal(
    executionV1Status.deterministic.some((item) => item.script === 'smoke:execution-v1-handoff' && item.status === 'passed'),
    true,
    JSON.stringify(executionV1Status.deterministic),
  );
  assert.equal(
    executionV1Status.deterministic.some((item) => item.script === 'smoke:production-readiness-gate' && item.status === 'passed'),
    true,
    JSON.stringify(executionV1Status.deterministic),
  );
  assert.equal(
    executionV1Status.deterministicRuntime.some(
      (item) =>
        item.script === 'smoke:ui-execution-browser-e2e' &&
        item.elapsed === '8.0m' &&
        item.stdout === '6.9KiB' &&
        item.stderr === '8.6KiB' &&
        item.timeout === '20.0m',
    ),
    true,
    JSON.stringify(executionV1Status.deterministicRuntime),
  );
  const currentSurfaceRefreshPreflight = await fetchJson(`${baseUrl}/api/execution-v1/refresh/preflight`, {
    body: JSON.stringify({}),
    method: 'POST',
  });
  assert.equal(currentSurfaceRefreshPreflight.preflight.action, 'current-surface');
  assert.equal(currentSurfaceRefreshPreflight.preflight.allowed, true);
  assert.equal(currentSurfaceRefreshPreflight.preflight.confirmRequired, true);
  assert.equal(
    currentSurfaceRefreshPreflight.preflight.summary.includes('evidence, closeout, handoff'),
    true,
    JSON.stringify(currentSurfaceRefreshPreflight.preflight),
  );
  assert.equal(
    currentSurfaceRefreshPreflight.preflight.affectedPaths.some((item) => String(item || '').endsWith('docs/execution-v1-handoff.md')),
    true,
    JSON.stringify(currentSurfaceRefreshPreflight.preflight),
  );
  assert.equal(
    currentSurfaceRefreshPreflight.preflight.notes.some((item) => String(item || '').includes('evidence/closeout/handoff')),
    true,
    JSON.stringify(currentSurfaceRefreshPreflight.preflight),
  );
  const unconfirmedRefresh = await fetchJsonResponse(`${baseUrl}/api/execution-v1/refresh`, {
    body: JSON.stringify({}),
    method: 'POST',
  });
  assert.equal(unconfirmedRefresh.status, 409);
  assert.equal(unconfirmedRefresh.body.error, 'refresh-confirmation-required');
  assert.equal(
    unconfirmedRefresh.body.message.includes('evidence/closeout/handoff'),
    true,
    JSON.stringify(unconfirmedRefresh.body),
  );
  assert.equal(
    unconfirmedRefresh.body.preflight.affectedPaths.some((item) => String(item || '').endsWith('docs/execution-v1-handoff.md')),
    true,
    JSON.stringify(unconfirmedRefresh.body.preflight),
  );
  const aggregatePreflight = await fetchJson(`${baseUrl}/api/execution-v1/preflight`, {
    body: JSON.stringify({
      provider: 'all',
    }),
    method: 'POST',
  });
  assert.equal(aggregatePreflight.preflight.ok, true);
  assert.equal(aggregatePreflight.preflight.status, 'ready-but-missing-env');
  assert.equal(aggregatePreflight.preflight.blockedCount, 0);
  assert.equal(aggregatePreflight.preflight.missingEnvCount, 4);
  assert.deepEqual(
    aggregatePreflight.preflight.providers.map((entry) => [entry.provider, entry.status, entry.missingEnvCommand]),
    [
      ['openai', 'ready-but-missing-env', 'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai'],
      ['anthropic', 'ready-but-missing-env', 'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic'],
      ['local', 'ready-but-missing-env', 'export LOCAL_PROVIDER_MODEL="..." && npm run live:execution-v1:local'],
      ['hermes', 'ready-but-missing-env', 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes'],
    ],
  );

  const initialDocuments = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/documents?limit=12&offset=0&query=&sort=latest&type=all`,
  );
  assert.equal(initialDocuments.summary.filteredCount, 30);
  assert.equal(initialDocuments.summary.visibleCount, 12);
  assert.equal(initialDocuments.summary.hasPrev, false);
  assert.equal(initialDocuments.summary.hasNext, true);
  assert.equal(initialDocuments.summary.pageStart, 1);
  assert.equal(initialDocuments.summary.pageEnd, 12);

  const devlogPageOne = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/documents?limit=24&offset=0&query=&sort=title&type=devlog`,
  );
  assert.equal(devlogPageOne.summary.filteredCount, 27);
  assert.equal(devlogPageOne.summary.visibleCount, 24);
  assert.equal(devlogPageOne.summary.hasNext, true);
  assert.equal(devlogPageOne.summary.pageStart, 1);
  assert.equal(devlogPageOne.summary.pageEnd, 24);
  assert.equal(devlogPageOne.entries[0].title.includes('Harness Browse Doc 01'), true);
  assert.equal(devlogPageOne.entries.at(-1).title.includes('Harness Browse Doc 24'), true);

  const devlogPageTwo = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/documents?limit=24&offset=24&query=&sort=title&type=devlog`,
  );
  assert.equal(devlogPageTwo.summary.filteredCount, 27);
  assert.equal(devlogPageTwo.summary.visibleCount, 3);
  assert.equal(devlogPageTwo.summary.hasPrev, true);
  assert.equal(devlogPageTwo.summary.hasNext, false);
  assert.equal(devlogPageTwo.summary.pageStart, 25);
  assert.equal(devlogPageTwo.summary.pageEnd, 27);
  assert.equal(devlogPageTwo.entries[0].title.includes('Harness Browse Doc 25'), true);

  const searchedDocuments = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/documents?limit=12&offset=0&query=${encodeURIComponent('Harness Browse Doc 27')}&sort=title&type=devlog`,
  );
  assert.equal(searchedDocuments.summary.filteredCount, 1);
  assert.equal(searchedDocuments.summary.visibleCount, 1);
  assert.equal(searchedDocuments.entries[0].title.includes('Harness Browse Doc 27'), true);
  assert.equal(searchedDocuments.filters.query, 'Harness Browse Doc 27');
  assert.equal(searchedDocuments.filters.type, 'devlog');
  assert.equal(searchedDocuments.filters.limit, 12);

  const initialMemory = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/memory?scope=all&kind=all&query=&sort=latest&limit=12&offset=0`,
  );
  assert.equal(initialMemory.summary.total, 30);
  assert.equal(initialMemory.summary.visibleCount, 12);
  assert.equal(initialMemory.summary.hasPrev, false);
  assert.equal(initialMemory.summary.hasNext, true);

  const searchedMemory = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/memory?scope=workspace&kind=decision&query=${encodeURIComponent('Workspace decision 07')}&sort=latest&limit=12&offset=0`,
  );
  assert.equal(searchedMemory.summary.filteredTotal, 1);
  assert.equal(searchedMemory.summary.visibleCount, 1);
  assert.equal(searchedMemory.entries[0].content.includes('Workspace decision 07'), true);
  assert.equal(searchedMemory.filters.scope, 'workspace');
  assert.equal(searchedMemory.filters.kind, 'decision');
  assert.equal(searchedMemory.filters.query, 'Workspace decision 07');

  const largeMemoryPage = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/memory?scope=all&kind=all&query=&sort=latest&limit=24&offset=0`,
  );
  assert.equal(largeMemoryPage.summary.visibleCount, 24);
  assert.equal(largeMemoryPage.summary.hasPrev, false);
  assert.equal(largeMemoryPage.summary.hasNext, true);
  assert.equal(largeMemoryPage.summary.pageStart, 1);
  assert.equal(largeMemoryPage.summary.pageEnd, 24);

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'ui-harness-browse-contract-smoke',
        missionId: mission.id,
        port,
        documentsSeeded: 30,
        memorySeeded: 30,
        referenceAdoptionReady: executionV1Status.summary.referenceAdoptionReady,
      },
      null,
      2,
    ),
  );
} finally {
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }

  await waitForExit(serverProcess);
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate a local port.'));
        return;
      }
      const { port: resolvedPort } = address;
      server.close(() => resolve(resolvedPort));
    });
    server.on('error', reject);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${url} ${body}`);
  }
  return await response.json();
}

async function fetchJsonResponse(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  return {
    body: text ? JSON.parse(text) : null,
    ok: response.ok,
    status: response.status,
  };
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return await response.text();
}

async function waitForServer(baseUrl, childProcess, { timeoutMs = 20_000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess.exitCode !== null) {
      throw new Error(`UI server exited early: ${serverOutput.stdout}\n${serverOutput.stderr}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for UI server at ${baseUrl}`);
}

async function waitForExit(childProcess, { timeoutMs = 5_000 } = {}) {
  if (childProcess.exitCode !== null) {
    return;
  }

  const startedAt = Date.now();
  while (childProcess.exitCode === null && Date.now() - startedAt < timeoutMs) {
    await delay(100);
  }

  if (childProcess.exitCode === null) {
    childProcess.kill('SIGKILL');
    const forcedStartedAt = Date.now();
    while (childProcess.exitCode === null && Date.now() - forcedStartedAt < 2_000) {
      await delay(100);
    }
  }
}
