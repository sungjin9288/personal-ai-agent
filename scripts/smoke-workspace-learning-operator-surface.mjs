import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'workspace-learning-operator-surface.json',
);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

assert.equal(evidence.schemaVersion, 'personal-ai-agent-workspace-learning-operator-surface/v1');
assert.equal(evidence.mode, 'workspace-learning-operator-surface-evidence');
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
  actualWorkspaceLearningOperatorSurfaceValidated: true,
  automaticPreferenceLearningValidated: false,
  externalProviderCalls: 'none',
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
  'Pin the reviewed decision through the real browser control.',
  'Return to latest revision through the real browser control.',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `P6 evidence leaked ${forbidden}`);
}

const actionHandlers = fs.readFileSync(path.join(repoDir, 'src', 'web', 'action-handlers.mjs'), 'utf8');
const server = fs.readFileSync(path.join(repoDir, 'src', 'web', 'server.mjs'), 'utf8');
const actionInbox = fs.readFileSync(path.join(repoDir, 'src', 'web', 'public', 'lib', 'action-inbox.js'), 'utf8');
const renderFragments = fs.readFileSync(path.join(repoDir, 'src', 'web', 'public', 'lib', 'render-fragments.js'), 'utf8');
const selectionService = fs.readFileSync(
  path.join(repoDir, 'src', 'core', 'workspace-learning-selection-service.mjs'),
  'utf8',
);

for (const required of [
  'evaluateLearningCandidateTenantAccess(candidateId, auth)',
  'buildLearningSelectionOverrideResponse',
  'setWorkspaceLearningSelectionOverride(candidateId',
  'clearWorkspaceLearningSelectionOverride(candidateId',
]) {
  assert.equal(actionHandlers.includes(required), true, `P6 action handler missing ${required}`);
}
assert.equal(actionHandlers.includes('clearNote: _clearNote'), true);
assert.equal(actionHandlers.includes('note: _note'), true);
assert.equal(server.includes('/workspace-selection-override/clear'), true);
assert.equal(server.includes('/workspace-selection-override'), true);
assert.equal(actionInbox.includes('data-workspace-learning-selection-override-set'), true);
assert.equal(actionInbox.includes('data-workspace-learning-selection-override-clear'), true);
assert.equal(renderFragments.includes('선택 고정'), true);
assert.equal(renderFragments.includes('고정 해제'), true);
assert.equal(selectionService.includes('getWorkspaceLearningSelectionOverrideReadModel'), true);
assert.equal(selectionService.includes("status: current?.status || 'not-set'"), true);

const developmentPlan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const evidenceManifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const smokeRunner = fs.readFileSync(path.join(repoDir, 'scripts', 'run-all-smokes.mjs'), 'utf8');

assert.equal(developmentPlan.includes('status: local-training-permission-surface-current'), true);
assert.equal(developmentPlan.includes('| P6 Workspace learning operator surface | 완료 |'), true);
assert.equal(readme.includes('npm run smoke:workspace-learning-operator-surface'), true);
assert.equal(evidenceManifest.includes('Workspace learning operator surface: verified'), true);
assert.equal(
  packageJson.scripts['smoke:workspace-learning-operator-surface'],
  'node scripts/smoke-workspace-learning-operator-surface.mjs',
);
assert.equal(
  packageJson.scripts['smoke:workspace-learning-operator-surface-browser'],
  'node scripts/smoke-workspace-learning-operator-surface-browser.mjs',
);
assert.equal(smokeRunner.includes("'smoke:workspace-learning-operator-surface-browser'"), true);

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualWorkspaceLearningOperatorSurfaceValidated: true,
  costFree: true,
  externalProviderCalls: 'none',
  mode: 'workspace-learning-operator-surface-smoke',
  ok: true,
  productionReadyClaim: false,
}, null, 2));

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
