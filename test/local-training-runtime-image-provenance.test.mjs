import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalTrainingRuntimeImageProvenanceContract,
  buildLocalTrainingRuntimeImageProvenanceContract,
} from '../src/core/local-training-runtime-image-provenance.mjs';
import {
  parseDyldCacheUuidInventory,
  probeLocalTrainingRuntimeImageProvenance,
  validateRuntimeImageProvenance,
} from '../scripts/probe-local-training-runtime-image-provenance.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashSet(values) {
  return sha256(JSON.stringify([...new Set(values)].sort()));
}

const REGULAR_PATH = '/trusted/runtime/node';
const CACHE_PATH = '/usr/lib/libfixture.dylib';
const REGULAR_REPORT = Object.freeze({
  byteLength: 128,
  dev: '1',
  ino: '2',
  mode: 33_188,
  nlink: 1,
  pathSha256: sha256(REGULAR_PATH),
  sha256: 'a'.repeat(64),
  uid: 501,
});
const CACHE_FILE_REPORT = Object.freeze({
  byteLength: 1_024,
  cdHashFull: 'b'.repeat(64),
  dev: '1',
  ino: '3',
  mode: 33_188,
  nlink: 1,
  pathSha256: 'c'.repeat(64),
  uid: 0,
});
const CACHE_UUID = '12345678-1234-1234-1234-123456789abc';
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
  const cacheInventory = [{
    path: CACHE_PATH,
    pathSha256: sha256(CACHE_PATH),
    uuid: CACHE_UUID,
  }];
  const cacheFiles = [{
    path: '/trusted/cache',
    report: { ...CACHE_FILE_REPORT },
  }];
  const parentRegular = [{
    path: REGULAR_PATH,
    report: { ...REGULAR_REPORT },
  }];
  const pathHashes = [sha256(REGULAR_PATH), sha256(CACHE_PATH)].sort();
  return {
    cacheArchitecture: 'arm64e',
    cacheFilesAfter: structuredClone(cacheFiles),
    cacheFilesBefore: structuredClone(cacheFiles),
    cacheInventoryAfter: structuredClone(cacheInventory),
    cacheInventoryBefore: structuredClone(cacheInventory),
    childReport: {
      runtimeImages: {
        allAbsolute: true,
        count: 2,
        pathHashes,
        regularImages: [{ ...REGULAR_REPORT }],
        setSha256: hashSet([REGULAR_PATH, CACHE_PATH]),
        sharedCachePathHashes: [sha256(CACHE_PATH)],
        unique: true,
      },
      schemaVersion:
        'personal-ai-agent-local-training-runtime-image-provenance-child/v1',
    },
    parentRegularAfter: structuredClone(parentRegular),
    parentRegularBefore: structuredClone(parentRegular),
    run: { status: LIMIT_STATUS },
    vmmapOutput: `${REGULAR_PATH}\n${CACHE_PATH}\n`,
  };
}

test('runtime image provenance contract is deterministic and non-authorizing', () => {
  const contract = buildLocalTrainingRuntimeImageProvenanceContract();

  assert.deepEqual(
    buildLocalTrainingRuntimeImageProvenanceContract(),
    contract,
  );
  assert.equal(
    assertLocalTrainingRuntimeImageProvenanceContract(contract),
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
    () => assertLocalTrainingRuntimeImageProvenanceContract({
      ...contract,
      contractHash: '0'.repeat(64),
    }),
    /contract failed: integrity/u,
  );
});

test('runtime image provenance binds regular bytes and shared-cache UUIDs', () => {
  const observation = validateRuntimeImageProvenance(
    buildValidationInput(),
  );

  assert.equal(observation.childRuntimeImageCount, 2);
  assert.equal(observation.crossProcessMatchedImageCount, 2);
  assert.equal(observation.regularRuntimeImageCount, 1);
  assert.equal(observation.sharedCacheImageCount, 1);
  assert.equal(observation.sharedCacheUuidCount, 1);
  assert.equal(observation.unmatchedRuntimeImageCount, 0);
  assert.equal(observation.wrapperLimitsValidated, true);
});

test('runtime image provenance rejects observer and cache drift', () => {
  const missingVmmapImage = buildValidationInput();
  missingVmmapImage.vmmapOutput = REGULAR_PATH;
  assert.throws(
    () => validateRuntimeImageProvenance(missingVmmapImage),
    /cross-process observation failed/u,
  );

  const changedCache = buildValidationInput();
  changedCache.cacheInventoryAfter[0].uuid =
    '87654321-4321-4321-4321-cba987654321';
  assert.throws(
    () => validateRuntimeImageProvenance(changedCache),
    /changed during observation/u,
  );

  const changedRegularBytes = buildValidationInput();
  changedRegularBytes.childReport.runtimeImages
    .regularImages[0].sha256 = 'd'.repeat(64);
  assert.throws(
    () => validateRuntimeImageProvenance(changedRegularBytes),
    /regular image mismatch/u,
  );
});

test('dyld cache parser keeps only the selected architecture', () => {
  const inventory = parseDyldCacheUuidInventory(`
${CACHE_PATH} [arm64e]:
    -uuid:
        12345678-1234-1234-1234-123456789ABC
${CACHE_PATH} [x86_64]:
    -uuid:
        87654321-4321-4321-4321-CBA987654321
`, 'arm64e');

  assert.deepEqual(inventory, [{
    path: CACHE_PATH,
    pathSha256: sha256(CACHE_PATH),
    uuid: CACHE_UUID,
  }]);
});

test('runtime image provenance refuses unsupported platforms before spawn', async () => {
  await assert.rejects(
    () => probeLocalTrainingRuntimeImageProvenance({
      platform: 'linux',
    }),
    /requires Darwin/u,
  );
});
