import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertLocalTrainingOsIsolationContract,
  buildDarwinTrainingIsolationInvocation,
  buildLocalTrainingOsIsolationContract,
  LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS,
} from '../src/core/local-training-os-isolation.mjs';
import {
  probeLocalTrainingOsIsolation,
} from '../scripts/probe-local-training-os-isolation.mjs';

const wrapperPath = path.resolve(
  'fixtures/local-training-posix-limits-wrapper.py',
);

test('local training OS isolation contract is deterministic and non-authorizing', () => {
  const contract = buildLocalTrainingOsIsolationContract();
  assert.deepEqual(buildLocalTrainingOsIsolationContract(), contract);
  assert.equal(assertLocalTrainingOsIsolationContract(contract), contract);
  assert.equal(contract.actualMlxMemoryLimitEnforced, false);
  assert.equal(contract.actualMlxOsIsolationIntegrated, false);
  assert.equal(contract.actualMlxProcessSpawned, false);
  assert.equal(contract.actualModelTrainingExecuted, false);
  assert.equal(contract.trainingAuthorized, false);
  assert.equal(contract.productionReadyClaim, false);
  assert.throws(
    () => assertLocalTrainingOsIsolationContract({
      ...contract,
      contractHash: '0'.repeat(64),
    }),
    /contract failed: integrity/u,
  );
});

test('Darwin isolation invocation is shell-free and fixed to deny-all network', () => {
  const invocation = buildDarwinTrainingIsolationInvocation({
    childArgs: ['fixture.mjs', 'network', '1234'],
    childCommand: process.execPath,
    platform: 'darwin',
    wrapperPath,
  });

  assert.equal(invocation.command, '/usr/bin/sandbox-exec');
  assert.equal(invocation.shell, false);
  assert.equal(invocation.networkPolicy, 'deny-all-network');
  assert.deepEqual(
    invocation.resourceLimits,
    LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS,
  );
  assert.deepEqual(invocation.environment, {
    LANG: 'C',
    LC_ALL: 'C',
  });
  assert.equal(invocation.args.includes('(deny network*)'), false);
  assert.equal(
    invocation.args.some((argument) =>
      argument.includes('(deny network*)')),
    true,
  );
  assert.throws(
    () => buildDarwinTrainingIsolationInvocation({
      childCommand: 'node',
      platform: 'darwin',
      wrapperPath,
    }),
    /childCommand must be an absolute path/u,
  );
  assert.throws(
    () => buildDarwinTrainingIsolationInvocation({
      childCommand: process.execPath,
      platform: 'linux',
      wrapperPath,
    }),
    /requires Darwin/u,
  );
});

test(
  'Darwin fixture proves network and bounded POSIX enforcement without MLX memory claims',
  { skip: process.platform !== 'darwin', timeout: 15_000 },
  async () => {
    const observation = await probeLocalTrainingOsIsolation();

    assert.equal(observation.platform, 'darwin');
    assert.equal(observation.controlNetworkAllowed, true);
    assert.equal(observation.networkDenyEnforced, true);
    assert.equal(observation.cpuLimitEnforced, true);
    assert.equal(observation.fileSizeLimitEnforced, true);
    assert.equal(observation.openFilesLimitEnforced, true);
    assert.equal(observation.coreDumpLimitApplied, true);
    assert.equal(observation.limitStatusValidated, true);
    assert.equal(observation.outputBoundsPreserved, true);
    assert.equal(observation.actualMlxMemoryLimitEnforced, false);
    assert.match(observation.systemToolSetSha256, /^[a-f0-9]{64}$/u);
    assert.match(observation.fixtureSetSha256, /^[a-f0-9]{64}$/u);
  },
);
