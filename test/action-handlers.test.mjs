import assert from 'node:assert/strict';
import test from 'node:test';

import { createActionHandlerFactory } from '../src/web/action-handlers.mjs';

function createFixture({ body = {}, query = {}, tenant } = {}) {
  const state = {
    candidateTenantChecks: [],
    decodedSegments: [],
    deniedTenants: [],
    jsonResponses: [],
    serviceCalls: [],
    tenantChecks: [],
  };
  const searchParams = new URLSearchParams(query);
  const request = { id: 'request-action-1' };
  const response = {};
  const service = {
    authorizeLearningPromotionScope(candidateId, input) {
      state.serviceCalls.push({ candidateId, input, method: 'authorizeLearningPromotionScope' });
      return { authorized: true, candidateId };
    },
    clearWorkspaceLearningSelectionOverride(candidateId, input) {
      state.serviceCalls.push({ candidateId, input, method: 'clearWorkspaceLearningSelectionOverride' });
      return {
        learningCandidate: { id: candidateId },
        selectionOverride: {
          candidateId,
          clearNote: input.note,
          clearNoteHash: 'clear-note-hash',
          note: 'original note',
          status: 'cleared',
        },
      };
    },
    expireLearningPromotions(input) {
      state.serviceCalls.push({ input, method: 'expireLearningPromotions' });
      return { expired: true };
    },
    getActionInbox(input) {
      state.serviceCalls.push({ input, method: 'getActionInbox' });
      return { actions: ['action-1'] };
    },
    async remediateProviderAttention(actionId, input) {
      state.serviceCalls.push({ actionId, input, method: 'remediateProviderAttention' });
      return { actionId, remediated: true };
    },
    async remediateSpecialistFollowUp(actionId) {
      state.serviceCalls.push({ actionId, method: 'remediateSpecialistFollowUp' });
      return { actionId, remediated: true };
    },
    remindLearningPromotionStopConditions(input, note) {
      state.serviceCalls.push({ input, method: 'remindLearningPromotionStopConditions', note });
      return { reminded: true };
    },
    resolveLearningPromotion(candidateId, input) {
      state.serviceCalls.push({ candidateId, input, method: 'resolveLearningPromotion' });
      return { candidateId, resolved: true };
    },
    resolveReviewerFollowUp(actionId, input) {
      state.serviceCalls.push({ actionId, input, method: 'resolveReviewerFollowUp' });
      return { actionId, resolved: true };
    },
    rollbackLearningPromotion(candidateId, input) {
      state.serviceCalls.push({ candidateId, input, method: 'rollbackLearningPromotion' });
      return { candidateId, rolledBack: true };
    },
    setWorkspaceLearningSelectionOverride(candidateId, input) {
      state.serviceCalls.push({ candidateId, input, method: 'setWorkspaceLearningSelectionOverride' });
      return {
        learningCandidate: { id: candidateId },
        selectionOverride: {
          candidateId,
          note: input.note,
          noteHash: 'note-hash',
          status: 'active',
        },
      };
    },
  };
  const buildHandlers = createActionHandlerFactory({
    decodePathSegment(value) {
      state.decodedSegments.push(value);
      return decodeURIComponent(String(value || ''));
    },
    evaluateLearningCandidateTenantAccess(candidateId, auth) {
      state.candidateTenantChecks.push({ auth, candidateId });
      return tenant || { allowed: true, tenantId: 'tenant-1' };
    },
    evaluateWorkspaceTenantAccess(workspaceId, auth) {
      state.tenantChecks.push({ auth, workspaceId });
      return tenant || { allowed: true, tenantId: 'tenant-1' };
    },
    parseOptionalBooleanQueryParam(params, name) {
      const value = params.get(name);
      if (value === 'true') {
        return true;
      }
      if (value === 'false') {
        return false;
      }
      return undefined;
    },
    async readJsonBody(receivedRequest) {
      assert.equal(receivedRequest, request);
      return body;
    },
    sendJson(receivedResponse, statusCode, payload) {
      assert.equal(receivedResponse, response);
      state.jsonResponses.push({ payload, statusCode });
    },
    sendTenantDenied(receivedResponse, deniedTenant) {
      assert.equal(receivedResponse, response);
      state.deniedTenants.push(deniedTenant);
    },
    service,
  });
  const auth = { subject: 'operator-1' };
  const handlers = buildHandlers({
    auth,
    request,
    response,
    url: new URL(`http://localhost/api/actions?${searchParams}`),
  });

  return { auth, handlers, state };
}

test('action inbox handler preserves query aliases and optional workspace tenant check', async () => {
  const fixture = createFixture({
    query: {
      actionClass: ' approval ',
      effectiveOwner: ' owner-effective ',
      missionId: ' mission-1 ',
      needsReminder: 'true',
      overdueOnly: 'false',
      owner: ' owner-direct ',
      priority: ' high ',
      providerId: ' openai ',
      'provider-fallback-stop-reason': ' provider-error ',
      promotionStatus: ' pending ',
      workspaceId: ' workspace-1 ',
    },
  });

  await fixture.handlers.getInbox();

  assert.deepEqual(fixture.state.tenantChecks, [{
    auth: fixture.auth,
    workspaceId: 'workspace-1',
  }]);
  assert.deepEqual(fixture.state.serviceCalls, [{
    input: {
      actionClass: 'approval',
      effectiveOwner: 'owner-effective',
      missionId: 'mission-1',
      needsReminderOnly: true,
      overdueOnly: false,
      owner: 'owner-direct',
      priority: 'high',
      providerFallbackStopReason: 'provider-error',
      providerId: 'openai',
      promotionStatus: 'pending',
      workspaceId: 'workspace-1',
    },
    method: 'getActionInbox',
  }]);
  assert.deepEqual(fixture.state.jsonResponses, [{
    payload: { actions: ['action-1'] },
    statusCode: 200,
  }]);
});

test('action inbox handler stops before service access when workspace tenant is denied', async () => {
  const tenant = {
    allowed: false,
    error: 'tenant-forbidden',
    reason: 'tenant mismatch',
    status: 403,
  };
  const fixture = createFixture({ query: { workspaceId: 'workspace-2' }, tenant });

  await fixture.handlers.getInbox();

  assert.deepEqual(fixture.state.deniedTenants, [tenant]);
  assert.deepEqual(fixture.state.serviceCalls, []);
  assert.deepEqual(fixture.state.jsonResponses, []);
});

test('expire handler trims the existing learning promotion filter payload', async () => {
  const fixture = createFixture({
    body: {
      before: ' 2026-07-14T00:00:00Z ',
      missionId: ' mission-2 ',
      note: ' expire stale ',
      recordType: ' lesson ',
      scope: ' workspace ',
      target: ' routing ',
      workspaceId: ' workspace-2 ',
    },
  });

  await fixture.handlers.expireLearningPromotions();

  assert.deepEqual(fixture.state.serviceCalls, [{
    input: {
      before: '2026-07-14T00:00:00Z',
      missionId: 'mission-2',
      note: 'expire stale',
      recordType: 'lesson',
      scope: 'workspace',
      target: 'routing',
      workspaceId: 'workspace-2',
    },
    method: 'expireLearningPromotions',
  }]);
  assert.deepEqual(fixture.state.jsonResponses, [{ payload: { expired: true }, statusCode: 200 }]);
});

test('learning promotion handlers preserve path decoding and mutation payloads', async () => {
  const authorize = createFixture({
    body: {
      note: ' reuse reviewed decision ',
      scope: ' workspace ',
    },
  });
  await authorize.handlers.authorizeLearningPromotionScope({ candidateId: 'candidate%2F2' });

  const remind = createFixture({
    body: {
      dueOnly: false,
      missionId: ' mission-3 ',
      note: ' remind owner ',
      overdueOnly: 1,
      workspaceId: ' workspace-3 ',
    },
  });
  await remind.handlers.remindLearningPromotion({ candidateId: 'candidate%2F3' });

  const resolve = createFixture({
    body: {
      decision: ' promote ',
      note: ' verified ',
      scope: ' mission ',
      target: ' provider ',
    },
  });
  await resolve.handlers.resolveLearningPromotion({ candidateId: 'candidate%2F4' });

  const rollback = createFixture({ body: { note: ' rollback reason ' } });
  await rollback.handlers.rollbackLearningPromotion({ candidateId: 'candidate%2F5' });

  assert.deepEqual(authorize.state.serviceCalls, [{
    candidateId: 'candidate/2',
    input: {
      note: 'reuse reviewed decision',
      scope: 'workspace',
    },
    method: 'authorizeLearningPromotionScope',
  }]);
  assert.deepEqual(remind.state.serviceCalls, [{
    input: {
      dueOnly: false,
      learningCandidateId: 'candidate/3',
      missionId: 'mission-3',
      overdueOnly: true,
      workspaceId: 'workspace-3',
    },
    method: 'remindLearningPromotionStopConditions',
    note: 'remind owner',
  }]);
  assert.deepEqual(resolve.state.serviceCalls, [{
    candidateId: 'candidate/4',
    input: {
      decision: 'promote',
      note: 'verified',
      scope: 'mission',
      target: 'provider',
    },
    method: 'resolveLearningPromotion',
  }]);
  assert.deepEqual(rollback.state.serviceCalls, [{
    candidateId: 'candidate/5',
    input: { note: 'rollback reason' },
    method: 'rollbackLearningPromotion',
  }]);
  assert.deepEqual(
    [authorize, remind, resolve, rollback].map(({ state }) => state.jsonResponses[0].statusCode),
    [200, 200, 200, 200],
  );
});

test('workspace learning override handlers validate candidate tenant before trimmed mutations', async () => {
  const setOverride = createFixture({
    body: {
      expiresAt: ' 2026-07-18T00:00:00.000Z ',
      note: ' pin reviewed decision ',
    },
  });
  await setOverride.handlers.setWorkspaceLearningSelectionOverride({ candidateId: 'candidate%2F6' });

  const clearOverride = createFixture({ body: { note: ' return to latest revision ' } });
  await clearOverride.handlers.clearWorkspaceLearningSelectionOverride({ candidateId: 'candidate%2F7' });

  assert.deepEqual(setOverride.state.candidateTenantChecks, [{
    auth: setOverride.auth,
    candidateId: 'candidate/6',
  }]);
  assert.deepEqual(clearOverride.state.candidateTenantChecks, [{
    auth: clearOverride.auth,
    candidateId: 'candidate/7',
  }]);
  assert.deepEqual(setOverride.state.serviceCalls, [{
    candidateId: 'candidate/6',
    input: {
      expiresAt: '2026-07-18T00:00:00.000Z',
      note: 'pin reviewed decision',
    },
    method: 'setWorkspaceLearningSelectionOverride',
  }]);
  assert.deepEqual(clearOverride.state.serviceCalls, [{
    candidateId: 'candidate/7',
    input: { note: 'return to latest revision' },
    method: 'clearWorkspaceLearningSelectionOverride',
  }]);
  assert.deepEqual(setOverride.state.jsonResponses, [{
    payload: {
      learningCandidateId: 'candidate/6',
      selectionOverride: {
        candidateId: 'candidate/6',
        noteHash: 'note-hash',
        status: 'active',
      },
    },
    statusCode: 200,
  }]);
  assert.deepEqual(clearOverride.state.jsonResponses, [{
    payload: {
      learningCandidateId: 'candidate/7',
      selectionOverride: {
        candidateId: 'candidate/7',
        clearNoteHash: 'clear-note-hash',
        status: 'cleared',
      },
    },
    statusCode: 200,
  }]);
});

test('workspace learning override handlers stop before mutation when candidate tenant is denied', async () => {
  const tenant = {
    allowed: false,
    error: 'tenant-forbidden',
    reason: 'tenant mismatch',
    status: 403,
  };
  const fixture = createFixture({
    body: {
      expiresAt: '2026-07-18T00:00:00.000Z',
      note: 'must not be read or stored',
    },
    tenant,
  });

  await fixture.handlers.setWorkspaceLearningSelectionOverride({ candidateId: 'candidate%2F8' });

  assert.deepEqual(fixture.state.candidateTenantChecks, [{
    auth: fixture.auth,
    candidateId: 'candidate/8',
  }]);
  assert.deepEqual(fixture.state.serviceCalls, []);
  assert.deepEqual(fixture.state.jsonResponses, []);
  assert.deepEqual(fixture.state.deniedTenants, [tenant]);
});

test('follow-up remediation handlers preserve decoded ids and service arguments', async () => {
  const provider = createFixture({
    body: {
      fallbackPolicy: ' recoverable-provider-failure-only ',
      fallbackProvider: ' local ',
    },
  });
  await provider.handlers.remediateProviderAttention({ actionId: 'provider%2Faction' });

  const specialist = createFixture();
  await specialist.handlers.remediateSpecialistFollowUp({ actionId: 'specialist%2Faction' });

  const reviewer = createFixture({ body: { kind: ' accepted-risk ', note: ' owner approved ' } });
  await reviewer.handlers.resolveReviewerFollowUp({ actionId: 'reviewer%2Faction' });

  assert.deepEqual(provider.state.serviceCalls, [{
    actionId: 'provider/action',
    input: {
      fallbackPolicy: 'recoverable-provider-failure-only',
      fallbackProvider: 'local',
    },
    method: 'remediateProviderAttention',
  }]);
  assert.deepEqual(specialist.state.serviceCalls, [{
    actionId: 'specialist/action',
    method: 'remediateSpecialistFollowUp',
  }]);
  assert.deepEqual(reviewer.state.serviceCalls, [{
    actionId: 'reviewer/action',
    input: {
      kind: 'accepted-risk',
      note: 'owner approved',
    },
    method: 'resolveReviewerFollowUp',
  }]);
  assert.deepEqual(
    [provider, specialist, reviewer].map(({ state }) => state.jsonResponses[0].statusCode),
    [200, 200, 200],
  );
});
