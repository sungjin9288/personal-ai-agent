import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

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
    fs.writeFileSync(datasetPath, JSON.stringify(dataset), 'utf8');

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
    fs.writeFileSync(datasetPath, JSON.stringify(createActualDataset()), 'utf8');

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
    fs.writeFileSync(datasetPath, JSON.stringify(createActualDataset()), 'utf8');

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
    fs.writeFileSync(sourcePath, JSON.stringify(createActualDataset()), 'utf8');
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
