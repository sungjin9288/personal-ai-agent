import assert from 'node:assert/strict';
import test from 'node:test';

import { createMissionHandlerFactory } from '../src/web/mission-handlers.mjs';

function createFixture({
  body = {},
  convertedAttachments = [{ content: 'attachment body', fileName: 'brief.md', mimeType: 'text/markdown' }],
  missionTenant,
  pathname = '/api/missions/mission%2F1/run',
  query = {},
  workspaceTenant,
} = {}) {
  const mission = { id: 'mission/1', title: 'Mission title', workspaceId: 'workspace-1' };
  const state = {
    authTenantCalls: [],
    buildListCalls: [],
    conversionCalls: [],
    decodedSegments: [],
    deniedTenants: [],
    jsonResponses: [],
    missionTenantChecks: [],
    parseConstraintCalls: [],
    readBodyCount: 0,
    serviceCalls: [],
    workspaceTenantChecks: [],
  };
  function record(method, args, result) {
    state.serviceCalls.push({ args, method });
    return result;
  }
  const service = {
    addMemory(input) {
      return record('addMemory', [input], { id: 'memory-created' });
    },
    addMissionAttachment(input) {
      return record('addMissionAttachment', [input], { id: `attachment-${state.serviceCalls.length + 1}`, ...input });
    },
    browseMissionHarnessDocuments(missionId, input) {
      return record('browseMissionHarnessDocuments', [missionId, input], { items: ['document-1'] });
    },
    browseMissionHarnessMemory(missionId, input) {
      return record('browseMissionHarnessMemory', [missionId, input], { items: ['memory-1'] });
    },
    createMission(input) {
      return record('createMission', [input], mission);
    },
    deleteDocumentLog(entryId) {
      return record('deleteDocumentLog', [entryId], { entryId, removed: true });
    },
    deleteMemory(input) {
      return record('deleteMemory', [input], { id: input.memoryId, removed: true });
    },
    getExecutionLogs(missionId, input) {
      return record('getExecutionLogs', [missionId, input], { logs: ['line-1'] });
    },
    getExecutionStatus(missionId) {
      return record('getExecutionStatus', [missionId], { status: 'completed' });
    },
    getMissionTimeline(missionId) {
      return record('getMissionTimeline', [missionId], { events: ['event-1'] });
    },
    logDocument(input) {
      return record('logDocument', [input], { id: 'document-created', ...input });
    },
    migrateLegacyDocumentLogs() {
      return record('migrateLegacyDocumentLogs', [], { migrated: 2 });
    },
    preflightExecution(missionId, input) {
      return record('preflightExecution', [missionId, input], { allowed: true });
    },
    rollbackExecution(missionId, input) {
      return record('rollbackExecution', [missionId, input], { rolledBack: true });
    },
    async runMission(missionId, input) {
      return record('runMission', [missionId, input], { missionId, status: 'completed' });
    },
    showMission(missionId) {
      return record('showMission', [missionId], { mission });
    },
    showSession(missionId, input) {
      return record('showSession', [missionId, input], { session: { id: input.sessionId } });
    },
    startExecution(missionId) {
      return record('startExecution', [missionId], { status: 'running' });
    },
    stopExecution(missionId) {
      return record('stopExecution', [missionId], { status: 'stopped' });
    },
    updateDocumentLog(input) {
      return record('updateDocumentLog', [input], { id: input.entryId, ...input });
    },
    updateMemory(input) {
      return record('updateMemory', [input], { id: input.memoryId, ...input });
    },
  };
  const request = { id: 'request-mission-1' };
  const response = {};
  const auth = { subject: 'operator-1' };
  const buildHandlers = createMissionHandlerFactory({
    buildMissionListPayload(input) {
      state.buildListCalls.push(input);
      return { missions: [mission] };
    },
    async convertMissionAttachmentPayloads(input) {
      state.conversionCalls.push(input);
      return convertedAttachments;
    },
    decodePathSegment(value) {
      state.decodedSegments.push(value);
      return decodeURIComponent(String(value || ''));
    },
    evaluateMissionTenantAccess(missionId, receivedAuth) {
      state.missionTenantChecks.push({ auth: receivedAuth, missionId });
      return missionTenant || { allowed: true, tenantId: 'tenant-1' };
    },
    evaluateWorkspaceTenantAccess(workspaceId, receivedAuth) {
      state.workspaceTenantChecks.push({ auth: receivedAuth, workspaceId });
      return workspaceTenant || { allowed: true, tenantId: 'tenant-1' };
    },
    parseConstraints(input) {
      state.parseConstraintCalls.push(input);
      return ['constraint-1'];
    },
    async readJsonBody(receivedRequest) {
      assert.equal(receivedRequest, request);
      state.readBodyCount += 1;
      return body;
    },
    resolveAuthTenantId(receivedAuth) {
      state.authTenantCalls.push(receivedAuth);
      return 'tenant-auth';
    },
    sendJson(receivedResponse, statusCode, payload) {
      assert.equal(receivedResponse, response);
      state.jsonResponses.push({ payload, statusCode });
    },
    sendTenantDenied(receivedResponse, tenant) {
      assert.equal(receivedResponse, response);
      state.deniedTenants.push(tenant);
    },
    service,
  });
  const url = new URL(`http://localhost${pathname}?${new URLSearchParams(query)}`);

  return {
    auth,
    handlers: buildHandlers({ auth, request, response, url }),
    mission,
    state,
  };
}

test('mission list and create handlers preserve tenant scope, attachment conversion, and 201 response', async () => {
  const body = {
    attachments: [{ fileName: 'brief.docx' }],
    constraints: 'first\nsecond',
    deliverableType: ' report ',
    mode: ' parallel ',
    objective: ' build evidence ',
    title: ' Mission title ',
    workspaceId: ' workspace-1 ',
  };
  const fixture = createFixture({ body });

  await fixture.handlers.listMissions();
  await fixture.handlers.createMission();

  assert.deepEqual(fixture.state.authTenantCalls, [fixture.auth]);
  assert.deepEqual(fixture.state.buildListCalls, [{ tenantId: 'tenant-auth' }]);
  assert.deepEqual(fixture.state.workspaceTenantChecks, [{ auth: fixture.auth, workspaceId: 'workspace-1' }]);
  assert.deepEqual(fixture.state.conversionCalls, [body.attachments]);
  assert.deepEqual(fixture.state.parseConstraintCalls, [body.constraints]);
  assert.deepEqual(fixture.state.serviceCalls, [{
    args: [{
      attachments: [{ content: 'attachment body', fileName: 'brief.md', mimeType: 'text/markdown' }],
      constraints: ['constraint-1'],
      deliverableType: 'report',
      mode: 'parallel',
      objective: 'build evidence',
      title: 'Mission title',
      workspaceId: 'workspace-1',
    }],
    method: 'createMission',
  }]);
  assert.deepEqual(
    fixture.state.jsonResponses.map(({ statusCode }) => statusCode),
    [200, 201],
  );
});

test('mission create and attachment handlers stop at their established tenant boundaries', async () => {
  const workspaceDenied = { allowed: false, error: 'tenant-forbidden', status: 403 };
  const create = createFixture({ body: { workspaceId: 'workspace-2' }, workspaceTenant: workspaceDenied });
  await create.handlers.createMission();

  const missionDenied = { allowed: false, error: 'mission-forbidden', status: 403 };
  const attachments = createFixture({ body: { attachments: [{}] }, missionTenant: missionDenied });
  await attachments.handlers.addAttachments({ missionId: 'mission%2F2' });

  assert.deepEqual(create.state.deniedTenants, [workspaceDenied]);
  assert.equal(create.state.readBodyCount, 1);
  assert.deepEqual(create.state.conversionCalls, []);
  assert.deepEqual(create.state.serviceCalls, []);
  assert.deepEqual(attachments.state.deniedTenants, [missionDenied]);
  assert.equal(attachments.state.readBodyCount, 0);
  assert.deepEqual(attachments.state.conversionCalls, []);
  assert.deepEqual(attachments.state.serviceCalls, []);
});

test('mission attachment and detail handlers preserve decoded ids, source fallback, and tenant checks', async () => {
  const fixture = createFixture({
    body: { attachments: [{ fileName: 'one.md' }, { fileName: 'two.md' }] },
    convertedAttachments: [
      { content: 'one', fileName: 'one.md', mimeType: 'text/markdown', source: 'ui-converted' },
      { content: 'two', conversion: { converted: true }, fileName: 'two.md', mimeType: 'text/markdown' },
    ],
  });

  await fixture.handlers.addAttachments({ missionId: 'mission%2F1' });
  await fixture.handlers.getMission({ missionId: 'mission%2F1' });

  assert.deepEqual(fixture.state.missionTenantChecks, [
    { auth: fixture.auth, missionId: 'mission/1' },
    { auth: fixture.auth, missionId: 'mission/1' },
  ]);
  assert.deepEqual(fixture.state.serviceCalls.map(({ args, method }) => ({ args, method })), [
    {
      args: [{
        content: 'one',
        conversion: undefined,
        fileName: 'one.md',
        mimeType: 'text/markdown',
        missionId: 'mission/1',
        source: 'ui-converted',
      }],
      method: 'addMissionAttachment',
    },
    {
      args: [{
        content: 'two',
        conversion: { converted: true },
        fileName: 'two.md',
        mimeType: 'text/markdown',
        missionId: 'mission/1',
        source: 'ui-upload',
      }],
      method: 'addMissionAttachment',
    },
    { args: ['mission/1'], method: 'showMission' },
  ]);
  assert.deepEqual(fixture.state.jsonResponses.map(({ statusCode }) => statusCode), [201, 200]);
});

test('session, harness, and timeline handlers preserve query payloads', async () => {
  const fixture = createFixture({
    query: {
      kind: ' decision ',
      limit: ' 25 ',
      offset: ' 5 ',
      query: ' evidence ',
      scope: ' mission ',
      sessionId: ' session-1 ',
      sort: ' newest ',
      type: ' report ',
    },
  });
  const params = { missionId: 'mission%2F1' };

  await fixture.handlers.getSession(params);
  await fixture.handlers.browseDocuments(params);
  await fixture.handlers.browseMemory(params);
  await fixture.handlers.getTimeline(params);

  assert.deepEqual(fixture.state.serviceCalls, [
    { args: ['mission/1', { sessionId: 'session-1' }], method: 'showSession' },
    {
      args: ['mission/1', { limit: '25', offset: '5', query: 'evidence', sort: 'newest', type: 'report' }],
      method: 'browseMissionHarnessDocuments',
    },
    {
      args: ['mission/1', { kind: 'decision', limit: '25', offset: '5', query: 'evidence', scope: 'mission', sort: 'newest' }],
      method: 'browseMissionHarnessMemory',
    },
    { args: ['mission/1'], method: 'getMissionTimeline' },
  ]);
  assert.deepEqual(fixture.state.jsonResponses.map(({ statusCode }) => statusCode), [200, 200, 200, 200]);
});

test('execution handlers preserve Boolean coercion, decoded ids, and response payloads', async () => {
  const fixture = createFixture({
    body: { dryRun: 1, executionId: 'execution%2F1', requestApproval: 'yes' },
    query: { executionId: 'execution%2Flogs' },
  });
  const params = { missionId: 'mission%2F1' };

  await fixture.handlers.rollbackExecution(params);
  await fixture.handlers.preflightExecution(params);
  await fixture.handlers.startExecution(params);
  await fixture.handlers.stopExecution(params);
  await fixture.handlers.getExecutionStatus(params);
  await fixture.handlers.getExecutionLogs(params);

  assert.deepEqual(fixture.state.serviceCalls, [
    { args: ['mission/1', { dryRun: true, executionId: 'execution/1' }], method: 'rollbackExecution' },
    { args: ['mission/1', { requestApproval: true }], method: 'preflightExecution' },
    { args: ['mission/1'], method: 'startExecution' },
    { args: ['mission/1'], method: 'stopExecution' },
    { args: ['mission/1'], method: 'getExecutionStatus' },
    { args: ['mission/1', { executionId: 'execution/logs' }], method: 'getExecutionLogs' },
  ]);
  assert.deepEqual(fixture.state.jsonResponses.map(({ statusCode }) => statusCode), [200, 200, 200, 200, 200, 200]);
});

test('document handlers preserve mission title prefixing and legacy migration validation', async () => {
  const fixture = createFixture({
    body: { content: ' document body ', title: ' Report ', type: ' report ' },
  });
  const params = { entryId: 'entry%2F1', missionId: 'mission%2F1' };

  await fixture.handlers.updateDocument(params);
  await fixture.handlers.deleteDocument(params);
  await fixture.handlers.migrateLegacyDocuments(params);
  await fixture.handlers.createDocument(params);

  assert.deepEqual(fixture.state.serviceCalls, [
    { args: ['mission/1'], method: 'showMission' },
    {
      args: [{ content: 'document body', entryId: 'entry/1', title: 'Mission title · Report', type: 'report' }],
      method: 'updateDocumentLog',
    },
    { args: ['entry/1'], method: 'deleteDocumentLog' },
    { args: ['mission/1'], method: 'showMission' },
    { args: [], method: 'migrateLegacyDocumentLogs' },
    { args: ['mission/1'], method: 'showMission' },
    {
      args: [{ content: 'document body', title: 'Mission title · Report', type: 'report' }],
      method: 'logDocument',
    },
  ]);
  assert.deepEqual(fixture.state.jsonResponses.map(({ statusCode }) => statusCode), [200, 200, 200, 201]);
});

test('document creation keeps an existing mission title prefix unchanged', async () => {
  const fixture = createFixture({
    body: { content: 'document body', title: 'Mission title · Report', type: 'report' },
  });

  await fixture.handlers.createDocument({ missionId: 'mission%2F1' });

  assert.deepEqual(fixture.state.serviceCalls, [
    { args: ['mission/1'], method: 'showMission' },
    {
      args: [{ content: 'document body', title: 'Mission title · Report', type: 'report' }],
      method: 'logDocument',
    },
  ]);
});

test('mission memory handlers preserve scope, decoded ids, and create status', async () => {
  const fixture = createFixture({ body: { content: ' memory body ', kind: ' decision ' } });
  const params = { memoryId: 'memory%2F1', missionId: 'mission%2F1' };

  await fixture.handlers.updateMemory(params);
  await fixture.handlers.deleteMemory(params);
  await fixture.handlers.createMemory(params);

  assert.deepEqual(fixture.state.serviceCalls, [
    {
      args: [{ content: 'memory body', kind: 'decision', memoryId: 'memory/1', scope: 'mission', scopeId: 'mission/1' }],
      method: 'updateMemory',
    },
    {
      args: [{ memoryId: 'memory/1', scope: 'mission', scopeId: 'mission/1' }],
      method: 'deleteMemory',
    },
    {
      args: [{ content: 'memory body', kind: 'decision', scope: 'mission', scopeId: 'mission/1' }],
      method: 'addMemory',
    },
  ]);
  assert.deepEqual(fixture.state.jsonResponses.map(({ statusCode }) => statusCode), [200, 200, 201]);
});

test('mission run handler preserves provider selection and web request lineage', async () => {
  const fixture = createFixture({
    body: {
      fallbackPolicy: ' recoverable-provider-failure-only ',
      fallbackProvider: ' local ',
      provider: ' openai ',
    },
    pathname: '/api/missions/mission%2F1/run',
  });

  await fixture.handlers.runMission({ missionId: 'mission%2F1' });

  assert.deepEqual(fixture.state.serviceCalls, [{
    args: [
      'mission/1',
      {
        fallbackPolicy: 'recoverable-provider-failure-only',
        fallbackProvider: 'local',
        provider: 'openai',
        providerSpecified: true,
        sourceContext: {
          channel: 'web',
          requestId: 'request-mission-1',
          route: '/api/missions/mission%2F1/run',
          sourceType: 'web',
        },
      },
    ],
    method: 'runMission',
  }]);
  assert.deepEqual(fixture.state.jsonResponses, [{
    payload: { missionId: 'mission/1', status: 'completed' },
    statusCode: 200,
  }]);

  const automaticProvider = createFixture({ body: { provider: ' ' } });
  await automaticProvider.handlers.runMission({ missionId: 'mission%2F1' });
  assert.equal(automaticProvider.state.serviceCalls[0].args[1].provider, '');
  assert.equal(automaticProvider.state.serviceCalls[0].args[1].providerSpecified, false);
});
