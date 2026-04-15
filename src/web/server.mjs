import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMissionService } from '../core/mission-service.mjs';
import { resolveRootDir } from '../core/root.mjs';
import { createStore } from '../core/store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = resolveRootDir();
const publicDir = path.join(__dirname, 'public');
const evidenceScriptPath = path.join(rootDir, 'scripts', 'build-execution-v1-evidence.mjs');
const closeoutScriptPath = path.join(rootDir, 'scripts', 'build-execution-v1-closeout.mjs');
const snapshotScriptPath = path.join(rootDir, 'scripts', 'archive-execution-v1-snapshot.mjs');
const evidenceDocPath = path.join(rootDir, 'docs', 'execution-v1-evidence.md');
const closeoutDocPath = path.join(rootDir, 'docs', 'execution-v1-closeout.md');
const executionV1SnapshotsRoot = path.join(rootDir, 'docs', 'releases', 'execution-v1');
const liveValidationProviders = [
  {
    command: 'npm run evidence:execution-v1 -- --live-openai',
    envKey: 'OPENAI_API_KEY',
    label: 'OpenAI',
    provider: 'openai',
  },
  {
    command: 'npm run evidence:execution-v1 -- --live-anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    label: 'Anthropic',
    provider: 'anthropic',
  },
  {
    command: 'npm run evidence:execution-v1 -- --live-local',
    envKey: 'LOCAL_PROVIDER_BASE_URL',
    label: 'Local provider',
    provider: 'local',
  },
];
const host = String(process.env.PERSONAL_AI_AGENT_UI_HOST || '127.0.0.1').trim() || '127.0.0.1';
const port = Number(process.env.PERSONAL_AI_AGENT_UI_PORT || 4317);

const store = createStore({ rootDir });
const service = createMissionService({ store, rootDir });

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

function isOptionalCloseoutLabel(label) {
  return /Anthropic live validation|Local provider live validation|local live validation/i.test(String(label || ''));
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
        return {
          archivedAt: manifest.archivedAt || '',
          closeoutPath,
          evidencePath,
          exists: true,
          matchesCurrentHead: Boolean(currentCommit && manifest.verifiedCommit === currentCommit),
          matchesGeneratedCommit: Boolean(preferredCommit && manifest.verifiedCommit === preferredCommit),
          snapshotDir,
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

function buildExecutionV1ArtifactSummary(evidenceMarkdown = '', closeoutMarkdown = '') {
  const checklist = extractChecklistItems(closeoutMarkdown);
  const deterministic = extractDeterministicItems(evidenceMarkdown);
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
    deterministic,
    deterministicPassed: deterministic.filter((item) => item.status === 'passed').length,
    evidenceGeneratedAt: extractBulletValue(evidenceMarkdown, 'generatedAt'),
    gaps,
    liveValidation,
    notes,
    optionalBlockedItems,
    optionalChecklistOpen,
    requiredChecklistOpen,
    values,
  };
}

function buildExecutionV1Status() {
  const evidenceMarkdown = readMarkdownFile(evidenceDocPath);
  const closeoutMarkdown = readMarkdownFile(closeoutDocPath);
  const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  const currentCommit = runGit(['rev-parse', 'HEAD']);
  const currentArtifacts = buildExecutionV1ArtifactSummary(evidenceMarkdown, closeoutMarkdown);
  const providerReadiness = liveValidationProviders.map((item) => ({
    command: item.command,
    envKey: item.envKey,
    label: item.label,
    provider: item.provider,
    ready: Boolean(process.env[item.envKey]),
    status: process.env[item.envKey] ? 'ready' : 'missing-env',
  }));
  const generatedCommit = currentArtifacts.commit;
  const generatedBranch = currentArtifacts.branch;
  const snapshot = readExecutionV1Snapshot(generatedCommit, currentCommit);
  const baselineEvidenceMarkdown = snapshot ? readMarkdownFile(snapshot.evidencePath) : '';
  const baselineCloseoutMarkdown = snapshot ? readMarkdownFile(snapshot.closeoutPath) : '';
  const baselineArtifacts = buildExecutionV1ArtifactSummary(baselineEvidenceMarkdown, baselineCloseoutMarkdown);
  const docStatuses = getTrackedFileStatus([evidenceDocPath, closeoutDocPath]);
  const staleReasons = [];
  const localArtifactNotes = [];

  if (!evidenceMarkdown || !closeoutMarkdown) {
    staleReasons.push('evidence 또는 closeout 문서가 아직 생성되지 않았습니다.');
  }
  if (generatedCommit && currentCommit && generatedCommit !== currentCommit) {
    staleReasons.push('현재 HEAD와 evidence/closeout이 가리키는 commit이 다릅니다.');
  }
  const artifactsMatchCurrentHead = Boolean(generatedCommit && currentCommit && generatedCommit === currentCommit);
  const hasLocalArtifactChanges = docStatuses.length > 0;
  if (hasLocalArtifactChanges) {
    if (artifactsMatchCurrentHead) {
      localArtifactNotes.push('evidence/closeout 문서가 현재 HEAD 기준으로 로컬에서 갱신되었지만 아직 커밋되지는 않았습니다.');
    } else {
      staleReasons.push('evidence 또는 closeout 문서가 워크트리에서 수정된 상태입니다.');
    }
  }

  const stale = staleReasons.length > 0;
  const baselineReady = Boolean(
    snapshot
      && baselineEvidenceMarkdown
      && baselineCloseoutMarkdown
      && baselineArtifacts.requiredChecklistOpen === 0
      && baselineArtifacts.blockedItems === 0,
  );
  const artifactState = !evidenceMarkdown || !closeoutMarkdown
    ? 'missing'
    : stale
      ? 'stale'
      : hasLocalArtifactChanges
      ? 'local-current'
      : 'current';

  return {
    artifactState,
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
    docStatuses,
    evidence: {
      generatedAt: currentArtifacts.evidenceGeneratedAt,
      markdown: evidenceMarkdown,
      path: evidenceDocPath,
    },
    gaps: currentArtifacts.gaps,
    liveValidation: currentArtifacts.liveValidation,
    localArtifactNotes,
    notes: currentArtifacts.notes,
    providerReadiness,
    snapshotEligibility: {
      allowed: Boolean(
        !stale
          && currentArtifacts.requiredChecklistOpen === 0
          && currentArtifacts.blockedItems === 0
          && evidenceMarkdown
          && closeoutMarkdown,
      ),
      reason: !evidenceMarkdown || !closeoutMarkdown
        ? 'evidence 또는 closeout 문서가 아직 없습니다.'
        : stale
          ? 'current evidence/closeout가 최신 HEAD와 어긋나 있습니다.'
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
          deterministicPassed: baselineArtifacts.deterministicPassed,
          deterministicTotal: baselineArtifacts.deterministic.length,
          exists: true,
          generatedAt:
            baselineArtifacts.closeoutGeneratedAt || baselineArtifacts.evidenceGeneratedAt || snapshot.archivedAt,
          optionalBlockedItems: baselineArtifacts.optionalBlockedItems,
          optionalChecklistOpen: baselineArtifacts.optionalChecklistOpen,
          ready: baselineReady,
        }
      : null,
    snapshot,
    stale,
    staleReasons,
    summary: {
      baselineBlockedItems: baselineArtifacts.blockedItems,
      baselineChecklistOpen: baselineArtifacts.requiredChecklistOpen,
      baselineDeterministicPassed: baselineArtifacts.deterministicPassed,
      baselineDeterministicTotal: baselineArtifacts.deterministic.length,
      baselineReady,
      blockedItems: currentArtifacts.blockedItems,
      checklistOpen: currentArtifacts.requiredChecklistOpen,
      checklistTotal: currentArtifacts.checklist.length,
      deterministicPassed: currentArtifacts.deterministicPassed,
      deterministicTotal: currentArtifacts.deterministic.length,
      optionalBlockedItems: currentArtifacts.optionalBlockedItems,
      optionalChecklistOpen: currentArtifacts.optionalChecklistOpen,
      ready: currentArtifacts.requiredChecklistOpen === 0 && currentArtifacts.blockedItems === 0 && !stale,
      stale,
      staleReasonCount: staleReasons.length,
    },
    updatedAt:
      currentArtifacts.closeoutGeneratedAt ||
      currentArtifacts.evidenceGeneratedAt ||
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
  return args;
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

  return buildExecutionV1Status();
}

function archiveExecutionV1Snapshot() {
  const currentStatus = buildExecutionV1Status();
  const canArchive = Boolean(currentStatus.summary?.ready);

  if (!canArchive) {
    const reason = currentStatus.stale
      ? 'current evidence/closeout가 stale 상태라 snapshot을 생성할 수 없습니다.'
      : '필수 closeout checklist 또는 blocked item이 남아 있어 snapshot을 생성할 수 없습니다.';
    throw new Error(reason);
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

function decodePathSegment(segment = '') {
  return decodeURIComponent(String(segment || '').trim());
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

function buildMissionListPayload() {
  const workspaces = new Map(store.listWorkspaces().map((workspace) => [workspace.id, workspace]));
  const missions = service.listMissions().map((mission) => ({
    latestSession: getLatestSessionSummary(mission.id),
    mission,
    workspace: workspaces.get(mission.workspaceId) || null,
  }));

  return {
    generatedAt: new Date().toISOString(),
    missions,
  };
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

  if (request.method === 'GET' && pathname === '/api/meta') {
    sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      host,
      port,
      rootDir,
    });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/workspaces') {
    sendJson(response, 200, {
      workspaces: store.listWorkspaces(),
    });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/providers') {
    sendJson(response, 200, service.listProviders());
    return;
  }

  if (request.method === 'GET' && pathname === '/api/execution-v1/status') {
    sendJson(response, 200, buildExecutionV1Status());
    return;
  }

  if (request.method === 'POST' && pathname === '/api/execution-v1/refresh') {
    const body = await readJsonBody(request);
    sendJson(response, 200, refreshExecutionV1Artifacts(buildLiveValidationArgs(body)));
    return;
  }

  if (request.method === 'POST' && pathname === '/api/execution-v1/snapshot') {
    try {
      sendJson(response, 200, archiveExecutionV1Snapshot());
    } catch (error) {
      sendJson(response, 409, {
        error: 'snapshot-not-ready',
        message: error instanceof Error ? error.message : 'snapshot을 생성할 수 없습니다.',
        status: buildExecutionV1Status(),
      });
    }
    return;
  }

  if (request.method === 'GET' && pathname === '/api/actions') {
    sendJson(response, 200, service.getActionInbox({
      missionId: String(url.searchParams.get('missionId') || '').trim(),
      workspaceId: String(url.searchParams.get('workspaceId') || '').trim(),
    }));
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
    sendJson(response, 200, buildMissionListPayload());
    return;
  }

  if (request.method === 'POST' && pathname === '/api/missions') {
    const body = await readJsonBody(request);
    const mission = service.createMission({
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

  if (request.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'missions' && pathParts[2] && pathParts.length === 3) {
    sendJson(response, 200, service.showMission(decodePathSegment(pathParts[2])));
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
    const result = await service.runMission(missionId, {
      provider,
      providerSpecified: Boolean(provider),
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

  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);

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

server.listen(port, host, () => {
  const consoleUrl = `http://${host}:${port}`;
  console.log(
    JSON.stringify(
      {
        rootDir,
        status: 'listening',
        url: consoleUrl,
      },
      null,
      2,
    ),
  );
});
