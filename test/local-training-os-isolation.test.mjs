import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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
const CPU_SCHEDULER_BOUNDARY_MS = 5_050;
const CPU_STARVATION_READY_DEADLINE_MS = 1_000;
const CPU_STARVATION_REAP_DEADLINE_MS = 1_000;
const CPU_STARVATION_WRAPPER = String.raw`
import json
import os
import resource
import signal
import sys

limits = (
    ('coreDumpBytes', resource.RLIMIT_CORE, 0),
    ('cpuSeconds', resource.RLIMIT_CPU, 1),
    ('fileSizeBytes', resource.RLIMIT_FSIZE, 65_536),
    ('openFiles', resource.RLIMIT_NOFILE, 32),
)
applied = {}
for name, kind, value in limits:
    _, hard = resource.getrlimit(kind)
    if hard != resource.RLIM_INFINITY and hard < value:
        raise ValueError('requested limit exceeds current hard limit')
    resource.setrlimit(kind, (value, hard))
    resource.setrlimit(kind, (value, value))
    if resource.getrlimit(kind) != (value, value):
        raise ValueError('limit did not become exact')
    applied[name] = value
payload = json.dumps(
    {'limits': applied, 'status': 'applied'},
    separators=(',', ':'),
    sort_keys=True,
)
os.write(3, f'{payload}\n'.encode('utf-8'))
os.kill(os.getpid(), signal.SIGSTOP)
os.execv(sys.argv[1], [sys.argv[1], *sys.argv[2:]])
`;

function isProcessGroupAlive(processId) {
  try {
    process.kill(-processId, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return false;
    }
    throw error;
  }
}

function createCpuStarvationController({
  readyTimeoutMs = CPU_STARVATION_READY_DEADLINE_MS,
  resumeAfterMs = 0,
  shouldControl = () => true,
  suppressTimeoutKill = false,
  selfStopPythonWrapper = false,
} = {}) {
  let child;
  let fd3;
  let readyTimer;
  let resumeTimer;
  let onClose;
  let onError;
  let onReadyClose;
  let onReadyError;
  let onStatus;
  let readyReject;
  let readyResolve;
  let readySettled = false;
  const ready = new Promise((resolve, reject) => {
    readyReject = reject;
    readyResolve = resolve;
  });
  const state = {
    cleanupComplete: false,
    closeSignal: null,
    directChildClosed: false,
    errorBeforeFd3: false,
    fd3Ready: false,
    closeBeforeFd3: false,
    controlledInvocationCount: 0,
    resumed: false,
    stopped: false,
    timeoutKillAttempted: false,
  };

  function clearTimers() {
    clearTimeout(readyTimer);
    clearTimeout(resumeTimer);
    readyTimer = undefined;
    resumeTimer = undefined;
  }

  function clearReadyWatch() {
    clearTimeout(readyTimer);
    readyTimer = undefined;
    if (onReadyClose) {
      child?.removeListener('close', onReadyClose);
    }
    if (onReadyError) {
      child?.removeListener('error', onReadyError);
    }
    if (onStatus) {
      fd3?.removeListener('data', onStatus);
    }
  }

  function removeListeners() {
    if (onClose) {
      child?.removeListener('close', onClose);
    }
    if (onError) {
      child?.removeListener('error', onError);
    }
    clearReadyWatch();
  }

  function settleReady(error) {
    if (readySettled) {
      return;
    }
    readySettled = true;
    clearReadyWatch();
    if (error) {
      readyReject(error);
      return;
    }
    readyResolve();
  }

  function resumeCpuInvocation() {
    if (child?.pid && child.exitCode === null) {
      child.kill('SIGCONT');
      state.resumed = true;
    }
  }

  function waitForDirectChildClose() {
    if (!child || state.directChildClosed) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const deadline = setTimeout(() => {
        child.removeListener('close', onCloseForReap);
        resolve(false);
      }, CPU_STARVATION_REAP_DEADLINE_MS);
      function onCloseForReap() {
        clearTimeout(deadline);
        resolve(true);
      }
      child.once('close', onCloseForReap);
    });
  }

  function spawnProcess(command, args, options) {
    if (!shouldControl(args)) {
      return spawn(command, args, options);
    }
    state.controlledInvocationCount += 1;
    const pythonIndex = args.indexOf('/usr/bin/python3');
    const separatorIndex = args.lastIndexOf('--');
    const controlledArgs = selfStopPythonWrapper &&
      pythonIndex >= 0 &&
      separatorIndex >= 0
      ? [
        ...args.slice(0, pythonIndex),
        '/usr/bin/python3',
        '-c',
        CPU_STARVATION_WRAPPER,
        ...args.slice(separatorIndex + 1),
      ]
      : args;
    child = spawn(command, controlledArgs, {
      ...options,
      detached: true,
    });
    fd3 = child.stdio[3];
    const originalKill = child.kill.bind(child);
    child.kill = (signal) => {
      if (suppressTimeoutKill && signal === 'SIGKILL' && state.stopped) {
        state.timeoutKillAttempted = true;
        return true;
      }
      return originalKill(signal);
    };
    onError = (error) => {
      if (!state.fd3Ready) {
        state.errorBeforeFd3 = true;
      }
    };
    onReadyError = (error) => {
      settleReady(error);
    };
    onClose = (_exitCode, signal) => {
      state.closeSignal = signal;
      state.directChildClosed = true;
      if (!state.fd3Ready) {
        state.closeBeforeFd3 = true;
      }
    };
    onReadyClose = () => {
      if (!state.fd3Ready) {
        settleReady(new Error('CPU starvation harness closed before fd3.'));
      }
    };
    onStatus = () => {
      if (state.fd3Ready) {
        return;
      }
      state.fd3Ready = true;
      state.stopped = selfStopPythonWrapper;
      clearTimeout(readyTimer);
      readyTimer = undefined;
      if (resumeAfterMs > 0) {
        resumeTimer = setTimeout(() => {
          resumeCpuInvocation();
        }, resumeAfterMs);
      }
      settleReady();
    };
    child.once('error', onError);
    child.once('error', onReadyError);
    child.once('close', onClose);
    child.once('close', onReadyClose);
    fd3?.on('data', onStatus);
    readyTimer = setTimeout(() => {
      settleReady(new Error('CPU starvation harness fd3-ready-timeout.'));
    }, readyTimeoutMs);
    return child;
  }

  async function reap() {
    try {
      settleReady(
        new Error('CPU starvation harness reaped before fd3.'),
      );
      clearTimers();
      if (child?.pid && isProcessGroupAlive(child.pid)) {
        process.kill(-child.pid, 'SIGCONT');
        process.kill(-child.pid, 'SIGKILL');
      }
      const directChildClosed = await waitForDirectChildClose();
      state.cleanupComplete = directChildClosed;
      return {
        ...state,
        directChildClosed,
      };
    } finally {
      clearTimers();
      removeListeners();
    }
  }

  return {
    reap,
    ready,
    spawnProcess,
    state,
  };
}

test('CPU starvation harness rejects before fd3 and always reaps', async () => {
  const scenarios = [
    {
      args: [],
      command: '/definitely-missing/cpu-starvation-harness',
      expected: (state) => state.errorBeforeFd3,
      expectedError: /ENOENT|spawn/u,
      name: 'error-before-fd3',
    },
    {
      args: ['-e', ''],
      command: process.execPath,
      expected: (state) => state.closeBeforeFd3,
      expectedError: /closed before fd3/u,
      name: 'close-before-fd3',
    },
    {
      args: [
        '-e',
        'setInterval(() => {}, 1000);',
      ],
      command: process.execPath,
      expected: (state) => state.fd3Ready === false,
      expectedError: /fd3-ready-timeout/u,
      name: 'fd3-ready-timeout',
      readyTimeoutMs: 50,
    },
  ];

  for (const scenario of scenarios) {
    const controller = createCpuStarvationController({
      readyTimeoutMs: scenario.readyTimeoutMs,
    });
    let cleanup;
    try {
      const rejected = assert.rejects(
        controller.ready,
        scenario.expectedError,
        scenario.name,
      );
      controller.spawnProcess(scenario.command, scenario.args, {
        detached: false,
        stdio: ['ignore', 'ignore', 'ignore', 'pipe'],
      });
      await rejected;
    } finally {
      cleanup = await controller.reap();
    }
    assert.equal(scenario.expected(cleanup), true, scenario.name);
    assert.equal(cleanup.cleanupComplete, true, scenario.name);
    assert.equal(cleanup.directChildClosed, true, scenario.name);
  }
});

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
  assert.equal(invocation.resourceLimits.cpuSeconds, 1);
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
  'Darwin CPU probe survives bounded scheduler starvation',
  { skip: process.platform !== 'darwin', timeout: 15_000 },
  async () => {
    const controller = createCpuStarvationController({
      resumeAfterMs: CPU_SCHEDULER_BOUNDARY_MS,
      shouldControl(args) {
        return args[args.length - 1] === 'cpu';
      },
      suppressTimeoutKill: true,
      selfStopPythonWrapper: true,
    });
    let cleanup;
    let observation;
    try {
      const probe = probeLocalTrainingOsIsolation({
        spawnProcess: controller.spawnProcess,
      });
      [, observation] = await Promise.all([controller.ready, probe]);
    } finally {
      cleanup = await controller.reap();
    }

    assert.equal(observation.cpuLimitEnforced, true);
    assert.equal(controller.state.controlledInvocationCount, 1);
    assert.equal(controller.state.fd3Ready, true);
    assert.equal(controller.state.stopped, true);
    assert.equal(controller.state.resumed, true);
    assert.equal(controller.state.timeoutKillAttempted, false);
    assert.equal(
      ['SIGKILL', 'SIGXCPU'].includes(controller.state.closeSignal),
      true,
    );
    assert.equal(cleanup.cleanupComplete, true);
    assert.equal(cleanup.directChildClosed, true);
  },
);

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
