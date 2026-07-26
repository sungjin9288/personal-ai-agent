import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertLocalTrainingRuntimeExecObservationContract,
  buildLocalTrainingRuntimeExecObservationContract,
} from '../src/core/local-training-runtime-exec-observation.mjs';
import {
  probeLocalTrainingRuntimeExecObservation,
  validateRuntimeExecChildReport,
} from '../scripts/probe-local-training-runtime-exec-observation.mjs';

const FILE_REPORT = Object.freeze({
  byteLength: 128,
  dev: 1,
  ino: 2,
  mode: 33_188,
  nlink: 1,
  sha256: 'a'.repeat(64),
  uid: 501,
});
const LIMIT_STATUS = JSON.stringify({
  limits: {
    coreDumpBytes: 0,
    cpuSeconds: 1,
    fileSizeBytes: 65_536,
    openFiles: 32,
  },
  status: 'applied',
});

function buildValidationInput() {
  return {
    after: {
      bootstrap: [{ ...FILE_REPORT }],
      entry: { ...FILE_REPORT },
      executable: { ...FILE_REPORT },
    },
    before: {
      bootstrap: [{ ...FILE_REPORT }],
      entry: { ...FILE_REPORT },
      executable: { ...FILE_REPORT },
    },
    report: {
      entry: { ...FILE_REPORT },
      executable: { ...FILE_REPORT },
      moduleLoads: {
        count: 10,
        setSha256: 'b'.repeat(64),
      },
      runtimeImages: {
        allAbsolute: true,
        count: 4,
        regularCount: 1,
        setSha256: 'c'.repeat(64),
        unique: true,
        unresolvedCount: 3,
      },
      schemaVersion:
        'personal-ai-agent-local-training-runtime-exec-child/v1',
    },
    run: {
      outputOverflow: false,
      status: LIMIT_STATUS,
    },
  };
}

test('runtime exec observation contract is deterministic and non-authorizing', () => {
  const contract = buildLocalTrainingRuntimeExecObservationContract();

  assert.deepEqual(
    buildLocalTrainingRuntimeExecObservationContract(),
    contract,
  );
  assert.equal(
    assertLocalTrainingRuntimeExecObservationContract(contract),
    contract,
  );
  assert.equal(contract.dynamicRuntimeClosureComplete, false);
  assert.equal(contract.nativeClosureComplete, false);
  assert.equal(contract.verifyToExecClosed, false);
  assert.equal(contract.actualMlxProcessSpawned, false);
  assert.equal(contract.actualModelTrainingExecuted, false);
  assert.equal(contract.trainingAuthorized, false);
  assert.equal(contract.productionReadyClaim, false);
  assert.throws(
    () => assertLocalTrainingRuntimeExecObservationContract({
      ...contract,
      contractHash: '0'.repeat(64),
    }),
    /contract failed: integrity/u,
  );
});

test('runtime exec observation accepts only matching child and parent identity', () => {
  const observation = validateRuntimeExecChildReport(
    buildValidationInput(),
  );

  assert.equal(observation.entryFileIdentityMatched, true);
  assert.equal(observation.executableFileIdentityMatched, true);
  assert.equal(observation.prePostFileIdentityStable, true);
  assert.equal(observation.runtimeImageCount, 4);
  assert.equal(observation.unresolvedRuntimeImageCount, 3);

  const tampered = buildValidationInput();
  tampered.report.executable.sha256 = 'd'.repeat(64);
  assert.throws(
    () => validateRuntimeExecChildReport(tampered),
    /observation failed: integrity/u,
  );
});

test('runtime exec observation refuses unsupported platforms before spawn', async () => {
  await assert.rejects(
    () => probeLocalTrainingRuntimeExecObservation({
      platform: 'linux',
    }),
    /requires Darwin/u,
  );
});
