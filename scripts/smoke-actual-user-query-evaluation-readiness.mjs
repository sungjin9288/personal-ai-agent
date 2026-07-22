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
const privatePathSource = fs.readFileSync(
  'scripts/private-user-query-evaluation-paths.mjs',
  'utf8',
);
const suiteSource = fs.readFileSync(
  'scripts/local-user-query-evaluation-suite.mjs',
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
assert.match(runbook, /owner-only directory `0700`, regular file `0600`/u);
assert.match(runbook, /all-pass contract로 고정/u);
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
assert.match(privatePathSource, /O_NOFOLLOW/u);
assert.match(privatePathSource, /PRIVATE_DIRECTORY_MODE = 0o700/u);
assert.match(privatePathSource, /PRIVATE_FILE_MODE = 0o600/u);
assert.match(privatePathSource, /fs\.renameSync\(temporaryPath, filename\)/u);
assert.match(suiteSource, /assertLocalUserQueryQualityThresholds\(thresholds\)/u);
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
