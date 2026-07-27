import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  resolveEvidenceOutputPath,
  writeEvidenceJson,
} from '../scripts/evidence-gated-answer-output.mjs';

function createWorkspace(t) {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), 'evidence-gated-output-'),
  );
  const repoDir = path.join(parent, 'repo');
  const outputDir = path.join(repoDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(outputDir, { recursive: true });
  t.after(() => fs.rmSync(parent, { force: true, recursive: true }));
  return { outputDir, parent, repoDir };
}

test('repository output is written as an owner-only regular file', (t) => {
  const { repoDir } = createWorkspace(t);
  const outputPath = writeEvidenceJson({
    artifact: { ok: true },
    defaultRelativePath: 'evidence/output-artifacts/default.json',
    label: 'Test evidence output',
    repoDir,
    value: 'evidence/output-artifacts/result.json',
  });

  assert.equal(
    outputPath,
    path.join(repoDir, 'evidence', 'output-artifacts', 'result.json'),
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(outputPath, 'utf8')),
    { ok: true },
  );
  assert.equal(fs.statSync(outputPath).mode & 0o777, 0o600);
});

test('existing output permission is reduced to owner-only', (t) => {
  const { outputDir, repoDir } = createWorkspace(t);
  const outputPath = path.join(outputDir, 'result.json');
  fs.writeFileSync(outputPath, '{"stale":true}\n', { mode: 0o644 });

  writeEvidenceJson({
    artifact: { current: true },
    defaultRelativePath: 'evidence/output-artifacts/default.json',
    label: 'Test evidence output',
    repoDir,
    value: 'evidence/output-artifacts/result.json',
  });

  assert.deepEqual(
    JSON.parse(fs.readFileSync(outputPath, 'utf8')),
    { current: true },
  );
  assert.equal(fs.statSync(outputPath).mode & 0o777, 0o600);
});

test('absolute output outside the repository is rejected', (t) => {
  const { parent, repoDir } = createWorkspace(t);
  assert.throws(
    () =>
      resolveEvidenceOutputPath({
        defaultRelativePath: 'evidence/output-artifacts/default.json',
        label: 'Test evidence output',
        repoDir,
        value: path.join(parent, 'outside.json'),
      }),
    /must stay inside the repository/u,
  );
});

test('symlinked output parent cannot escape the repository', (t) => {
  const { parent, repoDir } = createWorkspace(t);
  const outsideDir = path.join(parent, 'outside');
  fs.mkdirSync(outsideDir);
  fs.symlinkSync(outsideDir, path.join(repoDir, 'linked-output'));

  assert.throws(
    () =>
      resolveEvidenceOutputPath({
        defaultRelativePath: 'evidence/output-artifacts/default.json',
        label: 'Test evidence output',
        repoDir,
        value: 'linked-output/result.json',
      }),
    /parent must be a real repository directory/u,
  );
});

test('output symlink is rejected before writing', (t) => {
  const { outputDir, parent, repoDir } = createWorkspace(t);
  const outsideFile = path.join(parent, 'outside.json');
  fs.writeFileSync(outsideFile, 'unchanged\n', 'utf8');
  fs.symlinkSync(outsideFile, path.join(outputDir, 'result.json'));

  assert.throws(
    () =>
      writeEvidenceJson({
        artifact: { changed: true },
        defaultRelativePath: 'evidence/output-artifacts/default.json',
        label: 'Test evidence output',
        repoDir,
        value: 'evidence/output-artifacts/result.json',
      }),
    /must be a regular file/u,
  );
  assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'unchanged\n');
});

test('output hard link is rejected without changing the shared inode', (t) => {
  const { outputDir, parent, repoDir } = createWorkspace(t);
  const outsideFile = path.join(parent, 'outside.json');
  fs.writeFileSync(outsideFile, 'unchanged\n', 'utf8');
  fs.linkSync(outsideFile, path.join(outputDir, 'result.json'));

  assert.throws(
    () =>
      writeEvidenceJson({
        artifact: { changed: true },
        defaultRelativePath: 'evidence/output-artifacts/default.json',
        label: 'Test evidence output',
        repoDir,
        value: 'evidence/output-artifacts/result.json',
      }),
    /must be a single-link regular file/u,
  );
  assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'unchanged\n');
});
