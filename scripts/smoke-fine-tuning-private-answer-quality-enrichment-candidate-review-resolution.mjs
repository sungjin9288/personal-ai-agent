import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const tests = [
  'test/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.test.mjs',
  'test/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-script.test.mjs',
];
const result = spawnSync(process.execPath, ['--test', ...tests], {
  cwd: repoDir,
  encoding: 'utf8',
});
assert.equal(result.status, 0, result.stderr || result.stdout);

const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
);
const plan = fs.readFileSync(
  path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
  'utf8',
);
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(
  path.join(repoDir, 'evidence', 'evidence_manifest.md'),
  'utf8',
);

assert.equal(
  packageJson.scripts[
    'resolve:fine-tuning-private-answer-quality-enrichment-candidate-review'
  ],
  'node scripts/resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs',
);
assert.equal(
  packageJson.scripts[
    'smoke:fine-tuning-private-answer-quality-enrichment-candidate-review-resolution'
  ],
  'node scripts/smoke-fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs',
);
for (const term of [
  'F1.17 Private answer-quality enrichment candidate review resolution protocol',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-replay',
  'currentFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionSurface: `scripts/resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs`',
  'fineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionStatus: protocol-ready-private-reviewer-decision-required',
  'npm run resolve:fine-tuning-private-answer-quality-enrichment-candidate-review',
  'npm run smoke:fine-tuning-private-answer-quality-enrichment-candidate-review-resolution',
  'q1ReviewerGateSatisfied: true only after approve',
  'q1ContractSatisfied: false',
  'answerQualityCaseCreated: false',
  'answerQualityCaseEvaluationExecuted: false',
  'F1.18',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(
  readme.includes(
    'npm run smoke:fine-tuning-private-answer-quality-enrichment-candidate-review-resolution',
  ),
);
assert.ok(
  manifest.includes(
    'Private answer-quality enrichment candidate review resolution protocol: verified with `npm run smoke:fine-tuning-private-answer-quality-enrichment-candidate-review-resolution`',
  ),
);

console.log(
  'fine-tuning private answer-quality enrichment candidate review resolution smoke passed',
);
