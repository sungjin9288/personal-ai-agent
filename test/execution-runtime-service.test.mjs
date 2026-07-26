import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createExecutionRuntimeService } from '../src/core/execution-runtime-service.mjs';

const NOW = '2026-07-16T00:00:00.000Z';

function createFixture() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-runtime-service-'));
  const workspacePath = path.join(workspaceRoot, 'workspace');
  fs.mkdirSync(workspacePath);

  const mission = {
    deliverableType: 'implementation-proposal',
    id: 'mission-1',
    mode: 'engineering',
    status: 'reviewed',
    title: 'Mission',
    workspaceId: 'workspace-1',
  };
  const workspace = { id: 'workspace-1', name: 'Workspace', path: workspacePath };
  const session = { id: 'session-1', missionId: mission.id, provider: 'stub' };
  const manifest = {
    summary: 'Inspect the selected workspace',
    steps: [
      {
        command: 'git status --short',
        cwd: '.',
        expectedOutputs: ['workspace status'],
        id: 'step-1',
        kind: 'inspect',
        reason: 'Capture the workspace state.',
        riskClassification: 'low',
        title: 'Inspect workspace',
        verificationTarget: 'command succeeds',
      },
    ],
  };
  const approvals = [];
  const effects = [];
  const executionLeases = [];
  const executionSessions = [];

  const store = {
    getExecutionSession(id) {
      return executionSessions.find((item) => item.id === id) || null;
    },
    getMissionDir() {
      return workspaceRoot;
    },
    getSession(id) {
      return id === session.id ? session : null;
    },
    listAgentRunsBySession() {
      return [
        { id: 'reviewer-run', role: 'reviewer', status: 'completed' },
        { executionManifest: manifest, id: 'executor-run', role: 'executor', status: 'completed' },
      ];
    },
    listApprovals(filter = {}) {
      return approvals.filter(
        (item) =>
          (!filter.missionId || item.missionId === filter.missionId) &&
          (!filter.sessionId || item.sessionId === filter.sessionId),
      );
    },
    listArtifactsBySession() {
      return [{ id: 'deliverable-1', kind: 'deliverable', path: '' }];
    },
    listExecutionLeases(filter = {}) {
      return executionLeases.filter((item) => !filter.missionId || item.missionId === filter.missionId);
    },
    listExecutionSessions(filter = {}) {
      return executionSessions.filter((item) => !filter.missionId || item.missionId === filter.missionId);
    },
    listSessionsByMission(missionId) {
      return missionId === mission.id ? [session] : [];
    },
    updateExecutionSession(id, updater) {
      const index = executionSessions.findIndex((item) => item.id === id);
      executionSessions[index] = updater(executionSessions[index]);
      return executionSessions[index];
    },
  };

  const harness = {
    addMemoryEntry(entry) {
      effects.push(`memory:${entry.scopeId}`);
      return { id: 'memory-1', ...entry };
    },
    createApproval(input) {
      const approval = {
        ...input,
        createdAt: NOW,
        id: `approval-${approvals.length + 1}`,
        status: 'pending',
      };
      approvals.push(approval);
      effects.push(`approval:${approval.id}`);
      return approval;
    },
    issueExecutionLease(input) {
      const lease = {
        ...input,
        createdAt: NOW,
        id: `lease-${executionLeases.length + 1}`,
        status: 'active',
      };
      executionLeases.push(lease);
      effects.push(`lease:${lease.id}`);
      return lease;
    },
    touchMission(_missionId, status) {
      effects.push(`mission:${status}`);
      return { ...mission, status };
    },
    updateExecutionLease(id, patch) {
      const lease = executionLeases.find((item) => item.id === id);
      Object.assign(lease, patch);
      effects.push(`lease-update:${id}:${patch.status}`);
      return lease;
    },
  };

  const service = createExecutionRuntimeService({
    executionWorkspaceRoot: workspaceRoot,
    getMission: (id) => {
      if (id !== mission.id) throw new Error(`Mission not found: ${id}`);
      return mission;
    },
    getWorkspace: (id) => {
      if (id !== workspace.id) throw new Error(`Workspace not found: ${id}`);
      return workspace;
    },
    harness,
    now: () => NOW,
    store,
  });

  return {
    approvals,
    cleanup: () => fs.rmSync(workspaceRoot, { force: true, recursive: true }),
    effects,
    executionLeases,
    executionSessions,
    manifest,
    mission,
    service,
    session,
    workspace,
  };
}

test('completeExecutionLeaseApproval preserves lease, memory, mission, and status ordering', () => {
  const fixture = createFixture();
  try {
    const executionContext = fixture.service.buildExecutionContext(fixture.mission.id);
    const approval = {
      id: 'approval-1',
      metadata: { manifestHash: executionContext.manifestHash, mutationBundle: {} },
    };

    const result = fixture.service.completeExecutionLeaseApproval({
      approval,
      decision: 'approve',
      mission: fixture.mission,
      reason: 'approved',
      resolutionArtifactPath: '/artifact/approval-resolution.md',
      session: fixture.session,
      workspace: fixture.workspace,
    });

    assert.deepEqual(fixture.effects, ['lease:lease-1', 'memory:mission-1', 'mission:execution_ready']);
    assert.equal(result.lease.id, 'lease-1');
    assert.equal(result.execution.currentLease.id, 'lease-1');
    assert.equal(result.mission.status, 'execution_ready');
    assert.equal(result.resolutionArtifactPath, '/artifact/approval-resolution.md');
  } finally {
    fixture.cleanup();
  }
});

test('completeExecutionLeaseApproval rejects without issuing a lease', () => {
  const fixture = createFixture();
  try {
    const result = fixture.service.completeExecutionLeaseApproval({
      approval: { id: 'approval-1', metadata: {} },
      decision: 'reject',
      mission: fixture.mission,
      reason: 'rejected',
      resolutionArtifactPath: '/artifact/approval-resolution.md',
      session: fixture.session,
      workspace: fixture.workspace,
    });

    assert.deepEqual(fixture.effects, ['memory:mission-1', 'mission:reviewed']);
    assert.equal(result.lease, undefined);
    assert.equal(result.mission.status, 'reviewed');
  } finally {
    fixture.cleanup();
  }
});

test('getExecutionStatus revokes an active lease when its manifest no longer matches', () => {
  const fixture = createFixture();
  try {
    fixture.executionLeases.push({
      createdAt: NOW,
      id: 'lease-stale',
      manifestHash: 'stale-hash',
      missionId: fixture.mission.id,
      sessionId: fixture.session.id,
      status: 'active',
    });

    const result = fixture.service.getExecutionStatus(fixture.mission.id);

    assert.equal(result.currentLease, null);
    assert.equal(result.execution.latestLease.status, 'revoked');
    assert.deepEqual(fixture.effects, ['lease-update:lease-stale:revoked']);
  } finally {
    fixture.cleanup();
  }
});

test('preflightExecution reuses a pending execution approval', () => {
  const fixture = createFixture();
  try {
    fixture.approvals.push({
      createdAt: NOW,
      id: 'approval-pending',
      kind: 'execution_lease',
      missionId: fixture.mission.id,
      sessionId: fixture.session.id,
      status: 'pending',
    });

    const result = fixture.service.preflightExecution(fixture.mission.id, { requestApproval: true });

    assert.equal(result.approval.id, 'approval-pending');
    assert.equal(result.execution.eligibility, 'pending-approval');
    assert.deepEqual(fixture.effects, []);
  } finally {
    fixture.cleanup();
  }
});

test('getExecutionLogs rejects an execution session owned by another mission', () => {
  const fixture = createFixture();
  try {
    fixture.executionSessions.push({ id: 'execution-1', missionId: 'mission-2', status: 'completed' });

    assert.throws(
      () => fixture.service.getExecutionLogs(fixture.mission.id, { executionId: 'execution-1' }),
      /does not belong to mission mission-1/,
    );
  } finally {
    fixture.cleanup();
  }
});
