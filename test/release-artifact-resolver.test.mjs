import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createExecutionV1ReleaseArtifactResolver } from '../src/web/release-artifact-resolver.mjs';

function createFixture(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-artifact-resolver-'));
  const artifactPath = path.join(rootDir, 'output', 'playwright', 'report.json');
  const snapshotPath = path.join(rootDir, 'docs', 'releases', 'execution-v1', 'commit-1', 'snapshot.json');
  const targetDocPath = path.join(rootDir, 'docs', 'target.md');
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(artifactPath, '{}\n');
  fs.writeFileSync(snapshotPath, '{}\n');
  fs.writeFileSync(targetDocPath, '# Target\n');
  t.after(() => fs.rmSync(rootDir, { force: true, recursive: true }));

  const artifactEntry = {
    id: 'browser-report',
    label: 'browser-e2e.json',
    path: artifactPath,
  };
  const resolver = createExecutionV1ReleaseArtifactResolver({
    evidenceDocPaths: new Set(['docs/current.md', 'docs/missing.md', 'docs/target.md']),
    handoffArtifactSpecs: [artifactEntry],
    mutableArtifactPathPrefixes: new Set(['generated/portfolio']),
    mutableArtifactPaths: new Set(['docs/current.md']),
    rootDir,
  });
  return {
    artifactEntry,
    artifactPath,
    resolver,
    rootDir,
    snapshotPath,
    targetDocPath,
  };
}

test('release path allowlists accept known files and reject traversal-shaped paths', (t) => {
  const { resolver } = createFixture(t);

  assert.equal(resolver.normalizePath('.\\docs\\target.md'), 'docs/target.md');
  assert.equal(resolver.isReleaseArtifactPath('docs/current.md'), true);
  assert.equal(resolver.isReleaseArtifactPath('generated/portfolio/README.md'), true);
  assert.equal(resolver.isReleaseArtifactPath('generated\\portfolio\\docs\\plan.md'), true);
  assert.equal(resolver.isReleaseArtifactPath('docs/releases/execution-v1/commit-1/snapshot.json'), true);
  assert.equal(resolver.isReleaseArtifactPath('docs\\releases\\execution-v1\\commit-1\\snapshot.json'), true);
  assert.equal(resolver.isReleaseEvidenceDocPath('./docs/target.md'), true);
  assert.equal(resolver.isReleaseEvidenceDocPath('docs/releases/execution-v1/commit-1/snapshot.json'), true);

  assert.equal(resolver.isReleaseArtifactPath('docs/releases/execution-v1/../../current.md'), false);
  assert.equal(resolver.isReleaseArtifactPath('generated/portfolio'), false);
  assert.equal(resolver.isReleaseArtifactPath('generated/portfolio-copy/README.md'), false);
  assert.equal(resolver.isReleaseArtifactPath('generated/portfolio/../secret.md'), false);
  assert.equal(resolver.isReleaseEvidenceDocPath('docs/releases/execution-v1/../../target.md'), false);
  assert.equal(resolver.isReleaseEvidenceDocPath('../docs/target.md'), false);
  assert.equal(resolver.isReleaseEvidenceDocPath('/docs/target.md'), false);
  assert.equal(resolver.isReleaseEvidenceDocPath('docs/unlisted.md'), false);
});

test('release evidence resolver returns only existing allowlisted files', (t) => {
  const { resolver, snapshotPath, targetDocPath } = createFixture(t);

  assert.deepEqual(resolver.resolveEvidenceDoc('./docs/target.md'), {
    path: targetDocPath,
    relativePath: 'docs/target.md',
  });
  assert.deepEqual(resolver.resolveEvidenceDoc('docs/releases/execution-v1/commit-1/snapshot.json'), {
    path: snapshotPath,
    relativePath: 'docs/releases/execution-v1/commit-1/snapshot.json',
  });
  assert.equal(resolver.resolveEvidenceDoc('docs/missing.md'), null);
  assert.equal(resolver.resolveEvidenceDoc('docs/unlisted.md'), null);
  assert.equal(resolver.resolveEvidenceDoc('docs/releases/execution-v1/../../target.md'), null);
});

test('release handoff resolver preserves the catalog entry and rejects unsafe targets', (t) => {
  const { artifactEntry, artifactPath, resolver, rootDir } = createFixture(t);

  assert.deepEqual(resolver.resolveHandoffArtifact('browser-report'), {
    artifactPath,
    entry: artifactEntry,
  });
  assert.equal(resolver.resolveHandoffArtifact('missing'), null);

  const directoryResolver = createExecutionV1ReleaseArtifactResolver({
    handoffArtifactSpecs: [{ id: 'directory', path: path.dirname(artifactPath) }],
    rootDir,
  });
  assert.equal(directoryResolver.resolveHandoffArtifact('directory'), null);

  const outsideRoot = path.join(path.dirname(rootDir), 'outside-release-artifact.json');
  fs.writeFileSync(outsideRoot, '{}\n');
  t.after(() => fs.rmSync(outsideRoot, { force: true }));
  const outsideResolver = createExecutionV1ReleaseArtifactResolver({
    handoffArtifactSpecs: [{ id: 'outside', path: outsideRoot }],
    rootDir,
  });
  assert.equal(outsideResolver.resolveHandoffArtifact('outside'), null);
});
