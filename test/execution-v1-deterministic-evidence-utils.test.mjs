import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
    deterministicEvidenceReuseReason: 'execution-v1-archived-evidence-browser-excluded',
    deterministicEvidenceSourceCommit: '0123456789abcdef0123456789abcdef01234567',
    deterministicEvidenceSourceGeneratedAt: '2026-07-01T00:00:00.000Z',
    deterministicEvidenceStatus: 'reused-existing-not-rerun',
  });
  assert.deepEqual(currentDeterministicProvenance(), {
    deterministicEvidenceStatus: 'current-run',
  });
});

test('repeated reuse retains archived source metadata without claiming UI or HTTP are unchanged', () => {
  assert.deepEqual(readReusedDeterministicProvenance([
    '- generatedAt: 2026-09-30T00:00:00.000Z',
    '- commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '- deterministicEvidenceSourceGeneratedAt: 2026-07-01T00:00:00.000Z',
    '- deterministicEvidenceSourceCommit: 0123456789abcdef0123456789abcdef01234567',
    '- deterministicEvidenceReuseReason: execution-v1-ui-http-unchanged-browser-excluded',
  ].join('\n')), {
    deterministicEvidenceReuseReason: 'execution-v1-archived-evidence-browser-excluded',
    deterministicEvidenceSourceCommit: '0123456789abcdef0123456789abcdef01234567',
    deterministicEvidenceSourceGeneratedAt: '2026-07-01T00:00:00.000Z',
    deterministicEvidenceStatus: 'reused-existing-not-rerun',
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

test('reuse provenance smoke accepts neutral archived evidence and rejects the old reason in every artifact', () => {
  withProvenanceFixture('reused-existing-not-rerun', ({ run, documentPaths, snapshotPath }) => {
    const accepted = run();
    assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
    assert.equal(JSON.parse(accepted.stdout).status, 'reused-existing-not-rerun');

    for (const artifactPath of [...documentPaths, snapshotPath]) {
      const original = fs.readFileSync(artifactPath, 'utf8');
      fs.writeFileSync(artifactPath, original.replace(
        'execution-v1-archived-evidence-browser-excluded',
        'execution-v1-ui-http-unchanged-browser-excluded',
      ));
      const rejected = run();
      assert.equal(rejected.status, 1, artifactPath);
      assert.match(rejected.stderr, /AssertionError/);
      fs.writeFileSync(artifactPath, original);
    }
  });
});

test('reuse provenance smoke keeps current-run metadata fail closed', () => {
  withProvenanceFixture('current-run', ({ run, documentPaths, snapshotPath }) => {
    const accepted = run();
    assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
    assert.equal(JSON.parse(accepted.stdout).status, 'current-run');

    for (const artifactPath of [...documentPaths, snapshotPath]) {
      const original = fs.readFileSync(artifactPath, 'utf8');
      if (artifactPath === snapshotPath) {
        fs.writeFileSync(artifactPath, JSON.stringify({
          ...JSON.parse(original),
          deterministicEvidenceReuseReason: 'execution-v1-archived-evidence-browser-excluded',
        }));
      } else {
        fs.writeFileSync(artifactPath, `${original}\n- deterministicEvidenceReuseReason: execution-v1-archived-evidence-browser-excluded\n`);
      }
      const rejected = run();
      assert.equal(rejected.status, 1, artifactPath);
      assert.match(rejected.stderr, /AssertionError/);
      fs.writeFileSync(artifactPath, original);
    }
  });
});

function withProvenanceFixture(status, check) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-reuse-provenance-'));
  const commit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const provenance = {
    boundImplementationCommit: commit,
    deterministicEvidenceStatus: status,
    ...(status === 'current-run' ? {} : {
      deterministicEvidenceSourceCommit: '0123456789abcdef0123456789abcdef01234567',
      deterministicEvidenceSourceGeneratedAt: '2026-07-01T00:00:00.000Z',
      deterministicEvidenceReuseReason: 'execution-v1-archived-evidence-browser-excluded',
    }),
  };
  const browserLines = status === 'current-run' ? [
    'browser interaction E2E: ready (Playwright CLI flow passed)',
    'browser interaction e2e: ready',
    'browser interaction E2E: ready',
    '',
  ] : [
    'browser interaction E2E: reused existing result; not rerun',
    'browser interaction e2e: reused-existing-not-rerun',
    'not current execution evidence',
    '',
  ];

  try {
    const documentPaths = [
      'execution-v1-evidence.md',
      'execution-v1-closeout.md',
      'execution-v1-handoff.md',
      'pilot-export-package-v1.md',
    ].map((name) => path.join(rootDir, 'docs', name));
    const snapshotPath = path.join(rootDir, 'docs', 'releases', 'execution-v1', commit, 'snapshot.json');
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    for (const [index, documentPath] of documentPaths.entries()) {
      fs.writeFileSync(documentPath, [
        `- commit: ${commit}`,
        ...Object.entries(provenance).map(([label, value]) => `- ${label}: ${value}`),
        browserLines[index],
      ].join('\n'));
    }
    fs.writeFileSync(snapshotPath, JSON.stringify(provenance));
    check({
      documentPaths,
      snapshotPath,
      run: () => spawnSync(process.execPath, [path.resolve('scripts/smoke-execution-v1-reuse-provenance.mjs')], {
        cwd: rootDir,
        encoding: 'utf8',
        timeout: 5_000,
      }),
    });
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}
