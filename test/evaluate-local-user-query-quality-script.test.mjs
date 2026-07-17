import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildUserQueryEvaluationIntake,
} from '../src/core/user-query-evaluation-intake.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'evaluate-local-user-query-quality.mjs',
);
const fixture = readJson(
  path.join(repoDir, 'fixtures', 'user-query-evaluation-intake-dry-run-v1.json'),
);
const reviewActionBaseline = readJson(
  path.join(
    repoDir,
    'evidence',
    'output-artifacts',
    'local-answer-review-action-generalization.json',
  ),
);

test('actual user-query CLI selects the Q7 v5 baseline and writes content-free evidence', async () => {
  const {
    dataset,
    evidenceText,
    generationCount,
    result,
  } = await runActualEvaluation();

  assert.equal(result.code, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const evidence = JSON.parse(evidenceText);
  assert.equal(generationCount, dataset.records.length);
  assert.equal(summary.actualUserQueryData, true);
  assert.equal(summary.actualUserQueryQualityValidated, true);
  assert.equal(
    summary.promptVersion,
    reviewActionBaseline.prompt.candidateVersion,
  );
  assert.equal(
    evidence.baseline.kind,
    'review-action-generalization-v5',
  );
  assert.equal(evidence.productionReadyClaim, false);
  assert.equal(evidence.activation.authorized, false);
  assert.equal(evidence.rolloutAuthorized, false);
  for (const record of dataset.records) {
    assert.equal(evidenceText.includes(record.query), false);
    for (const value of [
      ...record.evidence,
      ...record.expectedAnswerTerms,
    ]) {
      assert.equal(evidenceText.includes(value), false);
    }
  }
});

test('actual user-query CLI stops before the next model call when intake is withdrawn', async () => {
  const {
    evidenceText,
    generationCount,
    result,
  } = await runActualEvaluation({ withdrawAfterFirstGeneration: true });

  assert.notEqual(result.code, 0);
  assert.equal(generationCount, 1);
  assert.equal(evidenceText, null);
  assert.match(result.stderr, /ENOENT|authorization changed during execution/u);
});

test('actual user-query CLI rejects tracked dataset and intake paths before model access', async () => {
  const trackedDirectory = fs.mkdtempSync(
    path.join(repoDir, 'fixtures', 'actual-user-query-quality-'),
  );
  const outputDirectory = fs.mkdtempSync(
    path.join(repoDir, 'var', 'actual-user-query-quality-'),
  );
  try {
    const dataset = createActualDataset();
    const intake = buildUserQueryEvaluationIntake({
      dataset,
      observedAt: '2026-07-17T06:00:00.000Z',
    });
    const datasetPath = path.join(trackedDirectory, 'dataset.json');
    const intakePath = path.join(trackedDirectory, 'intake.json');
    const outputPath = path.join(outputDirectory, 'quality.json');
    fs.writeFileSync(datasetPath, JSON.stringify(dataset), 'utf8');
    fs.writeFileSync(intakePath, JSON.stringify(intake), 'utf8');

    const result = await runEvaluator([
      '--dataset',
      datasetPath,
      '--endpoint',
      'http://127.0.0.1:9',
      '--intake',
      intakePath,
      '--model',
      reviewActionBaseline.model.id,
      '--output',
      outputPath,
      '--cloud-features-disabled',
    ]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /distinct private dataset, intake, and output paths/);
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.rmSync(trackedDirectory, { force: true, recursive: true });
    fs.rmSync(outputDirectory, { force: true, recursive: true });
  }
});

async function runActualEvaluation({
  withdrawAfterFirstGeneration = false,
} = {}) {
  const privateDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'actual-user-query-quality-'),
  );
  const outputDirectory = fs.mkdtempSync(
    path.join(repoDir, 'var', 'actual-user-query-quality-'),
  );
  const dataset = createActualDataset();
  const intake = buildUserQueryEvaluationIntake({
    dataset,
    observedAt: '2026-07-17T06:00:00.000Z',
  });
  const datasetPath = path.join(privateDirectory, 'dataset.json');
  const intakePath = path.join(privateDirectory, 'intake.json');
  const outputPath = path.join(outputDirectory, 'quality.json');
  fs.writeFileSync(datasetPath, JSON.stringify(dataset), 'utf8');
  fs.writeFileSync(intakePath, JSON.stringify(intake), 'utf8');

  const orderedRecords = [...dataset.records].sort(
    (left, right) => sha256(left.id).localeCompare(sha256(right.id)),
  );
  let generationIndex = 0;
  const server = http.createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url === '/api/version') {
      response.end(JSON.stringify({
        version: reviewActionBaseline.runtime.version,
      }));
      return;
    }
    if (request.url === '/api/tags') {
      response.end(JSON.stringify({
        models: [{
          digest: reviewActionBaseline.model.digest,
          model: reviewActionBaseline.model.id,
          name: reviewActionBaseline.model.id,
          size: reviewActionBaseline.model.sizeBytes,
        }],
      }));
      return;
    }
    if (request.url === '/api/generate') {
      await readBody(request);
      const record = orderedRecords[generationIndex];
      generationIndex += 1;
      const idHash = sha256(record.id);
      response.end(JSON.stringify({
        model: reviewActionBaseline.model.id,
        response: JSON.stringify({
          claims: record.evidence.map((_item, index) => ({
            sourceKey: `user-query-evidence:${idHash}:${index + 1}`,
            text: record.expectedAnswerTerms.join(' '),
          })),
          reviewAction: `The reviewer verifies ${record.expectedAnswerTerms.join(' and ')}.`,
          summary: record.expectedAnswerTerms.join(' '),
        }),
      }));
      if (withdrawAfterFirstGeneration && generationIndex === 1) {
        fs.rmSync(intakePath);
      }
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: 'not found' }));
  });

  try {
    await listen(server);
    const result = await runEvaluator([
      '--dataset',
      datasetPath,
      '--endpoint',
      `http://127.0.0.1:${server.address().port}`,
      '--intake',
      intakePath,
      '--model',
      reviewActionBaseline.model.id,
      '--output',
      outputPath,
      '--cloud-features-disabled',
    ]);
    return {
      dataset,
      evidenceText: fs.existsSync(outputPath)
        ? fs.readFileSync(outputPath, 'utf8')
        : null,
      generationCount: generationIndex,
      result,
    };
  } finally {
    await close(server);
    fs.rmSync(privateDirectory, { force: true, recursive: true });
    fs.rmSync(outputDirectory, { force: true, recursive: true });
  }
}

function createActualDataset() {
  const dataset = structuredClone(fixture);
  dataset.datasetId = 'q8-private-actual-user-query-cli-test';
  dataset.actualUserQueryData = true;
  dataset.dataClassification = 'deidentified-user-query';
  dataset.consent = {
    expiresAt: '2026-12-17T00:00:00.000Z',
    purpose: 'answer-quality-evaluation',
    recordHash: 'c'.repeat(64),
    recordedAt: '2026-07-16T00:00:00.000Z',
    status: 'granted',
    withdrawalSupported: true,
  };
  for (const record of dataset.records) {
    record.source = 'consented-user-query';
  }
  return dataset;
}

function runEvaluator(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stderr, stdout });
    });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
