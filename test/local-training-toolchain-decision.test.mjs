import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalTrainingToolchainDecision,
  buildLocalTrainingToolchainDecision,
} from '../src/core/local-training-toolchain-decision.mjs';

const preflight = JSON.parse(
  fs.readFileSync(
    new URL(
      '../evidence/output-artifacts/local-training-environment-preflight.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

function buildInput(overrides = {}) {
  return {
    environment: {
      architecture: 'arm64',
      platform: 'darwin',
      python: {
        available: true,
        version: '3.12.12',
        venvAvailable: true,
      },
      sourceModelInstalled: false,
      trainerInstalled: false,
      uv: {
        available: true,
        version: '0.10.10',
      },
    },
    observedAt: '2026-07-17T08:00:00.000Z',
    preflight,
    sourceModel: {
      artifactFormat: 'safetensors',
      id: 'Qwen/Qwen2.5-1.5B-Instruct',
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
    ...overrides,
  };
}

test('compatible Apple Silicon toolchain is ready only for acquisition approval', () => {
  const decision = buildLocalTrainingToolchainDecision(buildInput());

  assert.equal(decision.status, 'candidate-selected-approval-required');
  assert.equal(decision.readyForAcquisitionApprovalRequest, true);
  assert.equal(decision.technicalBlockerCheckIds.length, 0);
  assert.equal(decision.acquisitionAuthorized, false);
  assert.equal(decision.actualDependencyInstallationPerformed, false);
  assert.equal(decision.actualModelDownloadPerformed, false);
  assert.equal(decision.actualModelTrainingExecuted, false);
  assert.equal(decision.trainingAuthorized, false);
  assert.doesNotThrow(() =>
    assertLocalTrainingToolchainDecision(decision));
});

test('unsupported platform and missing isolated environment block the selection', () => {
  const input = buildInput();
  input.environment = {
    ...input.environment,
    architecture: 'x64',
    platform: 'linux',
    python: {
      available: true,
      version: '3.12.12',
      venvAvailable: false,
    },
    uv: {
      available: false,
      version: null,
    },
  };
  const decision = buildLocalTrainingToolchainDecision(input);

  assert.equal(decision.status, 'toolchain-selection-blocked');
  assert.equal(decision.readyForAcquisitionApprovalRequest, false);
  assert.deepEqual(decision.technicalBlockerCheckIds, [
    'apple-silicon-environment',
    'isolated-python-environment-available',
  ]);
});

test('trainer family, fine-tune type, source format, and network policy stay explicit', () => {
  const input = buildInput();
  input.trainer.supportedModelFamilies = ['Llama'];
  input.training.fineTuneType = 'full';
  input.sourceModel.artifactFormat = 'gguf';
  input.training.networkPolicy = 'network-unrestricted';
  const decision = buildLocalTrainingToolchainDecision(input);

  assert.deepEqual(decision.technicalBlockerCheckIds, [
    'pinned-source-model-selected',
    'trainer-supports-source-family',
    'trainer-supports-fine-tune-type',
    'trainable-source-format-selected',
    'offline-training-policy-selected',
  ]);
});

test('decision rejects unsafe metadata and mutable source references', () => {
  const unsafe = buildInput();
  unsafe.sourceModel.id = 'api_key=local-training-secret';
  assert.throws(
    () => buildLocalTrainingToolchainDecision(unsafe),
    /must be content-free metadata/,
  );

  const mutable = buildInput();
  mutable.sourceModel.revision = 'main';
  assert.throws(
    () => buildLocalTrainingToolchainDecision(mutable),
    /revision must be a Git commit/,
  );
});

test('different trainer or source pins cannot inherit the selected track identity', () => {
  const input = buildInput();
  input.trainer.version = '0.31.4';
  input.sourceModel.id = 'Qwen/Qwen2.5-3B-Instruct';
  const decision = buildLocalTrainingToolchainDecision(input);

  assert.deepEqual(decision.technicalBlockerCheckIds, [
    'pinned-trainer-selected',
    'pinned-source-model-selected',
  ]);
  assert.equal(decision.readyForAcquisitionApprovalRequest, false);
});

test('decision integrity rejects approval and execution escalation', () => {
  const decision = buildLocalTrainingToolchainDecision(buildInput());
  const tampered = structuredClone(decision);
  tampered.acquisitionAuthorized = true;
  tampered.actualDependencyInstallationPerformed = true;
  tampered.trainingAuthorized = true;

  assert.throws(
    () => assertLocalTrainingToolchainDecision(tampered),
    /integrity failed/,
  );
});
