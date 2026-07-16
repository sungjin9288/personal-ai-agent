import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  buildCandidateModelEvidence,
  evaluateCandidateModelGate,
} from '../src/core/candidate-model-evaluation.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { createApprovedTrainingRecordFixtureSet } from './training-record-fixture-runtime.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/candidate-model-evaluation-cases-v1.json'));
const datasetFixture = JSON.parse(readRequiredFile('fixtures/training-dataset-quality-cases-v1.json'));
const answerQualityFixture = JSON.parse(readRequiredFile('fixtures/answer-quality-cases-v1.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(fixture.schemaVersion, 'personal-ai-agent-candidate-model-evaluation-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);

const { records, stateBefore, statePath, tempRoot } = createApprovedTrainingRecordFixtureSet({
  cases: datasetFixture.cases,
  tempPrefix: 'personal-ai-agent-candidate-model-evaluation-',
});
const datasetManifest = buildTrainingDatasetManifest({
  records,
  seed: datasetFixture.seed,
});
const baselineCases = answerQualityFixture.cases.map(({ retrievalInput, ...definition }) => ({
  ...definition,
  retrievedItems: buildRetrievalContext(retrievalInput),
}));
const baselineEvaluation = evaluateAnswerQualitySuite({
  cases: baselineCases,
  thresholds: answerQualityFixture.thresholds,
});
const readinessPackage = buildFineTuningReadinessPackage({
  baselineEvaluation,
  datasetManifest,
  records,
});
const candidateCases = baselineCases.map((definition) => ({
  ...structuredClone(definition),
  answer: fixture.passingAnswers[definition.id],
}));
const candidateEvaluation = evaluateAnswerQualitySuite({
  cases: candidateCases,
  thresholds: answerQualityFixture.thresholds,
});
const candidateEvidence = buildFixtureEvidence(candidateEvaluation, fixture.candidate);
const gate = evaluateCandidateModelGate({
  candidateEvaluation,
  candidateEvidence,
  readinessPackage,
});

assert.equal(gate.status, fixture.expected.passingStatus);
assert.equal(gate.decision, fixture.expected.passingDecision);
assert.equal(gate.comparison.status, 'passed');
assert.equal(gate.comparison.checks.length, fixture.expected.comparisonCheckCount);
assert.equal(gate.comparison.checks.every((check) => check.status === 'passed'), true);
assert.equal(gate.rollout.status, fixture.expected.rolloutStatus);
assert.equal(gate.rollout.checks.length, fixture.expected.rolloutCheckCount);
assert.equal(gate.rollout.activationAuthorized, false);
assert.equal(gate.rollout.reviewerDecision, 'pending');
assert.equal(gate.candidate.actualModelEvaluated, false);
assert.equal(gate.externalSubmissionAuthorized, false);
assert.equal(gate.productionReadyClaim, false);
assert.equal(gate.rollback.required, false);
assert.equal(gate.rollback.owner, null);

const regressionCases = structuredClone(candidateCases);
const regressedCase = regressionCases.find((definition) => definition.id === fixture.regression.caseId);
assert.ok(regressedCase);
regressedCase.answer = fixture.regression.answer;
regressedCase.reviewerVerdict = fixture.regression.reviewerVerdict;
const regressionEvaluation = evaluateAnswerQualitySuite({
  cases: regressionCases,
  thresholds: answerQualityFixture.thresholds,
});
const regressionEvidence = buildFixtureEvidence(regressionEvaluation, {
  ...fixture.candidate,
  candidateId: 'candidate-fixture-regression-v1',
  evaluationRunId: 'candidate-evaluation-regression-v1',
  evidenceRefs: ['fixture:candidate-model-evaluation-regression-v1'],
  modelId: 'fixture-candidate-model-regression-v1',
});
const regressionGate = evaluateCandidateModelGate({
  candidateEvaluation: regressionEvaluation,
  candidateEvidence: regressionEvidence,
  readinessPackage,
});

assert.equal(regressionGate.status, fixture.expected.regressionStatus);
assert.equal(regressionGate.decision, fixture.expected.regressionDecision);
assert.equal(regressionGate.comparison.status, 'failed');
assert.equal(regressionGate.rollback.required, true);
assert.equal(regressionGate.rollback.action, 'keep-baseline');
assert.equal(regressionGate.rollout.activationAuthorized, false);
assert.equal(
  regressionGate.rollback.triggerCheckIds.includes('candidate-gate-passed'),
  true,
);
assert.equal(
  regressionGate.rollback.triggerCheckIds.includes('case-metrics-no-regression'),
  true,
);

const outputDir = path.join(tempRoot, 'candidate-model-evaluation');
fs.mkdirSync(outputDir, { recursive: true });
const gatePath = path.join(outputDir, 'candidate-gate.json');
const regressionPath = path.join(outputDir, 'regression-gate.json');
fs.writeFileSync(gatePath, `${JSON.stringify(gate, null, 2)}\n`, 'utf8');
fs.writeFileSync(regressionPath, `${JSON.stringify(regressionGate, null, 2)}\n`, 'utf8');
assert.deepEqual(JSON.parse(fs.readFileSync(gatePath, 'utf8')), gate);
assert.deepEqual(JSON.parse(fs.readFileSync(regressionPath, 'utf8')), regressionGate);
for (const answer of Object.values(fixture.passingAnswers)) {
  assert.equal(JSON.stringify(gate).includes(answer.text), false);
}
assert.deepEqual(fs.readFileSync(statePath), stateBefore, 'candidate evaluation must not mutate the store');

for (const term of [
  'status: local-relevance-shadow-cache-lifecycle-current',
  '| O1a Candidate evaluation gate | 완료 |',
  '| O1b Model rollout | 외부 작업 |',
  'fixtures/candidate-model-evaluation-cases-v1.json',
  'npm run smoke:candidate-model-evaluation',
  'fixture-simulated',
  'externalSubmissionAuthorized: false',
  'activationAuthorized: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:candidate-model-evaluation'),
  'README must expose the candidate model evaluation command',
);
assert.ok(
  evidenceGallery.includes('| Candidate model evaluation gate | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link the candidate model evaluation gate',
);
assert.ok(
  evidenceManifest.includes(
    'Candidate model evaluation gate: verified with `npm run smoke:candidate-model-evaluation`',
  ),
  'evidence manifest must record the candidate model evaluation gate',
);

console.log(
  JSON.stringify(
    {
      actualModelEvaluated: false,
      comparisonCheckCount: gate.comparison.checks.length,
      comparisonStatus: gate.comparison.status,
      costFree: true,
      externalSubmissionAuthorized: false,
      gateHash: gate.gateHash,
      mode: 'candidate-model-evaluation',
      ok: true,
      productionReadyClaim: false,
      regressionDecision: regressionGate.decision,
      regressionGateHash: regressionGate.gateHash,
      rolloutAuthorized: false,
      rolloutStatus: gate.rollout.status,
    },
    null,
    2,
  ),
);

function buildFixtureEvidence(candidateEvaluation, candidate) {
  return buildCandidateModelEvidence({
    actualModelEvaluated: false,
    candidateEvaluation,
    candidateId: candidate.candidateId,
    evaluatedAt: candidate.evaluatedAt,
    evaluationRunId: candidate.evaluationRunId,
    evaluationSource: candidate.evaluationSource,
    evidenceRefs: candidate.evidenceRefs,
    modelId: candidate.modelId,
    provider: candidate.provider,
    readinessPackage,
  });
}

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
