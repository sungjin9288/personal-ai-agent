import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  LOCAL_V1_COMPLETION_MATRIX,
  LOCAL_V1_COMPLETION_SCHEMA_VERSION,
  LOCAL_V1_EXTERNAL_BLOCKER_IDS,
  LOCAL_V1_SOURCE_DOCUMENTS,
  assertLocalV1CompletionArtifact,
} from '../src/core/local-v1-completion-closeout.mjs';

const repoDir = process.cwd();
const artifact = readJson('evidence/output-artifacts/local-v1-completion-closeout.json');
const sourceDocumentTexts = Object.fromEntries(
  LOCAL_V1_SOURCE_DOCUMENTS.map((document) => [document, readText(document)]),
);
const c13AttemptText = readText('evidence/output-artifacts/local-council-v6-actual-compatibility-attempt.json');
const c13FinalText = readText('evidence/output-artifacts/local-council-v6-actual-compatibility-observation.json');
const implementationCommit = artifact.implementationCommit;
const closeout = sourceDocumentTexts['docs/local-v1-completion-closeout-v1.md'];
const councilPlan = sourceDocumentTexts['docs/multi-agent-council-development-plan-v1.md'];
const externalBlockers = sourceDocumentTexts['docs/external-evidence-blockers-v1.md'];
const pilotFeedback = sourceDocumentTexts['docs/pilot-feedback-v1.md'];
const pilotFeedbackRecord = JSON.parse(sourceDocumentTexts['config/pilot-feedback-v1.json']);
const mlRagPlan = sourceDocumentTexts['docs/ml-rag-development-plan-v1.md'];
const packageJson = readJson('package.json');
const readme = sourceDocumentTexts['README.md'];
const refactoringPlan = sourceDocumentTexts['docs/refactoring-development-plan-v1.md'];
const roadmap = sourceDocumentTexts['docs/roadmap.md'];
const releaseReadiness = sourceDocumentTexts['docs/release-readiness-v1.md'];

assert.match(implementationCommit, /^[a-f0-9]{40}$/);
assert.equal(artifact.schemaVersion, LOCAL_V1_COMPLETION_SCHEMA_VERSION);
assert.deepEqual(artifact.completionMatrix, LOCAL_V1_COMPLETION_MATRIX);
const historyValidation = validateImplementationHistory(implementationCommit, sourceDocumentTexts);
assertLocalV1CompletionArtifact(artifact, {
  c13AttemptText,
  c13FinalText,
  implementationCommit,
  sourceDocumentTexts,
});
assert.equal(
  packageJson.scripts['smoke:local-v1-completion-closeout'],
  'node scripts/smoke-local-v1-completion-closeout.mjs',
);
assert.match(closeout, /status: `local-v1-complete-external-evidence-open`/);
assert.match(closeout, /completionMatrix/);
assert.match(closeout, /localProduct: complete/);
assert.match(closeout, /provider: partial-external-blocked/);
assert.match(closeout, /deployment: external-blocked/);
assert.match(closeout, /privateDataTraining: approval-blocked-unverified/);
assert.match(closeout, /rollout: approval-blocked-unverified/);
assert.match(releaseReadiness, /productionReadyClaim: false/);
assert.match(closeout, /productionReadyClaim: false/);
assert.match(closeout, /C13 is `actual-incompatible`[\s\S]*`keep-stub-only`/);
for (const blockerId of LOCAL_V1_EXTERNAL_BLOCKER_IDS) {
  assert.ok(closeout.includes(`\`${blockerId}\``), `closeout missing blocker ${blockerId}`);
}
assert.match(roadmap, /local-v1-complete-external-evidence-open/);
assert.match(refactoringPlan, /D4\.1[\s\S]*완료[\s\S]*D4\.6[\s\S]*완료/);
assert.match(
  mlRagPlan,
  /status: local-v1-protocol-complete-private-authority-deferred/,
);
assert.match(mlRagPlan, /fineTuningDataIntakeRequestStatus: pending-owner-review/);
assert.match(councilPlan, /status: completed/);
assert.match(
  councilPlan,
  /C13 — v6 actual compatibility observation[\s\S]*actual-incompatible-keep-stub-only/,
);
assert.match(readme, /Council local compatibility[\s\S]*actual-incompatible/);
assert.match(readme, /default answer path remains unchanged/);
assert.match(externalBlockers, /publicHostedDemoUrl: https:\/\/github\.com\/sungjin9288\/personal-ai-agent\/releases\/download\/walkthrough-v1\/personal-ai-agent-recorded-walkthrough-v1\.mp4/);
assert.match(externalBlockers, /productionReadyClaim: false/);
assert.match(pilotFeedback, /status: sanitized-single-participant-evidence/);
assert.match(pilotFeedback, /positiveAnswers: 4\/4/);
assert.equal(pilotFeedbackRecord.participant.count, 1);
assert.equal(pilotFeedbackRecord.authority.productionReadyClaim, false);

console.log(JSON.stringify({
  implementationCommit,
  historyValidation,
  mode: 'smoke-local-v1-completion-closeout',
  ok: true,
  status: artifact.status,
}, null, 2));

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function validateImplementationHistory(commit, sourceTexts) {
  const commitLookup = spawnSync('git', ['cat-file', '-e', `${commit}^{commit}`], {
    cwd: repoDir,
    stdio: 'ignore',
  });
  if (commitLookup.status !== 0) {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    assert.equal(shallow, 'true', 'Implementation commit is missing from a non-shallow checkout.');
    return 'shallow-source-hash-only';
  }

  execFileSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], {
    cwd: repoDir,
    stdio: 'ignore',
  });
  for (const document of LOCAL_V1_SOURCE_DOCUMENTS) {
    const committedText = execFileSync('git', ['show', `${commit}:${document}`], {
      cwd: repoDir,
      encoding: 'utf8',
    });
    assert.equal(committedText, sourceTexts[document], `${document} drifted after implementation commit.`);
  }
  return 'full-history';
}
