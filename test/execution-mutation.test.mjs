import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  buildExecutionMutationBatchAudit,
  buildMutationAudit,
  buildMutationBatchSummary,
  buildNextEditContent,
  buildRollbackPreview,
  collectExecutionMutationAudits,
  countTextLines,
  hashTextContent,
} from '../src/core/execution-mutation.mjs';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

test('text helpers preserve the execution mutation hash and line contracts', () => {
  assert.equal(hashTextContent('content'), sha256('content'));
  assert.equal(hashTextContent(null), sha256(''));
  assert.equal(countTextLines(''), 0);
  assert.equal(countTextLines('one'), 1);
  assert.equal(countTextLines('one\ntwo'), 2);
  assert.equal(countTextLines('one\ntwo\n'), 2);
});

test('buildNextEditContent handles every supported text mutation', async (t) => {
  const cases = [
    {
      expected: 'first\nsecond\n',
      name: 'append existing content',
      step: { operation: 'append', content: 'second' },
      existingContent: 'first\n\n',
      existedBefore: true,
    },
    {
      expected: 'first\n',
      name: 'append new content',
      step: { operation: 'append', content: 'first' },
      existingContent: '',
      existedBefore: false,
    },
    {
      expected: 'source',
      name: 'move existing content',
      step: { operation: 'move', filePath: 'source.md' },
      existingContent: 'source',
      existedBefore: true,
    },
    {
      expected: '',
      name: 'delete existing content',
      step: { operation: 'delete', filePath: 'source.md' },
      existingContent: 'source',
      existedBefore: true,
    },
    {
      expected: 'new content',
      name: 'write content',
      step: { operation: 'write', content: 'new content', mutationTemplate: 'text-write-new' },
      existingContent: '',
      existedBefore: false,
    },
    {
      expected: 'before after',
      name: 'replace first match',
      step: {
        operation: 'replace',
        title: 'replace',
        filePath: 'note.md',
        findText: 'value',
        replaceText: 'after',
      },
      existingContent: 'before value',
      existedBefore: true,
    },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      assert.equal(
        buildNextEditContent(item.step, item.existingContent, item.existedBefore),
        item.expected,
      );
    });
  }
});

test('buildNextEditContent keeps mutation refusal messages explicit', async (t) => {
  const cases = [
    {
      expected: /file-move requires an existing source file missing\.md/,
      name: 'move missing source',
      step: { operation: 'move', filePath: 'missing.md' },
      existingContent: '',
      existedBefore: false,
    },
    {
      expected: /text-delete-file requires an existing file missing\.md/,
      name: 'delete missing source',
      step: { operation: 'delete', filePath: 'missing.md' },
      existingContent: '',
      existedBefore: false,
    },
    {
      expected: /text-write-new refuses to overwrite existing file note\.md/,
      name: 'overwrite existing new-file target',
      step: {
        operation: 'write',
        filePath: 'note.md',
        content: 'value',
        mutationTemplate: 'text-write-new',
      },
      existingContent: 'existing',
      existedBefore: true,
    },
    {
      expected: /Replace operation requires findText for replace note/,
      name: 'replace without target text',
      step: { operation: 'replace', title: 'replace note', filePath: 'note.md' },
      existingContent: 'existing',
      existedBefore: true,
    },
    {
      expected: /Replace target not found in note\.md/,
      name: 'replace missing target',
      step: { operation: 'replace', title: 'replace note', filePath: 'note.md', findText: 'missing' },
      existingContent: 'existing',
      existedBefore: true,
    },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      assert.throws(
        () => buildNextEditContent(item.step, item.existingContent, item.existedBefore),
        item.expected,
      );
    });
  }
});

test('buildRollbackPreview returns a reversible action for supported templates', async (t) => {
  const base = {
    afterContent: 'after',
    beforeContent: 'before',
    existedBefore: true,
  };
  const cases = [
    {
      action: 'restore-moved-file',
      name: 'file move',
      step: { mutationTemplate: 'file-move', filePath: 'before.md', targetPath: 'after.md' },
    },
    {
      action: 'restore-deleted-file',
      name: 'file delete',
      step: { mutationTemplate: 'text-delete-file' },
    },
    {
      action: 'reverse-text-replace',
      name: 'text replace',
      step: { mutationTemplate: 'text-replace', findText: 'before', replaceText: 'after' },
    },
    {
      action: 'restore-previous-content',
      name: 'text append',
      step: { mutationTemplate: 'text-append' },
    },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      const preview = buildRollbackPreview({ ...base, step: item.step });
      assert.equal(preview.action, item.action);
      assert.equal(preview.ready, true);
    });
  }

  await t.test('new file', () => {
    const preview = buildRollbackPreview({
      ...base,
      existedBefore: false,
      step: { mutationTemplate: 'text-write-new' },
    });
    assert.equal(preview.action, 'delete-created-file');
    assert.equal(preview.ready, true);
  });

  await t.test('unsupported template', () => {
    const preview = buildRollbackPreview({ ...base, step: { mutationTemplate: 'binary-write' } });
    assert.deepEqual(preview, {
      action: 'manual-review-required',
      ready: false,
      reason: 'unsupported mutation template',
    });
  });
});

test('buildMutationAudit records content, path, and rollback state', () => {
  const audit = buildMutationAudit({
    afterContent: 'one\ntwo\n',
    beforeContent: 'one\n',
    existedBefore: true,
    filePath: 'note.md',
    mutationTemplate: 'text-append',
    operation: 'append',
    rollbackSnapshotPath: '/tmp/rollback/note.md',
  });

  assert.equal(audit.afterBytes, 8);
  assert.equal(audit.beforeBytes, 4);
  assert.equal(audit.lineDelta, 1);
  assert.equal(audit.changed, true);
  assert.equal(audit.rollbackAction, 'restore-snapshot');
  assert.equal(audit.rollbackReady, true);
  assert.equal(audit.afterSha256, sha256('one\ntwo\n'));
  assert.equal(audit.beforeSha256, sha256('one\n'));
});

test('buildMutationBatchSummary preserves order, risk, counts, and fingerprint', () => {
  const items = [
    {
      afterSha256: 'after-1',
      beforeSha256: 'before-1',
      byteDelta: 2,
      filePath: 'one.md',
      id: 'step-1',
      lineDelta: 1,
      mutationTemplate: 'text-append',
      riskClassification: 'low',
      rollbackPreview: { action: 'restore-previous-content', ready: true },
      targetFilePath: '',
    },
    {
      afterSha256: 'after-2',
      beforeSha256: 'before-2',
      byteDelta: -4,
      filePath: 'two.md',
      id: 'step-2',
      lineDelta: -2,
      mutationTemplate: 'text-delete-file',
      riskClassification: 'high',
      rollbackPreview: { action: 'restore-deleted-file', ready: true },
      targetFilePath: '',
    },
  ];

  const summary = buildMutationBatchSummary({
    filePaths: ['one.md', 'two.md'],
    items,
    rollbackReadyCount: 2,
    templateCounts: { 'text-append': 1, 'text-delete-file': 1 },
  });

  assert.deepEqual(summary.executionOrder, ['step-1', 'step-2']);
  assert.deepEqual(summary.rollbackOrder, ['step-2', 'step-1']);
  assert.equal(summary.maxRiskClassification, 'high');
  assert.equal(summary.totalByteDelta, -2);
  assert.equal(summary.totalLineDelta, -1);
  assert.equal(summary.ready, true);
  assert.match(summary.mutationSetSha256, /^[a-f0-9]{64}$/);
  assert.equal(summary.id, `mutation-batch-${summary.mutationSetSha256.slice(0, 16)}`);
  assert.deepEqual(summary.rollbackActionCounts, {
    'restore-deleted-file': 1,
    'restore-previous-content': 1,
  });
});

test('execution mutation audit helpers keep only stored audits and report batch completion', () => {
  const mutationAudits = collectExecutionMutationAudits([
    {
      mutationAudit: {
        filePath: 'one.md',
        mutationTemplate: 'text-append',
        rollbackAction: 'restore-snapshot',
        rollbackReady: true,
      },
    },
    { mutationAudit: null },
    { mutationAudit: { filePath: '  ' } },
    {
      mutationAudit: {
        filePath: 'two.md',
        targetFilePath: 'moved/two.md',
        mutationTemplate: 'file-move',
        rollbackAction: 'restore-moved-file',
        rollbackReady: true,
      },
    },
  ]);
  const batch = buildExecutionMutationBatchAudit({
    mutationAudits,
    mutationBundle: {
      batch: { id: 'mutation-batch-source', mutationSetSha256: 'source-sha' },
      itemCount: 2,
    },
  });

  assert.equal(mutationAudits.length, 2);
  assert.equal(batch.status, 'complete');
  assert.equal(batch.rollbackReady, true);
  assert.equal(batch.fileCount, 3);
  assert.deepEqual(batch.rollbackOrder, ['two.md', 'one.md']);
  assert.deepEqual(batch.templateCounts, { 'text-append': 1, 'file-move': 1 });
  assert.deepEqual(batch.rollbackActionCounts, { 'restore-snapshot': 1, 'restore-moved-file': 1 });
  assert.equal(batch.batchId, 'mutation-batch-source');
  assert.equal(batch.sourceMutationSetSha256, 'source-sha');
});
