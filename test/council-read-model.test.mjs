import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCouncilReadModel,
  EMPTY_VALUE,
} from '../src/web/public/lib/council-read-model.js';
import { renderCouncilBoard } from '../src/web/public/lib/council-board.js';

const SESSION_ID = 'session-current';
const COUNCIL_ID = 'council-current';
const SEAT_IDS = ['research', 'implementation', 'verification'];

function artifact(id, kind, overrides = {}) {
  return {
    createdAt: '2026-07-27T00:00:00.000Z',
    fileName: `${id}.md`,
    id,
    kind,
    sessionId: SESSION_ID,
    title: id,
    ...overrides,
  };
}

function statementRun(seatId, phase, startedAt) {
  const round = phase === 'opening-position' ? 'opening' : 'rebuttal';
  return {
    artifactIds: [`${round}-${seatId}`],
    councilFrame: {
      councilId: COUNCIL_ID,
      evidenceCatalog: [
        {
          councilId: COUNCIL_ID,
          id: 'artifact:evidence-manager',
          kind: 'artifact',
          sessionId: SESSION_ID,
        },
      ],
    },
    councilId: COUNCIL_ID,
    councilPhase: phase,
    councilSeatId: seatId,
    councilStatement: {
      claims: [
        {
          evidenceRefs: ['artifact:evidence-manager'],
          id: `${seatId}-${round}`,
          position: phase === 'opening-position' ? 'support' : 'challenge',
          severity: 'medium',
          summary: `${seatId} ${round} claim`,
        },
      ],
      nextAction: `${seatId} ${round} next`,
    },
    endedAt: startedAt,
    id: `run-${round}-${seatId}`,
    role: 'specialist',
    sessionId: SESSION_ID,
    startedAt,
    status: 'merged',
  };
}

function buildCompletedPayload() {
  const openingRuns = SEAT_IDS.map((seatId, index) =>
    statementRun(seatId, 'opening-position', `2026-07-27T00:0${index + 1}:00.000Z`),
  );
  const rebuttalRuns = SEAT_IDS.map((seatId, index) =>
    statementRun(seatId, 'rebuttal', `2026-07-27T00:1${index + 1}:00.000Z`),
  );
  const synthesisRun = {
    artifactIds: ['synthesis', 'manifest'],
    councilId: COUNCIL_ID,
    councilPhase: 'synthesis',
    councilSeatId: 'chair',
    councilSynthesis: {
      agreementIds: ['research-opening'],
      evidenceRefs: ['artifact:evidence-manager'],
      nextAction: 'Share the verified council record.',
      rejectedClaims: [
        {
          claimId: 'implementation-rebuttal',
          reason: 'The evidence does not support this option.',
        },
      ],
      unresolvedConflictIds: ['verification-rebuttal'],
    },
    councilValidation: {
      code: 'ok',
      ok: true,
      status: 'passed',
    },
    endedAt: '2026-07-27T00:20:00.000Z',
    id: 'run-synthesis',
    nextAction: 'Do not use this fallback.',
    role: 'executor',
    sessionId: SESSION_ID,
    startedAt: '2026-07-27T00:19:00.000Z',
    status: 'completed',
  };
  const reviewerRun = {
    artifactIds: ['reviewer'],
    endedAt: '2026-07-27T00:22:00.000Z',
    id: 'run-reviewer',
    outputSummary: 'Reviewer accepted the evidence-bound synthesis.',
    role: 'reviewer',
    sessionId: SESSION_ID,
    startedAt: '2026-07-27T00:21:00.000Z',
    status: 'completed',
  };

  const agentRuns = [...openingRuns, ...rebuttalRuns, synthesisRun, reviewerRun];

  return {
    agentRuns,
    approvals: [],
    artifacts: [
      artifact('evidence-manager', 'agent-output'),
      ...SEAT_IDS.flatMap((seatId) => [
        artifact(`opening-${seatId}`, 'deliverable'),
        artifact(`rebuttal-${seatId}`, 'deliverable'),
      ]),
      artifact('synthesis', 'deliverable'),
      artifact('manifest', 'council-manifest', {
        metadata: { councilId: COUNCIL_ID },
      }),
      artifact('reviewer', 'agent-output'),
    ],
    session: {
      agentRunIds: agentRuns.map((run) => run.id),
      approvalIds: [],
      id: SESSION_ID,
      status: 'completed',
    },
  };
}

test('buildCouncilReadModel keeps seat rounds, decisions, reviewer, and evidence in one completed council', () => {
  const model = buildCouncilReadModel({ sessionPayload: buildCompletedPayload() });

  assert.equal(model.state, 'completed');
  assert.equal(model.councilId, COUNCIL_ID);
  assert.equal(model.seats.length, 3);
  assert.equal(model.seats[0].opening.claims[0].summary, 'research opening claim');
  assert.equal(model.seats[0].rebuttal.claims[0].summary, 'research rebuttal claim');
  assert.equal(model.agreement[0].summary, 'research opening claim');
  assert.equal(model.rejectedOptions[0].summary, 'implementation rebuttal claim');
  assert.equal(model.unresolvedConflicts[0].summary, 'verification rebuttal claim');
  assert.equal(model.reviewer.result, 'pass');
  assert.equal(model.humanApproval.status, EMPTY_VALUE);
  assert.equal(model.nextAction, 'Share the verified council record.');
  assert.equal(model.agreement[0].evidence[0].artifact.id, 'evidence-manager');
});

test('buildCouncilReadModel does not mix a newer council or artifact from another session', () => {
  const payload = buildCompletedPayload();
  payload.agentRuns.push({
    ...statementRun('research', 'opening-position', '2026-07-27T00:30:00.000Z'),
    artifactIds: ['foreign-artifact'],
    councilId: 'council-newer',
    councilFrame: {
      councilId: 'council-newer',
      evidenceCatalog: [],
    },
    councilStatement: {
      claims: [],
      nextAction: '',
    },
    id: 'run-newer-opening',
  });
  payload.artifacts.push(
    artifact('foreign-artifact', 'deliverable', {
      sessionId: 'session-foreign',
    }),
  );

  const model = buildCouncilReadModel({ sessionPayload: payload });

  assert.equal(model.councilId, 'council-newer');
  assert.equal(model.state, 'blocked');
  assert.equal(model.seats[0].opening.artifact, null);
  assert.equal(model.reviewer.result, EMPTY_VALUE);
  assert.equal(model.nextAction, EMPTY_VALUE);
});

test('buildCouncilReadModel ignores an approval recorded before the selected council reviewer', () => {
  const payload = buildCompletedPayload();
  payload.approvals.push({
    createdAt: '2026-07-27T00:18:00.000Z',
    id: 'approval-before-reviewer',
    kind: 'workspace_execution',
    reason: 'This approval belongs to an earlier stage.',
    requestedByRole: 'reviewer',
    sessionId: SESSION_ID,
    status: 'pending',
    title: 'Earlier approval',
  });
  payload.session.approvalIds.push('approval-before-reviewer');

  const model = buildCouncilReadModel({ sessionPayload: payload });

  assert.equal(model.state, 'completed');
  assert.equal(model.humanApproval.status, EMPTY_VALUE);
  assert.equal(model.nextAction, 'Share the verified council record.');
});

test('buildCouncilReadModel exposes blocked, reviewer-failed, and approval-pending without inventing actions', async (t) => {
  await t.test('blocked manifest validation wins before reviewer state', () => {
    const payload = buildCompletedPayload();
    const synthesisRun = payload.agentRuns.find((run) => run.id === 'run-synthesis');
    synthesisRun.councilValidation = {
      code: 'critical-conflict',
      ok: false,
      status: 'blocked',
    };
    synthesisRun.councilSynthesis.nextAction = '';
    synthesisRun.nextAction = '';
    synthesisRun.outputSummary = '';

    const model = buildCouncilReadModel({ sessionPayload: payload });

    assert.equal(model.state, 'blocked');
    assert.equal(model.nextAction, EMPTY_VALUE);
  });

  await t.test('reviewer failure uses only the persisted reviewer action or summary', () => {
    const payload = buildCompletedPayload();
    const reviewerRun = payload.agentRuns.find((run) => run.id === 'run-reviewer');
    reviewerRun.status = 'failed';
    reviewerRun.nextAction = 'Correct the reviewer findings.';

    const model = buildCouncilReadModel({ sessionPayload: payload });

    assert.equal(model.state, 'reviewer-failed');
    assert.equal(model.nextAction, 'Correct the reviewer findings.');
  });

  await t.test('pending human approval uses the persisted approval title', () => {
    const payload = buildCompletedPayload();
    payload.approvals.push({
      createdAt: '2026-07-27T00:23:00.000Z',
      id: 'approval-1',
      kind: 'workspace_execution',
      reason: 'Workspace mutation requires owner review.',
      sessionId: SESSION_ID,
      status: 'pending',
      title: 'Review the proposed workspace mutation.',
      requestedByRole: 'reviewer',
    });
    payload.session.approvalIds.push('approval-1');

    const model = buildCouncilReadModel({ sessionPayload: payload });

    assert.equal(model.state, 'approval-pending');
    assert.equal(model.humanApproval.status, 'pending');
    assert.equal(model.nextAction, 'Review the proposed workspace mutation.');
  });
});

test('buildCouncilReadModel has explicit loading and empty states', () => {
  const loading = buildCouncilReadModel({ loading: true });
  const empty = buildCouncilReadModel({
    sessionPayload: {
      agentRuns: [],
      approvals: [],
      artifacts: [],
      session: { id: SESSION_ID },
    },
  });

  assert.equal(loading.state, 'loading');
  assert.equal(loading.nextAction, EMPTY_VALUE);
  assert.equal(empty.state, 'empty');
  assert.equal(empty.nextAction, EMPTY_VALUE);
});

test('renderCouncilBoard stays read-only and provides keyboard and artifact navigation', () => {
  const markup = renderCouncilBoard(
    buildCouncilReadModel({ sessionPayload: buildCompletedPayload() }),
  );

  assert.equal((markup.match(/data-council-focus-key=/g) || []).length, 3);
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /data-retrieval-artifact-open="manifest"/);
  assert.doesNotMatch(markup, /data-approval-(approve|reject)/);
  assert.doesNotMatch(markup, /data-ui-action=/);
  assert.doesNotMatch(markup, /council-round-next/);
  assert.doesNotMatch(markup, /research opening next|research rebuttal next/);
  assert.equal((markup.match(/<aside class="council-next-action"/g) || []).length, 1);
});

test('buildCouncilReadModel uses session lineage instead of later unrelated reviewer and approval records', () => {
  const payload = buildCompletedPayload();
  payload.agentRuns.push({
    artifactIds: [],
    endedAt: '2026-07-27T00:40:00.000Z',
    id: 'run-unrelated-reviewer',
    outputSummary: 'Unrelated reviewer result.',
    role: 'reviewer',
    sessionId: SESSION_ID,
    startedAt: '2026-07-27T00:39:00.000Z',
    status: 'failed',
  });
  payload.session.agentRunIds.push('run-unrelated-reviewer');
  payload.approvals.push({
    createdAt: '2026-07-27T00:41:00.000Z',
    id: 'approval-execution-lease',
    kind: 'execution_lease',
    reason: 'Unrelated execution lease.',
    requestedByRole: 'operator-console',
    sessionId: SESSION_ID,
    status: 'pending',
    title: 'Approve unrelated execution.',
  });
  payload.session.approvalIds.push('approval-execution-lease');

  const model = buildCouncilReadModel({ sessionPayload: payload });

  assert.equal(model.state, 'completed');
  assert.equal(model.reviewer.runId, 'run-reviewer');
  assert.equal(model.reviewer.result, 'pass');
  assert.equal(model.humanApproval.status, EMPTY_VALUE);
  assert.equal(model.nextAction, 'Share the verified council record.');
});

test('buildCouncilReadModel fails closed for ambiguous council approvals or a missing pending approval record', async (t) => {
  await t.test('two reviewer approval records are ambiguous', () => {
    const payload = buildCompletedPayload();
    for (const id of ['approval-a', 'approval-b']) {
      payload.approvals.push({
        createdAt: '2026-07-27T00:23:00.000Z',
        id,
        kind: 'workspace_execution',
        reason: `${id} reason`,
        requestedByRole: 'reviewer',
        sessionId: SESSION_ID,
        status: 'pending',
        title: `${id} title`,
      });
      payload.session.approvalIds.push(id);
    }

    const model = buildCouncilReadModel({ sessionPayload: payload });

    assert.equal(model.state, 'blocked');
    assert.equal(model.humanApproval.status, EMPTY_VALUE);
  });

  await t.test('awaiting approval without its record cannot appear completed', () => {
    const payload = buildCompletedPayload();
    payload.session.status = 'awaiting_approval';

    const model = buildCouncilReadModel({ sessionPayload: payload });

    assert.equal(model.state, 'blocked');
    assert.equal(model.humanApproval.status, EMPTY_VALUE);
  });
});
