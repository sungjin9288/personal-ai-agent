import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertLocalCandidateEvaluatorProvenance,
  assertCurrentLocalCandidateEvaluator,
  copyLocalCandidateEvaluatorBundle,
  describeLocalCandidateEvaluator,
  LOCAL_CANDIDATE_EVALUATOR_PROVENANCE_SCHEMA_VERSION,
} from '../src/core/local-candidate-evaluator-provenance.mjs';

function createFixture(t) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'candidate-evaluator-source-'),
  );
  const snapshotRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'candidate-evaluator-snapshot-'),
  );
  t.after(() => {
    fs.rmSync(rootDir, { force: true, recursive: true });
    fs.rmSync(snapshotRoot, { force: true, recursive: true });
  });
  fs.mkdirSync(path.join(rootDir, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'evaluator'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(rootDir, 'bin', 'runtime'),
    '#!/bin/sh\n',
  );
  fs.chmodSync(path.join(rootDir, 'bin', 'runtime'), 0o700);
  fs.writeFileSync(
    path.join(rootDir, 'evaluator', 'entry.mjs'),
    [
      "import fs from 'node:fs';",
      "import { value } from './support.mjs';",
      "const cases = fs.readFileSync(new URL('cases.json', import.meta.url));",
      'process.stdout.write(`${value}:${cases.byteLength}`);',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'evaluator', 'support.mjs'),
    'export const value = 1;\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'evaluator', 'cases.json'),
    '{"cases":[]}\n',
  );
  const definition = {
    assetPaths: ['evaluator/cases.json'],
    command: path.join(rootDir, 'bin', 'runtime'),
    entryPath: 'evaluator/entry.mjs',
    rootDir,
  };
  return {
    definition,
    rootDir,
    snapshotRoot,
  };
}

test('evaluator provenance binds executable, static module closure, and resources', (t) => {
  const fixture = createFixture(t);

  const provenance = describeLocalCandidateEvaluator(
    fixture.definition,
  );

  assert.deepEqual(
    provenance.schemaVersion,
    LOCAL_CANDIDATE_EVALUATOR_PROVENANCE_SCHEMA_VERSION,
  );
  assert.deepEqual(
    provenance.bundle.files.map((file) => [
      file.kind,
      file.path,
    ]),
    [
      ['resource', 'evaluator/cases.json'],
      ['module', 'evaluator/entry.mjs'],
      ['module', 'evaluator/support.mjs'],
    ],
  );
  assert.match(
    provenance.bundle.artifactSetSha256,
    /^[a-f0-9]{64}$/u,
  );
  assert.match(provenance.executable.sha256, /^[a-f0-9]{64}$/u);
});

test('evaluator snapshot preserves admitted bytes and detects later drift', (t) => {
  const fixture = createFixture(t);
  const provenance = describeLocalCandidateEvaluator(
    fixture.definition,
  );
  const snapshot = copyLocalCandidateEvaluatorBundle({
    definition: fixture.definition,
    destinationRoot: fixture.snapshotRoot,
    expectedProvenance: provenance,
  });

  assert.deepEqual(
    assertCurrentLocalCandidateEvaluator({
      definition: snapshot.definition,
      expectedProvenance: provenance,
    }),
    provenance,
  );

  fs.appendFileSync(
    path.join(fixture.rootDir, 'evaluator', 'support.mjs'),
    'export const drift = true;\n',
  );
  assert.throws(
    () =>
      assertCurrentLocalCandidateEvaluator({
        definition: fixture.definition,
        expectedProvenance: provenance,
      }),
    /current-binding/,
  );
  assert.deepEqual(
    assertCurrentLocalCandidateEvaluator({
      definition: snapshot.definition,
      expectedProvenance: provenance,
    }),
    provenance,
  );

  const snapshotResource = path.join(
    fixture.snapshotRoot,
    'evaluator',
    'cases.json',
  );
  fs.chmodSync(snapshotResource, 0o600);
  fs.appendFileSync(snapshotResource, '\n');
  assert.throws(
    () =>
      assertCurrentLocalCandidateEvaluator({
        definition: snapshot.definition,
        expectedProvenance: provenance,
      }),
    /current-binding/,
  );
});

test('evaluator provenance fails closed on executable and import drift', (t) => {
  const fixture = createFixture(t);
  const provenance = describeLocalCandidateEvaluator(
    fixture.definition,
  );

  fs.appendFileSync(
    path.join(fixture.rootDir, 'bin', 'runtime'),
    'exit 1\n',
  );
  assert.throws(
    () =>
      assertCurrentLocalCandidateEvaluator({
        definition: fixture.definition,
        expectedProvenance: provenance,
      }),
    /current-binding/,
  );

  fs.writeFileSync(
    path.join(fixture.rootDir, 'evaluator', 'entry.mjs'),
    "await import('./support.mjs');\n",
  );
  assert.throws(
    () => describeLocalCandidateEvaluator(fixture.definition),
    /must not use dynamic import/,
  );

  fs.writeFileSync(
    path.join(fixture.rootDir, 'evaluator', 'entry.mjs'),
    "import dependency from 'unbound-package';\n",
  );
  assert.throws(
    () => describeLocalCandidateEvaluator(fixture.definition),
    /unsupported import/,
  );

  fs.writeFileSync(
    path.join(fixture.rootDir, 'evaluator', 'entry.mjs'),
    "import{unbound}from'file:///tmp/unbound.mjs';\n",
  );
  assert.throws(
    () => describeLocalCandidateEvaluator(fixture.definition),
    /unsupported import/,
  );

  fs.writeFileSync(
    path.join(fixture.rootDir, 'evaluator', 'entry.mjs'),
    "await import/*comment*/('file:///tmp/unbound.mjs');\n",
  );
  assert.throws(
    () => describeLocalCandidateEvaluator(fixture.definition),
    /must not use dynamic import/,
  );
});

test('evaluator provenance rejects symbolic-link escapes', (t) => {
  const fixture = createFixture(t);
  const outside = path.join(
    os.tmpdir(),
    `candidate-evaluator-outside-${process.pid}.mjs`,
  );
  fs.writeFileSync(outside, 'export const escaped = true;\n');
  t.after(() => fs.rmSync(outside, { force: true }));
  fs.symlinkSync(
    outside,
    path.join(fixture.rootDir, 'evaluator', 'escaped.mjs'),
  );
  fs.writeFileSync(
    path.join(fixture.rootDir, 'evaluator', 'entry.mjs'),
    "import './escaped.mjs';\n",
  );

  assert.throws(
    () => describeLocalCandidateEvaluator(fixture.definition),
    /contained regular file/,
  );
});

test('evaluator provenance rejects a resource rebound as its entry module', (t) => {
  const fixture = createFixture(t);
  const provenance = structuredClone(
    describeLocalCandidateEvaluator(fixture.definition),
  );
  provenance.bundle.entryPath = 'evaluator/cases.json';

  assert.throws(
    () => assertLocalCandidateEvaluatorProvenance(provenance),
    /bundle-integrity/,
  );
});

test('evaluator provenance rejects an impossible executable size', (t) => {
  const fixture = createFixture(t);
  const provenance = structuredClone(
    describeLocalCandidateEvaluator(fixture.definition),
  );
  provenance.executable.byteLength =
    512 * 1024 * 1024 + 1;

  assert.throws(
    () => assertLocalCandidateEvaluatorProvenance(provenance),
    /integrity/,
  );
});

test('evaluator provenance rejects an oversized module before reading it', (t) => {
  const fixture = createFixture(t);
  const oversizedEntry = path.join(
    fixture.rootDir,
    'evaluator',
    'oversized.mjs',
  );
  fs.writeFileSync(
    oversizedEntry,
    Buffer.alloc(4 * 1024 * 1024 + 1, 0x20),
  );
  const readPaths = [];
  const fileSystem = Object.create(fs);
  fileSystem.readFileSync = (...arguments_) => {
    readPaths.push(arguments_[0]);
    return fs.readFileSync(...arguments_);
  };

  assert.throws(
    () =>
      describeLocalCandidateEvaluator({
        ...fixture.definition,
        entryPath: 'evaluator/oversized.mjs',
        fileSystem,
      }),
    /byte boundary/,
  );
  assert.deepEqual(readPaths, []);
});

test('evaluator provenance rejects an oversized resource list before reading files', (t) => {
  const fixture = createFixture(t);
  const readPaths = [];
  const fileSystem = Object.create(fs);
  fileSystem.readFileSync = (...arguments_) => {
    readPaths.push(arguments_[0]);
    return fs.readFileSync(...arguments_);
  };

  assert.throws(
    () =>
      describeLocalCandidateEvaluator({
        ...fixture.definition,
        assetPaths: Array.from(
          { length: 64 },
          () => 'evaluator/cases.json',
        ),
        fileSystem,
      }),
    /file boundary/,
  );
  assert.deepEqual(readPaths, []);
});
