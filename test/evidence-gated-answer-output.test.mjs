import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
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

test('a repository-root symlink keeps the resolved output-path contract', (t) => {
  const { parent, repoDir } = createWorkspace(t);
  const linkedRepo = path.join(parent, 'linked-repo');
  fs.symlinkSync(repoDir, linkedRepo);
  const outputPath = writeEvidenceJson({
    artifact: { current: true },
    defaultRelativePath: 'evidence/output-artifacts/default.json',
    label: 'Test evidence output',
    repoDir: linkedRepo,
    value: 'evidence/output-artifacts/result.json',
  });
  assert.equal(outputPath, path.join(linkedRepo, 'evidence', 'output-artifacts', 'result.json'));
  assert.equal(fs.readFileSync(outputPath, 'utf8'), '{\n  "current": true\n}\n');
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

test('hard-link validation keeps priority over artifact serialization errors', (t) => {
  const { outputDir, parent, repoDir } = createWorkspace(t);
  const outsideFile = path.join(parent, 'outside.json');
  fs.writeFileSync(outsideFile, 'unchanged\n', 'utf8');
  fs.linkSync(outsideFile, path.join(outputDir, 'result.json'));

  const cyclicArtifact = {};
  cyclicArtifact.self = cyclicArtifact;
  let throwingSerializerCalled = false;
  const throwingArtifact = {
    toJSON() {
      throwingSerializerCalled = true;
      throw new Error('artifact serialization should not run');
    },
  };

  for (const artifact of [cyclicArtifact, throwingArtifact]) {
    assert.throws(
      () => write(repoDir, artifact),
      /must be a single-link regular file/u,
    );
  }
  assert.equal(throwingSerializerCalled, false);
  assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'unchanged\n');
});

test('partial writes preserve exact JSON bytes, owner mode, and a single link', (t) => {
  const { repoDir } = createWorkspace(t);
  const originalWrite = fs.writeSync;
  let calls = 0;
  fs.writeSync = (descriptor, bytes, offset, length) => {
    calls += 1;
    return originalWrite(descriptor, bytes, offset, Math.min(length, 3));
  };
  try {
    const outputPath = write(repoDir, { current: true, nested: { value: 1 } });
    const expected = `${JSON.stringify({ current: true, nested: { value: 1 } }, null, 2)}\n`;
    const stat = fs.lstatSync(outputPath);
    assert.ok(calls > 1);
    assert.equal(fs.readFileSync(outputPath, 'utf8'), expected);
    assert.equal(stat.mode & 0o777, 0o600);
    assert.equal(stat.nlink, 1);
  } finally {
    fs.writeSync = originalWrite;
  }
});

for (const failure of ['writeSync', 'fsyncSync', 'renameSync']) {
  test(`${failure} failure keeps the old final bytes and removes the writer temp`, (t) => {
    const { outputDir, repoDir } = createWorkspace(t);
    const outputPath = path.join(outputDir, 'result.json');
    const oldBytes = '{"stale":true}\n';
    fs.writeFileSync(outputPath, oldBytes, { mode: 0o600 });
    const original = fs[failure];
    let wrotePartialTemp = false;
    fs[failure] = failure === 'writeSync'
      ? (...args) => {
        if (!wrotePartialTemp) {
          wrotePartialTemp = true;
          original(...args.slice(0, 3), 1);
        }
        throw new Error(`injected ${failure}`);
      }
      : () => { throw new Error(`injected ${failure}`); };
    try {
      assert.throws(() => write(repoDir, { current: true }), /injected/u);
    } finally {
      fs[failure] = original;
    }
    assert.equal(fs.readFileSync(outputPath, 'utf8'), oldBytes);
    if (failure === 'writeSync') assert.equal(wrotePartialTemp, true);
    assert.deepEqual(tempEntries(outputDir, 'result.json'), []);
  });
}

test('destination replacement during the write is rejected before rename', (t) => {
  const { outputDir, repoDir } = createWorkspace(t);
  const outputPath = path.join(outputDir, 'result.json');
  const movedPath = path.join(outputDir, 'moved.json');
  fs.writeFileSync(outputPath, '{"old":true}\n', { mode: 0o600 });
  const originalWrite = fs.writeSync;
  let swapped = false;
  fs.writeSync = (...args) => {
    const written = originalWrite(...args);
    if (!swapped) {
      swapped = true;
      fs.renameSync(outputPath, movedPath);
      fs.writeFileSync(outputPath, '{"replacement":true}\n', { mode: 0o600 });
    }
    return written;
  };
  try {
    assert.throws(() => write(repoDir, { current: true }), /changed before replacement/u);
  } finally {
    fs.writeSync = originalWrite;
  }
  assert.equal(fs.readFileSync(movedPath, 'utf8'), '{"old":true}\n');
  assert.equal(fs.readFileSync(outputPath, 'utf8'), '{"replacement":true}\n');
});

test('a temp hard-link swap is rejected before publication', (t) => {
  const { outputDir, repoDir } = createWorkspace(t);
  const outputPath = path.join(outputDir, 'result.json');
  fs.writeFileSync(outputPath, '{"old":true}\n', { mode: 0o600 });
  const originalClose = fs.closeSync;
  let linkedTemp;
  fs.closeSync = (descriptor) => {
    originalClose(descriptor);
    if (!linkedTemp) {
      const [temp] = tempEntries(outputDir, 'result.json');
      if (temp) {
        linkedTemp = path.join(outputDir, temp);
        fs.linkSync(linkedTemp, `${linkedTemp}.peer`);
      }
    }
  };
  try {
    assert.throws(() => write(repoDir, { current: true }), /temporary file verification failed/u);
  } finally {
    fs.closeSync = originalClose;
  }
  assert.equal(fs.readFileSync(outputPath, 'utf8'), '{"old":true}\n');
  fs.rmSync(linkedTemp, { force: true });
  fs.rmSync(`${linkedTemp}.peer`, { force: true });
});

test('parent path replacement during the write is rejected before rename', (t) => {
  const { outputDir, repoDir } = createWorkspace(t);
  const movedDir = path.join(repoDir, 'moved-output-artifacts');
  const originalWrite = fs.writeSync;
  let swapped = false;
  fs.writeSync = (...args) => {
    const written = originalWrite(...args);
    if (!swapped) {
      swapped = true;
      fs.renameSync(outputDir, movedDir);
      fs.mkdirSync(outputDir);
      fs.writeFileSync(path.join(outputDir, 'result.json'), '{"replacement":true}\n', { mode: 0o600 });
    }
    return written;
  };
  try {
    assert.throws(() => write(repoDir, { current: true }), /parent changed during write/u);
  } finally {
    fs.writeSync = originalWrite;
  }
  assert.equal(
    fs.readFileSync(path.join(outputDir, 'result.json'), 'utf8'),
    '{"replacement":true}\n',
  );
});

test('a dead safe orphan is recovered while live and ambiguous temp entries remain', (t) => {
  const { outputDir, repoDir } = createWorkspace(t);
  const deadTemp = path.join(outputDir, tempName('result.json', 99999999, 'dead'));
  const liveTemp = path.join(outputDir, tempName('result.json', process.pid, 'live'));
  const ambiguousTemp = path.join(outputDir, tempName('result.json', 99999998, 'ambiguous'));
  fs.writeFileSync(deadTemp, 'orphan\n', { mode: 0o600 });
  fs.writeFileSync(liveTemp, 'live\n', { mode: 0o600 });
  fs.writeFileSync(ambiguousTemp, 'ambiguous\n', { mode: 0o644 });
  fs.chmodSync(deadTemp, 0o600);
  fs.chmodSync(liveTemp, 0o600);
  assert.throws(() => process.kill(99999999, 0));
  assert.throws(() => write(repoDir, { current: true }), /orphan temp is not safe/u);
  fs.rmSync(ambiguousTemp);
  write(repoDir, { current: true });
  assert.equal(fs.existsSync(deadTemp), false);
  assert.equal(fs.existsSync(liveTemp), true);
  assert.equal(fs.existsSync(ambiguousTemp), false);
});

test('crash before rename leaves old bytes and the next writer recovers its temp', (t) => {
  const { outputDir, repoDir } = createWorkspace(t);
  const outputPath = path.join(outputDir, 'result.json');
  fs.writeFileSync(outputPath, '{"old":true}\n', { mode: 0o600 });
  crashWriter(repoDir, 'before-rename');
  assert.equal(fs.readFileSync(outputPath, 'utf8'), '{"old":true}\n');
  assert.equal(tempEntries(outputDir, 'result.json').length, 1);
  write(repoDir, { recovered: true });
  assert.equal(fs.readFileSync(outputPath, 'utf8'), '{\n  "recovered": true\n}\n');
  assert.deepEqual(tempEntries(outputDir, 'result.json'), []);
});

test('crash after rename and before parent fsync leaves complete old-or-new JSON', (t) => {
  const { outputDir, repoDir } = createWorkspace(t);
  const outputPath = path.join(outputDir, 'result.json');
  fs.writeFileSync(outputPath, '{"old":true}\n', { mode: 0o600 });
  crashWriter(repoDir, 'after-rename');
  assert.equal(fs.readFileSync(outputPath, 'utf8'), '{\n  "crashed": true\n}\n');
  const stat = fs.lstatSync(outputPath);
  assert.equal(stat.mode & 0o777, 0o600);
  assert.equal(stat.nlink, 1);
});

test('concurrent writers leave one complete JSON artifact with safe metadata', async (t) => {
  const { outputDir, repoDir } = createWorkspace(t);
  const outcomes = await Promise.all([
    runWriterChild(repoDir, { writer: 'one' }),
    runWriterChild(repoDir, { writer: 'two' }),
  ]);
  assert.ok(outcomes.some((outcome) => outcome === 0));
  const outputPath = path.join(outputDir, 'result.json');
  const bytes = fs.readFileSync(outputPath, 'utf8');
  assert.ok(['{\n  "writer": "one"\n}\n', '{\n  "writer": "two"\n}\n'].includes(bytes));
  const stat = fs.lstatSync(outputPath);
  assert.equal(stat.mode & 0o777, 0o600);
  assert.equal(stat.nlink, 1);
});

function write(repoDir, artifact) {
  return writeEvidenceJson({
    artifact,
    defaultRelativePath: 'evidence/output-artifacts/default.json',
    label: 'Test evidence output',
    repoDir,
    value: 'evidence/output-artifacts/result.json',
  });
}

function tempEntries(directory, basename) {
  return fs.readdirSync(directory).filter((name) => name.startsWith(`${basename}.evidence-gated-answer-output-`));
}

function tempName(basename, pid, suffix) {
  return `${basename}.evidence-gated-answer-output-${pid}-${suffix}`;
}

function crashWriter(repoDir, phase) {
  const writerUrl = new URL('../scripts/evidence-gated-answer-output.mjs', import.meta.url).href;
  const script = `
    import fs from 'node:fs';
    import { writeEvidenceJson } from ${JSON.stringify(writerUrl)};
    const original = ${phase === 'before-rename' ? 'fs.renameSync' : 'fs.fsyncSync'};
    ${phase === 'before-rename'
      ? 'fs.renameSync = () => process.exit(0);'
      : 'let fsyncCalls = 0; fs.fsyncSync = (descriptor) => { fsyncCalls += 1; if (fsyncCalls === 2) process.exit(0); return original(descriptor); };'}
    writeEvidenceJson({ artifact: { crashed: true }, defaultRelativePath: 'evidence/output-artifacts/default.json', label: 'Test evidence output', repoDir: ${JSON.stringify(repoDir)}, value: 'evidence/output-artifacts/result.json' });
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

function runWriterChild(repoDir, artifact) {
  const writerUrl = new URL('../scripts/evidence-gated-answer-output.mjs', import.meta.url).href;
  const script = `
    import { writeEvidenceJson } from ${JSON.stringify(writerUrl)};
    try {
      writeEvidenceJson({ artifact: ${JSON.stringify(artifact)}, defaultRelativePath: 'evidence/output-artifacts/default.json', label: 'Test evidence output', repoDir: ${JSON.stringify(repoDir)}, value: 'evidence/output-artifacts/result.json' });
      process.exit(0);
    } catch {
      process.exit(1);
    }
  `;
  return new Promise((resolve) => {
    spawn(process.execPath, ['--input-type=module', '--eval', script]).once('exit', resolve);
  });
}
