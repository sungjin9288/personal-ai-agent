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
  assert.equal(
    appJs.includes(
      'productionReadyClaim must remain false until target provider operations evidence records provider account or architecture approval proof',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'provider fallback runtime audit proof must include mission run --fallback-provider --fallback-policy',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'the stop reason must remain visible in provider events plus mission, workspace, and operator timelines',
    ),
    true,
  );
  assert.doesNotMatch(
    appJs,
    /productionReadyClaim must remain false until target provider operations evidence is approved/,
  );
  assert.equal(appJs.includes('copyProviderFallbackEventAuditPackage'), true);
  assert.equal(appJs.includes('data-release-provider-readiness-package'), true);
  assert.equal(appJs.includes('copy-release-provider-readiness-package'), true);
  assert.equal(appJs.includes('buildReleaseProviderReadinessPackageText'), true);
  assert.equal(appJs.includes('Provider readiness handoff package'), true);
  assert.equal(appJs.includes('Target provider evidence intake'), true);
  assert.equal(appJs.includes('account or architecture approval proof'), true);
  assert.equal(appJs.includes('quota and cost guard proof'), true);
  assert.equal(appJs.includes('model and endpoint pinning proof'), true);
  assert.equal(appJs.includes('blocker closure verification proof'), true);
  assert.equal(appJs.includes('provider fallback runtime audit proof'), true);
  assert.equal(appJs.includes('data and transcript handling proof'), true);
  assert.equal(appJs.includes('remediation and renewal review proof'), true);
  assert.doesNotMatch(appJs, /quota\/cost guard, model\/endpoint pinning/);
  assert.doesNotMatch(appJs, /data\/transcript handling, remediation\/renewal/);
  assert.equal(appJs.includes('getReleaseProviderBlockerActions'), true);
  assert.equal(appJs.includes('isReleaseSharedProviderBlockerAction'), true);
  assert.equal(appJs.includes('Linked provider blockers:'), true);
  assert.equal(appJs.includes('linkedSharedBlockers:'), true);
  assert.equal(appJs.includes('linkedClosureVerifications:'), true);
  assert.equal(appJs.includes('linkedRequiredProofCount:'), true);
  assert.equal(appJs.includes('sharedProviderBlocker:'), true);
  assert.equal(appJs.includes('getReleaseProviderClosureSummary'), true);
  assert.equal(appJs.includes('data-release-provider-closure-summary'), true);
  assert.equal(appJs.includes('data-release-provider-closure-metrics'), true);
  assert.equal(appJs.includes('data-release-provider-closure-count'), true);
  assert.equal(appJs.includes('data-release-provider-required-proof-count'), true);
  assert.equal(appJs.includes('data-release-provider-command-count'), true);
  assert.equal(appJs.includes('data-release-provider-evidence-doc-count'), true);
  assert.equal(appJs.includes('data-release-provider-production-ready-claim'), true);
  assert.equal(appJs.includes('data-release-provider-target-boundary-count'), true);
  assert.equal(appJs.includes('closure verifications'), true);
  assert.equal(appJs.includes('target boundary'), true);
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
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlyRequiredCommands'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-required-commands'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-required-commands'), true);
  assert.equal(appJs.includes('provider-only commands 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence required commands'), true);
  assert.equal(appJs.includes('OpenAI account ownership proof'), true);
  assert.equal(appJs.includes('billing and quota proof'), true);
  assert.equal(appJs.includes('API key and secret injection proof'), true);
  assert.equal(appJs.includes('OPENAI_MODEL model access proof'), true);
  assert.equal(appJs.includes('provider terms and customer approval proof'), true);
  assert.equal(appJs.includes('usage and cost guard proof'), true);
  assert.equal(appJs.includes('fallback and stop-condition proof'), true);
  assert.equal(appJs.includes('renewal and review audit proof'), true);
  assert.equal(
    appJs.includes(
      'provider evidence intake proof with provider id, inclusion decision, account owner, customer/workspace approval, approved target boundary, target environment name, release label, source commit, stop-condition id, evidence owner, reviewer, and decision owner',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'provider owner proof with accountable provider owner, backup owner, account or architecture owner, and customer approval reference',
    ),
    true,
  );
  assert.equal(appJs.includes('provider blocker closure verification proof with blocker state'), true);
  assert.equal(
    appJs.includes(
      'target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, mission id, execution session id, artifact provenance, and operator owner',
    ),
    true,
  );
  assert.equal(appJs.includes('provider fallback runtime audit proof with fallback policy and stop reason'), true);
  assert.equal(
    appJs.includes(
      'provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, operator timeline, provider events --family fallback, action remediate-provider-attention --fallback-policy',
    ),
    true,
  );
  assert.equal(appJs.includes('recoverable-provider-failure-only stop condition proof'), true);
  assert.equal(
    appJs.includes(
      'provider boundary proof with provider id, inclusion decision, account owner, customer/workspace approval, approved target boundary, target environment name, release label, source commit',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'providerReferenceImpact: keep the provider as blocked until target provider evidence intake proof, target provider operations proof, provider blocker disposition, fallback policy, stop reason, recoverable-provider-failure-only decision',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'OpenAI account ownership proof with organization/project owner, project/workspace alias, customer scope, evidence owner, reviewer, and review date',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'Anthropic account ownership proof with account owner, organization/workspace alias, customer scope, evidence owner, reviewer, and review date',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'local provider endpoint ownership proof with approved base URL alias, runtime owner, network boundary, transport, availability owner, health check result, and customer approval',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'Hermes tool-call parsing proof with <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'target Anthropic provider account evidence with account ownership proof for account owner, organization/workspace alias, customer scope, evidence owner, reviewer, and review date',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'billing and credit remediation proof with active billing plan, available credit balance status, payment owner, renewal path, low-balance alert route, remediation ticket, and post-remediation live run reference',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'target Hermes provider architecture evidence with endpoint ownership proof for approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check result',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'target local provider architecture evidence with endpoint ownership proof for approved base URL alias, runtime owner, network boundary, transport, availability owner, health check result, and customer approval',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'provider operations proof with fallback runtime audit policy and stop reason, data transcript handling, remediation renewal evidence, evidence retention, and provider failure containment',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'target-boundary live:execution-v1:local proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference',
    ),
    true,
  );
  assert.equal(appJs.includes('identitySessionEvidence'), true);
  assert.equal(
    appJs.includes(
      'customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback',
    ),
    true,
  );
  assert.equal(appJs.includes('permission propagation proof'), true);
  assert.equal(
    appJs.includes(
      'permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial',
    ),
    true,
  );
  assert.equal(appJs.includes('immutable audit export proof'), true);
  assert.equal(
    appJs.includes(
      'immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum',
    ),
    true,
  );
  assert.equal(appJs.includes('break-glass governance proof'), true);
  assert.equal(
    appJs.includes(
      'break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review',
    ),
    true,
  );
  assert.equal(appJs.includes('support impersonation proof'), true);
  assert.equal(
    appJs.includes(
      'support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff',
    ),
    true,
  );
  assert.equal(appJs.includes('customer access containment proof'), true);
  assert.equal(appJs.includes('migration plan proof'), true);
  assert.equal(appJs.includes('lockout recovery proof'), true);
  assert.equal(
    appJs.includes('target identity session operations evidence with customer IdP onboarding proof'),
    true,
  );
  assert.equal(appJs.includes('hosted identity session architecture approval proof'), true);
  assert.doesNotMatch(
    appJs,
    /customer IdP proof, user lifecycle, session lifecycle, role assignment\/revocation/,
  );
  assert.doesNotMatch(
    appJs,
    /customer IdP, user lifecycle, session lifecycle, role administration, audit export, break-glass, support impersonation, compliance, and retention evidence are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /hosted identity architecture, customer IdP integration, user lifecycle, session controls, authorization, audit, and support boundaries are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /customer IdP administration, user lifecycle, session lifecycle, role administration, audit export, break-glass, and support impersonation evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /hosted identity\/session architecture approval, customer IdP onboarding, user lifecycle, session lifecycle, role administration, audit export, break-glass, support impersonation, compliance, and retention proof/,
  );
  assert.doesNotMatch(
    appJs,
    /customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan proof, rollback proof, lockout recovery proof, customer access containment proof, release artifact hygiene result, and regenerated execution snapshot evidence from the hosted target boundary/,
  );
  assert.doesNotMatch(
    appJs,
    /target identity session operations evidence with customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment proof, release artifact hygiene result, and regenerated execution snapshot evidence is captured/,
  );
  assert.doesNotMatch(
    appJs,
    /hosted identity\/session architecture approval proof, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan proof, rollback proof, lockout recovery proof, customer access containment proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  );
  assert.equal(appJs.includes('tenantIsolationEvidence'), true);
  assert.equal(appJs.includes('tenant identity source proof'), true);
  assert.equal(appJs.includes('customer organization mapping proof'), true);
  assert.equal(appJs.includes('tenant-scoped authorization proof'), true);
  assert.equal(appJs.includes('service-to-service tenant propagation proof'), true);
  assert.equal(appJs.includes('storage partitioning proof'), true);
  assert.equal(appJs.includes('artifact/memory/search/export/index partitioning proof'), true);
  assert.equal(appJs.includes('per-tenant encryption/key ownership proof'), true);
  assert.equal(appJs.includes('backup/restore isolation proof'), true);
  assert.equal(appJs.includes('cross-tenant denial proof'), true);
  assert.equal(appJs.includes('observability/support isolation proof'), true);
  assert.equal(appJs.includes('lifecycle isolation proof'), true);
  assert.equal(appJs.includes('target tenant isolation operations evidence with tenant identity source proof'), true);
  assert.equal(appJs.includes('hosted tenant isolation architecture approval proof'), true);
  assert.equal(
    appJs.includes(
      'tenant identity source proof with source owner, customer organization mapping proof, tenant lifecycle owner, trust policy, source approval, and orphan tenant review',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'tenant identity source proof with tenant source owner, customer organization mapping proof, lifecycle owner, trust policy, and source approval',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'tenant-scoped authorization proof with permission policy, service-to-service tenant propagation proof, stale permission denial, delegated admin boundary, and denial owner',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof with schema/bucket/keyspace boundary and migration safety',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'per-tenant encryption/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'backup/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy',
    ),
    true,
  );
  assert.doesNotMatch(
    appJs,
    /tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant data containment evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /hosted tenant identity, authorization, storage partitioning, encryption\/key ownership, observability, support, backup\/restore, and lifecycle isolation are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /target tenant isolation tests, storage\/encryption proof, backup\/restore non-interference, lifecycle evidence, and negative cross-tenant checks are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /tenant storage partitioning, tenant key ownership, backup\/restore isolation, tenant administration, and cross-tenant denial evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /hosted tenant isolation architecture approval, tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant containment proof/,
  );
  assert.doesNotMatch(
    appJs,
    /tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence from the hosted target boundary/,
  );
  assert.doesNotMatch(
    appJs,
    /target tenant isolation operations evidence with tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence is captured/,
  );
  assert.doesNotMatch(
    appJs,
    /hosted tenant isolation architecture approval proof, tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
  );
  assert.equal(appJs.includes('providerSecretEvidence'), true);
  assert.equal(appJs.includes('approved secret manager platform proof'), true);
  assert.equal(appJs.includes('secret class inventory proof'), true);
  assert.equal(appJs.includes('runtime injection proof'), true);
  assert.equal(appJs.includes('least-privilege access policy proof'), true);
  assert.equal(appJs.includes('rotation and revocation event proof'), true);
  assert.equal(appJs.includes('secret access audit log proof'), true);
  assert.equal(appJs.includes('break-glass governance proof'), true);
  assert.equal(appJs.includes('leakage review proof'), true);
  assert.equal(appJs.includes('credential containment proof'), true);
  assert.equal(
    appJs.includes(
      'approved secret manager platform proof with provider, region, tenancy boundary, owner, and fallback decision',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'secret class inventory proof with provider, environment, owner, rotation cadence, and allowed consumers',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'least-privilege access policy proof with reader, writer, admin, reviewer, service binding, and deny-by-default evidence',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'secret access audit log proof for read, write, rotate, revoke, break-glass, and failed access attempts',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'break-glass governance proof with approval, expiry, monitoring, customer notification, revocation, and post-use review',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'leakage review proof across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'disaster recovery proof for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'secret injection proof for secret manager path or logical secret identifier without the value',
    ),
    true,
  );
  assert.equal(
    appJs.includes('target secret manager operations evidence with secret injection proof'),
    true,
  );
  assert.equal(appJs.includes('target secret manager architecture approval proof'), true);
  assert.doesNotMatch(
    appJs,
    /selected providers, completed provider evidence intake references, provider account\/architecture approvals, target secret manager aliases, rotation proof, revocation path, break-glass approval, and target-boundary live validation evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target secret manager ownership, aliases, access policy, rotation, revocation, break-glass, audit, and deployment injection boundaries are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /target secret injection, rotation proof, revocation path, audit export, and sanitized secret evidence references are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /approved secret manager platform proof, runtime injection proof, rotation and revocation event proof, break-glass governance proof, secret access audit log proof, leakage review proof, and credential containment proof without exposing secret values/,
  );
  assert.doesNotMatch(
    appJs,
    /approved secret manager platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, credential containment proof, release artifact hygiene result, and regenerated execution snapshot evidence without exposing secret values/,
  );
  assert.doesNotMatch(
    appJs,
    /target secret manager operations evidence with secret injection proof, scoped access policy proof, rotation and revocation evidence packet, audit trail proof, break-glass governance proof, leakage review proof, sanitized secret evidence references, release artifact hygiene result, production readiness gate result, and regenerated execution snapshot evidence is captured/,
  );
  assert.doesNotMatch(
    appJs,
    /provider account or architecture approval proof, approved secret manager platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, secret access audit log proof, target-boundary live validation proof, quota guard proof, and fallback disable path proof/,
  );
  assert.doesNotMatch(
    appJs,
    /approved provider accounts, target secret aliases, injection proof, live validation boundary, quota guard, and fallback disable path/,
  );
  assert.doesNotMatch(
    appJs,
    /target OpenAI account ownership, billing\/quota, API key injection, model access, terms, usage guard/,
  );
  assert.doesNotMatch(
    appJs,
    /provider approvals, secret injection references, account ownership, live validation plan, telemetry, fallback, and renewal evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target provider runtime, secret rotation, revocation, live validation, fallback, outage handling, and operations evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /provider account or architecture approval proof, approved secret manager platform proof, runtime injection proof, secret access audit log proof, live validation evidence, fallback evidence, provider operations evidence, and artifact refresh/,
  );
  assert.doesNotMatch(
    appJs,
    /target provider evidence intake, provider operations evidence, and release artifact refresh are accepted/,
  );
  assert.doesNotMatch(
    appJs,
    /provider owner proof, target boundary proof, account or architecture approval proof, target secret injection proof, quota and cost guard proof, model and endpoint pinning proof, archived live validation proof, fallback route proof, failure triage route proof, provider blocker closure verification proof, stop-condition id, release artifact references, and decision owner are present for the target boundary/,
  );
  assert.doesNotMatch(
    appJs,
    /provider inventory proof, provider account or architecture approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof with fallback policy and stop reason, target blocker closure verification proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment evidence are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /provider account or architecture approval proof, approved secret manager platform proof with provider\/region\/tenancy boundary\/owner\/fallback decision, secret class inventory proof with provider\/environment\/owner\/rotation cadence\/allowed consumers, runtime injection proof for CLI\/UI\/worker\/live validation\/clean deployment\/rollback\/support paths, least-privilege access policy proof with reader\/writer\/admin\/reviewer\/service binding\/deny-by-default evidence, secret access audit log proof for read\/write\/rotate\/revoke\/break-glass\/failed access attempts, leakage review proof across logs\/traces\/support packets\/browser artifacts\/screenshots\/release exports\/provider errors, target-boundary live validation proof, quota guard proof, and fallback disable path proof/,
  );
  assert.doesNotMatch(
    appJs,
    /target Anthropic provider account approval, account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary live validation pass, telemetry proof, fallback and stop-condition proof, remediation audit proof, provider operations evidence, release artifact hygiene, and regenerated execution snapshot evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target Hermes provider architecture approval, endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary live validation pass, provider operations evidence, and regenerated execution snapshot evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target local provider architecture approval, endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation pass, release artifact hygiene result, regenerated execution snapshot evidence, and customer acceptance/,
  );
  assert.equal(appJs.includes('observabilitySloEvidence'), true);
  assert.equal(appJs.includes('target observability architecture approval proof'), true);
  assert.equal(
    appJs.includes('target observability architecture approval proof with approved architecture record'),
    true,
  );
  assert.equal(appJs.includes('approved telemetry backend proof'), true);
  assert.equal(
    appJs.includes('approved telemetry backend proof with backend alias, region, tenancy boundary'),
    true,
  );
  assert.equal(appJs.includes('signal inventory proof'), true);
  assert.equal(
    appJs.includes('signal inventory proof for release, provider, mission, approval, runtime, security, support, and incident domains'),
    true,
  );
  assert.equal(appJs.includes('telemetry ingestion proof'), true);
  assert.equal(
    appJs.includes('telemetry ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events'),
    true,
  );
  assert.equal(appJs.includes('alert routing proof'), true);
  assert.equal(
    appJs.includes('alert routing proof with severity mapping, primary route, secondary route, retry policy'),
    true,
  );
  assert.equal(
    appJs.includes('alert acknowledgement proof with responder, acknowledgement timestamp, escalation chain'),
    true,
  );
  assert.equal(appJs.includes('alert delivery receipt proof'), true);
  assert.equal(appJs.includes('staffed on-call coverage proof'), true);
  assert.equal(
    appJs.includes('staffed on-call coverage proof with rota, primary owner, backup owner, handoff rule'),
    true,
  );
  assert.equal(appJs.includes('log and trace retention proof'), true);
  assert.equal(
    appJs.includes('log and trace retention proof with period, storage class, redaction policy, query role'),
    true,
  );
  assert.equal(appJs.includes('customer status communication proof'), true);
  assert.equal(
    appJs.includes('customer status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence'),
    true,
  );
  assert.equal(
    appJs.includes('incident response proof with timeline, mitigation owner, customer impact, review decision'),
    true,
  );
  assert.equal(
    appJs.includes('audit export proof for alert delivery, acknowledgement, customer update, query access'),
    true,
  );
  assert.equal(
    appJs.includes('disaster recovery proof for telemetry backend outage, alert route outage, incident bridge fallback'),
    true,
  );
  assert.equal(appJs.includes('target SLO architecture approval proof'), true);
  assert.equal(appJs.includes('customer-approved SLO/SLA terms proof'), true);
  assert.equal(appJs.includes('error budget policy proof'), true);
  assert.equal(appJs.includes('telemetry measurement proof'), true);
  assert.equal(appJs.includes('staffed on-call response proof'), true);
  assert.equal(appJs.includes('maintenance and degradation proof'), true);
  assert.equal(appJs.includes('service credit proof'), true);
  assert.equal(appJs.includes('missed-SLO containment proof'), true);
  assert.doesNotMatch(
    appJs,
    /SLO\/SLA terms, error budget owner, telemetry backend, telemetry ingestion, alert route, alert acknowledgement, on-call owner, customer status route, incident review, provider outage handling, and missed-SLO containment/,
  );
  assert.doesNotMatch(
    appJs,
    /target log, metric, trace, alert, incident handoff, customer status, and provider outage handling evidence from the approved target boundary/,
  );
  assert.equal(appJs.includes('observability-slo-boundary'), true);
  assert.doesNotMatch(
    appJs,
    /target telemetry backend, log\/trace retention, alert route, staffed on-call, customer status route, SLO\/SLA terms, and incident review/,
  );
  assert.doesNotMatch(
    appJs,
    /target observability architecture approval proof, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call coverage proof, log and trace retention proof, customer status communication proof, incident response proof, incident review proof, audit export proof, disaster recovery proof, target SLO architecture approval proof/,
  );
  assert.equal(appJs.includes('local provider endpoint ownership proof'), true);
  assert.equal(appJs.includes('LOCAL_PROVIDER_MODEL model pinning proof'), true);
  assert.equal(appJs.includes('secret and credential policy proof'), true);
  assert.equal(appJs.includes('runtime lifecycle proof'), true);
  assert.equal(appJs.includes('session and artifact provenance proof'), true);
  assert.equal(appJs.includes('data residency and transcript policy proof'), true);
  assert.equal(appJs.includes('target-boundary local live validation proof'), true);
  assert.doesNotMatch(
    appJs,
    /target local provider architecture approval, endpoint ownership, model pinning, network isolation, data residency, quota\/resource guard, telemetry, fallback evidence, and customer acceptance/,
  );
  assert.doesNotMatch(
    appJs,
    /target local provider ownership, model pinning, network isolation, data residency, resource guard, telemetry, fallback, and customer acceptance/,
  );
  assert.equal(appJs.includes('target observability architecture approval proof'), true);
  assert.equal(appJs.includes('telemetry backend ownership proof'), true);
  assert.equal(
    appJs.includes('telemetry backend ownership proof with backend alias, region, tenancy boundary'),
    true,
  );
  assert.equal(appJs.includes('metric log trace and audit event boundary proof'), true);
  assert.equal(
    appJs.includes('metric log trace and audit event boundary proof with sample references, ingestion timestamp, pipeline owner'),
    true,
  );
  assert.equal(appJs.includes('alert delivery receipt proof'), true);
  assert.equal(appJs.includes('staffed on-call coverage proof'), true);
  assert.equal(
    appJs.includes('target observability operations evidence with telemetry ingestion proof for metrics, logs, traces'),
    true,
  );
  assert.equal(appJs.includes('trace and log retention proof'), true);
  assert.equal(
    appJs.includes('trace and log retention proof with period, storage class, redaction policy, query role'),
    true,
  );
  assert.equal(appJs.includes('staffed on-call routing and acknowledgement proof'), true);
  assert.equal(
    appJs.includes('staffed on-call routing and acknowledgement proof with rota, primary and backup owner'),
    true,
  );
  assert.equal(appJs.includes('target SLO/SLA architecture approval proof'), true);
  assert.equal(
    appJs.includes('target SLO/SLA architecture approval proof with approved architecture record'),
    true,
  );
  assert.equal(appJs.includes('customer-approved SLO/SLA terms proof'), true);
  assert.equal(
    appJs.includes('customer-approved SLO/SLA terms proof with availability target, latency target, error rate target'),
    true,
  );
  assert.equal(appJs.includes('error budget policy proof'), true);
  assert.equal(
    appJs.includes('error budget policy proof with measurement window, budget owner, burn-rate threshold'),
    true,
  );
  assert.equal(appJs.includes('provider outage playbook proof'), true);
  assert.equal(
    appJs.includes('provider outage playbook proof with provider health signal, fallback decision, retry/disable policy'),
    true,
  );
  assert.equal(appJs.includes('target SLO measurements proof'), true);
  assert.equal(
    appJs.includes('target SLO measurements proof for branch, commit, release label, approved target boundary'),
    true,
  );
  assert.equal(appJs.includes('staffed on-call response proof'), true);
  assert.equal(
    appJs.includes('staffed on-call response proof with rota, primary owner, secondary owner, handoff rule'),
    true,
  );
  assert.equal(
    appJs.includes('service credit proof with legal/commercial owner, contractual escalation path, customer approval'),
    true,
  );
  assert.equal(
    appJs.includes('missed-SLO containment proof with detection signal, customer impact rule, escalation owner'),
    true,
  );
  assert.equal(
    appJs.includes('alert acknowledgement proof with severity mapping, alert route, acknowledgement SLA, escalation timeout'),
    true,
  );
  assert.equal(
    appJs.includes('target SLO operations evidence for customer-approved SLO/SLA terms proof with availability target'),
    true,
  );
  assert.equal(
    appJs.includes('target observability operations evidence for alert delivery proof, staffed on-call routing and acknowledgement proof'),
    true,
  );
  assert.equal(
    appJs.includes('target observability operations evidence for alert delivery proof, staffed on-call routing and acknowledgement proof with route, severity, delivery receipt'),
    true,
  );
  assert.equal(
    appJs.includes('missed-ack rule, paging fallback, handoff log, escalation chain'),
    true,
  );
  assert.equal(
    appJs.includes('target support operations evidence for on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp'),
    true,
  );
  assert.equal(appJs.includes('missed-SLO containment proof'), true);
  assert.doesNotMatch(
    appJs,
    /target SLO operations evidence for alert acknowledgement proof with severity mapping, alert route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, and audit record; staffed on-call response proof with rota, primary owner, secondary owner, handoff rule, timezone coverage, absence handling, and escalation chain; target observability operations evidence for alert delivery proof, staffed on-call routing and acknowledgement proof with acknowledgement timestamp and escalation chain/,
  );
  assert.doesNotMatch(
    appJs,
    /target SLO measurements proof, customer-approved SLO\/SLA terms proof, error budget review proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance and degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof/,
  );
  assert.doesNotMatch(
    appJs,
    /target telemetry backend, log\/metric\/trace boundaries, alert routing, ownership, retention, and customer status paths are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /target telemetry ingestion, alert acknowledgement, incident handoff, customer communication, provider outage handling, and missed-alert containment are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /target SLO\/SLA terms, error budget owner, customer status path, alert ownership, incident review, and operational boundary are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /target SLO measurements, error budget review, alert route, incident response, customer notification, and missed-SLO containment evidence are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /named on-call owner, alert acknowledgement, escalation route, customer communication owner, missed-alert containment, and incident review cadence/,
  );
  assert.equal(appJs.includes('target data lifecycle architecture approval proof'), true);
  assert.equal(
    appJs.includes('target data lifecycle architecture approval proof with approved architecture record'),
    true,
  );
  assert.equal(appJs.includes('customer-approved data class matrix proof'), true);
  assert.equal(
    appJs.includes('customer-approved data class matrix proof with legal basis, owner, retention window, exportability, delete eligibility, exception policy, legal hold owner, and customer approval'),
    true,
  );
  assert.equal(appJs.includes('target retention configuration proof'), true);
  assert.equal(appJs.includes('provider transcript handling proof'), true);
  assert.equal(
    appJs.includes('target retention operations evidence with customer-approved data class proof for branch, commit, release label, approved target boundary'),
    true,
  );
  assert.equal(
    appJs.includes(
      'target retention configuration proof with storage boundary, enforcement timestamp, policy owner, reviewer, exception workflow, audit record, and rollback route',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'export approval proof with request id, requester, approver, package scope, delivery boundary, encryption mode, package hash, reviewer, customer receipt, and export owner',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'delete workflow proof with request id, authorization owner, confirmation control, execution owner, storage scope, timestamp, result, rollback route, and audit record',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'provider transcript handling proof with provider-side retention, deletion or non-retention evidence, exception review, customer disclosure, evidence owner, and next review date',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'post-delete absence proof with runtime, tenant storage, backup, provider, export package, support packet, release artifact boundary checks, checker owner, timestamp, and absence result',
    ),
    true,
  );
  assert.equal(
    appJs.includes('audit history proof with actor, customer or tenant alias, lifecycle action, before/after state, timestamp, checksum or equivalent integrity proof, and retention owner'),
    true,
  );
  assert.equal(
    appJs.includes('lifecycle exception review proof with exception owner, accepted-risk decision, customer handoff decision, residual risk, next review date, and lifecycle containment plan'),
    true,
  );
  assert.equal(appJs.includes('backup architecture proof'), true);
  assert.equal(appJs.includes('backup schedule execution proof'), true);
  assert.equal(appJs.includes('encrypted backup storage proof'), true);
  assert.equal(appJs.includes('backup key ownership proof'), true);
  assert.equal(appJs.includes('backup expiry/deletion proof'), true);
  assert.equal(appJs.includes('disaster recovery proof'), true);
  assert.equal(
    appJs.includes(
      'target backup operations evidence for backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'encrypted backup storage proof with storage class, encryption mode, retention class, location alias, and access audit',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry/delete evidence, and access audit',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'restore validation proof with objective, duration, restored data class inventory, checksum or integrity proof, tenant isolation, cross-tenant denial, and validation owner',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'backup expiry/deletion proof with expiry schedule, delete proof, post-delete absence check, and audit record',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail',
    ),
    true,
  );
  assert.doesNotMatch(
    appJs,
    /retention classes, export approval, delete execution proof, provider transcript policy, post-delete absence evidence, backup schedule, restore validation, backup expiry\/deletion, and disaster recovery evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target retention classes, export\/delete boundaries, provider transcript policy, data residency, audit, and lifecycle controls are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /target data lifecycle architecture approval proof, customer-approved data class matrix proof, target retention configuration proof, export request proof, delete request proof, provider transcript policy proof, post-delete absence proof, backup architecture proof, restore validation proof, backup key ownership proof, disaster recovery proof, legal hold proof, delete conflict containment proof, provider transcript exception proof, customer communication containment proof, release artifact hygiene result, and regenerated execution snapshot evidence are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /target retention enforcement, export approval, delete execution, post-delete absence proof, and retention audit evidence are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /target retention operations evidence with customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene result, and regenerated execution snapshot evidence is captured/,
  );
  assert.doesNotMatch(
    appJs,
    /customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, audit history proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target backup schedule, restore validation, tenant isolation, expiry\/deletion, disaster recovery, and backup audit evidence are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /target backup operations evidence with backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene result, and regenerated execution snapshot evidence is captured/,
  );
  assert.doesNotMatch(
    appJs,
    /backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target retention classes, export approval, delete execution, provider transcript policy, post-delete absence proof, and audit evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /customer-approved data classes, export\/delete proof, provider transcript policy, post-delete absence, backup expiry, restore validation, and disaster recovery scope/,
  );
  assert.doesNotMatch(
    appJs,
    /target backup schedule, restore validation, tenant isolation, expiry\/deletion, disaster recovery, and backup audit evidence/,
  );
  assert.equal(appJs.includes('target support architecture approval proof'), true);
  assert.equal(
    appJs.includes('target support architecture approval proof with approved support architecture record'),
    true,
  );
  assert.equal(
    appJs.includes('staffed support coverage proof with support owner, coverage window, primary rota'),
    true,
  );
  assert.equal(
    appJs.includes('support queue routing proof with ticketing system, queue identifier, severity mapping'),
    true,
  );
  assert.equal(
    appJs.includes('customer communication proof with approved channel, update cadence, message owner'),
    true,
  );
  assert.equal(
    appJs.includes('ticket audit history proof with lifecycle history, assignment history, customer-visible update history'),
    true,
  );
  assert.equal(
    appJs.includes('escalation ownership proof with incident commander, engineering escalation, provider escalation'),
    true,
  );
  assert.equal(
    appJs.includes('incident review cadence proof with review cadence, timeline, mitigation owner'),
    true,
  );
  assert.equal(
    appJs.includes('on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp'),
    true,
  );
  assert.equal(
    appJs.includes('support data handling proof with secret redaction, customer data redaction, provider transcript handling'),
    true,
  );
  assert.equal(appJs.includes('staffing model proof'), true);
  assert.equal(appJs.includes('support queue platform proof'), true);
  assert.equal(appJs.includes('severity routing proof'), true);
  assert.equal(appJs.includes('customer communication boundary proof'), true);
  assert.equal(appJs.includes('ticket audit and retention proof'), true);
  assert.equal(appJs.includes('incident commander ownership proof'), true);
  assert.equal(appJs.includes('escalation and backup coverage proof'), true);
  assert.equal(appJs.includes('support data handling proof'), true);
  assert.equal(appJs.includes('incident review governance proof'), true);
  assert.equal(appJs.includes('missed-acknowledgement containment proof'), true);
  assert.equal(appJs.includes('queue-misrouting containment proof'), true);
  assert.equal(appJs.includes('unstaffed-escalation containment proof'), true);
  assert.equal(appJs.includes('staffed support coverage proof'), true);
  assert.equal(appJs.includes('support queue routing proof'), true);
  assert.equal(appJs.includes('ticket audit history proof'), true);
  assert.equal(appJs.includes('escalation ownership proof'), true);
  assert.equal(appJs.includes('incident review cadence proof'), true);
  assert.doesNotMatch(
    appJs,
    /target support architecture approval, support queue, staffed coverage, escalation owner, ticket audit trail, customer communication, on-call handoff, and incident review cadence/,
  );
  assert.doesNotMatch(
    appJs,
    /target support queue, escalation policy, coverage model, ownership, customer communication, and incident review boundaries are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /target support staffing, ticket flow, escalation, audit trail, on-call handoff, customer communication, and incident review evidence are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /support queue, coverage owner, escalation flow, ticket audit trail, customer communication, on-call handoff, and incident review evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target support architecture approval proof, staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /support owner, staffed coverage, support queue routing, customer communication, ticket audit trail, escalation owner, and incident review cadence/,
  );
  assert.equal(appJs.includes('target deployment contract reference proof'), true);
  assert.equal(appJs.includes('approved target boundary proof'), true);
  assert.equal(
    appJs.includes('target deployment boundary proof with approved target environment name, company/workspace scope, deployment owner'),
    true,
  );
  assert.equal(
    appJs.includes('deployment profile decision proof with selected profile, approved architecture decision, network boundary, runtime root alias'),
    true,
  );
  assert.equal(appJs.includes('source provenance proof'), true);
  assert.equal(
    appJs.includes('source provenance proof with branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval'),
    true,
  );
  assert.equal(appJs.includes('artifact registry proof'), true);
  assert.equal(
    appJs.includes('artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof'),
    true,
  );
  assert.equal(appJs.includes('dependency installation proof'), true);
  assert.equal(
    appJs.includes('dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner'),
    true,
  );
  assert.equal(appJs.includes('runtime bootstrap proof'), true);
  assert.equal(
    appJs.includes('runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner'),
    true,
  );
  assert.equal(appJs.includes('secret injection proof'), true);
  assert.equal(appJs.includes('environment boundary proof'), true);
  assert.equal(
    appJs.includes('environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, rollback owner, and customer/workspace scope'),
    true,
  );
  assert.equal(appJs.includes('migration and data readiness proof'), true);
  assert.equal(appJs.includes('smoke and health verification proof'), true);
  assert.equal(
    appJs.includes('smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results'),
    true,
  );
  assert.equal(appJs.includes('rollback and recovery proof'), true);
  assert.equal(
    appJs.includes('rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision'),
    true,
  );
  assert.equal(appJs.includes('release approval proof'), true);
  assert.equal(
    appJs.includes('release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner'),
    true,
  );
  assert.equal(appJs.includes('clean checkout proof'), true);
  assert.equal(appJs.includes('command replay proof'), true);
  assert.equal(appJs.includes('artifact synchronization proof'), true);
  assert.equal(appJs.includes('production-like environment proof'), true);
  assert.equal(
    appJs.includes('clean deployment release evidence with clean checkout proof, command replay proof, artifact synchronization proof, production-like environment proof, rollback readiness proof'),
    true,
  );
  assert.equal(
    appJs.includes('production-like release drill evidence with target gates proof, provider checks proof, execution snapshot proof'),
    true,
  );
  assert.equal(appJs.includes('artifact-sync-current proof'), true);
  assert.equal(
    appJs.includes('execution-v1 artifact proof with evidence, closeout, handoff, immutable snapshot, visual manifest, archived live validation status'),
    true,
  );
  assert.equal(appJs.includes('misleading production-ready claim containment proof'), true);
  assert.equal(
    appJs.includes('target evidence approval packet proof with completed target evidence capture template'),
    true,
  );
  assert.equal(
    appJs.includes(
      'sanitized submission packet and evidence register proof with redaction note, retention class, and sha256 or signed export reference',
    ),
    true,
  );
  assert.equal(appJs.includes('boundary consistency map proof'), true);
  assert.equal(appJs.includes('command rerun log proof'), true);
  assert.equal(
    appJs.includes(
      'reviewer decision proof with reviewer, decision owner, review date, decision state, accepted risk ids, rejected claims, allowed claim text, and productionReadyClaim decision',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'reviewer decision record with reviewer, decision owner, review date, decision state, accepted risk ids, rejected claims, allowed claim text, residual blockers reviewed, command rerun log review, release refresh evidence review, productionReadyClaim decision, and next review date',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'blocker disposition register proof with owner, current state, required closing evidence, allowed claim impact, and next verification command',
    ),
    true,
  );
  assert.equal(
    appJs.includes(
      'release refresh evidence proof with verified source commit, generated time, result, repository-relative artifact path',
    ),
    true,
  );
  assert.equal(appJs.includes('repository-relative file inventory'), true);
  assert.equal(appJs.includes('sha256 manifest proof'), true);
  assert.equal(appJs.includes('machine-local path scan proof'), true);
  assert.equal(appJs.includes('secret-like value scan proof'), true);
  assert.equal(appJs.includes('unsupported evidence leakage scan proof'), true);
  assert.doesNotMatch(
    appJs,
    /target deployment contract reference, release label, deployment run id or equivalent, runtime\/dependency proof, rollback proof, and clean checkout evidence/,
  );
  assert.doesNotMatch(
    appJs,
    /target clean deployment operations evidence, clean deployment run, dependency\/runtime proof, release snapshot, pilot\/export package, artifact hygiene result, rollback proof, and failed-deployment containment/,
  );
  assert.doesNotMatch(
    appJs,
    /target clean checkout, dependency\/runtime, environment config, release snapshot, rollback, and failure containment boundaries are defined/,
  );
  assert.doesNotMatch(
    appJs,
    /target clean deployment run, dependency\/runtime proof, release snapshot, rollback, failed-deployment containment, and run owner evidence are captured/,
  );
  assert.doesNotMatch(
    appJs,
    /target deployment boundary, runtime root alias, release label, dependency proof, rollback owner, and contract references are present/,
  );
  assert.doesNotMatch(
    appJs,
    /target deployment boundary proof, approved environment name proof, deployment profile proof, runtime root alias proof, source provenance proof, artifact registry proof, dependency installation proof, runtime bootstrap proof, target secret injection proof, environment boundary proof, rollback owner proof, release label proof, target evidence packet reference proof, production readiness blocker proof, and contract references are present/,
  );
  assert.doesNotMatch(
    appJs,
    /clean checkout deployment, dependency proof, release snapshot, rollback, and artifact hygiene evidence remain current for the release review/,
  );
  assert.doesNotMatch(
    appJs,
    /clean checkout deployment, dependency\/runtime proof, rollback proof, release snapshot, export package, hygiene report, and production readiness gate result/,
  );
  assert.doesNotMatch(
    appJs,
    /production-like release rehearsal, target gates, provider checks, snapshot, rollback, and handoff evidence remain current/,
  );
  assert.doesNotMatch(
    appJs,
    /pilot\/export package inventory, bundle hash, file count, hygiene state, and verified commit references remain current/,
  );
  assert.doesNotMatch(
    appJs,
    /release artifacts are scanned for machine-local paths, secret-like values, and unsupported evidence leakage before reviewer acceptance/,
  );
  assert.doesNotMatch(
    appJs,
    /clean checkout deployment, dependency\/runtime proof, environment config, release snapshot, rollback proof, and failed deployment containment for the target boundary/,
  );
  assert.doesNotMatch(
    appJs,
    /completed target evidence capture template, sanitized submission packet, boundary map, command log, reviewer decision, blocker disposition, release refresh evidence, and production readiness gate references are present/,
  );
  assert.doesNotMatch(
    appJs,
    /accepted risks, residual blockers, decision owner, evidence owner, next review date, and explicit productionReadyClaim decision/,
  );
  assert.doesNotMatch(
    appJs,
    /accepted target evidence packet, reviewer decision, blocker disposition register, release refresh evidence, artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate result/,
  );
  assert.equal(appJs.includes('Required commands package:'), true);
  assert.equal(appJs.includes('Command rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceProductionGapText'), true);
  assert.equal(appJs.includes('Target evidence production gap guard'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-production-gap'), true);
  assert.equal(appJs.includes('data-release-target-evidence-production-gap'), true);
  assert.equal(appJs.includes('Production gap guard:'), true);
  assert.equal(appJs.includes('Production gap rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceExceptionRegisterText'), true);
  assert.equal(appJs.includes('Target evidence accepted-scope exception register'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-exception-register'), true);
  assert.equal(appJs.includes('data-release-target-evidence-exception-register'), true);
  assert.equal(appJs.includes('Accepted-scope exception register:'), true);
  assert.equal(appJs.includes('Accepted-scope exception rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceRiskDecisionRegisterText'), true);
  assert.equal(appJs.includes('Target evidence accepted risk decision register'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-risk-decision-register'), true);
  assert.equal(appJs.includes('data-release-target-evidence-risk-decision-register'), true);
  assert.equal(appJs.includes('Accepted risk decision register:'), true);
  assert.equal(appJs.includes('Accepted risk decision rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceProviderEvidenceReferencesText'), true);
  assert.equal(appJs.includes('Target evidence provider evidence references'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-references'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-references'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlyProviderEvidenceReferences'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-provider-references'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-provider-references'), true);
  assert.equal(appJs.includes('provider-only refs 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence provider references'), true);
  assert.equal(appJs.includes('Provider evidence references:'), true);
  assert.equal(appJs.includes('Provider evidence reference rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceResidualBlockersText'), true);
  assert.equal(appJs.includes('Target evidence residual production blocker guard'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-residual-blockers'), true);
  assert.equal(appJs.includes('data-release-target-evidence-residual-blockers'), true);
  assert.equal(appJs.includes('Residual production blockers:'), true);
  assert.equal(appJs.includes('Residual production blocker rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceClosureRulesText'), true);
  assert.equal(appJs.includes('Target evidence closure rules guard'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-closure-rules'), true);
  assert.equal(appJs.includes('data-release-target-evidence-closure-rules'), true);
  assert.equal(appJs.includes('Closure rules:'), true);
  assert.equal(appJs.includes('Closure rule rows:'), true);
  assert.equal(appJs.includes('showCopyPromptFallback'), true);
  assert.equal(appJs.includes("return { method: prompted ? 'prompt' : 'unavailable' };"), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceSubmissionManifestText'), true);
  assert.equal(appJs.includes('Target evidence submission manifest'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-submission-manifest'), true);
  assert.equal(appJs.includes('data-release-target-evidence-submission-manifest'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlySubmissionManifest'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-submission-manifest'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-submission-manifest'), true);
  assert.equal(appJs.includes('provider-only manifest 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence submission manifest'), true);
  assert.equal(appJs.includes('Submission manifest template:'), true);
  assert.equal(appJs.includes('Manifest fields:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceSanitizedRegisterText'), true);
  assert.equal(appJs.includes('Target evidence sanitized register'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-sanitized-register'), true);
  assert.equal(appJs.includes('data-release-target-evidence-sanitized-register'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlySanitizedRegister'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-sanitized-register'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-sanitized-register'), true);
  assert.equal(appJs.includes('provider-only sanitized 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence sanitized register'), true);
  assert.equal(appJs.includes('Sanitized evidence register template:'), true);
  assert.equal(appJs.includes('Evidence register rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceBoundaryConsistencyMapText'), true);
  assert.equal(appJs.includes('Target evidence boundary consistency map'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-boundary-map'), true);
  assert.equal(appJs.includes('data-release-target-evidence-boundary-map'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlyBoundaryMap'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-boundary-map'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-boundary-map'), true);
  assert.equal(appJs.includes('provider-only boundary 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence boundary consistency map'), true);
  assert.equal(appJs.includes('Boundary consistency map template:'), true);
  assert.equal(appJs.includes('Boundary consistency rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceCommandRerunLogText'), true);
  assert.equal(appJs.includes('Target evidence command rerun log'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-command-rerun-log'), true);
  assert.equal(appJs.includes('data-release-target-evidence-command-rerun-log'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlyCommandRerunLog'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-command-rerun-log'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-command-rerun-log'), true);
  assert.equal(appJs.includes('provider-only command log 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence command rerun log'), true);
  assert.equal(appJs.includes('Command rerun log template:'), true);
  assert.equal(appJs.includes('Command rerun rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceReviewerDecisionRecordText'), true);
  assert.equal(appJs.includes('Target evidence reviewer decision record'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-decision-record'), true);
  assert.equal(appJs.includes('data-release-target-evidence-decision-record'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlyDecisionRecord'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-decision-record'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-decision-record'), true);
  assert.equal(appJs.includes('provider-only decision 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence reviewer decision record'), true);
  assert.equal(appJs.includes('Reviewer decision checklist:'), true);
  assert.equal(appJs.includes('Reviewer decision record template:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceBlockerDispositionRegisterText'), true);
  assert.equal(appJs.includes('Target evidence blocker disposition register'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-blocker-disposition'), true);
  assert.equal(appJs.includes('data-release-target-evidence-blocker-disposition'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlyBlockerDispositionRegister'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-blocker-disposition'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-blocker-disposition'), true);
  assert.equal(appJs.includes('provider-only disposition 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence blocker disposition register'), true);
  assert.equal(appJs.includes('Blocker disposition register template:'), true);
  assert.equal(appJs.includes('Disposition rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceReleaseRefreshEvidenceText'), true);
  assert.equal(appJs.includes('Target evidence release refresh evidence'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-release-refresh'), true);
  assert.equal(appJs.includes('data-release-target-evidence-release-refresh'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlyReleaseRefreshEvidence'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-release-refresh'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-release-refresh'), true);
  assert.equal(appJs.includes('provider-only refresh 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence release refresh evidence'), true);
  assert.equal(appJs.includes('Release refresh evidence template:'), true);
  assert.equal(appJs.includes('Release refresh artifact rows:'), true);
  assert.equal(appJs.includes('buildReleaseTargetEvidenceIntakePacketText'), true);
  assert.equal(appJs.includes('Target environment evidence intake submission packet'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-intake-packet'), true);
  assert.equal(appJs.includes('data-release-target-evidence-intake-packet'), true);
  assert.equal(appJs.includes('releaseBlockerApiLink:'), true);
  assert.equal(appJs.includes('copyReleaseTargetEvidenceProviderOnlyIntakePacket'), true);
  assert.equal(appJs.includes('copy-release-target-evidence-provider-only-intake-packet'), true);
  assert.equal(appJs.includes('data-release-target-evidence-provider-only-intake-packet'), true);
  assert.equal(appJs.includes('provider-only target packet 복사'), true);
  assert.equal(appJs.includes('provider-only target evidence packet'), true);
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
  assert.equal(appJs.includes('data-release-current-open-blocker-provider-count'), true);
  assert.equal(appJs.includes('releaseBlockerCategoryFilter'), true);
  assert.equal(appJs.includes('releaseBlockerOwnerFilter'), true);
  assert.equal(appJs.includes('releaseBlockerProviderFilter'), true);
  assert.equal(appJs.includes('rbcategory'), true);
  assert.equal(appJs.includes('rbowner'), true);
  assert.equal(appJs.includes('rbprovider'), true);
  assert.equal(appJs.includes('data-ui-provider'), true);
  assert.equal(appJs.includes('blockerProviderFilter'), true);
  assert.equal(appJs.includes('doesReleaseBlockerActionMatchProvider(blockerAction, normalizedProvider)'), true);
  assert.equal(appJs.includes('isReleaseSharedProviderBlockerAction(blockerAction)'), true);
  assert.equal(appJs.includes('releaseBlockerProviderFilter: blockerProvider'), true);
  assert.equal(appJs.includes('provider만 유지'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty-provider'), true);
  assert.equal(appJs.includes('filter-release-blockers'), true);
  assert.equal(appJs.includes('clear-release-blocker-filter'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-summary'), true);
  assert.equal(appJs.includes('hasEmptyBlockerFilter'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty-category'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty-owner'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-empty-clear'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-summary'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-closure-count'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-required-proof-count'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-command-count'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-evidence-count'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-slice-top'), true);
  assert.equal(appJs.includes('getReleaseBlockerSliceSummary'), true);
  assert.equal(appJs.includes('getReleaseBlockerClosureVerification'), true);
  assert.equal(appJs.includes('getReleaseBlockerRequiredCommands'), true);
  assert.equal(appJs.includes('getReleaseBlockerRequiredEvidenceDocs'), true);
  assert.equal(appJs.includes('getReleaseBlockerRequiredProofs'), true);
  assert.equal(appJs.includes('buildReleaseBlockerSliceSummaryText'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-summary-copy'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-summary'), true);
  assert.equal(appJs.includes('Release blocker slice summary'), true);
  assert.equal(appJs.includes('buildReleaseBlockerApiUrl'), true);
  assert.equal(appJs.includes('/api/execution-v1/release-blockers'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-api-link'), true);
  assert.equal(appJs.includes('copy-release-blocker-api-link'), true);
  assert.equal(appJs.includes('includeShared'), true);
  assert.equal(appJs.includes("params.set('includeShared', 'false')"), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-provider-only-api-link'), true);
  assert.equal(appJs.includes('copy-release-blocker-provider-only-api-link'), true);
  assert.equal(appJs.includes('provider-only API 링크 복사'), true);
  assert.equal(appJs.includes('includeSharedProviderOperations:'), true);
  assert.equal(appJs.includes('getReleaseBlockerFilteredCopyScope'), true);
  assert.equal(appJs.includes('isReleaseBlockerActionVisibleForCopyScope'), true);
  assert.equal(appJs.includes('provider: normalizedProvider'), true);
  assert.equal(
    (appJs.match(/getReleaseBlockerFilteredCopyScope\(\{ category, owner, provider \}\)/g) || []).length >= 20,
    true,
  );
  assert.equal((appJs.match(/`- provider: \$\{normalizedProvider \|\| 'all'\}`/g) || []).length >= 20, true);
  assert.equal((appJs.match(/provider: normalizedProvider/g) || []).length >= 25, true);
  assert.equal(appJs.includes('apiLink:'), true);
  assert.equal(appJs.includes('closureVerificationCount:'), true);
  assert.equal(appJs.includes('requiredProofCount:'), true);
  assert.equal(appJs.includes('closure verifications'), true);
  assert.equal(appJs.includes('required proofs'), true);
  assert.equal(appJs.includes('buildReleaseBlockerSlicePackageText'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-package'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-package'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-provider-only-package'), true);
  assert.equal(appJs.includes('copy-release-blocker-provider-only-package'), true);
  assert.equal(appJs.includes('provider-only package 복사'), true);
  assert.equal(appJs.includes('includeShared: false'), true);
  assert.equal(appJs.includes('Release blocker slice package'), true);
  assert.equal(appJs.includes('buildReleaseBlockerSliceClosureChecklistText(buildOptions)'), true);
  assert.equal(appJs.includes('buildReleaseBlockerSliceClosureChecklistText'), true);
  assert.equal(appJs.includes('data-release-current-open-blocker-filter-closure-checklist'), true);
  assert.equal(appJs.includes('copy-release-blocker-filter-closure-checklist'), true);
  assert.equal(appJs.includes('Release blocker slice closure checklist'), true);
  assert.equal(appJs.includes('Blocker checklist:'), true);
  assert.equal(appJs.includes('targetBoundaryRequired:'), true);
  assert.equal(appJs.includes('sameBoundaryRequired:'), true);
  assert.equal(appJs.includes('productionReadyClaimAllowed:'), true);
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
  assert.equal(appJs.includes('Closure rules:'), true);
  assert.equal(appJs.includes('Required proofs:'), true);
  assert.equal(appJs.includes('Forbidden evidence:'), true);
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
  assert.equal(executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.closureVerificationCount, 1);
  assert.equal(executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.closureVerificationCommandCount, 1);
  assert.equal(executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.closureVerificationEvidenceDocCount, 1);
  assert.equal(executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.closureVerificationTargetBoundaryCount, 1);
  assert.equal(
    executionV1Status.releaseReadiness.currentOpenBlockerActionSummary.closureVerificationProductionReadyBlockedCount,
    1,
  );
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
  const fixtureBlockerAction = executionV1Status.releaseReadiness.currentOpenBlockerActions[0];
  assert.equal(fixtureBlockerAction.closureVerification.blockerId, fixtureBlockerAction.id);
  assert.equal(fixtureBlockerAction.closureVerification.targetBoundaryRequired, true);
  assert.equal(fixtureBlockerAction.closureVerification.sameBoundaryRequired, true);
  assert.equal(fixtureBlockerAction.closureVerification.productionReadyClaimAllowed, false);
  assert.equal(
    fixtureBlockerAction.closureVerification.requiredCommands.some(
      (command) => command.command === 'npm run smoke:production-readiness-gate',
    ),
    true,
    JSON.stringify(fixtureBlockerAction.closureVerification),
  );
  assert.equal(
    fixtureBlockerAction.closureVerification.requiredEvidenceDocs.some(
      (doc) => doc.path === 'docs/release-readiness-v1.md' && doc.exists === true,
    ),
    true,
    JSON.stringify(fixtureBlockerAction.closureVerification),
  );
  assert.equal(
    fixtureBlockerAction.closureVerification.requiredProofs.includes('same-boundary target evidence packet proof'),
    true,
    JSON.stringify(fixtureBlockerAction.closureVerification),
  );
  assert.equal(
    fixtureBlockerAction.evidenceDocs.some(
      (doc) =>
        doc.path === 'docs/release-readiness-v1.md' &&
        doc.exists === true &&
        doc.href === '/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md',
    ),
    true,
    JSON.stringify(fixtureBlockerAction.evidenceDocs),
  );
  const releaseReadinessDoc = await fetchText(`${baseUrl}/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md`);
  assert.match(releaseReadinessDoc, /Release Readiness v1/);
  assert.equal(
    fixtureBlockerAction.commands.some(
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
  assert.equal(appJs.includes('preflightStopCondition'), true);
  assert.equal(appJs.includes('targetStopCondition'), true);
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
  assert.equal(aggregatePreflight.preflight.stopConditionCount, 4);
  assert.deepEqual(
    aggregatePreflight.preflight.providers.map((entry) => [
      entry.provider,
      entry.status,
      entry.missingEnvCommand,
      entry.stopConditionId,
      entry.targetStopConditionId,
    ]),
    [
      ['openai', 'ready-but-missing-env', 'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai', 'openai-live-env-missing', 'target-openai-provider-account-approval-missing'],
      ['anthropic', 'ready-but-missing-env', 'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic', 'anthropic-live-env-missing', 'anthropic-live-validation-missing-or-failed'],
      ['local', 'ready-but-missing-env', 'export LOCAL_PROVIDER_MODEL="..." && npm run live:execution-v1:local', 'local-live-env-missing', 'target-local-provider-approval-missing'],
      ['hermes', 'ready-but-missing-env', 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes', 'hermes-live-env-missing', 'target-hermes-provider-approval-missing'],
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
