import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  LOCAL_V1_SOURCE_DOCUMENTS,
  LOCAL_V1_VERIFICATION_CHECK_IDS,
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
  LOCAL_V1_SOURCE_DOCUMENTS.map((document) => [document, `${document} source\n`]),
);

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
  const changedSources = {
    ...sourceDocumentTexts,
    'README.md': 'changed public claim surface\n',
  };

  assert.throws(
    () => assertLocalV1CompletionArtifact(blockerDrift),
    /external blocker ids are invalid/,
  );
  assert.throws(
    () => assertLocalV1CompletionArtifact(artifact, { sourceDocumentTexts: changedSources }),
    /source document binding failed/,
  );
  assert.throws(
    () => assertLocalV1CompletionArtifact(artifact, { implementationCommit: 'b'.repeat(40) }),
    /implementation commit binding failed/,
  );
});

test('local v1 verification requires exact passed checks and measured counts', () => {
  const failedReport = buildVerificationReport();
  failedReport.checks[2].status = 'failed';
  failedReport.checks[2].failed = 1;
  failedReport.checks[2].passed = 0;

  assert.throws(
    () => assertLocalV1VerificationReport(failedReport),
    /verification check is not passed: smoke-all/,
  );
});

test('local v1 closeout rejects resealed verification report hash and summary tampering', () => {
  const artifact = buildArtifact();
  const reportHashDrift = reseal(artifact, (content) => {
    content.verification.reportSha256 = 'b'.repeat(64);
  });
  const summaryDrift = reseal(artifact, (content) => {
    content.verification.checks[0].passed = 1813;
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
    checks: LOCAL_V1_VERIFICATION_CHECK_IDS.map((id, index) => ({
      failed: 0,
      id,
      passed: index === 0 ? 1812 : 1,
      skipped: index === 0 ? 1 : 0,
      status: 'passed',
    })),
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
