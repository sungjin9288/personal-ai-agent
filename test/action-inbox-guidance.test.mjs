import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canRunActionInboxRerun,
  canRunProviderAttentionRemediation,
  createActionInboxGuidance,
  renderActionInboxGuidance,
  summarizeActionInboxGuidance,
} from '../src/web/public/lib/action-inbox-guidance.js';
import {
  renderActionInboxItem,
  renderActionInboxItemActions,
} from '../src/web/public/lib/render-fragments.js';

test('action inbox guidance keeps approval and owner handoff in the external lane', () => {
  const approval = createActionInboxGuidance({
    actionClass: 'awaiting-human-decision',
    actionId: 'approval-1',
    actionType: 'approval',
    approvalId: 'approval-1',
    recommendedCommand: 'node src/cli.mjs approval resolve approval-1',
    recommendedOwner: 'human-approver',
  });
  const handoff = createActionInboxGuidance({
    actionClass: 'handoff-required',
    actionId: 'owner-handoff:escalation-1',
    actionType: 'owner-handoff',
    effectiveRecommendedOwner: 'workspace-owner',
    escalationId: 'escalation-1',
  });

  assert.equal(approval.lane, 'external-handoff');
  assert.equal(approval.owner, 'human-approver');
  assert.match(approval.closureEvidence, /approval approval-1 resolution record/);
  assert.equal(handoff.lane, 'external-handoff');
  assert.match(handoff.closureEvidence, /owner handoff acknowledgement/);
});

test('action inbox guidance exposes allowed remediation and blocks permission handoff from direct execution', () => {
  const allowed = {
    actionClass: 'provider-attention-required',
    actionId: 'provider-attention-1',
    actionType: 'provider-attention',
    permissionDecision: {
      decision: 'allow',
      id: 'permission-1',
      policyId: 'provider-remediation/v1',
    },
    recommendedCommand: 'node src/cli.mjs action remediate-provider-attention provider-attention-1',
    recommendedOwner: 'workspace-owner',
  };
  const approvalRequired = {
    ...allowed,
    permissionDecision: {
      approvalRequired: true,
      decision: 'approval-required',
      id: 'permission-2',
    },
  };

  assert.equal(createActionInboxGuidance(allowed).lane, 'operator-remediation');
  assert.equal(canRunProviderAttentionRemediation(allowed), true);
  assert.equal(createActionInboxGuidance(approvalRequired).lane, 'external-handoff');
  assert.equal(canRunProviderAttentionRemediation(approvalRequired), false);
  assert.equal(createActionInboxGuidance({ ...allowed, permissionDecision: null }).lane, 'operator-review');
});

test('action inbox guidance keeps inspection-only work in the review lane', () => {
  const guidance = createActionInboxGuidance({
    actionClass: 'provider-health-drift-required',
    actionId: 'provider-health-drift-1',
    actionType: 'provider-health-drift',
    missionId: 'mission-1',
    recommendedCommand: 'node src/cli.mjs mission timeline mission-1',
    recommendedOwner: 'mission-owner',
  });

  assert.equal(guidance.lane, 'operator-review');
  assert.match(guidance.closureEvidence, /mission mission-1 provider timeline review/);
});

test('action inbox guidance summary counts each execution lane', () => {
  const summary = summarizeActionInboxGuidance([
    { actionClass: 'awaiting-human-decision', actionType: 'approval' },
    {
      actionClass: 'provider-attention-required',
      actionType: 'provider-attention',
      permissionDecision: { decision: 'allow' },
    },
    { actionClass: 'provider-health-drift-required', actionType: 'provider-health-drift' },
  ]);

  assert.deepEqual(summary, {
    externalHandoff: 1,
    operatorRemediation: 1,
    operatorReview: 1,
    total: 3,
  });
});

test('action inbox guidance renderer escapes record content and keeps the evidence visible', () => {
  const html = renderActionInboxGuidance({
    actionClass: 'retry-ready',
    actionId: 'reviewer-follow-up:<unsafe>',
    actionType: 'reviewer-follow-up',
    commandHint: 'node <unsafe>',
    recommendedOwner: 'mission-owner',
  });

  assert.match(html, /data-action-inbox-guidance="operator-remediation"/);
  assert.match(html, /즉시 실행 가능/);
  assert.match(html, /node &lt;unsafe&gt;/);
  assert.doesNotMatch(html, /node <unsafe>/);
  assert.match(html, /종료 증적/);
});

test('generic rerun is limited to reviewer retry items', () => {
  const reviewer = {
    actionClass: 'retry-ready',
    actionId: 'reviewer-follow-up-1',
    actionType: 'reviewer-follow-up',
    missionId: 'mission-1',
  };
  const approval = {
    actionClass: 'awaiting-human-decision',
    actionId: 'approval-1',
    actionType: 'approval',
    missionId: 'mission-1',
  };
  const handoff = {
    actionClass: 'handoff-required',
    actionId: 'owner-handoff-1',
    actionType: 'owner-handoff',
    missionId: 'mission-1',
  };

  assert.equal(canRunActionInboxRerun(reviewer), true);
  assert.equal(canRunActionInboxRerun(approval), false);
  assert.equal(canRunActionInboxRerun(handoff), false);
  assert.match(renderActionInboxItemActions(reviewer), /data-action-rerun=/);
  assert.doesNotMatch(renderActionInboxItemActions(approval), /data-action-rerun=/);
  assert.doesNotMatch(renderActionInboxItemActions(handoff), /data-action-rerun=/);
});

test('provider remediation buttons follow the recorded permission decision', () => {
  const baseItem = {
    actionClass: 'provider-attention-required',
    actionId: 'provider-attention-1',
    actionType: 'provider-attention',
    missionId: 'mission-1',
  };
  const allowedHtml = renderActionInboxItemActions({
    ...baseItem,
    permissionDecision: { decision: 'allow' },
  });
  const deniedHtml = renderActionInboxItem({
    ...baseItem,
    permissionDecision: { decision: 'deny', id: 'permission-denied-1' },
  });

  assert.match(allowedHtml, /data-provider-attention-remediate=/);
  assert.doesNotMatch(deniedHtml, /data-provider-attention-remediate=/);
  assert.match(deniedHtml, /외부 승인·인계 필요/);
  assert.match(deniedHtml, /permission deny/);
});
