import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-action-overdue-log-'));
const workspaceOnePath = path.join(tempRoot, 'workspace-one');
const workspaceTwoPath = path.join(tempRoot, 'workspace-two');

fs.mkdirSync(workspaceOnePath, { recursive: true });
fs.mkdirSync(workspaceTwoPath, { recursive: true });

const workspaceOne = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspaceOnePath, '--name', 'workspace-one'],
});

const workspaceTwo = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspaceTwoPath, '--name', 'workspace-two'],
});

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const approvalMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Overdue approval action',
    '--objective',
    'Leave one pending approval to be logged as overdue.',
  ],
});

const approvalRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', approvalMission.id],
});

const reviewerMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Reviewer overdue candidate',
    '--objective',
    'Create a reviewer follow-up that remains on time.',
    '--constraints',
    'force-rubric-fail',
  ],
});

await service.runMission(reviewerMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

const reviewerSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', reviewerMission.id],
});

const reviewerProviderAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--workspace', workspaceTwo.id, '--mission', reviewerMission.id],
});

assert.equal(reviewerProviderAttention.items.length, 1);

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'acknowledge-provider-attention',
    reviewerProviderAttention.items[0].actionId,
    '--note',
    'Acknowledge reviewer provider failure before overdue drift logging.',
  ],
});

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-provider-attention',
    reviewerProviderAttention.items[0].actionId,
    '--note',
    'Resolve reviewer provider failure so only residual drift remains.',
  ],
});

const blockedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Blocked overdue action',
    '--objective',
    'Create a rejected approval follow-up that will be overdue.',
  ],
});

const blockedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', blockedMission.id],
});

const specialistMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'decision-memo',
    '--title',
    'Specialist overdue follow-up',
    '--objective',
    'Create a failed specialist branch that will be logged as overdue.',
    '--constraints',
    'parallel-specialists:research,implementation|parallel-fail:implementation',
  ],
});

runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', specialistMission.id],
});

const specialistMissionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', specialistMission.id],
});

assert.equal(specialistMissionShow.mission.status, 'failed');

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    blockedRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Scope is too broad and must be narrowed before rerun.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';
const overdueCurrentMonthTimestamp = '2026-04-01T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === approvalRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  if (approval.id === blockedRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
      resolvedAt: overdueTimestamp,
    };
  }

  return approval;
});

state.artifacts = state.artifacts.map((artifact) => {
  if (artifact.id === reviewerSession.artifacts.find((entry) => entry.fileName === 'reviewer-report.md')?.id) {
    return {
      ...artifact,
      createdAt: overdueCurrentMonthTimestamp,
    };
  }

  return artifact;
});

state.agentRuns = state.agentRuns.map((agentRun) => {
  if (agentRun.missionId === reviewerMission.id && agentRun.status === 'failed') {
    return {
      ...agentRun,
      endedAt: overdueCurrentMonthTimestamp,
      startedAt: overdueCurrentMonthTimestamp,
    };
  }

  if (agentRun.missionId === specialistMission.id && agentRun.specialistKind === 'implementation' && agentRun.status === 'failed') {
    return {
      ...agentRun,
      endedAt: overdueTimestamp,
      startedAt: overdueTimestamp,
    };
  }

  return agentRun;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const incidentLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue'],
});

assert.equal(incidentLog.logged, true);
assert.equal(incidentLog.count, 5);
assert.equal(incidentLog.escalationIds.length, 5);
assert.ok(incidentLog.path);
assert.equal(incidentLog.itemIds.length, 5);
assert.equal(incidentLog.summary.specialistFollowUpOverdueCount, 1);
assert.equal(incidentLog.summary.specialistFollowUpNeedsReminderCount, 1);
assert.equal(incidentLog.summary.specialistFollowUpReminderCountTotal, 0);
assert.equal(incidentLog.summary.specialistFollowUpProviderCounts.stub, 1);
assert.equal(incidentLog.summary.specialistFollowUpKindCounts.implementation, 1);
assert.equal(incidentLog.summary.specialistFollowUpStatusCounts.failed, 1);
assert.equal(incidentLog.summary.specialistFollowUpLatestReminderAt, null);
assert.ok(incidentLog.summary.specialistFollowUpNextReminderAt);
assert.equal(incidentLog.summary.providerHealthDriftOverdueCount, 1);
assert.equal(incidentLog.summary.providerHealthDriftProviderCounts.stub, 1);
assert.equal(incidentLog.summary.providerHealthDriftReasonCodeCounts['monthly-failed-up'], 1);

const incidentsContent = fs.readFileSync(incidentLog.path, 'utf8');
assert.match(incidentsContent, /Overdue Action Escalation \(5 items\)/);
assert.match(incidentsContent, /overdue action count: 5/);
assert.match(incidentsContent, /specialist follow-up overdue count: 1/);
assert.match(incidentsContent, /specialist follow-up needs-reminder count: 1/);
assert.match(incidentsContent, /specialist follow-up reminder total: 0/);
assert.match(incidentsContent, /specialist follow-up providers: stub=1/);
assert.match(incidentsContent, /specialist follow-up kinds: implementation=1/);
assert.match(incidentsContent, /specialist follow-up next reminder at: 2026-03-02T00:00:00.000Z/);
assert.match(incidentsContent, /provider health drift overdue count: 1/);
assert.match(incidentsContent, /provider health drift providers: stub=1/);
assert.match(incidentsContent, /provider health drift reason codes: monthly-failed-up=1/);
assert.match(incidentsContent, /Approve engineering execution proposal/);
assert.match(incidentsContent, /Maintenance sweep required for workspace-two/);
assert.match(incidentsContent, /Blocked after rejected approval/);
assert.match(incidentsContent, /Provider health drift review for Reviewer overdue candidate/);
assert.match(incidentsContent, /Specialist follow-up required for Specialist overdue follow-up \(implementation\)/);
assert.match(incidentsContent, /approval resolve/);
assert.match(incidentsContent, /action maintenance/);
assert.match(incidentsContent, /mission show/);
assert.match(incidentsContent, /mission timeline/);
assert.match(incidentsContent, /mission run .* --provider stub/);
assert.match(incidentsContent, /escalate to the workspace owner/i);

const approvalOnlyLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--owner', 'human-approver'],
});

assert.equal(approvalOnlyLog.logged, true);
assert.equal(approvalOnlyLog.count, 1);

const noOpLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--priority', 'urgent'],
});

assert.equal(noOpLog.logged, false);
assert.equal(noOpLog.count, 0);
assert.equal(noOpLog.path, null);

const driftOnlyLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--class', 'provider-health-drift-required'],
});

assert.equal(driftOnlyLog.logged, true);
assert.equal(driftOnlyLog.count, 1);
assert.equal(driftOnlyLog.summary.specialistFollowUpOverdueCount, 0);
assert.equal(driftOnlyLog.summary.providerHealthDriftOverdueCount, 1);
assert.equal(driftOnlyLog.summary.providerHealthDriftProviderCounts.stub, 1);
assert.equal(driftOnlyLog.summary.providerHealthDriftReasonCodeCounts['monthly-failed-up'], 1);

const driftProviderLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--class', 'provider-health-drift-required', '--provider', 'stub'],
});

assert.equal(driftProviderLog.logged, true);
assert.equal(driftProviderLog.count, 1);
assert.equal(driftProviderLog.filters.providerId, 'stub');
assert.equal(driftProviderLog.summary.providerHealthDriftOverdueCount, 1);
assert.equal(driftProviderLog.summary.providerHealthDriftProviderCounts.stub, 1);
assert.equal(driftProviderLog.summary.providerHealthDriftReasonCodeCounts['monthly-failed-up'], 1);

const specialistOnlyLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--class', 'specialist-follow-up-required'],
});

assert.equal(specialistOnlyLog.logged, true);
assert.equal(specialistOnlyLog.count, 1);
assert.equal(specialistOnlyLog.summary.specialistFollowUpOverdueCount, 1);
assert.equal(specialistOnlyLog.summary.specialistFollowUpNeedsReminderCount, 1);
assert.equal(specialistOnlyLog.summary.specialistFollowUpProviderCounts.stub, 1);
assert.equal(specialistOnlyLog.summary.specialistFollowUpKindCounts.implementation, 1);
assert.equal(specialistOnlyLog.summary.specialistFollowUpStatusCounts.failed, 1);

const specialistProviderLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--class', 'specialist-follow-up-required', '--provider', 'stub'],
});

assert.equal(specialistProviderLog.logged, true);
assert.equal(specialistProviderLog.count, 1);
assert.equal(specialistProviderLog.filters.providerId, 'stub');
assert.equal(specialistProviderLog.summary.specialistFollowUpOverdueCount, 1);
assert.equal(specialistProviderLog.summary.specialistFollowUpNeedsReminderCount, 1);

const specialistProviderIncidentContent = fs.readFileSync(specialistProviderLog.path, 'utf8');
assert.match(
  specialistProviderIncidentContent,
  /filters: class=specialist-follow-up-required, provider=stub/,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      count: incidentLog.count,
      mode: 'action-overdue-log',
      path: incidentLog.path,
    },
    null,
    2,
  ),
);
