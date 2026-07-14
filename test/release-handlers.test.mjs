import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createExecutionV1ReleaseHandlerFactory } from '../src/web/release-handlers.mjs';

function parseOptionalBoolean(searchParams, name) {
  const value = String(searchParams.get(name) || '').trim().toLowerCase();
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function createFixture({
  artifactRecord = null,
  body = {},
  docRecord = null,
  refreshCommand = {
    ok: true,
    result: { artifactState: 'current' },
    runtimeJobId: 'runtime-refresh-1',
  },
  search = '',
  snapshotCommand = {
    ok: true,
    result: { archiveResult: { verifiedCommit: 'verified-commit' } },
    runtimeJobId: 'runtime-snapshot-1',
  },
} = {}) {
  const state = {
    blockerCalls: [],
    bufferResponses: [],
    decodedSegments: [],
    documentPaths: [],
    handoffArtifactIds: [],
    jsonResponses: [],
    liveValidationBodies: [],
    notFoundCount: 0,
    orchestratorCalls: [],
    readPaths: [],
  };
  const releaseStatus = { artifactState: 'fixture-current' };
  const request = { id: 'request-release-1' };
  const response = { name: 'fixture-response' };
  const url = new URL(`http://localhost/api/execution-v1/status${search}`);
  const releaseCommandOrchestrator = {
    inspectRefresh(input) {
      state.orchestratorCalls.push({ input, method: 'inspectRefresh' });
      return {
        preflight: { action: 'current-surface', allowed: true },
        releaseStatus,
      };
    },
    inspectSnapshot() {
      state.orchestratorCalls.push({ method: 'inspectSnapshot' });
      return {
        preflight: { action: 'snapshot', allowed: true },
        releaseStatus,
      };
    },
    preflightProvider(provider) {
      state.orchestratorCalls.push({ method: 'preflightProvider', provider });
      return { provider, status: 'ready-but-missing-env' };
    },
    refresh(input) {
      state.orchestratorCalls.push({ input, method: 'refresh' });
      return refreshCommand;
    },
    snapshot(input) {
      state.orchestratorCalls.push({ input, method: 'snapshot' });
      return snapshotCommand;
    },
  };

  const createHandlers = createExecutionV1ReleaseHandlerFactory({
    buildBlockerHandoff(input) {
      state.blockerCalls.push(input);
      return { blockerCount: 2, includeShared: input.includeShared };
    },
    buildLiveValidationArgs(input) {
      state.liveValidationBodies.push(input);
      return input.liveOpenAI ? ['--live-openai'] : [];
    },
    buildStatus() {
      return releaseStatus;
    },
    decodePathSegment(segment) {
      state.decodedSegments.push(segment);
      return decodeURIComponent(segment);
    },
    getContentType(filePath) {
      return filePath.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8';
    },
    parseOptionalBooleanQueryParam: parseOptionalBoolean,
    readFile(filePath) {
      state.readPaths.push(filePath);
      return Buffer.from(`content:${filePath}`);
    },
    async readJsonBody(receivedRequest) {
      assert.equal(receivedRequest, request);
      return body;
    },
    releaseArtifactResolver: {
      resolveEvidenceDoc(filePath) {
        state.documentPaths.push(filePath);
        return docRecord;
      },
      resolveHandoffArtifact(artifactId) {
        state.handoffArtifactIds.push(artifactId);
        return artifactRecord;
      },
    },
    releaseCommandOrchestrator,
    rootDir: '/fixture/root',
    sendBuffer(receivedResponse, statusCode, payload, contentType, headers) {
      state.bufferResponses.push({
        contentType,
        headers,
        payload,
        response: receivedResponse,
        statusCode,
      });
    },
    sendJson(receivedResponse, statusCode, payload) {
      state.jsonResponses.push({ payload, response: receivedResponse, statusCode });
    },
    sendNotFound(receivedResponse) {
      assert.equal(receivedResponse, response);
      state.notFoundCount += 1;
    },
  });

  return {
    handlers: createHandlers({ request, response, url }),
    releaseStatus,
    request,
    response,
    state,
  };
}

test('status and blocker handlers preserve read model and query contracts', async () => {
  const { handlers, releaseStatus, response, state } = createFixture({
    search: '?includeShared=true&without-shared=true&category=provider&owner=release-owner&provider=openai',
  });

  await handlers.getStatus();
  await handlers.getBlockers();

  assert.deepEqual(state.jsonResponses, [
    { payload: releaseStatus, response, statusCode: 200 },
    {
      payload: { blockerCount: 2, includeShared: false },
      response,
      statusCode: 200,
    },
  ]);
  assert.deepEqual(state.blockerCalls, [{
    category: 'provider',
    docHrefBase: '/api/execution-v1/release-doc?path=',
    includeShared: false,
    owner: 'release-owner',
    provider: 'openai',
    rootDir: '/fixture/root',
  }]);
});

test('handoff artifact handler decodes the allowlisted id and preserves download metadata', async () => {
  const { handlers, response, state } = createFixture({
    artifactRecord: { artifactPath: '/fixture/release/handoff.json' },
  });

  await handlers.getHandoffArtifact({ artifactId: 'handoff%2Dreport' });

  assert.deepEqual(state.decodedSegments, ['handoff%2Dreport']);
  assert.deepEqual(state.handoffArtifactIds, ['handoff-report']);
  assert.deepEqual(state.readPaths, ['/fixture/release/handoff.json']);
  assert.deepEqual(state.bufferResponses, [{
    contentType: 'application/json; charset=utf-8',
    headers: { 'content-disposition': 'inline; filename="handoff.json"' },
    payload: Buffer.from('content:/fixture/release/handoff.json'),
    response,
    statusCode: 200,
  }]);
});

test('artifact and document handlers keep unresolved paths on the existing 404 path', async () => {
  const { handlers, state } = createFixture({ search: '?path=unknown.md' });

  await handlers.getHandoffArtifact({ artifactId: 'unknown' });
  await handlers.getDocument();

  assert.equal(state.notFoundCount, 2);
  assert.deepEqual(state.handoffArtifactIds, ['unknown']);
  assert.deepEqual(state.documentPaths, ['unknown.md']);
  assert.equal(state.bufferResponses.length, 0);
});

test('document handler returns the resolved file with its established content disposition', async () => {
  const { handlers, response, state } = createFixture({
    docRecord: { path: '/fixture/docs/release-readiness.md' },
    search: '?path=docs%2Frelease-readiness.md',
  });

  await handlers.getDocument();

  assert.deepEqual(state.documentPaths, ['docs/release-readiness.md']);
  assert.deepEqual(state.bufferResponses, [{
    contentType: 'text/markdown; charset=utf-8',
    headers: { 'content-disposition': 'inline; filename="release-readiness.md"' },
    payload: Buffer.from('content:/fixture/docs/release-readiness.md'),
    response,
    statusCode: 200,
  }]);
});

test('refresh handler keeps request linkage and the confirmation-required response', async () => {
  const preflight = { action: 'live-openai', allowed: true };
  const releaseStatus = { artifactState: 'blocked' };
  const { handlers, response, state } = createFixture({
    body: { confirmLiveValidation: false, liveOpenAI: true },
    refreshCommand: {
      error: 'live-validation-confirmation-required',
      message: 'OpenAI live validation 확인이 필요합니다.',
      ok: false,
      preflight,
      releaseStatus,
    },
  });

  await handlers.refresh();

  assert.deepEqual(state.orchestratorCalls, [{
    input: {
      args: ['--live-openai'],
      confirmCurrentSurfaceRewrite: undefined,
      confirmLiveValidation: false,
      requestId: 'request-release-1',
    },
    method: 'refresh',
  }]);
  assert.deepEqual(state.jsonResponses[0], {
    payload: {
      error: 'live-validation-confirmation-required',
      message: 'OpenAI live validation 확인이 필요합니다.',
      preflight,
      status: releaseStatus,
    },
    response,
    statusCode: 409,
  });
});

test('refresh preflight, provider preflight, and completed refresh preserve their response payloads', async () => {
  const { handlers, state } = createFixture({
    body: {
      confirmCurrentSurfaceRewrite: true,
      liveOpenAI: false,
      provider: 'all',
    },
  });

  await handlers.inspectRefresh();
  await handlers.preflightProvider();
  await handlers.refresh();

  assert.deepEqual(
    state.orchestratorCalls.map(({ method }) => method),
    ['inspectRefresh', 'preflightProvider', 'refresh'],
  );
  assert.deepEqual(state.orchestratorCalls[2].input, {
    args: [],
    confirmCurrentSurfaceRewrite: true,
    confirmLiveValidation: undefined,
    requestId: 'request-release-1',
  });
  assert.deepEqual(
    state.jsonResponses.map(({ payload, statusCode }) => ({ payload, statusCode })),
    [
      {
        payload: {
          preflight: { action: 'current-surface', allowed: true },
          status: { artifactState: 'fixture-current' },
        },
        statusCode: 200,
      },
      {
        payload: {
          preflight: { provider: 'all', status: 'ready-but-missing-env' },
        },
        statusCode: 200,
      },
      {
        payload: {
          artifactState: 'current',
          runtimeJobId: 'runtime-refresh-1',
        },
        statusCode: 200,
      },
    ],
  );
});

test('snapshot handlers preserve completed, rejected, and preflight response shapes', async () => {
  const completed = createFixture({ body: { confirmSnapshotFreeze: true } });
  await completed.handlers.snapshot();
  await completed.handlers.inspectSnapshot();

  assert.deepEqual(completed.state.orchestratorCalls, [
    {
      input: {
        confirmSnapshotFreeze: true,
        requestId: 'request-release-1',
      },
      method: 'snapshot',
    },
    { method: 'inspectSnapshot' },
  ]);
  assert.deepEqual(
    completed.state.jsonResponses.map(({ payload, statusCode }) => ({ payload, statusCode })),
    [
      {
        payload: {
          archiveResult: { verifiedCommit: 'verified-commit' },
          runtimeJobId: 'runtime-snapshot-1',
        },
        statusCode: 200,
      },
      {
        payload: {
          preflight: { action: 'snapshot', allowed: true },
          status: { artifactState: 'fixture-current' },
        },
        statusCode: 200,
      },
    ],
  );

  const rejected = createFixture({
    snapshotCommand: {
      error: 'snapshot-not-ready',
      message: 'snapshot artifacts are stale',
      ok: false,
      releaseStatus: { artifactState: 'stale' },
    },
  });
  await rejected.handlers.snapshot();

  assert.deepEqual(
    rejected.state.jsonResponses.map(({ payload, statusCode }) => ({ payload, statusCode })),
    [{
      payload: {
        error: 'snapshot-not-ready',
        message: 'snapshot artifacts are stale',
        status: { artifactState: 'stale' },
      },
      statusCode: 409,
    }],
  );
});
