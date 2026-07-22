import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertCurrentLocalTrainingRuntimeClosure,
  assertLocalTrainingRuntimeClosureProvenance,
  describeLocalTrainingRuntimeClosure,
} from '../src/core/local-training-runtime-closure-provenance.mjs';
import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';
import {
  LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH,
  LOCAL_TRAINING_RUNTIME_CLOSURE_INTERPRETER_PATH,
  LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES,
} from './local-training-runtime-closure-fixture.mjs';

export const LOCAL_TRAINING_RUNTIME_CLOSURE_PROVENANCE_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-closure-provenance-evidence/v1';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function createFixture(files = LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'training-runtime-closure-evidence-'),
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

function rejectionMatches(operation, pattern) {
  try {
    operation();
    return false;
  } catch (error) {
    return pattern.test(String(error?.message || ''));
  }
}

export async function evaluateLocalTrainingRuntimeClosureProvenance({
  repoDir = process.cwd(),
} = {}) {
  const adapterEvidence = await evaluateMlxLmLoraTrainingAdapter({
    repoDir,
  });
  const fixture = createFixture();
  const dynamicFixture = createFixture(
    LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES.map((file) =>
      file.path === LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH
        ? {
            ...file,
            content:
              'module = __import__("mlx_lm.lora")\nmodule.main()\n',
          }
        : file),
  );
  const nativeFixture = createFixture([
    ...LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES,
    { content: 'fixture-native-extension', path: 'mlx_lm/native.so' },
  ]);
  try {
    const provenance = describeLocalTrainingRuntimeClosure(
      fixture.definition,
    );
    const repeated = describeLocalTrainingRuntimeClosure(
      fixture.definition,
    );
    const failureGuards = {
      adapterActualProcessRemainsBlocked:
        adapterEvidence.claimBoundary.actualMlxProcessSpawned === false,
      adapterBoundToClosure:
        adapterEvidence.contract.runtimeClosure.provenanceHash ===
          provenance.provenanceHash,
      ambientImportHookBlocked: (() => {
        const filename = path.join(fixture.rootDir, 'sitecustomize.py');
        fs.writeFileSync(filename, 'VALUE = "blocked"\n', { mode: 0o600 });
        const blocked = rejectionMatches(
          () => describeLocalTrainingRuntimeClosure(fixture.definition),
          /rejects native|unreachable Python modules/,
        );
        fs.rmSync(filename);
        return blocked;
      })(),
      deterministicProvenance:
        JSON.stringify(provenance) === JSON.stringify(repeated),
      knownDynamicImportConstructBlocked: rejectionMatches(
        () => describeLocalTrainingRuntimeClosure(dynamicFixture.definition),
        /unsupported custom import hooks/,
      ),
      invalidProvenanceHashBlocked: rejectionMatches(
        () => assertLocalTrainingRuntimeClosureProvenance({
          ...provenance,
          provenanceHash: '0'.repeat(64),
        }),
        /closure-integrity/,
      ),
      hardLinkBlocked: (() => {
        const source = path.join(fixture.rootDir, 'mlx_lm/lora.py');
        const link = path.join(fixture.rootDir, 'mlx_lm/lora-copy.py');
        fs.linkSync(source, link);
        const blocked = rejectionMatches(
          () => describeLocalTrainingRuntimeClosure(fixture.definition),
          /bounded regular files/,
        );
        fs.rmSync(link);
        return blocked;
      })(),
      nativeExtensionBlocked: rejectionMatches(
        () => describeLocalTrainingRuntimeClosure(nativeFixture.definition),
        /rejects native/,
      ),
      symlinkBlocked: (() => {
        const filename = path.join(fixture.rootDir, 'mlx_lm/linked.py');
        fs.symlinkSync(
          path.join(fixture.rootDir, 'mlx_lm/lora.py'),
          filename,
        );
        const blocked = rejectionMatches(
          () => describeLocalTrainingRuntimeClosure(fixture.definition),
          /rejects symbolic links/,
        );
        fs.rmSync(filename);
        return blocked;
      })(),
      tamperBlockedByCurrentBinding: (() => {
        const filename = path.join(fixture.rootDir, 'mlx_lm/lora.py');
        const original = fs.readFileSync(filename);
        fs.appendFileSync(filename, '\n# tampered\n');
        const blocked = rejectionMatches(
          () => assertCurrentLocalTrainingRuntimeClosure({
            definition: fixture.definition,
            expectedProvenance: provenance,
          }),
          /current-binding/,
        );
        fs.writeFileSync(filename, original, { mode: 0o600 });
        return blocked;
      })(),
      unknownExecutableBlocked: (() => {
        const filename = path.join(fixture.rootDir, 'unknown-tool');
        fs.writeFileSync(filename, 'opaque-runtime-entry', { mode: 0o700 });
        const blocked = rejectionMatches(
          () => describeLocalTrainingRuntimeClosure(fixture.definition),
          /unsupported role/,
        );
        fs.rmSync(filename);
        return blocked;
      })(),
      writableRuntimeFileBlocked: (() => {
        const filename = path.join(fixture.rootDir, 'mlx_lm/lora.py');
        fs.chmodSync(filename, 0o622);
        const blocked = rejectionMatches(
          () => describeLocalTrainingRuntimeClosure(fixture.definition),
          /rejects symbolic links and path escapes/,
        );
        fs.chmodSync(filename, 0o600);
        return blocked;
      })(),
    };
    assert.equal(
      Object.values(failureGuards).every(Boolean),
      true,
      'every runtime closure failure guard must pass',
    );

    const entrypoint = provenance.closure.files.find(
      (file) => file.kind === 'entrypoint',
    );
    const interpreter = provenance.closure.files.find(
      (file) => file.kind === 'interpreter',
    );
    const evidence = {
      adapterBinding: {
        contractHash: adapterEvidence.contract.contractHash,
        remainingGates: adapterEvidence.contract.remainingGates,
        runtimeClosureProvenanceHash:
          adapterEvidence.contract.runtimeClosure.provenanceHash,
      },
      claimBoundary: {
        actualDependencyInstallationPerformed: false,
        actualMlxProcessSpawned: false,
        actualModelDownloadPerformed: false,
        actualModelTrainingExecuted: false,
        dynamicRuntimeClosureComplete: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        nativeClosureComplete: false,
        productionReadyClaim: false,
        rolloutAuthorized: false,
        staticRuntimeClosureValidated: true,
        trainingAuthorized: false,
        verifyToExecClosed: false,
      },
      closure: {
        artifactSetSha256: provenance.closure.artifactSetSha256,
        entrypointSha256: entrypoint.sha256,
        fileCount: provenance.closure.fileCount,
        importGraphHash: hashRecord(provenance.closure.importGraph),
        interpreterSha256: interpreter.sha256,
        provenanceHash: provenance.provenanceHash,
        schemaVersion: provenance.schemaVersion,
      },
      costFree: true,
      failureGuards,
      mode: 'fixture-simulated-static-runtime-closure',
      schemaVersion:
        LOCAL_TRAINING_RUNTIME_CLOSURE_PROVENANCE_EVIDENCE_SCHEMA_VERSION,
    };
    const evidenceHash = hashRecord(evidence);
    return {
      ...evidence,
      evidenceHash,
      id:
        `local-training-runtime-closure-provenance-evidence-${evidenceHash}`,
    };
  } finally {
    fixture.cleanup();
    dynamicFixture.cleanup();
    nativeFixture.cleanup();
  }
}
