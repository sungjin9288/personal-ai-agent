import { createHash } from 'node:crypto';

import { APPROVED_TRAINING_RECORD_SCHEMA_VERSION } from './approved-training-record.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
  inspectSanitizedTrainingExample,
} from './training-content-safety.mjs';

export const TRAINING_DATASET_MANIFEST_SCHEMA_VERSION =
  'personal-ai-agent-training-dataset-manifest/v1';

const NEAR_DUPLICATE_THRESHOLD = 0.85;
const VALIDATION_RATIO = 0.2;

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

function isValidTimestamp(value) {
  return Number.isFinite(Date.parse(normalizeText(value)));
}

function normalizeComparableText(value) {
  return normalizeText(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function responseSimilarity(left, right) {
  const leftText = normalizeComparableText(left);
  const rightText = normalizeComparableText(right);
  if (!leftText || !rightText) {
    return 0;
  }
  if (leftText === rightText) {
    return 1;
  }

  const leftTokens = new Set(leftText.split(' '));
  const rightTokens = new Set(rightText.split(' '));
  if (Math.min(leftTokens.size, rightTokens.size) < 5) {
    return 0;
  }

  const intersectionSize = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

function expectedLineage(record) {
  return {
    candidateArtifactId: record?.lineage?.candidateArtifactId,
    candidateId: record?.lineage?.candidateId,
    missionId: record?.lineage?.missionId,
    reviewerArtifactId: record?.lineage?.reviewerArtifactId,
    sessionId: record?.lineage?.sessionId,
    sourceArtifactId: record?.lineage?.sourceArtifactId,
    workspaceId: record?.lineage?.workspaceId,
  };
}

function validateAcceptedRisk(record, errors) {
  const risk = record?.acceptedRisk;
  if (risk === null) {
    return;
  }
  if (!risk || typeof risk !== 'object') {
    errors.push('accepted-risk-shape');
    return;
  }

  const safetyText = [risk.id, risk.approvedBy, risk.note].join(' ');
  if (
    !normalizeText(risk.id) ||
    risk.resolutionKind !== 'accepted-risk' ||
    !normalizeText(risk.approvedBy) ||
    !isValidTimestamp(risk.approvedAt) ||
    !isValidTimestamp(risk.expiresAt) ||
    Date.parse(risk.approvedAt) > Date.parse(record.createdAt) ||
    Date.parse(risk.expiresAt) <= Date.parse(record.createdAt) ||
    risk.scope !== 'mission' ||
    risk.scopeId !== record?.scope?.id ||
    !normalizeText(risk.note) ||
    containsTrainingSecret(safetyText) ||
    containsRawCustomerPayload(safetyText)
  ) {
    errors.push('accepted-risk-governance');
  }
}

function assertApprovedRecord(record) {
  const errors = [];
  const inspectedExample = inspectSanitizedTrainingExample(record?.example);
  const lineage = expectedLineage(record);
  const expectedContentHash = hashRecord({
    instruction: inspectedExample.instruction,
    response: inspectedExample.response,
  });
  const expectedLineageHash = hashRecord(lineage);
  const expectedId = `trainingrecord-${hashRecord([
    lineage.candidateId,
    expectedContentHash,
    expectedLineageHash,
  ])}`;

  if (record?.schemaVersion !== APPROVED_TRAINING_RECORD_SCHEMA_VERSION) {
    errors.push('schema-version');
  }
  if (record?.status !== 'approved-for-local-dataset-build') {
    errors.push('approval-status');
  }
  if (!isValidTimestamp(record?.createdAt)) {
    errors.push('created-at');
  }
  if (!inspectedExample.instruction || !inspectedExample.response) {
    errors.push('example-present');
  }
  if (!inspectedExample.noRawSecrets) {
    errors.push('no-raw-secrets');
  }
  if (!inspectedExample.noRawCustomerPayloads) {
    errors.push('no-raw-customer-payloads');
  }
  if (!isSha256(record?.contentHash) || record.contentHash !== expectedContentHash) {
    errors.push('content-hash');
  }
  if (!isSha256(record?.lineageHash) || record.lineageHash !== expectedLineageHash) {
    errors.push('lineage-hash');
  }
  if (record?.id !== expectedId) {
    errors.push('record-id');
  }
  if (
    record?.scope?.type !== 'mission' ||
    record.scope.id !== lineage.missionId ||
    record.scope.workspaceId !== lineage.workspaceId
  ) {
    errors.push('scope-lineage');
  }
  if (
    !Object.values(lineage).every((value) => normalizeText(value)) ||
    record?.approval?.decision !== 'approve' ||
    record.approval.decidedBy !== 'local-operator' ||
    record.approval.scope !== 'mission' ||
    record.approval.scopeId !== lineage.missionId ||
    record?.reviewer?.verdict !== 'pass' ||
    record?.promotionVerification?.status !== 'passed'
  ) {
    errors.push('approval-lineage');
  }
  if (
    record?.safety?.scopeLocked !== true ||
    record.safety.noRawSecrets !== true ||
    record.safety.noRawCustomerPayloads !== true ||
    !Array.isArray(record.safety.checks) ||
    record.safety.checks.length === 0 ||
    record.safety.checks.some((check) => check?.passed !== true || check?.status !== 'passed')
  ) {
    errors.push('safety-gate');
  }
  if (
    record?.externalSubmissionAuthorized !== false ||
    record?.fineTuningExecutionAuthorized !== false ||
    record?.productionReadyClaim !== false
  ) {
    errors.push('local-only-boundary');
  }
  validateAcceptedRisk(record, errors);

  if (errors.length > 0) {
    throw new Error(
      `Training dataset record ${normalizeText(record?.id, '<unknown>')} failed: ${[
        ...new Set(errors),
      ].join(', ')}.`,
    );
  }
}

function summarizeRecord(record) {
  return {
    contentHash: record.contentHash,
    id: record.id,
    lineage: expectedLineage(record),
    lineageHash: record.lineageHash,
    recordType: record.recordType,
    scope: {
      id: record.scope.id,
      type: record.scope.type,
      workspaceId: record.scope.workspaceId,
    },
  };
}

function findExactDuplicate(record, acceptedRecords) {
  const sameRecord = acceptedRecords.find((accepted) => accepted.id === record.id);
  if (sameRecord) {
    return { kept: sameRecord, reason: 'exact-record', similarity: 1 };
  }

  const sameLineage = acceptedRecords.find(
    (accepted) => accepted.lineageHash === record.lineageHash,
  );
  if (sameLineage) {
    if (sameLineage.contentHash !== record.contentHash) {
      throw new Error(
        `Training dataset lineage conflict: ${record.id} and ${sameLineage.id} share lineage with different content.`,
      );
    }
    return { kept: sameLineage, reason: 'exact-lineage', similarity: 1 };
  }

  const sameContent = acceptedRecords.find(
    (accepted) => accepted.contentHash === record.contentHash,
  );
  if (sameContent) {
    return { kept: sameContent, reason: 'exact-content', similarity: 1 };
  }

  return null;
}

function deduplicateRecords(records) {
  const exactUniqueRecords = [];
  const excludedRecords = [];
  const sortedRecords = [...records].sort((left, right) => left.id.localeCompare(right.id));

  for (const record of sortedRecords) {
    const duplicate = findExactDuplicate(record, exactUniqueRecords);
    if (!duplicate) {
      exactUniqueRecords.push(record);
      continue;
    }
    excludedRecords.push({
      contentHash: record.contentHash,
      id: record.id,
      keptRecordId: duplicate.kept.id,
      reason: duplicate.reason,
      similarity: Number(duplicate.similarity.toFixed(6)),
    });
  }

  const acceptedRecords = [];
  for (const record of exactUniqueRecords) {
    const kept = acceptedRecords.find(
      (accepted) =>
        responseSimilarity(record.example.response, accepted.example.response) >=
        NEAR_DUPLICATE_THRESHOLD,
    );
    if (!kept) {
      acceptedRecords.push(record);
      continue;
    }
    excludedRecords.push({
      contentHash: record.contentHash,
      id: record.id,
      keptRecordId: kept.id,
      reason: 'near-response',
      similarity: Number(
        responseSimilarity(record.example.response, kept.example.response).toFixed(6),
      ),
    });
  }
  excludedRecords.sort((left, right) => left.id.localeCompare(right.id));
  return { acceptedRecords, excludedRecords };
}

function buildMissionGroups(records) {
  const groupMap = new Map();
  for (const record of records) {
    const key = `${record.scope.workspaceId}/${record.scope.id}`;
    const group = groupMap.get(key) || { key, records: [] };
    group.records.push(record);
    groupMap.set(key, group);
  }
  return [...groupMap.values()];
}

function splitRecords(records, seed) {
  const groups = buildMissionGroups(records).sort((left, right) => {
    const leftRank = hashRecord([seed, left.key]);
    const rightRank = hashRecord([seed, right.key]);
    return leftRank.localeCompare(rightRank) || left.key.localeCompare(right.key);
  });
  if (groups.length < 2) {
    throw new Error(
      'Training dataset quality gate requires at least two unique mission scopes after deduplication.',
    );
  }

  const validationTarget = Math.max(1, Math.round(records.length * VALIDATION_RATIO));
  const validationGroups = [];
  let validationCount = 0;
  for (let index = 0; index < groups.length - 1 && validationCount < validationTarget; index += 1) {
    validationGroups.push(groups[index]);
    validationCount += groups[index].records.length;
  }
  const validationKeys = new Set(validationGroups.map((group) => group.key));
  const validation = groups
    .filter((group) => validationKeys.has(group.key))
    .flatMap((group) => group.records)
    .sort((left, right) => left.id.localeCompare(right.id));
  const train = groups
    .filter((group) => !validationKeys.has(group.key))
    .flatMap((group) => group.records)
    .sort((left, right) => left.id.localeCompare(right.id));

  return { groups, train, validation };
}

function overlap(left, right, select) {
  const leftValues = new Set(left.map(select));
  return [...new Set(right.map(select).filter((item) => leftValues.has(item)))].sort();
}

function buildLeakageChecks(train, validation) {
  let maximumResponseSimilarity = 0;
  for (const trainRecord of train) {
    for (const validationRecord of validation) {
      maximumResponseSimilarity = Math.max(
        maximumResponseSimilarity,
        responseSimilarity(trainRecord.example.response, validationRecord.example.response),
      );
    }
  }

  const recordIdOverlap = overlap(train, validation, (record) => record.id);
  const contentHashOverlap = overlap(train, validation, (record) => record.contentHash);
  const lineageHashOverlap = overlap(train, validation, (record) => record.lineageHash);
  const missionScopeOverlap = overlap(
    train,
    validation,
    (record) => `${record.scope.workspaceId}/${record.scope.id}`,
  );
  return [
    { id: 'train-present', passed: train.length > 0 },
    { id: 'validation-present', passed: validation.length > 0 },
    { id: 'record-id-separated', overlap: recordIdOverlap, passed: recordIdOverlap.length === 0 },
    {
      id: 'content-hash-separated',
      overlap: contentHashOverlap,
      passed: contentHashOverlap.length === 0,
    },
    {
      id: 'lineage-hash-separated',
      overlap: lineageHashOverlap,
      passed: lineageHashOverlap.length === 0,
    },
    {
      id: 'mission-scope-separated',
      overlap: missionScopeOverlap,
      passed: missionScopeOverlap.length === 0,
    },
    {
      id: 'near-response-separated',
      maximumSimilarity: Number(maximumResponseSimilarity.toFixed(6)),
      passed: maximumResponseSimilarity < NEAR_DUPLICATE_THRESHOLD,
      threshold: NEAR_DUPLICATE_THRESHOLD,
    },
  ].map((check) => ({ ...check, status: check.passed ? 'passed' : 'failed' }));
}

export function buildTrainingDatasetManifest({ records, seed } = {}) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Training dataset quality gate requires approved training records.');
  }
  const normalizedSeed = normalizeText(seed);
  if (!normalizedSeed) {
    throw new Error('Training dataset quality gate requires a non-empty deterministic seed.');
  }
  for (const record of records) {
    assertApprovedRecord(record);
  }

  const { acceptedRecords, excludedRecords } = deduplicateRecords(records);
  const { groups, train, validation } = splitRecords(acceptedRecords, normalizedSeed);
  const leakageChecks = buildLeakageChecks(train, validation);
  const failedChecks = leakageChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    throw new Error(
      `Training dataset leakage gate failed: ${failedChecks.map((check) => check.id).join(', ')}.`,
    );
  }

  const trainRecords = train.map(summarizeRecord);
  const validationRecords = validation.map(summarizeRecord);
  const datasetHash = hashRecord({ train: trainRecords, validation: validationRecords });
  const manifest = {
    counts: {
      accepted: acceptedRecords.length,
      excludedDuplicates: excludedRecords.length,
      missionScopes: groups.length,
      source: records.length,
      train: train.length,
      validation: validation.length,
    },
    datasetHash,
    deduplication: {
      excludedRecords,
      nearDuplicateThreshold: NEAR_DUPLICATE_THRESHOLD,
      strategy: 'content-lineage-response-v1',
    },
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    leakageGate: {
      checkCounts: { failed: 0, passed: leakageChecks.length },
      checks: leakageChecks,
      status: 'passed',
    },
    productionReadyClaim: false,
    schemaVersion: TRAINING_DATASET_MANIFEST_SCHEMA_VERSION,
    seed: normalizedSeed,
    splitPolicy: {
      scopeUnit: 'mission',
      strategy: 'seeded-mission-scope-v1',
      validationRatio: VALIDATION_RATIO,
    },
    splits: {
      train: trainRecords,
      validation: validationRecords,
    },
    status: 'approved-for-local-export-review',
  };
  const manifestHash = hashRecord(manifest);
  return {
    ...manifest,
    id: `datasetmanifest-${manifestHash}`,
    manifestHash,
  };
}
