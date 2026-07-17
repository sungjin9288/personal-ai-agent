import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildLocalTrainingAcquisitionRequest,
  resolveLocalTrainingAcquisitionRequest,
} from '../src/core/local-training-acquisition-approval.mjs';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'local-training-acquisition-plan-smoke-'),
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
  const resolution = resolveLocalTrainingAcquisitionRequest({
    decision: 'approve',
    owners: {
      approvalOwner: 'smoke-approval-owner',
      egressOwner: 'smoke-egress-owner',
      licenseOwner: 'smoke-license-owner',
      resourceOwner: 'smoke-resource-owner',
      rollbackOwner: 'smoke-rollback-owner',
    },
    reason: 'Synthetic acquisition planning smoke.',
    request,
    resolvedAt: new Date(now).toISOString(),
    resolvedBy: 'smoke-approval-owner',
    toolchainDecision,
  });
  writeJson(
    path.join(evidenceDir, 'local-training-toolchain-decision.json'),
    toolchainDecision,
  );
  writeJson(
    path.join(evidenceDir, 'local-training-acquisition-request.json'),
    request,
  );
  const resolutionPath = path.join(privateDir, 'resolution.json');
  writeJson(resolutionPath, resolution);

  const result = spawnSync(
    process.execPath,
    [
      path.join(
        repoDir,
        'scripts',
        'plan-local-training-acquisition-execution.mjs',
      ),
      '--resolution',
      resolutionPath,
    ],
    {
      cwd: tempRoot,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const planPath = path.join(tempRoot, summary.outputPath);
  const planText = fs.readFileSync(planPath, 'utf8');
  const plan = JSON.parse(planText);

  assert.equal(summary.status, 'approved-acquisition-not-executed');
  assert.equal(summary.stepCount, 7);
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
    /^var\/local-training\/acquisition-plans\//u,
  );
  assert.equal(
    plan.steps.map((step) => step.order).join(','),
    '1,2,3,4,5,6,7',
  );
  assert.equal(
    plan.steps.every((step) => step.status === 'pending'),
    true,
  );
  assert.equal(planText.includes('smoke-approval-owner'), false);
  assert.equal(
    planText.includes('Synthetic acquisition planning smoke.'),
    false,
  );
  assert.equal(fs.statSync(planPath).mode & 0o777, 0o600);

  const packageJson = readJson(path.join(repoDir, 'package.json'));
  assert.equal(
    packageJson.scripts['plan:local-training-acquisition-execution'],
    'node scripts/plan-local-training-acquisition-execution.mjs',
  );
  assert.equal(
    packageJson.scripts[
      'smoke:local-training-acquisition-execution-plan'
    ],
    'node scripts/smoke-local-training-acquisition-execution-plan.mjs',
  );

  const planDocument = fs.readFileSync(
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
    '| F2c.5 Local training acquisition execution plan | 완료 · 실제 승인 대기 |',
    'npm run plan:local-training-acquisition-execution',
    'npm run smoke:local-training-acquisition-execution-plan',
    'actualLocalTrainingAcquisitionApproved: false',
  ]) {
    assert.ok(
      planDocument.includes(term),
      `ML/RAG development plan missing ${term}`,
    );
  }
  assert.ok(
    gallery.includes('| Local training acquisition execution plan |'),
    'evidence gallery must link acquisition execution plan',
  );
  assert.ok(
    manifest.includes(
      'Local training acquisition execution plan: verified with `npm run smoke:local-training-acquisition-execution-plan`',
    ),
    'evidence manifest must record acquisition execution plan',
  );

  console.log(JSON.stringify({
    acquisitionAuthorized: summary.acquisitionAuthorized,
    actualDependencyInstallationPerformed:
      summary.actualDependencyInstallationPerformed,
    actualModelDownloadPerformed:
      summary.actualModelDownloadPerformed,
    actualModelTrainingExecuted:
      summary.actualModelTrainingExecuted,
    mode: 'local-training-acquisition-execution-plan-smoke',
    ok: true,
    outputBoundary: 'private-var-plan',
    productionReadyClaim: summary.productionReadyClaim,
    stepCount: summary.stepCount,
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
