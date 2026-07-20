import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertLocalCandidateEvaluationWorkspaceRecovery,
  createLocalCandidateEvaluationWorkspace,
  LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
  recoverStaleLocalCandidateEvaluationWorkspaces,
} from '../src/core/local-candidate-evaluation-workspace-recovery.mjs';

const CREATED_AT = '2026-07-17T08:00:00.000Z';
const EXPIRES_AT = '2026-07-17T08:30:00.000Z';
const RECOVERED_AT = '2026-07-17T08:45:00.000Z';
const CURRENT_BOOT = 'fixture-current-boot';

function createBootIdentity(value = CURRENT_BOOT) {
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

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function writeLegacyLease(workspace) {
  const current = workspace.lease;
  const binding = {
    createdAt: current.createdAt,
    leaseExpiresAt: current.leaseExpiresAt,
    namespacePathHash: current.namespacePathHash,
    ownerPid: current.ownerPid,
    phase: current.phase,
    schemaVersion:
      'personal-ai-agent-local-candidate-evaluation-workspace-lease/v1',
    workspacePathHash: current.workspacePathHash,
  };
  fs.writeFileSync(
    path.join(
      workspace.rootDir,
      '.workspace-lease.json',
    ),
    `${JSON.stringify({
      ...binding,
      leaseId:
        `local-candidate-evaluation-workspace-lease-${hashRecord(binding)}`,
    })}\n`,
    {
      mode: 0o600,
    },
  );
}

function createTemporaryDirectory(t) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'personal-ai-agent-workspace-recovery-test-',
    ),
  );
  t.after(() => {
    fs.rmSync(temporaryDirectory, {
      force: true,
      recursive: true,
    });
  });
  return temporaryDirectory;
}

function createWorkspace(
  t,
  {
    bootIdentityProvider = () =>
      createBootIdentity(),
    createdAt = CREATED_AT,
    isProcessAlive = () => true,
    leaseExpiresAt = EXPIRES_AT,
    processId = 41001,
  } = {},
) {
  const temporaryDirectory = createTemporaryDirectory(t);
  const workspace = createLocalCandidateEvaluationWorkspace({
    bootIdentityProvider,
    createdAt,
    isProcessAlive,
    leaseExpiresAt,
    processId,
    temporaryDirectory,
  });
  return {
    temporaryDirectory,
    workspace,
  };
}

function recover({
  bootIdentityProvider = () =>
    createBootIdentity(),
  isProcessAlive,
  processId = 41002,
  temporaryDirectory,
}) {
  return recoverStaleLocalCandidateEvaluationWorkspaces({
    bootIdentityProvider,
    isProcessAlive,
    now: RECOVERED_AT,
    processId,
    temporaryDirectory,
  });
}

function createWorkspaceInChild(temporaryDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        'fixtures/local-candidate-evaluation-workspace-worker.mjs',
        temporaryDirectory,
      ],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stderr = '';
    let stdout = '';
    child.stderr.setEncoding('utf8');
    child.stdout.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `workspace child exited with ${code}: ${stderr}`,
          ),
        );
        return;
      }
      resolve(JSON.parse(stdout));
    });
  });
}

test('recovery removes only an expired dead preparing workspace', (t) => {
  const { temporaryDirectory, workspace } =
    createWorkspace(t);
  const nestedDirectory = path.join(
    workspace.rootDir,
    'candidate',
  );
  fs.mkdirSync(nestedDirectory, {
    mode: 0o700,
  });
  fs.writeFileSync(
    path.join(nestedDirectory, 'artifact.bin'),
    'bounded-fixture',
    {
      mode: 0o600,
    },
  );

  const recovery = recover({
    isProcessAlive: (processId) =>
      processId === workspace.lease.ownerPid
        ? false
        : true,
    temporaryDirectory,
  });

  assert.equal(
    assertLocalCandidateEvaluationWorkspaceRecovery(
      recovery,
    ),
    recovery,
  );
  assert.deepEqual(recovery.recoveredLeaseIds, [
    workspace.lease.leaseId,
  ]);
  assert.equal(recovery.scannedWorkspaceCount, 1);
  assert.equal(
    recovery.skippedActiveWorkspaceCount,
    0,
  );
  assert.equal(
    recovery.skippedUnsafeWorkspaceCount,
    0,
  );
  assert.equal(fs.existsSync(workspace.rootDir), false);
  assert.deepEqual(
    fs.readdirSync(
      path.join(
        temporaryDirectory,
        LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
      ),
    ),
    ['.namespace.json'],
  );
});

test('recovery preserves unexpired, live, unknown, and spawning workspaces', (t) => {
  const cases = [
    {
      expectedProcessState: false,
      leaseExpiresAt: '2026-07-17T09:00:00.000Z',
      name: 'unexpired',
    },
    {
      expectedProcessState: true,
      name: 'live',
    },
    {
      expectedProcessState: null,
      name: 'unknown',
    },
    {
      expectedProcessState: false,
      markSpawning: true,
      name: 'spawning',
    },
  ];

  for (const item of cases) {
    const { temporaryDirectory, workspace } =
      createWorkspace(t, {
        leaseExpiresAt:
          item.leaseExpiresAt ?? EXPIRES_AT,
      });
    if (item.markSpawning) {
      workspace.markSpawning();
    }

    const recovery = recover({
      isProcessAlive: () =>
        item.expectedProcessState,
      temporaryDirectory,
    });

    assert.deepEqual(
      recovery.recoveredLeaseIds,
      [],
      item.name,
    );
    assert.equal(
      recovery.skippedActiveWorkspaceCount,
      1,
      item.name,
    );
    assert.equal(
      recovery.skippedUnsafeWorkspaceCount,
      0,
      item.name,
    );
    assert.equal(
      fs.existsSync(workspace.rootDir),
      true,
      item.name,
    );
    workspace.cleanup();
  }
});

test('recovery removes only an expired prior-boot v2 spawning workspace', (t) => {
  const { temporaryDirectory, workspace } =
    createWorkspace(t, {
      bootIdentityProvider: () =>
        createBootIdentity('fixture-prior-boot'),
    });
  workspace.markSpawning();
  let processChecks = 0;

  const recovery = recover({
    bootIdentityProvider: () =>
      createBootIdentity(CURRENT_BOOT),
    isProcessAlive() {
      processChecks += 1;
      return true;
    },
    temporaryDirectory,
  });

  assert.deepEqual(recovery.recoveredLeaseIds, [
    workspace.lease.leaseId,
  ]);
  assert.deepEqual(
    recovery.recoveredPriorBootSpawningLeaseIds,
    [workspace.lease.leaseId],
  );
  assert.equal(recovery.bootIdentityAvailable, true);
  assert.equal(processChecks, 0);
  assert.equal(fs.existsSync(workspace.rootDir), false);
});

test('recovery preserves a live or unknown atomic claim on a prior-boot spawning workspace', (t) => {
  for (const claimantState of [true, null]) {
    const { temporaryDirectory, workspace } =
      createWorkspace(t, {
        bootIdentityProvider: () =>
          createBootIdentity('fixture-prior-boot'),
      });
    workspace.markSpawning();
    const claimantProcessId = 41003;
    fs.renameSync(
      path.join(
        workspace.rootDir,
        '.workspace-lease.json',
      ),
      path.join(
        workspace.rootDir,
        `.workspace-lease.recovery-${claimantProcessId}.json`,
      ),
    );
    const checkedProcessIds = [];

    const recovery = recover({
      bootIdentityProvider: () =>
        createBootIdentity(CURRENT_BOOT),
      isProcessAlive(processId) {
        checkedProcessIds.push(processId);
        return claimantState;
      },
      temporaryDirectory,
    });

    assert.deepEqual(recovery.recoveredLeaseIds, []);
    assert.equal(
      recovery.skippedActiveWorkspaceCount,
      1,
    );
    assert.deepEqual(checkedProcessIds, [
      claimantProcessId,
    ]);
    assert.equal(fs.existsSync(workspace.rootDir), true);
    workspace.cleanup();
  }
});

test('recovery preserves prior-boot spawning workspaces without every deletion proof', (t) => {
  const cases = [
    {
      currentBootIdentity: createBootIdentity(
        CURRENT_BOOT,
      ),
      leaseExpiresAt: '2026-07-17T09:00:00.000Z',
      name: 'unexpired-v2',
    },
    {
      currentBootIdentity: unavailableBootIdentity(),
      name: 'unavailable-current-boot',
    },
    {
      currentBootIdentity: createBootIdentity(
        CURRENT_BOOT,
      ),
      legacy: true,
      name: 'legacy-v1',
    },
  ];

  for (const item of cases) {
    const { temporaryDirectory, workspace } =
      createWorkspace(t, {
        bootIdentityProvider: () =>
          createBootIdentity('fixture-prior-boot'),
        leaseExpiresAt:
          item.leaseExpiresAt ?? EXPIRES_AT,
      });
    workspace.markSpawning();
    if (item.legacy) {
      writeLegacyLease(workspace);
    }

    const recovery = recover({
      bootIdentityProvider: () =>
        item.currentBootIdentity,
      isProcessAlive: () => false,
      temporaryDirectory,
    });

    assert.deepEqual(
      recovery.recoveredLeaseIds,
      [],
      item.name,
    );
    assert.equal(
      recovery.skippedActiveWorkspaceCount,
      1,
      item.name,
    );
    assert.equal(
      fs.existsSync(workspace.rootDir),
      true,
      item.name,
    );
    workspace.cleanup();
  }
});

test('recovery treats a malformed stored boot identity as unsafe', (t) => {
  const { temporaryDirectory, workspace } =
    createWorkspace(t, {
      bootIdentityProvider: () =>
        createBootIdentity('fixture-prior-boot'),
    });
  workspace.markSpawning();
  const markerPath = path.join(
    workspace.rootDir,
    '.workspace-lease.json',
  );
  const malformed = {
    ...JSON.parse(fs.readFileSync(markerPath, 'utf8')),
    ownerBootIdentityHash: 'malformed',
  };
  fs.writeFileSync(
    markerPath,
    `${JSON.stringify(malformed)}\n`,
    {
      mode: 0o600,
    },
  );

  const recovery = recover({
    bootIdentityProvider: () =>
      createBootIdentity(CURRENT_BOOT),
    isProcessAlive: () => false,
    temporaryDirectory,
  });

  assert.deepEqual(recovery.recoveredLeaseIds, []);
  assert.equal(
    recovery.skippedUnsafeWorkspaceCount,
    1,
  );
  assert.equal(fs.existsSync(workspace.rootDir), true);
});

test('recovery skips malformed and symlinked workspace content', (t) => {
  const malformed = createWorkspace(t);
  const malformedMarker = path.join(
    malformed.workspace.rootDir,
    '.workspace-lease.json',
  );
  fs.writeFileSync(malformedMarker, '{}\n', {
    mode: 0o600,
  });

  const malformedRecovery = recover({
    isProcessAlive: () => false,
    temporaryDirectory: malformed.temporaryDirectory,
  });
  assert.equal(
    malformedRecovery.skippedUnsafeWorkspaceCount,
    1,
  );
  assert.equal(
    fs.existsSync(malformed.workspace.rootDir),
    true,
  );

  const symlinked = createWorkspace(t);
  fs.symlinkSync(
    os.tmpdir(),
    path.join(symlinked.workspace.rootDir, 'outside'),
  );
  const symlinkedRecovery = recover({
    isProcessAlive: () => false,
    temporaryDirectory: symlinked.temporaryDirectory,
  });
  assert.equal(
    symlinkedRecovery.skippedUnsafeWorkspaceCount,
    1,
  );
  assert.equal(
    fs.existsSync(symlinked.workspace.rootDir),
    true,
  );
});

test('recovery resumes a dead atomic claim and blocks an unsafe namespace', (t) => {
  const claimed = createWorkspace(t);
  const claimPath = path.join(
    claimed.workspace.rootDir,
    '.workspace-lease.recovery-41003.json',
  );
  fs.renameSync(
    path.join(
      claimed.workspace.rootDir,
      '.workspace-lease.json',
    ),
    claimPath,
  );

  const resumed = recover({
    isProcessAlive: () => false,
    processId: 41004,
    temporaryDirectory: claimed.temporaryDirectory,
  });
  assert.deepEqual(resumed.recoveredLeaseIds, [
    claimed.workspace.lease.leaseId,
  ]);
  assert.equal(
    fs.existsSync(claimed.workspace.rootDir),
    false,
  );

  const unsafe = createWorkspace(t);
  fs.chmodSync(
    path.join(
      unsafe.temporaryDirectory,
      LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
    ),
    0o770,
  );
  assert.throws(
    () =>
      recover({
        isProcessAlive: () => false,
        temporaryDirectory: unsafe.temporaryDirectory,
      }),
    /ownership-or-containment/,
  );
});

test('recovery summary rejects content or count tampering', (t) => {
  const { temporaryDirectory, workspace } =
    createWorkspace(t);
  const recovery = recover({
    isProcessAlive: () => true,
    temporaryDirectory,
  });

  assert.throws(
    () =>
      assertLocalCandidateEvaluationWorkspaceRecovery({
        ...recovery,
        skippedActiveWorkspaceCount: 0,
      }),
    /recovery failed: integrity/,
  );
  assert.throws(
    () =>
      assertLocalCandidateEvaluationWorkspaceRecovery({
        ...recovery,
        rawWorkspacePath: workspace.rootDir,
      }),
    /recovery failed: integrity/,
  );
});

test('concurrent creators share one atomic namespace and leave recoverable leases', async (t) => {
  const temporaryDirectory = createTemporaryDirectory(t);
  const created = await Promise.all(
    Array.from(
      { length: 6 },
      () => createWorkspaceInChild(temporaryDirectory),
    ),
  );

  const recovery = recover({
    isProcessAlive: () => false,
    processId: 41010,
    temporaryDirectory,
  });

  assert.deepEqual(
    recovery.recoveredLeaseIds,
    created.map((item) => item.leaseId).sort(),
  );
  assert.equal(recovery.scannedWorkspaceCount, 6);
  assert.equal(
    recovery.skippedUnsafeWorkspaceCount,
    0,
  );
});

test('delete-time tree drift leaves the claimed workspace for a later safe review', (t) => {
  const { temporaryDirectory, workspace } =
    createWorkspace(t);
  let rootReadCount = 0;
  const mutatingFileSystem = new Proxy(fs, {
    get(target, property) {
      if (property !== 'readdirSync') {
        return target[property];
      }
      return (targetPath, options) => {
        if (targetPath === workspace.rootDir) {
          rootReadCount += 1;
          if (rootReadCount === 4) {
            fs.writeFileSync(
              path.join(
                workspace.rootDir,
                'late-untrusted-file',
              ),
              'late mutation',
              {
                mode: 0o644,
              },
            );
          }
        }
        return target.readdirSync(targetPath, options);
      };
    },
  });

  const recovery =
    recoverStaleLocalCandidateEvaluationWorkspaces({
      fileSystem: mutatingFileSystem,
      isProcessAlive: () => false,
      now: RECOVERED_AT,
      processId: 41020,
      temporaryDirectory,
    });

  assert.deepEqual(recovery.recoveredLeaseIds, []);
  assert.equal(
    recovery.skippedUnsafeWorkspaceCount,
    1,
  );
  assert.equal(fs.existsSync(workspace.rootDir), true);
  assert.equal(rootReadCount, 4);
});
