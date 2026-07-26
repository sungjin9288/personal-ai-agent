import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildLocalTrainingAcquisitionRequest } from '../src/core/local-training-acquisition-approval.mjs';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'local-training-acquisition-resolution-smoke-'),
);

try {
  const evidenceDir = path.join(tempRoot, 'evidence', 'output-artifacts');
  const privateDir = path.join(tempRoot, 'var');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(privateDir, { recursive: true });

  const toolchainDecision = readJson(path.join(
    repoDir,
    'evidence',
    'output-artifacts',
    'local-training-toolchain-decision.json',
  ));
  const now = Date.now();
  const request = buildLocalTrainingAcquisitionRequest({
    decision: toolchainDecision,
    expiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
    proposedResourceEnvelope: {
      maxConcurrentDownloads: 2,
      maxDiskBytes: 16 * 1024 ** 3,
      maxDownloadBytes: 8 * 1024 ** 3,
      maxRuntimeMs: 60 * 60 * 1000,
    },
    requestedAt: new Date(now - 60 * 1000).toISOString(),
    requestedBy: 'local-operator',
  });
  writeJson(
    path.join(evidenceDir, 'local-training-toolchain-decision.json'),
    toolchainDecision,
  );
  writeJson(
    path.join(evidenceDir, 'local-training-acquisition-request.json'),
    request,
  );

  const operatorDecision = {
    decision: 'approve',
    owners: {
      approvalOwner: 'smoke-approval-owner',
      egressOwner: 'smoke-egress-owner',
      licenseOwner: 'smoke-license-owner',
      resourceOwner: 'smoke-resource-owner',
      rollbackOwner: 'smoke-rollback-owner',
    },
    reason: 'Synthetic acquisition resolution smoke.',
    schemaVersion:
      'personal-ai-agent-local-training-acquisition-operator-decision/v1',
  };
  const decisionPath = path.join(privateDir, 'operator-decision.json');
  writeJson(decisionPath, operatorDecision);

  const result = spawnSync(
    process.execPath,
    [
      path.join(repoDir, 'scripts', 'resolve-local-training-acquisition.mjs'),
      '--decision',
      decisionPath,
    ],
    {
      cwd: tempRoot,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const resolutionPath = path.join(tempRoot, summary.outputPath);
  const resolutionText = fs.readFileSync(resolutionPath, 'utf8');
  const resolution = JSON.parse(resolutionText);

  assert.equal(summary.status, 'approved');
  assert.equal(summary.acquisitionAuthorized, true);
  assert.equal(summary.actualDependencyInstallationPerformed, false);
  assert.equal(summary.actualModelDownloadPerformed, false);
  assert.equal(summary.actualModelTrainingExecuted, false);
  assert.equal(summary.trainingAuthorized, false);
  assert.equal(summary.rolloutAuthorized, false);
  assert.equal(summary.externalProviderCalls, 'none');
  assert.equal(summary.productionReadyClaim, false);
  assert.match(
    summary.outputPath,
    /^var\/local-training\/acquisition-resolutions\//u,
  );
  assert.equal(resolution.request.id, request.id);
  assert.equal(
    resolutionText.includes(operatorDecision.reason),
    false,
  );

  const packageJson = readJson(path.join(repoDir, 'package.json'));
  assert.equal(
    packageJson.scripts['resolve:local-training-acquisition'],
    'node scripts/resolve-local-training-acquisition.mjs',
  );
  assert.equal(
    packageJson.scripts['smoke:local-training-acquisition-resolution'],
    'node scripts/smoke-local-training-acquisition-resolution.mjs',
  );

  const plan = fs.readFileSync(
    path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
    'utf8',
  );
  const gallery = fs.readFileSync(
    path.join(repoDir, 'docs', 'evidence-gallery.md'),
    'utf8',
  );
  const manifest = fs.readFileSync(
    path.join(repoDir, 'evidence', 'evidence_manifest.md'),
    'utf8',
  );
  for (const term of [
    '| F2c.4 Local training acquisition resolution surface | 완료 · 실제 decision 대기 |',
    'npm run resolve:local-training-acquisition',
    'npm run smoke:local-training-acquisition-resolution',
    'actualLocalTrainingAcquisitionApproved: false',
  ]) {
    assert.ok(
      plan.includes(term),
      `ML/RAG development plan missing ${term}`,
    );
  }
  assert.ok(
    gallery.includes('| Local training acquisition resolution protocol |'),
    'evidence gallery must link acquisition resolution protocol',
  );
  assert.ok(
    manifest.includes(
      'Local training acquisition resolution protocol: verified with `npm run smoke:local-training-acquisition-resolution`',
    ),
    'evidence manifest must record acquisition resolution protocol',
  );

  console.log(JSON.stringify({
    acquisitionAuthorized: summary.acquisitionAuthorized,
    actualDependencyInstallationPerformed:
      summary.actualDependencyInstallationPerformed,
    actualModelDownloadPerformed:
      summary.actualModelDownloadPerformed,
    actualModelTrainingExecuted:
      summary.actualModelTrainingExecuted,
    mode: 'local-training-acquisition-resolution-smoke',
    ok: true,
    outputBoundary: 'private-var-history',
    productionReadyClaim: summary.productionReadyClaim,
    trainingAuthorized: summary.trainingAuthorized,
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function writeJson(filename, value) {
  fs.writeFileSync(
    filename,
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}
