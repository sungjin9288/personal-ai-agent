import { createHash } from 'node:crypto';

import { assertLocalTrainingEnvironmentPreflight } from './local-training-environment-preflight.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_TOOLCHAIN_DECISION_SCHEMA_VERSION =
  'personal-ai-agent-local-training-toolchain-decision/v1';

const PINNED_TRAINER = {
  command: 'mlx_lm.lora',
  id: 'mlx-lm-lora',
  licenseId: 'MIT',
  packageName: 'mlx-lm[train]',
  releaseCommit: 'ed1fca4cef15a824c5f1702c80f70b4cffc8e4dd',
  version: '0.31.3',
};

const PINNED_SOURCE_MODEL = {
  artifactFormat: 'safetensors',
  id: 'Qwen/Qwen2.5-1.5B-Instruct',
  licenseId: 'apache-2.0',
  modelFamily: 'Qwen2',
  revision: '989aa7980e4cf806f80c7fef2b1adb7bc71aa306',
};

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
}

function isGitCommit(value) {
  return /^[a-f0-9]{40}$/u.test(normalizeText(value));
}

function isTimestamp(value) {
  return Number.isFinite(Date.parse(normalizeText(value)));
}

function requireMetadata(value, fieldName) {
  const normalized = normalizeText(value);
  if (
    !normalized ||
    normalized.length > 240 ||
    /[\r\n\0]/u.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(
      `Local training toolchain ${fieldName} must be content-free metadata.`,
    );
  }
  return normalized;
}

function normalizeOptionalMetadata(value, fieldName) {
  return normalizeText(value)
    ? requireMetadata(value, fieldName)
    : null;
}

function requireHttpsUrl(value, fieldName) {
  const normalized = requireMetadata(value, fieldName);
  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error(
      `Local training toolchain ${fieldName} must be an HTTPS URL.`,
    );
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error(
      `Local training toolchain ${fieldName} must be an HTTPS URL.`,
    );
  }
  return url.toString();
}

function normalizePreflight(preflight) {
  if (preflight?.schemaVersion) {
    assertLocalTrainingEnvironmentPreflight(preflight);
  }
  if (!isSha256(preflight.preflightHash)) {
    throw new Error(
      'Local training toolchain requires an exact F2c.1 preflight hash.',
    );
  }
  const id = requireMetadata(preflight.id, 'preflight.id');
  if (id !== `local-training-environment-preflight-${preflight.preflightHash}`) {
    throw new Error(
      'Local training toolchain preflight id must match its hash.',
    );
  }
  const blockerCheckIds = Array.isArray(preflight.blockerCheckIds)
    ? preflight.blockerCheckIds.map((value) =>
        requireMetadata(value, 'preflight.blockerCheckId'))
    : [];
  if (
    new Set(blockerCheckIds).size !== blockerCheckIds.length ||
    blockerCheckIds.length === 0
  ) {
    throw new Error(
      'Local training toolchain requires unique F2c.1 blocker checks.',
    );
  }
  const status = requireMetadata(preflight.status, 'preflight.status');
  if (
    status !== 'blocked-before-local-training' ||
    !blockerCheckIds.includes('trainable-source-model-verified') ||
    !blockerCheckIds.includes('trainer-available')
  ) {
    throw new Error(
      'Local training toolchain requires the blocked F2c.1 trainer and source checks.',
    );
  }
  return {
    blockerCheckIds,
    id,
    preflightHash: preflight.preflightHash,
    status,
  };
}

function normalizeEnvironment(environment = {}) {
  return {
    architecture: requireMetadata(
      environment.architecture,
      'environment.architecture',
    ),
    platform: requireMetadata(environment.platform, 'environment.platform'),
    python: {
      available: environment.python?.available === true,
      version: normalizeOptionalMetadata(
        environment.python?.version,
        'environment.python.version',
      ),
      venvAvailable: environment.python?.venvAvailable === true,
    },
    sourceModelInstalled: environment.sourceModelInstalled === true,
    trainerInstalled: environment.trainerInstalled === true,
    uv: {
      available: environment.uv?.available === true,
      version: normalizeOptionalMetadata(
        environment.uv?.version,
        'environment.uv.version',
      ),
    },
  };
}

function normalizeTrainer(trainer = {}) {
  const supportedFineTuneTypes = Array.isArray(
    trainer.supportedFineTuneTypes,
  )
    ? trainer.supportedFineTuneTypes
        .map((value) => requireMetadata(value, 'trainer.fineTuneType'))
        .sort()
    : [];
  const supportedModelFamilies = Array.isArray(
    trainer.supportedModelFamilies,
  )
    ? trainer.supportedModelFamilies
        .map((value) => requireMetadata(value, 'trainer.modelFamily'))
        .sort()
    : [];
  if (
    new Set(supportedFineTuneTypes).size !== supportedFineTuneTypes.length ||
    new Set(supportedModelFamilies).size !== supportedModelFamilies.length
  ) {
    throw new Error(
      'Local training toolchain support declarations must be unique.',
    );
  }
  const releaseCommit = normalizeText(trainer.releaseCommit);
  if (!isGitCommit(releaseCommit)) {
    throw new Error(
      'Local training toolchain trainer releaseCommit must be a Git commit.',
    );
  }
  return {
    command: requireMetadata(trainer.command, 'trainer.command'),
    id: requireMetadata(trainer.id, 'trainer.id'),
    licenseId: requireMetadata(trainer.licenseId, 'trainer.licenseId'),
    packageName: requireMetadata(
      trainer.packageName,
      'trainer.packageName',
    ),
    releaseCommit,
    sourceUrl: requireHttpsUrl(trainer.sourceUrl, 'trainer.sourceUrl'),
    supportedFineTuneTypes,
    supportedModelFamilies,
    version: requireMetadata(trainer.version, 'trainer.version'),
  };
}

function normalizeSourceModel(sourceModel = {}) {
  const revision = normalizeText(sourceModel.revision);
  if (!isGitCommit(revision)) {
    throw new Error(
      'Local training toolchain source model revision must be a Git commit.',
    );
  }
  return {
    artifactFormat: requireMetadata(
      sourceModel.artifactFormat,
      'sourceModel.artifactFormat',
    ),
    id: requireMetadata(sourceModel.id, 'sourceModel.id'),
    licenseId: requireMetadata(
      sourceModel.licenseId,
      'sourceModel.licenseId',
    ),
    modelFamily: requireMetadata(
      sourceModel.modelFamily,
      'sourceModel.modelFamily',
    ),
    revision,
    sourceUrl: requireHttpsUrl(
      sourceModel.sourceUrl,
      'sourceModel.sourceUrl',
    ),
  };
}

function normalizeTrainingPlan(training = {}) {
  return {
    adapterFormat: requireMetadata(
      training.adapterFormat,
      'training.adapterFormat',
    ),
    dataFormat: requireMetadata(
      training.dataFormat,
      'training.dataFormat',
    ),
    fineTuneType: requireMetadata(
      training.fineTuneType,
      'training.fineTuneType',
    ),
    networkPolicy: requireMetadata(
      training.networkPolicy,
      'training.networkPolicy',
    ),
  };
}

function check(id, passed) {
  return {
    id,
    passed: Boolean(passed),
    status: passed ? 'passed' : 'failed',
  };
}

function buildDecisionContent({
  environment,
  observedAt,
  preflight,
  sourceModel,
  trainer,
  training,
}) {
  const normalizedObservedAt = normalizeText(observedAt);
  if (!isTimestamp(normalizedObservedAt)) {
    throw new Error(
      'Local training toolchain observedAt must be a valid timestamp.',
    );
  }
  const normalizedPreflight = normalizePreflight(preflight);
  const normalizedEnvironment = normalizeEnvironment(environment);
  const normalizedTrainer = normalizeTrainer(trainer);
  const normalizedSourceModel = normalizeSourceModel(sourceModel);
  const normalizedTraining = normalizeTrainingPlan(training);
  const technicalChecks = [
    check(
      'apple-silicon-environment',
      normalizedEnvironment.platform === 'darwin' &&
        normalizedEnvironment.architecture === 'arm64',
    ),
    check(
      'isolated-python-environment-available',
      normalizedEnvironment.python.available &&
        Boolean(normalizedEnvironment.python.version) &&
        normalizedEnvironment.python.venvAvailable &&
        normalizedEnvironment.uv.available &&
        Boolean(normalizedEnvironment.uv.version),
    ),
    check(
      'pinned-trainer-selected',
      Object.entries(PINNED_TRAINER).every(
        ([field, value]) => normalizedTrainer[field] === value,
      ),
    ),
    check(
      'pinned-source-model-selected',
      Object.entries(PINNED_SOURCE_MODEL).every(
        ([field, value]) => normalizedSourceModel[field] === value,
      ),
    ),
    check(
      'trainer-supports-source-family',
      normalizedTrainer.supportedModelFamilies.includes(
        normalizedSourceModel.modelFamily,
      ),
    ),
    check(
      'trainer-supports-fine-tune-type',
      normalizedTrainer.supportedFineTuneTypes.includes(
        normalizedTraining.fineTuneType,
      ),
    ),
    check(
      'trainable-source-format-selected',
      normalizedSourceModel.artifactFormat === 'safetensors',
    ),
    check(
      'offline-training-policy-selected',
      normalizedTraining.networkPolicy ===
        'acquisition-only-then-offline-training',
    ),
  ];
  const technicalBlockerCheckIds = technicalChecks
    .filter((item) => !item.passed)
    .map((item) => item.id);
  const readyForAcquisitionApprovalRequest =
    technicalBlockerCheckIds.length === 0;
  const approvalCheckIds = [
    'trainer-install-approved',
    'source-model-download-approved',
    'model-license-owner-review-approved',
    'acquisition-egress-window-approved',
    'resource-canary-owner-assigned',
    'rollback-owner-assigned',
    'product-permission-approved-after-install',
  ];

  return {
    acquisitionAuthorized: false,
    actualDependencyInstallationPerformed: false,
    actualModelDownloadPerformed: false,
    actualModelTrainingExecuted: false,
    approvalCheckIds,
    costBoundary: {
      externalProviderCalls: 'none',
      paidProviderApiRequired: false,
      softwareLicenseFeeObserved: false,
    },
    decision: readyForAcquisitionApprovalRequest
      ? 'request-explicit-toolchain-acquisition-approval'
      : 'revise-toolchain-selection',
    environment: normalizedEnvironment,
    externalSubmissionAuthorized: false,
    observedAt: normalizedObservedAt,
    preflight: normalizedPreflight,
    productionReadyClaim: false,
    readyForAcquisitionApprovalRequest,
    recommendedTrack: {
      id: 'mlx-lm-lora-qwen2.5-1.5b',
      sourceModel: normalizedSourceModel,
      trainer: normalizedTrainer,
      training: normalizedTraining,
    },
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_TOOLCHAIN_DECISION_SCHEMA_VERSION,
    status: readyForAcquisitionApprovalRequest
      ? 'candidate-selected-approval-required'
      : 'toolchain-selection-blocked',
    technicalBlockerCheckIds,
    technicalChecks,
    trainingAuthorized: false,
  };
}

export function buildLocalTrainingToolchainDecision({
  environment,
  observedAt,
  preflight,
  sourceModel,
  trainer,
  training,
} = {}) {
  const content = buildDecisionContent({
    environment,
    observedAt,
    preflight,
    sourceModel,
    trainer,
    training,
  });
  const decisionHash = hashRecord(content);
  return {
    ...content,
    decisionHash,
    id: `local-training-toolchain-decision-${decisionHash}`,
  };
}

export function assertLocalTrainingToolchainDecision(decision) {
  const {
    decisionHash,
    id,
    ...content
  } = decision || {};
  const expected = buildDecisionContent({
    environment: content.environment,
    observedAt: content.observedAt,
    preflight: {
      ...content.preflight,
    },
    sourceModel: content.recommendedTrack?.sourceModel,
    trainer: content.recommendedTrack?.trainer,
    training: content.recommendedTrack?.training,
  });
  const expectedHash = hashRecord(expected);
  if (
    decisionHash !== expectedHash ||
    id !== `local-training-toolchain-decision-${expectedHash}` ||
    JSON.stringify(content) !== JSON.stringify(expected) ||
    content.acquisitionAuthorized !== false ||
    content.actualDependencyInstallationPerformed !== false ||
    content.actualModelDownloadPerformed !== false ||
    content.actualModelTrainingExecuted !== false ||
    content.externalSubmissionAuthorized !== false ||
    content.productionReadyClaim !== false ||
    content.rolloutAuthorized !== false ||
    content.trainingAuthorized !== false
  ) {
    throw new Error('Local training toolchain decision integrity failed.');
  }
  return decision;
}
