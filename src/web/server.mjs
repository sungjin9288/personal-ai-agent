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
