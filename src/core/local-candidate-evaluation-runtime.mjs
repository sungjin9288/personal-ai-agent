import { spawn as nodeSpawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION,
} from './answer-quality-evaluation.mjs';
import {
  buildCandidateModelEvidence,
} from './candidate-model-evaluation.mjs';
import {
  summarizeAnswerQualityEvaluationForReview,
} from './fine-tuning-readiness.mjs';
import {
  assertCurrentLocalCandidateEvaluationAdmission,
} from './local-candidate-evaluation-admission.mjs';
import {
  createLocalCandidateEvaluationInputView,
} from './local-candidate-evaluation-input-view.mjs';
import {
  assertLocalCandidateEvaluationWorkspaceRecovery,
} from './local-candidate-evaluation-workspace-recovery.mjs';
import {
  describeLocalCandidateEvaluator,
} from './local-candidate-evaluator-provenance.mjs';
import {
  assertLocalTrainingCandidateArtifactVerification,
  createLocalTrainingCandidateArtifactVerifier,
} from './local-training-candidate-artifact-verification.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION =
  'personal-ai-agent-local-candidate-evaluation/v2';
export const LOCAL_CANDIDATE_EVALUATION_RUN_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-run/v4';

const DEFAULT_MAX_INPUT_BYTES = 1024 * 1024;
const DEFAULT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const EXECUTION_KINDS = new Set([
  'fixture-simulated',
  'local-model-evaluation',
]);
const SAFE_ENV_KEYS = Object.freeze([
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'PATH',
  'TMPDIR',
]);
const COUNT_KEYS = Object.freeze([
  'citedExpectedSourceCount',
  'citedSourceCount',
  'expectedSourceCount',
  'forbiddenRetrievedSourceCount',
  'forbiddenTermMatchCount',
  'groundedCitationCount',
  'requiredTermCount',
  'requiredTermMatchCount',
  'retrievedExpectedSourceCount',
  'retrievedSourceCount',
  'unsupportedCitationCount',
]);
const METRIC_KEYS = Object.freeze([
  'citationGroundingRate',
  'expectedSourceCitationRate',
  'forbiddenRetrievedSourceCount',
  'forbiddenTermMatchCount',
  'requiredTermCoverage',
  'retrievalHitRate',
  'unsupportedCitationRate',
]);
const EVIDENCE_KEYS = Object.freeze([
  'citedSourceKeys',
  'expectedSourceKeys',
  'groundedCitationKeys',
  'matchedForbiddenTerms',
  'matchedForbiddenRetrievedSourceKeys',
  'matchedRequiredTerms',
  'missingExpectedRetrievalSourceKeys',
  'missingRequiredTerms',
  'retrievedSourceKeys',
  'reviewerVerdict',
  'uncitedExpectedSourceKeys',
  'unsupportedCitationKeys',
]);
const THRESHOLD_KEYS = Object.freeze([
  'maximumForbiddenRetrievedSourceCount',
  'maximumForbiddenTermMatches',
  'maximumUnsupportedCitationRate',
  'minimumCasePassRate',
  'minimumCitationGroundingRate',
  'minimumExpectedSourceCitationRate',
  'minimumRequiredTermCoverage',
  'minimumRetrievalHitRate',
  'requireReviewerPass',
]);
const RAW_RESULT_KEYS = new Set([
  'answer',
  'answerText',
  'content',
  'prompt',
  'promptContent',
  'raw',
  'retrievalInput',
  'text',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
}

function hasExactKeys(value, expectedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === expectedKeys.length &&
    Object.keys(value).every((key) => expectedKeys.includes(key)),
  );
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
      `Local candidate evaluation runtime ${fieldName} must be content-free metadata.`,
    );
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local candidate evaluation runtime ${fieldName} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function requirePositiveInteger(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(
      `Local candidate evaluation runtime ${fieldName} must be a positive integer.`,
    );
  }
  return normalized;
}

function requireExecutionKind(value) {
  const normalized = normalizeText(value);
  if (!EXECUTION_KINDS.has(normalized)) {
    throw new Error(
      'Unsupported local candidate evaluation execution kind.',
    );
  }
  return normalized;
}

function requireProcessArgument(value, index) {
  const normalized = String(value);
  if (
    normalized.length > 2_048 ||
    /[\r\n\0]/u.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(
      `Local candidate evaluation runtime argument ${index} must not contain secret or customer data.`,
    );
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

function assertRuntimeAuthority({
  admission,
  candidateArtifactVerification,
  currentPermission,
  evaluationSuiteContent,
  evaluatorId,
  evaluatorProvenance,
  now,
  permissionRevocation,
  readinessPackage,
  request,
  timeoutMs,
}) {
  assertCurrentLocalCandidateEvaluationAdmission({
    admission,
    candidateArtifactVerification,
    currentPermission,
    evaluationSuiteContent,
    now,
    permissionRevocation,
    readinessPackage,
    request,
  });
  if (
    admission.evaluatorId !== evaluatorId ||
    request.evaluatorId !== evaluatorId ||
    JSON.stringify(admission.evaluatorProvenance) !==
      JSON.stringify(evaluatorProvenance) ||
    JSON.stringify(request.evaluatorProvenance) !==
      JSON.stringify(evaluatorProvenance) ||
    admission.evaluationKind !== request.evaluationKind
  ) {
    throw new Error(
      'Local candidate evaluation runtime failed: evaluator-binding.',
    );
  }
  const expiresAtMs = Date.parse(admission.expiresAt);
  const nowMs = Date.parse(now);
  if (
    timeoutMs > admission.resourceLimits.maxRuntimeMs ||
    nowMs + timeoutMs > expiresAtMs
  ) {
    throw new Error(
      'Local candidate evaluation runtime failed: resource-or-time-window.',
    );
  }
}

function assertCandidateReverification({
  admittedVerification,
  reverifiedCandidate,
  request,
  startedAt,
}) {
  assertLocalTrainingCandidateArtifactVerification(
    reverifiedCandidate,
  );
  if (
    reverifiedCandidate.mode !== 'recorded-local-training' ||
    reverifiedCandidate.actualCandidateArtifactsObserved !== true ||
    reverifiedCandidate.independentCandidateArtifactVerificationPassed !==
      true ||
    Date.parse(reverifiedCandidate.observedAt) <
      Date.parse(admittedVerification.observedAt) ||
    Date.parse(reverifiedCandidate.observedAt) >
      Date.parse(startedAt) ||
    reverifiedCandidate.observedDiskBytes >
      request.resourceLimits.maxDiskBytes ||
    JSON.stringify(reverifiedCandidate.candidate) !==
      JSON.stringify(admittedVerification.candidate) ||
    JSON.stringify(reverifiedCandidate.approval) !==
      JSON.stringify(admittedVerification.approval) ||
    JSON.stringify(reverifiedCandidate.run) !==
      JSON.stringify(admittedVerification.run) ||
    JSON.stringify(
      reverifiedCandidate.postAcquisitionReadiness,
    ) !==
      JSON.stringify(
        admittedVerification.postAcquisitionReadiness,
      ) ||
    JSON.stringify(reverifiedCandidate.productPermission) !==
      JSON.stringify(admittedVerification.productPermission) ||
    reverifiedCandidate.candidate.artifactSetSha256 !==
      request.candidate.artifactSetSha256
  ) {
    throw new Error(
      'Local candidate evaluation runtime failed: candidate-reverification.',
    );
  }
}

function buildEvaluationPayload({
  admission,
  candidateArtifactVerification,
  candidateArtifactRoot,
  evaluatorId,
  executionKind,
  request,
}) {
  return {
    admission: {
      admissionHash: admission.admissionHash,
      id: admission.id,
    },
    candidate: {
      artifactFormat: request.candidate.artifactFormat,
      artifactRoot: candidateArtifactRoot,
      artifactSetSha256:
        request.candidate.artifactSetSha256,
      modelId: request.candidate.modelId,
    },
    dataset: request.dataset,
    evaluationSuite: request.evaluationSuite,
    evaluatorId,
    executionKind,
    request: {
      id: request.id,
      requestHash: request.requestHash,
    },
    candidateArtifactVerification: {
      id: candidateArtifactVerification.id,
      verificationHash:
        candidateArtifactVerification.verificationHash,
    },
    resourceLimits: request.resourceLimits,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION,
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

    function appendStdout(chunk) {
      const next = stdout + String(chunk);
      if (Buffer.byteLength(next, 'utf8') > maxOutputBytes) {
        child.kill('SIGKILL');
        finish(
          new Error(
            `Local candidate evaluation runtime stdout exceeds ${maxOutputBytes} bytes.`,
          ),
        );
        return;
      }
      stdout = next;
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(
        new Error(
          `Local candidate evaluation runtime command timed out after ${timeoutMs}ms.`,
        ),
      );
    }, timeoutMs);

    child.on('error', (error) => {
      finish(
        new Error(
          error?.code === 'ENOENT'
            ? 'Local candidate evaluation runtime command not found.'
            : 'Local candidate evaluation runtime command failed to start.',
        ),
      );
    });
    child.stdout.on('data', appendStdout);
    child.stderr.on('data', (chunk) => {
      stderrBytes += Buffer.byteLength(chunk);
      if (stderrBytes > maxOutputBytes) {
        child.kill('SIGKILL');
        finish(
          new Error(
            `Local candidate evaluation runtime stderr exceeds ${maxOutputBytes} bytes.`,
          ),
        );
      }
    });
    child.on('close', (exitCode) => {
      if (settled) {
        return;
      }
      if (exitCode !== 0) {
        finish(
          new Error(
            `Local candidate evaluation runtime command exited with code ${exitCode}.`,
          ),
        );
        return;
      }
      try {
        finish(null, JSON.parse(stdout));
      } catch {
        finish(
          new Error(
            'Local candidate evaluation runtime command returned invalid JSON.',
          ),
        );
      }
    });
    child.stdin.on('error', () => {
      finish(
        new Error(
          'Local candidate evaluation runtime command stdin failed.',
        ),
      );
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function ratio(numerator, denominator) {
  if (!denominator) {
    return null;
  }
  return Number((numerator / denominator).toFixed(4));
}

function sameNumber(left, right) {
  return (
    left === right ||
    (Number.isFinite(left) &&
      Number.isFinite(right) &&
      Math.abs(left - right) < Number.EPSILON)
  );
}

function assertStringList(value, fieldName) {
  if (
    !Array.isArray(value) ||
    value.some((item) => !normalizeText(item)) ||
    new Set(value).size !== value.length
  ) {
    throw new Error(
      `Local candidate evaluation result ${fieldName} is invalid.`,
    );
  }
  value.forEach((item) => requireMetadata(item, fieldName));
}

function assertFailureList(value, fieldName) {
  if (
    !Array.isArray(value) ||
    value.some(
      (failure) => {
        if (
          !failure ||
          typeof failure !== 'object' ||
          Array.isArray(failure) ||
          !normalizeText(failure.check) ||
          Object.keys(failure).some(
            (key) =>
              !['actual', 'check', 'maximum', 'required'].includes(
                key,
              ),
          )
        ) {
          return true;
        }
        requireMetadata(failure.check, `${fieldName} check`);
        const limitKeys = ['maximum', 'required'].filter(
          (key) => Object.hasOwn(failure, key),
        );
        return (
          !Object.hasOwn(failure, 'actual') ||
          limitKeys.length !== 1 ||
          !Number.isFinite(failure.actual) ||
          !Number.isFinite(failure[limitKeys[0]])
        );
      },
    )
  ) {
    throw new Error(
      `Local candidate evaluation result ${fieldName} is invalid.`,
    );
  }
}

function assertNoRawResultFields(value) {
  if (!value || typeof value !== 'object') {
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (RAW_RESULT_KEYS.has(key)) {
      throw new Error(
        'Local candidate evaluation result must not contain raw answer or prompt fields.',
      );
    }
    assertNoRawResultFields(nested);
  }
}

function assertCaseResult(result) {
  if (
    !hasExactKeys(result, [
      'counts',
      'evidence',
      'failures',
      'id',
      'metrics',
      'status',
    ]) ||
    !hasExactKeys(result.counts, COUNT_KEYS) ||
    !hasExactKeys(result.evidence, EVIDENCE_KEYS) ||
    !hasExactKeys(result.metrics, METRIC_KEYS) ||
    !['passed', 'failed'].includes(result.status)
  ) {
    throw new Error(
      'Local candidate evaluation result has an invalid case shape.',
    );
  }
  requireMetadata(result.id, 'case id');
  for (const key of COUNT_KEYS) {
    if (
      !Number.isSafeInteger(result.counts[key]) ||
      result.counts[key] < 0
    ) {
      throw new Error(
        'Local candidate evaluation result has invalid counts.',
      );
    }
  }
  for (const key of EVIDENCE_KEYS.filter(
    (item) => item !== 'reviewerVerdict',
  )) {
    assertStringList(result.evidence[key], `case ${result.id} ${key}`);
  }
  requireMetadata(
    result.evidence.reviewerVerdict,
    `case ${result.id} reviewerVerdict`,
  );
  assertFailureList(result.failures, `case ${result.id} failures`);

  const counts = result.counts;
  const evidence = result.evidence;
  const expectedMetrics = {
    citationGroundingRate: ratio(
      counts.groundedCitationCount,
      counts.citedSourceCount,
    ),
    expectedSourceCitationRate: ratio(
      counts.citedExpectedSourceCount,
      counts.expectedSourceCount,
    ),
    forbiddenRetrievedSourceCount:
      counts.forbiddenRetrievedSourceCount,
    forbiddenTermMatchCount: counts.forbiddenTermMatchCount,
    requiredTermCoverage: ratio(
      counts.requiredTermMatchCount,
      counts.requiredTermCount,
    ),
    retrievalHitRate: ratio(
      counts.retrievedExpectedSourceCount,
      counts.expectedSourceCount,
    ),
    unsupportedCitationRate:
      ratio(
        counts.unsupportedCitationCount,
        counts.citedSourceCount,
      ) ?? 0,
  };
  const evidenceCountsMatch =
    counts.citedSourceCount ===
      evidence.citedSourceKeys.length &&
    counts.expectedSourceCount ===
      evidence.expectedSourceKeys.length &&
    counts.groundedCitationCount ===
      evidence.groundedCitationKeys.length &&
    counts.forbiddenRetrievedSourceCount ===
      evidence.matchedForbiddenRetrievedSourceKeys.length &&
    counts.forbiddenTermMatchCount ===
      evidence.matchedForbiddenTerms.length &&
    counts.requiredTermCount ===
      evidence.matchedRequiredTerms.length +
        evidence.missingRequiredTerms.length &&
    counts.requiredTermMatchCount ===
      evidence.matchedRequiredTerms.length &&
    counts.retrievedSourceCount ===
      evidence.retrievedSourceKeys.length &&
    counts.unsupportedCitationCount ===
      evidence.unsupportedCitationKeys.length;
  if (
    !evidenceCountsMatch ||
    METRIC_KEYS.some(
      (key) =>
        !sameNumber(
          result.metrics[key],
          expectedMetrics[key],
        ),
    ) ||
    (result.status === 'passed' &&
      (result.failures.length > 0 ||
        result.evidence.reviewerVerdict !== 'pass')) ||
    (result.status === 'failed' &&
      result.failures.length === 0 &&
      result.evidence.reviewerVerdict === 'pass')
  ) {
    throw new Error(
      'Local candidate evaluation result has inconsistent case evidence.',
    );
  }
}

function assertEvaluationSummary(evaluation) {
  if (
    !hasExactKeys(evaluation.summary, [
      'caseCount',
      'failedCaseCount',
      'metrics',
      'passedCaseCount',
      'reviewerFailureCount',
      'totals',
    ]) ||
    !hasExactKeys(evaluation.summary.metrics, [
      'casePassRate',
      ...METRIC_KEYS,
    ]) ||
    !hasExactKeys(evaluation.summary.totals, [
      ...COUNT_KEYS,
      'passedCaseCount',
    ])
  ) {
    throw new Error(
      'Local candidate evaluation result has an invalid summary.',
    );
  }
  const totals = Object.fromEntries(
    [...COUNT_KEYS, 'passedCaseCount'].map((key) => [key, 0]),
  );
  for (const result of evaluation.cases) {
    for (const key of COUNT_KEYS) {
      totals[key] += result.counts[key];
    }
    if (result.status === 'passed') {
      totals.passedCaseCount += 1;
    }
  }
  const metrics = {
    casePassRate: ratio(
      totals.passedCaseCount,
      evaluation.cases.length,
    ),
    citationGroundingRate: ratio(
      totals.groundedCitationCount,
      totals.citedSourceCount,
    ),
    expectedSourceCitationRate: ratio(
      totals.citedExpectedSourceCount,
      totals.expectedSourceCount,
    ),
    forbiddenRetrievedSourceCount:
      totals.forbiddenRetrievedSourceCount,
    forbiddenTermMatchCount: totals.forbiddenTermMatchCount,
    requiredTermCoverage: ratio(
      totals.requiredTermMatchCount,
      totals.requiredTermCount,
    ),
    retrievalHitRate: ratio(
      totals.retrievedExpectedSourceCount,
      totals.expectedSourceCount,
    ),
    unsupportedCitationRate:
      ratio(
        totals.unsupportedCitationCount,
        totals.citedSourceCount,
      ) ?? 0,
  };
  const reviewerFailureCount = evaluation.cases.filter(
    (result) => result.evidence.reviewerVerdict !== 'pass',
  ).length;
  if (
    Object.keys(totals).some(
      (key) =>
        evaluation.summary.totals[key] !== totals[key],
    ) ||
    evaluation.summary.caseCount !== evaluation.cases.length ||
    evaluation.summary.passedCaseCount !== totals.passedCaseCount ||
    evaluation.summary.failedCaseCount !==
      evaluation.cases.length - totals.passedCaseCount ||
    evaluation.summary.reviewerFailureCount !==
      reviewerFailureCount ||
    Object.keys(metrics).some(
      (key) =>
        !sameNumber(
          evaluation.summary.metrics[key],
          metrics[key],
        ),
    )
  ) {
    throw new Error(
      'Local candidate evaluation result has inconsistent summary evidence.',
    );
  }
}

function validateEvaluationResult(result, {
  admission,
  candidateArtifactVerification,
  evaluatorId,
  executionKind,
  request,
}) {
  if (
    !hasExactKeys(result, [
      'admissionId',
      'actualModelEvaluated',
      'candidate',
      'candidateArtifactVerificationId',
      'candidateEvaluation',
      'dataset',
      'evaluationSuite',
      'evaluatorId',
      'executionKind',
      'requestId',
      'schemaVersion',
      'status',
    ]) ||
    !hasExactKeys(result.candidate, [
      'artifactSetSha256',
      'modelId',
    ]) ||
    !hasExactKeys(result.dataset, [
      'datasetHash',
      'readinessHash',
    ]) ||
    !hasExactKeys(result.evaluationSuite, [
      'artifact',
      'baselineEvaluationHash',
      'caseIds',
      'thresholdsHash',
    ]) ||
    !hasExactKeys(result.evaluationSuite.artifact, [
      'byteLength',
      'path',
      'schemaVersion',
      'sha256',
    ])
  ) {
    throw new Error(
      'Local candidate evaluation result contains unsupported fields.',
    );
  }
  const expectedActualModelEvaluated =
    executionKind === 'local-model-evaluation';
  if (
    result.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION ||
    result.status !== 'completed' ||
    result.admissionId !== admission.id ||
    result.requestId !== request.id ||
    result.candidateArtifactVerificationId !==
      candidateArtifactVerification.id ||
    result.candidate.artifactSetSha256 !==
      request.candidate.artifactSetSha256 ||
    result.candidate.modelId !== request.candidate.modelId ||
    JSON.stringify(result.dataset) !==
      JSON.stringify(request.dataset) ||
    JSON.stringify(result.evaluationSuite) !==
      JSON.stringify(request.evaluationSuite) ||
    result.evaluatorId !== evaluatorId ||
    result.executionKind !== executionKind ||
    result.actualModelEvaluated !==
      expectedActualModelEvaluated
  ) {
    throw new Error(
      'Local candidate evaluation result does not match the authorized execution.',
    );
  }
  const evaluation = result.candidateEvaluation;
  if (
    !hasExactKeys(evaluation, [
      'cases',
      'failures',
      'productionReadyClaim',
      'schemaVersion',
      'status',
      'summary',
      'thresholds',
    ]) ||
    evaluation.schemaVersion !==
      ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION ||
    !Array.isArray(evaluation.cases) ||
    evaluation.cases.length === 0 ||
    !Array.isArray(evaluation.failures) ||
    !hasExactKeys(evaluation.thresholds, THRESHOLD_KEYS) ||
    evaluation.productionReadyClaim !== false ||
    !['passed', 'failed'].includes(evaluation.status)
  ) {
    throw new Error(
      'Local candidate evaluation result must use the answer quality evaluation contract.',
    );
  }
  assertNoRawResultFields(evaluation);
  evaluation.cases.forEach(assertCaseResult);
  assertFailureList(evaluation.failures, 'suite failures');
  assertEvaluationSummary(evaluation);
  const caseIds = evaluation.cases
    .map((item) => item.id)
    .sort();
  if (
    new Set(caseIds).size !== caseIds.length ||
    JSON.stringify(caseIds) !==
      JSON.stringify(request.evaluationSuite.caseIds) ||
    hashRecord(evaluation.thresholds) !==
      request.evaluationSuite.thresholdsHash ||
    (evaluation.status === 'passed' &&
      evaluation.failures.length > 0) ||
    (evaluation.status === 'failed' &&
      evaluation.failures.length === 0)
  ) {
    throw new Error(
      'Local candidate evaluation result failed: evaluation-suite-binding.',
    );
  }
  return {
    candidateEvaluation: evaluation,
    actualModelEvaluated:
      result.actualModelEvaluated,
  };
}

function buildRunRecord({
  admission,
  candidateArtifactVerification,
  candidateEvaluation,
  candidateSnapshotPostVerification,
  candidateSnapshotPreVerification,
  completedAt,
  currentPermission,
  evaluatorId,
  evaluatorProvenance,
  executionKind,
  request,
  reverifiedCandidate,
  security,
  startedAt,
  workspaceRecovery,
}) {
  const actualModelEvaluated =
    executionKind === 'local-model-evaluation';
  const record = {
    actualModelEvaluated,
    admission: {
      admissionHash: admission.admissionHash,
      id: admission.id,
    },
    candidate: {
      artifactFormat: request.candidate.artifactFormat,
      artifactSetSha256:
        request.candidate.artifactSetSha256,
      modelId: request.candidate.modelId,
    },
    candidateArtifactVerification: {
      id: candidateArtifactVerification.id,
      verificationHash:
        candidateArtifactVerification.verificationHash,
    },
    candidateArtifactReverification: {
      id: reverifiedCandidate.id,
      observedAt: reverifiedCandidate.observedAt,
      verificationHash:
        reverifiedCandidate.verificationHash,
    },
    candidateEvaluationAuthorized: true,
    completedAt,
    dataset: request.dataset,
    evaluation:
      summarizeAnswerQualityEvaluationForReview(
        candidateEvaluation,
      ),
    evaluator: {
      bundleArtifactSetSha256:
        evaluatorProvenance.bundle.artifactSetSha256,
      executableSha256:
        evaluatorProvenance.executable.sha256,
      evaluatorId,
      evaluationSource: actualModelEvaluated
        ? 'recorded-model-evaluation'
        : 'fixture-simulated',
      executionKind,
      protocolVersion:
        LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION,
    },
    externalProviderCalls: actualModelEvaluated
      ? 'not-observed-by-runtime'
      : 'none',
    externalSubmissionAuthorized: false,
    inputSnapshot: {
      candidateArtifactSetSha256:
        request.candidate.artifactSetSha256,
      candidatePostRunVerificationHash:
        candidateSnapshotPostVerification.verificationHash,
      candidatePreRunVerificationHash:
        candidateSnapshotPreVerification.verificationHash,
      cleanup: 'completed',
      suiteByteLength:
        request.evaluationSuite.artifact.byteLength,
      suiteSha256:
        request.evaluationSuite.artifact.sha256,
    },
    localExecutionAuthorized: true,
    productPermission: {
      id: currentPermission.id,
      permissionHash: currentPermission.permissionHash,
    },
    productionReadyClaim: false,
    request: {
      id: request.id,
      requestHash: request.requestHash,
    },
    resourceLimits: request.resourceLimits,
    rollback: {
      activationAuthorized: false,
      baseline: 'current-provider-model-prompt-and-rag-path',
      owner: admission.rollback.owner,
    },
    rolloutAuthorized: false,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_RUN_SCHEMA_VERSION,
    security,
    startedAt,
    status: 'completed',
    trainingAuthorized: false,
    workspaceRecovery: {
      ...workspaceRecovery,
      status: 'completed',
    },
  };
  const runHash = hashRecord(record);
  return {
    ...record,
    id: `local-candidate-evaluation-run-${runHash}`,
    runHash,
  };
}

export function assertLocalCandidateEvaluationRun({
  admission,
  candidateArtifactVerification,
  candidateEvaluation,
  candidateSnapshotPostVerification,
  candidateSnapshotPreVerification,
  currentPermission,
  request,
  run,
} = {}) {
  const { id, runHash, ...record } = run || {};
  const expectedHash = hashRecord(record);
  const actualModelEvaluated =
    record.evaluator?.executionKind ===
    'local-model-evaluation';
  if (
    !hasExactKeys(record, [
      'actualModelEvaluated',
      'admission',
      'candidate',
      'candidateArtifactVerification',
      'candidateArtifactReverification',
      'candidateEvaluationAuthorized',
      'completedAt',
      'dataset',
      'evaluation',
      'evaluator',
      'externalProviderCalls',
      'externalSubmissionAuthorized',
      'inputSnapshot',
      'localExecutionAuthorized',
      'productPermission',
      'productionReadyClaim',
      'request',
      'resourceLimits',
      'rollback',
      'rolloutAuthorized',
      'schemaVersion',
      'security',
      'startedAt',
      'status',
      'trainingAuthorized',
      'workspaceRecovery',
    ]) ||
    !hasExactKeys(record.admission, ['admissionHash', 'id']) ||
    !hasExactKeys(record.candidate, [
      'artifactFormat',
      'artifactSetSha256',
      'modelId',
    ]) ||
    !hasExactKeys(record.candidateArtifactVerification, [
      'id',
      'verificationHash',
    ]) ||
    !hasExactKeys(record.candidateArtifactReverification, [
      'id',
      'observedAt',
      'verificationHash',
    ]) ||
    !hasExactKeys(record.dataset, [
      'datasetHash',
      'readinessHash',
    ]) ||
    !hasExactKeys(record.evaluator, [
      'bundleArtifactSetSha256',
      'executableSha256',
      'evaluatorId',
      'evaluationSource',
      'executionKind',
      'protocolVersion',
    ]) ||
    !hasExactKeys(record.inputSnapshot, [
      'candidateArtifactSetSha256',
      'candidatePostRunVerificationHash',
      'candidatePreRunVerificationHash',
      'cleanup',
      'suiteByteLength',
      'suiteSha256',
    ]) ||
    !hasExactKeys(record.productPermission, [
      'id',
      'permissionHash',
    ]) ||
    !hasExactKeys(record.request, ['id', 'requestHash']) ||
    !hasExactKeys(record.resourceLimits, [
      'maxCpuThreads',
      'maxDiskBytes',
      'maxMemoryBytes',
      'maxRuntimeMs',
    ]) ||
    !hasExactKeys(record.rollback, [
      'activationAuthorized',
      'baseline',
      'owner',
    ]) ||
    !hasExactKeys(record.security, [
      'candidateSnapshot',
      'environmentKeys',
      'environmentPolicy',
      'evaluatorSnapshot',
      'executableVerification',
      'networkIsolation',
      'postExecutionInputVerification',
      'resourceEnforcement',
      'shell',
      'sourceWorkspaceAsCwd',
      'transport',
    ]) ||
    !hasExactKeys(record.workspaceRecovery, [
      'recoveredLeaseIds',
      'recoveryHash',
      'scannedAt',
      'scannedWorkspaceCount',
      'schemaVersion',
      'skippedActiveWorkspaceCount',
      'skippedUnsafeWorkspaceCount',
      'status',
    ]) ||
    runHash !== expectedHash ||
    id !== `local-candidate-evaluation-run-${expectedHash}`
  ) {
    throw new Error(
      'Local candidate evaluation run failed: integrity.',
    );
  }
  const snapshotEvidenceProvided =
    candidateSnapshotPreVerification !== undefined ||
    candidateSnapshotPostVerification !== undefined;
  if (
    snapshotEvidenceProvided &&
    (
      candidateSnapshotPreVerification === undefined ||
      candidateSnapshotPostVerification === undefined
    )
  ) {
    throw new Error(
      'Local candidate evaluation run failed: incomplete-input-snapshot-evidence.',
    );
  }
  if (snapshotEvidenceProvided) {
    assertCandidateReverification({
      admittedVerification: candidateArtifactVerification,
      reverifiedCandidate:
        candidateSnapshotPreVerification,
      request,
      startedAt: record.startedAt,
    });
    assertCandidateReverification({
      admittedVerification:
        candidateSnapshotPreVerification,
      reverifiedCandidate:
        candidateSnapshotPostVerification,
      request,
      startedAt: record.completedAt,
    });
  }
  const expectedPreRunVerificationHash =
    candidateSnapshotPreVerification?.verificationHash ??
    record.inputSnapshot.candidatePreRunVerificationHash;
  const expectedPostRunVerificationHash =
    candidateSnapshotPostVerification?.verificationHash ??
    record.inputSnapshot.candidatePostRunVerificationHash;
  const startedAtMs = Date.parse(record.startedAt);
  const completedAtMs = Date.parse(record.completedAt);
  const {
    status: workspaceRecoveryStatus,
    ...workspaceRecovery
  } = record.workspaceRecovery;
  assertLocalCandidateEvaluationWorkspaceRecovery(
    workspaceRecovery,
  );
  if (
    record.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_RUN_SCHEMA_VERSION ||
    record.status !== 'completed' ||
    record.admission.id !== admission?.id ||
    record.admission.admissionHash !==
      admission?.admissionHash ||
    JSON.stringify(record.candidate) !==
      JSON.stringify(request?.candidate) ||
    record.candidateArtifactVerification.id !==
      candidateArtifactVerification?.id ||
    record.candidateArtifactVerification.verificationHash !==
      candidateArtifactVerification?.verificationHash ||
    JSON.stringify(record.dataset) !==
      JSON.stringify(request?.dataset) ||
    JSON.stringify(record.evaluation) !==
      JSON.stringify(
        summarizeAnswerQualityEvaluationForReview(
          candidateEvaluation,
        ),
      ) ||
    record.candidateEvaluationAuthorized !== true ||
    record.evaluator.evaluatorId !== admission?.evaluatorId ||
    JSON.stringify(admission?.evaluatorProvenance) !==
      JSON.stringify(request?.evaluatorProvenance) ||
    record.evaluator.bundleArtifactSetSha256 !==
      admission?.evaluatorProvenance?.bundle
        ?.artifactSetSha256 ||
    record.evaluator.executableSha256 !==
      admission?.evaluatorProvenance?.executable?.sha256 ||
    !EXECUTION_KINDS.has(record.evaluator.executionKind) ||
    record.evaluator.executionKind !== request?.evaluationKind ||
    record.evaluator.protocolVersion !==
      LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION ||
    record.evaluator.evaluationSource !==
      (actualModelEvaluated
        ? 'recorded-model-evaluation'
        : 'fixture-simulated') ||
    record.actualModelEvaluated !== actualModelEvaluated ||
    record.externalProviderCalls !==
      (actualModelEvaluated
        ? 'not-observed-by-runtime'
        : 'none') ||
    record.externalSubmissionAuthorized !== false ||
    record.inputSnapshot.candidateArtifactSetSha256 !==
      request?.candidate?.artifactSetSha256 ||
    record.inputSnapshot.candidatePreRunVerificationHash !==
      expectedPreRunVerificationHash ||
    record.inputSnapshot.candidatePostRunVerificationHash !==
      expectedPostRunVerificationHash ||
    record.inputSnapshot.cleanup !== 'completed' ||
    !Number.isSafeInteger(
      record.inputSnapshot.suiteByteLength,
    ) ||
    record.inputSnapshot.suiteByteLength <= 0 ||
    record.inputSnapshot.suiteByteLength !==
      request?.evaluationSuite?.artifact?.byteLength ||
    record.inputSnapshot.suiteSha256 !==
      request?.evaluationSuite?.artifact?.sha256 ||
    record.localExecutionAuthorized !== true ||
    record.productPermission.id !== currentPermission?.id ||
    record.productPermission.permissionHash !==
      currentPermission?.permissionHash ||
    record.productionReadyClaim !== false ||
    record.request.id !== request?.id ||
    record.request.requestHash !== request?.requestHash ||
    JSON.stringify(record.resourceLimits) !==
      JSON.stringify(request?.resourceLimits) ||
    record.rollback.activationAuthorized !== false ||
    record.rollback.baseline !==
      'current-provider-model-prompt-and-rag-path' ||
    record.rollback.owner !== admission?.rollback?.owner ||
    record.rolloutAuthorized !== false ||
    record.trainingAuthorized !== false ||
    workspaceRecoveryStatus !== 'completed' ||
    Date.parse(workspaceRecovery.scannedAt) >
      startedAtMs ||
    record.security.candidateSnapshot !==
      'bounded-read-only-temporary-copy' ||
    !Array.isArray(record.security.environmentKeys) ||
    JSON.stringify(record.security.environmentKeys) !==
      JSON.stringify(
        [...new Set(record.security.environmentKeys)].sort(),
      ) ||
    record.security.environmentKeys.some(
      (key) => !SAFE_ENV_KEYS.includes(key),
    ) ||
    record.security.environmentPolicy !== 'allowlist' ||
    record.security.evaluatorSnapshot !==
      'hash-bound-read-only-temporary-copy' ||
    record.security.executableVerification !==
      'sha256-before-and-after' ||
    record.security.networkIsolation !== 'caller-owned' ||
    record.security.postExecutionInputVerification !== true ||
    record.security.resourceEnforcement !==
      'runtime-timeout-io-and-input-view' ||
    record.security.shell !== false ||
    record.security.sourceWorkspaceAsCwd !== false ||
    record.security.transport !== 'local-process-stdio' ||
    !Number.isFinite(startedAtMs) ||
    !Number.isFinite(completedAtMs) ||
    completedAtMs < startedAtMs ||
    completedAtMs > Date.parse(admission?.expiresAt) ||
    !isSha256(
      record.candidateArtifactReverification.verificationHash,
    ) ||
    record.candidateArtifactReverification.id !==
      `local-training-candidate-artifact-verification-${record.candidateArtifactReverification.verificationHash}` ||
    !isSha256(
      record.inputSnapshot.candidateArtifactSetSha256,
    ) ||
    !isSha256(
      record.inputSnapshot.candidatePreRunVerificationHash,
    ) ||
    !isSha256(
      record.inputSnapshot.candidatePostRunVerificationHash,
    ) ||
    !isSha256(record.inputSnapshot.suiteSha256) ||
    !Number.isFinite(
      Date.parse(
        record.candidateArtifactReverification.observedAt,
      ),
    )
  ) {
    throw new Error(
      'Local candidate evaluation run failed: integrity-or-binding.',
    );
  }
  return run;
}

export function createLocalCandidateEvaluationRuntime({
  args = [],
  candidateVerifier,
  clock = () => new Date().toISOString(),
  command,
  env = process.env,
  evaluatorBundle,
  evaluatorId,
  executionKind = 'fixture-simulated',
  fileSystem = fs,
  isProcessAlive,
  maxInputBytes = DEFAULT_MAX_INPUT_BYTES,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  processId = process.pid,
  repoDir,
  spawnProcess = nodeSpawn,
  temporaryDirectory = os.tmpdir(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  verifierFactory =
    createLocalTrainingCandidateArtifactVerifier,
} = {}) {
  const normalizedCommand = requireMetadata(command, 'command');
  const normalizedEvaluatorId = requireMetadata(
    evaluatorId,
    'evaluatorId',
  );
  const normalizedExecutionKind =
    requireExecutionKind(executionKind);
  const normalizedRepoDir = normalizeText(repoDir);
  if (
    !normalizedRepoDir ||
    !candidateVerifier ||
    typeof candidateVerifier.verify !== 'function'
  ) {
    throw new Error(
      'Local candidate evaluation runtime requires repoDir and candidateVerifier.',
    );
  }
  const normalizedArgs = Array.isArray(args)
    ? args.map(requireProcessArgument)
    : [];
  const evaluatorDefinition = {
    ...evaluatorBundle,
    command: normalizedCommand,
    fileSystem,
  };
  const sourceEntryPath = path.resolve(
    evaluatorDefinition.rootDir,
    evaluatorDefinition.entryPath,
  );
  if (
    normalizedArgs.length === 0 ||
    path.resolve(normalizedArgs[0]) !== sourceEntryPath
  ) {
    throw new Error(
      'Local candidate evaluation runtime requires the evaluator entry as its first argument.',
    );
  }
  if (
    normalizedArgs
      .slice(1)
      .some(
        (argument) =>
          path.isAbsolute(argument) ||
          argument.startsWith('file:'),
      )
  ) {
    throw new Error(
      'Local candidate evaluation runtime additional arguments must not reference absolute files.',
    );
  }
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
  const normalizedTimeoutMs = requirePositiveInteger(
    timeoutMs,
    DEFAULT_TIMEOUT_MS,
    'timeoutMs',
  );
  const environment = buildLocalEnvironment(env);
  const security = {
    candidateSnapshot:
      'bounded-read-only-temporary-copy',
    environmentKeys: Object.keys(environment).sort(),
    environmentPolicy: 'allowlist',
    evaluatorSnapshot:
      'hash-bound-read-only-temporary-copy',
    executableVerification:
      'sha256-before-and-after',
    networkIsolation: 'caller-owned',
    postExecutionInputVerification: true,
    resourceEnforcement:
      'runtime-timeout-io-and-input-view',
    shell: false,
    sourceWorkspaceAsCwd: false,
    transport: 'local-process-stdio',
  };

  return {
    evaluatorId: normalizedEvaluatorId,
    executionKind: normalizedExecutionKind,
    protocolVersion:
      LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION,
    security,
    async run({
      admission,
      candidateArtifactVerification,
      candidateVerificationInput,
      currentPermission,
      evaluationSuiteContent,
      permissionRevocation,
      readinessPackage,
      request,
    } = {}) {
      const preflightAt = requireTimestamp(
        clock(),
        'preflightAt',
      );
      assertRuntimeAuthority({
        admission,
        candidateArtifactVerification,
        currentPermission,
        evaluationSuiteContent,
        evaluatorId: normalizedEvaluatorId,
        evaluatorProvenance:
          request?.evaluatorProvenance,
        now: preflightAt,
        permissionRevocation,
        readinessPackage,
        request,
        timeoutMs: normalizedTimeoutMs,
      });
      const evaluatorProvenance =
        describeLocalCandidateEvaluator(
          evaluatorDefinition,
        );
      if (
        JSON.stringify(evaluatorProvenance) !==
          JSON.stringify(request.evaluatorProvenance) ||
        JSON.stringify(evaluatorProvenance) !==
          JSON.stringify(admission.evaluatorProvenance)
      ) {
        throw new Error(
          'Local candidate evaluation runtime failed: evaluator-binding.',
        );
      }
      if (request.evaluationKind !== normalizedExecutionKind) {
        throw new Error(
          'Local candidate evaluation runtime failed: execution-kind-binding.',
        );
      }
      const reverifiedCandidate =
        await candidateVerifier.verify(
          candidateVerificationInput,
        );
      const candidateVerifiedAt = requireTimestamp(
        clock(),
        'candidateVerifiedAt',
      );
      if (
        Date.parse(candidateVerifiedAt) <
        Date.parse(preflightAt)
      ) {
        throw new Error(
          'Local candidate evaluation runtime candidateVerifiedAt must not precede preflightAt.',
        );
      }
      assertRuntimeAuthority({
        admission,
        candidateArtifactVerification,
        currentPermission,
        evaluationSuiteContent,
        evaluatorId: normalizedEvaluatorId,
        evaluatorProvenance,
        now: candidateVerifiedAt,
        permissionRevocation,
        readinessPackage,
        request,
        timeoutMs: normalizedTimeoutMs,
      });
      assertCandidateReverification({
        admittedVerification:
          candidateArtifactVerification,
        reverifiedCandidate,
        request,
        startedAt: candidateVerifiedAt,
      });
      let inputView;
      let candidateSnapshotPreVerification;
      let candidateSnapshotPostVerification;
      let completedAt;
      let startedAt;
      let validated;
      let workspaceRecovery;
      try {
        inputView =
          await createLocalCandidateEvaluationInputView({
            candidateArtifactVerification:
              reverifiedCandidate,
            candidateVerificationInput,
            createdAt: candidateVerifiedAt,
            evaluationSuite: request.evaluationSuite,
            evaluatorDefinition,
            evaluatorProvenance,
            fileSystem,
            isProcessAlive,
            leaseExpiresAt: admission.expiresAt,
            maximumDiskBytes:
              request.resourceLimits.maxDiskBytes,
            processId,
            repoDir: normalizedRepoDir,
            suiteContent: evaluationSuiteContent,
            temporaryDirectory,
            verifierFactory,
          });
        workspaceRecovery = inputView.workspaceRecovery;
        startedAt = requireTimestamp(clock(), 'startedAt');
        assertRuntimeAuthority({
          admission,
          candidateArtifactVerification,
          currentPermission,
          evaluationSuiteContent,
          evaluatorId: normalizedEvaluatorId,
          evaluatorProvenance,
          now: startedAt,
          permissionRevocation,
          readinessPackage,
          request,
          timeoutMs: normalizedTimeoutMs,
        });
        assertCandidateReverification({
          admittedVerification:
            candidateArtifactVerification,
          reverifiedCandidate,
          request,
          startedAt,
        });
        const preRunInputs =
          await inputView.verifyInputs(startedAt);
        candidateSnapshotPreVerification =
          preRunInputs.candidateVerification;
        assertCandidateReverification({
          admittedVerification: reverifiedCandidate,
          reverifiedCandidate:
            candidateSnapshotPreVerification,
          request,
          startedAt,
        });
        const payload = buildEvaluationPayload({
          admission,
          candidateArtifactRoot:
            inputView.candidateArtifactRoot,
          candidateArtifactVerification,
          evaluatorId: normalizedEvaluatorId,
          executionKind: normalizedExecutionKind,
          request,
        });
        const input = JSON.stringify(payload);
        if (
          Buffer.byteLength(input, 'utf8') >
          normalizedMaxInputBytes
        ) {
          throw new Error(
            `Local candidate evaluation runtime input exceeds ${normalizedMaxInputBytes} bytes.`,
          );
        }
        inputView.markSpawning();
        const result = await runLocalCommand({
          args: [
            inputView.evaluatorEntryPath,
            ...normalizedArgs.slice(1),
          ],
          command: normalizedCommand,
          cwd: inputView.rootDir,
          environment,
          maxOutputBytes: normalizedMaxOutputBytes,
          payload,
          spawnProcess,
          timeoutMs: normalizedTimeoutMs,
        });
        const postVerificationAt = requireTimestamp(
          clock(),
          'postVerificationAt',
        );
        assertRuntimeAuthority({
          admission,
          candidateArtifactVerification,
          currentPermission,
          evaluationSuiteContent,
          evaluatorId: normalizedEvaluatorId,
          evaluatorProvenance,
          now: postVerificationAt,
          permissionRevocation,
          readinessPackage,
          request,
          timeoutMs: 1,
        });
        if (
          Date.parse(postVerificationAt) <
          Date.parse(startedAt)
        ) {
          throw new Error(
            'Local candidate evaluation runtime postVerificationAt must not precede startedAt.',
          );
        }
        const postRunInputs =
          await inputView.verifyInputs(postVerificationAt);
        candidateSnapshotPostVerification =
          postRunInputs.candidateVerification;
        assertCandidateReverification({
          admittedVerification:
            candidateSnapshotPreVerification,
          reverifiedCandidate:
            candidateSnapshotPostVerification,
          request,
          startedAt: postVerificationAt,
        });
        validated = validateEvaluationResult(result, {
          admission,
          candidateArtifactVerification,
          evaluatorId: normalizedEvaluatorId,
          executionKind: normalizedExecutionKind,
          request,
        });
        completedAt = requireTimestamp(
          clock(),
          'completedAt',
        );
        assertRuntimeAuthority({
          admission,
          candidateArtifactVerification,
          currentPermission,
          evaluationSuiteContent,
          evaluatorId: normalizedEvaluatorId,
          evaluatorProvenance,
          now: completedAt,
          permissionRevocation,
          readinessPackage,
          request,
          timeoutMs: 1,
        });
        if (
          Date.parse(completedAt) <
          Date.parse(postVerificationAt)
        ) {
          throw new Error(
            'Local candidate evaluation runtime completedAt must not precede postVerificationAt.',
          );
        }
        inputView.cleanup();
        inputView = null;
      } finally {
        inputView?.cleanup();
      }
      const run = buildRunRecord({
        admission,
        candidateArtifactVerification,
        candidateEvaluation:
          validated.candidateEvaluation,
        candidateSnapshotPostVerification,
        candidateSnapshotPreVerification,
        completedAt,
        currentPermission,
        evaluatorId: normalizedEvaluatorId,
        evaluatorProvenance,
        executionKind: normalizedExecutionKind,
        request,
        reverifiedCandidate,
        security,
        startedAt,
        workspaceRecovery,
      });
      assertLocalCandidateEvaluationRun({
        admission,
        candidateArtifactVerification,
        candidateEvaluation:
          validated.candidateEvaluation,
        candidateSnapshotPostVerification,
        candidateSnapshotPreVerification,
        currentPermission,
        request,
        run,
      });
      const candidateEvidence = buildCandidateModelEvidence({
        actualModelEvaluated:
          validated.actualModelEvaluated,
        candidateEvaluation:
          validated.candidateEvaluation,
        candidateId: candidateArtifactVerification.id,
        evaluatedAt: completedAt,
        evaluationRunId: run.id,
        evaluationSource:
          validated.actualModelEvaluated
            ? 'recorded-model-evaluation'
            : 'fixture-simulated',
        evidenceRefs: [run.id],
        modelId: request.candidate.modelId,
        provider: 'local-command',
        readinessPackage,
      });
      return {
        candidateEvaluation:
          validated.candidateEvaluation,
        candidateEvidence,
        run,
      };
    },
  };
}
