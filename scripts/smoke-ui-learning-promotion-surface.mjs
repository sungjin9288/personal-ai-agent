import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-learning-promotion-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'ui-learning-promotion-workspace'],
});

const promotedMission = createMission({
  objective: 'Create a success-pattern candidate and promote it through the web operator API.',
  title: 'UI learning promotion approve',
});
const promotedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', promotedMission.id, '--provider', 'stub'],
});
assert.equal(promotedRun.status, 'completed');
assert.ok(promotedRun.learningCandidateId);

const expiredMission = createMission({
  objective: 'Create a learning candidate that will be expired through the web operator API.',
  title: 'UI learning promotion expire',
});
const expiredRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', expiredMission.id, '--provider', 'stub'],
});
assert.equal(expiredRun.status, 'completed');
assert.ok(expiredRun.learningCandidateId);

const rejectedMission = createMission({
  constraints: 'force-rubric-fail',
  deliverable: 'checklist',
  objective: 'Create a quality-regression candidate and reject it through the web operator API.',
  title: 'UI learning promotion reject',
});
const rejectedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', rejectedMission.id, '--provider', 'stub'],
});
assert.equal(rejectedRun.status, 'failed');
assert.ok(rejectedRun.learningCandidateId);

const blockedMission = createMission({
  objective: 'Create a learning candidate that fails promotion verification and is closed from the web operator API.',
  title: 'UI learning promotion stop-condition',
});
const blockedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', blockedMission.id, '--provider', 'stub'],
});
assert.equal(blockedRun.status, 'completed');
assert.ok(blockedRun.learningCandidateId);

const unsafeState = readState();
const unsafeCandidate = unsafeState.learningCandidates.find(
  (candidate) => candidate.id === blockedRun.learningCandidateId,
);
assert.ok(unsafeCandidate);
unsafeCandidate.safety.noRawSecrets = false;
unsafeCandidate.summary = `${unsafeCandidate.summary} UI fixture intentionally marks noRawSecrets=false.`;
writeState(unsafeState);

const blockedResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-learning-promotion',
    blockedRun.learningCandidateId,
    '--decision',
    'approve',
    '--target',
    'memory',
    '--scope',
    'mission',
    '--note',
    'Block unsafe memory promotion before the web operator resolves the stop-condition.',
  ],
});
assert.equal(blockedResult.learningCandidate.promotionStatus, 'verification-blocked');

const agedBlockedState = readState();
const agedBlockedCandidate = agedBlockedState.learningCandidates.find(
  (candidate) => candidate.id === blockedRun.learningCandidateId,
);
assert.ok(agedBlockedCandidate);
const agedReminderBaseAt = '2000-01-01T00:00:00.000Z';
agedBlockedCandidate.createdAt = agedReminderBaseAt;
agedBlockedCandidate.updatedAt = agedReminderBaseAt;
agedBlockedCandidate.promotionDecision.decidedAt = agedReminderBaseAt;
agedBlockedCandidate.promotionStopCondition.blockedAt = agedReminderBaseAt;
writeState(agedBlockedState);

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = { stderr: '', stdout: '' };
const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (chunk) => {
  serverOutput.stdout += String(chunk);
});

serverProcess.stderr.on('data', (chunk) => {
  serverOutput.stderr += String(chunk);
});

try {
  await waitForServer(baseUrl, serverProcess, serverOutput);

  const appJs = await fetchText(`${baseUrl}/app.js`);
  assert.equal(appJs.includes('data-learning-promotion-resolve'), true);
  assert.equal(appJs.includes('data-learning-promotion-expire'), true);
  assert.equal(appJs.includes('data-learning-promotion-rollback'), true);
  assert.equal(appJs.includes('data-learning-promotion-remind'), true);
  assert.equal(appJs.includes('stop-condition 반려'), true);
  assert.equal(appJs.includes('stop-condition 재알림'), true);
  assert.equal(appJs.includes('stopConditionRejectCommand'), true);
  assert.equal(appJs.includes('remindCommand'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/expire'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/resolve'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/rollback'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/remind'), true);
  assert.equal(appJs.includes('promotionStatus=operator-active'), true);
  assert.match(appJs, /\['provider-attention', 'specialist-follow-up', 'learning-promotion'\]/);

  const initialInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(promotedMission.id)}&promotionStatus=all`,
  );
  const initialItem = findLearningItem(initialInbox, promotedRun.learningCandidateId);
  assert.equal(initialItem.actionType, 'learning-promotion');
  assert.equal(initialItem.actionClass, 'awaiting-human-decision');
  assert.equal(initialItem.promotionStatus, 'pending-review');
  assert.equal(initialItem.resolveCommand.includes('resolve-learning-promotion'), true);
  assert.equal(initialItem.expireCommand.includes('expire-learning-promotions'), true);
  assert.equal(initialItem.rollbackEligible, false);

  const promotionResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(promotedRun.learningCandidateId)}/resolve`,
    {
      decision: 'approve',
      note: 'Approve scoped memory promotion from the web operator surface.',
      scope: initialItem.scope,
      target: 'memory',
    },
  );
  assert.equal(promotionResult.learningCandidate.promotionStatus, 'promoted');
  assert.equal(promotionResult.learningCandidate.promotionDecision.decision, 'approve');
  assert.ok(promotionResult.memoryEntry.id);

  const promotedInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(promotedMission.id)}&promotionStatus=operator-active`,
  );
  const promotedItem = findLearningItem(promotedInbox, promotedRun.learningCandidateId);
  assert.equal(promotedItem.promotionStatus, 'promoted');
  assert.equal(promotedItem.rollbackEligible, true);
  assert.equal(promotedItem.rollbackCommand.includes('rollback-learning-promotion'), true);

  const rollbackResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(promotedRun.learningCandidateId)}/rollback`,
    {
      note: 'Rollback promoted memory from the web operator surface.',
    },
  );
  assert.equal(rollbackResult.learningCandidate.promotionStatus, 'rolled-back');
  assert.equal(rollbackResult.learningCandidate.promotionRollback.memoryRollbackStatus, 'memory-deleted');
  assert.equal(rollbackResult.removedMemoryEntry.id, promotionResult.memoryEntry.id);

  const rolledBackInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(promotedMission.id)}&promotionStatus=operator-active`,
  );
  assert.equal(
    rolledBackInbox.items.some((item) => item.learningCandidateId === promotedRun.learningCandidateId),
    false,
  );

  const expireInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(expiredMission.id)}&promotionStatus=all`,
  );
  const expiringItem = findLearningItem(expireInbox, expiredRun.learningCandidateId);
  const expirationResult = await postJson(`${baseUrl}/api/actions/learning-promotions/expire`, {
    before: expiringItem.expirationPolicy.expiresAt,
    missionId: expiringItem.missionId,
    note: 'Expire pending promotion from the web operator surface.',
    recordType: expiringItem.recordType,
    scope: expiringItem.scope,
    target: expiringItem.proposalTarget,
    workspaceId: expiringItem.workspaceId,
  });
  assert.equal(expirationResult.summary.expiredCount, 1);
  assert.equal(expirationResult.expiredCandidates[0].id, expiredRun.learningCandidateId);
  assert.equal(expirationResult.expiredCandidates[0].promotionStatus, 'expired');

  const expiredInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(expiredMission.id)}&promotionStatus=operator-active`,
  );
  assert.equal(expiredInbox.items.some((item) => item.learningCandidateId === expiredRun.learningCandidateId), false);

  const rejectInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(rejectedMission.id)}&promotionStatus=all`,
  );
  const rejectingItem = findLearningItem(rejectInbox, rejectedRun.learningCandidateId);
  const rejectResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(rejectedRun.learningCandidateId)}/resolve`,
    {
      decision: 'reject',
      note: 'Reject forced regression candidate from the web operator surface.',
      scope: rejectingItem.scope,
      target: rejectingItem.proposalTarget,
    },
  );
  assert.equal(rejectResult.learningCandidate.promotionStatus, 'rejected');
  assert.equal(rejectResult.learningCandidate.promotionDecision.decision, 'reject');
  assert.equal(rejectResult.memoryEntry, null);

  const rejectedActiveInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(rejectedMission.id)}&promotionStatus=operator-active`,
  );
  assert.equal(
    rejectedActiveInbox.items.some((item) => item.learningCandidateId === rejectedRun.learningCandidateId),
    false,
  );

  const blockedActiveInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active`,
  );
  const blockedItem = findLearningItem(blockedActiveInbox, blockedRun.learningCandidateId);
  assert.equal(blockedItem.actionClass, 'blocked');
  assert.equal(blockedItem.priority, 'high');
  assert.equal(blockedItem.promotionStatus, 'verification-blocked');
  assert.equal(blockedItem.promotionVerificationStatus, 'failed');
  assert.equal(blockedItem.promotionStopReason, 'learning-promotion-verification-no-raw-secrets');
  assert.equal(blockedItem.recommendedCommand.includes('--decision reject'), true);
  assert.equal(blockedItem.stopConditionRejectCommand.includes('--decision reject'), true);
  assert.equal(blockedItem.reminderCadenceHours, 12);
  assert.equal(blockedItem.reminderCount, 0);
  assert.equal(blockedItem.needsReminder, true);
  assert.equal(blockedItem.nextReminderAt, '2000-01-01T12:00:00.000Z');
  assert.equal(blockedItem.remindCommand.includes('remind-learning-promotion-stop-conditions'), true);

  const reminderResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(blockedRun.learningCandidateId)}/remind`,
    {
      dueOnly: true,
      missionId: blockedItem.missionId,
      note: 'Remind approver from the web operator surface before rejecting the blocked stop-condition.',
      workspaceId: blockedItem.workspaceId,
    },
  );
  assert.equal(reminderResult.summary.dueCandidateCount, 1);
  assert.equal(reminderResult.summary.remindedCount, 1);
  assert.equal(reminderResult.items[0].learningCandidateId, blockedRun.learningCandidateId);
  assert.equal(reminderResult.items[0].reminderCount, 1);
  assert.equal(reminderResult.items[0].needsReminder, false);
  assert.equal(
    reminderResult.items[0].latestReminder.note,
    'Remind approver from the web operator surface before rejecting the blocked stop-condition.',
  );

  const remindedBlockedInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active`,
  );
  const remindedBlockedItem = findLearningItem(remindedBlockedInbox, blockedRun.learningCandidateId);
  assert.equal(remindedBlockedItem.promotionStatus, 'verification-blocked');
  assert.equal(remindedBlockedItem.reminderCount, 1);
  assert.equal(remindedBlockedItem.needsReminder, false);
  assert.ok(remindedBlockedItem.lastReminderAt);

  const remindedState = readState();
  const remindedCandidate = remindedState.learningCandidates.find(
    (candidate) => candidate.id === blockedRun.learningCandidateId,
  );
  assert.equal(remindedCandidate.promotionStopCondition.reminderCount, 1);
  assert.equal(remindedCandidate.promotionStopCondition.reminders.length, 1);

  const stopConditionRejectResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(blockedRun.learningCandidateId)}/resolve`,
    {
      decision: 'reject',
      note: 'Reject blocked stop-condition from the web operator surface.',
      scope: blockedItem.scope,
      target: blockedItem.proposalTarget,
    },
  );
  assert.equal(stopConditionRejectResult.learningCandidate.promotionStatus, 'rejected');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionDecision.decision, 'blocked');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionDecision.remediationDecision, 'reject');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionStopCondition.status, 'resolved');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionStopCondition.resolution, 'rejected');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionStopCondition.reminderCount, 1);

  const closedBlockedActiveInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active`,
  );
  assert.equal(
    closedBlockedActiveInbox.items.some((item) => item.learningCandidateId === blockedRun.learningCandidateId),
    false,
  );

  const blockedTimeline = runCli({
    rootDir: tempRoot,
    args: ['mission', 'timeline', blockedMission.id],
  });
  const reminderTimelineEvent = blockedTimeline.timeline.find(
    (event) =>
      event.kind === 'learning-candidate-promotion-stop-condition-reminded' &&
      event.learningCandidateId === blockedRun.learningCandidateId,
  );
  assert.ok(reminderTimelineEvent);
  assert.equal(reminderTimelineEvent.promotionStopReason, 'learning-promotion-verification-no-raw-secrets');

  console.log(
    JSON.stringify(
      {
        mode: 'ui-learning-promotion-surface',
        ok: true,
        blockedCandidateId: blockedRun.learningCandidateId,
        expiredCandidateId: expiredRun.learningCandidateId,
        promotedCandidateId: promotedRun.learningCandidateId,
        rejectedCandidateId: rejectedRun.learningCandidateId,
        rolledBackCandidateId: promotedRun.learningCandidateId,
      },
      null,
      2,
    ),
  );
} finally {
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
  await waitForExit(serverProcess);
}

function createMission({ constraints = '', deliverable = 'decision-memo', objective, title }) {
  const args = [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    deliverable,
    '--title',
    title,
    '--objective',
    objective,
  ];
  if (constraints) {
    args.push('--constraints', constraints);
  }
  return runCli({ rootDir: tempRoot, args });
}

function readState() {
  return JSON.parse(fs.readFileSync(path.join(tempRoot, 'var', 'state.json'), 'utf8'));
}

function writeState(state) {
  fs.writeFileSync(path.join(tempRoot, 'var', 'state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function findLearningItem(inbox, learningCandidateId) {
  const item = inbox.items.find((entry) => entry.learningCandidateId === learningCandidateId);
  assert.ok(item, `Expected learning promotion item for ${learningCandidateId}`);
  return item;
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate a local port.'));
        return;
      }
      const { port: resolvedPort } = address;
      server.close(() => resolve(resolvedPort));
    });
    server.on('error', reject);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${url} ${body}`);
  }
  return await response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return await response.text();
}

async function postJson(url, payload) {
  return await fetchJson(url, {
    body: JSON.stringify(payload),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });
}

async function waitForServer(baseUrl, childProcess, output, { timeoutMs = 20_000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess.exitCode !== null) {
      throw new Error(`UI server exited early: ${output.stdout}\n${output.stderr}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for UI server at ${baseUrl}`);
}

async function waitForExit(childProcess) {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    childProcess.once('exit', resolve);
  });
}
