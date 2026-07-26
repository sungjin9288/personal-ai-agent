import { createHash } from 'node:crypto';

import { ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION } from './answer-quality-evaluation.mjs';
import {
  assertApprovedTrainingRecordForDataset,
  assertTrainingDatasetManifest,
  buildTrainingDatasetManifest,
  summarizeTrainingDatasetRecord,
} from './training-dataset-quality.mjs';
import { inspectSanitizedTrainingExample } from './training-content-safety.mjs';

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

export function summarizeAnswerQualityEvaluationForReview(evaluation) {
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
  const baseline = summarizeAnswerQualityEvaluationForReview(baselineEvaluation);
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

function parseAndValidateExport(exportFile, split) {
  const errors = [];
  const content = String(exportFile?.content || '');
  let examples = [];
  try {
    examples = content
      .trimEnd()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    errors.push(`${split}-jsonl`);
  }
  if (
    exportFile?.split !== split ||
    exportFile?.fileName !== `${split}.jsonl` ||
    exportFile?.schemaVersion !== FINE_TUNING_EXAMPLE_SCHEMA_VERSION ||
    exportFile?.lineCount !== examples.length ||
    exportFile?.byteLength !== Buffer.byteLength(content, 'utf8') ||
    exportFile?.sha256 !== hashValue(content) ||
    !content.endsWith('\n')
  ) {
    errors.push(`${split}-export-integrity`);
  }
  if (examples.some((example) => !exportExampleIsValid(example))) {
    errors.push(`${split}-example-shape`);
  }
  return { errors, examples };
}

function exportExampleIsValid(example) {
  const instruction = example?.messages?.[0];
  const response = example?.messages?.[1];
  const safety = inspectSanitizedTrainingExample({
    instruction: instruction?.content,
    response: response?.content,
  });
  return (
    example?.schemaVersion === FINE_TUNING_EXAMPLE_SCHEMA_VERSION &&
    normalizeText(example?.recordId) &&
    isSha256(example?.metadata?.contentHash) &&
    isSha256(example?.metadata?.lineageHash) &&
    typeof example?.metadata?.acceptedRisk === 'boolean' &&
    normalizeText(example?.metadata?.recordType) &&
    example?.metadata?.scope?.type === 'mission' &&
    normalizeText(example?.metadata?.scope?.id) &&
    normalizeText(example?.metadata?.scope?.workspaceId) &&
    Array.isArray(example?.messages) &&
    example.messages.length === 2 &&
    instruction?.role === 'user' &&
    normalizeText(instruction?.content) &&
    response?.role === 'assistant' &&
    normalizeText(response?.content) &&
    safety.noRawSecrets &&
    safety.noRawCustomerPayloads
  );
}

export function assertFineTuningReadinessPackage(readinessPackage) {
  const errors = [];
  const exports = readinessPackage?.exports || {};
  const evaluationManifest = readinessPackage?.evaluationManifest || {};
  const trainValidation = parseAndValidateExport(exports.train, 'train');
  const validationValidation = parseAndValidateExport(exports.validation, 'validation');
  errors.push(...trainValidation.errors, ...validationValidation.errors);

  const allExamples = [...trainValidation.examples, ...validationValidation.examples];
  const duplicateRecordId = allExamples.find(
    (example, index) =>
      allExamples.findIndex((candidate) => candidate.recordId === example.recordId) !== index,
  );
  if (duplicateRecordId) {
    errors.push('export-record-duplicate');
  }
  const duplicateContentOrLineage = allExamples.find(
    (example, index) =>
      allExamples.findIndex(
        (candidate) =>
          candidate.metadata?.contentHash === example.metadata?.contentHash ||
          candidate.metadata?.lineageHash === example.metadata?.lineageHash,
      ) !== index,
  );
  if (duplicateContentOrLineage) {
    errors.push('export-content-lineage-duplicate');
  }
  const trainScopes = new Set(
    trainValidation.examples.map(
      (example) => `${example?.metadata?.scope?.workspaceId}/${example?.metadata?.scope?.id}`,
    ),
  );
  if (
    validationValidation.examples.some((example) =>
      trainScopes.has(`${example?.metadata?.scope?.workspaceId}/${example?.metadata?.scope?.id}`),
    )
  ) {
    errors.push('export-mission-scope-overlap');
  }

  const { id: evaluationId, manifestHash, ...evaluationContent } = evaluationManifest;
  const expectedEvaluationHash = hashRecord(evaluationContent);
  if (
    evaluationManifest?.schemaVersion !== FINE_TUNING_EVALUATION_MANIFEST_SCHEMA_VERSION ||
    manifestHash !== expectedEvaluationHash ||
    evaluationId !== `fine-tuning-evaluation-${expectedEvaluationHash}`
  ) {
    errors.push('evaluation-manifest-integrity');
  }
  const baseline = evaluationManifest?.answerQualityBaseline || {};
  const { evaluationHash, ...baselineContent } = baseline;
  if (!isSha256(evaluationHash) || evaluationHash !== hashRecord(baselineContent)) {
    errors.push('baseline-integrity');
  }
  if (
    baseline?.schemaVersion !== ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION ||
    baseline?.status !== 'passed' ||
    !Array.isArray(baseline?.caseResults) ||
    baseline.caseResults.length === 0 ||
    baseline.caseResults.some((result) => result?.status !== 'passed') ||
    !baseline?.thresholds ||
    !baseline?.metrics ||
    !baseline?.totals
  ) {
    errors.push('baseline-not-passing');
  }
  if (
    evaluationManifest?.exports?.format !== exports?.format ||
    evaluationManifest?.exports?.providerAdapterRequired !== exports?.providerAdapterRequired ||
    evaluationManifest?.exports?.train?.sha256 !== exports?.train?.sha256 ||
    evaluationManifest?.exports?.train?.lineCount !== exports?.train?.lineCount ||
    evaluationManifest?.exports?.validation?.sha256 !== exports?.validation?.sha256 ||
    evaluationManifest?.exports?.validation?.lineCount !== exports?.validation?.lineCount
  ) {
    errors.push('evaluation-export-binding');
  }
  if (
    evaluationManifest?.review?.status !== 'ready-for-review' ||
    evaluationManifest?.review?.decision !== 'pending' ||
    evaluationManifest?.review?.reviewedAt !== null ||
    evaluationManifest?.review?.reviewedBy !== null ||
    !Array.isArray(evaluationManifest?.review?.checks) ||
    evaluationManifest.review.checks.length !== REQUIRED_REVIEW_CHECKS.length ||
    evaluationManifest.review.checks.some(
      (check) => check?.passed !== true || check?.status !== 'passed',
    ) ||
    !sameStringList(
      evaluationManifest.review.checks.map((check) => check.id),
      REQUIRED_REVIEW_CHECKS,
    ) ||
    evaluationManifest?.rollback?.ownerRequired !== true ||
    evaluationManifest?.rollback?.owner !== null ||
    !normalizeText(evaluationManifest?.rollback?.baseline) ||
    !sameStringList(evaluationManifest?.submissionRequirements, [
      'reviewer-approval',
      'provider-account-approval',
      'model-pin',
      'budget-limit',
      'data-transfer-approval',
      'rollback-owner',
    ])
  ) {
    errors.push('review-boundary');
  }
  if (
    !isSha256(evaluationManifest?.dataset?.datasetHash) ||
    !isSha256(evaluationManifest?.dataset?.manifestHash) ||
    evaluationManifest?.dataset?.acceptedRiskRecordCount !==
      evaluationManifest?.dataset?.acceptedRiskRecordIds?.length ||
    exports?.train?.lineCount + exports?.validation?.lineCount !== allExamples.length
  ) {
    errors.push('dataset-export-summary');
  }

  const {
    evaluationManifest: ignoredEvaluationManifest,
    exports: ignoredExports,
    id: readinessId,
    readinessHash,
    ...readinessContent
  } = readinessPackage || {};
  const expectedReadinessHash = hashRecord(readinessContent);
  if (
    readinessPackage?.schemaVersion !== FINE_TUNING_READINESS_SCHEMA_VERSION ||
    readinessPackage?.status !== 'ready-for-local-review' ||
    readinessHash !== expectedReadinessHash ||
    readinessId !== `fine-tuning-readiness-${expectedReadinessHash}` ||
    readinessPackage?.evaluationManifestHash !== manifestHash ||
    readinessPackage?.exportDigests?.train !== exports?.train?.sha256 ||
    readinessPackage?.exportDigests?.validation !== exports?.validation?.sha256 ||
    JSON.stringify(readinessPackage?.dataset) !== JSON.stringify(evaluationManifest?.dataset)
  ) {
    errors.push('readiness-integrity');
  }
  if (
    exports?.format !== 'provider-neutral-conversation-jsonl-v1' ||
    exports?.providerAdapterRequired !== true ||
    readinessPackage?.externalSubmissionAuthorized !== false ||
    readinessPackage?.fineTuningExecutionAuthorized !== false ||
    readinessPackage?.productionReadyClaim !== false ||
    evaluationManifest?.externalSubmissionAuthorized !== false ||
    evaluationManifest?.fineTuningExecutionAuthorized !== false ||
    evaluationManifest?.productionReadyClaim !== false
  ) {
    errors.push('local-only-boundary');
  }

  if (errors.length > 0) {
    throw new Error(`Fine-tuning readiness package failed: ${[...new Set(errors)].join(', ')}.`);
  }
}

function sameStringList(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    JSON.stringify(left.map((value) => normalizeText(value))) ===
      JSON.stringify(right.map((value) => normalizeText(value)))
  );
}
