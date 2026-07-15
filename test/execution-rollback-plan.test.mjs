import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import test from 'node:test';

import { buildExecutionRollbackPlan } from '../src/core/execution-rollback-plan.mjs';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function fileState(content) {
  return {
    content,
    exists: true,
    kind: 'file',
    sha256: sha256(content),
  };
}

function missingState() {
  return {
    content: '',
    exists: false,
    kind: 'missing',
    sha256: '',
  };
}

function buildPlan({ audits, states = {}, snapshots = {}, workspacePath = '/workspace' }) {
  return buildExecutionRollbackPlan({
    executionSession: {
      id: 'execution-1',
      mutationAudits: audits,
      mutationBatchAudit: { mutationSetSha256: 'mutation-set' },
      workspacePath,
    },
    isPathInsideRoot(rootPath, candidatePath) {
      const relativePath = path.relative(rootPath, candidatePath);
      return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
    },
    isSafeSnapshotPath(_executionSession, snapshotPath) {
      return snapshotPath.startsWith('/snapshots/');
    },
    readSnapshot(snapshotPath) {
      return snapshots[snapshotPath];
    },
    readTargetState(targetPath) {
      return states[path.resolve(targetPath)] || missingState();
    },
    snapshotExists(snapshotPath) {
      return Object.hasOwn(snapshots, snapshotPath);
    },
  });
}

test('rollback plan reverses mutations and simulates intermediate file state', () => {
  const snapshotPath = '/snapshots/restore-created.txt';
  const firstContent = 'first';
  const secondContent = 'second';
  const plan = buildPlan({
    audits: [
      {
        afterSha256: sha256(firstContent),
        beforeSha256: sha256(''),
        existedBefore: false,
        existsAfter: true,
        filePath: 'note.md',
        mutationTemplate: 'text-write-new',
        rollbackAction: 'delete-created-file',
      },
      {
        afterSha256: sha256(secondContent),
        beforeSha256: sha256(firstContent),
        existedBefore: true,
        existsAfter: true,
        filePath: 'note.md',
        mutationTemplate: 'text-replace',
        rollbackAction: 'restore-snapshot',
        rollbackSnapshotPath: snapshotPath,
      },
    ],
    states: {
      '/workspace/note.md': fileState(secondContent),
    },
    snapshots: {
      [snapshotPath]: firstContent,
    },
  });

  assert.equal(plan.ready, true);
  assert.equal(plan.itemCount, 2);
  assert.deepEqual(plan.batch.rollbackOrder, ['note.md', 'note.md']);
  assert.deepEqual(plan.items.map((item) => item.action), ['restore-snapshot', 'delete-created-file']);
  assert.equal(plan.items.every((item) => item.ready), true);
});

test('rollback plan prepares a move restore only when source is absent', () => {
  const movedContent = 'moved';
  const plan = buildPlan({
    audits: [
      {
        afterSha256: sha256(movedContent),
        beforeSha256: sha256(movedContent),
        existedBefore: true,
        existsAfter: false,
        filePath: 'before.md',
        targetExistsAfter: true,
        targetFilePath: 'after.md',
        mutationTemplate: 'file-move',
        rollbackAction: 'restore-moved-file',
      },
    ],
    states: {
      '/workspace/after.md': fileState(movedContent),
    },
  });

  assert.equal(plan.ready, true);
  assert.equal(plan.items[0].sourceExistsBeforeRollback, false);
  assert.equal(plan.items[0].sourcePath, '/workspace/before.md');
  assert.equal(plan.items[0].targetPath, '/workspace/after.md');
});

test('rollback plan exposes path, hash, and snapshot refusal reasons', async (t) => {
  const cases = [
    {
      expected: /target escapes selected workspace/,
      audit: {
        afterSha256: sha256('value'),
        existedBefore: false,
        existsAfter: true,
        filePath: '../outside.md',
        rollbackAction: 'delete-created-file',
      },
      states: { '/outside.md': fileState('value') },
    },
    {
      expected: /hash guard failed/,
      audit: {
        afterSha256: sha256('expected'),
        existedBefore: false,
        existsAfter: true,
        filePath: 'note.md',
        rollbackAction: 'delete-created-file',
      },
      states: { '/workspace/note.md': fileState('changed') },
    },
    {
      expected: /snapshot is missing/,
      audit: {
        afterSha256: sha256('after'),
        beforeSha256: sha256('before'),
        existedBefore: true,
        existsAfter: true,
        filePath: 'note.md',
        rollbackAction: 'restore-snapshot',
      },
      states: { '/workspace/note.md': fileState('after') },
    },
    {
      expected: /outside the execution rollback directory/,
      audit: {
        afterSha256: sha256('after'),
        beforeSha256: sha256('before'),
        existedBefore: true,
        existsAfter: true,
        filePath: 'note.md',
        rollbackAction: 'restore-snapshot',
        rollbackSnapshotPath: '/unsafe/before.txt',
      },
      states: { '/workspace/note.md': fileState('after') },
      snapshots: { '/unsafe/before.txt': 'before' },
    },
    {
      expected: /snapshot hash does not match/,
      audit: {
        afterSha256: sha256('after'),
        beforeSha256: sha256('before'),
        existedBefore: true,
        existsAfter: true,
        filePath: 'note.md',
        rollbackAction: 'restore-snapshot',
        rollbackSnapshotPath: '/snapshots/before.txt',
      },
      states: { '/workspace/note.md': fileState('after') },
      snapshots: { '/snapshots/before.txt': 'wrong' },
    },
  ];

  for (const [index, item] of cases.entries()) {
    await t.test(`refusal ${index + 1}`, () => {
      const plan = buildPlan({
        audits: [item.audit],
        states: item.states,
        snapshots: item.snapshots,
      });

      assert.equal(plan.ready, false);
      assert.equal(plan.blockedCount, 1);
      assert.match(plan.items[0].reason, item.expected);
    });
  }
});
