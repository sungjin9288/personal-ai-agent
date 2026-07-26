import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalTrainingEnvironmentPreflight,
  buildLocalTrainingEnvironmentPreflight,
} from '../src/core/local-training-environment-preflight.mjs';
import { buildLocalTrainingReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const modelId = 'qwen2.5:3b';
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-environment-preflight.json',
);

const readinessPackage = buildLocalTrainingReadinessFixture({ repoDir });
const snapshot = {
  baseModel: await inspectLocalOllamaModel(modelId),
  system: inspectSystem(),
  trainer: inspectTrainers(),
};
const preflight = buildLocalTrainingEnvironmentPreflight({
  observedAt: new Date().toISOString(),
  readinessPackage,
  snapshot,
});
assertLocalTrainingEnvironmentPreflight(preflight);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(preflight, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  actualModelTrainingExecuted: preflight.actualModelTrainingExecuted,
  blockerCheckIds: preflight.blockerCheckIds,
  costFree: preflight.costFree,
  externalProviderCalls: preflight.externalProviderCalls,
  mode: 'local-training-environment-preflight',
  modelId: preflight.baseModel.id,
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  readyForExplicitTrainingRequest:
    preflight.readyForExplicitTrainingRequest,
  status: preflight.status,
  trainerId: preflight.trainer.selectedCandidateId,
}, null, 2));

async function inspectLocalOllamaModel(id) {
  const [family, tag] = id.split(':');
  const homeDir = process.env.HOME;
  if (!homeDir || !family || !tag) {
    return missingModel(id);
  }
  const modelRoot = path.join(homeDir, '.ollama', 'models');
  const manifestPath = path.join(
    modelRoot,
    'manifests',
    'registry.ollama.ai',
    'library',
    family,
    tag,
  );
  if (!isRegularFile(manifestPath)) {
    return missingModel(id);
  }

  const manifestBytes = fs.readFileSync(manifestPath);
  if (manifestBytes.length === 0 || manifestBytes.length > 1024 * 1024) {
    throw new Error('Local Ollama model manifest must be a bounded regular file.');
  }
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const modelLayer = findLayer(
    manifest,
    'application/vnd.ollama.image.model',
  );
  const licenseLayer = findLayer(
    manifest,
    'application/vnd.ollama.image.license',
  );
  if (!modelLayer) {
    return missingModel(id);
  }

  const artifactDigest = parseDigest(modelLayer.digest);
  const artifactPath = blobPath(modelRoot, artifactDigest);
  const artifactStat = isRegularFile(artifactPath)
    ? fs.statSync(artifactPath)
    : null;
  const artifactHash = artifactStat
    ? await hashFile(artifactPath)
    : null;
  const license = await inspectLicense(modelRoot, licenseLayer);

  return {
    artifactDigest,
    artifactFormat: artifactStat ? readArtifactFormat(artifactPath) : null,
    artifactHashVerified: artifactHash === artifactDigest,
    artifactSizeBytes: artifactStat?.size || null,
    id,
    installed: Boolean(artifactStat),
    license,
    manifestHash: hashBuffer(manifestBytes),
    source: 'ollama-local-cache',
    trainableSourceVerified: false,
  };
}

function missingModel(id) {
  return {
    artifactDigest: null,
    artifactFormat: null,
    artifactHashVerified: false,
    artifactSizeBytes: null,
    id,
    installed: false,
    license: {
      hashVerified: false,
      textHash: null,
      title: null,
    },
    manifestHash: null,
    source: 'ollama-local-cache',
    trainableSourceVerified: false,
  };
}

async function inspectLicense(modelRoot, layer) {
  if (!layer) {
    return {
      hashVerified: false,
      textHash: null,
      title: null,
    };
  }
  const textHash = parseDigest(layer.digest);
  const filename = blobPath(modelRoot, textHash);
  if (!isRegularFile(filename)) {
    return {
      hashVerified: false,
      textHash,
      title: null,
    };
  }
  const bytes = fs.readFileSync(filename);
  const title = bytes
    .toString('utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(Boolean) || null;
  return {
    hashVerified: hashBuffer(bytes) === textHash,
    textHash,
    title,
  };
}

function inspectSystem() {
  const disk = fs.statfsSync(repoDir);
  return {
    architecture: os.arch(),
    availableDiskBytes: disk.bavail * disk.bsize,
    platform: os.platform(),
    platformVersion: os.release(),
    totalMemoryBytes: os.totalmem(),
  };
}

function inspectTrainers() {
  const candidates = [
    {
      command: 'llama-finetune',
      id: 'llama-cpp-finetune',
    },
    {
      command: 'mlx_lm.lora',
      id: 'mlx-lm-lora',
    },
  ].map((candidate) => ({
    ...candidate,
    available: executableExists(candidate.command),
  }));
  return {
    candidates,
    selectedCandidateId:
      candidates.find((candidate) => candidate.available)?.id || null,
  };
}

function executableExists(command) {
  return String(process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean)
    .some((directory) => {
      const filename = path.join(directory, command);
      try {
        fs.accessSync(filename, fs.constants.X_OK);
        return fs.statSync(filename).isFile();
      } catch {
        return false;
      }
    });
}

function findLayer(manifest, mediaType) {
  return Array.isArray(manifest?.layers)
    ? manifest.layers.find((layer) => layer?.mediaType === mediaType) || null
    : null;
}

function parseDigest(value) {
  const match = /^sha256:([a-f0-9]{64})$/u.exec(String(value || ''));
  if (!match) {
    throw new Error('Local Ollama model layer digest must be SHA-256.');
  }
  return match[1];
}

function blobPath(modelRoot, digest) {
  return path.join(modelRoot, 'blobs', `sha256-${digest}`);
}

function isRegularFile(filename) {
  try {
    const stat = fs.lstatSync(filename);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function readArtifactFormat(filename) {
  const descriptor = fs.openSync(filename, 'r');
  try {
    const header = Buffer.alloc(4);
    fs.readSync(descriptor, header, 0, header.length, 0);
    return header.toString('ascii') === 'GGUF' ? 'gguf' : 'unknown';
  } finally {
    fs.closeSync(descriptor);
  }
}

function hashBuffer(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashFile(filename) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filename);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', () => {
      reject(new Error('Local model artifact could not be read.'));
    });
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
