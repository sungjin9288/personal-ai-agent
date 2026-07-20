import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  prepareLocalCandidateEvaluationHostRestartRehearsal,
  resumeLocalCandidateEvaluationHostRestartRehearsal,
} from '../scripts/local-candidate-evaluation-host-restart-rehearsal.mjs';
import {
  LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
} from '../src/core/local-candidate-evaluation-workspace-recovery.mjs';

const PREPARED_AT = '2026-07-20T01:00:00.000Z';
const EXPIRES_AT = '2026-07-20T01:05:00.000Z';
const RESUMED_AT = '2026-07-20T01:06:00.000Z';
const REHEARSAL_ID = '0123456789abcdef01234567';

function bootIdentity(value) {
  return {
    available: true,
    identityHash: createHash('sha256')
      .update(value)
      .digest('hex'),
    schemaVersion:
      'personal-ai-agent-local-candidate-evaluation-host-boot-identity/v1',
    source: 'linux-proc-boot-id',
  };
}

function unavailableBootIdentity() {
  return {
    available: false,
    identityHash: null,
    schemaVersion:
      'personal-ai-agent-local-candidate-evaluation-host-boot-identity/v1',
    source: 'unavailable',
  };
}

function createRepo(t) {
  const repoDir = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'personal-ai-agent-host-restart-test-',
    ),
  );
  t.after(() => {
    fs.rmSync(repoDir, {
      force: true,
      recursive: true,
    });
  });
  return repoDir;
}

function rehearsalDirectory(repoDir) {
  return path.join(
    repoDir,
    'var',
    'local-candidate-evaluation',
    'host-restart-rehearsals',
    REHEARSAL_ID,
  );
}

function prepare(repoDir, overrides = {}) {
  return prepareLocalCandidateEvaluationHostRestartRehearsal({
    bootIdentityProvider: () =>
      bootIdentity('prepared-boot'),
    clock: () => PREPARED_AT,
    leaseDurationMs: 5 * 60 * 1_000,
    processId: 51001,
    randomId: () => REHEARSAL_ID,
    repoDir,
    ...overrides,
  });
}

function resume(repoDir, overrides = {}) {
  return resumeLocalCandidateEvaluationHostRestartRehearsal({
    bootIdentityProvider: () =>
      bootIdentity('resumed-boot'),
    clock: () => RESUMED_AT,
    processId: 51002,
    rehearsalId: REHEARSAL_ID,
    repoDir,
    ...overrides,
  });
}

function workspaceDirectory(repoDir) {
  const namespaceDirectory = path.join(
    rehearsalDirectory(repoDir),
    'workspace-root',
    LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
  );
  const workspaceName = fs
    .readdirSync(namespaceDirectory)
    .find((name) => name.startsWith('workspace-'));
  return path.join(namespaceDirectory, workspaceName);
}

test('prepare creates one private spawning rehearsal without rebooting', (t) => {
  const repoDir = createRepo(t);
  const result = prepare(repoDir);
  const stateDirectory = rehearsalDirectory(repoDir);
  const sessionPath = path.join(
    stateDirectory,
    'session.json',
  );
  const session = JSON.parse(
    fs.readFileSync(sessionPath, 'utf8'),
  );
  const lease = JSON.parse(
    fs.readFileSync(
      path.join(
        workspaceDirectory(repoDir),
        '.workspace-lease.json',
      ),
      'utf8',
    ),
  );

  assert.deepEqual(result, {
    actualHostRestartObserved: false,
    automaticRebootPerformed: false,
    externalProviderCalls: 'none',
    leaseExpiresAt: EXPIRES_AT,
    leaseId: session.leaseId,
    mode:
      'local-candidate-evaluation-host-restart-prepare',
    productionReadyClaim: false,
    rehearsalId: REHEARSAL_ID,
    status: 'prepared',
  });
  assert.equal(lease.phase, 'spawning');
  assert.equal(lease.leaseId, session.leaseId);
  assert.equal(
    fs.statSync(stateDirectory).mode & 0o777,
    0o700,
  );
  assert.equal(
    fs.statSync(sessionPath).mode & 0o777,
    0o600,
  );
  assert.equal(
    JSON.stringify(session).includes(
      'prepared-boot',
    ),
    false,
  );
});

test('resume recovers exactly one expired prior-boot spawning lease', (t) => {
  const repoDir = createRepo(t);
  const prepared = prepare(repoDir);

  const result = resume(repoDir);
  const stateDirectory = rehearsalDirectory(repoDir);
  const privateResult = JSON.parse(
    fs.readFileSync(
      path.join(stateDirectory, 'result.json'),
      'utf8',
    ),
  );
  const namespaceDirectory = path.join(
    stateDirectory,
    'workspace-root',
    LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
  );

  assert.equal(
    result.actualHostRestartObserved,
    false,
  );
  assert.equal(
    result.bootIdentityChangedObserved,
    true,
  );
  assert.equal(
    result.priorBootSpawningLeaseRecovered,
    true,
  );
  assert.equal(
    result.automaticEvaluatorRelaunchPerformed,
    false,
  );
  assert.equal(
    privateResult.actualHostRestartObserved,
    false,
  );
  assert.equal(
    privateResult.sessionHash,
    JSON.parse(
      fs.readFileSync(
        path.join(stateDirectory, 'session.json'),
        'utf8',
      ),
    ).sessionHash,
  );
  assert.deepEqual(
    fs.readdirSync(namespaceDirectory),
    ['.namespace.json'],
  );
  assert.equal(
    JSON.stringify(privateResult).includes(
      prepared.leaseId,
    ),
    false,
  );
});

test('same boot is rejected before workspace recovery', (t) => {
  const repoDir = createRepo(t);
  prepare(repoDir);
  const workspacePath = workspaceDirectory(repoDir);

  assert.throws(
    () =>
      resume(repoDir, {
        bootIdentityProvider: () =>
          bootIdentity('prepared-boot'),
      }),
    /same-boot/,
  );
  assert.equal(fs.existsSync(workspacePath), true);
});

test('the actual host identity reader cannot satisfy resume on the same boot', (t) => {
  const repoDir = createRepo(t);
  prepareLocalCandidateEvaluationHostRestartRehearsal({
    clock: () => PREPARED_AT,
    leaseDurationMs: 1,
    randomId: () => REHEARSAL_ID,
    repoDir,
  });
  const workspacePath = workspaceDirectory(repoDir);

  assert.throws(
    () =>
      resumeLocalCandidateEvaluationHostRestartRehearsal({
        clock: () => RESUMED_AT,
        rehearsalId: REHEARSAL_ID,
        repoDir,
      }),
    /same-boot/,
  );
  assert.equal(fs.existsSync(workspacePath), true);
});

test('an injected prepare can never become an actual host restart claim', (t) => {
  const repoDir = createRepo(t);
  prepare(repoDir);

  const result =
    resumeLocalCandidateEvaluationHostRestartRehearsal({
      clock: () => RESUMED_AT,
      processId: 51002,
      rehearsalId: REHEARSAL_ID,
      repoDir,
    });

  assert.equal(
    result.actualHostRestartObserved,
    false,
  );
});

test('an injected filesystem can never become an actual Linux host restart claim', (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux boot-id injection regression');
    return;
  }
  const repoDir = createRepo(t);
  let bootId =
    '11111111-1111-1111-1111-111111111111';
  const injectedFileSystem = new Proxy(fs, {
    get(target, property) {
      if (property === 'readFileSync') {
        return (filePath, ...args) =>
          filePath ===
          '/proc/sys/kernel/random/boot_id'
            ? bootId
            : target.readFileSync(
                filePath,
                ...args,
              );
      }
      const value = target[property];
      return typeof value === 'function'
        ? value.bind(target)
        : value;
    },
  });
  prepareLocalCandidateEvaluationHostRestartRehearsal({
    clock: () => PREPARED_AT,
    fileSystem: injectedFileSystem,
    leaseDurationMs: 1,
    randomId: () => REHEARSAL_ID,
    repoDir,
  });
  bootId =
    '22222222-2222-2222-2222-222222222222';

  const result =
    resumeLocalCandidateEvaluationHostRestartRehearsal({
      clock: () => RESUMED_AT,
      fileSystem: injectedFileSystem,
      rehearsalId: REHEARSAL_ID,
      repoDir,
    });

  assert.equal(
    result.actualHostRestartObserved,
    false,
  );
});

test('unavailable boot identity is rejected before workspace recovery', (t) => {
  const repoDir = createRepo(t);
  prepare(repoDir);
  const workspacePath = workspaceDirectory(repoDir);

  assert.throws(
    () =>
      resume(repoDir, {
        bootIdentityProvider:
          unavailableBootIdentity,
      }),
    /boot-identity-unavailable/,
  );
  assert.equal(fs.existsSync(workspacePath), true);
});

test('unexpired lease is rejected before workspace recovery', (t) => {
  const repoDir = createRepo(t);
  prepare(repoDir);
  const workspacePath = workspaceDirectory(repoDir);

  assert.throws(
    () =>
      resume(repoDir, {
        clock: () =>
          '2026-07-20T01:04:59.999Z',
      }),
    /lease-unexpired/,
  );
  assert.equal(fs.existsSync(workspacePath), true);
});

test('tampered session is rejected before workspace recovery', (t) => {
  const repoDir = createRepo(t);
  prepare(repoDir);
  const workspacePath = workspaceDirectory(repoDir);
  const sessionPath = path.join(
    rehearsalDirectory(repoDir),
    'session.json',
  );
  const session = JSON.parse(
    fs.readFileSync(sessionPath, 'utf8'),
  );
  fs.writeFileSync(
    sessionPath,
    `${JSON.stringify({
      ...session,
      status: 'tampered',
    })}\n`,
    {
      mode: 0o600,
    },
  );

  assert.throws(
    () => resume(repoDir),
    /session failed: integrity/,
  );
  assert.equal(fs.existsSync(workspacePath), true);
});

test('symlinked session is rejected before workspace recovery', (t) => {
  const repoDir = createRepo(t);
  prepare(repoDir);
  const workspacePath = workspaceDirectory(repoDir);
  const sessionPath = path.join(
    rehearsalDirectory(repoDir),
    'session.json',
  );
  fs.unlinkSync(sessionPath);
  fs.symlinkSync('/dev/null', sessionPath);

  assert.throws(
    () => resume(repoDir),
    /private record is unsafe/,
  );
  assert.equal(fs.existsSync(workspacePath), true);
});

test('a symlinked private directory is rejected without changing its target mode', (t) => {
  const repoDir = createRepo(t);
  const externalDirectory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'personal-ai-agent-host-restart-external-',
    ),
  );
  t.after(() => {
    fs.rmSync(externalDirectory, {
      force: true,
      recursive: true,
    });
  });
  fs.chmodSync(externalDirectory, 0o755);
  fs.mkdirSync(path.join(repoDir, 'var'), {
    mode: 0o700,
  });
  fs.symlinkSync(
    externalDirectory,
    path.join(
      repoDir,
      'var',
      'local-candidate-evaluation',
    ),
  );

  assert.throws(
    () => prepare(repoDir),
    /directory is unsafe/,
  );
  assert.equal(
    fs.statSync(externalDirectory).mode & 0o777,
    0o755,
  );
});

test('unexpected workspace content is preserved', (t) => {
  const repoDir = createRepo(t);
  prepare(repoDir);
  const workspacePath = workspaceDirectory(repoDir);
  fs.writeFileSync(
    path.join(workspacePath, 'unexpected.txt'),
    'preserve',
    {
      mode: 0o600,
    },
  );

  assert.throws(
    () => resume(repoDir),
    /workspace failed: exact-scope/,
  );
  assert.equal(fs.existsSync(workspacePath), true);
});

test('resume completes idempotently after receipt writing is interrupted', (t) => {
  const repoDir = createRepo(t);
  prepare(repoDir);
  let failPendingResult = true;
  const interruptedFileSystem = new Proxy(fs, {
    get(target, property) {
      if (property === 'openSync') {
        return (filePath, ...args) => {
          if (
            failPendingResult &&
            String(filePath).endsWith(
              '.result.pending.json',
            )
          ) {
            failPendingResult = false;
            const error = new Error(
              'simulated result write interruption',
            );
            error.code = 'EIO';
            throw error;
          }
          return target.openSync(filePath, ...args);
        };
      }
      const value = target[property];
      return typeof value === 'function'
        ? value.bind(target)
        : value;
    },
  });

  assert.throws(
    () =>
      resume(repoDir, {
        fileSystem: interruptedFileSystem,
      }),
    /simulated result write interruption/,
  );
  assert.deepEqual(
    fs.readdirSync(
      path.join(
        rehearsalDirectory(repoDir),
        'workspace-root',
        LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
      ),
    ),
    ['.namespace.json'],
  );
  fs.writeFileSync(
    path.join(
      rehearsalDirectory(repoDir),
      '.result.pending.json',
    ),
    '{',
    {
      mode: 0o600,
    },
  );

  const completed = resume(repoDir);
  const repeated = resume(repoDir);
  assert.deepEqual(repeated, completed);
  assert.equal(completed.status, 'recovered');
});

test('rehearsal source contains no reboot or evaluator relaunch command', () => {
  const source = fs.readFileSync(
    new URL(
      '../scripts/local-candidate-evaluation-host-restart-rehearsal.mjs',
      import.meta.url,
    ),
    'utf8',
  );

  for (const forbidden of [
    '/sbin/reboot',
    '/sbin/shutdown',
    'launchctl',
    'runtime.run(',
    'spawn(',
    'spawnSync(',
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `unexpected authority in rehearsal source: ${forbidden}`,
    );
  }
});
