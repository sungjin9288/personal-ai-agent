import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalCandidateEvaluationHostBootIdentity,
  readLocalCandidateEvaluationHostBootIdentity,
} from '../src/core/local-candidate-evaluation-host-boot-identity.mjs';

function hashValue(value) {
  return createHash('sha256')
    .update(value)
    .digest('hex');
}

test('linux boot identity uses the exact kernel boot id without exposing it', () => {
  const bootId = '12345678-1234-4abc-8def-1234567890ab';
  const identity =
    readLocalCandidateEvaluationHostBootIdentity({
      fileSystem: {
        readFileSync(filePath, encoding) {
          assert.equal(
            filePath,
            '/proc/sys/kernel/random/boot_id',
          );
          assert.equal(encoding, 'utf8');
          return `${bootId}\n`;
        },
      },
      platform: 'linux',
    });

  assert.equal(identity.available, true);
  assert.equal(
    identity.identityHash,
    hashValue(`linux:${bootId}`),
  );
  assert.equal(identity.source, 'linux-proc-boot-id');
  assert.equal(JSON.stringify(identity).includes(bootId), false);
  assertLocalCandidateEvaluationHostBootIdentity(identity);
});

test('darwin boot identity uses the exact kern.boottime tuple', () => {
  const identity =
    readLocalCandidateEvaluationHostBootIdentity({
      platform: 'darwin',
      runCommand(command, args, options) {
        assert.equal(command, '/usr/sbin/sysctl');
        assert.deepEqual(args, ['-n', 'kern.boottime']);
        assert.equal(options.timeout, 1_000);
        return {
          status: 0,
          stderr: '',
          stdout:
            '{ sec = 1782967128, usec = 156127 } Thu Jul  2 13:38:48 2026\n',
        };
      },
    });

  assert.equal(identity.available, true);
  assert.equal(
    identity.identityHash,
    hashValue('darwin:1782967128:156127'),
  );
  assert.equal(
    identity.source,
    'darwin-kern-boottime',
  );
  assert.equal(
    JSON.stringify(identity).includes('1782967128'),
    false,
  );
});

test('unsupported, malformed, and failed identity sources stay unavailable', () => {
  const cases = [
    readLocalCandidateEvaluationHostBootIdentity({
      platform: 'win32',
    }),
    readLocalCandidateEvaluationHostBootIdentity({
      platform: 'linux',
      fileSystem: {
        readFileSync() {
          return 'not-a-kernel-boot-id';
        },
      },
    }),
    readLocalCandidateEvaluationHostBootIdentity({
      platform: 'darwin',
      runCommand() {
        throw new Error('sysctl unavailable');
      },
    }),
  ];

  for (const identity of cases) {
    assert.deepEqual(identity, {
      available: false,
      identityHash: null,
      schemaVersion:
        'personal-ai-agent-local-candidate-evaluation-host-boot-identity/v1',
      source: 'unavailable',
    });
  }
});

test('boot identity integrity rejects raw or mismatched metadata', () => {
  assert.throws(
    () =>
      assertLocalCandidateEvaluationHostBootIdentity({
        available: true,
        identityHash: 'raw-boot-id',
        schemaVersion:
          'personal-ai-agent-local-candidate-evaluation-host-boot-identity/v1',
        source: 'linux-proc-boot-id',
      }),
    /host boot identity failed: integrity/u,
  );
});
