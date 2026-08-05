import { createHash } from 'node:crypto';

import {
  assertC13ActualCompatibilityArtifact,
  assertC13AttemptReceipt,
} from './local-council-v6-actual-compatibility-observation.mjs';

export const LOCAL_V1_COMPLETION_SCHEMA_VERSION = 'personal-ai-agent-local-v1-completion-closeout/v1';
export const LOCAL_V1_COMPLETION_STATUS = 'local-v1-complete-external-evidence-open';
export const LOCAL_V1_VERIFICATION_SCHEMA_VERSION = 'personal-ai-agent-local-v1-completion-verification/v2';

export const LOCAL_V1_SOURCE_DOCUMENTS = [
  'CHANGELOG.md',
  'README.md',
  'config/public-release-v0.1.0.json',
  'docs/refactoring-development-plan-v1.md',
  'docs/ml-rag-development-plan-v1.md',
  'docs/multi-agent-council-development-plan-v1.md',
  'docs/external-evidence-blockers-v1.md',
  'docs/roadmap.md',
  'docs/product-plan-v1.md',
  'docs/local-v1-completion-closeout-v1.md',
  'docs/smoke-validation-summary-v1.md',
  'evidence/evidence_manifest.md',
  'package.json',
];

export const LOCAL_V1_EXTERNAL_BLOCKER_IDS = [
  'anthropic-billing-live-validation',
  'hermes-target-provider-architecture-live-validation',
  'target-local-provider-architecture',
  'public-or-private-walkthrough-url',
  'actual-pilot-feedback-and-metrics',
  'hosted-saas-or-production-deployment',
];

export const LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS = [
  {
    command: ['npm', 'test'],
    id: 'unit-tests',
    packageScript: 'test',
    packageScriptCommand: 'node --test test/*.test.mjs',
    timeoutMs: 10 * 60 * 1000,
  },
  {
    command: ['npm', 'run', 'smoke:docs-gates', '--', '--exclude', 'smoke:local-v1-completion-closeout'],
    id: 'docs-gates-precloseout',
    packageScript: 'smoke:docs-gates',
    packageScriptCommand: 'node scripts/run-all-smokes.mjs --group docs-gates',
    timeoutMs: 10 * 60 * 1000,
  },
  {
    command: ['npm', 'run', 'smoke:release-artifact-hygiene'],
    id: 'release-artifact-hygiene',
    packageScript: 'smoke:release-artifact-hygiene',
    packageScriptCommand: 'node scripts/smoke-release-artifact-hygiene.mjs',
    timeoutMs: 10 * 60 * 1000,
  },
  {
    command: ['git', 'diff', '--check'],
    id: 'git-diff-check',
    packageScript: null,
    packageScriptCommand: null,
    timeoutMs: 60 * 1000,
  },
];
export const LOCAL_V1_VERIFICATION_CHECK_IDS = LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS.map(({ id }) => id);
const LOCAL_V1_TIMEOUT_OVERHEAD_MS = 5_000;
const AUTHORITY_KEYS = [
  'actualUserData',
  'defaultProfilePromotion',
  'deployment',
  'productionReadyClaim',
  'runtimeActivation',
  'training',
];
const ACTIVITY_KEYS = [
  'apiCostUsd',
  'c13RerunCount',
  'closeoutModelExecutionCount',
  'externalProviderCallCount',
  'modelDownloadCount',
];
const FORBIDDEN_KEYS = new Set([
  'absolutePath', 'apiKey', 'authorization', 'output', 'path', 'prompt', 'raw',
  'rawMessage', 'rawOutput', 'response', 'secret', 'token',
]);

export function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildLocalV1CompletionArtifact({
  c13AttemptText,
  c13FinalText,
  implementationCommit,
  sourceDocumentTexts,
  verificationReport,
}) {
  assertImplementationCommit(implementationCommit);
  assertLocalV1VerificationReport(verificationReport);
  if (verificationReport.implementationCommit !== implementationCommit) {
    throw new Error('Local v1 verification implementation commit binding failed.');
  }
  assertVerificationPackageBinding(verificationReport, sourceDocumentTexts);
  const content = {
    activity: Object.fromEntries(ACTIVITY_KEYS.map((key) => [key, 0])),
    authority: Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, false])),
    c13: buildC13Binding({ c13AttemptText, c13FinalText }),
    deliveryStatus: {
      council: 'completed-keep-stub-only',
      d4: 'completed',
      fineTuningProtocols: 'completed-private-authority-deferred',
      localRag: 'completed-default-path-unchanged',
    },
    externalBlockerIds: [...LOCAL_V1_EXTERNAL_BLOCKER_IDS],
    implementationCommit,
    schemaVersion: LOCAL_V1_COMPLETION_SCHEMA_VERSION,
    sourceDocumentSha256: buildSourceDocumentSha256(sourceDocumentTexts),
    status: LOCAL_V1_COMPLETION_STATUS,
    verification: buildVerificationBinding(verificationReport),
  };
  const integrityHash = hashRecord(content);
  return { ...content, id: `local-v1-completion-closeout-${integrityHash}`, integrityHash };
}

export function assertLocalV1CompletionArtifact(artifact, {
  c13AttemptText,
  c13FinalText,
  implementationCommit,
  sourceDocumentTexts,
  verificationReport,
} = {}) {
  exactKeys(artifact, [
    'activity', 'authority', 'c13', 'deliveryStatus', 'externalBlockerIds', 'id',
    'implementationCommit', 'integrityHash', 'schemaVersion', 'sourceDocumentSha256',
    'status', 'verification',
  ], 'Local v1 completion artifact');
  assertContentFree(artifact, 'Local v1 completion artifact');
  const { id, integrityHash, ...content } = artifact;
  if (
    artifact.schemaVersion !== LOCAL_V1_COMPLETION_SCHEMA_VERSION ||
    artifact.status !== LOCAL_V1_COMPLETION_STATUS ||
    !isSha256(integrityHash) || integrityHash !== hashRecord(content) ||
    id !== `local-v1-completion-closeout-${integrityHash}`
  ) throw new Error('Local v1 completion artifact integrity failed.');
  assertImplementationCommit(artifact.implementationCommit);
  exactKeys(artifact.deliveryStatus, [
    'council', 'd4', 'fineTuningProtocols', 'localRag',
  ], 'Local v1 delivery status');
  if (
    artifact.deliveryStatus.d4 !== 'completed' ||
    artifact.deliveryStatus.localRag !== 'completed-default-path-unchanged' ||
    artifact.deliveryStatus.fineTuningProtocols !== 'completed-private-authority-deferred' ||
    artifact.deliveryStatus.council !== 'completed-keep-stub-only'
  ) throw new Error('Local v1 delivery status drifted.');
  assertExactArray(artifact.externalBlockerIds, LOCAL_V1_EXTERNAL_BLOCKER_IDS, 'Local v1 external blocker ids');
  exactKeys(artifact.activity, ACTIVITY_KEYS, 'Local v1 closeout activity');
  if (Object.values(artifact.activity).some((value) => value !== 0)) {
    throw new Error('Local v1 closeout activity must remain zero.');
  }
  exactKeys(artifact.authority, AUTHORITY_KEYS, 'Local v1 authority');
  if (Object.values(artifact.authority).some((value) => value !== false)) {
    throw new Error('Local v1 authority must remain false.');
  }
  assertC13Binding(artifact.c13, { c13AttemptText, c13FinalText });
  assertSourceDocumentSha256(artifact.sourceDocumentSha256, sourceDocumentTexts);
  assertVerificationBinding(artifact.verification, verificationReport);
  if (sourceDocumentTexts !== undefined) {
    assertVerificationPackageBinding(artifact.verification, sourceDocumentTexts);
  }
  if (artifact.verification.implementationCommit !== artifact.implementationCommit) {
    throw new Error('Local v1 verification implementation commit binding failed.');
  }
  if (implementationCommit && artifact.implementationCommit !== implementationCommit) {
    throw new Error('Local v1 implementation commit binding failed.');
  }
  return artifact;
}

export function assertLocalV1VerificationReport(report) {
  exactKeys(report, [
    'checks', 'implementationCommit', 'packageJsonSha256', 'schemaVersion', 'status',
  ], 'Local v1 verification report');
  if (
    report.schemaVersion !== LOCAL_V1_VERIFICATION_SCHEMA_VERSION ||
    report.status !== 'passed' ||
    !isSha256(report.packageJsonSha256) ||
    !Array.isArray(report.checks) ||
    report.checks.length !== LOCAL_V1_VERIFICATION_CHECK_IDS.length
  ) throw new Error('Local v1 verification report is invalid.');
  assertImplementationCommit(report.implementationCommit);
  assertExactArray(
    report.checks.map((check) => check.id),
    LOCAL_V1_VERIFICATION_CHECK_IDS,
    'Local v1 verification checks',
  );
  for (const [index, check] of report.checks.entries()) {
    const expected = LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS[index];
    exactKeys(check, [
      'command', 'commandSha256', 'durationMs', 'exitCode', 'id', 'packageScript',
      'packageScriptSha256', 'stderrSha256', 'stdoutSha256', 'timedOut', 'timeoutMs',
    ], 'Local v1 verification check');
    if (
      check.id !== expected.id ||
      check.command !== formatCommand(expected.command) ||
      check.commandSha256 !== sha256Text(check.command) ||
      check.exitCode !== 0 ||
      check.timedOut !== false ||
      check.timeoutMs !== expected.timeoutMs ||
      !Number.isSafeInteger(check.durationMs) || check.durationMs < 0 ||
      check.durationMs > check.timeoutMs + LOCAL_V1_TIMEOUT_OVERHEAD_MS ||
      !isSha256(check.stdoutSha256) ||
      !isSha256(check.stderrSha256) ||
      check.packageScript !== expected.packageScript ||
      check.packageScriptSha256 !== packageScriptSha256(expected.packageScriptCommand)
    ) {
      throw new Error(`Local v1 verification check is not passed: ${check.id}.`);
    }
  }
  return report;
}

function buildC13Binding({ c13AttemptText, c13FinalText }) {
  const attempt = parseJson(c13AttemptText, 'C13 attempt receipt');
  const finalArtifact = parseJson(c13FinalText, 'C13 final artifact');
  assertC13AttemptReceipt(attempt);
  assertC13ActualCompatibilityArtifact(finalArtifact, { attemptReceipt: attempt, attemptReceiptText: c13AttemptText });
  return {
    actualModelCompatibility: finalArtifact.actualModelCompatibility,
    attemptFileSha256: sha256Text(c13AttemptText),
    chairReachability: finalArtifact.chairReachability,
    decision: finalArtifact.qualification.decision,
    defaultProfile: 'knowledge-triad',
    failureKind: finalArtifact.calls[0]?.failureKind,
    failureStage: finalArtifact.calls[0]?.failureStage,
    finalFileSha256: sha256Text(c13FinalText),
    localProviderRequestCount: finalArtifact.localProviderRequestCount,
    observationAttemptCount: finalArtifact.observationAttemptCount,
    retryCount: finalArtifact.calls.reduce((total, call) => total + call.retryCount, 0),
  };
}

function assertC13Binding(binding, { c13AttemptText, c13FinalText }) {
  exactKeys(binding, [
    'actualModelCompatibility', 'attemptFileSha256', 'chairReachability', 'decision',
    'defaultProfile', 'failureKind', 'failureStage', 'finalFileSha256',
    'localProviderRequestCount', 'observationAttemptCount', 'retryCount',
  ], 'Local v1 C13 binding');
  if (
    binding.actualModelCompatibility !== 'actual-incompatible' ||
    binding.chairReachability !== 'not-reached' || binding.decision !== 'keep-stub-only' ||
    binding.defaultProfile !== 'knowledge-triad' || !isSha256(binding.attemptFileSha256) ||
    binding.failureKind !== 'council-contract:invalid-output' ||
    binding.failureStage !== 'structured-output' ||
    !isSha256(binding.finalFileSha256) ||
    binding.localProviderRequestCount !== 1 ||
    binding.observationAttemptCount !== 1 ||
    binding.retryCount !== 0
  ) throw new Error('Local v1 C13 status or authority drifted.');
  if (c13AttemptText !== undefined && binding.attemptFileSha256 !== sha256Text(c13AttemptText)) {
    throw new Error('Local v1 C13 attempt file binding failed.');
  }
  if (c13FinalText !== undefined && binding.finalFileSha256 !== sha256Text(c13FinalText)) {
    throw new Error('Local v1 C13 final file binding failed.');
  }
}

function buildSourceDocumentSha256(sourceDocumentTexts) {
  assertSourceDocumentTexts(sourceDocumentTexts);
  return Object.fromEntries(LOCAL_V1_SOURCE_DOCUMENTS.map((document) => [
    document,
    sha256Text(sourceDocumentTexts[document]),
  ]));
}

function assertSourceDocumentSha256(documentHashes, sourceDocumentTexts) {
  exactKeys(documentHashes, LOCAL_V1_SOURCE_DOCUMENTS, 'Local v1 source document hashes');
  for (const document of LOCAL_V1_SOURCE_DOCUMENTS) {
    if (!isSha256(documentHashes[document])) throw new Error(`Local v1 source document hash is invalid: ${document}.`);
  }
  if (sourceDocumentTexts !== undefined) {
    const expected = buildSourceDocumentSha256(sourceDocumentTexts);
    if (JSON.stringify(documentHashes) !== JSON.stringify(expected)) {
      throw new Error('Local v1 source document binding failed.');
    }
  }
}

function assertSourceDocumentTexts(sourceDocumentTexts) {
  exactKeys(sourceDocumentTexts, LOCAL_V1_SOURCE_DOCUMENTS, 'Local v1 source documents');
  for (const document of LOCAL_V1_SOURCE_DOCUMENTS) {
    if (typeof sourceDocumentTexts[document] !== 'string') {
      throw new Error(`Local v1 source document is invalid: ${document}.`);
    }
  }
}

function buildVerificationBinding(verificationReport) {
  const report = canonicalVerificationReport(verificationReport);
  return {
    checks: report.checks,
    implementationCommit: report.implementationCommit,
    packageJsonSha256: report.packageJsonSha256,
    reportSha256: sha256Text(JSON.stringify(report)),
    schemaVersion: report.schemaVersion,
    status: report.status,
  };
}

function assertVerificationBinding(binding, verificationReport) {
  exactKeys(binding, [
    'checks', 'implementationCommit', 'packageJsonSha256', 'reportSha256', 'schemaVersion', 'status',
  ], 'Local v1 verification binding');
  const report = canonicalVerificationReport({
    checks: binding.checks,
    implementationCommit: binding.implementationCommit,
    packageJsonSha256: binding.packageJsonSha256,
    schemaVersion: binding.schemaVersion,
    status: binding.status,
  });
  assertLocalV1VerificationReport(report);
  if (!isSha256(binding.reportSha256) || binding.reportSha256 !== sha256Text(JSON.stringify(report))) {
    throw new Error('Local v1 verification report integrity failed.');
  }
  if (verificationReport !== undefined) {
    const expected = canonicalVerificationReport(verificationReport);
    if (binding.reportSha256 !== sha256Text(JSON.stringify(expected))) {
      throw new Error('Local v1 verification report binding failed.');
    }
  }
}

function canonicalVerificationReport(report) {
  assertLocalV1VerificationReport(report);
  return {
    checks: report.checks.map(canonicalVerificationCheck),
    implementationCommit: report.implementationCommit,
    packageJsonSha256: report.packageJsonSha256,
    schemaVersion: report.schemaVersion,
    status: report.status,
  };
}

function canonicalVerificationCheck(check) {
  return {
    command: check.command,
    commandSha256: check.commandSha256,
    durationMs: check.durationMs,
    exitCode: check.exitCode,
    id: check.id,
    packageScript: check.packageScript,
    packageScriptSha256: check.packageScriptSha256,
    stderrSha256: check.stderrSha256,
    stdoutSha256: check.stdoutSha256,
    timedOut: check.timedOut,
    timeoutMs: check.timeoutMs,
  };
}

function assertVerificationPackageBinding(report, sourceDocumentTexts) {
  let packageJson;
  try {
    packageJson = JSON.parse(sourceDocumentTexts['package.json']);
  } catch {
    throw new Error('Local v1 package.json source is invalid.');
  }
  if (report.packageJsonSha256 !== sha256Text(JSON.stringify(packageJson))) {
    throw new Error('Local v1 verification package.json binding failed.');
  }
}

function assertImplementationCommit(value) {
  if (!/^[a-f0-9]{40}$/.test(value || '')) {
    throw new Error('Local v1 implementation commit must be a 40-character SHA-1.');
  }
}

function assertContentFree(value, label) {
  walk(value, (entry, key) => {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`${label} contains forbidden ${key}.`);
    if (typeof entry === 'string' && /^(?:\/|~[\\/]|[A-Za-z]:[\\/]|file:)/.test(entry)) {
      throw new Error(`${label} contains an absolute local path.`);
    }
  });
}

function walk(value, visit, key = '') {
  visit(value, key);
  if (!value || typeof value !== 'object') return;
  for (const [childKey, childValue] of Object.entries(value)) walk(childValue, visit, childKey);
}

function parseJson(value, label) {
  if (typeof value !== 'string') throw new Error(`${label} text is required.`);
  try { return JSON.parse(value); } catch { throw new Error(`${label} JSON is invalid.`); }
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} keys are invalid.`);
  }
}

function assertExactArray(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} are invalid.`);
}

function hashRecord(value) { return sha256Text(JSON.stringify(value)); }
function isSha256(value) { return /^[a-f0-9]{64}$/.test(value || ''); }
function formatCommand(parts) { return parts.join(' '); }
function packageScriptSha256(value) { return value === null ? null : sha256Text(value); }
