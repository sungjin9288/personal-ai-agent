import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertLocalCandidateEvaluationHostRestartReceiptEvidence,
  buildLocalCandidateEvaluationHostRestartReceiptEvidence,
} from '../src/core/local-candidate-evaluation-host-restart-receipt.mjs';

const EXPORTED_AT = '2026-07-22T01:00:00.000Z';
const RESULT_HASH = 'a'.repeat(64);
const REHEARSAL_ID = '0123456789abcdef01234567';

function actualReceipt(overrides = {}) {
  return {
    actualHostRestartObserved: true,
    automaticEvaluatorRelaunchPerformed: false,
    bootIdentityChangedObserved: true,
    externalProviderCalls: 'none',
    mode:
      'local-candidate-evaluation-host-restart-resume',
    priorBootSpawningLeaseRecovered: true,
    productionReadyClaim: false,
    rehearsalId: REHEARSAL_ID,
    resultHash: RESULT_HASH,
    status: 'recovered',
    ...overrides,
  };
}

function buildEvidence(receipt = actualReceipt()) {
  return buildLocalCandidateEvaluationHostRestartReceiptEvidence({
    exportedAt: EXPORTED_AT,
    receipt,
  });
}

test('builds a content-free receipt from an actual recovered host restart', () => {
  const evidence = buildEvidence();

  assert.doesNotThrow(() =>
    assertLocalCandidateEvaluationHostRestartReceiptEvidence(
      evidence,
    ),
  );
  assert.equal(
    evidence.actualHostRestartReceiptRecorded,
    true,
  );
  assert.equal(
    evidence.trackedProjectionContractValidated,
    true,
  );
  assert.deepEqual(evidence.receipt, {
    actualHostRestartObserved: true,
    bootIdentityChangedObserved: true,
    priorBootSpawningLeaseRecovered: true,
    rehearsalId: REHEARSAL_ID,
    resultHash: RESULT_HASH,
    status: 'recovered',
  });
  assert.deepEqual(evidence.claimBoundary, {
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
  });
});

test('does not serialize private boot, session, recovery, or path fields', () => {
  const serialized = JSON.stringify(buildEvidence());

  for (const forbidden of [
    'preparedBootIdentityHash',
    'resumedBootIdentityHash',
    'sessionHash',
    'recoveryHash',
    'rehearsalDirectory',
    'temporaryDirectory',
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('rejects a receipt that does not prove every recovery condition', () => {
  for (const receipt of [
    actualReceipt({ actualHostRestartObserved: false }),
    actualReceipt({ bootIdentityChangedObserved: false }),
    actualReceipt({ priorBootSpawningLeaseRecovered: false }),
    actualReceipt({ automaticEvaluatorRelaunchPerformed: true }),
    actualReceipt({ externalProviderCalls: 'openai' }),
    actualReceipt({ productionReadyClaim: true }),
  ]) {
    assert.throws(
      () => buildEvidence(receipt),
      /required recovery boundary/u,
    );
  }
});

test('rejects private fields outside the public resume contract', () => {
  assert.throws(
    () =>
      buildEvidence(
        actualReceipt({
          preparedBootIdentityHash: 'b'.repeat(64),
        }),
      ),
    /exact public resume contract/u,
  );
});

test('rejects tampered evidence even when its claim remains plausible', () => {
  const evidence = buildEvidence();
  const tampered = {
    ...evidence,
    receipt: {
      ...evidence.receipt,
      resultHash: 'b'.repeat(64),
    },
  };

  assert.throws(
    () =>
      assertLocalCandidateEvaluationHostRestartReceiptEvidence(
        tampered,
      ),
    /integrity/u,
  );
});
