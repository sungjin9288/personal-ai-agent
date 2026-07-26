import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalTrainingToolchainDecision,
  buildLocalTrainingToolchainDecision,
} from '../src/core/local-training-toolchain-decision.mjs';

const repoDir = process.cwd();
const preflightPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-environment-preflight.json',
);
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-toolchain-decision.json',
);
const sourceModelId = 'Qwen/Qwen2.5-1.5B-Instruct';
const preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'));
const environment = inspectEnvironment(sourceModelId);
const decision = buildLocalTrainingToolchainDecision({
  environment,
  observedAt: new Date().toISOString(),
  preflight,
  sourceModel: {
    artifactFormat: 'safetensors',
    id: sourceModelId,
    licenseId: 'apache-2.0',
    modelFamily: 'Qwen2',
    revision: '989aa7980e4cf806f80c7fef2b1adb7bc71aa306',
    sourceUrl:
      'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/tree/989aa7980e4cf806f80c7fef2b1adb7bc71aa306',
  },
  trainer: {
    command: 'mlx_lm.lora',
    id: 'mlx-lm-lora',
    licenseId: 'MIT',
    packageName: 'mlx-lm[train]',
    releaseCommit: 'ed1fca4cef15a824c5f1702c80f70b4cffc8e4dd',
    sourceUrl:
      'https://github.com/ml-explore/mlx-lm/tree/v0.31.3',
    supportedFineTuneTypes: ['lora', 'qlora'],
    supportedModelFamilies: ['Qwen2'],
    version: '0.31.3',
  },
  training: {
    adapterFormat: 'safetensors-adapter',
    dataFormat: 'chat-jsonl',
    fineTuneType: 'lora',
    networkPolicy: 'acquisition-only-then-offline-training',
  },
});
assertLocalTrainingToolchainDecision(decision);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  actualDependencyInstallationPerformed:
    decision.actualDependencyInstallationPerformed,
  actualModelDownloadPerformed: decision.actualModelDownloadPerformed,
  actualModelTrainingExecuted: decision.actualModelTrainingExecuted,
  mode: 'local-training-toolchain-decision',
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  readyForAcquisitionApprovalRequest:
    decision.readyForAcquisitionApprovalRequest,
  sourceModelId: decision.recommendedTrack.sourceModel.id,
  status: decision.status,
  trainerId: decision.recommendedTrack.trainer.id,
}, null, 2));

function inspectEnvironment(modelId) {
  return {
    architecture: os.arch(),
    platform: os.platform(),
    python: {
      available: commandAvailable('python3'),
      version: readVersion('python3', ['--version'], /^Python\s+(.+)$/u),
      venvAvailable:
        runCommand('python3', [
          '-c',
          'import importlib.util; raise SystemExit(0 if importlib.util.find_spec("venv") else 1)',
        ]).status === 0,
    },
    sourceModelInstalled: isModelCached(modelId),
    trainerInstalled: executableExists('mlx_lm.lora'),
    uv: {
      available: commandAvailable('uv'),
      version: readVersion('uv', ['--version'], /^uv\s+([^\s]+)/u),
    },
  };
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: {
      HOME: process.env.HOME,
      LANG: process.env.LANG || 'C',
      LC_ALL: process.env.LC_ALL || 'C',
      PATH: process.env.PATH,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function commandAvailable(command) {
  return runCommand(command, ['--version']).status === 0;
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

function readVersion(command, args, pattern) {
  const result = runCommand(command, args);
  if (result.status !== 0) {
    return null;
  }
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return pattern.exec(output)?.[1] || null;
}

function isModelCached(modelId) {
  const homeDir = process.env.HOME;
  if (!homeDir) {
    return false;
  }
  const cacheName = `models--${modelId.replaceAll('/', '--')}`;
  const cachePath = path.join(
    homeDir,
    '.cache',
    'huggingface',
    'hub',
    cacheName,
  );
  try {
    const stat = fs.lstatSync(cachePath);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}
