import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertPrivateActualEvaluationPaths,
  writeEvaluationJson,
} from '../scripts/private-user-query-evaluation-paths.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'build-user-query-evaluation-intake.mjs',
);
const fixture = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'fixtures', 'user-query-evaluation-intake-dry-run-v1.json'),
  'utf8',
));

test('intake builder preserves the synthetic default command', () => {
  const result = runBuilder([]);

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.actualUserQueryData, false);
  assert.equal(summary.outputPath, null);
  assert.equal(summary.recordCount, 12);
});

test('intake builder preserves the legacy output error contract', () => {
  const result = runBuilder(['--output', 'var/intake.json']);

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Expected the stable user query evaluation intake output path/,
  );
});

test('intake builder writes content-free evidence for a private actual-data path', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-intake-'),
  );
  try {
    const dataset = createActualDataset();
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(datasetPath, JSON.stringify(dataset), {
      encoding: 'utf8',
      mode: 0o600,
    });

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const evidenceText = fs.readFileSync(outputPath, 'utf8');
    assert.equal(summary.actualUserQueryData, true);
    assert.equal(summary.outputPath, '<private>/intake.json');
    assert.equal(evidenceText.includes(dataset.records[0].query), false);
    assert.equal(evidenceText.includes(dataset.records[0].evidence[0]), false);
    assert.equal(evidenceText.includes(dataset.records[0].expectedAnswerTerms[0]), false);
    assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
    assert.equal(fs.statSync(outputPath).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('actual-data intake rejects a tracked repository path', () => {
  const directory = fs.mkdtempSync(
    path.join(repoDir, 'fixtures', 'actual-user-query-intake-'),
  );
  try {
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(datasetPath, JSON.stringify(createActualDataset()), {
      encoding: 'utf8',
      mode: 0o600,
    });

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /distinct private dataset and output paths/,
    );
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('actual-data intake accepts the gitignored var boundary', () => {
  const directory = fs.mkdtempSync(
    path.join(repoDir, 'var', 'actual-user-query-intake-'),
  );
  try {
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(datasetPath, JSON.stringify(createActualDataset()), {
      encoding: 'utf8',
      mode: 0o600,
    });

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(outputPath), true);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('intake builder rejects a symbolic-link dataset', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-intake-link-'),
  );
  try {
    const sourcePath = path.join(directory, 'source.json');
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(sourcePath, JSON.stringify(createActualDataset()), {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.symlinkSync(sourcePath, datasetPath);

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /bounded regular file/);
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('intake builder rejects a private-looking path that resolves into tracked content', () => {
  const privateDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-intake-parent-link-'),
  );
  const trackedDirectory = fs.mkdtempSync(
    path.join(repoDir, 'fixtures', 'actual-user-query-intake-target-'),
  );
  try {
    const linkedDirectory = path.join(privateDirectory, 'linked');
    const datasetPath = path.join(linkedDirectory, 'dataset.json');
    const outputPath = path.join(linkedDirectory, 'intake.json');
    fs.writeFileSync(
      path.join(trackedDirectory, 'dataset.json'),
      JSON.stringify(createActualDataset()),
      'utf8',
    );
    fs.symlinkSync(trackedDirectory, linkedDirectory);

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /distinct private dataset and output paths/);
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.rmSync(privateDirectory, { force: true, recursive: true });
    fs.rmSync(trackedDirectory, { force: true, recursive: true });
  }
});

test('actual-data intake rejects a group-readable private dataset', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-intake-mode-'),
  );
  try {
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(datasetPath, JSON.stringify(createActualDataset()), {
      encoding: 'utf8',
      mode: 0o640,
    });

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only regular files/);
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('synthetic intake keeps accepting a bounded hard-linked dataset', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'synthetic-user-query-intake-hard-link-'),
  );
  try {
    const sourcePath = path.join(directory, 'source.json');
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(sourcePath, JSON.stringify(fixture), 'utf8');
    fs.linkSync(sourcePath, datasetPath);

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(outputPath), true);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('actual-data intake rejects a hard-linked private dataset', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-intake-hard-link-'),
  );
  try {
    const sourcePath = path.join(directory, 'source.json');
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(sourcePath, JSON.stringify(createActualDataset()), {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.linkSync(sourcePath, datasetPath);

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only regular files/);
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('actual-data intake rejects a non-private input directory', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-intake-directory-mode-'),
  );
  try {
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(datasetPath, JSON.stringify(createActualDataset()), {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.chmodSync(directory, 0o750);

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /directories must be owner-only/);
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.chmodSync(directory, 0o700);
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('actual-data intake rejects an unsafe existing output', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-intake-output-mode-'),
  );
  try {
    const datasetPath = path.join(directory, 'dataset.json');
    const outputPath = path.join(directory, 'intake.json');
    fs.writeFileSync(datasetPath, JSON.stringify(createActualDataset()), {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.writeFileSync(outputPath, '{}', {
      encoding: 'utf8',
      mode: 0o640,
    });

    const result = runBuilder([
      '--dataset',
      datasetPath,
      '--output',
      outputPath,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only regular file/);
    assert.equal(fs.readFileSync(outputPath, 'utf8'), '{}');
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('actual-data output rejects an ancestor moved after authorization', () => {
  const privateRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-output-binding-'),
  );
  const redirectedDirectory = fs.mkdtempSync(
    path.join(repoDir, 'fixtures', 'actual-user-query-output-target-'),
  );
  const approvedDirectory = path.join(privateRoot, 'approved');
  const movedDirectory = path.join(privateRoot, 'moved');
  const outputPath = path.join(approvedDirectory, 'quality.json');
  try {
    fs.mkdirSync(approvedDirectory, { mode: 0o700 });
    const [authorizedPath] = assertPrivateActualEvaluationPaths({
      actualUserQueryData: true,
      errorMessage: 'unexpected private path rejection',
      paths: [outputPath],
      repoDir,
    });
    fs.renameSync(approvedDirectory, movedDirectory);
    fs.symlinkSync(redirectedDirectory, approvedDirectory);

    assert.throws(
      () => writeEvaluationJson({
        actualUserQueryData: true,
        authorizedPath,
        filename: outputPath,
        value: { ok: true },
      }),
      /moved outside its authorized private path/,
    );
    assert.equal(
      fs.existsSync(path.join(redirectedDirectory, 'quality.json')),
      false,
    );
  } finally {
    fs.rmSync(privateRoot, { force: true, recursive: true });
    fs.rmSync(redirectedDirectory, { force: true, recursive: true });
  }
});

test('actual-data output syncs content before rename and cleans a failed temp file', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-output-atomic-'),
  );
  const outputPath = path.join(directory, 'quality.json');
  const [authorizedPath] = assertPrivateActualEvaluationPaths({
    actualUserQueryData: true,
    errorMessage: 'unexpected private path rejection',
    paths: [outputPath],
    repoDir,
  });
  const originalRename = fs.renameSync;
  const originalSync = fs.fsyncSync;
  const operations = [];
  try {
    fs.fsyncSync = (descriptor) => {
      operations.push(
        fs.fstatSync(descriptor).isDirectory() ? 'directory-sync' : 'file-sync',
      );
      return originalSync(descriptor);
    };
    fs.renameSync = () => {
      operations.push('rename');
      throw new Error('injected rename failure');
    };

    assert.throws(
      () => writeEvaluationJson({
        actualUserQueryData: true,
        authorizedPath,
        filename: outputPath,
        value: { ok: true },
      }),
      /injected rename failure/,
    );
    assert.deepEqual(operations.slice(-2), ['file-sync', 'rename']);
    assert.deepEqual(
      fs.readdirSync(directory).filter((entry) => entry.endsWith('.tmp')),
      [],
    );
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.renameSync = originalRename;
    fs.fsyncSync = originalSync;
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function createActualDataset() {
  const dataset = structuredClone(fixture);
  dataset.datasetId = 'q8-private-actual-user-query-protocol-test';
  dataset.actualUserQueryData = true;
  dataset.dataClassification = 'deidentified-user-query';
  dataset.consent = {
    expiresAt: '2026-12-17T00:00:00.000Z',
    purpose: 'answer-quality-evaluation',
    recordHash: 'b'.repeat(64),
    recordedAt: '2026-07-16T00:00:00.000Z',
    status: 'granted',
    withdrawalSupported: true,
  };
  for (const record of dataset.records) {
    record.source = 'consented-user-query';
  }
  return dataset;
}

function runBuilder(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  });
}
