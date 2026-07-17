import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = readJson('package.json');
const gitignore = fs.readFileSync('.gitignore', 'utf8');
const runbook = fs.readFileSync(
  'docs/actual-user-query-evaluation-v1.md',
  'utf8',
);
const qualitySource = fs.readFileSync(
  'src/core/local-user-query-quality.mjs',
  'utf8',
);
const evaluationSource = fs.readFileSync(
  'scripts/evaluate-local-user-query-quality.mjs',
  'utf8',
);

assert.equal(
  packageJson.scripts['build:user-query-evaluation-intake'],
  'node scripts/build-user-query-evaluation-intake.mjs',
);
assert.equal(
  packageJson.scripts['evaluate:local-user-query-quality'],
  'node scripts/evaluate-local-user-query-quality.mjs',
);
assert.equal(
  packageJson.scripts['smoke:actual-user-query-evaluation-readiness'],
  'node scripts/smoke-actual-user-query-evaluation-readiness.mjs',
);
assert.match(gitignore, /^var\/$/mu);
assert.match(runbook, /actualUserQueryData: false/u);
assert.match(runbook, /actualUserQueryQualityValidated: false/u);
assert.match(runbook, /productionReadyClaim: false/u);
assert.match(runbook, /review-action-generalization-v5/u);
assert.match(runbook, /npm run build:user-query-evaluation-intake/u);
assert.match(runbook, /npm run evaluate:local-user-query-quality/u);
assert.match(runbook, /철회/u);
assert.match(
  qualitySource,
  /q7-review-action-generalization-baseline-passed/u,
);
assert.match(
  qualitySource,
  /review-action-generalization-v5/u,
);
assert.match(
  evaluationSource,
  /createReviewActionGeneralizedOllamaAnswerGenerator/u,
);
assert.match(evaluationSource, /readCurrentAuthorizedIntake/u);
assert.equal(
  fs.existsSync(
    'evidence/output-artifacts/local-actual-user-query-quality.json',
  ),
  false,
);

console.log(JSON.stringify({
  actualEvaluationExecuted: false,
  actualUserQueryData: false,
  actualUserQueryQualityValidated: false,
  mode: 'actual-user-query-evaluation-readiness-smoke',
  ok: true,
  productionReadyClaim: false,
  protocolReady: true,
}, null, 2));

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
