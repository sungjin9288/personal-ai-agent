import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractBulletValue,
  extractBulletsAfterLabel,
  extractChecklistItems,
  extractDeterministicItems,
  extractDeterministicRuntimeItems,
  extractLiveValidationItems,
  extractMarkdownSection,
  extractPlainStatus,
  extractReferenceAdoptionAggregate,
  extractSectionBullets,
  extractStatusMap,
} from '../src/web/release-markdown-parser.mjs';

test('release metadata and sections are extracted without surrounding markdown', () => {
  const markdown = `# Release

- releaseLabel: pilot-2026-07
- generatedAt: 2026-07-14T00:00:00.000Z

### Production Ready

Status: blocked.

Blockers:

- target evidence is missing
- approval is pending

## Current Status

- local provider: ready
- openai provider: archived evidence
`;

  assert.equal(extractBulletValue(markdown, 'releaseLabel'), 'pilot-2026-07');
  assert.equal(extractBulletValue(markdown, 'missing'), '');
  assert.deepEqual(extractSectionBullets(markdown, 'Current Status'), [
    'local provider: ready',
    'openai provider: archived evidence',
  ]);

  const productionReady = extractMarkdownSection(markdown, 'Production Ready', 3);
  assert.equal(extractPlainStatus(productionReady), 'blocked');
  assert.deepEqual(extractBulletsAfterLabel(productionReady, 'Blockers'), [
    'target evidence is missing',
    'approval is pending',
  ]);
});

test('closeout checklist and current status preserve labels and values', () => {
  const markdown = `## Closeout Checklist

- [x] deterministic verification
- [ ] target-boundary validation
- ignored prose

## Current Status

- deterministic verification: ready
- target-boundary validation: blocked: missing-env
- line without a value
`;

  assert.deepEqual(extractChecklistItems(markdown), [
    { done: true, label: 'deterministic verification' },
    { done: false, label: 'target-boundary validation' },
  ]);
  assert.deepEqual(extractStatusMap(markdown), {
    'deterministic verification': 'ready',
    'target-boundary validation': 'blocked: missing-env',
  });
});

test('live and deterministic verification rows keep their established separators', () => {
  const markdown = `## Live Validation

- openai: archived-success
- no configured live provider

## Deterministic Verification

- smoke:execution-v1-status: passed
- malformed verification row

## Deterministic Runtime Summary

- smoke:execution-v1-status: 1.2s elapsed, stdout 2 lines, stderr 0 lines, timeout 120s
- runtime summary unavailable
`;

  assert.deepEqual(extractLiveValidationItems(markdown), [
    { provider: 'openai', status: 'archived-success' },
    { provider: 'summary', status: 'no configured live provider' },
  ]);
  assert.deepEqual(extractDeterministicItems(markdown), [
    { script: 'smoke:execution-v1-status', status: 'passed' },
    { script: 'malformed verification row', status: 'unknown' },
  ]);
  assert.deepEqual(extractDeterministicRuntimeItems(markdown), [
    {
      elapsed: '1.2s',
      script: 'smoke:execution-v1-status',
      stderr: '0 lines',
      stdout: '2 lines',
      summary: '1.2s elapsed, stdout 2 lines, stderr 0 lines, timeout 120s',
      timeout: '120s',
    },
    { script: 'runtime summary unavailable', summary: 'runtime summary unavailable' },
  ]);
});

test('reference adoption aggregate keeps counts, durations, and timeout evidence', () => {
  const markdown = `## Reference Adoption Aggregate

- scriptCount: 2
- totalDuration: 4.2s
- ok: true
- scripts/check-one.mjs: passed (1.2s, timeout 30s, timedOut false)
- scripts/check-two.mjs: failed
`;

  assert.deepEqual(extractReferenceAdoptionAggregate(markdown), {
    ok: true,
    scriptCount: 2,
    scripts: [
      {
        duration: '1.2s',
        script: 'scripts/check-one.mjs',
        status: 'passed',
        timedOut: false,
        timeout: '30s',
      },
      {
        duration: null,
        script: 'scripts/check-two.mjs',
        status: 'failed',
        timedOut: null,
        timeout: null,
      },
    ],
    totalDuration: '4.2s',
  });
});

test('missing or malformed release markdown returns stable empty values', () => {
  assert.equal(extractMarkdownSection('', 'Missing'), '');
  assert.equal(extractPlainStatus(null), '');
  assert.deepEqual(extractSectionBullets(undefined, 'Missing'), []);
  assert.deepEqual(extractBulletsAfterLabel('', 'Blockers'), []);
  assert.deepEqual(extractChecklistItems('## Notes\n\n- none'), []);
  assert.deepEqual(extractStatusMap(''), {});
  assert.deepEqual(extractLiveValidationItems(''), []);
  assert.deepEqual(extractDeterministicItems(''), []);
  assert.deepEqual(extractDeterministicRuntimeItems(''), []);
  assert.deepEqual(extractReferenceAdoptionAggregate(''), {
    ok: null,
    scriptCount: 0,
    scripts: [],
    totalDuration: null,
  });
});
