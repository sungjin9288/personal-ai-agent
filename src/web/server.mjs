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
import { createId } from '../core/id.mjs';
import { createMissionService } from '../core/mission-service.mjs';
import { evaluateApiRbac, normalizeRbacMode, normalizeRbacRole } from '../core/rbac-policy.mjs';
import { resolveRootDir } from '../core/root.mjs';
import { evaluateTenantAccess, extractTenantClaim, normalizeTenantMode } from '../core/tenant-policy.mjs';
import { createRuntimeJobRegistry } from '../core/runtime-job-registry.mjs';
import { createRuntimeRequestRegistry } from '../core/runtime-request-registry.mjs';
import { createRuntimeStatusService } from '../core/runtime-status-service.mjs';
import { createStore } from '../core/store.mjs';
import { evaluateOidcWebAuth, evaluateWebAuth, normalizeWebAuthMode } from '../core/web-auth-policy.mjs';

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
  'docs/pilot-export-package-v1.md',
  'docs/production-like-release-drill-v1.md',
  'docs/production-slo-operating-v1.md',
  'docs/production-retention-operating-v1.md',
  'docs/production-provider-readiness-v1.md',
  'docs/production-enterprise-controls-v1.md',
  'docs/release-readiness-v1.md',
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

function resolveExecutionV1ReleaseHandoffArtifact(artifactId) {
  const entry = executionV1ReleaseHandoffArtifactSpecs.find((item) => item.id === artifactId);
  if (!entry) {
    return null;
  }

  const artifactPath = path.resolve(entry.path);
  const safeRoot = path.resolve(rootDir);
  if (!artifactPath.startsWith(`${safeRoot}${path.sep}`) && artifactPath !== safeRoot) {
    return null;
  }

  if (!fs.existsSync(artifactPath) || fs.statSync(artifactPath).isDirectory()) {
    return null;
  }

  return {
    artifactPath,
    entry,
  };
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

function normalizeRepoRelativePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function isExecutionV1ReleaseArtifactPath(filePath = '') {
  const relativePath = normalizeRepoRelativePath(filePath);
  return executionV1MutableArtifactPaths.has(relativePath)
    || relativePath.startsWith('docs/releases/execution-v1/');
}

function isExecutionV1ReleaseEvidenceDocPath(filePath = '') {
  const relativePath = normalizeRepoRelativePath(filePath);
  return executionV1ReleaseEvidenceDocPaths.has(relativePath)
    || relativePath.startsWith('docs/releases/execution-v1/');
}

function resolveExecutionV1ReleaseEvidenceDoc(filePath = '') {
  const relativePath = normalizeRepoRelativePath(filePath);
  if (!isExecutionV1ReleaseEvidenceDocPath(relativePath)) {
    return null;
  }

  const resolvedPath = path.resolve(rootDir, relativePath);
  const docsRoot = path.resolve(rootDir, 'docs');
  if (!resolvedPath.startsWith(`${docsRoot}${path.sep}`) && resolvedPath !== docsRoot) {
    return null;
  }
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return null;
  }

  return {
    path: resolvedPath,
    relativePath,
  };
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
  const detected = changedPaths.length > 0 && changedPaths.every(isExecutionV1ReleaseArtifactPath);

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

function runRuntimeJob({
  details = null,
  jobKind,
  requestId = '',
  scope = '',
  summary = '',
  task,
}) {
  const job = runtimeJobRegistry.startJob({
    details,
    kind: jobKind,
    requestId,
    scope,
    source: 'web-ui',
    summary,
  });

  try {
    const result = task(job);
    runtimeJobRegistry.finishJob(job.id, {
      details: {
        ...job.details,
        result: summarizeRuntimeJobResult(result),
      },
      status: 'completed',
      summary,
    });
    return {
      job,
      result,
    };
  } catch (error) {
    runtimeJobRegistry.finishJob(job.id, {
      error: error instanceof Error ? error.message : 'unknown runtime job error',
      status: 'failed',
      summary,
    });
    throw error;
  }
}

function summarizeRuntimeJobResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  return {
    archiveCommit: String(result.archiveResult?.verifiedCommit || '').trim(),
    evidencePath: String(result.evidencePath || result.evidenceResult?.outputPath || '').trim(),
    generatedAt: String(result.generatedAt || result.closeoutResult?.generatedAt || '').trim(),
    keyCount: Object.keys(result).length,
    ok: Boolean(result.ok),
    outputPath: String(result.outputPath || result.closeoutResult?.checklistPath || '').trim(),
  };
}

function isOptionalCloseoutLabel(label) {
  return /Anthropic live validation|Local provider live validation|local live validation|Hermes live validation|hermes live validation/i.test(String(label || ''));
}

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

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${label}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMarkdownSection(markdown, heading, level = 2) {
  const normalizedLevel = Math.max(1, Math.min(Number(level) || 2, 6));
  const headingPrefix = '#'.repeat(normalizedLevel);
  const sectionPattern = new RegExp(
    `(?:^|\\n)${headingPrefix} ${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n#{1,${normalizedLevel}}\\s|$)`,
  );
  const sectionMatch = String(markdown || '').match(sectionPattern);
  return sectionMatch ? String(sectionMatch[1] || '').trim() : '';
}

function extractSectionBullets(markdown, heading) {
  const sectionPattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const sectionMatch = String(markdown || '').match(sectionPattern);
  if (!sectionMatch) {
    return [];
  }

  return String(sectionMatch[1] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function extractBulletsAfterLabel(markdown, label) {
  const normalizedLabel = `${String(label || '').trim().replace(/:$/, '')}:`.toLowerCase();
  const entries = [];
  let inList = false;
  let foundListItem = false;

  for (const line of String(markdown || '').split('\n')) {
    const trimmedLine = line.trim();
    if (!inList && trimmedLine.toLowerCase() === normalizedLabel) {
      inList = true;
      continue;
    }
    if (!inList) {
      continue;
    }
    if (!trimmedLine) {
      continue;
    }
    if (!trimmedLine.startsWith('- ')) {
      if (foundListItem) {
        break;
      }
      continue;
    }
    entries.push(trimmedLine.slice(2).trim());
    foundListItem = true;
  }

  return entries.filter(Boolean);
}

function extractPlainStatus(markdown) {
  const match = String(markdown || '').match(/^Status:\s+(.+)$/m);
  return match ? String(match[1] || '').trim().replace(/\.$/, '') : '';
}

function extractChecklistItems(markdown) {
  const sectionPattern = /## Closeout Checklist\n([\s\S]*?)(?:\n## |$)/;
  const sectionMatch = String(markdown || '').match(sectionPattern);
  if (!sectionMatch) {
    return [];
  }

  return String(sectionMatch[1] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^- \[[ x]\]/.test(line))
    .map((line) => ({
      done: line.startsWith('- [x]'),
      label: line.replace(/^- \[[ x]\]\s*/, '').trim(),
    }));
}

function extractStatusMap(markdown) {
  return Object.fromEntries(
    extractSectionBullets(markdown, 'Current Status')
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) {
          return null;
        }
        return [
          String(line.slice(0, separatorIndex) || '').trim(),
          String(line.slice(separatorIndex + 1) || '').trim(),
        ];
      })
      .filter(Boolean),
  );
}

function extractLiveValidationItems(markdown) {
  return extractSectionBullets(markdown, 'Live Validation').map((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      return {
        provider: 'summary',
        status: line,
      };
    }

    return {
      provider: String(line.slice(0, separatorIndex) || '').trim(),
      status: String(line.slice(separatorIndex + 1) || '').trim(),
    };
  });
}

function extractDeterministicItems(markdown) {
  return extractSectionBullets(markdown, 'Deterministic Verification').map((line) => {
    const separatorIndex = line.lastIndexOf(':');
    if (separatorIndex === -1) {
      return {
        script: line,
        status: 'unknown',
      };
    }

    return {
      script: String(line.slice(0, separatorIndex) || '').trim(),
      status: String(line.slice(separatorIndex + 1) || '').trim(),
    };
  });
}

function extractDeterministicRuntimeItems(markdown) {
  return extractSectionBullets(markdown, 'Deterministic Runtime Summary').map((line) => {
    const match = line.match(/^(.*):\s+(.+?) elapsed, stdout (.+?), stderr (.+?), timeout (.+)$/);
    if (!match) {
      return {
        script: line,
        summary: line,
      };
    }

    return {
      elapsed: String(match[2] || '').trim(),
      script: String(match[1] || '').trim(),
      stderr: String(match[4] || '').trim(),
      stdout: String(match[3] || '').trim(),
      summary: String(line.slice(String(match[1] || '').length + 1) || '').trim(),
      timeout: String(match[5] || '').trim(),
    };
  });
}

function isReferenceAdoptionVerification(item) {
  return String(item?.script || '').trim() === 'smoke:reference-adoptions';
}

function isExecutionV1HelperVerification(item) {
  return String(item?.script || '').trim() === 'smoke:execution-v1-live-helpers';
}

function isExecutionV1HandoffVerification(item) {
  return String(item?.script || '').trim() === 'smoke:execution-v1-handoff';
}

function isProductionReadinessGateVerification(item) {
  return String(item?.script || '').trim() === 'smoke:production-readiness-gate';
}

function extractReferenceAdoptionAggregate(markdown) {
  const lines = extractSectionBullets(markdown, 'Reference Adoption Aggregate');
  const scriptCountLine = lines.find((line) => line.startsWith('scriptCount:'));
  const totalDurationLine = lines.find((line) => line.startsWith('totalDuration:'));
  const okLine = lines.find((line) => line.startsWith('ok:'));
  const scripts = lines
    .map((line) => {
      const match = line.match(/^(scripts\/[^:]+):\s+(\w+)(?:\s+\(([^)]+)\))?$/);
      if (!match) {
        return null;
      }

      const details = parseReferenceAdoptionScriptDetails(match[3] || '');
      return {
        duration: details.duration,
        script: String(match[1] || '').trim(),
        status: String(match[2] || '').trim(),
        timedOut: details.timedOut,
        timeout: details.timeout,
      };
    })
    .filter(Boolean);

  return {
    ok: okLine ? okLine.split(':').slice(1).join(':').trim() === 'true' : null,
    scriptCount: Number.parseInt(String(scriptCountLine || '').split(':').slice(1).join(':').trim(), 10) || scripts.length,
    scripts,
    totalDuration: totalDurationLine ? totalDurationLine.split(':').slice(1).join(':').trim() : null,
  };
}

function parseReferenceAdoptionScriptDetails(rawDetails = '') {
  const segments = String(rawDetails || '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const duration = segments[0] || null;
  const timeoutSegment = segments.find((segment) => segment.startsWith('timeout '));
  const timedOutSegment = segments.find((segment) => segment.startsWith('timedOut '));

  return {
    duration,
    timedOut: timedOutSegment ? timedOutSegment.split(/\s+/).slice(1).join(' ') === 'true' : null,
    timeout: timeoutSegment ? timeoutSegment.split(/\s+/).slice(1).join(' ') || null : null,
  };
}

function buildReleaseReadinessCommand(label, command, kind = 'verification') {
  return {
    command,
    kind,
    label,
  };
}

function buildReleaseReadinessDoc(label, path) {
  const relativePath = normalizeRepoRelativePath(path);
  const docRecord = resolveExecutionV1ReleaseEvidenceDoc(relativePath);
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
        buildReleaseReadinessCommand('Provider fallback policy smoke', 'npm run smoke:provider-fallback-policy'),
        buildReleaseReadinessCommand('Provider events fallback audit', 'npm run smoke:provider-events'),
        buildReleaseReadinessCommand(
          'Provider attention remediation fallback audit',
          'npm run smoke:provider-attention-remediation',
        ),
        buildReleaseReadinessCommand('Mission timeline fallback audit', 'npm run smoke:mission-timeline'),
        buildReleaseReadinessCommand('Operator timeline fallback audit', 'npm run smoke:operator-timeline'),
        buildReleaseReadinessCommand('Release artifact hygiene smoke', 'npm run smoke:release-artifact-hygiene'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md'),
        buildReleaseReadinessDoc('Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md'),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
      ],
      nextEvidence: 'Completed per-provider operations capture template, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable proof, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, operator timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop reason, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment plan, artifact hygiene result, production readiness gate result, residual risk, decision owner, and next review date from the approved target boundary.',
      owner: 'provider-ops',
      stopReason: 'Target provider operations lacks same-boundary per-provider operations capture template proof, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable proof, provider fallback runtime audit proof with fallback policy id, timeline chronology, provider events family, attention remediation command, provider-failure-only failover, recoverable-provider-failure-only stop reason, selected fallback provider, and deterministic stop-condition proof, target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment proof, artifact hygiene result, production readiness gate result, residual risk decision, decision owner proof, and next review date proof.',
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
  const ownerCounts = {};
  const providerCounts = {};
  const statusCounts = {};
  let commandCount = 0;
  let evidenceDocCount = 0;
  let topPriorityAction = null;
  let topPriorityValue = Number.POSITIVE_INFINITY;

  for (const [index, action] of actions.entries()) {
    incrementCountRecord(categoryCounts, action?.category || 'release-readiness');
    incrementCountRecord(ownerCounts, action?.owner || 'release-owner');
    if (action?.provider) {
      incrementCountRecord(providerCounts, action.provider);
    }
    incrementCountRecord(statusCounts, action?.status || 'blocked');
    commandCount += Array.isArray(action?.commands) ? action.commands.length : 0;
    evidenceDocCount += Array.isArray(action?.evidenceDocs) ? action.evidenceDocs.length : 0;

    const priority = Number.isFinite(Number(action?.priority)) ? Number(action.priority) : index + 1;
    if (!topPriorityAction || priority < topPriorityValue) {
      topPriorityAction = action;
      topPriorityValue = priority;
    }
  }

  return {
    actionCount: actions.length,
    categoryCounts: sortCountRecord(categoryCounts),
    commandCount,
    evidenceDocCount,
    ownerCounts: sortCountRecord(ownerCounts),
    providerActionCount: Object.values(providerCounts).reduce((total, value) => total + Number(value || 0), 0),
    providerCounts: sortCountRecord(providerCounts),
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

function buildReleaseReadinessSummary(markdown = '') {
  const productionReadySection = extractMarkdownSection(markdown, 'Production Ready', 3);
  const productionBlockers = extractBulletsAfterLabel(productionReadySection, 'Blockers');
  const currentOpenBlockers = extractSectionBullets(markdown, 'Current Open Blockers');
  const currentOpenBlockerActions = currentOpenBlockers.map((blocker, index) =>
    buildCurrentOpenBlockerAction(blocker, index),
  );
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

function buildExecutionV1ArtifactSummary(evidenceMarkdown = '', closeoutMarkdown = '') {
  const checklist = extractChecklistItems(closeoutMarkdown);
  const deterministic = extractDeterministicItems(evidenceMarkdown);
  const deterministicRuntime = extractDeterministicRuntimeItems(evidenceMarkdown);
  const referenceAdoptionAggregate = extractReferenceAdoptionAggregate(evidenceMarkdown);
  const coreDeterministic = deterministic.filter(
    (item) =>
      !isReferenceAdoptionVerification(item)
      && !isExecutionV1HelperVerification(item)
      && !isExecutionV1HandoffVerification(item)
      && !isProductionReadinessGateVerification(item),
  );
  const referenceAdoption = deterministic.filter(isReferenceAdoptionVerification);
  const executionV1Helpers = deterministic.filter(isExecutionV1HelperVerification);
  const executionV1Handoff = deterministic.filter(isExecutionV1HandoffVerification);
  const productionReadinessGate = deterministic.filter(isProductionReadinessGateVerification);
  const liveValidation = extractLiveValidationItems(evidenceMarkdown);
  const gaps = extractSectionBullets(evidenceMarkdown, 'Remaining Gaps');
  const notes = extractSectionBullets(closeoutMarkdown, 'Notes');
  const values = extractStatusMap(closeoutMarkdown);
  const requiredChecklistOpen = checklist.filter((item) => !item.done && !isOptionalCloseoutLabel(item.label)).length;
  const optionalChecklistOpen = checklist.filter((item) => !item.done && isOptionalCloseoutLabel(item.label)).length;
  const blockedItems = Object.entries(values).filter(
    ([label, value]) => /blocked|missing-env/i.test(String(value || '')) && !isOptionalCloseoutLabel(label),
  ).length;
  const optionalBlockedItems = Object.entries(values).filter(
    ([label, value]) => /blocked|missing-env/i.test(String(value || '')) && isOptionalCloseoutLabel(label),
  ).length;

  return {
    blockedItems,
    branch: extractBulletValue(closeoutMarkdown, 'branch') || extractBulletValue(evidenceMarkdown, 'branch'),
    checklist,
    closeoutGeneratedAt: extractBulletValue(closeoutMarkdown, 'generatedAt'),
    commit: extractBulletValue(closeoutMarkdown, 'commit') || extractBulletValue(evidenceMarkdown, 'commit'),
    coreDeterministicPassed: coreDeterministic.filter((item) => item.status === 'passed').length,
    coreDeterministicTotal: coreDeterministic.length,
    deterministic,
    deterministicPassed: deterministic.filter((item) => item.status === 'passed').length,
    deterministicRuntime,
    evidenceGeneratedAt: extractBulletValue(evidenceMarkdown, 'generatedAt'),
    gaps,
    liveValidation,
    notes,
    optionalBlockedItems,
    optionalChecklistOpen,
    referenceAdoptionAggregate,
    referenceAdoptionPassed: referenceAdoption.filter((item) => item.status === 'passed').length,
    referenceAdoptionTotal: referenceAdoption.length,
    executionV1HelperPassed: executionV1Helpers.filter((item) => item.status === 'passed').length,
    executionV1HelperTotal: executionV1Helpers.length,
    executionV1HandoffPassed: executionV1Handoff.filter((item) => item.status === 'passed').length,
    executionV1HandoffTotal: executionV1Handoff.length,
    productionReadinessGatePassed: productionReadinessGate.filter((item) => item.status === 'passed').length,
    productionReadinessGateTotal: productionReadinessGate.length,
    requiredChecklistOpen,
    values,
  };
}

function getLiveValidationValue(values, provider) {
  const target = `${String(provider || '').trim().toLowerCase()} live validation`;
  const entry = Object.entries(values || {}).find(([label]) => String(label || '').trim().toLowerCase() === target);
  return String(entry?.[1] || '').trim().toLowerCase();
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
  const providerReadiness = liveValidationProviders.map((item) => ({
    command: item.command,
    envKey: item.envKey,
    evidenceCommand: item.evidenceCommand,
    label: item.label,
    preflightCommand: `npm run preflight:execution-v1:${item.provider}`,
    provider: item.provider,
    ready: Boolean(process.env[item.envKey]),
    status: process.env[item.envKey] ? 'ready' : 'missing-env',
  }));
  const generatedCommit = currentArtifacts.commit;
  const generatedBranch = currentArtifacts.branch;
  const artifactSyncCommit = buildExecutionV1ArtifactSyncCommit(currentCommit, generatedCommit);
  const effectiveReleaseCommit = artifactSyncCommit.detected ? generatedCommit : currentCommit;
  const snapshot = readExecutionV1Snapshot(generatedCommit, effectiveReleaseCommit);
  const baselineEvidenceMarkdown = snapshot ? readMarkdownFile(snapshot.evidencePath) : '';
  const baselineCloseoutMarkdown = snapshot ? readMarkdownFile(snapshot.closeoutPath) : '';
  const baselineHandoffMarkdown = snapshot?.handoffPath ? readMarkdownFile(snapshot.handoffPath) : '';
  const baselineArtifacts = buildExecutionV1ArtifactSummary(baselineEvidenceMarkdown, baselineCloseoutMarkdown);
  const handoffCommit = extractBulletValue(handoffMarkdown, 'commit');
  const docStatuses = getTrackedFileStatus([
    evidenceDocPath,
    closeoutDocPath,
    handoffDocPath,
    pilotExportPackageDocPath,
    productionLikeReleaseDrillDocPath,
  ]);
  const handoffArtifacts = buildExecutionV1ReleaseHandoffArtifacts();
  const staleReasons = [];
  const localArtifactNotes = [];
  const runtimeJobs = summarizeRuntimeJobs();

  if (!evidenceMarkdown || !closeoutMarkdown || !handoffMarkdown) {
    staleReasons.push('evidence, closeout, handoff 문서 중 아직 생성되지 않은 문서가 있습니다.');
  }
  if (generatedCommit && currentCommit && generatedCommit !== currentCommit && !artifactSyncCommit.detected) {
    staleReasons.push('현재 HEAD와 evidence/closeout이 가리키는 commit이 다릅니다.');
  }
  if (
    handoffCommit
      && currentCommit
      && handoffCommit !== currentCommit
      && !(artifactSyncCommit.detected && handoffCommit === artifactSyncCommit.verifiedCommit)
  ) {
    staleReasons.push('현재 HEAD와 handoff가 가리키는 commit이 다릅니다.');
  }
  if (handoffCommit && generatedCommit && handoffCommit !== generatedCommit) {
    staleReasons.push('handoff와 evidence/closeout이 가리키는 commit이 다릅니다.');
  }
  const artifactsMatchCurrentHead = Boolean(
    generatedCommit
      && currentCommit
      && (generatedCommit === currentCommit || artifactSyncCommit.detected),
  );
  const handoffMatchesCurrentHead = Boolean(
    handoffCommit
      && currentCommit
      && (handoffCommit === currentCommit || (artifactSyncCommit.detected && handoffCommit === artifactSyncCommit.verifiedCommit)),
  );
  const handoffMatchesGeneratedCommit = Boolean(handoffCommit && generatedCommit && handoffCommit === generatedCommit);
  const hasLocalArtifactChanges = docStatuses.length > 0;
  if (hasLocalArtifactChanges) {
    if (artifactsMatchCurrentHead && handoffMatchesCurrentHead) {
      localArtifactNotes.push('evidence/closeout/handoff/export/drill 문서가 현재 HEAD 기준으로 로컬에서 갱신되었지만 아직 커밋되지는 않았습니다.');
    } else {
      staleReasons.push('evidence, closeout, handoff, export, drill 문서 중 워크트리에서 수정된 문서가 현재 HEAD와 어긋나 있습니다.');
    }
  }
  if (artifactSyncCommit.detected) {
    localArtifactNotes.push('현재 HEAD는 verified commit 위에 release artifact만 동기화한 커밋이므로 evidence/closeout/handoff/export/drill freshness를 유지한 것으로 처리합니다.');
  }

  const stale = staleReasons.length > 0;
  const releaseActionHistory = store
    .listReleaseActions()
    .slice(-8)
    .reverse();
  const baselineReady = Boolean(
    snapshot
      && baselineEvidenceMarkdown
      && baselineCloseoutMarkdown
      && baselineHandoffMarkdown
      && baselineArtifacts.requiredChecklistOpen === 0
      && baselineArtifacts.blockedItems === 0,
  );
  const artifactState = !evidenceMarkdown || !closeoutMarkdown || !handoffMarkdown
    ? 'missing'
    : stale
      ? 'stale'
      : artifactSyncCommit.detected
      ? 'artifact-sync-current'
      : hasLocalArtifactChanges
      ? 'local-current'
      : 'current';
  const refreshPlan = {
    allowed: true,
    affectsPaths: [evidenceDocPath, closeoutDocPath, handoffDocPath],
    rerunsDeterministicVerification: true,
    rerunsLiveValidation: false,
    rewritesCurrentSurface: true,
    snapshotChanges: false,
    summary:
      'current surface 재생성은 deterministic verification을 다시 실행한 뒤 evidence, closeout, handoff markdown을 현재 HEAD 기준으로 다시 씁니다.',
    notes: [
      'verified snapshot은 그대로 유지되고, current surface evidence/closeout/handoff만 다시 생성됩니다.',
      'provider live validation은 provider별 live action을 눌렀을 때만 다시 실행됩니다.',
      hasLocalArtifactChanges
        ? '현재 로컬에서 수정된 evidence/closeout/handoff 문서는 재생성 결과로 덮어써질 수 있습니다.'
        : '현재 evidence/closeout/handoff 문서가 워크트리에서 추가로 수정된 상태는 아닙니다.',
      stale
        ? '현재 stale reason이 남아 있어도 재생성은 가능하며, 최신 HEAD 기준 상태를 다시 계산합니다.'
        : '현재 HEAD 기준으로 다시 계산해도 같은 readiness를 유지해야 합니다.',
    ],
  };
  const recommendedActions = [];

  if (stale) {
    recommendedActions.push({
      action: 'regenerate-release-surface',
      category: 'required',
      description: '현재 HEAD와 current surface evidence/closeout/handoff가 어긋나 있어 release tab의 mutable artifact를 다시 맞춰야 합니다.',
      label: 'current surface 재생성',
      priority: 1,
    });
  }

  if (
    !stale
      && !artifactSyncCommit.detected
      && snapshot?.verifiedCommit !== currentCommit
      && evidenceMarkdown
      && closeoutMarkdown
      && handoffMarkdown
      && currentArtifacts.requiredChecklistOpen === 0
      && currentArtifacts.blockedItems === 0
  ) {
    recommendedActions.push({
      action: 'archive-release-snapshot',
      category: 'release',
      description: '현재 HEAD 기준 current surface가 fresh하므로 verified baseline을 새 commit으로 고정할 수 있습니다.',
      label: 'release snapshot 고정',
      priority: 2,
    });
  }

  providerReadiness.forEach((item) => {
    const providerStatus = getLiveValidationValue(currentArtifacts.values, item.provider);
    if (providerStatus === 'passed') {
      return;
    }
    if (item.ready) {
      recommendedActions.push({
        action: 'run-release-preflight',
        actionProvider: item.provider,
        category: isOptionalCloseoutLabel(`${item.provider} live validation`) ? 'optional' : 'required',
        command: item.preflightCommand,
        description: `${item.label} provider env가 준비되어 있습니다. live validation 전 deterministic preflight를 다시 확인할 수 있습니다.`,
        envKey: item.envKey,
        evidenceCommand: item.evidenceCommand,
        label: `${item.label} preflight 실행`,
        liveCommand: item.command,
        priority: item.provider === 'openai' ? 3 : 4,
        provider: item.provider,
      });
      return;
    }
    recommendedActions.push({
      category: isOptionalCloseoutLabel(`${item.provider} live validation`) ? 'optional' : 'required',
      command: `export ${item.envKey}="..." && ${item.command}`,
      description: `${item.label} live validation은 ${item.envKey}가 있어야 실행할 수 있습니다.`,
      envKey: item.envKey,
      evidenceCommand: item.evidenceCommand,
      label: `${item.label} env 준비`,
      liveCommand: item.command,
      priority: item.provider === 'openai' ? 3 : 5,
      provider: item.provider,
    });
  });

  recommendedActions.sort((left, right) => Number(left.priority || 99) - Number(right.priority || 99));

  return {
    artifactState,
    artifactSyncCommit,
    artifactsMatchCurrentHead,
    branch: generatedBranch,
    checklist: currentArtifacts.checklist,
    closeout: {
      generatedAt: currentArtifacts.closeoutGeneratedAt,
      markdown: closeoutMarkdown,
      path: closeoutDocPath,
    },
    commit: generatedCommit,
    currentBranch,
    currentCommit,
    deterministic: currentArtifacts.deterministic,
    deterministicRuntime: currentArtifacts.deterministicRuntime,
    docStatuses,
    evidence: {
      generatedAt: currentArtifacts.evidenceGeneratedAt,
      markdown: evidenceMarkdown,
      path: evidenceDocPath,
    },
    gaps: currentArtifacts.gaps,
    handoffArtifacts,
    handoff: {
      commit: handoffCommit,
      generatedAt: extractBulletValue(handoffMarkdown, 'generatedAt'),
      markdown: handoffMarkdown,
      path: handoffDocPath,
    },
    liveValidation: currentArtifacts.liveValidation,
    localArtifactNotes,
    notes: currentArtifacts.notes,
    recommendedActions,
    referenceAdoptionAggregate: currentArtifacts.referenceAdoptionAggregate,
    releaseReadiness: {
      ...releaseReadiness,
      markdown: releaseReadinessMarkdown,
      path: releaseReadinessDocPath,
    },
    releaseActionHistory,
    runtimeJobs,
    providerReadiness,
    refreshPlan,
    snapshotEligibility: {
      allowed: Boolean(
        !stale
          && !artifactSyncCommit.detected
          && currentArtifacts.requiredChecklistOpen === 0
          && currentArtifacts.blockedItems === 0
          && evidenceMarkdown
          && closeoutMarkdown
          && handoffMarkdown,
      ),
      reason: !evidenceMarkdown || !closeoutMarkdown || !handoffMarkdown
        ? 'evidence, closeout, handoff 문서 중 아직 없는 문서가 있습니다.'
        : stale
          ? 'current evidence/closeout/handoff가 최신 HEAD와 어긋나 있습니다.'
          : artifactSyncCommit.detected
            ? '현재 HEAD는 release artifact sync 커밋이므로 새 snapshot freeze 대상이 아닙니다.'
          : currentArtifacts.requiredChecklistOpen > 0
            ? `필수 closeout checklist ${currentArtifacts.requiredChecklistOpen}건이 남아 있습니다.`
            : currentArtifacts.blockedItems > 0
              ? `필수 gap ${currentArtifacts.blockedItems}건이 남아 있습니다.`
              : 'current HEAD 기준 snapshot 생성 가능',
    },
    baseline: snapshot
      ? {
          archivedAt: snapshot.archivedAt,
          blockedItems: baselineArtifacts.blockedItems,
          branch: baselineArtifacts.branch,
          checklistOpen: baselineArtifacts.requiredChecklistOpen,
          checklistTotal: baselineArtifacts.checklist.length,
          commit: snapshot.verifiedCommit || baselineArtifacts.commit,
          coreDeterministicPassed: baselineArtifacts.coreDeterministicPassed,
          coreDeterministicTotal: baselineArtifacts.coreDeterministicTotal,
          deterministicPassed: baselineArtifacts.deterministicPassed,
          deterministicRuntimeTotal: baselineArtifacts.deterministicRuntime.length,
          deterministicTotal: baselineArtifacts.deterministic.length,
          exists: true,
          generatedAt:
            baselineArtifacts.closeoutGeneratedAt || baselineArtifacts.evidenceGeneratedAt || snapshot.archivedAt,
          optionalBlockedItems: baselineArtifacts.optionalBlockedItems,
          optionalChecklistOpen: baselineArtifacts.optionalChecklistOpen,
          handoffGeneratedAt: extractBulletValue(baselineHandoffMarkdown, 'generatedAt'),
          referenceAdoptionAggregate: baselineArtifacts.referenceAdoptionAggregate,
          executionV1HelperPassed: baselineArtifacts.executionV1HelperPassed,
          executionV1HelperTotal: baselineArtifacts.executionV1HelperTotal,
          executionV1HandoffPassed: baselineArtifacts.executionV1HandoffPassed,
          executionV1HandoffTotal: baselineArtifacts.executionV1HandoffTotal,
          productionReadinessGatePassed: baselineArtifacts.productionReadinessGatePassed,
          productionReadinessGateTotal: baselineArtifacts.productionReadinessGateTotal,
          referenceAdoptionPassed: baselineArtifacts.referenceAdoptionPassed,
          referenceAdoptionTotal: baselineArtifacts.referenceAdoptionTotal,
          ready: baselineReady,
        }
      : null,
    snapshot,
    stale,
    staleReasons,
    summary: {
      baselineBlockedItems: baselineArtifacts.blockedItems,
      baselineChecklistOpen: baselineArtifacts.requiredChecklistOpen,
      baselineCoreDeterministicPassed: baselineArtifacts.coreDeterministicPassed,
      baselineCoreDeterministicTotal: baselineArtifacts.coreDeterministicTotal,
      baselineDeterministicPassed: baselineArtifacts.deterministicPassed,
      baselineDeterministicRuntimeTotal: baselineArtifacts.deterministicRuntime.length,
      baselineDeterministicTotal: baselineArtifacts.deterministic.length,
      baselineExecutionV1HelperPassed: baselineArtifacts.executionV1HelperPassed,
      baselineExecutionV1HelperTotal: baselineArtifacts.executionV1HelperTotal,
      baselineExecutionV1HandoffPassed: baselineArtifacts.executionV1HandoffPassed,
      baselineExecutionV1HandoffTotal: baselineArtifacts.executionV1HandoffTotal,
      baselineProductionReadinessGatePassed: baselineArtifacts.productionReadinessGatePassed,
      baselineProductionReadinessGateTotal: baselineArtifacts.productionReadinessGateTotal,
      baselineReferenceAdoptionAggregateScriptCount: baselineArtifacts.referenceAdoptionAggregate.scriptCount,
      baselineReferenceAdoptionPassed: baselineArtifacts.referenceAdoptionPassed,
      baselineReferenceAdoptionTotal: baselineArtifacts.referenceAdoptionTotal,
      baselineReady,
      blockedItems: currentArtifacts.blockedItems,
      checklistOpen: currentArtifacts.requiredChecklistOpen,
      checklistTotal: currentArtifacts.checklist.length,
      coreDeterministicPassed: currentArtifacts.coreDeterministicPassed,
      coreDeterministicTotal: currentArtifacts.coreDeterministicTotal,
      deterministicPassed: currentArtifacts.deterministicPassed,
      deterministicRuntimeTotal: currentArtifacts.deterministicRuntime.length,
      deterministicTotal: currentArtifacts.deterministic.length,
      executionV1HelperPassed: currentArtifacts.executionV1HelperPassed,
      executionV1HelperReady: currentArtifacts.executionV1HelperTotal > 0
        && currentArtifacts.executionV1HelperPassed === currentArtifacts.executionV1HelperTotal,
      executionV1HelperTotal: currentArtifacts.executionV1HelperTotal,
      executionV1HandoffPassed: currentArtifacts.executionV1HandoffPassed,
      executionV1HandoffReady: currentArtifacts.executionV1HandoffTotal > 0
        && currentArtifacts.executionV1HandoffPassed === currentArtifacts.executionV1HandoffTotal,
      executionV1HandoffTotal: currentArtifacts.executionV1HandoffTotal,
      productionReadinessGatePassed: currentArtifacts.productionReadinessGatePassed,
      productionReadinessGateReady: currentArtifacts.productionReadinessGateTotal > 0
        && currentArtifacts.productionReadinessGatePassed === currentArtifacts.productionReadinessGateTotal,
      productionReadinessGateTotal: currentArtifacts.productionReadinessGateTotal,
      optionalBlockedItems: currentArtifacts.optionalBlockedItems,
      optionalChecklistOpen: currentArtifacts.optionalChecklistOpen,
      productionBlockerCount: releaseReadiness.productionBlockerCount,
      productionReadyBlocked: releaseReadiness.productionReadyBlocked,
      productionReadyStatus: releaseReadiness.productionReadyStatus,
      productionReadyStopReason: releaseReadiness.productionReadyStopReason,
      referenceAdoptionAggregateScriptCount: currentArtifacts.referenceAdoptionAggregate.scriptCount,
      referenceAdoptionPassed: currentArtifacts.referenceAdoptionPassed,
      referenceAdoptionReady: currentArtifacts.referenceAdoptionTotal > 0
        && currentArtifacts.referenceAdoptionPassed === currentArtifacts.referenceAdoptionTotal,
      referenceAdoptionTotal: currentArtifacts.referenceAdoptionTotal,
      ready: currentArtifacts.requiredChecklistOpen === 0 && currentArtifacts.blockedItems === 0 && !stale,
      currentOpenBlockerActionCount: releaseReadiness.currentOpenBlockerActionCount,
      currentOpenBlockerCount: releaseReadiness.currentOpenBlockerCount,
      runtimeJobActiveCount: runtimeJobs.activeCount,
      runtimeJobRecentCount: runtimeJobs.recentCount,
      stale,
      staleReasonCount: staleReasons.length,
      handoffReady: Boolean(handoffMarkdown && (handoffMatchesCurrentHead || (!currentCommit && handoffMatchesGeneratedCommit))),
    },
    updatedAt:
      currentArtifacts.closeoutGeneratedAt ||
      currentArtifacts.evidenceGeneratedAt ||
      extractBulletValue(handoffMarkdown, 'generatedAt') ||
      new Date().toISOString(),
    values: currentArtifacts.values,
  };
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
  const preflight = buildExecutionV1RefreshPreflight(args);
  if (!preflight.allowed) {
    const reason = preflight.providerPreflight?.status === 'ready-but-missing-env'
      ? `${preflight.providerPreflight.envKey}가 필요합니다.`
      : preflight.providerPreflight?.status === 'blocked'
        ? 'provider live validation preflight가 통과되지 않았습니다.'
        : 'execution-v1 refresh preflight가 통과되지 않았습니다.';
    throw new Error(reason);
  }
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
  const preflight = buildExecutionV1SnapshotPreflight();
  if (!preflight.allowed) {
    throw new Error(preflight.snapshotEligibility?.reason || '현재 상태에서는 release snapshot을 고정할 수 없습니다.');
  }

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

  const artifactPath = path.resolve(String(artifact.path || ''));
  const safeRoot = path.resolve(rootDir);
  if (!artifactPath.startsWith(`${safeRoot}${path.sep}`) && artifactPath !== safeRoot) {
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
  const filePath = path.resolve(publicDir, relativePath);

  if (!filePath.startsWith(`${publicDir}${path.sep}`) && filePath !== publicDir) {
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
  const pathParts = pathname.split('/').filter(Boolean);
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

  if (request.method === 'GET' && pathname === '/api/meta') {
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
    return;
  }

  if (request.method === 'GET' && pathname === '/api/health') {
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
    return;
  }

  if (request.method === 'GET' && pathname === '/api/converter/diagnostics') {
    sendJson(response, 200, await getDocumentConversionCapabilities());
    return;
  }

  if (request.method === 'GET' && pathname === '/api/runtime/requests') {
    sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      requests: summarizeRuntimeRequests(),
    });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/runtime/jobs') {
    sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      jobs: summarizeRuntimeJobs(),
    });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/workspaces') {
    sendJson(response, 200, {
      workspaces: filterTenantWorkspaces(store.listWorkspaces(), resolveAuthTenantId(auth)),
    });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/workspaces') {
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
    return;
  }

  if (request.method === 'GET' && pathname === '/api/providers') {
    sendJson(response, 200, service.listProviders());
    return;
  }

  if (request.method === 'GET' && pathname === '/api/providers/events') {
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
    return;
  }

  if (request.method === 'GET' && pathname === '/api/execution-v1/status') {
    sendJson(response, 200, buildExecutionV1Status());
    return;
  }

  if (
    request.method === 'GET' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'execution-v1' &&
    pathParts[2] === 'handoff-artifacts' &&
    pathParts[3]
  ) {
    const artifactId = decodePathSegment(pathParts[3]);
    const artifactRecord = resolveExecutionV1ReleaseHandoffArtifact(artifactId);
    if (!artifactRecord) {
      sendNotFound(response);
      return;
    }

    sendBuffer(
      response,
      200,
      fs.readFileSync(artifactRecord.artifactPath),
      getContentType(artifactRecord.artifactPath),
      {
        'content-disposition': `inline; filename="${path.basename(artifactRecord.artifactPath)}"`,
      },
    );
    return;
  }

  if (request.method === 'GET' && pathname === '/api/execution-v1/release-doc') {
    const docRecord = resolveExecutionV1ReleaseEvidenceDoc(url.searchParams.get('path') || '');
    if (!docRecord) {
      sendNotFound(response);
      return;
    }

    sendBuffer(
      response,
      200,
      fs.readFileSync(docRecord.path),
      getContentType(docRecord.path),
      {
        'content-disposition': `inline; filename="${path.basename(docRecord.path)}"`,
      },
    );
    return;
  }

  if (request.method === 'POST' && pathname === '/api/execution-v1/refresh') {
    const body = await readJsonBody(request);
    const args = buildLiveValidationArgs(body);
    const preflight = buildExecutionV1RefreshPreflight(args);
    const isLiveValidationRefresh = Boolean(args.length);
    const isCurrentSurfaceRefresh = !args.length;
    const refreshScope = isLiveValidationRefresh ? 'live-validation' : 'current-surface';
    const provider = preflight.provider || '';
    if (!preflight.allowed) {
      recordReleaseAction({
        action: 'refresh',
        details: {
          args,
          preflight,
        },
        outcome: 'blocked',
        provider,
        scope: refreshScope,
        summary: preflight.summary,
      });
      sendJson(response, 409, {
        error: 'refresh-not-allowed',
        message: preflight.summary,
        preflight,
        status: buildExecutionV1Status(),
      });
      return;
    }
    if (isLiveValidationRefresh && !body.confirmLiveValidation) {
      recordReleaseAction({
        action: 'refresh',
        details: {
          args,
          confirmField: 'confirmLiveValidation',
          preflight,
        },
        outcome: 'confirmation-required',
        provider,
        scope: refreshScope,
        summary: `${provider || 'provider'} live validation 실행은 명시적 확인이 필요합니다.`,
      });
      sendJson(response, 409, {
        error: 'live-validation-confirmation-required',
        message: `${preflight.provider || 'provider'} live validation 실행은 명시적 확인이 필요합니다.`,
        preflight,
        status: buildExecutionV1Status(),
      });
      return;
    }
    if (isCurrentSurfaceRefresh && !body.confirmCurrentSurfaceRewrite) {
      recordReleaseAction({
        action: 'refresh',
        details: {
          args,
          confirmField: 'confirmCurrentSurfaceRewrite',
          preflight,
        },
        outcome: 'confirmation-required',
        provider,
        scope: refreshScope,
        summary: 'current surface evidence/closeout/handoff 재생성은 명시적 확인이 필요합니다.',
      });
      sendJson(response, 409, {
        error: 'refresh-confirmation-required',
        message: 'current surface evidence/closeout/handoff 재생성은 명시적 확인이 필요합니다.',
        preflight,
        status: buildExecutionV1Status(),
      });
      return;
    }
    try {
      const { job, result: payload } = runRuntimeJob({
        details: {
          args,
          preflight,
          provider,
        },
        jobKind: 'execution-v1-refresh',
        requestId: request.id,
        scope: refreshScope,
        summary: isLiveValidationRefresh
          ? `${provider} live validation과 current surface 재생성을 실행합니다.`
          : 'current surface evidence/closeout/handoff 재생성을 실행합니다.',
        task: () => refreshExecutionV1Artifacts(args),
      });
      recordReleaseAction({
        action: 'refresh',
        details: {
          args,
          runtimeJobId: job.id,
          preflight,
        },
        outcome: 'completed',
        provider,
        scope: refreshScope,
        summary: isLiveValidationRefresh
          ? `${provider} live validation과 current surface 재생성을 완료했습니다.`
          : 'current surface evidence/closeout/handoff 재생성을 완료했습니다.',
      });
      sendJson(response, 200, {
        ...payload,
        runtimeJobId: job.id,
      });
    } catch (error) {
      recordReleaseAction({
        action: 'refresh',
        details: {
          args,
          error: error instanceof Error ? error.message : 'unknown error',
          preflight,
        },
        outcome: 'failed',
        provider,
        scope: refreshScope,
        summary: error instanceof Error ? error.message : 'execution-v1 refresh failed',
      });
      throw error;
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/api/execution-v1/refresh/preflight') {
    const body = await readJsonBody(request);
    const args = buildLiveValidationArgs(body);
    const preflight = buildExecutionV1RefreshPreflight(args);
    recordReleaseAction({
      action: 'refresh-preflight',
      details: {
        args,
        preflight,
      },
      outcome: preflight.allowed ? 'allowed' : 'blocked',
      provider: preflight.provider || '',
      scope: preflight.provider ? 'live-validation' : 'current-surface',
      summary: preflight.summary,
    });
    sendJson(response, 200, {
      preflight,
      status: buildExecutionV1Status(),
    });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/execution-v1/preflight') {
    const body = await readJsonBody(request);
    const requestedProvider = String(body.provider || '').trim();
    const preflight = runExecutionV1Preflight(requestedProvider);
    recordReleaseAction({
      action: requestedProvider === 'all' ? 'aggregate-provider-preflight' : 'provider-preflight',
      details: {
        preflight,
      },
      outcome: preflight.status || 'unknown',
      provider: requestedProvider === 'all' ? '' : requestedProvider,
      scope: 'provider-readiness',
      summary: requestedProvider === 'all'
        ? `all provider preflight ${preflight.status || 'unknown'} · missing env ${preflight.missingEnvCount ?? 'unknown'}`
        : `${requestedProvider || 'provider'} preflight ${preflight.status || 'unknown'}`,
    });
    sendJson(response, 200, {
      preflight,
    });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/execution-v1/snapshot') {
    const body = await readJsonBody(request);
    const preflight = buildExecutionV1SnapshotPreflight();
    if (!preflight.allowed) {
      recordReleaseAction({
        action: 'snapshot',
        details: {
          preflight,
        },
        outcome: 'blocked',
        scope: 'snapshot',
        summary: preflight.summary,
      });
      sendJson(response, 409, {
        error: 'snapshot-not-ready',
        message: preflight.summary,
        preflight,
        status: buildExecutionV1Status(),
      });
      return;
    }
    if (!body.confirmSnapshotFreeze) {
      recordReleaseAction({
        action: 'snapshot',
        details: {
          confirmField: 'confirmSnapshotFreeze',
          preflight,
        },
        outcome: 'confirmation-required',
        scope: 'snapshot',
        summary: 'release snapshot 고정은 명시적 확인이 필요합니다.',
      });
      sendJson(response, 409, {
        error: 'snapshot-confirmation-required',
        message: 'release snapshot 고정은 명시적 확인이 필요합니다.',
        preflight,
        status: buildExecutionV1Status(),
      });
      return;
    }
    try {
      const { job, result: payload } = runRuntimeJob({
        details: {
          preflight,
        },
        jobKind: 'execution-v1-snapshot',
        requestId: request.id,
        scope: 'snapshot',
        summary: 'release snapshot 고정을 실행합니다.',
        task: () => archiveExecutionV1Snapshot(),
      });
      recordReleaseAction({
        action: 'snapshot',
        details: {
          archiveResult: payload.archiveResult || null,
          runtimeJobId: job.id,
          preflight,
        },
        outcome: 'completed',
        scope: 'snapshot',
        summary: `release snapshot을 고정했습니다. (${String(payload.archiveResult?.verifiedCommit || '').slice(0, 7) || 'verified'})`,
      });
      sendJson(response, 200, {
        ...payload,
        runtimeJobId: job.id,
      });
    } catch (error) {
      recordReleaseAction({
        action: 'snapshot',
        details: {
          error: error instanceof Error ? error.message : 'unknown error',
          preflight,
        },
        outcome: 'failed',
        scope: 'snapshot',
        summary: error instanceof Error ? error.message : 'snapshot을 생성할 수 없습니다.',
      });
      sendJson(response, 409, {
        error: 'snapshot-not-ready',
        message: error instanceof Error ? error.message : 'snapshot을 생성할 수 없습니다.',
        status: buildExecutionV1Status(),
      });
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/api/execution-v1/snapshot/preflight') {
    const preflight = buildExecutionV1SnapshotPreflight();
    recordReleaseAction({
      action: 'snapshot-preflight',
      details: {
        preflight,
      },
      outcome: preflight.allowed ? 'allowed' : 'blocked',
      scope: 'snapshot',
      summary: preflight.summary,
    });
    sendJson(response, 200, {
      preflight,
      status: buildExecutionV1Status(),
    });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/actions') {
    const workspaceId = String(url.searchParams.get('workspaceId') || '').trim();
    if (workspaceId) {
      const tenant = evaluateWorkspaceTenantAccess(workspaceId, auth);
      if (!tenant.allowed) {
        sendTenantDenied(response, tenant);
        return;
      }
    }
    sendJson(response, 200, service.getActionInbox({
      missionId: String(url.searchParams.get('missionId') || '').trim(),
      workspaceId,
    }));
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'actions' &&
    pathParts[2] === 'provider-attention' &&
    pathParts[3] &&
    pathParts[4] === 'remediate'
  ) {
    const actionId = decodePathSegment(pathParts[3]);
    const body = await readJsonBody(request);
    const result = await service.remediateProviderAttention(actionId, {
      fallbackPolicy: String(body.fallbackPolicy || '').trim(),
      fallbackProvider: String(body.fallbackProvider || '').trim(),
    });
    sendJson(response, 200, result);
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'actions' &&
    pathParts[2] === 'specialist-follow-ups' &&
    pathParts[3] &&
    pathParts[4] === 'remediate'
  ) {
    const actionId = decodePathSegment(pathParts[3]);
    const result = await service.remediateSpecialistFollowUp(actionId);
    sendJson(response, 200, result);
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'actions' &&
    pathParts[2] === 'reviewer-follow-ups' &&
    pathParts[3] &&
    pathParts[4] === 'resolve'
  ) {
    const actionId = decodePathSegment(pathParts[3]);
    const body = await readJsonBody(request);
    const result = service.resolveReviewerFollowUp(actionId, {
      kind: String(body.kind || '').trim(),
      note: String(body.note || '').trim(),
    });
    sendJson(response, 200, result);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/missions') {
    sendJson(response, 200, buildMissionListPayload({ tenantId: resolveAuthTenantId(auth) }));
    return;
  }

  if (request.method === 'POST' && pathname === '/api/missions') {
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
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'attachments'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
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
    return;
  }

  if (request.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'missions' && pathParts[2] && pathParts.length === 3) {
    const missionId = decodePathSegment(pathParts[2]);
    const tenant = evaluateMissionTenantAccess(missionId, auth);
    if (!tenant.allowed) {
      sendTenantDenied(response, tenant);
      return;
    }
    sendJson(response, 200, service.showMission(missionId));
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'execution' &&
    pathParts[4] === 'rollback'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const body = await readJsonBody(request);
    const result = service.rollbackExecution(missionId, {
      dryRun: Boolean(body.dryRun),
      executionId: decodePathSegment(body.executionId || ''),
    });
    sendJson(response, 200, result);
    return;
  }

  if (
    request.method === 'GET' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'session'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const sessionId = String(url.searchParams.get('sessionId') || '').trim();
    sendJson(response, 200, service.showSession(missionId, { sessionId }));
    return;
  }

  if (
    request.method === 'GET' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'harness' &&
    pathParts[4] === 'documents'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
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
    return;
  }

  if (
    request.method === 'GET' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'harness' &&
    pathParts[4] === 'memory'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
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
    return;
  }

  if (
    request.method === 'GET' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'timeline'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    sendJson(response, 200, service.getMissionTimeline(missionId));
    return;
  }

  if (
    request.method === 'PATCH' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'document-log' &&
    pathParts[4]
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const entryId = decodePathSegment(pathParts[4]);
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
    return;
  }

  if (
    request.method === 'DELETE' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'document-log' &&
    pathParts[4]
  ) {
    const entryId = decodePathSegment(pathParts[4]);
    const result = service.deleteDocumentLog(entryId);

    sendJson(response, 200, result);
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'execution' &&
    pathParts[4] === 'preflight'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const body = await readJsonBody(request);
    const result = service.preflightExecution(missionId, {
      requestApproval: Boolean(body.requestApproval),
    });

    sendJson(response, 200, result);
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'execution' &&
    pathParts[4] === 'start'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const result = service.startExecution(missionId);
    sendJson(response, 200, result);
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'execution' &&
    pathParts[4] === 'stop'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const result = service.stopExecution(missionId);
    sendJson(response, 200, result);
    return;
  }

  if (
    request.method === 'GET' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'execution' &&
    !pathParts[4]
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    sendJson(response, 200, service.getExecutionStatus(missionId));
    return;
  }

  if (
    request.method === 'GET' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'execution' &&
    pathParts[4] === 'logs'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const executionId = decodePathSegment(url.searchParams.get('executionId') || '');
    sendJson(response, 200, service.getExecutionLogs(missionId, { executionId }));
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'document-log' &&
    pathParts[4] === 'migrate-legacy'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    service.showMission(missionId);
    const result = service.migrateLegacyDocumentLogs();

    sendJson(response, 200, result);
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'document-log'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
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
    return;
  }

  if (
    request.method === 'PATCH' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'workspaces' &&
    pathParts[2] &&
    pathParts[3] === 'memory' &&
    pathParts[4]
  ) {
    const workspaceId = decodePathSegment(pathParts[2]);
    const memoryId = decodePathSegment(pathParts[4]);
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
    return;
  }

  if (
    request.method === 'DELETE' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'workspaces' &&
    pathParts[2] &&
    pathParts[3] === 'memory' &&
    pathParts[4]
  ) {
    const workspaceId = decodePathSegment(pathParts[2]);
    const memoryId = decodePathSegment(pathParts[4]);
    const entry = service.deleteMemory({
      memoryId,
      scope: 'workspace',
      scopeId: workspaceId,
    });

    sendJson(response, 200, {
      entry,
    });
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'workspaces' &&
    pathParts[2] &&
    pathParts[3] === 'memory'
  ) {
    const workspaceId = decodePathSegment(pathParts[2]);
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
    return;
  }

  if (
    request.method === 'PATCH' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'memory' &&
    pathParts[4]
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const memoryId = decodePathSegment(pathParts[4]);
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
    return;
  }

  if (
    request.method === 'DELETE' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'memory' &&
    pathParts[4]
  ) {
    const missionId = decodePathSegment(pathParts[2]);
    const memoryId = decodePathSegment(pathParts[4]);
    const entry = service.deleteMemory({
      memoryId,
      scope: 'mission',
      scopeId: missionId,
    });

    sendJson(response, 200, {
      entry,
    });
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'memory'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
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
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'missions' &&
    pathParts[2] &&
    pathParts[3] === 'run'
  ) {
    const missionId = decodePathSegment(pathParts[2]);
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
    return;
  }

  if (request.method === 'GET' && pathname === '/api/approvals') {
    sendJson(response, 200, service.getApprovalInbox({}));
    return;
  }

  if (
    request.method === 'POST' &&
    pathParts[0] === 'api' &&
    pathParts[1] === 'approvals' &&
    pathParts[2] &&
    pathParts[3] === 'resolve'
  ) {
    const approvalId = decodePathSegment(pathParts[2]);
    const body = await readJsonBody(request);
    const result = service.resolveApproval(approvalId, {
      decision: String(body.decision || '').trim(),
      reason: String(body.reason || '').trim(),
    });

    sendJson(response, 200, result);
    return;
  }

  if (request.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'artifacts' && pathParts[2]) {
    const artifactId = decodePathSegment(pathParts[2]);
    const { artifact, artifactPath } = resolveArtifactRecord(artifactId);
    const content = fs.readFileSync(artifactPath, 'utf8');

    sendJson(response, 200, {
      artifact,
      content,
      path: artifactPath,
    });
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
