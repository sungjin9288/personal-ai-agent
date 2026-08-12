import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { assertEngineeringApprovalRehearsalEvidence } from '../src/core/engineering-approval-rehearsal-evidence.mjs';
import { LOCAL_V1_EXTERNAL_BLOCKER_IDS } from '../src/core/local-v1-completion-closeout.mjs';
import { assertPilotFeedbackRecord } from '../src/core/pilot-feedback-evidence.mjs';

const repoDir = process.cwd();
const artifactPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'engineering-approval-workflow-rehearsal.json',
);
const docPath = path.join(repoDir, 'docs', 'engineering-approval-workflow-rehearsal-v1.md');
const pilotFeedbackPath = path.join(repoDir, 'config', 'pilot-feedback-v1.json');
const closeoutPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-v1-completion-closeout.json',
);

const artifact = JSON.parse(readRequiredFile(artifactPath));
const doc = readRequiredFile(docPath);
const pilotFeedback = JSON.parse(readRequiredFile(pilotFeedbackPath));
const closeout = JSON.parse(readRequiredFile(closeoutPath));

assert.equal(assertEngineeringApprovalRehearsalEvidence(artifact), artifact);
assertCaptureCommitProvenance(artifact.captureCommit);
assert.equal(assertPilotFeedbackRecord(pilotFeedback), true);
assert.equal(pilotFeedback.participant.count, 1);
assert.equal(pilotFeedback.authority.productionReadyClaim, false);

for (const term of [
  '# Engineering Approval Workflow Rehearsal v1',
  'status: verified-deterministic-rehearsal',
  `captureCommit: \`${artifact.captureCommit}\``,
  'scenario: scenario-2-engineering-mission-with-approval',
  'providerMode: stub',
  'participantCount: 0',
  'humanApprovalCollected: false',
  'humanFeedbackCollected: false',
  'externalProviderCalls: 0',
  'providerCostUsd: 0',
  'productionReadyClaim: false',
  'npm run smoke:engineering-approval',
]) {
  assert.ok(doc.includes(term), `engineering approval rehearsal evidence is missing: ${term}`);
}

for (const limitation of [
  'not human approval evidence',
  'not participant feedback evidence',
  'not a generalizable result',
  'not productivity evidence',
  'not external-provider validation',
  'not deployment or production evidence',
]) {
  assert.ok(doc.includes(limitation), `engineering approval rehearsal limitation is missing: ${limitation}`);
}

assert.deepEqual(closeout.externalBlockerIds, LOCAL_V1_EXTERNAL_BLOCKER_IDS);

assert.equal(artifact.limitations.participantCount, 0);
assert.equal(artifact.limitations.humanApprovalCollected, false);
assert.equal(artifact.limitations.humanFeedbackCollected, false);
assert.equal(artifact.limitations.generalizableClaim, false);
assert.equal(artifact.limitations.productivityClaim, false);
assert.equal(artifact.limitations.productionReadyClaim, false);
assert.equal(artifact.safety.externalProviderCalls, 0);
assert.equal(artifact.safety.providerCostUsd, 0);

console.log(
  JSON.stringify(
    {
      captureCommit: artifact.captureCommit,
      externalBlockerCount: LOCAL_V1_EXTERNAL_BLOCKER_IDS.length,
      mode: 'engineering-approval-workflow-rehearsal-smoke',
      ok: true,
      participantCount: artifact.limitations.participantCount,
      productionReadyClaim: artifact.limitations.productionReadyClaim,
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
    `engineering approval rehearsal capture commit does not exist: ${captureCommit}`,
  );
  assert.equal(
    gitSucceeds(['merge-base', '--is-ancestor', captureCommit, 'HEAD']),
    true,
    `engineering approval rehearsal capture commit is not an ancestor of HEAD: ${captureCommit}`,
  );
}

function gitSucceeds(args) {
  return spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: 'ignore',
  }).status === 0;
}
