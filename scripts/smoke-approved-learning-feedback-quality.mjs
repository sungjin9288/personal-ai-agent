import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertApprovedLearningFeedbackQualityEvidence,
  buildApprovedLearningFeedbackQualityEvidence,
} from '../src/core/approved-learning-feedback-quality.mjs';
import {
  assertApprovedLearningRagFeedbackEvidence,
} from '../src/core/approved-learning-rag-feedback.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(
  readRequiredFile('fixtures/approved-learning-feedback-quality-cases-v1.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/approved-learning-feedback-quality.json'),
);

assert.equal(
  fixture.schemaVersion,
  'personal-ai-agent-approved-learning-feedback-quality-cases/v1',
);
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.cases.length, 3);

assertApprovedLearningFeedbackQualityEvidence(evidence);
assert.deepEqual(evidence, buildApprovedLearningFeedbackQualityEvidence({
  evaluations: evidence.evaluations,
  feedbackCases: evidence.feedbackCases,
  fixtureBinding: evidence.fixtureBinding,
  isolation: evidence.isolation,
  observedAt: evidence.observedAt,
}));
assert.equal(evidence.actualApprovedLearningFeedbackQualityValidated, true);
assert.deepEqual(evidence.results, {
  allFeedbackLoopsPassed: true,
  caseIdentityPassed: true,
  controlledQualityImprovementPassed: true,
  distinctIdentityPassed: true,
  externalProviderIsolationPassed: true,
  foreignMemoryIsolationPassed: true,
  reviewerPassPreserved: true,
  rollbackQualityParity: true,
});
assert.equal(evidence.evaluations.beforePromotion.status, 'failed');
assert.equal(evidence.evaluations.beforePromotion.summary.metrics.casePassRate, 0);
assert.equal(evidence.evaluations.afterPromotion.status, 'passed');
assert.equal(evidence.evaluations.afterPromotion.summary.metrics.casePassRate, 1);
assert.equal(evidence.evaluations.afterPromotion.summary.metrics.retrievalHitRate, 1);
assert.equal(evidence.evaluations.afterPromotion.summary.metrics.expectedSourceCitationRate, 1);
assert.equal(evidence.evaluations.afterPromotion.summary.metrics.citationGroundingRate, 1);
assert.equal(evidence.evaluations.afterPromotion.summary.metrics.requiredTermCoverage, 1);
assert.equal(evidence.evaluations.afterPromotion.summary.metrics.unsupportedCitationRate, 0);
assert.equal(evidence.evaluations.afterPromotion.summary.metrics.forbiddenRetrievedSourceCount, 0);
assert.equal(evidence.evaluations.afterPromotion.summary.metrics.forbiddenTermMatchCount, 0);
assert.equal(evidence.evaluations.afterRollback.status, 'failed');
assert.equal(evidence.evaluations.afterRollback.summary.metrics.casePassRate, 0);
assert.equal(
  evidence.evaluations.beforePromotion.evaluationHash,
  evidence.evaluations.afterRollback.evaluationHash,
);
assert.equal(evidence.feedbackCases.length, 3);
assert.equal(evidence.isolation.length, 3);

for (const feedbackCase of evidence.feedbackCases) {
  assertApprovedLearningRagFeedbackEvidence(feedbackCase);
  assert.equal(feedbackCase.actualApprovedLearningRagFeedbackValidated, true);
  assert.equal(feedbackCase.results.rollbackArtifactParity, true);
  assert.equal(feedbackCase.results.retrievalLineageBound, true);
}
for (const isolation of evidence.isolation) {
  assert.ok(isolation.expectedMemoryId);
  assert.equal(isolation.expectedMemorySourceCount, 1);
  assert.equal(isolation.foreignMemoryCandidateCount, 2);
  assert.equal(isolation.foreignMemoryIds.length, 2);
  assert.equal(isolation.foreignMemoryRetrievedCount, 0);
  assert.equal(isolation.retrievedExpectedMemorySourceCount, 1);
  assert.deepEqual(isolation.retrievedMemoryIds, [isolation.expectedMemoryId]);
}
assert.equal(
  new Set(
    evidence.feedbackCases.flatMap((feedbackCase) =>
      Object.values(feedbackCase.runs).map((run) => run.sessionId),
    ),
  ).size,
  9,
);
assert.equal(evidence.qualityBoundary.controlledMultiScenarioAnswerQualityValidated, true);
assert.equal(evidence.qualityBoundary.crossMissionIsolationValidated, true);
assert.equal(evidence.qualityBoundary.crossMissionGeneralizationValidated, false);
assert.equal(evidence.qualityBoundary.workspacePersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.productionReadyClaim, false);

const evidenceText = JSON.stringify(evidence);
for (const testCase of fixture.cases) {
  for (const rawText of [
    testCase.expectedPlanStep,
    testCase.isolationMarker,
    testCase.objective,
    testCase.promotionNote,
    testCase.title,
    ...testCase.requiredAnswerTerms,
  ]) {
    assert.equal(evidenceText.includes(rawText), false, `P2 evidence leaked fixture text: ${rawText}`);
  }
}
for (const forbidden of [
  '/Users/',
  '/private/var/folders/',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'verification lane alpha',
  'evidence lane beta',
  'incident lane gamma',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `P2 evidence leaked ${forbidden}`);
}

const evaluatorSource = readRequiredFile('scripts/evaluate-approved-learning-feedback-quality.mjs');
const runtimeHelperSource = readRequiredFile('scripts/approved-learning-feedback-runtime.mjs');
const evaluatorRuntimeSource = `${evaluatorSource}\n${runtimeHelperSource}`;
for (const term of [
  "'--provider', 'stub'",
  'evaluateAnswerQualitySuite',
  'forbiddenAnswerTerms',
  'forbiddenSourceKeys',
  'resolve-learning-promotion',
  'rollback-learning-promotion',
  'fs.rmSync(tempRoot',
]) {
  assert.ok(evaluatorRuntimeSource.includes(term), `P2 evaluator runtime missing ${term}`);
}

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: workspace-learning-conflict-revocation-current',
  '| P2 Multi-scenario learning feedback quality | 완료 |',
  'npm run smoke:approved-learning-feedback-quality',
  'actualApprovedLearningFeedbackQualityValidated: true',
  'generalAnswerQualityImprovementValidated: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

const readme = readRequiredFile('README.md');
assert.ok(
  readme.includes('npm run smoke:approved-learning-feedback-quality'),
  'README must expose the P2 feedback quality smoke command.',
);

const tampered = structuredClone(evidence);
tampered.isolation[0].foreignMemoryRetrievedCount = 1;
assert.throws(
  () => assertApprovedLearningFeedbackQualityEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualApprovedLearningFeedbackQualityValidated: true,
  actualModelTrainingExecuted: false,
  afterPromotionCasePassRate: evidence.evaluations.afterPromotion.summary.metrics.casePassRate,
  beforePromotionCasePassRate: evidence.evaluations.beforePromotion.summary.metrics.casePassRate,
  caseCount: evidence.fixtureBinding.caseIds.length,
  costFree: true,
  crossMissionGeneralizationValidated: false,
  externalProviderCalls: 'none',
  foreignMemoryRetrievedCount: evidence.isolation.reduce(
    (total, item) => total + item.foreignMemoryRetrievedCount,
    0,
  ),
  generalAnswerQualityImprovementValidated: false,
  mode: 'approved-learning-feedback-quality-smoke',
  ok: true,
  productionReadyClaim: false,
  rollbackCasePassRate: evidence.evaluations.afterRollback.summary.metrics.casePassRate,
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
