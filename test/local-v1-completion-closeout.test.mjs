import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  LOCAL_V1_COMPLETION_SCHEMA_VERSION,
  LOCAL_V1_SOURCE_DOCUMENTS,
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
const packageJsonFixture = {
  scripts: {
    test: 'node --test --test-concurrency=4 test/*.test.mjs',
    'smoke:docs-gates': 'node scripts/run-all-smokes.mjs --group docs-gates',
    'smoke:release-artifact-hygiene': 'node scripts/smoke-release-artifact-hygiene.mjs',
  },
};
const sourceDocumentTexts = Object.fromEntries(
  LOCAL_V1_SOURCE_DOCUMENTS.map((document) => [
    document,
    document === 'package.json' ? JSON.stringify(packageJsonFixture) : `${document} source\n`,
  ]),
);
const boundReleaseAndPilotSources = [
  'CHANGELOG.md',
  'config/public-release-v0.1.0.json',
  'config/public-walkthrough-v1.json',
  'config/pilot-feedback-v1.json',
  'docs/engineering-approval-workflow-rehearsal-v1.md',
  'docs/pilot-feedback-v1.md',
  'evidence/output-artifacts/engineering-approval-workflow-rehearsal.json',
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
  assert.equal(
    LOCAL_V1_COMPLETION_SCHEMA_VERSION,
    'personal-ai-agent-local-v1-completion-closeout/v2',
  );
  assert.equal(artifact.verification.schemaVersion, 'personal-ai-agent-local-v1-completion-verification/v3');
  assert.equal(
    artifact.verification.checks[0].packageScriptSha256,
    sha256Text('node --test --test-concurrency=4 test/*.test.mjs'),
  );
  assert.deepEqual(artifact.completionMatrix, {
    localProduct: 'complete',
    provider: 'partial-external-blocked',
    deployment: 'external-blocked',
    privateDataTraining: 'approval-blocked-unverified',
    rollout: 'approval-blocked-unverified',
  });
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
  for (const document of boundReleaseAndPilotSources) {
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

test('local v1 closeout requires the release-readiness source and exact decision matrix', () => {
  assert.ok(LOCAL_V1_SOURCE_DOCUMENTS.includes('docs/release-readiness-v1.md'));
  const artifact = buildArtifact();

  for (const mutation of [
    (content) => { delete content.completionMatrix.provider; },
    (content) => { content.completionMatrix.extra = 'complete'; },
    (content) => { content.completionMatrix.provider = 'complete'; },
    (content) => { content.completionMatrix.rollout = 'external-blocked'; },
  ]) {
    assert.throws(
      () => assertLocalV1CompletionArtifact(reseal(artifact, mutation)),
      /completion matrix/i,
    );
  }

  const changedReadiness = {
    ...sourceDocumentTexts,
    'docs/release-readiness-v1.md': 'changed release readiness source\n',
  };
  assert.throws(
    () => assertLocalV1CompletionArtifact(artifact, { sourceDocumentTexts: changedReadiness }),
    /source document binding failed/,
  );
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

test('local v1 assertions preserve a fixed historical v2 artifact without rebuilding it', () => {
  const artifact = Object.freeze(historicalArtifactFixture());
  const before = JSON.stringify(artifact);
  const { reportSha256, ...verificationReport } = artifact.verification;

  assert.equal(verificationReport.schemaVersion, 'personal-ai-agent-local-v1-completion-verification/v2');
  assert.equal(verificationReport.checks[0].packageScriptSha256, sha256Text('node --test test/*.test.mjs'));
  assertLocalV1VerificationReport(verificationReport);
  assertLocalV1CompletionArtifact(artifact);
  assert.equal(JSON.stringify(artifact), before);
  assert.equal(artifact.id, 'local-v1-completion-closeout-05b365a9e3b6520cd7853d4e3d50facae1aa5b2ef8cc308da49efb5d5716c3fd');
  assert.throws(
    () => assertLocalV1CompletionArtifact(artifact, { implementationCommit }),
    /implementation commit binding failed/,
  );
  const legacyPackageJson = structuredClone(packageJsonFixture);
  legacyPackageJson.scripts.test = 'node --test test/*.test.mjs';
  const historicalSources = { ...sourceDocumentTexts, 'package.json': JSON.stringify(legacyPackageJson) };
  const boundHistorical = resealVerification(artifact, (content) => {
    content.verification.packageJsonSha256 = sha256Text(JSON.stringify(legacyPackageJson));
    content.sourceDocumentSha256 = Object.fromEntries(
      Object.entries(historicalSources).map(([document, text]) => [document, sha256Text(text)]),
    );
  });
  assertLocalV1CompletionArtifact(boundHistorical, { sourceDocumentTexts: historicalSources });
});

test('local v1 builder rejects valid historical v2 receipts for fresh artifacts', () => {
  const historicalArtifact = historicalArtifactFixture();
  const { reportSha256, ...verificationReport } = historicalArtifact.verification;
  const legacyPackageJson = structuredClone(packageJsonFixture);
  legacyPackageJson.scripts.test = 'node --test test/*.test.mjs';
  verificationReport.packageJsonSha256 = sha256Text(JSON.stringify(legacyPackageJson));

  assert.throws(
    () => buildLocalV1CompletionArtifact({
      c13AttemptText,
      c13FinalText,
      implementationCommit: historicalArtifact.implementationCommit,
      sourceDocumentTexts: { ...sourceDocumentTexts, 'package.json': JSON.stringify(legacyPackageJson) },
      verificationReport,
    }),
    /requires current verification schema/,
  );
});

test('local v1 rejects schema-policy substitution even after report and artifact resealing', () => {
  for (const [artifact, substitutedVersion] of [
    [buildArtifact(), 'personal-ai-agent-local-v1-completion-verification/v2'],
    [historicalArtifactFixture(), 'personal-ai-agent-local-v1-completion-verification/v3'],
  ]) {
    const substituted = resealVerification(artifact, (content) => {
      content.verification.schemaVersion = substitutedVersion;
    });
    assert.throws(
      () => assertLocalV1CompletionArtifact(substituted),
      /verification check is not passed: unit-tests/,
    );
  }
});

test('local v1 rejects historical receipts rebound to a new commit and capped package', () => {
  const rebound = resealVerification(historicalArtifactFixture(), (content) => {
    content.implementationCommit = implementationCommit;
    content.verification.implementationCommit = implementationCommit;
    content.verification.packageJsonSha256 = sha256Text(JSON.stringify(packageJsonFixture));
    content.sourceDocumentSha256 = Object.fromEntries(
      Object.entries(sourceDocumentTexts).map(([document, text]) => [document, sha256Text(text)]),
    );
  });

  assert.throws(
    () => assertLocalV1CompletionArtifact(rebound, { implementationCommit, sourceDocumentTexts }),
    /verification package script binding failed: test/,
  );
});

test('local v1 binds every package script as well as the whole package hash', () => {
  const artifact = buildArtifact();
  for (const script of Object.keys(packageJsonFixture.scripts)) {
    const packageJson = structuredClone(packageJsonFixture);
    packageJson.scripts[script] = 'changed script';
    const changedSources = { ...sourceDocumentTexts, 'package.json': JSON.stringify(packageJson) };
    const rebound = resealVerification(artifact, (content) => {
      content.verification.packageJsonSha256 = sha256Text(JSON.stringify(packageJson));
      content.sourceDocumentSha256['package.json'] = sha256Text(changedSources['package.json']);
    });
    assert.throws(
      () => assertLocalV1CompletionArtifact(rebound, { sourceDocumentTexts: changedSources }),
      new RegExp(`verification package script binding failed: ${script}`),
    );
    assert.throws(
      () => buildLocalV1CompletionArtifact({
        c13AttemptText, c13FinalText, implementationCommit,
        sourceDocumentTexts: changedSources,
        verificationReport: buildVerificationReport(),
      }),
      /verification package.json binding failed/,
    );
  }
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
  const commands = [
    { command: 'npm test', id: 'unit-tests', packageScript: 'test', timeoutMs: 600_000 },
    {
      command: 'npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout',
      id: 'docs-gates-precloseout', packageScript: 'smoke:docs-gates', timeoutMs: 600_000,
    },
    {
      command: 'npm run smoke:release-artifact-hygiene',
      id: 'release-artifact-hygiene', packageScript: 'smoke:release-artifact-hygiene', timeoutMs: 600_000,
    },
    { command: 'git diff --check', id: 'git-diff-check', packageScript: null, timeoutMs: 60_000 },
  ];
  return {
    checks: commands.map((definition) => ({
      command: definition.command,
      commandSha256: sha256Text(definition.command),
      durationMs: 10,
      exitCode: 0,
      id: definition.id,
      packageScript: definition.packageScript,
      packageScriptSha256: definition.packageScript === null
        ? null
        : sha256Text(packageJsonFixture.scripts[definition.packageScript]),
      stderrSha256: sha256Text(''),
      stdoutSha256: sha256Text(definition.id),
      timedOut: false,
      timeoutMs: definition.timeoutMs,
    })),
    implementationCommit,
    packageJsonSha256: sha256Text(JSON.stringify(packageJsonFixture)),
    schemaVersion: 'personal-ai-agent-local-v1-completion-verification/v3',
    status: 'passed',
  };
}

function resealVerification(artifact, change) {
  return reseal(artifact, (content) => {
    change(content);
    const { reportSha256, ...report } = content.verification;
    content.verification.reportSha256 = sha256Text(JSON.stringify(report));
  });
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

// Fixed historical v2 bytes, independent of the current generated closeout artifact.
function historicalArtifactFixture() {
  return {
    activity: { apiCostUsd: 0, c13RerunCount: 0, closeoutModelExecutionCount: 0, externalProviderCallCount: 0, modelDownloadCount: 0 },
    authority: { actualUserData: false, defaultProfilePromotion: false, deployment: false, productionReadyClaim: false, runtimeActivation: false, training: false },
    c13: {
      actualModelCompatibility: 'actual-incompatible',
      attemptFileSha256: '49c042a1ca25f23755f986cb60aa61f5ec2fce1b3dee7bfeb721d01ecfe6dfc1',
      chairReachability: 'not-reached', decision: 'keep-stub-only', defaultProfile: 'knowledge-triad',
      failureKind: 'council-contract:invalid-output', failureStage: 'structured-output',
      finalFileSha256: '7c480599c955b113e801731d085e47074fc05d81adcac5c085383047436e1beb',
      localProviderRequestCount: 1, observationAttemptCount: 1, retryCount: 0,
    },
    completionMatrix: {
      localProduct: 'complete', provider: 'partial-external-blocked', deployment: 'external-blocked',
      privateDataTraining: 'approval-blocked-unverified', rollout: 'approval-blocked-unverified',
    },
    deliveryStatus: {
      council: 'completed-keep-stub-only', d4: 'completed',
      fineTuningProtocols: 'completed-private-authority-deferred', localRag: 'completed-default-path-unchanged',
    },
    externalBlockerIds: [
      'anthropic-billing-live-validation', 'hermes-target-provider-architecture-live-validation',
      'target-local-provider-architecture', 'hosted-saas-or-production-deployment',
    ],
    implementationCommit: '7d5197dd43afaf7d099f31195a8089b19ba3c013',
    schemaVersion: 'personal-ai-agent-local-v1-completion-closeout/v2',
    sourceDocumentSha256: {
      'CHANGELOG.md': '81f32acd55d81923f28922d89e050fcfa8bf88b61cabd8705c4d4f41ab2220e5',
      'README.md': 'd867598c019630f685d08a9623cc7be4c7c51db589b68e60009d6d5a9cc156be',
      'config/public-release-v0.1.0.json': '02963539e1f7d1c38b585ee762188e4569a9c0072c7742ecf48c2900f558e0e8',
      'config/public-walkthrough-v1.json': '3b24d3bc36d60a759d3ff152851ff72c8277de868b3ce7764f5a0e3a59c30e31',
      'config/pilot-feedback-v1.json': '320bb650c9cccd35801f6b9a29cadc6721e0daa06bf2f7581851f1cbe33704ee',
      'docs/refactoring-development-plan-v1.md': '96cb784a94a087e927bf70e9315657f10c8ff8963abe929710396e8fca0f2c4a',
      'docs/ml-rag-development-plan-v1.md': 'ab101a982d2753ed99840e0cc73af7397bb3babef71a26d0e7883f5221eb9ac9',
      'docs/multi-agent-council-development-plan-v1.md': 'a642709003aa3a79c67ac95515a2824feef8aaa6b68d664db800376ece948529',
      'docs/external-evidence-blockers-v1.md': '3f6d633b0ed5007ecee8b7a64ea36517d4a5dfa5b59115c77c3acfec66e66ee9',
      'docs/engineering-approval-workflow-rehearsal-v1.md': '068dc57f237a7d946d29b9960e36b0a14bca6ba566b7e12bce6fb0850201f4c5',
      'docs/pilot-feedback-v1.md': '0b74abae1761fa1a131c4eba772691de5549d93554c079462d971eae46f091ad',
      'docs/roadmap.md': 'bbf7dc7d4a031c4d224bdc048c9b5e30b006756681261ccb5bb9f754fde036ee',
      'docs/release-readiness-v1.md': '5c65024e30def571fe6d43b96c271c1ccc7c07e156695c8418da7526022bc4f0',
      'docs/product-plan-v1.md': '299c863fb87136ebe738ef9d3b485e818cc3a2ff8d14b341617eb58e4f4ea108',
      'docs/local-v1-completion-closeout-v1.md': 'e9574f590cdd0b44ca3d1380683f6739966b749b604e9a03e71fadcca41bfed6',
      'docs/smoke-validation-summary-v1.md': '797bdebaf288891d5abff8b3b62dff1355016a0d0c66ebcafd5e5c2e3557e2f0',
      'evidence/evidence_manifest.md': '6d1596ad66d7f4b8017562f761491951e41aa3fb83da9eabe3c67a4f6c7e4baa',
      'evidence/output-artifacts/engineering-approval-workflow-rehearsal.json': '86119fddbf98c7bd859076fb6011cf5647c40873a654bb38c8bf58a443ea26e1',
      'package.json': '73061a7edc659da873fa9aacc4da3ec383f001c13bc242cb1897acfa2a86237a',
    },
    status: 'local-v1-complete-external-evidence-open',
    verification: {
      checks: [
        {
          command: 'npm test', commandSha256: '328e123c63857fd8473bd4bd3581e655b08b7440d7f5d2c31cc375607582f539',
          durationMs: 105905, exitCode: 0, id: 'unit-tests', packageScript: 'test',
          packageScriptSha256: '910f73d25bb3adcd13e50bb0d5991f3cd22f2d0170104a6c14cf2d8563286369',
          stderrSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          stdoutSha256: '55c72d6988f5f6a49ce3b63e7910a9c77f4cd03bac88785a069cb70ef9f17762',
          timedOut: false, timeoutMs: 600000,
        },
        {
          command: 'npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout',
          commandSha256: 'b2b79ebbc595df499ab5603094cb3335ea81ddbe19386c5432ea9d9b80da2541',
          durationMs: 17724, exitCode: 0, id: 'docs-gates-precloseout', packageScript: 'smoke:docs-gates',
          packageScriptSha256: 'e2a760d6349ef788b72ed27ed07759b0d9ad3d359797f28740b5912c99f23ff9',
          stderrSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          stdoutSha256: 'af63dfc09b33f344c6a64cd6bdf82b43388f8c6aac318c9a922edd1804af656f',
          timedOut: false, timeoutMs: 600000,
        },
        {
          command: 'npm run smoke:release-artifact-hygiene',
          commandSha256: '93c15f412966f4ec775719b634a6e54c43ea2e547c4ad80ee029cb5e2f49b35b',
          durationMs: 348, exitCode: 0, id: 'release-artifact-hygiene', packageScript: 'smoke:release-artifact-hygiene',
          packageScriptSha256: 'c50a6a14c86206caae7e3f6f35179e4f5ffdf7f2ea6f39e5ea75da6ce57b4e71',
          stderrSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          stdoutSha256: 'e56da40489e6452b4ab9dbf15d94bea80e2ddd7ce7871d44e1afc033f2af4aed',
          timedOut: false, timeoutMs: 600000,
        },
        {
          command: 'git diff --check', commandSha256: '466c2f308b48c7661d646fdd068fbecea974c665fe65dbf8ed508f224180ce0b',
          durationMs: 64, exitCode: 0, id: 'git-diff-check', packageScript: null, packageScriptSha256: null,
          stderrSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          stdoutSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          timedOut: false, timeoutMs: 60000,
        },
      ],
      implementationCommit: '7d5197dd43afaf7d099f31195a8089b19ba3c013',
      packageJsonSha256: 'db878b9af1f3ed6603b16e381b6a05527be6121aacee583c970c4955ea054991',
      reportSha256: '43f986a57f29babf0cf25893121353e961aa1795fb9db6037a00b07c117b4c06',
      schemaVersion: 'personal-ai-agent-local-v1-completion-verification/v2', status: 'passed',
    },
    id: 'local-v1-completion-closeout-05b365a9e3b6520cd7853d4e3d50facae1aa5b2ef8cc308da49efb5d5716c3fd',
    integrityHash: '05b365a9e3b6520cd7853d4e3d50facae1aa5b2ef8cc308da49efb5d5716c3fd',
  };
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}
