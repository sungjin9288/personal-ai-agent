import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  convertMissionAttachmentFile,
  getDocumentConversionCapabilities,
} from '../core/document-conversion-service.mjs';
import { buildDoctorDiagnosticsSummary, runDoctor } from '../core/doctor-service.mjs';
import { createId } from '../core/id.mjs';
import { createMissionService } from '../core/mission-service.mjs';
import { evaluateApiRbac, normalizeRbacMode, normalizeRbacRole } from '../core/rbac-policy.mjs';
import { createReleaseCommandOrchestrator } from '../core/release-command-orchestrator.mjs';
import { getReleaseBlockerHandoff } from '../core/release-readiness-service.mjs';
import { resolveRootDir } from '../core/root.mjs';
import { evaluateTenantAccess, extractTenantClaim, normalizeTenantMode } from '../core/tenant-policy.mjs';
import { createRuntimeJobRunner } from '../core/runtime-job-runner.mjs';
import { createRuntimeJobRegistry } from '../core/runtime-job-registry.mjs';
import { createRuntimeRequestRegistry } from '../core/runtime-request-registry.mjs';
import { createRuntimeStatusService } from '../core/runtime-status-service.mjs';
import { createStore } from '../core/store.mjs';
import { evaluateOidcWebAuth, evaluateWebAuth, normalizeWebAuthMode } from '../core/web-auth-policy.mjs';
import { createActionHandlerFactory } from './action-handlers.mjs';
import { resolveWithinRoot } from './path-guard.mjs';
import { createExecutionV1ReleaseArtifactResolver } from './release-artifact-resolver.mjs';
import { createExecutionV1ReleaseHandlerFactory } from './release-handlers.mjs';
import {
  extractBulletValue,
  extractBulletsAfterLabel,
  extractMarkdownSection,
  extractPlainStatus,
  extractSectionBullets,
} from './release-markdown-parser.mjs';
import {
  assembleExecutionV1Status,
  buildExecutionV1ArtifactSummary,
} from './release-status-assembler.mjs';
import { createRouteRegistry } from './route-registry.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = resolveRootDir();
const codeRootDir = process.cwd();
const rbacMode = normalizeRbacMode(process.env.PERSONAL_AI_AGENT_RBAC_MODE);
const webAuthMode = normalizeWebAuthMode(process.env.PERSONAL_AI_AGENT_WEB_AUTH_MODE);
const webAuthToken = String(process.env.PERSONAL_AI_AGENT_WEB_AUTH_TOKEN || '');
const oidcIssuer = String(process.env.PERSONAL_AI_AGENT_OIDC_ISSUER || '').trim();
const oidcAudience = String(process.env.PERSONAL_AI_AGENT_OIDC_AUDIENCE || '').trim();
const oidcJwksUrl = String(process.env.PERSONAL_AI_AGENT_OIDC_JWKS_URL || '').trim();
const oidcRoleClaim = String(process.env.PERSONAL_AI_AGENT_OIDC_ROLE_CLAIM || 'role').trim() || 'role';
const tenantMode = normalizeTenantMode(process.env.PERSONAL_AI_AGENT_TENANT_MODE);
const tenantClaim = String(process.env.PERSONAL_AI_AGENT_TENANT_CLAIM || 'tenant_id').trim() || 'tenant_id';
const publicDir = path.join(__dirname, 'public');
const evidenceScriptPath = path.join(codeRootDir, 'scripts', 'build-execution-v1-evidence.mjs');
const closeoutScriptPath = path.join(codeRootDir, 'scripts', 'build-execution-v1-closeout.mjs');
const handoffScriptPath = path.join(codeRootDir, 'scripts', 'build-execution-v1-handoff.mjs');
const preflightAllScriptPath = path.join(codeRootDir, 'scripts', 'preflight-execution-v1-all.mjs');
const preflightScriptPath = path.join(codeRootDir, 'scripts', 'preflight-execution-v1-live.mjs');
const snapshotScriptPath = path.join(codeRootDir, 'scripts', 'archive-execution-v1-snapshot.mjs');
const evidenceDocPath = path.join(rootDir, 'docs', 'execution-v1-evidence.md');
const closeoutDocPath = path.join(rootDir, 'docs', 'execution-v1-closeout.md');
const handoffDocPath = path.join(rootDir, 'docs', 'execution-v1-handoff.md');
const releaseReadinessDocPath = path.join(rootDir, 'docs', 'release-readiness-v1.md');
const pilotExportPackageDocPath = path.join(rootDir, 'docs', 'pilot-export-package-v1.md');
const productionLikeReleaseDrillDocPath = path.join(rootDir, 'docs', 'production-like-release-drill-v1.md');
const executionV1SnapshotsRoot = path.join(rootDir, 'docs', 'releases', 'execution-v1');
const executionV1ReleaseArtifactRoot = path.join(rootDir, 'output', 'playwright');
const executionV1MutableArtifactPaths = new Set([
  'docs/execution-v1-closeout.md',
  'docs/execution-v1-evidence.md',
  'docs/execution-v1-handoff.md',
  'docs/clean-deployment-release-v1.md',
  'docs/demo-evidence-index-v1.md',
  'docs/pilot-export-package-v1.md',
  'docs/production-like-release-drill-v1.md',
  'docs/production-slo-operating-v1.md',
  'docs/production-retention-operating-v1.md',
  'docs/production-provider-readiness-v1.md',
  'docs/production-enterprise-controls-v1.md',
  'docs/release-readiness-v1.md',
  'evidence/cli-logs/representative-release-demo-replay.log',
  'evidence/output-artifacts/representative-release-demo-browser-e2e.json',
  'evidence/output-artifacts/representative-release-demo-summary.json',
  'evidence/screenshots/representative-release-demo-release-status.png',
]);
const executionV1ReleaseEvidenceDocPaths = new Set([
  ...executionV1MutableArtifactPaths,
  'docs/target-openai-provider-account-v1.md',
  'docs/target-anthropic-provider-account-v1.md',
  'docs/target-clean-deployment-operations-v1.md',
  'docs/target-deployment-contract-v1.md',
  'docs/target-environment-evidence-intake-v1.md',
  'docs/target-hermes-provider-architecture-v1.md',
  'docs/target-local-provider-architecture-v1.md',
  'docs/target-provider-evidence-intake-v1.md',
  'docs/target-provider-operations-v1.md',
]);
const releaseHandoffStableLineCopyBaseKey =
  'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy';

function capitalizeReleaseHandoffSummaryKey(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function buildReleaseHandoffStableLineCopyKey(totalLineCopyCount) {
  return `${releaseHandoffStableLineCopyBaseKey}${'LineCopy'.repeat(totalLineCopyCount - 5)}`;
}

function buildReleaseHandoffSummaryVerificationReportKey(summaryKey) {
  return `releaseHandoff${capitalizeReleaseHandoffSummaryKey(summaryKey)}VerificationSummary`;
}

function buildReleaseHandoffSummaryArtifactPrefix(summaryKey) {
  return `releaseHandoff${capitalizeReleaseHandoffSummaryKey(summaryKey)}`;
}

function parseReleaseHandoffSummaryArtifactKey(key) {
  const match = String(key || '').match(
    /^releaseHandoff(.+?)(ExactMatchCount|OverviewLine|StableDigestSha256|TotalArtifacts|TotalChecks|VerificationSummary)$/,
  );
  if (!match || !match[1].startsWith('SummaryStableLineCopy')) {
    return '';
  }
  return `${match[1][0].toLowerCase()}${match[1].slice(1)}`;
}

function getReleaseHandoffStableSummaryKeys(summaryArtifact = {}, structuredSummary = {}) {
  return [...new Set([
      ...Object.keys(structuredSummary || {}).filter((key) => key.startsWith('summaryStableLineCopy')),
      ...Object.keys(summaryArtifact || {})
        .map((key) => parseReleaseHandoffSummaryArtifactKey(key))
        .filter(Boolean),
    ])].sort((left, right) => left.length - right.length || left.localeCompare(right));
}

function buildReleaseHandoffSummaryArtifactFallback(summaryArtifact = {}, summaryKey = '') {
  const prefix = buildReleaseHandoffSummaryArtifactPrefix(summaryKey);
  const verificationSummary = summaryArtifact[`${prefix}VerificationSummary`];
  const promotedReport = summaryArtifact[buildReleaseHandoffSummaryVerificationReportKey(summaryKey)];
  const stableLines = Array.isArray(verificationSummary?.stableLines)
    ? verificationSummary.stableLines
    : Array.isArray(promotedReport?.stableLines)
      ? promotedReport.stableLines
      : [];
  const exactMatchCount = Number(
    summaryArtifact[`${prefix}ExactMatchCount`] ?? promotedReport?.exactMatchCount ?? 0,
  );
  return {
    exactMatchCount,
    errorFreeSessions: exactMatchCount,
    overviewLine: String(summaryArtifact[`${prefix}OverviewLine`] ?? promotedReport?.overviewLine ?? '').trim(),
    stableDigestSha256: String(
      summaryArtifact[`${prefix}StableDigestSha256`] ?? promotedReport?.stableSha256 ?? '',
    ).trim(),
    stableLineCount: stableLines.length,
    stableLines,
    totalSessions: Number(
      summaryArtifact[`${prefix}TotalChecks`]
        ?? summaryArtifact[`${prefix}TotalArtifacts`]
        ?? promotedReport?.totalChecks
        ?? 0,
    ),
  };
}

function resolveReleaseHandoffSummaryArtifactPath(spec = {}) {
  if (!String(spec.id || '').startsWith('handoff-')) {
    return '';
  }
  if (spec.format === 'json') {
    return spec.path;
  }
  return String(spec.path || '').replace(/\.(md|markdown|txt)$/i, '.json');
}

const executionV1ReleaseHandoffArtifactSpecs = [
  {
    description: '브라우저 E2E 메인 report',
    format: 'json',
    id: 'browser-report',
    kind: 'report',
    label: 'browser-e2e.json',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-browser-e2e.json'),
    recommended: false,
  },
  {
    description: '브라우저 E2E screenshot',
    format: 'png',
    id: 'browser-screenshot',
    kind: 'screenshot',
    label: 'browser-e2e.png',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-browser-e2e.png'),
    recommended: false,
  },
  {
    description: 'browser visual evidence manifest',
    format: 'json',
    id: 'visual-evidence-manifest-json',
    kind: 'visual-evidence-manifest',
    label: 'visual-evidence-manifest.json',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-visual-evidence-manifest.json'),
    recommended: false,
  },
  {
    description: 'release handoff verification JSON',
    format: 'json',
    id: 'handoff-digest-json',
    kind: 'handoff-digest',
    label: 'handoff-digest.json',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-digest.json'),
    recommended: false,
  },
  {
    description: 'release handoff verification plain text',
    format: 'text',
    id: 'handoff-digest-text',
    kind: 'handoff-digest',
    label: 'handoff-digest.txt',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-digest.txt'),
    recommended: false,
  },
  {
    description: 'release handoff verification rendered view',
    format: 'markdown',
    id: 'handoff-digest-markdown',
    kind: 'handoff-digest',
    label: 'handoff-digest.md',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-digest.md'),
    recommended: false,
  },
  {
    description: 'release handoff artifact bundle manifest',
    format: 'json',
    id: 'handoff-manifest-json',
    kind: 'handoff-manifest',
    label: 'handoff-manifest.json',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-manifest.json'),
    recommended: false,
  },
  {
    description: 'release handoff artifact bundle manifest plain text',
    format: 'text',
    id: 'handoff-manifest-text',
    kind: 'handoff-manifest',
    label: 'handoff-manifest.txt',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-manifest.txt'),
    recommended: false,
  },
  {
    description: 'release handoff artifact bundle manifest rendered view',
    format: 'markdown',
    id: 'handoff-manifest-markdown',
    kind: 'handoff-manifest',
    label: 'handoff-manifest.md',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-manifest.md'),
    recommended: false,
  },
  {
    description: 'keyed release handoff artifact index',
    format: 'json',
    id: 'handoff-index-json',
    kind: 'handoff-index',
    label: 'handoff-index.json',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-index.json'),
    recommended: false,
  },
  {
    description: 'plain-text release handoff artifact index',
    format: 'text',
    id: 'handoff-index-text',
    kind: 'handoff-index',
    label: 'handoff-index.txt',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-index.txt'),
    recommended: false,
  },
  {
    description: 'rendered release handoff artifact index',
    format: 'markdown',
    id: 'handoff-index-markdown',
    kind: 'handoff-index',
    label: 'handoff-index.md',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-handoff-index.md'),
    recommended: false,
  },
  {
    description: 'reviewer용 release-doc index',
    format: 'markdown',
    id: 'index-markdown',
    kind: 'index',
    label: 'index.md',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-index.md'),
    recommended: true,
  },
  {
    description: 'handoff용 plain-text index',
    format: 'text',
    id: 'index-text',
    kind: 'index',
    label: 'index.txt',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-index.txt'),
    recommended: true,
  },
  {
    description: 'tooling용 keyed index',
    format: 'json',
    id: 'index-json',
    kind: 'index',
    label: 'index.json',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-index.json'),
    recommended: true,
  },
  {
    description: 'release-doc manifest rendered view',
    format: 'markdown',
    id: 'manifest-markdown',
    kind: 'manifest',
    label: 'manifest.md',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-manifest.md'),
    recommended: false,
  },
  {
    description: 'release-doc manifest plain text',
    format: 'text',
    id: 'manifest-text',
    kind: 'manifest',
    label: 'manifest.txt',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-manifest.txt'),
    recommended: false,
  },
  {
    description: 'release-doc manifest JSON',
    format: 'json',
    id: 'manifest-json',
    kind: 'manifest',
    label: 'manifest.json',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-manifest.json'),
    recommended: false,
  },
  {
    description: 'release-doc digest rendered view',
    format: 'markdown',
    id: 'digest-markdown',
    kind: 'digest',
    label: 'digest.md',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-digest.md'),
    recommended: false,
  },
  {
    description: 'release-doc digest plain text',
    format: 'text',
    id: 'digest-text',
    kind: 'digest',
    label: 'digest.txt',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-digest.txt'),
    recommended: false,
  },
  {
    description: 'release-doc digest JSON',
    format: 'json',
    id: 'digest-json',
    kind: 'digest',
    label: 'digest.json',
    path: path.join(executionV1ReleaseArtifactRoot, 'execution-v1-release-doc-digest.json'),
    recommended: false,
  },
];
const releaseArtifactResolver = createExecutionV1ReleaseArtifactResolver({
  evidenceDocPaths: executionV1ReleaseEvidenceDocPaths,
  handoffArtifactSpecs: executionV1ReleaseHandoffArtifactSpecs,
  mutableArtifactPaths: executionV1MutableArtifactPaths,
  rootDir,
});
const liveValidationProviders = [
  {
    command: 'npm run live:execution-v1:openai',
    evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-openai',
    envKey: 'OPENAI_API_KEY',
    label: 'OpenAI',
    provider: 'openai',
  },
  {
    command: 'npm run live:execution-v1:anthropic',
    evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    label: 'Anthropic',
    provider: 'anthropic',
  },
  {
    command: 'npm run live:execution-v1:local',
    evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-local',
    envKey: 'LOCAL_PROVIDER_MODEL',
    label: 'Local provider',
    provider: 'local',
  },
  {
    command: 'npm run live:execution-v1:hermes',
    evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-hermes',
    envKey: 'HERMES_PROVIDER_MODEL',
    label: 'Hermes',
    provider: 'hermes',
  },
];
const host = String(process.env.PERSONAL_AI_AGENT_UI_HOST || '127.0.0.1').trim() || '127.0.0.1';
const requestedPort = Number(process.env.PERSONAL_AI_AGENT_UI_PORT || 4317);
let activePort = requestedPort;
const serverDiscoveryPath = path.join(rootDir, 'var', 'server.json');
const runtimeJobRegistry = createRuntimeJobRegistry({ rootDir });
const runtimeJobRunner = createRuntimeJobRunner({ registry: runtimeJobRegistry });
const runtimeRequestRegistry = createRuntimeRequestRegistry({ rootDir });
const runtimeStatus = createRuntimeStatusService({ rootDir });

const store = createStore({ rootDir });
const service = createMissionService({ store, rootDir });
const recoveredRuntimeJobs = runtimeJobRegistry.recoverStaleActiveJobs({
  reason: 'web-ui-start',
});
const recoveredRuntimeRequests = runtimeRequestRegistry.recoverStaleActiveRequests({
  reason: 'web-ui-start',
});

function normalizeRequestId(value) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return typeof rawValue === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(rawValue)
    ? rawValue
    : `req_${randomUUID()}`;
}

function resolveRequestRbacRole(request, auth = {}) {
  if (auth.mode === 'oidc' && auth.authenticated) {
    return normalizeRbacRole(auth.role || 'viewer');
  }

  return normalizeRbacRole(
    request.headers['x-personal-ai-agent-role'] ||
      request.headers['x-operator-role'] ||
      process.env.PERSONAL_AI_AGENT_DEFAULT_ROLE ||
      'viewer',
  );
}

function writeServerDiscovery({ actualPort, fallback = false }) {
  const url = `http://${host}:${actualPort}`;
  fs.mkdirSync(path.dirname(serverDiscoveryPath), { recursive: true });
  fs.writeFileSync(
    serverDiscoveryPath,
    `${JSON.stringify(
      {
        actualPort,
        fallback,
        host,
        pid: process.pid,
        requestedPort,
        rootDir,
        runtimeJobRegistryPath: runtimeJobRegistry.registryPath,
        runtimeRequestRegistryPath: runtimeRequestRegistry.registryPath,
        staleRuntimeJobCount: recoveredRuntimeJobs.recoveredCount,
        staleRuntimeRequestCount: recoveredRuntimeRequests.recoveredCount,
        runtimeStatusPath: runtimeStatus.statusPath,
        startedAt: new Date().toISOString(),
        status: 'listening',
        url,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return url;
}

runtimeStatus.startRuntime({
  discoveryPath: serverDiscoveryPath,
  host,
  kind: 'web-ui',
  requestedPort,
  rootPath: rootDir,
});

function getRequestPath(request) {
  return String(request.url || '').split('?')[0] || '/';
}

function startRuntimeRequest(request, response, url) {
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  runtimeRequestRegistry.startRequest({
    id: request.id,
    method: request.method || 'GET',
    path: url?.pathname || getRequestPath(request),
    startedAt,
    startedAtMs,
  });

  response.once('finish', () => {
    runtimeRequestRegistry.finishRequest(request.id, {
      statusCode: response.statusCode,
    });
  });
}

function summarizeRuntimeRequests() {
  return runtimeRequestRegistry.summarize();
}

function summarizeRuntimeJobs() {
  return runtimeJobRegistry.summarize();
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(response, statusCode, payload, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': contentType,
  });
  response.end(payload);
}

function sendBuffer(response, statusCode, payload, contentType = 'application/octet-stream', extraHeaders = {}) {
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': contentType,
    ...extraHeaders,
  });
  response.end(payload);
}

function sendNotFound(response) {
  sendJson(response, 404, {
    error: 'not-found',
    message: '요청한 리소스를 찾을 수 없습니다.',
  });
}

function sendError(response, error, statusCode = 500) {
  sendJson(response, statusCode, {
    error: 'request-failed',
    message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
  });
}

function readMarkdownFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function readOptionalArtifactMeta(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      bytes: 0,
      exists: false,
      updatedAt: '',
    };
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return {
      bytes: 0,
      exists: false,
      updatedAt: '',
    };
  }

  return {
    bytes: stat.size,
    exists: true,
    updatedAt: stat.mtime.toISOString(),
  };
}

function readOptionalJsonArtifact(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function getExecutionV1ReleaseHandoffStructuredSummary(spec, summaryCache) {
  const summaryArtifactPath = resolveReleaseHandoffSummaryArtifactPath(spec);
  if (!summaryArtifactPath || !fs.existsSync(summaryArtifactPath)) {
    return null;
  }
  if (summaryCache.has(summaryArtifactPath)) {
    return summaryCache.get(summaryArtifactPath);
  }
  const summaryArtifact = readOptionalJsonArtifact(summaryArtifactPath) || {};
  const structuredSummary = summaryArtifact.releaseHandoffStructuredSummary || {};
  const normalizeSummaryEntry = (summaryEntry, fallback = {}) => {
    const normalizedEntry = summaryEntry && typeof summaryEntry === 'object' ? summaryEntry : {};
    const stableLines = Array.isArray(normalizedEntry.stableLines)
      ? normalizedEntry.stableLines
      : Array.isArray(fallback.stableLines)
        ? fallback.stableLines
        : [];
    return {
      exactMatchCount: Number(normalizedEntry.exactMatchCount ?? fallback.exactMatchCount ?? 0),
      errorFreeSessions: Number(
        normalizedEntry.errorFreeSessions ?? fallback.errorFreeSessions ?? fallback.exactMatchCount ?? 0,
      ),
      overviewLine: String(normalizedEntry.overviewLine || fallback.overviewLine || '').trim(),
      stableDigestSha256: String(normalizedEntry.stableDigestSha256 || fallback.stableDigestSha256 || '').trim(),
      stableLineCount: Number(normalizedEntry.stableLineCount ?? fallback.stableLineCount ?? stableLines.length),
      stableLines: stableLines.map((line) => String(line || '').trim()).filter(Boolean),
      totalSessions: Number(normalizedEntry.totalSessions ?? fallback.totalSessions ?? 0),
    };
  };
  const stableSummaryEntries = Object.fromEntries(
    getReleaseHandoffStableSummaryKeys(summaryArtifact, structuredSummary).map((summaryKey) => [
      summaryKey,
      normalizeSummaryEntry(
        structuredSummary[summaryKey],
        buildReleaseHandoffSummaryArtifactFallback(summaryArtifact, summaryKey),
      ),
    ]),
  );
  const result = {
    open: normalizeSummaryEntry(structuredSummary.open, {
      errorFreeSessions: Number(summaryArtifact.releaseHandoffOpenErrorFreeSessions || 0),
      overviewLine: '',
      stableDigestSha256: String(summaryArtifact.releaseHandoffOpenStableDigestSha256 || '').trim(),
      totalSessions: Number(summaryArtifact.releaseHandoffOpenTotalSessions || 0),
    }),
    overviewLine: String(
      structuredSummary.overviewLine || summaryArtifact.releaseHandoffStructuredSummaryOverviewLine || '',
    ).trim(),
    preview: normalizeSummaryEntry(structuredSummary.preview, {
      errorFreeSessions: Number(summaryArtifact.releaseHandoffPreviewErrorFreeSessions || 0),
      overviewLine: '',
      stableDigestSha256: String(summaryArtifact.releaseHandoffPreviewStableDigestSha256 || '').trim(),
      totalSessions: Number(summaryArtifact.releaseHandoffPreviewTotalSessions || 0),
    }),
    summaryCopy: normalizeSummaryEntry(structuredSummary.summaryCopy, {
      exactMatchCount: Number(summaryArtifact.releaseHandoffSummaryCopyExactMatchCount || 0),
      errorFreeSessions: Number(summaryArtifact.releaseHandoffSummaryCopyExactMatchCount || 0),
      overviewLine: String(summaryArtifact.releaseHandoffSummaryCopyOverviewLine || '').trim(),
      stableDigestSha256: String(summaryArtifact.releaseHandoffSummaryCopyStableDigestSha256 || '').trim(),
      totalSessions: Number(summaryArtifact.releaseHandoffSummaryCopyTotalChecks || 0),
    }),
    summaryCopyPreview: normalizeSummaryEntry(structuredSummary.summaryCopyPreview, {
      exactMatchCount: Number(summaryArtifact.releaseHandoffSummaryCopyPreviewExactMatchCount || 0),
      errorFreeSessions: Number(summaryArtifact.releaseHandoffSummaryCopyPreviewExactMatchCount || 0),
      overviewLine: String(summaryArtifact.releaseHandoffSummaryCopyPreviewOverviewLine || '').trim(),
      stableDigestSha256: String(summaryArtifact.releaseHandoffSummaryCopyPreviewStableDigestSha256 || '').trim(),
      totalSessions: Number(summaryArtifact.releaseHandoffSummaryCopyPreviewTotalArtifacts || 0),
    }),
    summaryDetailCopy: normalizeSummaryEntry(structuredSummary.summaryDetailCopy, {
      exactMatchCount: Number(summaryArtifact.releaseHandoffSummaryDetailCopyExactMatchCount || 0),
      errorFreeSessions: Number(summaryArtifact.releaseHandoffSummaryDetailCopyExactMatchCount || 0),
      overviewLine: String(summaryArtifact.releaseHandoffSummaryDetailCopyOverviewLine || '').trim(),
      stableDigestSha256: String(summaryArtifact.releaseHandoffSummaryDetailCopyStableDigestSha256 || '').trim(),
      stableLineCount: Number(summaryArtifact.releaseHandoffSummaryDetailCopyVerificationSummary?.stableLines?.length || 0),
      stableLines: Array.isArray(summaryArtifact.releaseHandoffSummaryDetailCopyVerificationSummary?.stableLines)
        ? summaryArtifact.releaseHandoffSummaryDetailCopyVerificationSummary.stableLines
        : [],
      totalSessions: Number(summaryArtifact.releaseHandoffSummaryDetailCopyTotalChecks || 0),
    }),
    ...stableSummaryEntries,
    summaryDetailCopyPreview: normalizeSummaryEntry(structuredSummary.summaryDetailCopyPreview, {
      exactMatchCount: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewExactMatchCount || 0),
      errorFreeSessions: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewExactMatchCount || 0),
      overviewLine: String(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewOverviewLine || '').trim(),
      stableDigestSha256: String(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewStableDigestSha256 || '').trim(),
      totalSessions: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewTotalArtifacts || 0),
    }),
    summaryDetailCopyPreviewLineCopy: normalizeSummaryEntry(structuredSummary.summaryDetailCopyPreviewLineCopy, {
      exactMatchCount: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyExactMatchCount || 0),
      errorFreeSessions: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyExactMatchCount || 0),
      overviewLine: String(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyOverviewLine || '').trim(),
      stableDigestSha256: String(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyStableDigestSha256 || '').trim(),
      totalSessions: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyTotalChecks || 0),
    }),
    summaryDetailCopyPreviewLineCopyBody: normalizeSummaryEntry(structuredSummary.summaryDetailCopyPreviewLineCopyBody, {
      exactMatchCount: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyBodyExactMatchCount || 0),
      errorFreeSessions: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyBodyExactMatchCount || 0),
      overviewLine: String(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyBodyOverviewLine || '').trim(),
      stableDigestSha256: String(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyBodyStableDigestSha256 || '').trim(),
      totalSessions: Number(summaryArtifact.releaseHandoffSummaryDetailCopyPreviewLineCopyBodyTotalArtifacts || 0),
    }),
    sha256: String(
      structuredSummary.sha256 || summaryArtifact.releaseHandoffStructuredSummarySha256 || '',
    ).trim(),
  };
  summaryCache.set(summaryArtifactPath, result);
  return result;
}

function buildExecutionV1ReleaseHandoffArtifacts() {
  const summaryCache = new Map();
  return executionV1ReleaseHandoffArtifactSpecs.map((item) => {
    const meta = readOptionalArtifactMeta(item.path);
    const structuredSummary = getExecutionV1ReleaseHandoffStructuredSummary(item, summaryCache);
    return {
      ...item,
      ...meta,
      href: meta.exists ? `/api/execution-v1/handoff-artifacts/${encodeURIComponent(item.id)}` : '',
      structuredSummary,
    };
  });
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    return '';
  }

  return String(result.stdout || '').trim();
}

function runGitLines(args) {
  return runGit(args)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isGitAncestor(ancestorCommit = '', descendantCommit = '') {
  if (!ancestorCommit || !descendantCommit) {
    return false;
  }

  const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestorCommit, descendantCommit], {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
  });
  return result.status === 0;
}

function buildExecutionV1ArtifactSyncCommit(currentCommit = '', verifiedCommit = '') {
  if (!currentCommit || !verifiedCommit || currentCommit === verifiedCommit) {
    return {
      changedPaths: [],
      commits: [],
      currentCommit,
      detected: false,
      verifiedCommit,
    };
  }
  if (!isGitAncestor(verifiedCommit, currentCommit)) {
    return {
      changedPaths: [],
      commits: [],
      currentCommit,
      detected: false,
      verifiedCommit,
    };
  }

  const commits = runGitLines(['rev-list', '--reverse', `${verifiedCommit}..${currentCommit}`]);
  const changedPaths = [...new Set(
    commits.flatMap((commit) => runGitLines(['diff-tree', '--no-commit-id', '--name-only', '-r', commit])),
  )].sort();
  const detected = changedPaths.length > 0
    && changedPaths.every((filePath) => releaseArtifactResolver.isReleaseArtifactPath(filePath));

  return {
    changedPaths,
    commits,
    currentCommit,
    detected,
    verifiedCommit,
  };
}

function getCurrentGitContext() {
  return {
    branch: runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
    commit: runGit(['rev-parse', 'HEAD']),
  };
}

function getTrackedFileStatus(filePaths = []) {
  if (!filePaths.length) {
    return [];
  }

  const result = spawnSync('git', ['status', '--porcelain', '--', ...filePaths], {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    return [];
  }

  return String(result.stdout || '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      path: line.slice(3).trim(),
      status: line.slice(0, 2).trim() || '??',
    }));
}

function recordReleaseAction({
  action = '',
  details = null,
  outcome = '',
  provider = '',
  scope = '',
  summary = '',
} = {}) {
  const gitContext = getCurrentGitContext();
  return store.saveReleaseAction({
    action: String(action || '').trim(),
    branch: gitContext.branch,
    commit: gitContext.commit,
    createdAt: new Date().toISOString(),
    details: details && typeof details === 'object' ? details : null,
    id: createId('releaseaction'),
    outcome: String(outcome || '').trim(),
    provider: String(provider || '').trim(),
    scope: String(scope || '').trim(),
    summary: String(summary || '').trim(),
  });
}

const releaseCommandOrchestrator = createReleaseCommandOrchestrator({
  archiveSnapshot: archiveExecutionV1Snapshot,
  buildRefreshPreflight: buildExecutionV1RefreshPreflight,
  buildSnapshotPreflight: buildExecutionV1SnapshotPreflight,
  buildStatus: buildExecutionV1Status,
  recordAction: recordReleaseAction,
  refreshArtifacts: refreshExecutionV1Artifacts,
  runProviderPreflight: runExecutionV1Preflight,
  runtimeJobRunner,
});

const buildExecutionV1ReleaseHandlers = createExecutionV1ReleaseHandlerFactory({
  buildBlockerHandoff: getReleaseBlockerHandoff,
  buildLiveValidationArgs,
  buildStatus: buildExecutionV1Status,
  decodePathSegment,
  getContentType,
  parseOptionalBooleanQueryParam,
  readFile: fs.readFileSync,
  readJsonBody,
  releaseArtifactResolver,
  releaseCommandOrchestrator,
  rootDir,
  sendBuffer,
  sendJson,
  sendNotFound,
});

const buildActionHandlers = createActionHandlerFactory({
  decodePathSegment,
  evaluateWorkspaceTenantAccess,
  parseOptionalBooleanQueryParam,
  readJsonBody,
  sendJson,
  sendTenantDenied,
  service,
});

function readExecutionV1Snapshot(preferredCommit = '', currentCommit = '') {
  if (!fs.existsSync(executionV1SnapshotsRoot)) {
    return null;
  }

  const snapshotEntries = fs.readdirSync(executionV1SnapshotsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const snapshotDir = path.join(executionV1SnapshotsRoot, entry.name);
      const manifestPath = path.join(snapshotDir, 'snapshot.json');
      if (!fs.existsSync(manifestPath)) {
        return null;
      }
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const evidencePath = path.join(snapshotDir, 'execution-v1-evidence.md');
        const closeoutPath = path.join(snapshotDir, 'execution-v1-closeout.md');
        const handoffPath = path.join(snapshotDir, 'execution-v1-handoff.md');
        return {
          archivedAt: manifest.archivedAt || '',
          closeoutPath,
          evidencePath,
          handoffPath: fs.existsSync(handoffPath) ? handoffPath : '',
          exists: true,
          matchesCurrentHead: Boolean(currentCommit && manifest.verifiedCommit === currentCommit),
          matchesGeneratedCommit: Boolean(preferredCommit && manifest.verifiedCommit === preferredCommit),
          snapshotDir,
          sourceHandoffPath: manifest.sourceHandoffPath || '',
          verifiedCommit: manifest.verifiedCommit || entry.name,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => String(right.archivedAt || '').localeCompare(String(left.archivedAt || '')));

  if (!snapshotEntries.length) {
    return null;
  }

  return snapshotEntries.find((entry) => entry.matchesGeneratedCommit) || snapshotEntries[0];
}

function buildReleaseReadinessCommand(label, command, kind = 'verification') {
  return {
    command,
    kind,
    label,
  };
}

function buildReleaseReadinessDoc(label, path) {
  const relativePath = releaseArtifactResolver.normalizePath(path);
  const docRecord = releaseArtifactResolver.resolveEvidenceDoc(relativePath);
  return {
    exists: Boolean(docRecord),
    href: docRecord ? `/api/execution-v1/release-doc?path=${encodeURIComponent(relativePath)}` : '',
    label,
    path: relativePath,
  };
}

function buildCurrentOpenBlockerActionId(blocker = '', index = 0) {
  const normalized = String(blocker || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return normalized || `current-open-blocker-${index + 1}`;
}

function buildCurrentOpenBlockerAction(blocker = '', index = 0) {
  const normalized = String(blocker || '').toLowerCase();
  const base = {
    blocker: String(blocker || '').trim(),
    category: 'release-readiness',
    commands: [
      buildReleaseReadinessCommand('Production readiness gate', 'npm run smoke:production-readiness-gate'),
    ],
    evidenceDocs: [
      buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md'),
    ],
    id: buildCurrentOpenBlockerActionId(blocker, index),
    nextEvidence: 'Record blocker disposition, closing evidence, and release decision update before changing the release label.',
    owner: 'release-owner',
    priority: index + 1,
    status: 'blocked',
    stopReason: String(blocker || '').trim(),
  };

  if (normalized.includes('anthropic live validation')) {
    return {
      ...base,
      category: 'provider-account',
      commands: [
        buildReleaseReadinessCommand('Anthropic preflight', 'npm run preflight:execution-v1:anthropic', 'preflight'),
        buildReleaseReadinessCommand(
          'Anthropic live validation',
          'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic',
          'live-validation',
        ),
        buildReleaseReadinessCommand('Target Anthropic account gate', 'npm run smoke:target-anthropic-provider-account'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target Anthropic provider account', 'docs/target-anthropic-provider-account-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
        buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md'),
      ],
      nextEvidence: 'Target Anthropic provider account evidence for account ownership proof, billing and credit remediation proof, active billing plan proof, available credit balance proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'anthropic',
      stopReason: 'Target Anthropic provider account lacks account ownership proof, billing and credit remediation proof, active billing plan proof, available credit balance proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot proof.',
    };
  }

  if (normalized.includes('target openai provider account')) {
    return {
      ...base,
      category: 'provider-account',
      commands: [
        buildReleaseReadinessCommand('OpenAI preflight', 'npm run preflight:execution-v1:openai', 'preflight'),
        buildReleaseReadinessCommand(
          'OpenAI live validation',
          'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai',
          'live-validation',
        ),
        buildReleaseReadinessCommand('Target OpenAI account gate', 'npm run smoke:target-openai-provider-account'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target OpenAI provider account', 'docs/target-openai-provider-account-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'),
      ],
      nextEvidence: 'Target OpenAI provider account evidence for account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'openai',
      stopReason: 'Target OpenAI provider account lacks account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot proof.',
    };
  }

  if (
    normalized.includes('target local provider architecture')
      && !normalized.includes('target deployment contract')
  ) {
    return {
      ...base,
      category: 'provider-architecture',
      commands: [
        buildReleaseReadinessCommand('Target local provider architecture gate', 'npm run smoke:target-local-provider-architecture'),
        buildReleaseReadinessCommand(
          'Local provider live validation',
          'export LOCAL_PROVIDER_MODEL="..." LOCAL_PROVIDER_BASE_URL="..." && npm run live:execution-v1:local',
          'live-validation',
        ),
        buildReleaseReadinessCommand('Target provider operations gate', 'npm run smoke:target-provider-operations'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target local provider architecture', 'docs/target-local-provider-architecture-v1.md'),
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md'),
        buildReleaseReadinessDoc('Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md'),
      ],
      nextEvidence: 'Endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota and resource guard, telemetry, fallback and customer approval, target-boundary local provider live validation, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'local',
      stopReason: 'Target local provider architecture lacks endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation pass, release artifact hygiene result, and regenerated execution snapshot proof.',
    };
  }

  if (normalized.includes('hermes live validation')) {
    return {
      ...base,
      category: 'provider-architecture',
      commands: [
        buildReleaseReadinessCommand('Target Hermes provider architecture gate', 'npm run smoke:target-hermes-provider-architecture'),
        buildReleaseReadinessCommand(
          'Hermes live validation',
          'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes',
          'live-validation',
        ),
        buildReleaseReadinessCommand('Provider readiness rehearsal', 'npm run rehearsal:production-provider-readiness'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target Hermes provider architecture', 'docs/target-hermes-provider-architecture-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md'),
      ],
      nextEvidence: 'Endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'hermes',
      stopReason: 'Target Hermes provider architecture lacks endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation pass, release artifact hygiene result, and regenerated execution snapshot proof.',
    };
  }

  if (
    normalized.includes('target provider operations evidence')
      && !normalized.includes('production release label')
      && !normalized.includes('target deployment contract')
  ) {
    return {
      ...base,
      category: 'provider-operations',
      commands: [
        buildReleaseReadinessCommand('Target provider operations gate', 'npm run smoke:target-provider-operations'),
        buildReleaseReadinessCommand('Target provider evidence intake gate', 'npm run smoke:target-provider-evidence-intake'),
        buildReleaseReadinessCommand(
          'Provider fallback policy smoke',
          'npm run smoke:provider-fallback-policy',
          'runtime-audit',
        ),
        buildReleaseReadinessCommand(
          'Provider events fallback audit',
          'npm run smoke:provider-events',
          'runtime-audit',
        ),
        buildReleaseReadinessCommand(
          'Provider attention remediation fallback audit',
          'npm run smoke:provider-attention-remediation',
          'runtime-audit',
        ),
        buildReleaseReadinessCommand(
          'Mission timeline fallback audit',
          'npm run smoke:mission-timeline',
          'runtime-audit',
        ),
        buildReleaseReadinessCommand(
          'Workspace timeline fallback audit',
          'npm run smoke:workspace-timeline',
          'runtime-audit',
        ),
        buildReleaseReadinessCommand(
          'Operator timeline fallback audit',
          'npm run smoke:operator-timeline',
          'runtime-audit',
        ),
        buildReleaseReadinessCommand('Release artifact hygiene smoke', 'npm run smoke:release-artifact-hygiene'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md'),
        buildReleaseReadinessDoc('Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md'),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
      ],
      nextEvidence: 'Completed per-provider operations capture template, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable proof, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, operator timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop reason, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment plan, artifact hygiene result, production readiness gate result, residual risk, decision owner, and next review date from the approved target boundary.',
      owner: 'provider-ops',
      stopReason: 'Target provider operations lacks same-boundary per-provider operations capture template proof, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable proof, provider fallback runtime audit proof with fallback policy id, mission timeline chronology, workspace timeline chronology, operator timeline chronology, provider events family, attention remediation command, provider-failure-only failover, recoverable-provider-failure-only stop reason, selected fallback provider, and deterministic stop-condition proof, target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment proof, artifact hygiene result, production readiness gate result, residual risk decision, decision owner proof, and next review date proof.',
    };
  }

  if (normalized.includes('production release label')) {
    return {
      ...base,
      category: 'release-decision',
      commands: [
        buildReleaseReadinessCommand('Aggregate provider preflight', 'npm run preflight:execution-v1:all', 'preflight'),
        buildReleaseReadinessCommand('Production readiness gate', 'npm run smoke:production-readiness-gate'),
        buildReleaseReadinessCommand('Production provider readiness smoke', 'npm run smoke:production-provider-readiness'),
        buildReleaseReadinessCommand('Production enterprise controls smoke', 'npm run smoke:production-enterprise-controls'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
        buildReleaseReadinessDoc('Production enterprise controls', 'docs/production-enterprise-controls-v1.md'),
      ],
      nextEvidence: 'Target provider evidence intake, provider operations, provider account or architecture approvals, target-boundary live validation for every included provider, provider failure containment, production enterprise controls, hosted identity and session evidence, hosted tenant isolation evidence, target secret manager evidence, target observability and SLO evidence, data lifecycle and support evidence, target deployment contract evidence, clean deployment release evidence, production-like drill result, release artifact hygiene result, accepted risk register, allowed claim text, release decision owner approval, next review date, and regenerated execution snapshot evidence from the same target boundary.',
      owner: 'release-owner',
      stopReason: 'Production release label expansion lacks same-boundary target provider evidence intake proof, target provider operations proof, provider account or architecture approval proof, target-boundary live validation proof, provider failure containment proof, production enterprise control proof, hosted identity and session proof, hosted tenant isolation proof, target secret manager proof, target observability and SLO proof, data lifecycle and support proof, target deployment contract proof, clean deployment release proof, production-like drill result, release artifact hygiene result, accepted risk register proof, allowed claim text proof, release decision owner approval proof, next review date proof, and regenerated execution snapshot proof.',
    };
  }

  if (normalized.includes('target deployment contract')) {
    return {
      ...base,
      category: 'target-deployment',
      commands: [
        buildReleaseReadinessCommand('Target deployment contract gate', 'npm run smoke:target-deployment-contract'),
        buildReleaseReadinessCommand('Target environment evidence intake gate', 'npm run smoke:target-environment-evidence-intake'),
        buildReleaseReadinessCommand('Production-like release drill', 'npm run drill:production-like-release', 'rehearsal'),
        buildReleaseReadinessCommand('Production-like release drill smoke', 'npm run smoke:production-like-release-drill'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target deployment contract', 'docs/target-deployment-contract-v1.md'),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'),
        buildReleaseReadinessDoc('Production-like release drill', 'docs/production-like-release-drill-v1.md'),
      ],
      nextEvidence: 'Target deployment name proof, deployment profile decision proof, mandatory control evidence, provider readiness evidence, identity and tenant evidence, secret and observability evidence, data lifecycle and support evidence, clean release artifact evidence, stop-condition decision, production-ready claim decision, target environment submission packet, release artifact hygiene result, production-like drill result, reviewer decision, and regenerated execution snapshot evidence from the same target boundary.',
      owner: 'deployment-owner',
      stopReason: 'Target deployment contract lacks same-boundary target deployment name proof, deployment profile decision proof, mandatory control evidence, provider readiness evidence, identity and tenant evidence, secret and observability evidence, data lifecycle and support evidence, clean release artifact evidence, stop-condition decision proof, production-ready claim decision proof, target environment submission packet proof, release artifact hygiene result, production-like drill result, reviewer decision proof, and regenerated execution snapshot proof.',
    };
  }

  return base;
}

function buildCurrentOpenBlockerClosureVerification(action = {}) {
  const commands = Array.isArray(action.commands) ? action.commands : [];
  const evidenceDocs = Array.isArray(action.evidenceDocs) ? action.evidenceDocs : [];
  const category = String(action.category || 'release-readiness').trim() || 'release-readiness';
  const provider = String(action.provider || '').trim();
  const requiredProofs = [
    'same-boundary target evidence packet proof',
    'blocker disposition proof with accountable decision owner',
    'target-boundary command rerun proof',
    'release artifact hygiene pass proof',
    'regenerated execution-v1 artifact snapshot proof',
    'production readiness gate proof',
  ];

  if (category === 'provider-account') {
    requiredProofs.push(
      'provider account or billing/quota approval proof',
      'approved target secret injection proof',
      'target-boundary provider live validation proof',
      'provider fallback policy and stop reason proof',
    );
  }

  if (category === 'provider-architecture') {
    requiredProofs.push(
      'provider endpoint or model architecture approval proof',
      'runtime lifecycle and provenance proof',
      'target-boundary provider live validation proof',
      'provider fallback policy and stop reason proof',
    );
  }

  if (category === 'provider-operations') {
    requiredProofs.push(
      'per-provider operations capture template proof',
      'provider fallback runtime audit proof',
      'provider telemetry and incident triage proof',
      'provider failure containment proof',
    );
  }

  if (category === 'target-deployment') {
    requiredProofs.push(
      'target deployment name and profile decision proof',
      'mandatory control evidence proof',
      'target environment submission packet proof',
      'production-like drill proof',
    );
  }

  if (category === 'release-decision') {
    requiredProofs.push(
      'accepted risk register proof',
      'allowed claim text proof',
      'release decision owner approval proof',
      'next review date proof',
    );
  }

  return {
    acceptedDispositionValues: [
      'keep-blocked',
      'closed-after-evidence',
      'accepted-with-narrow-scope',
      'rejected',
    ],
    artifactRequirements: {
      executionV1ArtifactRefresh: true,
      productionReadinessGate: true,
      releaseArtifactHygiene: true,
      snapshotRefresh: true,
    },
    blockerId: String(action.id || '').trim(),
    category,
    closureRules: [
      'Close only with accepted evidence from the same approved target boundary.',
      'Keep productionReadyClaim=false while any mandatory target stop-condition remains open.',
      'Rerun every listed command after attaching closure evidence.',
      'Refresh execution-v1 artifacts after source-of-record or live evidence changes.',
      'Reject stale, ownerless, unreviewed, or secret-bearing evidence.',
    ],
    currentState: String(action.status || 'blocked').trim() || 'blocked',
    defaultDisposition: 'keep-blocked',
    forbiddenEvidence: [
      'raw API keys or tokens',
      'private endpoint credentials',
      'customer personal data',
      'tenant payloads',
      'billing identifiers',
      'private account identifiers',
      'machine-local absolute paths',
    ],
    id: `${String(action.id || 'current-open-blocker').trim() || 'current-open-blocker'}-closure-verification`,
    owner: String(action.owner || 'release-owner').trim() || 'release-owner',
    productionReadyClaimAllowed: false,
    productionReadyClaimRule:
      'productionReadyClaim remains false until every mandatory target control is closed by accepted same-boundary evidence and final gates pass.',
    provider,
    requiredClosingEvidence: String(action.nextEvidence || '').trim(),
    requiredCommands: commands.map((command) => ({
      command: String(command?.command || '').trim(),
      kind: String(command?.kind || 'verification').trim() || 'verification',
      label: String(command?.label || '').trim(),
    })),
    requiredDecisionFields: [
      'decisionOwner',
      'evidenceOwner',
      'reviewer',
      'reviewDate',
      'nextReviewDate',
      'allowedClaimText',
      'releaseReadinessNote',
    ],
    requiredEvidenceDocs: evidenceDocs.map((doc) => ({
      exists: Boolean(doc?.exists),
      href: String(doc?.href || '').trim(),
      label: String(doc?.label || '').trim(),
      path: String(doc?.path || '').trim(),
    })),
    requiredProofs,
    sameBoundaryRequired: true,
    status: 'blocked',
    stopConditionId: String(action.id || '').trim(),
    stopReason: String(action.stopReason || action.blocker || '').trim(),
    targetBoundaryRequired: true,
  };
}

function attachCurrentOpenBlockerClosureVerification(action = {}) {
  return {
    ...action,
    closureVerification: buildCurrentOpenBlockerClosureVerification(action),
  };
}

function incrementCountRecord(record, key) {
  const normalized = String(key || '').trim() || 'unassigned';
  record[normalized] = Number(record[normalized] || 0) + 1;
}

function sortCountRecord(record = {}) {
  return Object.fromEntries(
    Object.entries(record).sort(
      ([leftKey, leftCount], [rightKey, rightCount]) =>
        Number(rightCount || 0) - Number(leftCount || 0) || leftKey.localeCompare(rightKey),
    ),
  );
}

function buildCurrentOpenBlockerActionSummary(actions = []) {
  const categoryCounts = {};
  const commandKindCounts = {};
  const ownerCounts = {};
  const providerCounts = {};
  const statusCounts = {};
  let closureVerificationCommandCount = 0;
  let closureVerificationCount = 0;
  let closureVerificationEvidenceDocCount = 0;
  let closureVerificationProductionReadyBlockedCount = 0;
  let closureVerificationTargetBoundaryCount = 0;
  let commandCount = 0;
  let evidenceDocCount = 0;
  let runtimeAuditCommandCount = 0;
  let topPriorityAction = null;
  let topPriorityValue = Number.POSITIVE_INFINITY;

  for (const [index, action] of actions.entries()) {
    incrementCountRecord(categoryCounts, action?.category || 'release-readiness');
    incrementCountRecord(ownerCounts, action?.owner || 'release-owner');
    if (action?.provider) {
      incrementCountRecord(providerCounts, action.provider);
    }
    incrementCountRecord(statusCounts, action?.status || 'blocked');
    const commands = Array.isArray(action?.commands) ? action.commands : [];
    commandCount += commands.length;
    for (const command of commands) {
      const kind = String(command?.kind || 'verification').trim() || 'verification';
      incrementCountRecord(commandKindCounts, kind);
      if (kind === 'runtime-audit') {
        runtimeAuditCommandCount += 1;
      }
    }
    evidenceDocCount += Array.isArray(action?.evidenceDocs) ? action.evidenceDocs.length : 0;
    if (action?.closureVerification) {
      closureVerificationCount += 1;
      closureVerificationCommandCount += Array.isArray(action.closureVerification.requiredCommands)
        ? action.closureVerification.requiredCommands.length
        : 0;
      closureVerificationEvidenceDocCount += Array.isArray(action.closureVerification.requiredEvidenceDocs)
        ? action.closureVerification.requiredEvidenceDocs.length
        : 0;
      if (action.closureVerification.targetBoundaryRequired === true) {
        closureVerificationTargetBoundaryCount += 1;
      }
      if (action.closureVerification.productionReadyClaimAllowed === false) {
        closureVerificationProductionReadyBlockedCount += 1;
      }
    }

    const priority = Number.isFinite(Number(action?.priority)) ? Number(action.priority) : index + 1;
    if (!topPriorityAction || priority < topPriorityValue) {
      topPriorityAction = action;
      topPriorityValue = priority;
    }
  }

  return {
    actionCount: actions.length,
    categoryCounts: sortCountRecord(categoryCounts),
    closureVerificationCommandCount,
    closureVerificationCount,
    closureVerificationEvidenceDocCount,
    closureVerificationProductionReadyBlockedCount,
    closureVerificationTargetBoundaryCount,
    commandCount,
    commandKindCounts: sortCountRecord(commandKindCounts),
    evidenceDocCount,
    ownerCounts: sortCountRecord(ownerCounts),
    providerActionCount: Object.values(providerCounts).reduce((total, value) => total + Number(value || 0), 0),
    providerCounts: sortCountRecord(providerCounts),
    runtimeAuditCommandCount,
    statusCounts: sortCountRecord(statusCounts),
    topPriorityBlocker: String(topPriorityAction?.blocker || topPriorityAction?.stopReason || '').trim(),
    topPriorityBlockerId: String(topPriorityAction?.id || '').trim(),
    topPriorityCategory: String(topPriorityAction?.category || '').trim(),
    topPriorityNextEvidence: String(topPriorityAction?.nextEvidence || '').trim(),
    topPriorityOwner: String(topPriorityAction?.owner || '').trim(),
    topPriorityProvider: String(topPriorityAction?.provider || '').trim(),
    topPriorityStopReason: String(topPriorityAction?.stopReason || topPriorityAction?.blocker || '').trim(),
  };
}

function getCurrentOpenBlockerProviderNeedles(provider = '') {
  const normalizedProvider = String(provider || '').trim();
  const providerNeedles = {
    anthropic: ['anthropic', 'anthropic_api_key', 'target-anthropic-provider-account'],
    hermes: ['hermes', 'hermes_provider_model', 'target-hermes-provider-architecture'],
    local: ['local provider', 'local_provider_model', 'local_provider_base_url', 'target-local-provider-architecture'],
    openai: ['openai', 'openai_api_key', 'target-openai-provider-account'],
  };
  return providerNeedles[normalizedProvider] || (normalizedProvider ? [normalizedProvider] : []);
}

function getCurrentOpenBlockerActionSearchText(action = {}) {
  const commands = Array.isArray(action?.commands) ? action.commands : [];
  const evidenceDocs = Array.isArray(action?.evidenceDocs) ? action.evidenceDocs : [];
  return [
    action?.blocker,
    action?.category,
    action?.id,
    action?.nextEvidence,
    action?.owner,
    action?.provider,
    action?.status,
    action?.stopReason,
    ...commands.flatMap((command) => [command?.command, command?.kind, command?.label]),
    ...evidenceDocs.flatMap((doc) => [doc?.href, doc?.label, doc?.path]),
  ]
    .map((item) => String(item || '').toLowerCase())
    .filter(Boolean)
    .join(' ');
}

function isSharedProviderBlockerAction(action = {}) {
  return String(action?.category || '').trim() === 'provider-operations';
}

function doesCurrentOpenBlockerActionMatchProvider(action = {}, provider = '') {
  const normalizedProvider = String(provider || '').trim();
  if (!action || !normalizedProvider) {
    return false;
  }
  if (String(action.provider || '').trim() === normalizedProvider) {
    return true;
  }

  const searchText = getCurrentOpenBlockerActionSearchText(action);
  return getCurrentOpenBlockerProviderNeedles(normalizedProvider).some((needle) =>
    searchText.includes(String(needle || '').toLowerCase()),
  );
}

function getProviderCurrentOpenBlockerActions(provider = '', actions = []) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    return [];
  }

  const actionList = Array.isArray(actions) ? actions : [];
  const hasExplicitProviderMapping = actionList.some((item) => String(item?.provider || '').trim());
  return actionList.filter((item) => {
    if (String(item?.provider || '').trim() === normalizedProvider) {
      return true;
    }
    if (isSharedProviderBlockerAction(item)) {
      return true;
    }
    if (hasExplicitProviderMapping) {
      return false;
    }
    return doesCurrentOpenBlockerActionMatchProvider(item, normalizedProvider);
  });
}

function buildProviderBlockerClosureVerificationSummary(provider = '', actions = []) {
  const linkedActions = getProviderCurrentOpenBlockerActions(provider, actions);
  const actionIds = [];
  const closureVerificationIds = [];
  const evidenceDocKeys = new Set();
  const providerActionIds = [];
  const requiredProofKeys = new Set();
  const sharedActionIds = [];
  let commandCount = 0;
  let productionReadyBlockedCount = 0;
  let targetBoundaryRequiredCount = 0;

  for (const [index, action] of linkedActions.entries()) {
    const actionId = String(action?.id || '').trim() || `provider-blocker-${index + 1}`;
    actionIds.push(actionId);
    if (String(action?.provider || '').trim()) {
      providerActionIds.push(actionId);
    }
    if (isSharedProviderBlockerAction(action)) {
      sharedActionIds.push(actionId);
    }

    const closureVerification = action?.closureVerification || {};
    const closureVerificationId = String(closureVerification.id || '').trim();
    if (closureVerificationId) {
      closureVerificationIds.push(closureVerificationId);
    }
    const commands = Array.isArray(closureVerification.requiredCommands)
      ? closureVerification.requiredCommands
      : Array.isArray(action?.commands)
        ? action.commands
        : [];
    commandCount += commands.filter((command) => String(command?.command || '').trim()).length;
    const evidenceDocs = Array.isArray(closureVerification.requiredEvidenceDocs)
      ? closureVerification.requiredEvidenceDocs
      : Array.isArray(action?.evidenceDocs)
        ? action.evidenceDocs
        : [];
    for (const doc of evidenceDocs) {
      const key = String(doc?.href || doc?.path || doc?.label || '').trim();
      if (key) {
        evidenceDocKeys.add(key);
      }
    }
    const requiredProofs = Array.isArray(closureVerification.requiredProofs)
      ? closureVerification.requiredProofs
      : [];
    for (const proof of requiredProofs) {
      const proofText = String(proof || '').trim();
      if (proofText) {
        requiredProofKeys.add(proofText);
      }
    }
    if (closureVerification.targetBoundaryRequired === true) {
      targetBoundaryRequiredCount += 1;
    }
    if (closureVerification.productionReadyClaimAllowed === false) {
      productionReadyBlockedCount += 1;
    }
  }

  return {
    actionIds,
    closureVerificationCount: closureVerificationIds.length,
    closureVerificationIds,
    commandCount,
    evidenceDocCount: evidenceDocKeys.size,
    productionReadyBlockedCount,
    productionReadyClaimAllowed: productionReadyBlockedCount === 0,
    providerActionIds,
    requiredProofCount: requiredProofKeys.size,
    sharedActionIds,
    targetBoundaryRequiredCount,
  };
}

function buildReleaseReadinessSummary(markdown = '') {
  const productionReadySection = extractMarkdownSection(markdown, 'Production Ready', 3);
  const productionBlockers = extractBulletsAfterLabel(productionReadySection, 'Blockers');
  const currentOpenBlockers = extractSectionBullets(markdown, 'Current Open Blockers');
  const currentOpenBlockerActions = currentOpenBlockers.map((blocker, index) =>
    buildCurrentOpenBlockerAction(blocker, index),
  ).map((action) => attachCurrentOpenBlockerClosureVerification(action));
  const currentOpenBlockerActionSummary = buildCurrentOpenBlockerActionSummary(currentOpenBlockerActions);
  const productionReadyStatus = extractPlainStatus(productionReadySection) || 'not-tracked';
  const normalizedProductionReadyStatus = productionReadyStatus.toLowerCase();
  const productionReadyClaimAllowed = Boolean(
    productionReadySection
      && normalizedProductionReadyStatus !== 'blocked'
      && normalizedProductionReadyStatus !== 'not-tracked'
      && productionBlockers.length === 0,
  );

  return {
    currentOpenBlockerActionCount: currentOpenBlockerActions.length,
    currentOpenBlockerActionSummary,
    currentOpenBlockerActions,
    currentOpenBlockerCount: currentOpenBlockers.length,
    currentOpenBlockers,
    decision: extractBulletValue(markdown, 'decision'),
    localDate: extractBulletValue(markdown, 'localDate'),
    productionBlockerCount: productionBlockers.length,
    productionBlockers,
    productionReadyBlocked: !productionReadyClaimAllowed,
    productionReadyClaimAllowed,
    productionReadyStatus,
    productionReadyStopReason: productionBlockers[0] || (productionReadyClaimAllowed ? '' : `Production Ready status is ${productionReadyStatus}.`),
    releaseLabel: extractBulletValue(markdown, 'releaseLabel'),
  };
}

function buildExecutionV1Status() {
  const evidenceMarkdown = readMarkdownFile(evidenceDocPath);
  const closeoutMarkdown = readMarkdownFile(closeoutDocPath);
  const handoffMarkdown = readMarkdownFile(handoffDocPath);
  const releaseReadinessMarkdown = readMarkdownFile(releaseReadinessDocPath);
  const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  const currentCommit = runGit(['rev-parse', 'HEAD']);
  const currentArtifacts = buildExecutionV1ArtifactSummary(evidenceMarkdown, closeoutMarkdown);
  const releaseReadiness = buildReleaseReadinessSummary(releaseReadinessMarkdown);
  const providerReadiness = liveValidationProviders.map((item) => {
    const blockerClosureVerification = buildProviderBlockerClosureVerificationSummary(
      item.provider,
      releaseReadiness.currentOpenBlockerActions,
    );
    return {
      blockerClosureVerification,
      command: item.command,
      envKey: item.envKey,
      evidenceCommand: item.evidenceCommand,
      label: item.label,
      linkedBlockerActionIds: blockerClosureVerification.actionIds,
      linkedClosureVerificationIds: blockerClosureVerification.closureVerificationIds,
      preflightCommand: `npm run preflight:execution-v1:${item.provider}`,
      provider: item.provider,
      ready: Boolean(process.env[item.envKey]),
      status: process.env[item.envKey] ? 'ready' : 'missing-env',
    };
  });
  const generatedCommit = currentArtifacts.commit;
  const artifactSyncCommit = buildExecutionV1ArtifactSyncCommit(currentCommit, generatedCommit);
  const effectiveReleaseCommit = artifactSyncCommit.detected ? generatedCommit : currentCommit;
  const snapshot = readExecutionV1Snapshot(generatedCommit, effectiveReleaseCommit);
  const baselineEvidenceMarkdown = snapshot ? readMarkdownFile(snapshot.evidencePath) : '';
  const baselineCloseoutMarkdown = snapshot ? readMarkdownFile(snapshot.closeoutPath) : '';
  const baselineHandoffMarkdown = snapshot?.handoffPath ? readMarkdownFile(snapshot.handoffPath) : '';

  return assembleExecutionV1Status({
    artifactSyncCommit,
    baselineArtifacts: buildExecutionV1ArtifactSummary(baselineEvidenceMarkdown, baselineCloseoutMarkdown),
    baselineDocumentsAvailable: {
      closeout: Boolean(baselineCloseoutMarkdown),
      evidence: Boolean(baselineEvidenceMarkdown),
      handoff: Boolean(baselineHandoffMarkdown),
    },
    baselineHandoffGeneratedAt: extractBulletValue(baselineHandoffMarkdown, 'generatedAt'),
    closeout: {
      generatedAt: currentArtifacts.closeoutGeneratedAt,
      markdown: closeoutMarkdown,
      path: closeoutDocPath,
    },
    currentArtifacts,
    currentBranch,
    currentCommit,
    docStatuses: getTrackedFileStatus([
      evidenceDocPath,
      closeoutDocPath,
      handoffDocPath,
      pilotExportPackageDocPath,
      productionLikeReleaseDrillDocPath,
    ]),
    evidence: {
      generatedAt: currentArtifacts.evidenceGeneratedAt,
      markdown: evidenceMarkdown,
      path: evidenceDocPath,
    },
    generatedAtFallback: new Date().toISOString(),
    handoff: {
      commit: extractBulletValue(handoffMarkdown, 'commit'),
      generatedAt: extractBulletValue(handoffMarkdown, 'generatedAt'),
      markdown: handoffMarkdown,
      path: handoffDocPath,
    },
    handoffArtifacts: buildExecutionV1ReleaseHandoffArtifacts(),
    providerReadiness,
    releaseActionHistory: store.listReleaseActions().slice(-8).reverse(),
    releaseReadiness: {
      ...releaseReadiness,
      markdown: releaseReadinessMarkdown,
      path: releaseReadinessDocPath,
    },
    runtimeJobs: summarizeRuntimeJobs(),
    snapshot,
  });
}
function buildLiveValidationArgs(body = {}) {
  const args = [];
  if (body.liveOpenAI) {
    args.push('--live-openai');
  }
  if (body.liveAnthropic) {
    args.push('--live-anthropic');
  }
  if (body.liveLocal) {
    args.push('--live-local');
  }
  if (body.liveHermes) {
    args.push('--live-hermes');
  }
  return args;
}

function buildExecutionV1RefreshPreflight(args = []) {
  const normalizedArgs = Array.isArray(args) ? args.filter(Boolean) : [];
  const status = buildExecutionV1Status();
  const liveProvider = normalizedArgs.includes('--live-openai')
    ? 'openai'
    : normalizedArgs.includes('--live-anthropic')
      ? 'anthropic'
      : normalizedArgs.includes('--live-local')
        ? 'local'
        : normalizedArgs.includes('--live-hermes')
          ? 'hermes'
          : '';

  if (!liveProvider) {
    return {
      action: 'current-surface',
      allowed: true,
      checkedAt: new Date().toISOString(),
      confirmRequired: true,
      notes: status.refreshPlan?.notes || [],
      affectedPaths: status.refreshPlan?.affectsPaths || [],
      summary:
        status.refreshPlan?.summary
        || 'current surface evidence, closeout, handoff를 다시 쓰고 deterministic verification을 재실행합니다.',
    };
  }

  const providerPreflight = runExecutionV1Preflight(liveProvider);
  const allowed = providerPreflight.status === 'ready-for-live-validation';
  return {
    action: `live-${liveProvider}`,
    allowed,
    checkedAt: new Date().toISOString(),
    confirmRequired: true,
    notes: [
      providerPreflight.status === 'ready-but-missing-env'
        ? `${providerPreflight.envKey}가 필요합니다.`
        : providerPreflight.status === 'blocked'
          ? 'deterministic readiness가 아직 닫히지 않았습니다.'
          : 'live validation 실행 가능 상태이며, current surface rewrite 전에 명시적 확인이 필요합니다.',
    ],
    provider: liveProvider,
    providerPreflight,
    summary: allowed
      ? `${liveProvider} live validation과 current surface regeneration을 실행할 수 있습니다. 실행 전 명시적 확인이 필요합니다.`
      : `${liveProvider} live validation은 아직 실행할 수 없습니다.`,
  };
}

function buildExecutionV1SnapshotPreflight() {
  const status = buildExecutionV1Status();
  const eligibility = status.snapshotEligibility || {};
  const allowed = Boolean(eligibility.allowed);
  return {
    action: 'snapshot',
    allowed,
    checkedAt: new Date().toISOString(),
    confirmRequired: true,
    notes: [
      allowed
        ? '현재 HEAD 기준 current surface evidence, closeout, handoff가 fresh한 상태입니다.'
        : eligibility.reason || '현재 상태에서는 release snapshot을 고정할 수 없습니다.',
      'snapshot 고정은 current surface를 다시 쓰지 않고 immutable release artifact만 생성합니다.',
      status.snapshot?.exists
        ? '이미 archived snapshot이 있더라도 현재 조건이 맞으면 새 verified commit 기준 snapshot을 다시 고정할 수 있습니다.'
        : '아직 archived snapshot이 없으면 이번 고정이 첫 immutable release artifact가 됩니다.',
    ],
    snapshotEligibility: eligibility,
    summary: allowed
      ? '현재 상태로 release snapshot을 고정할 수 있습니다.'
      : '현재 상태에서는 release snapshot을 고정할 수 없습니다.',
  };
}

function refreshExecutionV1Artifacts(args = []) {
  const result = spawnSync(process.execPath, [closeoutScriptPath, ...args], {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'execution-v1 closeout refresh failed');
  }

  const handoffResult = spawnSync(process.execPath, [handoffScriptPath], {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (handoffResult.status !== 0) {
    throw new Error(handoffResult.stderr || handoffResult.stdout || 'execution-v1 handoff refresh failed');
  }

  return buildExecutionV1Status();
}

function archiveExecutionV1Snapshot() {
  const result = spawnSync(process.execPath, [snapshotScriptPath], {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'execution-v1 snapshot archive failed');
  }

  let archiveResult = {};
  try {
    archiveResult = JSON.parse(String(result.stdout || '{}'));
  } catch {
    archiveResult = {};
  }

  return {
    archiveResult,
    status: buildExecutionV1Status(),
  };
}

function runExecutionV1Preflight(provider = '') {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    throw new Error('preflight provider가 필요합니다.');
  }
  if (normalizedProvider === 'all') {
    return runExecutionV1AllPreflight();
  }

  const result = spawnSync(process.execPath, [preflightScriptPath, normalizedProvider], {
    cwd: codeRootDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `execution-v1 preflight failed for ${normalizedProvider}`);
  }

  try {
    return JSON.parse(String(result.stdout || '{}'));
  } catch {
    throw new Error(`execution-v1 preflight output could not be parsed for ${normalizedProvider}`);
  }
}

function runExecutionV1AllPreflight() {
  const result = spawnSync(process.execPath, [preflightAllScriptPath], {
    cwd: codeRootDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'execution-v1 aggregate preflight failed');
  }

  try {
    return JSON.parse(String(result.stdout || '{}'));
  } catch {
    throw new Error('execution-v1 aggregate preflight output could not be parsed');
  }
}

function decodePathSegment(segment = '') {
  return decodeURIComponent(String(segment || '').trim());
}

function parseOptionalBooleanQueryParam(searchParams, name) {
  const rawValue = String(searchParams.get(name) || '').trim().toLowerCase();
  if (!rawValue) {
    return undefined;
  }
  if (rawValue === 'true') {
    return true;
  }
  if (rawValue === 'false') {
    return false;
  }
  return undefined;
}

function parseConstraints(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMissionAttachmentPayloads(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      content: String(item?.content || ''),
      contentBase64: String(item?.contentBase64 || '').trim(),
      contentEncoding: String(item?.contentEncoding || '').trim(),
      fileName: String(item?.fileName || '').trim(),
      mimeType: String(item?.mimeType || '').trim(),
      source: String(item?.source || 'ui').trim() || 'ui',
    }))
    .filter((item) => item.fileName && (item.content || item.contentBase64));
}

async function convertMissionAttachmentPayloads(value) {
  const attachments = [];

  for (const item of parseMissionAttachmentPayloads(value)) {
    if (!item.contentBase64) {
      attachments.push({
        content: item.content,
        fileName: item.fileName,
        mimeType: item.mimeType,
        source: item.source,
      });
      continue;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-attachment-'));
    const tempFilePath = path.join(tempDir, path.basename(item.fileName));
    try {
      fs.writeFileSync(tempFilePath, Buffer.from(item.contentBase64, 'base64'));
      const converted = await convertMissionAttachmentFile({ filePath: tempFilePath });
      attachments.push({
        content: converted.content,
        conversion: {
          ...converted.conversion,
          sourcePath: item.fileName,
        },
        fileName: item.fileName,
        mimeType: converted.conversion?.converted ? 'text/markdown' : item.mimeType,
        source: converted.conversion?.converted ? 'ui-converted' : item.source,
      });
    } finally {
      fs.rmSync(tempDir, { force: true, recursive: true });
    }
  }

  return attachments;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('JSON 본문을 해석할 수 없습니다.');
  }
}

function getLatestSessionSummary(missionId) {
  return service.listSessions(missionId).at(-1) || null;
}

function buildMissionListPayload({ tenantId = '' } = {}) {
  const visibleWorkspaces = filterTenantWorkspaces(store.listWorkspaces(), tenantId);
  const workspaces = new Map(visibleWorkspaces.map((workspace) => [workspace.id, workspace]));
  const missions = service.listMissions().filter((mission) => workspaces.has(mission.workspaceId)).map((mission) => ({
    latestSession: getLatestSessionSummary(mission.id),
    mission,
    workspace: workspaces.get(mission.workspaceId) || null,
  }));

  return {
    generatedAt: new Date().toISOString(),
    missions,
  };
}

function filterTenantWorkspaces(workspaces, tenantId = '') {
  if (tenantMode !== 'enforce') {
    return workspaces;
  }
  return workspaces.filter((workspace) => String(workspace.tenantId || '').trim() === tenantId);
}

function resolveAuthTenantId(auth) {
  if (tenantMode !== 'enforce') {
    return '';
  }
  return extractTenantClaim(auth.claims || {}, tenantClaim);
}

function evaluateWorkspaceTenantAccess(workspaceId, auth) {
  const workspace = store.getWorkspace(workspaceId);
  if (!workspace) {
    return {
      allowed: false,
      error: 'workspace-not-found',
      reason: `Workspace not found: ${workspaceId}`,
      status: 404,
    };
  }
  return {
    ...evaluateTenantAccess({
      auth,
      mode: tenantMode,
      resourceTenantId: workspace.tenantId,
      tenantClaim,
    }),
    workspace,
  };
}

function evaluateMissionTenantAccess(missionId, auth) {
  const mission = store.getMission(missionId);
  if (!mission) {
    return {
      allowed: false,
      error: 'mission-not-found',
      reason: `Mission not found: ${missionId}`,
      status: 404,
    };
  }
  const tenant = evaluateWorkspaceTenantAccess(mission.workspaceId, auth);
  return {
    ...tenant,
    mission,
  };
}

function sendTenantDenied(response, tenant) {
  sendJson(response, tenant.status || 403, {
    error: tenant.error || 'tenant-forbidden',
    message: tenant.reason,
    tenant: {
      mode: tenant.mode || tenantMode,
      required: tenant.required ?? tenantMode === 'enforce',
      tenantId: tenant.tenantId || '',
    },
  });
}

function resolveArtifactRecord(artifactId) {
  const artifact = store.getArtifact(artifactId);
  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  const artifactPath = resolveWithinRoot(rootDir, String(artifact.path || ''));
  if (!artifactPath) {
    throw new Error('Artifact path is outside of the project root.');
  }

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact file missing on disk: ${artifactPath}`);
  }

  return {
    artifact,
    artifactPath,
  };
}

function getContentType(filePath) {
  if (filePath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }
  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8';
  }
  if (filePath.endsWith('.md')) {
    return 'text/markdown; charset=utf-8';
  }
  if (filePath.endsWith('.png')) {
    return 'image/png';
  }
  return 'text/plain; charset=utf-8';
}

function serveStatic(response, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = resolveWithinRoot(publicDir, path.resolve(publicDir, relativePath));

  if (!filePath) {
    sendNotFound(response);
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendNotFound(response);
    return;
  }

  sendText(response, 200, fs.readFileSync(filePath, 'utf8'), getContentType(filePath));
}

async function handleApi(request, response, url) {
  const pathname = url.pathname;
  const auth =
    webAuthMode === 'oidc'
      ? await evaluateOidcWebAuth({
          audience: oidcAudience,
          authorizationHeader: request.headers.authorization,
          issuer: oidcIssuer,
          jwksUrl: oidcJwksUrl,
          roleClaim: oidcRoleClaim,
        })
      : evaluateWebAuth({
          authorizationHeader: request.headers.authorization,
          configuredToken: webAuthToken,
          mode: webAuthMode,
          tokenHeader: request.headers['x-personal-ai-agent-auth-token'],
        });

  if (!auth.allowed) {
    sendJson(response, 401, {
      auth: {
        authenticated: false,
        mode: auth.mode,
        reason: auth.reason,
        required: auth.required,
      },
      error: auth.error || 'auth-forbidden',
      message: auth.reason,
    });
    return;
  }

  const rbac = evaluateApiRbac({
    method: request.method,
    mode: rbacMode,
    pathname,
    role: resolveRequestRbacRole(request, auth),
  });

  if (!rbac.allowed) {
    sendJson(response, 403, {
      error: 'rbac-forbidden',
      message: rbac.reason,
      rbac,
    });
    return;
  }

  const {
    matchRoute,
    registerExactRoute,
    registerParamRoute,
  } = createRouteRegistry();
  const actionHandlers = buildActionHandlers({ auth, request, response, url });
  const releaseHandlers = buildExecutionV1ReleaseHandlers({ request, response, url });

  registerExactRoute('GET', '/api/meta', async () => {
    sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      host,
      port: activePort,
      rbac: {
        mode: rbacMode,
      },
      webAuth: {
        mode: webAuthMode,
        required: webAuthMode === 'enforce' || webAuthMode === 'oidc',
        roleClaim: webAuthMode === 'oidc' ? oidcRoleClaim : '',
      },
      tenant: {
        claim: tenantMode === 'enforce' ? tenantClaim : '',
        mode: tenantMode,
        required: tenantMode === 'enforce',
      },
      rootDir,
    });
  });

  registerExactRoute('GET', '/api/health', async () => {
    const runtimeJobs = summarizeRuntimeJobs();
    const runtimeRequests = summarizeRuntimeRequests();
    sendJson(response, 200, {
      ok: true,
      discoveryPath: serverDiscoveryPath,
      generatedAt: new Date().toISOString(),
      host,
      pid: process.pid,
      port: activePort,
      requestedPort,
      jobs: {
        activeCount: runtimeJobs.activeCount,
        recentCount: runtimeJobs.recentCount,
        registryPath: runtimeJobs.registryPath,
      },
      requests: {
        activeCount: runtimeRequests.activeCount,
        recentCount: runtimeRequests.recentCount,
        registryPath: runtimeRequests.registryPath,
      },
      rootDir,
      runtimeJobRegistryPath: runtimeJobRegistry.registryPath,
      runtimeRequestRegistryPath: runtimeRequestRegistry.registryPath,
      staleRuntimeJobCount: recoveredRuntimeJobs.recoveredCount,
      staleRuntimeRequestCount: recoveredRuntimeRequests.recoveredCount,
      runtime: runtimeStatus.readStatus(),
      runtimeStatusPath: runtimeStatus.statusPath,
      url: `http://${host}:${activePort}`,
    });
  });

  registerExactRoute('GET', '/api/doctor', async () => {
    const doctor = {
      generatedAt: new Date().toISOString(),
      ...runDoctor({ rootDir: codeRootDir }),
    };
    sendJson(response, 200, {
      ...doctor,
      handoffSummary: buildDoctorDiagnosticsSummary(doctor),
    });
  });

  registerExactRoute('GET', '/api/converter/diagnostics', async () => {
    sendJson(response, 200, await getDocumentConversionCapabilities());
  });

  registerExactRoute('GET', '/api/runtime/requests', async () => {
    sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      requests: summarizeRuntimeRequests(),
    });
  });

  registerExactRoute('GET', '/api/runtime/jobs', async () => {
    sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      jobs: summarizeRuntimeJobs(),
    });
  });

  registerExactRoute('GET', '/api/workspaces', async () => {
    sendJson(response, 200, {
      workspaces: filterTenantWorkspaces(store.listWorkspaces(), resolveAuthTenantId(auth)),
    });
  });

  registerExactRoute('POST', '/api/workspaces', async () => {
    const body = await readJsonBody(request);
    const rawWorkspacePath = String(body.workspacePath || '').trim();
    const normalizedPath = rawWorkspacePath ? path.resolve(rawWorkspacePath) : '';
    const authTenantId = resolveAuthTenantId(auth);
    const tenant = evaluateTenantAccess({
      auth,
      mode: tenantMode,
      resourceTenantId: authTenantId,
      tenantClaim,
    });
    if (!tenant.allowed) {
      sendTenantDenied(response, tenant);
      return;
    }

    const existingWorkspace = store
      .listWorkspaces()
      .find((workspace) => path.resolve(String(workspace.path || '')) === normalizedPath);

    if (existingWorkspace) {
      const existingTenant = evaluateTenantAccess({
        auth,
        mode: tenantMode,
        resourceTenantId: existingWorkspace.tenantId,
        tenantClaim,
      });
      if (!existingTenant.allowed) {
        sendTenantDenied(response, existingTenant);
        return;
      }
      sendJson(response, 200, {
        created: false,
        workspace: existingWorkspace,
      });
      return;
    }

    const workspace = service.addWorkspace({
      name: String(body.name || '').trim(),
      tenantId: authTenantId,
      workspacePath: normalizedPath,
    });

    sendJson(response, 201, {
      created: true,
      workspace,
    });
  });

  registerExactRoute('GET', '/api/providers', async () => {
    sendJson(response, 200, service.listProviders());
  });

  registerExactRoute('GET', '/api/providers/events', async () => {
    sendJson(
      response,
      200,
      service.getProviderEventTimeline({
        attempted: parseOptionalBooleanQueryParam(url.searchParams, 'attempted'),
        fallbackPolicy: String(
          url.searchParams.get('fallbackPolicy') || url.searchParams.get('fallback-policy') || '',
        ).trim(),
        fallbackStopReason: String(
          url.searchParams.get('fallbackStopReason') || url.searchParams.get('fallback-stop-reason') || '',
        ).trim(),
        family: String(url.searchParams.get('family') || '').trim(),
        ok: parseOptionalBooleanQueryParam(url.searchParams, 'ok'),
        providerId: String(
          url.searchParams.get('provider') || url.searchParams.get('providerId') || '',
        ).trim(),
        role: String(url.searchParams.get('role') || '').trim(),
        since: String(url.searchParams.get('since') || '').trim(),
        status: String(url.searchParams.get('status') || '').trim(),
      }),
    );
  });

  registerExactRoute('GET', '/api/execution-v1/status', releaseHandlers.getStatus);
  registerExactRoute('GET', '/api/execution-v1/release-blockers', releaseHandlers.getBlockers);
  registerParamRoute(
    'GET',
    '/api/execution-v1/handoff-artifacts/:artifactId',
    releaseHandlers.getHandoffArtifact,
  );
  registerExactRoute('GET', '/api/execution-v1/release-doc', releaseHandlers.getDocument);
  registerExactRoute('POST', '/api/execution-v1/refresh', releaseHandlers.refresh);
  registerExactRoute('POST', '/api/execution-v1/refresh/preflight', releaseHandlers.inspectRefresh);
  registerExactRoute('POST', '/api/execution-v1/preflight', releaseHandlers.preflightProvider);
  registerExactRoute('POST', '/api/execution-v1/snapshot', releaseHandlers.snapshot);
  registerExactRoute('POST', '/api/execution-v1/snapshot/preflight', releaseHandlers.inspectSnapshot);

  registerExactRoute('GET', '/api/actions', actionHandlers.getInbox);
  registerParamRoute(
    'POST',
    '/api/actions/learning-promotions/expire',
    actionHandlers.expireLearningPromotions,
  );
  registerParamRoute(
    'POST',
    '/api/actions/learning-promotions/:candidateId/remind',
    actionHandlers.remindLearningPromotion,
  );
  registerParamRoute(
    'POST',
    '/api/actions/learning-promotions/:candidateId/resolve',
    actionHandlers.resolveLearningPromotion,
  );
  registerParamRoute(
    'POST',
    '/api/actions/learning-promotions/:candidateId/rollback',
    actionHandlers.rollbackLearningPromotion,
  );
  registerParamRoute(
    'POST',
    '/api/actions/provider-attention/:actionId/remediate',
    actionHandlers.remediateProviderAttention,
  );
  registerParamRoute(
    'POST',
    '/api/actions/specialist-follow-ups/:actionId/remediate',
    actionHandlers.remediateSpecialistFollowUp,
  );
  registerParamRoute(
    'POST',
    '/api/actions/reviewer-follow-ups/:actionId/resolve',
    actionHandlers.resolveReviewerFollowUp,
  );

  registerExactRoute('GET', '/api/missions', async () => {
    sendJson(response, 200, buildMissionListPayload({ tenantId: resolveAuthTenantId(auth) }));
  });

  registerExactRoute('POST', '/api/missions', async () => {
    const body = await readJsonBody(request);
    const tenant = evaluateWorkspaceTenantAccess(String(body.workspaceId || '').trim(), auth);
    if (!tenant.allowed) {
      sendTenantDenied(response, tenant);
      return;
    }
    const mission = service.createMission({
      attachments: await convertMissionAttachmentPayloads(body.attachments),
      constraints: parseConstraints(body.constraints),
      deliverableType: String(body.deliverableType || '').trim(),
      mode: String(body.mode || '').trim(),
      objective: String(body.objective || '').trim(),
      title: String(body.title || '').trim(),
      workspaceId: String(body.workspaceId || '').trim(),
    });

    sendJson(response, 201, {
      mission,
    });
  });

  registerParamRoute('POST', '/api/missions/:missionId/attachments', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const tenant = evaluateMissionTenantAccess(missionId, auth);
    if (!tenant.allowed) {
      sendTenantDenied(response, tenant);
      return;
    }
    const body = await readJsonBody(request);
    const attachments = await convertMissionAttachmentPayloads(body.attachments);
    const created = attachments.map((attachment) =>
      service.addMissionAttachment({
        content: attachment.content,
        conversion: attachment.conversion,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        missionId,
        source: attachment.source || 'ui-upload',
      }),
    );

    sendJson(response, 201, {
      attachments: created,
    });
  });

  registerParamRoute('GET', '/api/missions/:missionId', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const tenant = evaluateMissionTenantAccess(missionId, auth);
    if (!tenant.allowed) {
      sendTenantDenied(response, tenant);
      return;
    }
    sendJson(response, 200, service.showMission(missionId));
  });

  registerParamRoute('POST', '/api/missions/:missionId/execution/rollback', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const body = await readJsonBody(request);
    const result = service.rollbackExecution(missionId, {
      dryRun: Boolean(body.dryRun),
      executionId: decodePathSegment(body.executionId || ''),
    });
    sendJson(response, 200, result);
  });

  registerParamRoute('GET', '/api/missions/:missionId/session', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const sessionId = String(url.searchParams.get('sessionId') || '').trim();
    sendJson(response, 200, service.showSession(missionId, { sessionId }));
  });

  registerParamRoute('GET', '/api/missions/:missionId/harness/documents', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    sendJson(
      response,
      200,
      service.browseMissionHarnessDocuments(missionId, {
        limit: String(url.searchParams.get('limit') || '').trim(),
        offset: String(url.searchParams.get('offset') || '').trim(),
        query: String(url.searchParams.get('query') || '').trim(),
        sort: String(url.searchParams.get('sort') || '').trim(),
        type: String(url.searchParams.get('type') || '').trim(),
      }),
    );
  });

  registerParamRoute('GET', '/api/missions/:missionId/harness/memory', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    sendJson(
      response,
      200,
      service.browseMissionHarnessMemory(missionId, {
        kind: String(url.searchParams.get('kind') || '').trim(),
        limit: String(url.searchParams.get('limit') || '').trim(),
        offset: String(url.searchParams.get('offset') || '').trim(),
        query: String(url.searchParams.get('query') || '').trim(),
        scope: String(url.searchParams.get('scope') || '').trim(),
        sort: String(url.searchParams.get('sort') || '').trim(),
      }),
    );
  });

  registerParamRoute('GET', '/api/missions/:missionId/timeline', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    sendJson(response, 200, service.getMissionTimeline(missionId));
  });

  registerParamRoute('PATCH', '/api/missions/:missionId/document-log/:entryId', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const entryId = decodePathSegment(params.entryId);
    const mission = service.showMission(missionId).mission;
    const body = await readJsonBody(request);
    const rawTitle = String(body.title || '').trim();
    const prefixedTitle = rawTitle.startsWith(`${mission.title} · `) ? rawTitle : `${mission.title} · ${rawTitle}`;
    const result = service.updateDocumentLog({
      content: String(body.content || '').trim(),
      entryId,
      title: prefixedTitle,
      type: String(body.type || '').trim(),
    });

    sendJson(response, 200, result);
  });

  registerParamRoute('DELETE', '/api/missions/:missionId/document-log/:entryId', async (params) => {
    const entryId = decodePathSegment(params.entryId);
    const result = service.deleteDocumentLog(entryId);

    sendJson(response, 200, result);
  });

  registerParamRoute('POST', '/api/missions/:missionId/execution/preflight', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const body = await readJsonBody(request);
    const result = service.preflightExecution(missionId, {
      requestApproval: Boolean(body.requestApproval),
    });

    sendJson(response, 200, result);
  });

  registerParamRoute('POST', '/api/missions/:missionId/execution/start', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const result = service.startExecution(missionId);
    sendJson(response, 200, result);
  });

  registerParamRoute('POST', '/api/missions/:missionId/execution/stop', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const result = service.stopExecution(missionId);
    sendJson(response, 200, result);
  });

  registerParamRoute('GET', '/api/missions/:missionId/execution', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    sendJson(response, 200, service.getExecutionStatus(missionId));
  });

  registerParamRoute('GET', '/api/missions/:missionId/execution/logs', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const executionId = decodePathSegment(url.searchParams.get('executionId') || '');
    sendJson(response, 200, service.getExecutionLogs(missionId, { executionId }));
  });

  registerParamRoute('POST', '/api/missions/:missionId/document-log/migrate-legacy', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    service.showMission(missionId);
    const result = service.migrateLegacyDocumentLogs();

    sendJson(response, 200, result);
  });

  registerParamRoute('POST', '/api/missions/:missionId/document-log', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const mission = service.showMission(missionId).mission;
    const body = await readJsonBody(request);
    const rawTitle = String(body.title || '').trim();
    const prefixedTitle = rawTitle.startsWith(`${mission.title} · `) ? rawTitle : `${mission.title} · ${rawTitle}`;
    const result = service.logDocument({
      content: String(body.content || '').trim(),
      title: prefixedTitle,
      type: String(body.type || '').trim(),
    });

    sendJson(response, 201, result);
  });

  registerParamRoute('PATCH', '/api/workspaces/:workspaceId/memory/:memoryId', async (params) => {
    const workspaceId = decodePathSegment(params.workspaceId);
    const memoryId = decodePathSegment(params.memoryId);
    const body = await readJsonBody(request);
    const entry = service.updateMemory({
      content: String(body.content || '').trim(),
      kind: String(body.kind || '').trim(),
      memoryId,
      scope: 'workspace',
      scopeId: workspaceId,
    });

    sendJson(response, 200, {
      entry,
    });
  });

  registerParamRoute('DELETE', '/api/workspaces/:workspaceId/memory/:memoryId', async (params) => {
    const workspaceId = decodePathSegment(params.workspaceId);
    const memoryId = decodePathSegment(params.memoryId);
    const entry = service.deleteMemory({
      memoryId,
      scope: 'workspace',
      scopeId: workspaceId,
    });

    sendJson(response, 200, {
      entry,
    });
  });

  registerParamRoute('POST', '/api/workspaces/:workspaceId/memory', async (params) => {
    const workspaceId = decodePathSegment(params.workspaceId);
    const body = await readJsonBody(request);
    const entry = service.addMemory({
      content: String(body.content || '').trim(),
      kind: String(body.kind || '').trim(),
      scope: 'workspace',
      scopeId: workspaceId,
    });

    sendJson(response, 201, {
      entry,
    });
  });

  registerParamRoute('PATCH', '/api/missions/:missionId/memory/:memoryId', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const memoryId = decodePathSegment(params.memoryId);
    const body = await readJsonBody(request);
    const entry = service.updateMemory({
      content: String(body.content || '').trim(),
      kind: String(body.kind || '').trim(),
      memoryId,
      scope: 'mission',
      scopeId: missionId,
    });

    sendJson(response, 200, {
      entry,
    });
  });

  registerParamRoute('DELETE', '/api/missions/:missionId/memory/:memoryId', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const memoryId = decodePathSegment(params.memoryId);
    const entry = service.deleteMemory({
      memoryId,
      scope: 'mission',
      scopeId: missionId,
    });

    sendJson(response, 200, {
      entry,
    });
  });

  registerParamRoute('POST', '/api/missions/:missionId/memory', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const body = await readJsonBody(request);
    const entry = service.addMemory({
      content: String(body.content || '').trim(),
      kind: String(body.kind || '').trim(),
      scope: 'mission',
      scopeId: missionId,
    });

    sendJson(response, 201, {
      entry,
    });
  });

  registerParamRoute('POST', '/api/missions/:missionId/run', async (params) => {
    const missionId = decodePathSegment(params.missionId);
    const body = await readJsonBody(request);
    const provider = String(body.provider || '').trim();
    const fallbackProvider = String(body.fallbackProvider || '').trim();
    const fallbackPolicy = String(body.fallbackPolicy || '').trim();
    const result = await service.runMission(missionId, {
      fallbackProvider,
      fallbackPolicy,
      provider,
      providerSpecified: Boolean(provider),
      sourceContext: {
        channel: 'web',
        requestId: request.id,
        route: pathname,
        sourceType: 'web',
      },
    });

    sendJson(response, 200, result);
  });

  registerExactRoute('GET', '/api/approvals', async () => {
    sendJson(response, 200, service.getApprovalInbox({}));
  });

  registerParamRoute('POST', '/api/approvals/:approvalId/resolve', async (params) => {
    const approvalId = decodePathSegment(params.approvalId);
    const body = await readJsonBody(request);
    const result = service.resolveApproval(approvalId, {
      decision: String(body.decision || '').trim(),
      reason: String(body.reason || '').trim(),
    });

    sendJson(response, 200, result);
  });

  registerParamRoute('GET', '/api/artifacts/:artifactId', async (params) => {
    const artifactId = decodePathSegment(params.artifactId);
    const { artifact, artifactPath } = resolveArtifactRecord(artifactId);
    const content = fs.readFileSync(artifactPath, 'utf8');

    sendJson(response, 200, {
      artifact,
      content,
      path: artifactPath,
    });
  });

  const route = matchRoute(request.method, pathname);
  if (route) {
    await route.handler(route.params);
    return;
  }

  sendNotFound(response);
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendNotFound(response);
    return;
  }

  const requestId = normalizeRequestId(request.headers['x-request-id']);
  request.id = requestId;
  response.setHeader('X-Request-Id', requestId);

  const url = new URL(request.url, `http://${request.headers.host || `${host}:${activePort}`}`);
  startRuntimeRequest(request, response, url);

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    if (request.method !== 'GET') {
      sendJson(response, 405, {
        error: 'method-not-allowed',
        message: '이 경로는 GET 요청만 지원합니다.',
      });
      return;
    }

    serveStatic(response, url.pathname);
  } catch (error) {
    sendError(response, error, 500);
  }
});

function listenOnce(serverInstance, portToTry) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      serverInstance.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      serverInstance.off('error', onError);
      resolve();
    };

    serverInstance.once('error', onError);
    serverInstance.once('listening', onListening);
    serverInstance.listen(portToTry, host);
  });
}

async function listenWithPortFallback(serverInstance, startPort, maxAttempts = 20) {
  for (let offset = 0; offset <= maxAttempts; offset += 1) {
    const candidatePort = startPort + offset;
    try {
      await listenOnce(serverInstance, candidatePort);
      return {
        fallback: offset > 0,
        port: candidatePort,
      };
    } catch (error) {
      if (error?.code !== 'EADDRINUSE' || offset >= maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error(`No available UI port found from ${startPort}.`);
}

const listenResult = await listenWithPortFallback(server, requestedPort);
activePort = listenResult.port;
const consoleUrl = writeServerDiscovery({
  actualPort: activePort,
  fallback: listenResult.fallback,
});
runtimeStatus.markListening({
  discoveryPath: serverDiscoveryPath,
  host,
  port: activePort,
  requestedPort,
  rootPath: rootDir,
  url: consoleUrl,
});

function shutdownRuntime(reason) {
  try {
    runtimeStatus.markStopped(reason);
  } catch {
    // Shutdown should not be blocked by status-file best-effort cleanup.
  }
}

process.once('SIGINT', () => {
  shutdownRuntime('SIGINT');
  process.exit(130);
});

process.once('SIGTERM', () => {
  shutdownRuntime('SIGTERM');
  process.exit(143);
});

console.log(
  JSON.stringify(
    {
      discoveryPath: serverDiscoveryPath,
      requestedPort,
      rootDir,
      status: 'listening',
      url: consoleUrl,
    },
    null,
    2,
  ),
);
