import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'user-learning-operator-surface.json',
);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

assert.equal(evidence.schemaVersion, 'personal-ai-agent-user-learning-operator-surface/v1');
assert.equal(evidence.mode, 'user-learning-operator-surface-evidence');
assert.deepEqual(evidence.lifecycle, ['active', 'expired', 'cleared']);
assert.deepEqual(evidence.results, {
  activeVisible: true,
  clearedVisible: true,
  consoleErrorCount: 0,
  expiredVisible: true,
  finalClearButtonCount: 0,
  setButtonCount: 1,
});
assert.deepEqual(evidence.claimBoundary, {
  actualModelTrainingExecuted: false,
  actualUserLearningOperatorSurfaceValidated: true,
  automaticPreferenceLearningValidated: false,
  externalProviderCalls: 'none',
  hostedTenantUserPersonalizationValidated: false,
  multiUserIsolationValidated: false,
  productionReadyClaim: false,
});

for (const value of Object.values(evidence.bindings)) {
  assert.match(value, /^[a-f0-9]{64}$/);
}

const screenshotPath = path.join(repoDir, evidence.artifacts.screenshot);
const screenshot = fs.readFileSync(screenshotPath);
assert.equal(sha256(screenshot), evidence.artifacts.screenshotSha256);
assert.equal(screenshot.readUInt32BE(16), evidence.artifacts.screenshotWidth);
assert.equal(screenshot.readUInt32BE(20), evidence.artifacts.screenshotHeight);
assert.equal(evidence.artifacts.screenshotWidth > 0, true);
assert.equal(evidence.artifacts.screenshotHeight > 0, true);

const evidenceText = fs.readFileSync(evidencePath, 'utf8');
for (const forbidden of [
  '/Users/',
  'api_key=',
  'customerEmail=',
  'Pin the reviewed user decision through the real browser control.',
  'Return to latest user revision through the real browser control.',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `P10 evidence leaked ${forbidden}`);
}

const actionHandlers = readRequiredFile('src/web/action-handlers.mjs');
const server = readRequiredFile('src/web/server.mjs');
const actionInbox = readRequiredFile('src/web/public/lib/action-inbox.js');
const renderFragments = readRequiredFile('src/web/public/lib/render-fragments.js');
const statusLabels = readRequiredFile('src/web/public/lib/status-labels.js');
const selectionService = readRequiredFile('src/core/user-learning-selection-service.mjs');
const localHttpSmoke = readRequiredFile('scripts/smoke-ui-learning-promotion-surface.mjs');

for (const required of [
  'evaluateLearningCandidateTenantAccess(candidateId, auth)',
  'buildLearningSelectionOverrideResponse',
  'setUserLearningSelectionOverride(candidateId',
  'clearUserLearningSelectionOverride(candidateId',
]) {
  assert.equal(actionHandlers.includes(required), true, `P10 action handler missing ${required}`);
}
assert.equal(actionHandlers.includes('clearNote: _clearNote'), true);
assert.equal(actionHandlers.includes('note: _note'), true);
assert.equal(server.includes('/user-selection-override/clear'), true);
assert.equal(server.includes('/user-selection-override'), true);
assert.equal(actionInbox.includes('data-user-learning-selection-override-set'), true);
assert.equal(actionInbox.includes('data-user-learning-selection-override-clear'), true);
assert.equal(renderFragments.includes('사용자 선택 고정'), true);
assert.equal(renderFragments.includes('사용자 고정 해제'), true);
assert.equal(statusLabels.includes('[User learning selection override]'), true);
assert.equal(statusLabels.includes('sourceWorkspaceId'), true);
assert.equal(selectionService.includes('getUserLearningSelectionOverrideReadModel'), true);
assert.equal(selectionService.includes("status: current?.status || 'not-set'"), true);
assert.equal(localHttpSmoke.includes("userLearningSelectionOverrideLifecycle: ['not-set', 'active', 'expired', 'cleared']"), true);
assert.equal(localHttpSmoke.includes('user-learning-selection-override-cleared'), true);

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
const packageJson = JSON.parse(readRequiredFile('package.json'));
const smokeRunner = readRequiredFile('scripts/run-all-smokes.mjs');

assert.equal(developmentPlan.includes('status: local-training-permission-surface-current'), true);
assert.equal(developmentPlan.includes('| P10 User learning operator surface | 완료 |'), true);
assert.equal(readme.includes('npm run smoke:user-learning-operator-surface'), true);
assert.equal(evidenceManifest.includes('User learning operator surface: verified'), true);
assert.equal(
  packageJson.scripts['smoke:user-learning-operator-surface'],
  'node scripts/smoke-user-learning-operator-surface.mjs',
);
assert.equal(
  packageJson.scripts['smoke:user-learning-operator-surface-browser'],
  'node scripts/smoke-user-learning-operator-surface-browser.mjs',
);
assert.equal(smokeRunner.includes("'smoke:user-learning-operator-surface-browser'"), true);

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualUserLearningOperatorSurfaceValidated: true,
  automaticPreferenceLearningValidated: false,
  costFree: true,
  externalProviderCalls: 'none',
  hostedTenantUserPersonalizationValidated: false,
  mode: 'user-learning-operator-surface-smoke',
  multiUserIsolationValidated: false,
  ok: true,
  productionReadyClaim: false,
}, null, 2));

function readRequiredFile(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
