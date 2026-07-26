import { createHash } from 'node:crypto';

export const LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_RECEIPT_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-host-restart-receipt-evidence/v1';

const RECEIPT_MODE =
  'local-candidate-evaluation-host-restart-resume';
const RECEIPT_STATUS = 'recovered';
const EVIDENCE_STATUS =
  'actual-host-restart-receipt-recorded';
const REHEARSAL_ID_PATTERN = /^[a-f0-9]{24}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RECEIPT_KEYS = [
  'actualHostRestartObserved',
  'automaticEvaluatorRelaunchPerformed',
  'bootIdentityChangedObserved',
  'externalProviderCalls',
  'mode',
  'priorBootSpawningLeaseRecovered',
  'productionReadyClaim',
  'rehearsalId',
  'resultHash',
  'status',
];

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
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

function requireTimestamp(value) {
  const normalized = String(value || '').trim();
  if (
    !normalized ||
    !Number.isFinite(Date.parse(normalized)) ||
    new Date(normalized).toISOString() !== normalized
  ) {
    throw new Error(
      'Host restart receipt exportedAt must be an ISO timestamp.',
    );
  }
  return normalized;
}

function validatePrivateReceipt(receipt) {
  if (!hasExactKeys(receipt, RECEIPT_KEYS)) {
    throw new Error(
      'Host restart receipt must use the exact public resume contract.',
    );
  }
  if (
    receipt.mode !== RECEIPT_MODE ||
    receipt.status !== RECEIPT_STATUS ||
    receipt.actualHostRestartObserved !== true ||
    receipt.bootIdentityChangedObserved !== true ||
    receipt.priorBootSpawningLeaseRecovered !== true ||
    receipt.automaticEvaluatorRelaunchPerformed !== false ||
    receipt.externalProviderCalls !== 'none' ||
    receipt.productionReadyClaim !== false
  ) {
    throw new Error(
      'Host restart receipt does not prove the required recovery boundary.',
    );
  }
  if (!REHEARSAL_ID_PATTERN.test(receipt.rehearsalId)) {
    throw new Error(
      'Host restart receipt rehearsalId is invalid.',
    );
  }
  if (!SHA256_PATTERN.test(receipt.resultHash)) {
    throw new Error(
      'Host restart receipt resultHash is invalid.',
    );
  }
  return receipt;
}

function buildContent({ exportedAt, receipt } = {}) {
  const validatedReceipt = validatePrivateReceipt(receipt);
  return {
    actualHostRestartReceiptRecorded: true,
    claimBoundary: {
      actualEvaluatorRelaunchPerformed: false,
      actualModelEvaluationExecuted: false,
      actualModelTrainingExecuted: false,
      candidateEvaluationAuthorized: false,
      independentlyReproducibleFromTrackedFiles: false,
      privateReceiptTracked: false,
      privateSourceRequiredForReverification: true,
      productionReadyClaim: false,
      rawBootIdentityTracked: false,
      rolloutAuthorized: false,
      trainingAuthorized: false,
    },
    costFree: true,
    exportedAt: requireTimestamp(exportedAt),
    externalProviderCalls: 'none',
    receipt: {
      actualHostRestartObserved: true,
      bootIdentityChangedObserved: true,
      priorBootSpawningLeaseRecovered: true,
      rehearsalId: validatedReceipt.rehearsalId,
      resultHash: validatedReceipt.resultHash,
      status: RECEIPT_STATUS,
    },
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_RECEIPT_SCHEMA_VERSION,
    source: 'private-owner-only-rehearsal-result',
    status: EVIDENCE_STATUS,
    trackedProjectionContractValidated: true,
  };
}

export function buildLocalCandidateEvaluationHostRestartReceiptEvidence(
  input,
) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id:
      `local-candidate-evaluation-host-restart-receipt-${evidenceHash}`,
  };
}

export function assertLocalCandidateEvaluationHostRestartReceiptEvidence(
  evidence,
) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];

  if (
    evidenceHash !== expectedHash ||
    id !==
      `local-candidate-evaluation-host-restart-receipt-${expectedHash}`
  ) {
    errors.push('integrity');
  }

  try {
    const rebuilt = buildContent({
      exportedAt: evidence?.exportedAt,
      receipt: {
        actualHostRestartObserved:
          evidence?.receipt?.actualHostRestartObserved,
        automaticEvaluatorRelaunchPerformed:
          evidence?.claimBoundary?.actualEvaluatorRelaunchPerformed,
        bootIdentityChangedObserved:
          evidence?.receipt?.bootIdentityChangedObserved,
        externalProviderCalls: evidence?.externalProviderCalls,
        mode: RECEIPT_MODE,
        priorBootSpawningLeaseRecovered:
          evidence?.receipt?.priorBootSpawningLeaseRecovered,
        productionReadyClaim:
          evidence?.claimBoundary?.productionReadyClaim,
        rehearsalId: evidence?.receipt?.rehearsalId,
        resultHash: evidence?.receipt?.resultHash,
        status: evidence?.receipt?.status,
      },
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }

  if (
    evidence?.actualHostRestartReceiptRecorded !== true ||
    evidence?.costFree !== true ||
    evidence?.externalProviderCalls !== 'none' ||
    evidence?.claimBoundary?.actualEvaluatorRelaunchPerformed !== false ||
    evidence?.claimBoundary?.actualModelEvaluationExecuted !== false ||
    evidence?.claimBoundary?.actualModelTrainingExecuted !== false ||
    evidence?.claimBoundary?.candidateEvaluationAuthorized !== false ||
    evidence?.claimBoundary?.independentlyReproducibleFromTrackedFiles !== false ||
    evidence?.claimBoundary?.privateReceiptTracked !== false ||
    evidence?.claimBoundary?.privateSourceRequiredForReverification !== true ||
    evidence?.claimBoundary?.productionReadyClaim !== false ||
    evidence?.claimBoundary?.rawBootIdentityTracked !== false ||
    evidence?.claimBoundary?.rolloutAuthorized !== false ||
    evidence?.claimBoundary?.trainingAuthorized !== false ||
    evidence?.trackedProjectionContractValidated !== true
  ) {
    errors.push('claim-boundary');
  }

  if (errors.length) {
    throw new Error(
      `Host restart receipt evidence failed: ${[
        ...new Set(errors),
      ].join(', ')}.`,
    );
  }
}
