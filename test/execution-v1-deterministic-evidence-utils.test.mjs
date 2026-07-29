import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  currentDeterministicProvenance,
  readReusedDeterministicProvenance,
} from '../scripts/execution-v1-deterministic-evidence-utils.mjs';

test('reused deterministic provenance preserves the original source and states the no-rerun boundary', () => {
  assert.deepEqual(readReusedDeterministicProvenance([
    '# Execution v1 Evidence',
    '',
    '- generatedAt: 2026-07-01T00:00:00.000Z',
    '- commit: 0123456789abcdef0123456789abcdef01234567',
    '',
  ].join('\n')), {
    deterministicEvidenceReuseReason: 'ui-http-unchanged-browser-excluded',
    deterministicEvidenceSourceCommit: '0123456789abcdef0123456789abcdef01234567',
    deterministicEvidenceSourceGeneratedAt: '2026-07-01T00:00:00.000Z',
    deterministicEvidenceStatus: 'reused-existing-not-rerun',
  });
  assert.deepEqual(currentDeterministicProvenance(), {
    deterministicEvidenceStatus: 'current-run',
  });
});

test('reused deterministic provenance fails closed when original source metadata is missing or malformed', () => {
  assert.throws(() => readReusedDeterministicProvenance('- commit: missing\n'), /source commit and generatedAt/);
  assert.throws(() => readReusedDeterministicProvenance([
    '- generatedAt: not-a-timestamp',
    '- commit: 0123456789abcdef0123456789abcdef01234567',
  ].join('\n')), /source commit and generatedAt/);
  assert.throws(() => readReusedDeterministicProvenance([
    '- generatedAt: 2026-07-01T00:00:00.000Z',
    '- commit: short',
  ].join('\n')), /source commit and generatedAt/);
});
