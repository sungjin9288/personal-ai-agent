import { createHash } from 'node:crypto';

import { ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION } from './answer-quality-evaluation.mjs';
import {
  assertApprovedTrainingRecordForDataset,
  assertTrainingDatasetManifest,
  buildTrainingDatasetManifest,
  summarizeTrainingDatasetRecord,
} from './training-dataset-quality.mjs';

export const FINE_TUNING_EXAMPLE_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-example/v1';
export const FINE_TUNING_EVALUATION_MANIFEST_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-evaluation-manifest/v1';
export const FINE_TUNING_READINESS_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-readiness/v1';

const REQUIRED_REVIEW_CHECKS = Object.freeze([
  'dataset-integrity-passed',
  'record-set-bound',
  'train-export-verified',
  'validation-export-verified',
  'answer-quality-baseline-passed',
  'accepted-risk-visible',
  'reviewer-decision-required',
  'provider-adapter-required',
  'external-submission-disabled',
  'fine-tuning-execution-disabled',
  'rollback-owner-required',
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

function assertPassingBaseline(evaluation) {
  const errors = [];
  if (evaluation?.schemaVersion !== ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION) {
    errors.push('schema-version');
  }
  if (evaluation?.status !== 'passed' || evaluation?.failures?.length !== 0) {
    errors.push('status');
  }
  if (
    !Number.isInteger(evaluation?.summary?.caseCount) ||
    evaluation.summary.caseCount < 1 ||
    evaluation.summary.passedCaseCount !== evaluation.summary.caseCount ||
    evaluation.summary.failedCaseCount !== 0 ||
    evaluation.summary.reviewerFailureCount !== 0
  ) {
    errors.push('case-summary');
  }
  if (
    !Array.isArray(evaluation?.cases) ||
    evaluation.cases.length !== evaluation?.summary?.caseCount ||
    evaluation.cases.some(
      (result) => result?.status !== 'passed' || result?.evidence?.reviewerVerdict !== 'pass',
    )
  ) {
    errors.push('case-results');
  }
  if (evaluation?.productionReadyClaim !== false) {
    errors.push('production-claim');
  }
  if (errors.length > 0) {
    throw new Error(`Answer quality baseline failed readiness: ${errors.join(', ')}.`);
  }
}

function assertManifestEntryMatchesRecord(entry, record) {
  if (JSON.stringify(entry) !== JSON.stringify(summarizeTrainingDatasetRecord(record))) {
    throw new Error(`Fine-tuning export record ${entry?.id || '<unknown>'} does not match dataset manifest.`);
  }
}

function collectExportRecords(datasetManifest, records) {
  if (!Array.isArray(records) || records.length !== datasetManifest.counts.source) {
    throw new Error('Fine-tuning export requires the complete source record set used by the dataset manifest.');
  }
  for (const record of records) {
    assertApprovedTrainingRecordForDataset(record);
  }
  const rebuiltManifest = buildTrainingDatasetManifest({
    records,
    seed: datasetManifest.seed,
  });
  if (JSON.stringify(rebuiltManifest) !== JSON.stringify(datasetManifest)) {
    throw new Error('Fine-tuning export dataset manifest does not match its complete source record set.');
  }

  const recordsById = new Map(records.map((record) => [record.id, record]));
  const knownRecordIds = new Set([
    ...datasetManifest.splits.train.map((entry) => entry.id),
    ...datasetManifest.splits.validation.map((entry) => entry.id),
    ...datasetManifest.deduplication.excludedRecords.map((entry) => entry.id),
  ]);
  const unknownRecord = records.find((record) => !knownRecordIds.has(record.id));
  if (unknownRecord) {
    throw new Error(`Fine-tuning export received record outside dataset manifest: ${unknownRecord.id}.`);
  }

  function resolveSplit(entries, split) {
    return entries.map((entry) => {
      const record = recordsById.get(entry.id);
      if (!record) {
        throw new Error(`Fine-tuning export is missing ${split} record: ${entry.id}.`);
      }
      assertManifestEntryMatchesRecord(entry, record);
      return record;
    });
  }

  return {
    train: resolveSplit(datasetManifest.splits.train, 'train'),
    validation: resolveSplit(datasetManifest.splits.validation, 'validation'),
  };
}

function buildExample(record) {
  return {
    messages: [
      { content: record.example.instruction, role: 'user' },
      { content: record.example.response, role: 'assistant' },
    ],
    metadata: {
      contentHash: record.contentHash,
      acceptedRisk: Boolean(record.acceptedRisk),
      lineageHash: record.lineageHash,
      recordType: record.recordType,
      scope: {
        id: record.scope.id,
        type: record.scope.type,
        workspaceId: record.scope.workspaceId,
      },
    },
    recordId: record.id,
    schemaVersion: FINE_TUNING_EXAMPLE_SCHEMA_VERSION,
  };
}

function buildJsonlExport(records, split) {
  const examples = records.map(buildExample);
  const content = `${examples.map((example) => JSON.stringify(example)).join('\n')}\n`;
  return {
    byteLength: Buffer.byteLength(content, 'utf8'),
    content,
    fileName: `${split}.jsonl`,
    lineCount: examples.length,
    schemaVersion: FINE_TUNING_EXAMPLE_SCHEMA_VERSION,
    sha256: hashValue(content),
    split,
  };
}

function summarizeBaseline(evaluation) {
  const caseResults = evaluation.cases.map((result) => ({
    id: result.id,
    metrics: result.metrics,
    status: result.status,
  }));
  const summary = {
    caseResults,
    metrics: evaluation.summary.metrics,
    schemaVersion: evaluation.schemaVersion,
    status: evaluation.status,
    thresholds: evaluation.thresholds,
    totals: evaluation.summary.totals,
  };
  return {
    ...summary,
    evaluationHash: hashRecord(summary),
  };
}

function buildReviewChecks(datasetManifest, exports, baseline) {
  const checks = [
    { id: 'dataset-integrity-passed', passed: datasetManifest.leakageGate.status === 'passed' },
    {
      id: 'record-set-bound',
      passed:
        exports.train.lineCount + exports.validation.lineCount === datasetManifest.counts.accepted,
    },
    { id: 'train-export-verified', passed: exports.train.lineCount > 0 && isSha256(exports.train.sha256) },
    {
      id: 'validation-export-verified',
      passed: exports.validation.lineCount > 0 && isSha256(exports.validation.sha256),
    },
    { id: 'answer-quality-baseline-passed', passed: baseline.status === 'passed' },
    { id: 'accepted-risk-visible', passed: true },
    { id: 'reviewer-decision-required', passed: true },
    { id: 'provider-adapter-required', passed: true },
    { id: 'external-submission-disabled', passed: true },
    { id: 'fine-tuning-execution-disabled', passed: true },
    { id: 'rollback-owner-required', passed: true },
  ].map((check) => ({ ...check, status: check.passed ? 'passed' : 'failed' }));
  const ids = checks.map((check) => check.id);
  if (JSON.stringify(ids) !== JSON.stringify(REQUIRED_REVIEW_CHECKS)) {
    throw new Error('Fine-tuning readiness review checks are incomplete.');
  }
  return checks;
}

function summarizeExport(exportFile) {
  return {
    byteLength: exportFile.byteLength,
    fileName: exportFile.fileName,
    lineCount: exportFile.lineCount,
    schemaVersion: exportFile.schemaVersion,
    sha256: exportFile.sha256,
    split: exportFile.split,
  };
}

function buildEvaluationManifest({ baselineEvaluation, datasetManifest, exports, splitRecords }) {
  const baseline = summarizeBaseline(baselineEvaluation);
  const checks = buildReviewChecks(datasetManifest, exports, baseline);
  const acceptedRiskRecordIds = [...splitRecords.train, ...splitRecords.validation]
    .filter((record) => record.acceptedRisk)
    .map((record) => record.id)
    .sort();
  const manifest = {
    answerQualityBaseline: baseline,
    dataset: {
      datasetHash: datasetManifest.datasetHash,
      id: datasetManifest.id,
      manifestHash: datasetManifest.manifestHash,
      schemaVersion: datasetManifest.schemaVersion,
      seed: datasetManifest.seed,
      acceptedRiskRecordCount: acceptedRiskRecordIds.length,
      acceptedRiskRecordIds,
    },
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    exports: {
      format: exports.format,
      providerAdapterRequired: exports.providerAdapterRequired,
      train: summarizeExport(exports.train),
      validation: summarizeExport(exports.validation),
    },
    productionReadyClaim: false,
    review: {
      checkCounts: { failed: 0, passed: checks.length },
      checks,
      decision: 'pending',
      reviewRequired: true,
      reviewedAt: null,
      reviewedBy: null,
      status: 'ready-for-review',
    },
    rollback: {
      baseline: 'current-provider-model-prompt-and-rag-path',
      owner: null,
      ownerRequired: true,
      trigger: 'candidate quality regression, permission failure, or missing evidence',
    },
    schemaVersion: FINE_TUNING_EVALUATION_MANIFEST_SCHEMA_VERSION,
    submissionRequirements: [
      'reviewer-approval',
      'provider-account-approval',
      'model-pin',
      'budget-limit',
      'data-transfer-approval',
      'rollback-owner',
    ],
  };
  const manifestHash = hashRecord(manifest);
  return {
    ...manifest,
    id: `fine-tuning-evaluation-${manifestHash}`,
    manifestHash,
  };
}

export function buildFineTuningReadinessPackage({
  baselineEvaluation,
  datasetManifest,
  records,
} = {}) {
  assertTrainingDatasetManifest(datasetManifest);
  assertPassingBaseline(baselineEvaluation);
  const splitRecords = collectExportRecords(datasetManifest, records);
  const exports = {
    format: 'provider-neutral-conversation-jsonl-v1',
    providerAdapterRequired: true,
    train: buildJsonlExport(splitRecords.train, 'train'),
    validation: buildJsonlExport(splitRecords.validation, 'validation'),
  };
  const evaluationManifest = buildEvaluationManifest({
    baselineEvaluation,
    datasetManifest,
    exports,
    splitRecords,
  });
  const readiness = {
    dataset: evaluationManifest.dataset,
    evaluationManifestHash: evaluationManifest.manifestHash,
    exportDigests: {
      train: exports.train.sha256,
      validation: exports.validation.sha256,
    },
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    productionReadyClaim: false,
    schemaVersion: FINE_TUNING_READINESS_SCHEMA_VERSION,
    status: 'ready-for-local-review',
  };
  const readinessHash = hashRecord(readiness);
  return {
    ...readiness,
    evaluationManifest,
    exports,
    id: `fine-tuning-readiness-${readinessHash}`,
    readinessHash,
  };
}
