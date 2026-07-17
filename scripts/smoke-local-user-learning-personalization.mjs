import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalUserLearningPersonalizationEvidence,
  buildLocalUserLearningPersonalizationEvidence,
} from '../src/core/local-user-learning-personalization.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(
  readRequiredFile('fixtures/local-user-learning-personalization-cases-v1.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-user-learning-personalization.json'),
);

assert.equal(
  fixture.schemaVersion,
  'personal-ai-agent-local-user-learning-personalization-cases/v1',
);
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.cases.length, 1);

assertLocalUserLearningPersonalizationEvidence(evidence);
assert.deepEqual(evidence, buildLocalUserLearningPersonalizationEvidence({
  audit: evidence.audit,
  fixtureBinding: evidence.fixtureBinding,
  observedAt: evidence.observedAt,
  phases: evidence.phases,
  promotion: evidence.promotion,
  quality: evidence.quality,
  sourceRun: evidence.sourceRun,
  topology: evidence.topology,
}));
assert.equal(evidence.actualLocalUserScopedPersonalizationValidated, true);
assert.equal(Object.values(evidence.results).every(Boolean), true);

assert.equal(evidence.promotion.scope, 'user');
assert.equal(evidence.promotion.scopeId, 'user');
assert.equal(evidence.promotion.scopeAuthorizationFromScope, 'mission');
assert.equal(evidence.promotion.scopeAuthorizationToScope, 'user');
assert.equal(evidence.promotion.scopeAuthorizationToScopeId, 'user');
assert.equal(evidence.promotion.scopeAuthorizationStatus, 'consumed');
assert.equal(evidence.promotion.memoryRollbackStatus, 'memory-deleted');

const { authorization, promotion, rollback } = evidence.audit;
assert.ok(authorization.index < promotion.index);
assert.ok(promotion.index < rollback.index);
assert.ok(authorization.at <= promotion.at);
assert.ok(promotion.at <= rollback.at);
for (const event of [authorization, promotion, rollback]) {
  assert.equal(event.scopeAuthorizationId, evidence.promotion.scopeAuthorizationId);
}

const runs = [
  evidence.sourceRun,
  ...Object.values(evidence.phases).flatMap((target) => [
    target.beforePromotion,
    target.afterPromotion,
    target.afterRollback,
  ]),
];
assert.equal(runs.length, 7);
assert.equal(new Set(runs.map((run) => run.sessionId)).size, 7);
assert.equal(runs.every((run) => run.providerId === 'stub'), true);
assert.equal(runs.every((run) => run.externalProviderCallCount === 0), true);

for (const target of ['sibling', 'crossWorkspace']) {
  const phases = evidence.phases[target];
  const quality = evidence.quality[target];
  assert.deepEqual(
    [
      quality.beforePromotion.status,
      quality.afterPromotion.status,
      quality.afterRollback.status,
    ],
    ['failed', 'passed', 'failed'],
  );
  assert.equal(phases.afterPromotion.retrieval.scope, 'user');
  assert.equal(phases.afterPromotion.retrieval.scopeId, 'user');
  assert.equal(phases.afterPromotion.retrieval.sourceId, evidence.promotion.memoryId);
  assert.equal(phases.afterPromotion.retrieval.contentHash, evidence.promotion.memoryContentHash);
  assert.equal(
    phases.afterRollback.artifacts.deliverableHash,
    phases.beforePromotion.artifacts.deliverableHash,
  );
  assert.equal(
    phases.afterRollback.artifacts.plannerHash,
    phases.beforePromotion.artifacts.plannerHash,
  );
  assert.equal(quality.afterRollback.resultHash, quality.beforePromotion.resultHash);
}

assert.equal(evidence.qualityBoundary.singleUserGlobalScopeValidated, true);
assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
assert.equal(evidence.qualityBoundary.generalUserPersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.hostedTenantUserPersonalizationValidated, false);
assert.equal(evidence.qualityBoundary.multiUserIsolationValidated, false);
assert.equal(evidence.productionReadyClaim, false);

const evidenceText = JSON.stringify(evidence);
for (const testCase of fixture.cases) {
  for (const rawText of [
    testCase.expectedPlanStep,
    testCase.promotionNote,
    testCase.scopeAuthorizationNote,
    testCase.sourceObjective,
    testCase.sourceTitle,
    testCase.targetObjective,
    testCase.targetTitle,
    ...testCase.requiredAnswerTerms,
  ]) {
    assert.equal(evidenceText.includes(rawText), false, `P7 evidence leaked fixture text: ${rawText}`);
  }
}
for (const forbidden of ['/Users/', '/private/var/folders/', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) {
  assert.equal(evidenceText.includes(forbidden), false, `P7 evidence leaked ${forbidden}`);
}

const implementationSource = [
  'src/cli.mjs',
  'src/core/learning-promotion.mjs',
  'src/providers/stub-provider.mjs',
  'src/web/action-handlers.mjs',
  'scripts/approved-learning-feedback-runtime.mjs',
  'scripts/evaluate-local-user-learning-personalization.mjs',
].map(readRequiredFile).join('\n');
for (const term of [
  '<workspace|user>',
  'GLOBAL_USER_SCOPE_ID',
  'User-scoped learning promotion is limited to local workspaces',
  'authorizeLearningCandidate',
  "'--provider', 'stub'",
  'evaluateAnswerQualityCase',
]) {
  assert.ok(implementationSource.includes(term), `P7 implementation missing ${term}`);
}

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: local-training-runtime-contract-current',
  '| P7 Local user learning personalization | 완료 |',
  'npm run smoke:local-user-learning-personalization',
  'actualLocalUserScopedPersonalizationValidated: true',
  'multiUserIsolationValidated: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readRequiredFile('README.md').includes('npm run smoke:local-user-learning-personalization'),
  'README must expose the P7 local user personalization smoke command.',
);

const tampered = structuredClone(evidence);
tampered.phases.crossWorkspace.afterPromotion.retrieval.contentHash = '0'.repeat(64);
assert.throws(
  () => assertLocalUserLearningPersonalizationEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualLocalUserScopedPersonalizationValidated: true,
  actualModelTrainingExecuted: false,
  costFree: true,
  externalProviderCalls: 'none',
  hostedTenantUserPersonalizationValidated: false,
  mode: 'local-user-learning-personalization-smoke',
  multiUserIsolationValidated: false,
  ok: true,
  productionReadyClaim: false,
  sessionCount: 7,
  targetQualityStatuses: ['failed', 'passed', 'failed'],
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
