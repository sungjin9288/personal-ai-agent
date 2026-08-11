import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { assertPilotFeedbackRecord } from '../src/core/pilot-feedback-evidence.mjs';

const repoDir = process.cwd();
const recordPath = path.join(repoDir, 'config', 'pilot-feedback-v1.json');
const docPath = path.join(repoDir, 'docs', 'pilot-feedback-v1.md');

const record = JSON.parse(readRequiredFile(recordPath));
const doc = readRequiredFile(docPath);

assert.equal(assertPilotFeedbackRecord(record), true);
assertCaptureCommitProvenance(record.captureCommit);

for (const term of [
  '# Pilot Feedback Evidence v1',
  'status: sanitized-single-participant-evidence',
  'participantCount: 1',
  'participantRole: engineering-participant',
  'consentScope: sanitized-feedback-and-predefined-metrics',
  'providerMode: deterministic-only',
  'positiveAnswers: 4/4',
  'broaderUsageBlocker: none-observed-in-this-single-pilot',
  'decision: continue-deterministic-only-pilot',
  'nextWorkflow: another-bounded-nonsensitive-engineering-workflow',
  'externalProviderCallCount: 0',
  'workspaceMutationCount: 0',
  'productionReadyClaim: false',
  'npm run smoke:pilot-feedback',
]) {
  assert.ok(doc.includes(term), `pilot feedback evidence is missing: ${term}`);
}

for (const limitation of [
  'not external-provider validation',
  'not customer-impact evidence',
  'not productivity evidence',
  'not cost-savings evidence',
  'not SLA evidence',
  'not a generalizable result',
]) {
  assert.ok(doc.includes(limitation), `pilot feedback limitation is missing: ${limitation}`);
}

const machineLocalPrefixes = [
  path.join(path.sep, 'Users') + path.sep,
  path.join(path.sep, 'private', 'var', 'folders') + path.sep,
  path.join(path.sep, 'var', 'folders') + path.sep,
];

for (const unsafe of [
  ...machineLocalPrefixes,
  'participantName',
  'participantEmail',
  'customer secret',
]) {
  assert.equal(doc.includes(unsafe), false, `pilot feedback evidence contains unsafe text: ${unsafe}`);
}

assert.equal(record.participant.count, 1);
assert.equal(record.feedback.positiveAnswerCount, 4);
assert.equal(record.feedback.questionCount, 4);
assert.equal(record.runEvidence.externalProviderCallCount, 0);
assert.equal(record.runEvidence.workspaceMutationCount, 0);
assert.equal(record.authority.productionReadyClaim, false);

console.log(
  JSON.stringify(
    {
      mode: 'pilot-feedback-smoke',
      ok: true,
      participantCount: record.participant.count,
      positiveAnswers: `${record.feedback.positiveAnswerCount}/${record.feedback.questionCount}`,
      providerMode: record.scope.providerMode,
      productionReadyClaim: record.authority.productionReadyClaim,
    },
    null,
    2,
  ),
);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${path.relative(repoDir, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertCaptureCommitProvenance(captureCommit) {
  assert.equal(
    gitSucceeds(['cat-file', '-e', `${captureCommit}^{commit}`]),
    true,
    `pilot feedback capture commit does not exist: ${captureCommit}`,
  );
  assert.equal(
    gitSucceeds(['merge-base', '--is-ancestor', captureCommit, 'HEAD']),
    true,
    `pilot feedback capture commit is not an ancestor of HEAD: ${captureCommit}`,
  );
}

function gitSucceeds(args) {
  return spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: 'ignore',
  }).status === 0;
}
