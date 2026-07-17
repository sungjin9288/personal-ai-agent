import { spawn as nodeSpawn } from 'node:child_process';
import { createHash } from 'node:crypto';

import { assertFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import { assertApprovedLocalTrainingPermission } from './local-training-permission.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_PROTOCOL_VERSION = 'personal-ai-agent-local-training/v1';
export const LOCAL_TRAINING_APPROVAL_SCHEMA_VERSION =
  'personal-ai-agent-local-training-approval/v1';
export const LOCAL_TRAINING_RUN_SCHEMA_VERSION =
  'personal-ai-agent-local-training-run/v1';

const DEFAULT_MAX_INPUT_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const EXECUTION_KINDS = new Set(['fixture-simulated', 'local-model-training']);
const SAFE_ENV_KEYS = Object.freeze([
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'PATH',
  'TMPDIR',
]);

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
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function isTimestamp(value) {
  return Number.isFinite(Date.parse(normalizeText(value)));
}

function requireText(value, fieldName) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`Local training ${fieldName} is required.`);
  }
  return normalized;
}

function requireMetadataText(value, fieldName) {
  const normalized = requireText(value, fieldName);
  if (
    normalized.length > 200 ||
    /[\r\n\0]/.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(`Local training ${fieldName} must be content-free metadata.`);
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!isTimestamp(normalized)) {
    throw new Error(`Local training ${fieldName} must be a valid timestamp.`);
  }
  return normalized;
}

function requireProcessArgument(value, index) {
  const normalized = String(value);
  if (
    normalized.length > 2_048 ||
    /[\r\n\0]/.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(`Local training argument ${index} must not contain secret or customer data.`);
  }
  return normalized;
}

function requirePositiveInteger(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Local training ${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function buildLocalEnvironment(source = process.env) {
  return Object.fromEntries(
    SAFE_ENV_KEYS
      .map((key) => [key, normalizeText(source[key])])
      .filter(([, value]) => value),
  );
}

function hasOnlyKeys(value, allowedKeys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowedKeys.includes(key))
  );
}

function assertExecutionKind(value) {
  const normalized = normalizeText(value);
  if (!EXECUTION_KINDS.has(normalized)) {
    throw new Error(`Unsupported local training execution kind: ${normalized || '<empty>'}.`);
  }
  return normalized;
}

export function buildLocalTrainingExecutionApproval({
  approvedAt,
  approvedBy,
  baseModelId,
  executionKind = 'local-model-training',
  expiresAt,
  permission,
  readinessPackage,
  rollbackOwner,
  trainerId,
} = {}) {
  assertFineTuningReadinessPackage(readinessPackage);
  const normalizedApprovedAt = normalizeText(approvedAt);
  const normalizedExpiresAt = normalizeText(expiresAt);
  if (
    !isTimestamp(normalizedApprovedAt) ||
    !isTimestamp(normalizedExpiresAt) ||
    Date.parse(normalizedExpiresAt) <= Date.parse(normalizedApprovedAt)
  ) {
    throw new Error('Local training approval requires a valid future expiration after approval.');
  }

  const normalizedExecutionKind = assertExecutionKind(executionKind);
  if (normalizedExecutionKind === 'local-model-training') {
    if (!permission) {
      throw new Error('Local model training requires approved product permission.');
    }
    assertApprovedLocalTrainingPermission({
      baseModelId,
      now: normalizedApprovedAt,
      permission,
      readinessPackage,
      rollbackOwner,
      trainerId,
    });
  }

  const approval = {
    approvedAt: normalizedApprovedAt,
    approvedBy: requireMetadataText(approvedBy, 'approvedBy'),
    baseModelId: requireMetadataText(baseModelId, 'baseModelId'),
    datasetHash: readinessPackage.dataset.datasetHash,
    executionKind: normalizedExecutionKind,
    expiresAt: normalizedExpiresAt,
    exportDigests: {
      train: readinessPackage.exportDigests.train,
      validation: readinessPackage.exportDigests.validation,
    },
    externalSubmissionAuthorized: false,
    localExecutionAuthorized: true,
    ...(normalizedExecutionKind === 'local-model-training' ? { permission } : {}),
    productionReadyClaim: false,
    readinessHash: readinessPackage.readinessHash,
    rollbackOwner: requireMetadataText(rollbackOwner, 'rollbackOwner'),
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_APPROVAL_SCHEMA_VERSION,
    trainerId: requireMetadataText(trainerId, 'trainerId'),
  };
  const approvalHash = hashRecord(approval);
  return {
    ...approval,
    approvalHash,
    id: `local-training-approval-${approvalHash}`,
  };
}

function assertLocalTrainingExecutionApproval({
  approval,
  now,
  readinessPackage,
  timeoutMs,
  trainerId,
}) {
  const { approvalHash, id, ...approvalContent } = approval || {};
  const expectedHash = hashRecord(approvalContent);
  const nowMs = Date.parse(now);
  const approvedAtMs = Date.parse(normalizeText(approval?.approvedAt));
  const expiresAtMs = Date.parse(normalizeText(approval?.expiresAt));
  const errors = [];
  let metadataIsSafe = true;
  try {
    requireMetadataText(approval?.approvedBy, 'approvedBy');
    requireMetadataText(approval?.rollbackOwner, 'rollbackOwner');
    requireMetadataText(approval?.baseModelId, 'baseModelId');
    requireMetadataText(approval?.trainerId, 'trainerId');
  } catch {
    metadataIsSafe = false;
  }

  if (
    approval?.schemaVersion !== LOCAL_TRAINING_APPROVAL_SCHEMA_VERSION ||
    approvalHash !== expectedHash ||
    id !== `local-training-approval-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(approvedAtMs) ||
    !Number.isFinite(expiresAtMs) ||
    approvedAtMs > nowMs ||
    expiresAtMs <= nowMs
  ) {
    errors.push('time-window');
  }
  if (
    !metadataIsSafe ||
    !EXECUTION_KINDS.has(normalizeText(approval?.executionKind)) ||
    approval?.trainerId !== trainerId
  ) {
    errors.push('operator-binding');
  }
  if (
    approval?.readinessHash !== readinessPackage.readinessHash ||
    approval?.datasetHash !== readinessPackage.dataset.datasetHash ||
    approval?.exportDigests?.train !== readinessPackage.exportDigests.train ||
    approval?.exportDigests?.validation !== readinessPackage.exportDigests.validation
  ) {
    errors.push('dataset-binding');
  }
  if (
    approval?.localExecutionAuthorized !== true ||
    approval?.externalSubmissionAuthorized !== false ||
    approval?.rolloutAuthorized !== false ||
    approval?.productionReadyClaim !== false
  ) {
    errors.push('authority-boundary');
  }
  if (approval?.executionKind === 'local-model-training') {
    try {
      assertApprovedLocalTrainingPermission({
        baseModelId: approval.baseModelId,
        now,
        permission: approval.permission,
        readinessPackage,
        rollbackOwner: approval.rollbackOwner,
        trainerId,
      });
    } catch {
      errors.push('permission-binding');
    }
    if (timeoutMs > Number(approval?.permission?.evidence?.resource?.limits?.maxRuntimeMs || 0)) {
      errors.push('resource-limit');
    }
  } else if (approval?.permission !== undefined) {
    errors.push('authority-boundary');
  }
  if (errors.length > 0) {
    throw new Error(`Local training approval failed: ${errors.join(', ')}.`);
  }
}

function buildTrainingPayload({ approval, readinessPackage }) {
  return {
    approvalId: approval.id,
    baseModelId: approval.baseModelId,
    dataset: {
      datasetHash: readinessPackage.dataset.datasetHash,
      readinessHash: readinessPackage.readinessHash,
      train: readinessPackage.exports.train,
      validation: readinessPackage.exports.validation,
    },
    executionKind: approval.executionKind,
    schemaVersion: LOCAL_TRAINING_PROTOCOL_VERSION,
    trainerId: approval.trainerId,
  };
}

function runLocalCommand({
  args,
  command,
  cwd,
  environment,
  maxOutputBytes,
  payload,
  spawnProcess,
  timeoutMs,
}) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args, {
      cwd,
      env: environment,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let settled = false;
    let stderrBytes = 0;
    let stdout = '';

    function finish(error, result) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }

    function appendOutput(current, chunk, streamName) {
      const next = current + String(chunk);
      if (Buffer.byteLength(next, 'utf8') > maxOutputBytes) {
        child.kill('SIGKILL');
        finish(new Error(`Local training ${streamName} exceeds ${maxOutputBytes} bytes.`));
        return current;
      }
      return next;
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`Local training command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.on('error', (error) => {
      const message = error?.code === 'ENOENT'
        ? 'Local training command not found.'
        : 'Local training command failed to start.';
      finish(new Error(message));
    });
    child.stdout.on('data', (chunk) => {
      stdout = appendOutput(stdout, chunk, 'stdout');
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes += Buffer.byteLength(chunk);
      if (stderrBytes > maxOutputBytes) {
        child.kill('SIGKILL');
        finish(new Error(`Local training stderr exceeds ${maxOutputBytes} bytes.`));
      }
    });
    child.on('close', (exitCode) => {
      if (settled) {
        return;
      }
      if (exitCode !== 0) {
        finish(new Error(`Local training command exited with code ${exitCode}.`));
        return;
      }
      try {
        finish(null, JSON.parse(stdout));
      } catch {
        finish(new Error('Local training command returned invalid JSON.'));
      }
    });
    child.stdin.on('error', () => {
      finish(new Error('Local training command stdin failed.'));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function validateTrainingResult(result, { approval, readinessPackage }) {
  const allowedResultKeys = [
    'baseModelId',
    'candidate',
    'datasetHash',
    'executionKind',
    'readinessHash',
    'schemaVersion',
    'status',
    'trainerReportedActualModelTrainingExecuted',
    'trainerId',
    'trainSha256',
    'validationSha256',
  ];
  if (!hasOnlyKeys(result, allowedResultKeys)) {
    throw new Error('Local training result contains unsupported fields.');
  }
  if (!hasOnlyKeys(result?.candidate, ['artifactFormat', 'artifactSha256', 'modelId'])) {
    throw new Error('Local training candidate result contains unsupported fields.');
  }

  const expectedActualTraining = approval.executionKind === 'local-model-training';
  if (
    result?.schemaVersion !== LOCAL_TRAINING_PROTOCOL_VERSION ||
    result?.status !== 'completed' ||
    result?.trainerId !== approval.trainerId ||
    result?.executionKind !== approval.executionKind ||
    result?.trainerReportedActualModelTrainingExecuted !== expectedActualTraining ||
    result?.baseModelId !== approval.baseModelId ||
    result?.readinessHash !== readinessPackage.readinessHash ||
    result?.datasetHash !== readinessPackage.dataset.datasetHash ||
    result?.trainSha256 !== readinessPackage.exportDigests.train ||
    result?.validationSha256 !== readinessPackage.exportDigests.validation
  ) {
    throw new Error('Local training result does not match the approved execution request.');
  }

  let modelId;
  let artifactFormat;
  try {
    modelId = requireMetadataText(result?.candidate?.modelId, 'candidate modelId');
    artifactFormat = requireMetadataText(
      result?.candidate?.artifactFormat,
      'candidate artifactFormat',
    );
  } catch {
    throw new Error('Local training result requires content-free candidate artifact metadata.');
  }
  if (!isSha256(result?.candidate?.artifactSha256)) {
    throw new Error('Local training result requires content-free candidate artifact metadata.');
  }
  return {
    artifactFormat,
    artifactSha256: result.candidate.artifactSha256,
    modelId,
  };
}

function buildRunRecord({
  approval,
  candidate,
  completedAt,
  security,
  startedAt,
  trainerReportedActualModelTrainingExecuted,
}) {
  const record = {
    actualModelTrainingExecuted: false,
    approval: {
      approvalHash: approval.approvalHash,
      id: approval.id,
    },
    candidate,
    completedAt,
    dataset: {
      datasetHash: approval.datasetHash,
      exportDigests: approval.exportDigests,
      readinessHash: approval.readinessHash,
    },
    execution: {
      kind: approval.executionKind,
      protocolVersion: LOCAL_TRAINING_PROTOCOL_VERSION,
      trainerId: approval.trainerId,
    },
    externalProviderCalls:
      approval.executionKind === 'fixture-simulated' ? 'none' : 'not-observed-by-runtime',
    externalSubmissionAuthorized: false,
    localExecutionAuthorized: true,
    productionReadyClaim: false,
    rollback: {
      activationAuthorized: false,
      baseline: 'current-provider-model-prompt-and-rag-path',
      owner: approval.rollbackOwner,
    },
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_RUN_SCHEMA_VERSION,
    security,
    startedAt,
    status: 'completed',
    trainerReportedActualModelTrainingExecuted,
  };
  const runHash = hashRecord(record);
  return {
    ...record,
    id: `local-training-run-${runHash}`,
    runHash,
  };
}

export function createLocalTrainingRuntime({
  args = [],
  clock = () => new Date().toISOString(),
  command,
  cwd = process.cwd(),
  env = process.env,
  maxInputBytes = DEFAULT_MAX_INPUT_BYTES,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  spawnProcess = nodeSpawn,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  trainerId,
} = {}) {
  const normalizedCommand = requireText(command, 'command');
  const normalizedTrainerId = requireMetadataText(trainerId, 'trainerId');
  const normalizedArgs = Array.isArray(args)
    ? args.map((arg, index) => requireProcessArgument(arg, index))
    : [];
  const normalizedMaxInputBytes = requirePositiveInteger(
    maxInputBytes,
    DEFAULT_MAX_INPUT_BYTES,
    'maxInputBytes',
  );
  const normalizedMaxOutputBytes = requirePositiveInteger(
    maxOutputBytes,
    DEFAULT_MAX_OUTPUT_BYTES,
    'maxOutputBytes',
  );
  const normalizedTimeoutMs = requirePositiveInteger(timeoutMs, DEFAULT_TIMEOUT_MS, 'timeoutMs');
  const environment = buildLocalEnvironment(env);
  const security = {
    environmentKeys: Object.keys(environment).sort(),
    environmentPolicy: 'allowlist',
    networkIsolation: 'caller-owned',
    shell: false,
    transport: 'local-process-stdio',
  };

  return {
    protocolVersion: LOCAL_TRAINING_PROTOCOL_VERSION,
    security,
    trainerId: normalizedTrainerId,
    async run({ approval, readinessPackage } = {}) {
      assertFineTuningReadinessPackage(readinessPackage);
      const startedAt = requireTimestamp(clock(), 'startedAt');
      assertLocalTrainingExecutionApproval({
        approval,
        now: startedAt,
        readinessPackage,
        timeoutMs: normalizedTimeoutMs,
        trainerId: normalizedTrainerId,
      });
      const payload = buildTrainingPayload({ approval, readinessPackage });
      const input = JSON.stringify(payload);
      if (Buffer.byteLength(input, 'utf8') > normalizedMaxInputBytes) {
        throw new Error(`Local training input exceeds ${normalizedMaxInputBytes} bytes.`);
      }
      const result = await runLocalCommand({
        args: normalizedArgs,
        command: normalizedCommand,
        cwd,
        environment,
        maxOutputBytes: normalizedMaxOutputBytes,
        payload,
        spawnProcess,
        timeoutMs: normalizedTimeoutMs,
      });
      const candidate = validateTrainingResult(result, { approval, readinessPackage });
      const completedAt = requireTimestamp(clock(), 'completedAt');
      if (Date.parse(completedAt) < Date.parse(startedAt)) {
        throw new Error('Local training completedAt must not precede startedAt.');
      }
      return buildRunRecord({
        approval,
        candidate,
        completedAt,
        security,
        startedAt,
        trainerReportedActualModelTrainingExecuted:
          result.trainerReportedActualModelTrainingExecuted,
      });
    },
  };
}
