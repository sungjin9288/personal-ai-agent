import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertWorkspaceLearningOperatorOverrideEvidence,
  buildWorkspaceLearningOperatorOverrideEvidence,
} from '../src/core/workspace-learning-operator-override.mjs';
import { selectWorkspaceLearningMemory } from '../src/core/workspace-learning-selection.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(
  readRequiredFile('fixtures/workspace-learning-operator-override-cases-v1.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/workspace-learning-operator-override.json'),
);

assert.equal(
  fixture.schemaVersion,
  'personal-ai-agent-workspace-learning-operator-override-cases/v1',
);
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.cases.length, 1);

assertWorkspaceLearningOperatorOverrideEvidence(evidence);
assert.deepEqual(evidence, buildWorkspaceLearningOperatorOverrideEvidence(evidence));
assert.equal(evidence.actualWorkspaceLearningOperatorOverrideValidated, true);
assert.equal(Object.values(evidence.results).every(Boolean), true);

const older = evidence.promotions.older;
const newer = evidence.promotions.newer;
const phases = evidence.phases;
assert.equal(phases.baseline.selection.selectedMemoryId, newer.memoryId);
assert.equal(phases.baseline.selection.policyId, 'workspace-decision-latest-revision-v1');
assert.equal(phases.activeOverride.selection.selectedMemoryId, older.memoryId);
assert.equal(
  phases.activeOverride.selection.policyId,
  'workspace-decision-operator-override-v1',
);
assert.equal(phases.activeOverride.selection.overrideEvaluation.activeCount, 1);
assert.equal(phases.foreignActive.selection, null);
assert.equal(
  Object.values(phases.foreignActive.exposures).every((memoryExposure) =>
    Object.values(memoryExposure).every((value) => value === false),
  ),
  true,
);
assert.equal(phases.expired.selection.selectedMemoryId, newer.memoryId);
assert.equal(phases.expired.selection.overrideEvaluation.expiredCount, 1);
assert.equal(phases.expired.selection.overrideEvaluation.selectedOverrideId, null);
assert.equal(phases.repinned.selection.selectedMemoryId, older.memoryId);
assert.equal(phases.cleared.selection.selectedMemoryId, newer.memoryId);
assert.equal(phases.cleared.selection.overrideEvaluation.clearedCount, 1);
assert.equal(phases.cleared.selection.overrideEvaluation.selectedOverrideId, null);
assert.equal(phases.baseline.artifacts.plannerHash, phases.expired.artifacts.plannerHash);
assert.equal(phases.baseline.artifacts.plannerHash, phases.cleared.artifacts.plannerHash);
assert.equal(phases.baseline.artifacts.deliverableHash, phases.expired.artifacts.deliverableHash);
assert.equal(phases.baseline.artifacts.deliverableHash, phases.cleared.artifacts.deliverableHash);
assert.equal(
  phases.activeOverride.artifacts.plannerHash,
  phases.repinned.artifacts.plannerHash,
);
assert.equal(
  phases.activeOverride.artifacts.deliverableHash,
  phases.repinned.artifacts.deliverableHash,
);
assert.equal(evidence.quality.baseline.resultHash, evidence.quality.expired.resultHash);
assert.equal(evidence.quality.baseline.resultHash, evidence.quality.cleared.resultHash);
assert.equal(
  evidence.quality.activeOverride.resultHash,
  evidence.quality.repinned.resultHash,
);
assert.deepEqual(evidence.timeline.map((event) => event.kind), [
  'workspace-learning-selection-override-set',
  'workspace-learning-selection-override-set',
  'workspace-learning-selection-override-cleared',
]);
assert.ok(evidence.timeline[0].index < evidence.timeline[1].index);
assert.ok(evidence.timeline[1].index < evidence.timeline[2].index);

const runs = [...Object.values(evidence.sourceRuns), ...Object.values(evidence.phases)];
assert.equal(new Set(runs.map((run) => run.sessionId)).size, 8);
assert.equal(runs.every((run) => run.providerId === 'stub'), true);
assert.equal(runs.every((run) => run.externalProviderCallCount === 0), true);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
assert.equal(evidence.qualityBoundary.controlledOperatorOverrideValidated, true);
assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
assert.equal(evidence.qualityBoundary.generalWorkspacePersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.learnedConflictResolutionValidated, false);
assert.equal(evidence.qualityBoundary.userScopedPersonalizationValidated, false);
assert.equal(evidence.productionReadyClaim, false);

const unretrievedOverrideSelection = selectWorkspaceLearningMemory({
  memoryEntries: [
    {
      createdAt: older.memoryCreatedAt,
      id: older.memoryId,
      kind: 'decision',
      scope: 'workspace',
      scopeId: evidence.topology.sourceWorkspaceId,
    },
    {
      createdAt: newer.memoryCreatedAt,
      id: newer.memoryId,
      kind: 'decision',
      scope: 'workspace',
      scopeId: evidence.topology.sourceWorkspaceId,
    },
  ],
  retrievalCorpusRecords: [{
    contentHash: newer.memoryContentHash,
    provenance: { kind: 'decision', sourceId: newer.memoryId },
    revision: { at: newer.memoryCreatedAt },
    scope: { id: evidence.topology.sourceWorkspaceId, type: 'workspace' },
    sourceId: newer.memoryId,
    sourceType: 'memory',
  }],
  selectionOverrides: [{
    candidateId: older.candidateId,
    expiresAt: '2101-01-01T00:00:00.000Z',
    id: 'unretrieved-contract-override',
    memoryId: older.memoryId,
    noteHash: evidence.fixtureBinding.firstOverrideNoteHash,
    setAt: '2100-01-01T00:00:00.000Z',
    status: 'active',
    workspaceId: evidence.topology.sourceWorkspaceId,
  }],
  workspaceId: evidence.topology.sourceWorkspaceId,
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
    assert.equal(evidenceText.includes(rawText), false, `P5 evidence leaked fixture text: ${rawText}`);
  }
}
for (const forbidden of [
  '/Users/',
  '/private/var/folders/',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `P5 evidence leaked ${forbidden}`);
}

const evaluatorSource = readRequiredFile('scripts/evaluate-workspace-learning-operator-override.mjs');
const helperSource = readRequiredFile('scripts/approved-learning-feedback-runtime.mjs');
const cliSource = readRequiredFile('src/cli.mjs');
const serviceSource = readRequiredFile('src/core/workspace-learning-selection-service.mjs');
const missionRunSource = readRequiredFile('src/core/mission-run-service.mjs');
const timelineSource = readRequiredFile('src/core/mission-read-service.mjs');
for (const term of [
  'setFeedbackWorkspaceLearningOverride',
  'setWorkspaceLearningSelectionOverride',
  'clearWorkspaceLearningSelectionOverride',
  'workspaceLearningClock',
  'fs.rmSync(tempRoot',
]) {
  assert.ok(evaluatorSource.includes(term), `P5 evaluator missing ${term}`);
}
assert.ok(helperSource.includes('set-workspace-learning-selection-override'));
assert.ok(cliSource.includes('set-workspace-learning-selection-override'));
assert.ok(cliSource.includes('clear-workspace-learning-selection-override'));
assert.ok(serviceSource.includes('Workspace learning selection override evidence is incomplete.'));
assert.ok(missionRunSource.includes('buildWorkspaceLearningSelectionOverrides'));
assert.ok(timelineSource.includes('workspace-learning-selection-override-cleared'));
assert.ok(timelineSource.includes('noteHash: overrideEvent.noteHash'));

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: local-answer-quality-baseline-current',
  '| P5 Workspace learning operator override | 완료 |',
  'npm run smoke:workspace-learning-operator-override',
  'actualWorkspaceLearningOperatorOverrideValidated: true',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readRequiredFile('README.md').includes('npm run smoke:workspace-learning-operator-override'),
  'README must expose the P5 operator override smoke command.',
);

const tampered = structuredClone(evidence);
tampered.phases.expired.selection.overrideEvaluation.expiredCount = 0;
assert.throws(
  () => assertWorkspaceLearningOperatorOverrideEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualWorkspaceLearningOperatorOverrideValidated: true,
  costFree: true,
  externalProviderCalls: 'none',
  mode: 'workspace-learning-operator-override-smoke',
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
