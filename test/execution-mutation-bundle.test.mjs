import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createExecutionMutationBundleBuilder } from '../src/core/execution-mutation-bundle.mjs';

function isPathInsideRoot(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function isSecretLikePath(value) {
  return String(value || '').replaceAll('\\', '/').split('/').includes('.env');
}

function createBuilder(options = {}) {
  return createExecutionMutationBundleBuilder({
    isPathInsideCandidateRoot: isPathInsideRoot,
    isPathInsideRoot,
    isSecretLikePath,
    ...options,
  });
}

function withTempWorkspace(callback) {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-mutation-bundle-'));
  try {
    return callback(workspacePath);
  } finally {
    fs.rmSync(workspacePath, { force: true, recursive: true });
  }
}

test('readMutationPathState returns a stable missing state', () => {
  withTempWorkspace((workspacePath) => {
    const { readMutationPathState } = createBuilder();
    assert.deepEqual(readMutationPathState(path.join(workspacePath, 'missing.md')), {
      bytes: 0,
      content: '',
      directoryCount: 0,
      entryCount: 0,
      exists: false,
      fileCount: 0,
      kind: 'missing',
      lineCount: 0,
      reason: '',
      sha256: '',
    });
  });
});

test('readMutationPathState records regular file content and digest metadata', () => {
  withTempWorkspace((workspacePath) => {
    const filePath = path.join(workspacePath, 'note.md');
    fs.writeFileSync(filePath, 'one\ntwo\n', 'utf8');
    const { readMutationPathState } = createBuilder();
    const state = readMutationPathState(filePath);

    assert.equal(state.exists, true);
    assert.equal(state.kind, 'file');
    assert.equal(state.bytes, 8);
    assert.equal(state.lineCount, 2);
    assert.equal(state.content, 'one\ntwo\n');
    assert.match(state.sha256, /^[a-f0-9]{64}$/);
  });
});

test('readMutationPathState refuses symbolic links without following them', () => {
  withTempWorkspace((workspacePath) => {
    const sourcePath = path.join(workspacePath, 'source.md');
    const linkPath = path.join(workspacePath, 'link.md');
    fs.writeFileSync(sourcePath, 'content', 'utf8');
    fs.symlinkSync(sourcePath, linkPath);
    const { readMutationPathState } = createBuilder();
    const state = readMutationPathState(linkPath);

    assert.equal(state.exists, true);
    assert.equal(state.kind, 'unsupported');
    assert.match(state.reason, /symbolic link/);
  });
});

test('collectDirectoryMoveState produces a deterministic recursive digest', () => {
  withTempWorkspace((workspacePath) => {
    const directoryPath = path.join(workspacePath, 'source');
    fs.mkdirSync(path.join(directoryPath, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(directoryPath, 'b.txt'), 'two', 'utf8');
    fs.writeFileSync(path.join(directoryPath, 'nested', 'a.txt'), 'one', 'utf8');
    const { collectDirectoryMoveState } = createBuilder();

    const first = collectDirectoryMoveState(directoryPath);
    const second = collectDirectoryMoveState(directoryPath);

    assert.deepEqual(second, first);
    assert.equal(first.kind, 'directory');
    assert.equal(first.entryCount, 3);
    assert.equal(first.directoryCount, 1);
    assert.equal(first.fileCount, 2);
    assert.equal(first.bytes, 6);
    assert.match(first.sha256, /^[a-f0-9]{64}$/);
  });
});

test('collectDirectoryMoveState preserves secret and size refusal contracts', async (t) => {
  await t.test('secret-like descendant', () => {
    withTempWorkspace((workspacePath) => {
      const directoryPath = path.join(workspacePath, 'source');
      fs.mkdirSync(directoryPath);
      fs.writeFileSync(path.join(directoryPath, '.env'), 'SECRET=value', 'utf8');
      const { collectDirectoryMoveState } = createBuilder();

      assert.throws(
        () => collectDirectoryMoveState(directoryPath),
        /source contains a secret-like descendant: \.env/,
      );
    });
  });

  await t.test('byte limit', () => {
    withTempWorkspace((workspacePath) => {
      const directoryPath = path.join(workspacePath, 'source');
      fs.mkdirSync(directoryPath);
      fs.writeFileSync(path.join(directoryPath, 'large.txt'), '12345', 'utf8');
      const { collectDirectoryMoveState } = createBuilder({ maxDirectoryBytes: 4 });

      assert.throws(
        () => collectDirectoryMoveState(directoryPath),
        /source byte size exceeds 4/,
      );
    });
  });
});

test('buildMutationBundle predicts file changes and ordered rollback metadata', () => {
  withTempWorkspace((workspacePath) => {
    fs.writeFileSync(path.join(workspacePath, 'note.md'), 'before\n', 'utf8');
    const { buildMutationBundle } = createBuilder();
    const bundle = buildMutationBundle({
      workspacePath,
      manifest: {
        steps: [
          {
            id: 'replace-note',
            kind: 'edit',
            title: 'replace note',
            filePath: 'note.md',
            operation: 'replace',
            mutationTemplate: 'text-replace',
            findText: 'before',
            replaceText: 'after',
            riskClassification: 'medium',
          },
          {
            id: 'write-summary',
            kind: 'edit',
            title: 'write summary',
            filePath: 'summary.md',
            operation: 'write',
            mutationTemplate: 'text-write-new',
            content: 'summary',
            riskClassification: 'low',
          },
        ],
      },
    });

    assert.equal(bundle.itemCount, 2);
    assert.equal(bundle.fileCount, 2);
    assert.equal(bundle.rollbackPreviewReady, true);
    assert.deepEqual(bundle.batch.executionOrder, ['replace-note', 'write-summary']);
    assert.deepEqual(bundle.batch.rollbackOrder, ['write-summary', 'replace-note']);
    assert.equal(bundle.items[0].predictionError, '');
    assert.equal(bundle.items[0].rollbackPreview.action, 'reverse-text-replace');
    assert.equal(bundle.items[1].rollbackPreview.action, 'delete-created-file');
  });
});

test('buildMutationBundle predicts directory moves without changing the workspace', () => {
  withTempWorkspace((workspacePath) => {
    const sourcePath = path.join(workspacePath, 'source');
    fs.mkdirSync(sourcePath);
    fs.writeFileSync(path.join(sourcePath, 'note.md'), 'content', 'utf8');
    const { buildMutationBundle } = createBuilder();
    const bundle = buildMutationBundle({
      workspacePath,
      manifest: {
        steps: [
          {
            id: 'move-directory',
            kind: 'edit',
            title: 'move directory',
            filePath: 'source',
            targetPath: 'target',
            operation: 'move',
            mutationTemplate: 'directory-move',
            riskClassification: 'high',
          },
        ],
      },
    });

    assert.equal(fs.existsSync(sourcePath), true);
    assert.equal(fs.existsSync(path.join(workspacePath, 'target')), false);
    assert.equal(bundle.items[0].pathKind, 'directory');
    assert.equal(bundle.items[0].directoryFileCount, 1);
    assert.equal(bundle.items[0].targetExistsAfter, true);
    assert.equal(bundle.items[0].rollbackPreview.restoreStrategy, 'rename-directory-back');
  });
});

test('buildMutationBundle keeps path and target refusal reasons explicit', async (t) => {
  const cases = [
    {
      expected: /Edit path escapes selected workspace/,
      name: 'source escapes workspace',
      step: {
        id: 'escape-source',
        kind: 'edit',
        title: 'escape source',
        filePath: '../outside.md',
        operation: 'write',
        mutationTemplate: 'text-write-new',
        content: 'value',
      },
    },
    {
      expected: /file-move targetPath escapes selected workspace/,
      name: 'file move target escapes workspace',
      step: {
        id: 'escape-file-target',
        kind: 'edit',
        title: 'escape file target',
        filePath: 'source.md',
        targetPath: '../outside.md',
        operation: 'move',
        mutationTemplate: 'file-move',
      },
    },
    {
      expected: /directory-move targetPath cannot be inside source/,
      name: 'directory target is inside source',
      prepare(workspacePath) {
        fs.mkdirSync(path.join(workspacePath, 'source'));
      },
      step: {
        id: 'nested-directory-target',
        kind: 'edit',
        title: 'nested directory target',
        filePath: 'source',
        targetPath: 'source/nested',
        operation: 'move',
        mutationTemplate: 'directory-move',
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      withTempWorkspace((workspacePath) => {
        item.prepare?.(workspacePath);
        const { buildMutationBundle } = createBuilder();
        const bundle = buildMutationBundle({
          workspacePath,
          manifest: { steps: [item.step] },
        });

        assert.match(bundle.items[0].predictionError, item.expected);
        assert.equal(bundle.items[0].rollbackPreview.ready, false);
      });
    });
  }
});
