import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertApprovedLearningRagFeedbackEvidence,
  buildApprovedLearningRagFeedbackEvidence,
} from '../src/core/approved-learning-rag-feedback.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/approved-learning-rag-feedback-cases-v1.json'));
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/approved-learning-rag-feedback.json'),
);

assertApprovedLearningRagFeedbackEvidence(evidence);
assert.deepEqual(evidence, buildApprovedLearningRagFeedbackEvidence({
  fixtureBinding: evidence.fixtureBinding,
  mission: evidence.mission,
  observedAt: evidence.observedAt,
  promotion: evidence.promotion,
  runs: evidence.runs,
}));
assert.equal(evidence.actualApprovedLearningRagFeedbackValidated, true);
assert.deepEqual(evidence.results, {
  baselineClean: true,
  distinctSessionsPassed: true,
  externalProviderIsolationPassed: true,
  fixtureBindingPassed: true,
  plannerAndDeliverableAdapted: true,
  promotionVerified: true,
  retrievalLineageBound: true,
  reviewerPassPreserved: true,
  rollbackArtifactParity: true,
  rollbackRestoredBaseline: true,
});
assert.equal(evidence.promotion.verificationStatus, 'passed');
assert.equal(evidence.promotion.rollbackAction, 'delete-memory-entry');
assert.equal(evidence.promotion.rollbackStatus, 'completed');
assert.equal(evidence.promotion.memoryRollbackStatus, 'memory-deleted');
assert.equal(evidence.runs.beforePromotion.adaptation.planStepCount, 3);
assert.equal(evidence.runs.afterPromotion.adaptation.planStepCount, 4);
assert.equal(evidence.runs.afterRollback.adaptation.planStepCount, 3);
assert.equal(
  evidence.runs.afterPromotion.retrieval.matchTermCount >=
    fixture.cases[0].minimumRetrievalMatchTermCount,
  true,
);
assert.equal(evidence.runs.afterPromotion.retrieval.sourceId, evidence.promotion.memoryId);
assert.equal(
  evidence.runs.afterPromotion.retrieval.contentHash,
  evidence.promotion.memoryContentHash,
);
assert.equal(evidence.qualityBoundary.missionScopedFeedbackApplicationValidated, true);
assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
assert.equal(evidence.qualityBoundary.crossMissionGeneralizationValidated, false);
assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.productionReadyClaim, false);

const evidenceText = JSON.stringify(evidence);
for (const testCase of fixture.cases) {
  for (const rawText of [
    testCase.objective,
    testCase.promotionNote,
    testCase.expectedPlanStep,
    testCase.title,
  ]) {
    assert.equal(evidenceText.includes(rawText), false, `P1 evidence leaked fixture text: ${rawText}`);
  }
}
for (const forbidden of [
  '/Users/',
  '/private/var/folders/',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'Narrow the verification path',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `P1 evidence leaked ${forbidden}`);
}

const evaluatorSource = readRequiredFile('scripts/evaluate-approved-learning-rag-feedback.mjs');
const runtimeHelperSource = readRequiredFile('scripts/approved-learning-feedback-runtime.mjs');
const evaluatorRuntimeSource = `${evaluatorSource}\n${runtimeHelperSource}`;
for (const term of [
  "'--provider', 'stub'",
  'resolve-learning-promotion',
  'rollback-learning-promotion',
  'externalProviderCallCount',
  'fs.rmSync(tempRoot',
]) {
  assert.ok(evaluatorRuntimeSource.includes(term), `P1 evaluator runtime missing ${term}`);
}

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: local-user-learning-personalization-current',
  '| P1 Approved learning RAG feedback | 완료 |',
  'npm run smoke:approved-learning-rag-feedback',
  'actualApprovedLearningRagFeedbackValidated: true',
  'generalAnswerQualityImprovementValidated: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

const tampered = structuredClone(evidence);
tampered.runs.afterPromotion.retrieval.sourceId = 'memory-tampered';
assert.throws(
  () => assertApprovedLearningRagFeedbackEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualApprovedLearningRagFeedbackValidated: true,
  actualModelTrainingExecuted: false,
  costFree: true,
  externalProviderCalls: 'none',
  generalAnswerQualityImprovementValidated: false,
  mode: 'approved-learning-rag-feedback-smoke',
  ok: true,
  postPromotionPlanStepCount: evidence.runs.afterPromotion.adaptation.planStepCount,
  postPromotionRetrievalMatchTermCount: evidence.runs.afterPromotion.retrieval.matchTermCount,
  productionReadyClaim: false,
  rollbackPlanStepCount: evidence.runs.afterRollback.adaptation.planStepCount,
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
