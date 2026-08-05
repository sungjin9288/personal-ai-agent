import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  LOCAL_V1_SOURCE_DOCUMENTS,
  LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS,
  LOCAL_V1_VERIFICATION_SCHEMA_VERSION,
  assertLocalV1CompletionArtifact,
  assertLocalV1VerificationReport,
  buildLocalV1CompletionArtifact,
  sha256Text,
} from '../src/core/local-v1-completion-closeout.mjs';

const repoDir = process.cwd();
const c13AttemptText = read(
  'evidence/output-artifacts/local-council-v6-actual-compatibility-attempt.json',
);
const c13FinalText = read(
  'evidence/output-artifacts/local-council-v6-actual-compatibility-observation.json',
);
const implementationCommit = 'a'.repeat(40);
const sourceDocumentTexts = Object.fromEntries(
  LOCAL_V1_SOURCE_DOCUMENTS.map((document) => [
    document,
    document === 'package.json' ? '{"scripts":"canonical"}' : `${document} source\n`,
  ]),
);
const publicReleaseSources = [
  'CHANGELOG.md',
  'config/public-release-v0.1.0.json',
];

test('local v1 closeout binds completed local scope without expanding authority', () => {
  const verificationReport = buildVerificationReport();
  const artifact = buildLocalV1CompletionArtifact({
    c13AttemptText,
    c13FinalText,
    implementationCommit,
    sourceDocumentTexts,
    verificationReport,
  });

  assert.equal(artifact.status, 'local-v1-complete-external-evidence-open');
  assert.equal(artifact.deliveryStatus.d4, 'completed');
  assert.equal(artifact.deliveryStatus.localRag, 'completed-default-path-unchanged');
  assert.equal(
    artifact.deliveryStatus.fineTuningProtocols,
    'completed-private-authority-deferred',
  );
  assert.equal(artifact.deliveryStatus.council, 'completed-keep-stub-only');
  assert.equal(artifact.c13.localProviderRequestCount, 1);
  assert.equal(artifact.c13.retryCount, 0);
  assert.equal(artifact.c13.failureStage, 'structured-output');
  assert.equal(artifact.c13.failureKind, 'council-contract:invalid-output');
  for (const document of publicReleaseSources) {
    assert.ok(LOCAL_V1_SOURCE_DOCUMENTS.includes(document));
    assert.equal(artifact.sourceDocumentSha256[document], sha256Text(sourceDocumentTexts[document]));
  }
  assert.ok(Object.values(artifact.activity).every((value) => value === 0));
  assert.ok(Object.values(artifact.authority).every((value) => value === false));
  assertLocalV1CompletionArtifact(artifact, {
    c13AttemptText,
    c13FinalText,
    implementationCommit,
    sourceDocumentTexts,
    verificationReport,
  });
});

test('local v1 closeout rejects authority and C13 outcome drift after resealing', () => {
  const artifact = buildArtifact();
  const authorityDrift = reseal(artifact, (content) => {
    content.authority.runtimeActivation = true;
  });
  const c13Drift = reseal(artifact, (content) => {
    content.c13.localProviderRequestCount = 2;
  });

  assert.throws(
    () => assertLocalV1CompletionArtifact(authorityDrift),
    /authority must remain false/,
  );
  assert.throws(
    () => assertLocalV1CompletionArtifact(c13Drift),
    /C13 status or authority drifted/,
  );
});

test('local v1 closeout rejects blocker, source, and implementation drift', () => {
  const artifact = buildArtifact();
  const blockerDrift = reseal(artifact, (content) => {
    content.externalBlockerIds.pop();
  });

  assert.throws(
    () => assertLocalV1CompletionArtifact(blockerDrift),
    /external blocker ids are invalid/,
  );
  for (const document of LOCAL_V1_SOURCE_DOCUMENTS) {
    const changedSources = {
      ...sourceDocumentTexts,
      [document]: `changed ${document} source\n`,
    };
    assert.throws(
      () => assertLocalV1CompletionArtifact(artifact, { sourceDocumentTexts: changedSources }),
      /source document binding failed/,
      `${document} mutation must invalidate the source binding`,
    );
  }
  assert.throws(
    () => assertLocalV1CompletionArtifact(artifact, { implementationCommit: 'b'.repeat(40) }),
    /implementation commit binding failed/,
  );
});

test('local v1 verification requires exact successful command receipts', () => {
  const failedReport = buildVerificationReport();
  failedReport.checks[2].exitCode = 1;

  assert.throws(
    () => assertLocalV1VerificationReport(failedReport),
    /verification check is not passed: release-artifact-hygiene/,
  );
});

test('local v1 closeout rejects resealed verification report hash and summary tampering', () => {
  const artifact = buildArtifact();
  const reportHashDrift = reseal(artifact, (content) => {
    content.verification.reportSha256 = 'b'.repeat(64);
  });
  const summaryDrift = reseal(artifact, (content) => {
    content.verification.checks[0].stdoutSha256 = 'b'.repeat(64);
  });

  assert.throws(
    () => assertLocalV1CompletionArtifact(reportHashDrift),
    /verification report integrity failed/,
  );
  assert.throws(
    () => assertLocalV1CompletionArtifact(summaryDrift),
    /verification report integrity failed/,
  );
});

test('local v1 verification binding is stable across input property order', () => {
  const report = buildVerificationReport();
  const reorderedReport = {
    status: report.status,
    schemaVersion: report.schemaVersion,
    packageJsonSha256: report.packageJsonSha256,
    implementationCommit: report.implementationCommit,
    checks: report.checks.map((check) => Object.fromEntries(Object.entries(check).reverse())),
  };

  const artifact = buildLocalV1CompletionArtifact({
    c13AttemptText,
    c13FinalText,
    implementationCommit,
    sourceDocumentTexts,
    verificationReport: report,
  });
  const reorderedArtifact = buildLocalV1CompletionArtifact({
    c13AttemptText,
    c13FinalText,
    implementationCommit,
    sourceDocumentTexts,
    verificationReport: reorderedReport,
  });

  assert.equal(reorderedArtifact.verification.reportSha256, artifact.verification.reportSha256);
  assert.equal(reorderedArtifact.id, artifact.id);
});

test('local v1 artifact rejects content-bearing local paths', () => {
  const artifact = buildArtifact();
  const localPath = reseal(artifact, (content) => {
    content.verification.checks[0].id = '/Users/example/private-result';
  });

  assert.throws(
    () => assertLocalV1CompletionArtifact(localPath),
    /contains an absolute local path/,
  );
});

function buildArtifact() {
  return buildLocalV1CompletionArtifact({
    c13AttemptText,
    c13FinalText,
    implementationCommit,
    sourceDocumentTexts,
    verificationReport: buildVerificationReport(),
  });
}

function buildVerificationReport() {
  return {
    checks: LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS.map((definition) => ({
      command: definition.command.join(' '),
      commandSha256: sha256Text(definition.command.join(' ')),
      durationMs: 10,
      exitCode: 0,
      id: definition.id,
      packageScript: definition.packageScript,
      packageScriptSha256: definition.packageScriptCommand === null
        ? null
        : sha256Text(definition.packageScriptCommand),
      stderrSha256: sha256Text(''),
      stdoutSha256: sha256Text(definition.id),
      timedOut: false,
      timeoutMs: definition.timeoutMs,
    })),
    implementationCommit,
    packageJsonSha256: sha256Text('{"scripts":"canonical"}'),
    schemaVersion: LOCAL_V1_VERIFICATION_SCHEMA_VERSION,
    status: 'passed',
  };
}

function reseal(artifact, change) {
  const content = structuredClone(artifact);
  delete content.id;
  delete content.integrityHash;
  change(content);
  const integrityHash = sha256Text(JSON.stringify(content));
  return {
    ...content,
    id: `local-v1-completion-closeout-${integrityHash}`,
    integrityHash,
  };
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}
