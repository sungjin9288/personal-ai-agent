import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertCurrentLocalTrainingRuntimeClosure,
  assertLocalTrainingRuntimeClosureProvenance,
  describeLocalTrainingRuntimeClosure,
  LOCAL_TRAINING_RUNTIME_CLOSURE_PROVENANCE_SCHEMA_VERSION,
} from '../src/core/local-training-runtime-closure-provenance.mjs';
import {
  LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH,
  LOCAL_TRAINING_RUNTIME_CLOSURE_INTERPRETER_PATH,
  LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES,
} from '../scripts/local-training-runtime-closure-fixture.mjs';

function createFixture(files = LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'training-runtime-closure-test-'),
  );
  for (const file of files) {
    const filename = path.join(rootDir, file.path);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, file.content, {
      mode: file.mode || 0o600,
    });
    if (file.mode) {
      fs.chmodSync(filename, file.mode);
    }
  }
  return {
    cleanup() {
      fs.rmSync(rootDir, { force: true, recursive: true });
    },
    definition: {
      allowedImportRoots: ['mlx_lm'],
      entryPath: LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH,
      interpreterPath:
        LOCAL_TRAINING_RUNTIME_CLOSURE_INTERPRETER_PATH,
      rootDir,
    },
    rootDir,
  };
}

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function resignProvenance(provenance, closureChanges) {
  const closureContent = {
    byteLength: provenance.closure.byteLength,
    entryPath: provenance.closure.entryPath,
    fileCount: provenance.closure.fileCount,
    files: provenance.closure.files,
    importGraph: provenance.closure.importGraph,
    interpreterPath: provenance.closure.interpreterPath,
    ...closureChanges,
  };
  const closure = {
    ...closureContent,
    artifactSetSha256: hashRecord(closureContent),
  };
  const content = {
    closure,
    policy: provenance.policy,
    schemaVersion: provenance.schemaVersion,
  };
  return {
    ...content,
    provenanceHash: hashRecord(content),
  };
}

test('runtime closure binds the pinned interpreter, entrypoint, modules, and import graph', () => {
  const fixture = createFixture();
  try {
    const provenance = describeLocalTrainingRuntimeClosure(
      fixture.definition,
    );
    assert.equal(
      provenance.schemaVersion,
      LOCAL_TRAINING_RUNTIME_CLOSURE_PROVENANCE_SCHEMA_VERSION,
    );
    assert.equal(provenance.closure.fileCount, 4);
    assert.equal(
      provenance.closure.entryPath,
      LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH,
    );
    assert.equal(
      provenance.closure.interpreterPath,
      LOCAL_TRAINING_RUNTIME_CLOSURE_INTERPRETER_PATH,
    );
    assert.equal(
      provenance.policy.dynamicImportAnalysis,
      'known-constructs-rejected-static-fixture-only',
    );
    assert.deepEqual(
      provenance.closure.importGraph,
      [
        { imports: [], path: 'mlx_lm/__init__.py' },
        { imports: [], path: 'mlx_lm/lora.py' },
        {
          imports: [
            'mlx_lm/__init__.py',
            'mlx_lm/lora.py',
          ],
          path: 'mlx_lm_lora.py',
        },
      ],
    );
    assert.equal(
      assertLocalTrainingRuntimeClosureProvenance(provenance),
      provenance,
    );
    assert.deepEqual(
      assertCurrentLocalTrainingRuntimeClosure({
        definition: fixture.definition,
        expectedProvenance: provenance,
      }),
      provenance,
    );
  } finally {
    fixture.cleanup();
  }
});

test('runtime closure detects byte changes against the approved provenance', () => {
  const fixture = createFixture();
  try {
    const expectedProvenance = describeLocalTrainingRuntimeClosure(
      fixture.definition,
    );
    fs.appendFileSync(
      path.join(fixture.rootDir, 'mlx_lm/lora.py'),
      '\n# tampered\n',
    );
    assert.throws(
      () => assertCurrentLocalTrainingRuntimeClosure({
        definition: fixture.definition,
        expectedProvenance,
      }),
      /current-binding/,
    );
  } finally {
    fixture.cleanup();
  }
});

test('runtime closure rejects dynamic import and process escape paths', () => {
  for (const source of [
    'import importlib\nimportlib.import_module("mlx_lm.lora")\n',
    'import subprocess\nsubprocess.run(["blocked"])\n',
    'module = __import__("mlx_lm.lora")\n',
    'value = f"{__import__(\'mlx_lm.lora\')}"\n',
    'runner = eval\nrunner("blocked")\n',
    'breakpoint()\n',
  ]) {
    const files = LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES.map(
      (file) => file.path === LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH
        ? { ...file, content: source }
        : file,
    );
    const fixture = createFixture(files);
    try {
      assert.throws(
        () => describeLocalTrainingRuntimeClosure(fixture.definition),
        /unsupported|outside the declared runtime|must not use formatted strings/,
      );
    } finally {
      fixture.cleanup();
    }
  }
});

test('runtime closure rejects native, cached, archive, and ambient import files', () => {
  for (const relativePath of [
    'mlx_lm/native.so',
    'mlx_lm/cache.pyc',
    'mlx_lm/package.whl',
    'sitecustomize.py',
  ]) {
    const fixture = createFixture([
      ...LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES,
      {
        content: relativePath === 'sitecustomize.py'
          ? 'VALUE = "must-not-load"\n'
          : 'unsupported-runtime-bytes',
        path: relativePath,
      },
    ]);
    try {
      assert.throws(
        () => describeLocalTrainingRuntimeClosure(fixture.definition),
        /rejects native|unreachable Python modules/,
      );
    } finally {
      fixture.cleanup();
    }
  }
});

test('runtime closure rejects links, missing modules, and unlisted executable surfaces', () => {
  const linkFixture = createFixture();
  try {
    fs.symlinkSync(
      path.join(linkFixture.rootDir, 'mlx_lm/lora.py'),
      path.join(linkFixture.rootDir, 'mlx_lm/linked.py'),
    );
    assert.throws(
      () => describeLocalTrainingRuntimeClosure(linkFixture.definition),
      /rejects symbolic links/,
    );
  } finally {
    linkFixture.cleanup();
  }

  const missingFixture = createFixture(
    LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES.map((file) =>
      file.path === LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH
        ? {
            ...file,
            content: 'from outside_runtime.module import main\nmain()\n',
          }
        : file),
  );
  try {
    assert.throws(
      () => describeLocalTrainingRuntimeClosure(missingFixture.definition),
      /outside the allowed package roots/,
    );
  } finally {
    missingFixture.cleanup();
  }

  const unknownFixture = createFixture([
    ...LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES,
    { content: 'opaque-executable', path: 'bin/unknown-tool' },
  ]);
  try {
    assert.throws(
      () => describeLocalTrainingRuntimeClosure(unknownFixture.definition),
      /unsupported role/,
    );
  } finally {
    unknownFixture.cleanup();
  }
});

test('runtime closure rejects built-in and standard-library import shadowing', () => {
  const fixture = createFixture([
    ...LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES.map((file) =>
      file.path === LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH
        ? { ...file, content: 'import sys\n' }
        : file),
    { content: 'path = []\n', path: 'sys.py' },
  ].sort((left, right) => left.path < right.path ? -1 : 1));
  try {
    assert.throws(
      () => describeLocalTrainingRuntimeClosure(fixture.definition),
      /outside the allowed package roots/,
    );
  } finally {
    fixture.cleanup();
  }
});

test('runtime closure rejects hard links and writable runtime files', () => {
  const hardLinkFixture = createFixture();
  try {
    fs.linkSync(
      path.join(hardLinkFixture.rootDir, 'mlx_lm/lora.py'),
      path.join(hardLinkFixture.rootDir, 'mlx_lm/lora-copy.py'),
    );
    assert.throws(
      () => describeLocalTrainingRuntimeClosure(
        hardLinkFixture.definition,
      ),
      /bounded regular files|contained regular file/,
    );
  } finally {
    hardLinkFixture.cleanup();
  }

  const writableFixture = createFixture();
  try {
    fs.chmodSync(
      path.join(writableFixture.rootDir, 'mlx_lm/lora.py'),
      0o622,
    );
    assert.throws(
      () => describeLocalTrainingRuntimeClosure(
        writableFixture.definition,
      ),
      /rejects symbolic links and path escapes|contained regular file/,
    );
  } finally {
    writableFixture.cleanup();
  }
});

test('runtime closure provenance rejects forged hashes and graph edges', () => {
  const fixture = createFixture();
  try {
    const provenance = describeLocalTrainingRuntimeClosure(
      fixture.definition,
    );
    assert.throws(
      () => assertLocalTrainingRuntimeClosureProvenance({
        ...provenance,
        provenanceHash: '0'.repeat(64),
      }),
      /closure-integrity/,
    );
    assert.throws(
      () => assertLocalTrainingRuntimeClosureProvenance({
        ...provenance,
        closure: {
          ...provenance.closure,
          importGraph: [{
            imports: ['outside.py'],
            path: provenance.closure.entryPath,
          }],
        },
      }),
      /graph-integrity/,
    );
    const nativeFiles = provenance.closure.files.map((file) =>
      file.path === 'mlx_lm/lora.py'
        ? { ...file, path: 'mlx_lm/lora.so' }
        : file);
    const nativeGraph = provenance.closure.importGraph.map((edge) => ({
      imports: edge.imports.map((importedPath) =>
        importedPath === 'mlx_lm/lora.py'
          ? 'mlx_lm/lora.so'
          : importedPath),
      path: edge.path === 'mlx_lm/lora.py'
        ? 'mlx_lm/lora.so'
        : edge.path,
    }));
    assert.throws(
      () => assertLocalTrainingRuntimeClosureProvenance(
        resignProvenance(provenance, {
          files: nativeFiles,
          importGraph: nativeGraph,
        }),
      ),
      /file-integrity|role-integrity/,
    );
    const disconnectedGraph = provenance.closure.importGraph.map(
      (edge) => edge.path === provenance.closure.entryPath
        ? {
            ...edge,
            imports: edge.imports.filter(
              (importedPath) => importedPath !== 'mlx_lm/__init__.py',
            ),
          }
        : edge,
    );
    assert.throws(
      () => assertLocalTrainingRuntimeClosureProvenance(
        resignProvenance(provenance, {
          importGraph: disconnectedGraph,
        }),
      ),
      /closure-integrity/,
    );
    const duplicateInterpreterFiles = provenance.closure.files.map(
      (file) => file.path === 'mlx_lm/lora.py'
        ? { ...file, kind: 'interpreter' }
        : file,
    );
    assert.throws(
      () => assertLocalTrainingRuntimeClosureProvenance(
        resignProvenance(provenance, {
          files: duplicateInterpreterFiles,
        }),
      ),
      /role-integrity/,
    );
  } finally {
    fixture.cleanup();
  }
});
