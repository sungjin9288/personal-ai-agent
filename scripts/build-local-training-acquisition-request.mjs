import fs from 'node:fs';
import path from 'node:path';

import { buildLocalTrainingAcquisitionRequest } from '../src/core/local-training-acquisition-approval.mjs';

const repoDir = process.cwd();
const decision = JSON.parse(
  fs.readFileSync(
    path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'local-training-toolchain-decision.json',
    ),
    'utf8',
  ),
);
const requestedAt = new Date();
const expiresAt = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
const request = buildLocalTrainingAcquisitionRequest({
  decision,
  expiresAt: expiresAt.toISOString(),
  proposedResourceEnvelope: {
    maxConcurrentDownloads: 2,
    maxDiskBytes: 16 * 1024 ** 3,
    maxDownloadBytes: 8 * 1024 ** 3,
    maxRuntimeMs: 60 * 60 * 1000,
  },
  requestedAt: requestedAt.toISOString(),
  requestedBy: 'local-operator',
});
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-acquisition-request.json',
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(request, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  acquisitionAuthorized: request.acquisitionAuthorized,
  actualDependencyInstallationPerformed:
    request.actualDependencyInstallationPerformed,
  actualModelDownloadPerformed: request.actualModelDownloadPerformed,
  actualModelTrainingExecuted: request.actualModelTrainingExecuted,
  expiresAt: request.expiresAt,
  mode: 'local-training-acquisition-request',
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  status: request.status,
}, null, 2));
