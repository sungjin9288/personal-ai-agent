import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { buildApprovedTrainingRecordFixture } from './helpers/approved-training-record-fixture.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildReadinessPackage() {
  const records = ['a', 'b', 'c', 'd'].map((suffix) =>
    buildApprovedTrainingRecord(
      buildApprovedTrainingRecordFixture({
        example: {
          instruction: `Prepare reviewed instruction ${suffix}.`,
          response: `Return grounded response ${suffix} with an explicit next action.`,
        },
        missionId: `mission-${suffix}`,
        suffix,
      }),
    ));
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: ['a', 'b'].map((suffix) => ({
      answer: {
        citedSourceKeys: ['memory:workspace/fact'],
        text: `Reviewed evidence ${suffix} confirms the decision.`,
      },
      expectedSourceKeys: ['memory:workspace/fact'],
      id: `baseline-${suffix}`,
      requiredAnswerTerms: ['reviewed evidence', 'decision'],
      retrievedItems: [{ sourceKey: 'memory:workspace/fact' }],
      reviewerVerdict: 'pass',
    })),
  });
  return buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest: buildTrainingDatasetManifest({
      records,
      seed: 'local-training-permission-service-v1',
    }),
    records,
  });
}

function buildRequestInput(readinessPackage) {
  return {
    approvalOwner: 'local-training-operator',
    baseModelId: 'approved-local-base-model',
    evidence: {
      egress: {
        evidenceSha256: sha256('os-egress-isolation-evidence'),
        owner: 'security-owner',
      },
      license: {
        evidenceSha256: sha256('base-model-license-review'),
        owner: 'license-owner',
      },
      resource: {
        evidenceSha256: sha256('resource-envelope-evidence'),
        limits: {
          maxCpuThreads: 4,
          maxDiskBytes: 20_000_000_000,
          maxMemoryBytes: 8_000_000_000,
          maxRuntimeMs: 3_600_000,
        },
        owner: 'resource-owner',
      },
    },
    expiresAt: '2026-07-18T00:00:00.000Z',
    readinessPackage,
    rollbackOwner: 'rollback-owner',
    sourceContext: {
      channel: 'cli',
      command: 'approval request-local-training',
      sourceType: 'cli',
      startedBy: 'local-training-operator',
      surface: 'cli',
    },
    trainerId: 'approved-local-trainer',
  };
}

test('mission service records, approves, and revokes local training permission without storing training content in state', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-training-permission-'));
  const workspacePath = path.join(rootDir, 'workspace');
  fs.mkdirSync(workspacePath, { recursive: true });
  let currentTime = '2026-07-17T10:00:00.000Z';

  try {
    const store = createStore({ rootDir });
    const service = createMissionService({
      localTrainingClock: () => currentTime,
      rootDir,
      store,
    });
    const workspace = service.addWorkspace({ workspacePath });
    const mission = service.createMission({
      mode: 'knowledge',
      objective: 'Review bounded local model training permission.',
      title: 'Local training permission review',
      workspaceId: workspace.id,
    });
    const readinessPackage = buildReadinessPackage();
    const requested = service.requestLocalTrainingPermission(
      mission.id,
      buildRequestInput(readinessPackage),
    );

    assert.equal(requested.approval.kind, 'local_training_execution');
    assert.equal(requested.approval.status, 'pending');
    assert.equal(requested.request.status, 'pending-review');
    assert.equal(requested.localExecutionAuthorized, false);
    assert.equal(requested.productionReadyClaim, false);
    assert.equal(requested.session.status, 'awaiting_approval');
    assert.equal(
      JSON.stringify(store.loadState()).includes('Prepare reviewed instruction'),
      false,
    );
    const readinessPath = path.join(
      store.getSessionDir(mission.id, requested.session.id),
      requested.readinessFileName,
    );
    assert.equal(
      fs.readFileSync(readinessPath, 'utf8').includes('Prepare reviewed instruction'),
      true,
    );
    assert.equal(
      store
        .listArtifactsBySession(requested.session.id)
        .some((artifact) => artifact.kind === 'local-training-readiness-private'),
      false,
    );
    const inbox = service.getActionInbox({ missionId: mission.id });
    assert.equal(inbox.items.length, 1);
    assert.equal(inbox.items[0].actionType, 'approval');
    assert.equal(inbox.items[0].kind, 'local_training_execution');

    currentTime = '2026-07-17T10:05:00.000Z';
    const approved = service.resolveApproval(requested.approval.id, {
      decision: 'approve',
      reason: 'Reviewed bounded local execution evidence.',
    });
    assert.equal(approved.approval.status, 'approved');
    assert.equal(approved.permission.status, 'approved');
    assert.equal(approved.executionApproval.executionKind, 'local-model-training');
    assert.equal(approved.executionApproval.permission.id, approved.permission.id);
    assert.equal(approved.actualModelTrainingExecuted, false);
    assert.equal(approved.productionReadyClaim, false);
    assert.equal(service.getActionInbox({ missionId: mission.id }).items.length, 0);

    currentTime = '2026-07-17T10:07:00.000Z';
    const revoked = service.revokeLocalTrainingPermission(requested.approval.id, {
      reason: 'Resource owner withdrew the approved envelope.',
    });
    assert.equal(revoked.revocation.status, 'revoked');
    assert.equal(revoked.localExecutionAuthorized, false);
    assert.equal(revoked.actualModelTrainingExecuted, false);
    const storedApproval = store.getApproval(requested.approval.id);
    assert.equal(
      storedApproval.metadata.localTrainingPermission.revocation.id,
      revoked.revocation.id,
    );

    const gatewayEvents = store
      .listGatewayEvents({ missionId: mission.id })
      .filter((event) => event.eventType.startsWith('local-training-permission-'));
    assert.deepEqual(
      gatewayEvents.map((event) => event.eventType),
      [
        'local-training-permission-request',
        'local-training-permission-approved',
        'local-training-permission-revoked',
      ],
    );
    assert.deepEqual(
      gatewayEvents.map((event) => event.permissionPolicy.decision),
      ['approval-required', 'allow', 'deny'],
    );
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});

test('mission service rejects unsafe local training permission input before creating a session', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-training-permission-'));
  const workspacePath = path.join(rootDir, 'workspace');
  fs.mkdirSync(workspacePath, { recursive: true });

  try {
    const store = createStore({ rootDir });
    const service = createMissionService({
      localTrainingClock: () => '2026-07-17T10:00:00.000Z',
      rootDir,
      store,
    });
    const workspace = service.addWorkspace({ workspacePath });
    const mission = service.createMission({ workspaceId: workspace.id });
    const input = buildRequestInput(buildReadinessPackage());
    input.approvalOwner = 'password=unsafe-owner';

    assert.throws(
      () => service.requestLocalTrainingPermission(mission.id, input),
      /content-free metadata/,
    );
    assert.equal(store.listSessionsByMission(mission.id).length, 0);
    assert.equal(store.listApprovals({ missionId: mission.id }).length, 0);
    assert.equal(store.listGatewayEvents({ missionId: mission.id }).length, 1);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});
