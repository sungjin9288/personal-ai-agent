import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  prepareLocalCandidateEvaluationHostRestartRehearsal,
  resumeLocalCandidateEvaluationHostRestartRehearsal,
} from './local-candidate-evaluation-host-restart-rehearsal.mjs';
import {
  LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
} from '../src/core/local-candidate-evaluation-workspace-recovery.mjs';

export const LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_REHEARSAL_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-host-restart-rehearsal-evidence/v1';

const PREPARED_AT = '2026-07-20T01:00:00.000Z';
const RESUMED_AT = '2026-07-20T01:06:00.000Z';
const REHEARSAL_ID = 'abcdef0123456789abcdef01';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

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

function scenarioDirectory(root, name) {
  const directory = path.join(root, name);
  fs.mkdirSync(directory, {
    mode: 0o700,
  });
  return directory;
}

function prepare(repoDir) {
  return prepareLocalCandidateEvaluationHostRestartRehearsal({
    bootIdentityProvider: () =>
      bootIdentity('fixture-prepared-boot'),
    clock: () => PREPARED_AT,
    leaseDurationMs: 5 * 60 * 1_000,
    processId: 52001,
    randomId: () => REHEARSAL_ID,
    repoDir,
  });
}

function resume(repoDir, overrides = {}) {
  return resumeLocalCandidateEvaluationHostRestartRehearsal({
    bootIdentityProvider: () =>
      bootIdentity('fixture-resumed-boot'),
    clock: () => RESUMED_AT,
    processId: 52002,
    rehearsalId: REHEARSAL_ID,
    repoDir,
    ...overrides,
  });
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

function rejectedAndPreserved(
  repoDir,
  operation,
  pattern,
) {
  const workspace = workspaceDirectory(repoDir);
  let rejected = false;
  try {
    operation();
  } catch (error) {
    rejected = pattern.test(
      String(error?.message || ''),
    );
  }
  return rejected && fs.existsSync(workspace);
}

export function evaluateLocalCandidateEvaluationHostRestartRehearsal() {
  const root = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'personal-ai-agent-host-restart-evidence-',
    ),
  );
  try {
    const successRepo = scenarioDirectory(
      root,
      'success',
    );
    const prepared = prepare(successRepo);
    const resumed = resume(successRepo);
    const resultPath = path.join(
      rehearsalDirectory(successRepo),
      'result.json',
    );
    const privateResult = JSON.parse(
      fs.readFileSync(resultPath, 'utf8'),
    );

    const sameBootRepo = scenarioDirectory(
      root,
      'same-boot',
    );
    prepare(sameBootRepo);
    const sameBootPreserved =
      rejectedAndPreserved(
        sameBootRepo,
        () =>
          resume(sameBootRepo, {
            bootIdentityProvider: () =>
              bootIdentity(
                'fixture-prepared-boot',
              ),
          }),
        /same-boot/,
      );

    const unavailableRepo = scenarioDirectory(
      root,
      'unavailable',
    );
    prepare(unavailableRepo);
    const unavailableBootIdentityPreserved =
      rejectedAndPreserved(
        unavailableRepo,
        () =>
          resume(unavailableRepo, {
            bootIdentityProvider:
              unavailableBootIdentity,
          }),
        /boot-identity-unavailable/,
      );

    const unexpiredRepo = scenarioDirectory(
      root,
      'unexpired',
    );
    prepare(unexpiredRepo);
    const unexpiredLeasePreserved =
      rejectedAndPreserved(
        unexpiredRepo,
        () =>
          resume(unexpiredRepo, {
            clock: () =>
              '2026-07-20T01:04:59.999Z',
          }),
        /lease-unexpired/,
      );

    const tamperedRepo = scenarioDirectory(
      root,
      'tampered',
    );
    prepare(tamperedRepo);
    const tamperedSessionPath = path.join(
      rehearsalDirectory(tamperedRepo),
      'session.json',
    );
    const tamperedSession = JSON.parse(
      fs.readFileSync(
        tamperedSessionPath,
        'utf8',
      ),
    );
    fs.writeFileSync(
      tamperedSessionPath,
      `${JSON.stringify({
        ...tamperedSession,
        status: 'tampered',
      })}\n`,
      {
        mode: 0o600,
      },
    );
    const tamperedStatePreserved =
      rejectedAndPreserved(
        tamperedRepo,
        () => resume(tamperedRepo),
        /integrity/,
      );

    const unsafeTreeRepo = scenarioDirectory(
      root,
      'unsafe-tree',
    );
    prepare(unsafeTreeRepo);
    fs.writeFileSync(
      path.join(
        workspaceDirectory(unsafeTreeRepo),
        'unexpected.txt',
      ),
      'preserve',
      {
        mode: 0o600,
      },
    );
    const unsafeTreePreserved =
      rejectedAndPreserved(
        unsafeTreeRepo,
        () => resume(unsafeTreeRepo),
        /exact-scope/,
      );

    const mixedProviderRepo = scenarioDirectory(
      root,
      'mixed-provider',
    );
    prepare(mixedProviderRepo);
    const mixedProviderResult =
      resumeLocalCandidateEvaluationHostRestartRehearsal({
        clock: () => RESUMED_AT,
        processId: 52002,
        rehearsalId: REHEARSAL_ID,
        repoDir: mixedProviderRepo,
      });
    const injectedPrepareCannotClaimActualRestart =
      mixedProviderResult.actualHostRestartObserved ===
      false;

    const injectedFileSystemRepo = scenarioDirectory(
      root,
      'injected-filesystem',
    );
    const injectedFileSystem = new Proxy(fs, {
      get(target, property) {
        const value = target[property];
        return typeof value === 'function'
          ? value.bind(target)
          : value;
      },
    });
    prepareLocalCandidateEvaluationHostRestartRehearsal({
      clock: () => PREPARED_AT,
      fileSystem: injectedFileSystem,
      leaseDurationMs: 5 * 60 * 1_000,
      processId: 52001,
      randomId: () => REHEARSAL_ID,
      repoDir: injectedFileSystemRepo,
    });
    const injectedFileSystemSession = JSON.parse(
      fs.readFileSync(
        path.join(
          rehearsalDirectory(
            injectedFileSystemRepo,
          ),
          'session.json',
        ),
        'utf8',
      ),
    );
    const injectedFileSystemCannotClaimActualRestart =
      injectedFileSystemSession.observationSource ===
      'injected-fixture';

    const symlinkRepo = scenarioDirectory(
      root,
      'symlink-directory',
    );
    const externalDirectory = scenarioDirectory(
      root,
      'external-target',
    );
    fs.chmodSync(externalDirectory, 0o755);
    fs.mkdirSync(path.join(symlinkRepo, 'var'), {
      mode: 0o700,
    });
    fs.symlinkSync(
      externalDirectory,
      path.join(
        symlinkRepo,
        'var',
        'local-candidate-evaluation',
      ),
    );
    let symlinkDirectoryRejected = false;
    try {
      prepare(symlinkRepo);
    } catch (error) {
      symlinkDirectoryRejected =
        /directory is unsafe/.test(
          String(error?.message || ''),
        );
    }
    const symlinkTargetModePreserved =
      symlinkDirectoryRejected &&
      (fs.statSync(externalDirectory).mode & 0o777) ===
        0o755;

    const interruptedRepo = scenarioDirectory(
      root,
      'interrupted-result',
    );
    prepare(interruptedRepo);
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
              throw new Error(
                'simulated result write interruption',
              );
            }
            return target.openSync(
              filePath,
              ...args,
            );
          };
        }
        const value = target[property];
        return typeof value === 'function'
          ? value.bind(target)
          : value;
      },
    });
    try {
      resume(interruptedRepo, {
        fileSystem: interruptedFileSystem,
      });
    } catch {
      // The retry below is the behavior under evaluation.
    }
    fs.writeFileSync(
      path.join(
        rehearsalDirectory(interruptedRepo),
        '.result.pending.json',
      ),
      '{',
      {
        mode: 0o600,
      },
    );
    const firstRetry = resume(interruptedRepo);
    const secondRetry = resume(interruptedRepo);
    const interruptedReceiptCompletesIdempotently =
      JSON.stringify(firstRetry) ===
      JSON.stringify(secondRetry);

    const source = fs.readFileSync(
      new URL(
        './local-candidate-evaluation-host-restart-rehearsal.mjs',
        import.meta.url,
      ),
      'utf8',
    );
    const noAutomaticRebootOrRelaunch = [
      '/sbin/reboot',
      '/sbin/shutdown',
      'launchctl',
      'runtime.run(',
      'spawn(',
      'spawnSync(',
    ].every((term) => !source.includes(term));

    const content = {
      claimBoundary: {
        actualEvaluatorRelaunchPerformed: false,
        actualHostRestartObserved: false,
        actualModelEvaluated: false,
        externalProviderCalls: 'none',
        productionReadyClaim: false,
        rolloutAuthorized: false,
        trainingAuthorized: false,
      },
      failureGuards: {
        injectedFileSystemCannotClaimActualRestart,
        injectedPrepareCannotClaimActualRestart,
        interruptedReceiptCompletesIdempotently,
        noAutomaticRebootOrRelaunch,
        sameBootPreserved,
        symlinkTargetModePreserved,
        tamperedStatePreserved,
        unavailableBootIdentityPreserved,
        unexpiredLeasePreserved,
        unsafeTreePreserved,
      },
      mode:
        'local-candidate-evaluation-host-restart-rehearsal',
      protocol: {
        actualObservationRequiresManualHostRestart:
          true,
        ownerOnlyPrivateState:
          (fs.statSync(resultPath).mode & 0o777) ===
          0o600,
        prepareResumeProtocolValidated:
          prepared.status === 'prepared' &&
          resumed.status === 'recovered',
        syntheticWorkspaceOnly: true,
      },
      recovery: {
        bootIdentityChangedObserved:
          resumed.bootIdentityChangedObserved,
        priorBootSpawningLeaseRecovered:
          resumed.priorBootSpawningLeaseRecovered,
      },
      schemaVersion:
        LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_REHEARSAL_EVIDENCE_SCHEMA_VERSION,
    };
    for (const value of [
      ...Object.values(content.failureGuards),
      ...Object.values(content.protocol),
      ...Object.values(content.recovery),
    ]) {
      assert.equal(value, true);
    }
    assert.equal(
      privateResult.actualHostRestartObserved,
      false,
    );
    const serialized = JSON.stringify(content);
    for (const forbidden of [
      root,
      'fixture-prepared-boot',
      'fixture-resumed-boot',
      prepared.leaseId,
    ]) {
      assert.equal(
        serialized.includes(forbidden),
        false,
      );
    }
    const evidenceHash = hashRecord(content);
    return {
      ...content,
      evidenceHash,
      id:
        `local-candidate-evaluation-host-restart-rehearsal-evidence-${evidenceHash}`,
    };
  } finally {
    fs.rmSync(root, {
      force: true,
      recursive: true,
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(
    `${JSON.stringify(
      evaluateLocalCandidateEvaluationHostRestartRehearsal(),
      null,
      2,
    )}\n`,
  );
}
