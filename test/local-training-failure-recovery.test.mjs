import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildLocalTrainingFailureCleanupRequest,
  cleanupLocalTrainingFailureRecovery,
  commitLocalTrainingFailureRecovery,
  markLocalTrainingFailureRecoveryPublished,
  markLocalTrainingFailureRecoveryPublishIntent,
  openLocalTrainingFailureRecovery,
  recoverLocalTrainingFailure,
} from '../src/core/local-training-failure-recovery.mjs';

const STARTED_AT = '2026-07-22T04:00:00.000Z';
const PUBLISHED_AT = '2026-07-22T04:00:01.000Z';
const CLEANED_AT = '2026-07-22T04:00:02.000Z';

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function writePrivateFile(filename, content) {
  fs.writeFileSync(filename, content, { mode: 0o600 });
  fs.chmodSync(filename, 0o600);
}

function createFixture({ openOperation = true } = {}) {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'local-training-recovery-'),
  );
  const workspaceParent = path.join(
    repoDir,
    'var/local-training/workspaces',
  );
  const candidateParent = path.join(
    repoDir,
    'var/local-training/candidates',
  );
  fs.mkdirSync(workspaceParent, { mode: 0o700, recursive: true });
  fs.mkdirSync(candidateParent, { mode: 0o700, recursive: true });
  fs.chmodSync(path.join(repoDir, 'var'), 0o700);
  fs.chmodSync(path.join(repoDir, 'var/local-training'), 0o700);
  fs.chmodSync(workspaceParent, 0o700);
  fs.chmodSync(candidateParent, 0o700);
  const workspaceRoot = fs.mkdtempSync(
    path.join(workspaceParent, 'mlx-lm-lora-'),
  );
  fs.chmodSync(workspaceRoot, 0o700);
  const approvalHash = hash('approval');
  const approvalId = `local-training-approval-${approvalHash}`;
  const candidateRoot = path.join(candidateParent, approvalId);
  const bindings = {
    acquisitionVerification: {
      hash: hash('acquisition-verification'),
      id: `local-training-acquisition-verification-${hash('acquisition-id')}`,
    },
    approval: {
      hash: approvalHash,
      id: approvalId,
    },
    contractHash: hash('adapter-contract'),
    dataset: {
      datasetHash: hash('dataset'),
      readinessHash: hash('readiness-package'),
      trainSha256: hash('train-jsonl'),
      validationSha256: hash('valid-jsonl'),
    },
    maxDiskBytes: 1024 * 1024,
    permission: {
      hash: hash('permission'),
      id: `local-training-permission-${hash('permission-id')}`,
    },
    postAcquisitionReadiness: {
      hash: hash('post-acquisition-readiness'),
      id: `local-training-post-acquisition-readiness-${hash('post-id')}`,
    },
    rollbackOwner: 'local-rollback-owner',
  };
  const fixture = {
    approvalId,
    bindings,
    candidateParent,
    candidateRoot,
    cleanup() {
      fs.rmSync(repoDir, { force: true, recursive: true });
    },
    openOperation() {
      const operation = openLocalTrainingFailureRecovery({
        bindings,
        candidateRoot,
        leaseExpiresAt: '2026-07-22T04:05:00.000Z',
        repoDir,
        startedAt: STARTED_AT,
        workspaceRoot,
      });
      fixture.operation = operation;
      fixture.operationRoot = path.join(
        repoDir,
        'var/local-training/recovery',
        operation.operationId,
      );
      return operation;
    },
    operation: null,
    operationRoot: null,
    repoDir,
    workspaceRoot,
  };
  if (openOperation) {
    fixture.openOperation();
  }
  return fixture;
}

function publishCandidate(fixture) {
  const dataRoot = path.join(fixture.workspaceRoot, 'data');
  const stagedCandidate = path.join(
    fixture.workspaceRoot,
    'candidate',
  );
  const artifactRoot = path.join(stagedCandidate, 'artifact');
  fs.mkdirSync(dataRoot, { mode: 0o700 });
  fs.mkdirSync(stagedCandidate, { mode: 0o700 });
  fs.mkdirSync(artifactRoot, { mode: 0o700 });
  for (const directory of [dataRoot, stagedCandidate, artifactRoot]) {
    fs.chmodSync(directory, 0o700);
  }
  writePrivateFile(
    path.join(dataRoot, 'train.jsonl'),
    'PRIVATE-F1-TRAINING-ROW\n',
  );
  writePrivateFile(
    path.join(artifactRoot, 'adapter_config.json'),
    '{"fixture":true}\n',
  );
  writePrivateFile(
    path.join(artifactRoot, 'adapters.safetensors'),
    'fixture-adapter-output',
  );
  const candidateManifestContent = '{"candidate":"fixture"}\n';
  writePrivateFile(
    path.join(stagedCandidate, 'candidate-manifest.json'),
    candidateManifestContent,
  );
  markLocalTrainingFailureRecoveryPublishIntent(
    fixture.operation,
    {
      candidateManifestHash: hash(candidateManifestContent),
      stagedCandidateRoot: stagedCandidate,
      updatedAt: PUBLISHED_AT,
    },
  );
  fs.renameSync(stagedCandidate, fixture.candidateRoot);
  markLocalTrainingFailureRecoveryPublished(fixture.operation, {
    candidateRoot: fixture.candidateRoot,
    updatedAt: PUBLISHED_AT,
  });
}

function buildCleanupRequest(fixture, overrides = {}) {
  return buildLocalTrainingFailureCleanupRequest({
    expiresAt: '2026-07-22T04:10:00.000Z',
    operationId: fixture.operation.operationId,
    repoDir: fixture.repoDir,
    requestedAt: '2026-07-22T04:00:03.000Z',
    requestedBy: fixture.bindings.rollbackOwner,
    ...overrides,
  });
}

test('local training recovery retries after initial ledger publication fails', () => {
  const fixture = createFixture({ openOperation: false });
  const originalFsyncSync = fs.fsyncSync;
  const originalRenameSync = fs.renameSync;
  try {
    const workspaceParentIdentity = fs.statSync(
      path.dirname(fixture.workspaceRoot),
    );
    const recoveryParentIdentity = fs.statSync(
      path.join(fixture.repoDir, 'var/local-training'),
    );
    let recoveryParentSynced = false;
    let workspaceParentSynced = false;
    fs.fsyncSync = (descriptor) => {
      const current = fs.fstatSync(descriptor);
      if (
        current.isDirectory() &&
        current.dev === workspaceParentIdentity.dev &&
        current.ino === workspaceParentIdentity.ino
      ) {
        workspaceParentSynced = true;
      }
      if (
        current.isDirectory() &&
        current.dev === recoveryParentIdentity.dev &&
        current.ino === recoveryParentIdentity.ino
      ) {
        recoveryParentSynced = true;
      }
      return originalFsyncSync(descriptor);
    };
    let publicationFailureInjected = false;
    fs.renameSync = (source, destination) => {
      if (
        !publicationFailureInjected &&
        String(destination).includes('/recovery/local-training-recovery-')
      ) {
        assert.equal(workspaceParentSynced, true);
        assert.equal(recoveryParentSynced, true);
        publicationFailureInjected = true;
        throw new Error('injected operation publication failure');
      }
      return originalRenameSync(source, destination);
    };
    assert.throws(
      () => fixture.openOperation(),
      /operation publication failure/,
    );
    fs.renameSync = originalRenameSync;

    const operation = fixture.openOperation();
    assert.equal(publicationFailureInjected, true);
    assert.equal(
      fs.existsSync(path.join(fixture.operationRoot, 'intent.json')),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(fixture.operationRoot, 'state.json')),
      true,
    );
    assert.equal(operation.operationId, fixture.operation.operationId);
  } finally {
    fs.fsyncSync = originalFsyncSync;
    fs.renameSync = originalRenameSync;
    fixture.cleanup();
  }
});

test('local training recovery commits a successful candidate only after workspace cleanup', () => {
  const fixture = createFixture();
  try {
    publishCandidate(fixture);
    const receipt = commitLocalTrainingFailureRecovery(
      fixture.operation,
      { completedAt: CLEANED_AT },
    );

    assert.equal(receipt.status, 'succeeded');
    assert.equal(receipt.candidatePreserved, true);
    assert.equal(receipt.actualModelTrainingExecuted, false);
    assert.equal(receipt.trainingAuthorized, false);
    assert.equal(fs.existsSync(fixture.workspaceRoot), false);
    assert.equal(fs.existsSync(fixture.candidateRoot), true);
    assert.equal(
      fs.existsSync(path.join(fixture.operationRoot, 'receipt.json')),
      true,
    );
    assert.deepEqual(
      commitLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: '2026-07-22T04:00:03.000Z' },
      ),
      receipt,
    );
    const stateBeforeRejectedCleanup = fs.readFileSync(
      path.join(fixture.operationRoot, 'state.json'),
      'utf8',
    );
    assert.throws(
      () => cleanupLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: '2026-07-22T04:00:04.000Z' },
      ),
      /refuses cleanup after a successful receipt/,
    );
    assert.equal(fs.existsSync(fixture.candidateRoot), true);
    assert.equal(
      fs.readFileSync(
        path.join(fixture.operationRoot, 'state.json'),
        'utf8',
      ),
      stateBeforeRejectedCleanup,
    );

    assert.throws(
      () => buildCleanupRequest(fixture),
      /not eligible for recovery/,
    );
    assert.equal(fs.existsSync(fixture.candidateRoot), true);
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery completes a receipt after post-link cleanup interruption', () => {
  const fixture = createFixture();
  const originalUnlinkSync = fs.unlinkSync;
  try {
    publishCandidate(fixture);
    let receiptCleanupFailureInjected = false;
    fs.unlinkSync = (filename) => {
      if (
        !receiptCleanupFailureInjected &&
        path.basename(String(filename)).startsWith('.receipt.json-')
      ) {
        receiptCleanupFailureInjected = true;
        throw new Error('injected receipt temp cleanup failure');
      }
      return originalUnlinkSync(filename);
    };

    const receipt = commitLocalTrainingFailureRecovery(
      fixture.operation,
      { completedAt: CLEANED_AT },
    );
    fs.unlinkSync = originalUnlinkSync;
    assert.equal(receiptCleanupFailureInjected, true);
    assert.equal(receipt.status, 'succeeded');
    assert.equal(receipt.candidatePreserved, true);
    assert.equal(fs.existsSync(fixture.workspaceRoot), false);
    assert.equal(fs.existsSync(fixture.candidateRoot), true);
    assert.deepEqual(
      commitLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: '2026-07-22T04:00:03.000Z' },
      ),
      receipt,
    );
  } finally {
    fs.unlinkSync = originalUnlinkSync;
    fixture.cleanup();
  }
});

test('local training recovery resumes success after workspace state publication fails', () => {
  const fixture = createFixture();
  const originalRenameSync = fs.renameSync;
  try {
    publishCandidate(fixture);
    let statePublicationCount = 0;
    fs.renameSync = (source, destination) => {
      if (path.basename(String(destination)) === 'state.json') {
        statePublicationCount += 1;
        if (statePublicationCount === 2) {
          throw new Error('injected workspace state publication failure');
        }
      }
      return originalRenameSync(source, destination);
    };
    assert.throws(
      () => commitLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: CLEANED_AT },
      ),
      /workspace state publication failure/,
    );
    fs.renameSync = originalRenameSync;
    const pendingState = JSON.parse(fs.readFileSync(
      path.join(fixture.operationRoot, 'state.json'),
      'utf8',
    ));
    assert.equal(pendingState.phase, 'success-cleanup-pending');
    assert.equal(fs.existsSync(fixture.workspaceRoot), false);
    assert.equal(fs.existsSync(fixture.candidateRoot), true);

    const receipt = commitLocalTrainingFailureRecovery(
      fixture.operation,
      { completedAt: '2026-07-22T04:00:03.000Z' },
    );
    assert.equal(receipt.status, 'succeeded');
    assert.equal(receipt.candidatePreserved, true);
  } finally {
    fs.renameSync = originalRenameSync;
    fixture.cleanup();
  }
});

test('local training recovery resumes candidate rollback after partial cleanup failure', () => {
  const fixture = createFixture();
  publishCandidate(fixture);
  const originalUnlinkSync = fs.unlinkSync;
  let candidateFailureInjected = false;
  fs.unlinkSync = (filename) => {
    if (
      !candidateFailureInjected &&
      String(filename).includes('/candidates/')
    ) {
      candidateFailureInjected = true;
      throw new Error('PRIVATE-ERROR-MUST-NOT-PERSIST');
    }
    return originalUnlinkSync(filename);
  };
  try {
    assert.throws(
      () => cleanupLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: CLEANED_AT },
      ),
      /PRIVATE-ERROR-MUST-NOT-PERSIST/,
    );
  } finally {
    fs.unlinkSync = originalUnlinkSync;
  }
  try {
    assert.equal(candidateFailureInjected, true);
    assert.equal(fs.existsSync(fixture.workspaceRoot), false);
    assert.equal(fs.existsSync(fixture.candidateRoot), true);
    const request = buildCleanupRequest(fixture);
    const receipt = recoverLocalTrainingFailure({
      cleanupRequest: request,
      recoveredAt: '2026-07-22T04:00:04.000Z',
      repoDir: fixture.repoDir,
    });

    assert.equal(receipt.status, 'failed-cleaned');
    assert.equal(receipt.candidatePreserved, false);
    assert.equal(fs.existsSync(fixture.candidateRoot), false);
    assert.deepEqual(
      recoverLocalTrainingFailure({
        cleanupRequest: request,
        recoveredAt: '2026-07-22T05:00:00.000Z',
        repoDir: fixture.repoDir,
      }),
      receipt,
    );

    const records = fs.readdirSync(fixture.operationRoot)
      .filter((filename) => filename.endsWith('.json'))
      .map((filename) => fs.readFileSync(
        path.join(fixture.operationRoot, filename),
        'utf8',
      ))
      .join('\n');
    assert.equal(records.includes(fixture.repoDir), false);
    assert.equal(records.includes('PRIVATE-F1-TRAINING-ROW'), false);
    assert.equal(records.includes('PRIVATE-ERROR-MUST-NOT-PERSIST'), false);
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery refuses stale cleanup requests after state advances', () => {
  const fixture = createFixture();
  try {
    publishCandidate(fixture);
    const originalRmdirSync = fs.rmdirSync;
    let failureInjected = false;
    fs.rmdirSync = (directory) => {
      if (
        !failureInjected &&
        path.basename(String(directory)) ===
          path.basename(fixture.workspaceRoot) &&
        String(directory).includes('/workspaces/')
      ) {
        failureInjected = true;
        throw new Error('injected workspace removal failure');
      }
      return originalRmdirSync(directory);
    };
    try {
      assert.throws(
        () => cleanupLocalTrainingFailureRecovery(
          fixture.operation,
          { completedAt: CLEANED_AT },
        ),
        /workspace removal failure/,
      );
    } finally {
      fs.rmdirSync = originalRmdirSync;
    }
    const staleRequest = buildCleanupRequest(fixture);
    const originalUnlinkSync = fs.unlinkSync;
    fs.unlinkSync = (filename) => {
      if (String(filename).includes('/candidates/')) {
        throw new Error('injected candidate removal failure');
      }
      return originalUnlinkSync(filename);
    };
    try {
      assert.throws(
        () => cleanupLocalTrainingFailureRecovery(
          fixture.operation,
          { completedAt: CLEANED_AT },
        ),
        /candidate removal failure/,
      );
    } finally {
      fs.unlinkSync = originalUnlinkSync;
    }
    assert.throws(
      () => recoverLocalTrainingFailure({
        cleanupRequest: staleRequest,
        recoveredAt: '2026-07-22T04:00:04.000Z',
        repoDir: fixture.repoDir,
      }),
      /stale or unbound/,
    );
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery refuses cleanup authorization for a live operation', () => {
  const fixture = createFixture();
  try {
    publishCandidate(fixture);
    assert.throws(
      () => buildCleanupRequest(fixture),
      /not eligible for recovery/,
    );
    assert.equal(fs.existsSync(fixture.workspaceRoot), true);
    assert.equal(fs.existsSync(fixture.candidateRoot), true);
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery never records a relocated workspace as removed', () => {
  const fixture = createFixture();
  try {
    publishCandidate(fixture);
    const relocatedWorkspace = `${fixture.workspaceRoot}-relocated`;
    fs.renameSync(fixture.workspaceRoot, relocatedWorkspace);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      assert.throws(
        () => cleanupLocalTrainingFailureRecovery(
          fixture.operation,
          { completedAt: CLEANED_AT },
        ),
        /tree root must be a directory/,
      );
    }
    const state = JSON.parse(fs.readFileSync(
      path.join(fixture.operationRoot, 'state.json'),
      'utf8',
    ));
    assert.equal(state.phase, 'published');
    assert.equal(fs.existsSync(relocatedWorkspace), true);
    assert.equal(fs.existsSync(fixture.candidateRoot), true);
    assert.equal(
      fs.existsSync(path.join(fixture.operationRoot, 'receipt.json')),
      false,
    );
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery refuses an unrelated candidate manifest hash', () => {
  const fixture = createFixture();
  try {
    const stagedCandidate = path.join(
      fixture.workspaceRoot,
      'candidate',
    );
    fs.mkdirSync(stagedCandidate, { mode: 0o700 });
    fs.chmodSync(stagedCandidate, 0o700);
    writePrivateFile(
      path.join(stagedCandidate, 'candidate-manifest.json'),
      '{"candidate":"fixture"}\n',
    );

    assert.throws(
      () => markLocalTrainingFailureRecoveryPublishIntent(
        fixture.operation,
        {
          candidateManifestHash: hash('unrelated manifest'),
          stagedCandidateRoot: stagedCandidate,
          updatedAt: PUBLISHED_AT,
        },
      ),
      /candidate manifest hash drifted/,
    );
    const state = JSON.parse(fs.readFileSync(
      path.join(fixture.operationRoot, 'state.json'),
      'utf8',
    ));
    assert.equal(state.phase, 'preparing');
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery cleans a publish intent whose rename never happened', () => {
  const fixture = createFixture();
  try {
    const stagedCandidate = path.join(
      fixture.workspaceRoot,
      'candidate',
    );
    fs.mkdirSync(stagedCandidate, { mode: 0o700 });
    fs.chmodSync(stagedCandidate, 0o700);
    const candidateManifestContent = '{"candidate":"fixture"}\n';
    writePrivateFile(
      path.join(stagedCandidate, 'candidate-manifest.json'),
      candidateManifestContent,
    );
    markLocalTrainingFailureRecoveryPublishIntent(
      fixture.operation,
      {
        candidateManifestHash: hash(candidateManifestContent),
        stagedCandidateRoot: stagedCandidate,
        updatedAt: PUBLISHED_AT,
      },
    );

    const receipt = cleanupLocalTrainingFailureRecovery(
      fixture.operation,
      { completedAt: CLEANED_AT },
    );
    const state = JSON.parse(fs.readFileSync(
      path.join(fixture.operationRoot, 'state.json'),
      'utf8',
    ));
    assert.equal(receipt.status, 'failed-cleaned');
    assert.equal(state.phase, 'candidate-removed');
    assert.equal(state.candidateBinding, null);
    assert.equal(fs.existsSync(fixture.workspaceRoot), false);
    assert.equal(fs.existsSync(fixture.candidateRoot), false);
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery rolls back a rename before publish confirmation', () => {
  const fixture = createFixture();
  try {
    const stagedCandidate = path.join(
      fixture.workspaceRoot,
      'candidate',
    );
    fs.mkdirSync(stagedCandidate, { mode: 0o700 });
    fs.chmodSync(stagedCandidate, 0o700);
    const candidateManifestContent = '{"candidate":"fixture"}\n';
    writePrivateFile(
      path.join(stagedCandidate, 'candidate-manifest.json'),
      candidateManifestContent,
    );
    markLocalTrainingFailureRecoveryPublishIntent(
      fixture.operation,
      {
        candidateManifestHash: hash(candidateManifestContent),
        stagedCandidateRoot: stagedCandidate,
        updatedAt: PUBLISHED_AT,
      },
    );
    fs.renameSync(stagedCandidate, fixture.candidateRoot);

    const receipt = cleanupLocalTrainingFailureRecovery(
      fixture.operation,
      { completedAt: CLEANED_AT },
    );
    const state = JSON.parse(fs.readFileSync(
      path.join(fixture.operationRoot, 'state.json'),
      'utf8',
    ));
    assert.equal(receipt.status, 'failed-cleaned');
    assert.equal(state.phase, 'candidate-removed');
    assert.notEqual(state.candidateBinding, null);
    assert.equal(fs.existsSync(fixture.workspaceRoot), false);
    assert.equal(fs.existsSync(fixture.candidateRoot), false);
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery retries after interrupted claim publication', () => {
  const fixture = createFixture();
  const originalRmdirSync = fs.rmdirSync;
  const originalLinkSync = fs.linkSync;
  try {
    publishCandidate(fixture);
    fs.rmdirSync = (directory) => {
      if (
        path.basename(String(directory)) ===
          path.basename(fixture.workspaceRoot) &&
        String(directory).includes('/workspaces/')
      ) {
        throw new Error('injected workspace removal failure');
      }
      return originalRmdirSync(directory);
    };
    assert.throws(
      () => cleanupLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: CLEANED_AT },
      ),
      /workspace removal failure/,
    );
    fs.rmdirSync = originalRmdirSync;
    const request = buildCleanupRequest(fixture);
    let claimFailureInjected = false;
    fs.linkSync = (source, destination) => {
      if (
        !claimFailureInjected &&
        path.basename(String(destination)) === 'claim.json'
      ) {
        claimFailureInjected = true;
        throw new Error('injected claim publication failure');
      }
      return originalLinkSync(source, destination);
    };
    assert.throws(
      () => recoverLocalTrainingFailure({
        cleanupRequest: request,
        recoveredAt: '2026-07-22T04:00:04.000Z',
        repoDir: fixture.repoDir,
      }),
      /claim publication failure/,
    );
    fs.linkSync = originalLinkSync;

    const receipt = recoverLocalTrainingFailure({
      cleanupRequest: request,
      recoveredAt: '2026-07-22T04:00:05.000Z',
      repoDir: fixture.repoDir,
    });
    assert.equal(claimFailureInjected, true);
    assert.equal(receipt.status, 'failed-cleaned');
    assert.equal(fs.existsSync(fixture.workspaceRoot), false);
    assert.equal(fs.existsSync(fixture.candidateRoot), false);
  } finally {
    fs.rmdirSync = originalRmdirSync;
    fs.linkSync = originalLinkSync;
    fixture.cleanup();
  }
});

test('local training recovery releases its claim after cleanup failure', () => {
  const fixture = createFixture();
  const originalRmdirSync = fs.rmdirSync;
  try {
    publishCandidate(fixture);
    let preparationFailureInjected = false;
    fs.rmdirSync = (directory) => {
      if (
        !preparationFailureInjected &&
        path.basename(String(directory)) ===
          path.basename(fixture.workspaceRoot) &&
        String(directory).includes('/workspaces/')
      ) {
        preparationFailureInjected = true;
        throw new Error('injected preparation cleanup failure');
      }
      return originalRmdirSync(directory);
    };
    assert.throws(
      () => cleanupLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: CLEANED_AT },
      ),
      /preparation cleanup failure/,
    );
    fs.rmdirSync = originalRmdirSync;
    const request = buildCleanupRequest(fixture);
    let recoveryFailureInjected = false;
    fs.rmdirSync = (directory) => {
      if (
        !recoveryFailureInjected &&
        path.basename(String(directory)) ===
          path.basename(fixture.workspaceRoot) &&
        String(directory).includes('/workspaces/')
      ) {
        recoveryFailureInjected = true;
        throw new Error('injected claimed cleanup failure');
      }
      return originalRmdirSync(directory);
    };
    assert.throws(
      () => recoverLocalTrainingFailure({
        cleanupRequest: request,
        recoveredAt: '2026-07-22T04:00:04.000Z',
        repoDir: fixture.repoDir,
      }),
      /claimed cleanup failure/,
    );
    fs.rmdirSync = originalRmdirSync;
    const claimEdges = fs.readdirSync(fixture.operationRoot)
      .filter((filename) => filename.startsWith('claim-edge-'));
    assert.equal(
      fs.existsSync(path.join(fixture.operationRoot, 'claim.json')),
      true,
    );
    assert.equal(claimEdges.length, 1);
    assert.equal(
      JSON.parse(fs.readFileSync(
        path.join(fixture.operationRoot, claimEdges[0]),
        'utf8',
      )).kind,
      'release',
    );

    const receipt = recoverLocalTrainingFailure({
      cleanupRequest: request,
      recoveredAt: '2026-07-22T04:00:05.000Z',
      repoDir: fixture.repoDir,
    });
    assert.equal(recoveryFailureInjected, true);
    assert.equal(receipt.status, 'failed-cleaned');
  } finally {
    fs.rmdirSync = originalRmdirSync;
    fixture.cleanup();
  }
});

test('local training recovery gives one winner for concurrent stale claim takeover', () => {
  const fixture = createFixture();
  const originalLinkSync = fs.linkSync;
  const originalRmdirSync = fs.rmdirSync;
  try {
    publishCandidate(fixture);
    fs.rmdirSync = (directory) => {
      if (String(directory).includes('/workspaces/')) {
        throw new Error('injected workspace cleanup failure');
      }
      return originalRmdirSync(directory);
    };
    assert.throws(
      () => cleanupLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: CLEANED_AT },
      ),
      /workspace cleanup failure/,
    );
    fs.rmdirSync = originalRmdirSync;

    const firstRequest = buildLocalTrainingFailureCleanupRequest({
      expiresAt: '2026-07-22T04:10:00.000Z',
      operationId: fixture.operation.operationId,
      repoDir: fixture.repoDir,
      requestedAt: '2026-07-22T04:00:03.000Z',
      requestedBy: fixture.bindings.rollbackOwner,
    });
    const secondRequest = buildLocalTrainingFailureCleanupRequest({
      expiresAt: '2026-07-22T04:11:00.000Z',
      operationId: fixture.operation.operationId,
      repoDir: fixture.repoDir,
      requestedAt: '2026-07-22T04:00:03.000Z',
      requestedBy: fixture.bindings.rollbackOwner,
    });
    const staleClaimContent = {
      cleanupRequestHash: hash('stale-cleanup-request'),
      claimedAt: '2026-07-22T04:00:03.000Z',
      kind: 'claim',
      operationId: fixture.operation.operationId,
      ownerBootIdentityHash: null,
      ownerProcessId: 2147483647,
      previousNodeHash: null,
    };
    const staleClaim = {
      ...staleClaimContent,
      nodeHash: hash(JSON.stringify(staleClaimContent)),
    };
    writePrivateFile(
      path.join(fixture.operationRoot, 'claim.json'),
      `${JSON.stringify(staleClaim, null, 2)}\n`,
    );

    let secondReceipt = null;
    let takeoverIntercepted = false;
    fs.linkSync = (source, destination) => {
      if (
        !takeoverIntercepted &&
        path.basename(String(destination)) ===
          `claim-edge-${staleClaim.nodeHash}.json`
      ) {
        takeoverIntercepted = true;
        secondReceipt = recoverLocalTrainingFailure({
          cleanupRequest: secondRequest,
          recoveredAt: '2026-07-22T04:00:04.000Z',
          repoDir: fixture.repoDir,
        });
      }
      return originalLinkSync(source, destination);
    };

    assert.throws(
      () => recoverLocalTrainingFailure({
        cleanupRequest: firstRequest,
        recoveredAt: '2026-07-22T04:00:04.000Z',
        repoDir: fixture.repoDir,
      }),
      /already claimed/,
    );
    assert.equal(takeoverIntercepted, true);
    assert.equal(secondReceipt.status, 'failed-cleaned');
    assert.equal(
      secondReceipt.cleanupRequestHash,
      secondRequest.requestHash,
    );
    assert.equal(fs.existsSync(fixture.workspaceRoot), false);
    assert.equal(fs.existsSync(fixture.candidateRoot), false);
  } finally {
    fs.linkSync = originalLinkSync;
    fs.rmdirSync = originalRmdirSync;
    fixture.cleanup();
  }
});

test('local training recovery rejects forged intent records before cleanup', () => {
  const fixture = createFixture();
  try {
    publishCandidate(fixture);
    const intentPath = path.join(fixture.operationRoot, 'intent.json');
    const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
    intent.contractHash = hash('forged-contract');
    fs.writeFileSync(intentPath, `${JSON.stringify(intent, null, 2)}\n`);
    fs.chmodSync(intentPath, 0o600);

    assert.throws(
      () => buildCleanupRequest(fixture),
      /intent failed integrity/,
    );
    assert.equal(fs.existsSync(fixture.workspaceRoot), true);
    assert.equal(fs.existsSync(fixture.candidateRoot), true);
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery preserves a candidate whose root identity drifted', () => {
  const fixture = createFixture();
  try {
    publishCandidate(fixture);
    const originalCandidate = `${fixture.candidateRoot}-original`;
    fs.renameSync(fixture.candidateRoot, originalCandidate);
    fs.mkdirSync(fixture.candidateRoot, { mode: 0o700 });
    fs.chmodSync(fixture.candidateRoot, 0o700);
    writePrivateFile(
      path.join(fixture.candidateRoot, 'unrelated.txt'),
      'must remain',
    );

    assert.throws(
      () => cleanupLocalTrainingFailureRecovery(
        fixture.operation,
        { completedAt: CLEANED_AT },
      ),
      /candidate identity drifted before cleanup/,
    );
    assert.equal(
      fs.readFileSync(
        path.join(fixture.candidateRoot, 'unrelated.txt'),
        'utf8',
      ),
      'must remain',
    );
    assert.equal(fs.existsSync(originalCandidate), true);
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery rejects a published sibling path', () => {
  const fixture = createFixture();
  try {
    const stagedCandidate = path.join(
      fixture.workspaceRoot,
      'candidate',
    );
    fs.mkdirSync(stagedCandidate, { mode: 0o700 });
    fs.chmodSync(stagedCandidate, 0o700);
    writePrivateFile(
      path.join(stagedCandidate, 'candidate-manifest.json'),
      '{"candidate":"fixture"}\n',
    );
    markLocalTrainingFailureRecoveryPublishIntent(
      fixture.operation,
      {
        candidateManifestHash: hash('{"candidate":"fixture"}\n'),
        stagedCandidateRoot: stagedCandidate,
        updatedAt: PUBLISHED_AT,
      },
    );
    const siblingCandidateRoot = path.join(
      fixture.candidateParent,
      `${fixture.approvalId}-sibling`,
    );
    fs.renameSync(stagedCandidate, siblingCandidateRoot);

    assert.throws(
      () => markLocalTrainingFailureRecoveryPublished(
        fixture.operation,
        {
          candidateRoot: siblingCandidateRoot,
          updatedAt: PUBLISHED_AT,
        },
      ),
      /published candidate path drifted/,
    );
    assert.equal(fs.existsSync(siblingCandidateRoot), true);
    assert.equal(fs.existsSync(fixture.candidateRoot), false);
  } finally {
    fixture.cleanup();
  }
});

test('local training recovery advances publish only after parent sync', () => {
  const fixture = createFixture();
  const originalFsyncSync = fs.fsyncSync;
  try {
    const stagedCandidate = path.join(
      fixture.workspaceRoot,
      'candidate',
    );
    fs.mkdirSync(stagedCandidate, { mode: 0o700 });
    fs.chmodSync(stagedCandidate, 0o700);
    writePrivateFile(
      path.join(stagedCandidate, 'candidate-manifest.json'),
      '{"candidate":"fixture"}\n',
    );
    markLocalTrainingFailureRecoveryPublishIntent(
      fixture.operation,
      {
        candidateManifestHash: hash('{"candidate":"fixture"}\n'),
        stagedCandidateRoot: stagedCandidate,
        updatedAt: PUBLISHED_AT,
      },
    );
    fs.renameSync(stagedCandidate, fixture.candidateRoot);
    const candidateParentIdentity = fs.statSync(fixture.candidateParent);
    let syncFailureInjected = false;
    fs.fsyncSync = (descriptor) => {
      const current = fs.fstatSync(descriptor);
      if (
        !syncFailureInjected &&
        current.isDirectory() &&
        current.dev === candidateParentIdentity.dev &&
        current.ino === candidateParentIdentity.ino
      ) {
        syncFailureInjected = true;
        throw new Error('injected candidate parent sync failure');
      }
      return originalFsyncSync(descriptor);
    };

    assert.throws(
      () => markLocalTrainingFailureRecoveryPublished(
        fixture.operation,
        {
          candidateRoot: fixture.candidateRoot,
          updatedAt: PUBLISHED_AT,
        },
      ),
      /candidate parent sync failure/,
    );
    const state = JSON.parse(fs.readFileSync(
      path.join(fixture.operationRoot, 'state.json'),
      'utf8',
    ));
    assert.equal(state.phase, 'publish-intent');
    assert.equal(syncFailureInjected, true);

    fs.fsyncSync = originalFsyncSync;
    markLocalTrainingFailureRecoveryPublished(
      fixture.operation,
      {
        candidateRoot: fixture.candidateRoot,
        updatedAt: PUBLISHED_AT,
      },
    );
  } finally {
    fs.fsyncSync = originalFsyncSync;
    fixture.cleanup();
  }
});

test('local training recovery syncs both sides of candidate publication', () => {
  const fixture = createFixture();
  const originalFsyncSync = fs.fsyncSync;
  try {
    const stagedCandidate = path.join(
      fixture.workspaceRoot,
      'candidate',
    );
    fs.mkdirSync(stagedCandidate, { mode: 0o700 });
    fs.chmodSync(stagedCandidate, 0o700);
    const candidateManifestContent = '{"candidate":"fixture"}\n';
    writePrivateFile(
      path.join(stagedCandidate, 'candidate-manifest.json'),
      candidateManifestContent,
    );
    markLocalTrainingFailureRecoveryPublishIntent(
      fixture.operation,
      {
        candidateManifestHash: hash(candidateManifestContent),
        stagedCandidateRoot: stagedCandidate,
        updatedAt: PUBLISHED_AT,
      },
    );
    fs.renameSync(stagedCandidate, fixture.candidateRoot);
    const candidateParentIdentity = fs.statSync(fixture.candidateParent);
    const workspaceIdentity = fs.statSync(fixture.workspaceRoot);
    let candidateParentSynced = false;
    let workspaceSynced = false;
    fs.fsyncSync = (descriptor) => {
      const current = fs.fstatSync(descriptor);
      if (
        current.isDirectory() &&
        current.dev === candidateParentIdentity.dev &&
        current.ino === candidateParentIdentity.ino
      ) {
        candidateParentSynced = true;
      }
      if (
        current.isDirectory() &&
        current.dev === workspaceIdentity.dev &&
        current.ino === workspaceIdentity.ino
      ) {
        workspaceSynced = true;
      }
      return originalFsyncSync(descriptor);
    };

    markLocalTrainingFailureRecoveryPublished(
      fixture.operation,
      {
        candidateRoot: fixture.candidateRoot,
        updatedAt: PUBLISHED_AT,
      },
    );
    assert.equal(candidateParentSynced, true);
    assert.equal(workspaceSynced, true);
  } finally {
    fs.fsyncSync = originalFsyncSync;
    fixture.cleanup();
  }
});

test('local training recovery rejects linked entries and forged handles', () => {
  const fixture = createFixture();
  try {
    const dataRoot = path.join(fixture.workspaceRoot, 'data');
    const stagedCandidate = path.join(fixture.workspaceRoot, 'candidate');
    fs.mkdirSync(dataRoot, { mode: 0o700 });
    fs.mkdirSync(stagedCandidate, { mode: 0o700 });
    fs.chmodSync(dataRoot, 0o700);
    fs.chmodSync(stagedCandidate, 0o700);
    const source = path.join(stagedCandidate, 'manifest.json');
    writePrivateFile(source, '{}\n');
    fs.linkSync(source, path.join(stagedCandidate, 'manifest-hardlink.json'));

    assert.throws(
      () => markLocalTrainingFailureRecoveryPublishIntent(
        fixture.operation,
        {
          candidateManifestHash: hash('candidate-manifest'),
          stagedCandidateRoot: stagedCandidate,
          updatedAt: PUBLISHED_AT,
        },
      ),
      /unlinked regular entries/,
    );
    assert.throws(
      () => commitLocalTrainingFailureRecovery(
        Object.freeze({ operationId: fixture.operation.operationId }),
        { completedAt: CLEANED_AT },
      ),
      /module-issued operation/,
    );
  } finally {
    fixture.cleanup();
  }
});
