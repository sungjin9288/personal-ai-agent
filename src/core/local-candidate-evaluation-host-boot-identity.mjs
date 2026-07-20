import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

export const LOCAL_CANDIDATE_EVALUATION_HOST_BOOT_IDENTITY_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-host-boot-identity/v1';

const LINUX_BOOT_ID_PATH =
  '/proc/sys/kernel/random/boot_id';
const MAX_IDENTITY_BYTES = 4 * 1024;

function hashValue(value) {
  return createHash('sha256')
    .update(value)
    .digest('hex');
}

function unavailableIdentity() {
  return {
    available: false,
    identityHash: null,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_HOST_BOOT_IDENTITY_SCHEMA_VERSION,
    source: 'unavailable',
  };
}

function availableIdentity(source, value) {
  return {
    available: true,
    identityHash: hashValue(value),
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_HOST_BOOT_IDENTITY_SCHEMA_VERSION,
    source,
  };
}

function readLinuxBootIdentity(fileSystem) {
  const value = String(
    fileSystem.readFileSync(
      LINUX_BOOT_ID_PATH,
      'utf8',
    ),
  ).trim().toLowerCase();
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(
      value,
    )
  ) {
    return unavailableIdentity();
  }
  return availableIdentity(
    'linux-proc-boot-id',
    `linux:${value}`,
  );
}

function readDarwinBootIdentity(runCommand) {
  const result = runCommand(
    '/usr/sbin/sysctl',
    ['-n', 'kern.boottime'],
    {
      encoding: 'utf8',
      maxBuffer: MAX_IDENTITY_BYTES,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1_000,
    },
  );
  if (
    result?.status !== 0 ||
    result?.error ||
    result?.signal
  ) {
    return unavailableIdentity();
  }
  const value = String(result.stdout || '').trim();
  const match = value.match(
    /^\{\s*sec\s*=\s*(\d+),\s*usec\s*=\s*(\d+)\s*\}/u,
  );
  if (!match) {
    return unavailableIdentity();
  }
  const seconds = Number(match[1]);
  const microseconds = Number(match[2]);
  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    !Number.isSafeInteger(microseconds) ||
    microseconds < 0 ||
    microseconds > 999_999
  ) {
    return unavailableIdentity();
  }
  return availableIdentity(
    'darwin-kern-boottime',
    `darwin:${seconds}:${microseconds}`,
  );
}

export function assertLocalCandidateEvaluationHostBootIdentity(
  identity,
) {
  const expectedKeys = [
    'available',
    'identityHash',
    'schemaVersion',
    'source',
  ];
  if (
    !identity ||
    typeof identity !== 'object' ||
    Array.isArray(identity) ||
    Object.keys(identity).length !== expectedKeys.length ||
    Object.keys(identity).some(
      (key) => !expectedKeys.includes(key),
    ) ||
    identity.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_HOST_BOOT_IDENTITY_SCHEMA_VERSION ||
    typeof identity.available !== 'boolean' ||
    ![
      'darwin-kern-boottime',
      'linux-proc-boot-id',
      'unavailable',
    ].includes(identity.source) ||
    (identity.available &&
      (!/^[a-f0-9]{64}$/u.test(
        identity.identityHash,
      ) ||
        identity.source === 'unavailable')) ||
    (!identity.available &&
      (identity.identityHash !== null ||
        identity.source !== 'unavailable'))
  ) {
    throw new Error(
      'Local candidate evaluation host boot identity failed: integrity.',
    );
  }
  return identity;
}

export function readLocalCandidateEvaluationHostBootIdentity({
  fileSystem = fs,
  platform = process.platform,
  runCommand = spawnSync,
} = {}) {
  try {
    const identity =
      platform === 'linux'
        ? readLinuxBootIdentity(fileSystem)
        : platform === 'darwin'
          ? readDarwinBootIdentity(runCommand)
          : unavailableIdentity();
    return assertLocalCandidateEvaluationHostBootIdentity(
      identity,
    );
  } catch {
    return unavailableIdentity();
  }
}
