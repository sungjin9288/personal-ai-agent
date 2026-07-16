import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertUserLearningOperatorOverrideEvidence,
  buildUserLearningOperatorOverrideEvidence,
} from '../src/core/user-learning-operator-override.mjs';
import { selectUserLearningMemory } from '../src/core/user-learning-selection.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(
  readRequiredFile('fixtures/user-learning-operator-override-cases-v1.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/user-learning-operator-override.json'),
);

assert.equal(
  fixture.schemaVersion,
  'personal-ai-agent-user-learning-operator-override-cases/v1',
);
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.cases.length, 1);

assertUserLearningOperatorOverrideEvidence(evidence);
assert.deepEqual(evidence, buildUserLearningOperatorOverrideEvidence(evidence));
assert.equal(evidence.actualUserLearningOperatorOverrideValidated, true);
assert.equal(Object.values(evidence.results).every(Boolean), true);

const older = evidence.promotions.older;
const newer = evidence.promotions.newer;
const phases = evidence.phases;
assert.equal(phases.baseline.selection.selectedMemoryId, newer.memoryId);
assert.equal(phases.baseline.selection.policyId, 'user-decision-latest-revision-v1');
for (const phase of [phases.activeOverride, phases.crossWorkspaceActive, phases.repinned]) {
  assert.equal(phase.selection.selectedMemoryId, older.memoryId);
  assert.equal(phase.selection.policyId, 'user-decision-operator-override-v1');
  assert.equal(phase.selection.selectionSource, 'operator-override');
  assert.equal(phase.selection.overrideEvaluation.selectedOverrideId !== null, true);
}
assert.equal(phases.activeOverride.selection.overrideEvaluation.activeCount, 1);
assert.equal(phases.expired.selection.selectedMemoryId, newer.memoryId);
assert.equal(phases.expired.selection.selectionSource, 'latest-revision-fallback');
assert.equal(phases.expired.selection.overrideEvaluation.expiredCount, 1);
assert.equal(phases.expired.selection.overrideEvaluation.selectedOverrideId, null);
assert.equal(phases.cleared.selection.selectedMemoryId, newer.memoryId);
assert.equal(phases.cleared.selection.selectionSource, 'latest-revision-fallback');
assert.equal(phases.cleared.selection.overrideEvaluation.clearedCount, 1);
assert.equal(phases.cleared.selection.overrideEvaluation.selectedOverrideId, null);
assert.equal(phases.baseline.artifacts.plannerHash, phases.expired.artifacts.plannerHash);
assert.equal(phases.baseline.artifacts.plannerHash, phases.cleared.artifacts.plannerHash);
assert.equal(phases.baseline.artifacts.deliverableHash, phases.expired.artifacts.deliverableHash);
assert.equal(phases.baseline.artifacts.deliverableHash, phases.cleared.artifacts.deliverableHash);
assert.equal(phases.activeOverride.artifacts.plannerHash, phases.repinned.artifacts.plannerHash);
assert.equal(
  phases.activeOverride.artifacts.deliverableHash,
  phases.repinned.artifacts.deliverableHash,
);
assert.equal(evidence.quality.baseline.metricsHash, evidence.quality.expired.metricsHash);
assert.equal(evidence.quality.baseline.metricsHash, evidence.quality.cleared.metricsHash);
assert.equal(
  evidence.quality.activeOverride.metricsHash,
  evidence.quality.repinned.metricsHash,
);
assert.deepEqual(evidence.timeline.map((event) => event.kind), [
  'user-learning-selection-override-set',
  'user-learning-selection-override-set',
  'user-learning-selection-override-cleared',
]);
assert.ok(evidence.timeline[0].index < evidence.timeline[1].index);
assert.ok(evidence.timeline[1].index < evidence.timeline[2].index);

const runs = [...Object.values(evidence.sourceRuns), ...Object.values(evidence.phases)];
assert.equal(new Set(runs.map((run) => run.sessionId)).size, 8);
assert.equal(runs.every((run) => run.providerId === 'stub'), true);
assert.equal(runs.every((run) => run.externalProviderCallCount === 0), true);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
assert.equal(evidence.qualityBoundary.automaticPreferenceLearningValidated, false);
assert.equal(evidence.qualityBoundary.controlledUserOperatorOverrideValidated, true);
assert.equal(evidence.qualityBoundary.controlledCrossWorkspaceUserOverrideValidated, true);
assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
assert.equal(evidence.qualityBoundary.generalUserPersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.hostedTenantUserPersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.learnedConflictResolutionValidated, false);
assert.equal(evidence.qualityBoundary.multiUserIsolationValidated, false);
assert.equal(evidence.productionReadyClaim, false);

const unretrievedOverrideSelection = selectUserLearningMemory({
  memoryEntries: [
    {
      createdAt: older.memoryCreatedAt,
      id: older.memoryId,
      kind: 'decision',
      scope: 'user',
      scopeId: 'user',
    },
    {
      createdAt: newer.memoryCreatedAt,
      id: newer.memoryId,
      kind: 'decision',
      scope: 'user',
      scopeId: 'user',
    },
  ],
  retrievalCorpusRecords: [{
    contentHash: newer.memoryContentHash,
    provenance: { kind: 'decision', sourceId: newer.memoryId },
    revision: { at: newer.memoryCreatedAt },
    scope: { id: 'user', type: 'user' },
    sourceId: newer.memoryId,
    sourceType: 'memory',
  }],
  selectionOverrides: [{
    candidateId: older.candidateId,
    expiresAt: '2101-01-01T00:00:00.000Z',
    id: 'unretrieved-contract-override',
    memoryId: older.memoryId,
    noteHash: evidence.fixtureBinding.firstOverrideNoteHash,
    scope: 'user',
    scopeId: 'user',
    setAt: '2100-01-01T00:00:00.000Z',
    status: 'active',
  }],
});
assert.equal(unretrievedOverrideSelection.selectedMemoryId, newer.memoryId);
assert.equal(unretrievedOverrideSelection.overrideEvaluation.unretrievedActiveCount, 1);
assert.equal(unretrievedOverrideSelection.overrideEvaluation.selectedOverrideId, null);

const evidenceText = JSON.stringify(evidence);
for (const testCase of fixture.cases) {
  for (const rawText of [
    testCase.olderSourceTitle,
    testCase.olderSourceObjective,
    testCase.olderPromotionNote,
    testCase.olderScopeAuthorizationNote,
    testCase.newerSourceTitle,
    testCase.newerSourceObjective,
    testCase.newerPromotionNote,
    testCase.newerScopeAuthorizationNote,
    testCase.targetTitle,
    testCase.targetObjective,
    testCase.newerExpectedPlanStep,
    testCase.firstOverrideNote,
    testCase.secondOverrideNote,
    testCase.clearOverrideNote,
    ...testCase.olderRequiredAnswerTerms,
    ...testCase.newerRequiredAnswerTerms,
  ]) {
    assert.equal(evidenceText.includes(rawText), false, `P9 evidence leaked fixture text: ${rawText}`);
  }
}
for (const forbidden of [
  '/Users/',
  '/private/var/folders/',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `P9 evidence leaked ${forbidden}`);
}

const evaluatorSource = readRequiredFile('scripts/evaluate-user-learning-operator-override.mjs');
const helperSource = readRequiredFile('scripts/approved-learning-feedback-runtime.mjs');
const cliSource = readRequiredFile('src/cli.mjs');
const serviceSource = readRequiredFile('src/core/user-learning-selection-service.mjs');
const missionRunSource = readRequiredFile('src/core/mission-run-service.mjs');
const timelineSource = readRequiredFile('src/core/mission-read-service.mjs');
for (const term of [
  'setFeedbackUserLearningOverride',
  'setUserLearningSelectionOverride',
  'clearUserLearningSelectionOverride',
  'userLearningClock',
  'fs.rmSync(tempRoot',
]) {
  assert.ok(evaluatorSource.includes(term), `P9 evaluator missing ${term}`);
}
assert.ok(helperSource.includes('set-user-learning-selection-override'));
assert.ok(cliSource.includes('set-user-learning-selection-override'));
assert.ok(cliSource.includes('clear-user-learning-selection-override'));
assert.ok(serviceSource.includes('User learning selection override evidence is incomplete.'));
assert.ok(missionRunSource.includes('buildUserLearningSelectionOverrides'));
assert.ok(timelineSource.includes('user-learning-selection-override-cleared'));
assert.ok(timelineSource.includes('noteHash: overrideEvent.noteHash'));

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: user-learning-operator-override-current',
  '| P9 User learning operator override | 완료 |',
  'npm run smoke:user-learning-operator-override',
  'actualUserLearningOperatorOverrideValidated: true',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readRequiredFile('README.md').includes('npm run smoke:user-learning-operator-override'),
  'README must expose the P9 user operator override smoke command.',
);

const tampered = structuredClone(evidence);
tampered.phases.expired.selection.overrideEvaluation.expiredCount = 0;
assert.throws(
  () => assertUserLearningOperatorOverrideEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualUserLearningOperatorOverrideValidated: true,
  automaticPreferenceLearningValidated: false,
  costFree: true,
  externalProviderCalls: 'none',
  hostedTenantUserPersonalizationValidated: false,
  mode: 'user-learning-operator-override-smoke',
  multiUserIsolationValidated: false,
  ok: true,
  productionReadyClaim: false,
  sessionCount: 8,
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
