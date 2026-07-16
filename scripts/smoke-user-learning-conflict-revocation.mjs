import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertUserLearningConflictRevocationEvidence,
  buildUserLearningConflictRevocationEvidence,
} from '../src/core/user-learning-conflict-revocation.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(
  readRequiredFile('fixtures/user-learning-conflict-revocation-cases-v1.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/user-learning-conflict-revocation.json'),
);

assert.equal(
  fixture.schemaVersion,
  'personal-ai-agent-user-learning-conflict-revocation-cases/v1',
);
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.cases.length, 1);

assertUserLearningConflictRevocationEvidence(evidence);
assert.deepEqual(evidence, buildUserLearningConflictRevocationEvidence({
  fixtureBinding: evidence.fixtureBinding,
  lifecycle: evidence.lifecycle,
  observedAt: evidence.observedAt,
  phases: evidence.phases,
  promotions: evidence.promotions,
  quality: evidence.quality,
  sourceRuns: evidence.sourceRuns,
  topology: evidence.topology,
}));
assert.equal(evidence.actualUserLearningConflictRevocationValidated, true);
assert.equal(Object.values(evidence.results).every(Boolean), true);

const older = evidence.promotions.older;
const newer = evidence.promotions.newer;
assert.ok(Date.parse(older.memoryCreatedAt) < Date.parse(newer.memoryCreatedAt));
assert.equal(older.finalStatus, 'rolled-back');
assert.equal(newer.finalStatus, 'rolled-back');
assert.equal(older.memoryRollbackStatus, 'memory-deleted');
assert.equal(newer.memoryRollbackStatus, 'memory-deleted');
assert.equal(older.rollbackAction, 'delete-memory-entry');
assert.equal(newer.rollbackAction, 'delete-memory-entry');
assert.equal(
  older.promotionDecisionNoteHash,
  evidence.fixtureBinding.olderPromotionNoteHash,
);
assert.equal(
  newer.promotionDecisionNoteHash,
  evidence.fixtureBinding.newerPromotionNoteHash,
);
assert.equal(
  older.scopeAuthorizationNoteHash,
  evidence.fixtureBinding.olderScopeAuthorizationNoteHash,
);
assert.equal(
  newer.scopeAuthorizationNoteHash,
  evidence.fixtureBinding.newerScopeAuthorizationNoteHash,
);
assert.equal(older.scopeAuthorizationStatus, 'consumed');
assert.equal(newer.scopeAuthorizationStatus, 'consumed');
assert.equal(older.scope, 'user');
assert.equal(newer.scope, 'user');
assert.equal(older.scopeId, 'user');
assert.equal(newer.scopeId, 'user');

const olderSelection = evidence.phases.olderOnly.selection;
const conflictSelection = evidence.phases.conflict.selection;
const fallbackSelection = evidence.phases.afterNewerRevocation.selection;
assert.equal(olderSelection.candidateCount, 1);
assert.equal(olderSelection.selectedMemoryId, older.memoryId);
assert.equal(conflictSelection.candidateCount, 2);
assert.equal(conflictSelection.selectedMemoryId, newer.memoryId);
assert.equal(conflictSelection.candidates[0].memoryId, newer.memoryId);
assert.equal(conflictSelection.candidates[0].priority, 1);
assert.equal(conflictSelection.candidates[0].selected, true);
assert.equal(conflictSelection.candidates[1].memoryId, older.memoryId);
assert.equal(conflictSelection.candidates[1].priority, 2);
assert.equal(conflictSelection.candidates[1].selected, false);
assert.equal(fallbackSelection.candidateCount, 1);
assert.equal(fallbackSelection.selectedMemoryId, older.memoryId);
assert.equal(evidence.phases.baseline.selection, null);
assert.equal(
  evidence.phases.crossWorkspaceConflict.selection.selectedMemoryId,
  newer.memoryId,
);
assert.equal(evidence.phases.afterFullRollback.selection, null);

assert.equal(Object.values(evidence.phases.conflict.exposures.newer).every(Boolean), true);
assert.equal(Object.values(evidence.phases.conflict.exposures.older).some(Boolean), false);
assert.equal(
  Object.values(evidence.phases.afterNewerRevocation.exposures.older).every(Boolean),
  true,
);
assert.equal(
  Object.values(evidence.phases.afterNewerRevocation.exposures.newer).some(Boolean),
  false,
);
assert.equal(
  Object.values(evidence.phases.crossWorkspaceConflict.exposures.newer).every(Boolean),
  true,
);
assert.equal(
  Object.values(evidence.phases.crossWorkspaceConflict.exposures.older).some(Boolean),
  false,
);
assert.equal(
  evidence.phases.olderOnly.artifacts.plannerHash,
  evidence.phases.afterNewerRevocation.artifacts.plannerHash,
);
assert.equal(
  evidence.phases.olderOnly.artifacts.deliverableHash,
  evidence.phases.afterNewerRevocation.artifacts.deliverableHash,
);
assert.equal(
  evidence.phases.baseline.artifacts.plannerHash,
  evidence.phases.afterFullRollback.artifacts.plannerHash,
);
assert.equal(
  evidence.phases.baseline.artifacts.deliverableHash,
  evidence.phases.afterFullRollback.artifacts.deliverableHash,
);
assert.deepEqual(
  [
    evidence.quality.baseline.status,
    evidence.quality.olderOnly.status,
    evidence.quality.conflict.status,
    evidence.quality.crossWorkspaceConflict.status,
    evidence.quality.afterNewerRevocation.status,
    evidence.quality.afterFullRollback.status,
  ],
  ['failed', 'passed', 'passed', 'passed', 'passed', 'failed'],
);
assert.equal(
  evidence.quality.olderOnly.resultHash,
  evidence.quality.afterNewerRevocation.resultHash,
);
assert.equal(
  evidence.quality.baseline.resultHash,
  evidence.quality.afterFullRollback.resultHash,
);

for (const lifecycle of Object.values(evidence.lifecycle)) {
  assert.ok(lifecycle.authorizationAt <= lifecycle.promotionAt);
  assert.ok(lifecycle.promotionAt <= lifecycle.rollbackAt);
}
assert.ok(evidence.lifecycle.newer.rollbackAt < evidence.lifecycle.older.rollbackAt);

const runs = [...Object.values(evidence.sourceRuns), ...Object.values(evidence.phases)];
assert.equal(new Set(runs.map((run) => run.sessionId)).size, 8);
assert.equal(runs.every((run) => run.providerId === 'stub'), true);
assert.equal(runs.every((run) => run.externalProviderCallCount === 0), true);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
assert.equal(evidence.qualityBoundary.controlledCrossWorkspaceUserSelectionValidated, true);
assert.equal(evidence.qualityBoundary.controlledUserConflictResolutionValidated, true);
assert.equal(evidence.qualityBoundary.controlledUserRevocationFallbackValidated, true);
assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
assert.equal(evidence.qualityBoundary.generalUserPersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.hostedTenantUserPersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.learnedConflictResolutionValidated, false);
assert.equal(evidence.qualityBoundary.multiUserIsolationValidated, false);
assert.equal(evidence.productionReadyClaim, false);

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
    ...testCase.olderRequiredAnswerTerms,
    ...testCase.newerRequiredAnswerTerms,
  ]) {
    assert.equal(evidenceText.includes(rawText), false, `P8 evidence leaked fixture text: ${rawText}`);
  }
}
for (const forbidden of [
  '/Users/',
  '/private/var/folders/',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `P8 evidence leaked ${forbidden}`);
}

const evaluatorSource = readRequiredFile(
  'scripts/evaluate-user-learning-conflict-revocation.mjs',
);
const missionRunSource = readRequiredFile('src/core/mission-run-service.mjs');
for (const term of [
  "'--provider', 'stub'",
  'authorize-learning-promotion-scope',
  'resolve-learning-promotion',
  'rollback-learning-promotion',
  'evaluateAnswerQualityCase',
  'readFeedbackUserLearningSelection',
  'fs.rmSync(tempRoot',
]) {
  assert.ok(evaluatorSource.includes(term) || readRequiredFile('scripts/approved-learning-feedback-runtime.mjs').includes(term));
}
for (const term of [
  'selectUserLearningMemory',
  'applyUserLearningSelection',
  'user-learning-selection.json',
]) {
  assert.ok(missionRunSource.includes(term), `Mission runtime missing ${term}`);
}

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: user-learning-operator-override-current',
  '| P8 User learning conflict and revocation | 완료 |',
  'npm run smoke:user-learning-conflict-revocation',
  'actualUserLearningConflictRevocationValidated: true',
  'learnedConflictResolutionValidated: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

const readme = readRequiredFile('README.md');
assert.ok(
  readme.includes('npm run smoke:user-learning-conflict-revocation'),
  'README must expose the P8 conflict and revocation smoke command.',
);

const tampered = structuredClone(evidence);
tampered.phases.conflict.selection.selectedMemoryId = older.memoryId;
assert.throws(
  () => assertUserLearningConflictRevocationEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualUserLearningConflictRevocationValidated: true,
  conflictCandidateCount: 2,
  conflictSelected: 'newer',
  costFree: true,
  externalProviderCalls: 'none',
  fallbackSelected: 'older',
  generalUserPersonalizationValidated: false,
  hostedTenantUserPersonalizationValidated: false,
  learnedConflictResolutionValidated: false,
  mode: 'user-learning-conflict-revocation-smoke',
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
