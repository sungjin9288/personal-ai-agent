import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertWorkspaceLearningPersonalizationEvidence,
  buildWorkspaceLearningPersonalizationEvidence,
} from '../src/core/workspace-learning-personalization.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(
  readRequiredFile('fixtures/workspace-learning-personalization-cases-v1.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/workspace-learning-personalization.json'),
);

assert.equal(
  fixture.schemaVersion,
  'personal-ai-agent-workspace-learning-personalization-cases/v1',
);
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.cases.length, 1);

assertWorkspaceLearningPersonalizationEvidence(evidence);
assert.deepEqual(evidence, buildWorkspaceLearningPersonalizationEvidence({
  audit: evidence.audit,
  fixtureBinding: evidence.fixtureBinding,
  observedAt: evidence.observedAt,
  phases: evidence.phases,
  promotion: evidence.promotion,
  quality: evidence.quality,
  sourceRun: evidence.sourceRun,
  topology: evidence.topology,
}));
assert.equal(evidence.actualWorkspaceLearningPersonalizationValidated, true);
assert.deepEqual(evidence.results, {
  auditOrderingPreserved: true,
  controlledQualityDelta: true,
  distinctSessionsPassed: true,
  externalProviderIsolationPassed: true,
  foreignArtifactParity: true,
  foreignWorkspaceIsolated: true,
  promotionVerified: true,
  reviewerPassPreserved: true,
  siblingBaselineClean: true,
  siblingFeedbackApplied: true,
  siblingRollbackRestored: true,
  topologyBound: true,
});

const { authorization, promotion, rollback } = evidence.audit;
assert.equal(authorization.kind, 'learning-candidate-promotion-scope-authorized');
assert.equal(promotion.kind, 'learning-candidate-promotion-approved');
assert.equal(rollback.kind, 'learning-candidate-promotion-rolled-back');
assert.ok(authorization.index < promotion.index);
assert.ok(promotion.index < rollback.index);
assert.ok(authorization.at <= promotion.at);
assert.ok(promotion.at <= rollback.at);
assert.equal(authorization.scopeAuthorizationId, evidence.promotion.scopeAuthorizationId);
assert.equal(promotion.scopeAuthorizationId, evidence.promotion.scopeAuthorizationId);
assert.equal(rollback.scopeAuthorizationId, evidence.promotion.scopeAuthorizationId);
assert.equal(evidence.promotion.scopeAuthorizationFromScope, 'mission');
assert.equal(evidence.promotion.scopeAuthorizationFromScopeId, evidence.topology.sourceMission.id);
assert.equal(evidence.promotion.scopeAuthorizationToScope, 'workspace');
assert.equal(evidence.promotion.scopeAuthorizationToScopeId, evidence.topology.sourceWorkspaceId);
assert.equal(evidence.promotion.scopeAuthorizationStatus, 'consumed');
assert.equal(evidence.promotion.verificationStatus, 'passed');
assert.equal(evidence.promotion.memoryRollbackStatus, 'memory-deleted');

const siblingBefore = evidence.phases.beforePromotion.sibling;
const siblingAfter = evidence.phases.afterPromotion.sibling;
const siblingRollback = evidence.phases.afterRollback.sibling;
assert.deepEqual(
  [
    siblingBefore.adaptation.planStepCount,
    siblingAfter.adaptation.planStepCount,
    siblingRollback.adaptation.planStepCount,
  ],
  [3, 4, 3],
);
assert.deepEqual(
  [
    evidence.quality.beforePromotion.sibling.status,
    evidence.quality.afterPromotion.sibling.status,
    evidence.quality.afterRollback.sibling.status,
  ],
  ['failed', 'passed', 'failed'],
);
assert.equal(siblingAfter.retrieval.scope, 'workspace');
assert.equal(siblingAfter.retrieval.scopeId, evidence.topology.sourceWorkspaceId);
assert.equal(siblingAfter.retrieval.sourceId, evidence.promotion.memoryId);
assert.equal(siblingAfter.retrieval.contentHash, evidence.promotion.memoryContentHash);
assert.ok(siblingAfter.retrieval.matchTermCount >= fixture.cases[0].minimumRetrievalMatchTermCount);
assert.equal(Object.values(siblingAfter.memoryExposure).every(Boolean), true);
assert.equal(siblingRollback.artifacts.deliverableHash, siblingBefore.artifacts.deliverableHash);
assert.equal(siblingRollback.artifacts.plannerHash, siblingBefore.artifacts.plannerHash);

for (const phase of Object.values(evidence.phases)) {
  const foreign = phase.foreign;
  assert.equal(Object.values(foreign.memoryExposure).some(Boolean), false);
  assert.equal(foreign.artifacts.retrievalHash, null);
  assert.equal(foreign.retrieval.sourceId, '');
}
assert.equal(
  evidence.phases.beforePromotion.foreign.artifacts.deliverableHash,
  evidence.phases.afterPromotion.foreign.artifacts.deliverableHash,
);
assert.equal(
  evidence.phases.beforePromotion.foreign.artifacts.deliverableHash,
  evidence.phases.afterRollback.foreign.artifacts.deliverableHash,
);
assert.equal(
  evidence.phases.beforePromotion.foreign.artifacts.plannerHash,
  evidence.phases.afterPromotion.foreign.artifacts.plannerHash,
);
assert.equal(
  evidence.phases.beforePromotion.foreign.artifacts.plannerHash,
  evidence.phases.afterRollback.foreign.artifacts.plannerHash,
);

const runs = [
  evidence.sourceRun,
  ...Object.values(evidence.phases).flatMap((phase) => [phase.sibling, phase.foreign]),
];
assert.equal(new Set(runs.map((run) => run.sessionId)).size, 7);
assert.equal(runs.every((run) => run.providerId === 'stub'), true);
assert.equal(runs.every((run) => run.externalProviderCallCount === 0), true);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
assert.equal(evidence.qualityBoundary.controlledWorkspacePersonalizationValidated, true);
assert.equal(evidence.qualityBoundary.crossMissionGeneralizationValidated, false);
assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
assert.equal(evidence.qualityBoundary.generalWorkspacePersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.userScopedPersonalizationValidated, false);
assert.equal(evidence.productionReadyClaim, false);

const evidenceText = JSON.stringify(evidence);
for (const testCase of fixture.cases) {
  for (const rawText of [
    testCase.expectedPlanStep,
    testCase.isolationMarker,
    testCase.promotionNote,
    testCase.scopeAuthorizationNote,
    testCase.sourceObjective,
    testCase.sourceTitle,
    testCase.targetObjective,
    testCase.targetTitle,
    ...testCase.requiredAnswerTerms,
  ]) {
    assert.equal(evidenceText.includes(rawText), false, `P3 evidence leaked fixture text: ${rawText}`);
  }
}
for (const forbidden of [
  '/Users/',
  '/private/var/folders/',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `P3 evidence leaked ${forbidden}`);
}

const evaluatorSource = readRequiredFile('scripts/evaluate-workspace-learning-personalization.mjs');
const runtimeSource = readRequiredFile('scripts/approved-learning-feedback-runtime.mjs');
const implementationSource = `${evaluatorSource}\n${runtimeSource}`;
for (const term of [
  "'--provider', 'stub'",
  'authorize-learning-promotion-scope',
  'resolve-learning-promotion',
  'rollback-learning-promotion',
  'mission',
  'timeline',
  'evaluateAnswerQualityCase',
  'fs.rmSync(tempRoot',
]) {
  assert.ok(implementationSource.includes(term), `P3 evaluator runtime missing ${term}`);
}

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: workspace-learning-operator-surface-current',
  '| P3 Workspace learning personalization | 완료 |',
  'npm run smoke:workspace-learning-personalization',
  'actualWorkspaceLearningPersonalizationValidated: true',
  'generalWorkspacePersonalizationValidated: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

const readme = readRequiredFile('README.md');
assert.ok(
  readme.includes('npm run smoke:workspace-learning-personalization'),
  'README must expose the P3 workspace personalization smoke command.',
);

const tampered = structuredClone(evidence);
tampered.audit.promotion.index = tampered.audit.rollback.index + 1;
assert.throws(
  () => assertWorkspaceLearningPersonalizationEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualWorkspaceLearningPersonalizationValidated: true,
  auditOrderingPreserved: true,
  costFree: true,
  crossMissionGeneralizationValidated: false,
  externalProviderCalls: 'none',
  foreignWorkspaceIsolationValidated: true,
  generalAnswerQualityImprovementValidated: false,
  mode: 'workspace-learning-personalization-smoke',
  ok: true,
  productionReadyClaim: false,
  sessionCount: 7,
  siblingPlanStepCounts: [3, 4, 3],
  siblingQualityStatuses: ['failed', 'passed', 'failed'],
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
