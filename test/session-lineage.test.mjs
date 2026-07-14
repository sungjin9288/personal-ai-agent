import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createSessionLineage,
  renderSessionLineage,
} from '../src/web/public/lib/session-lineage.js';

function buildPayload() {
  return {
    mission: { id: 'mission-1', title: 'Trace one execution' },
    session: {
      endedAt: '2026-07-14T01:05:00.000Z',
      id: 'session-1',
      missionId: 'mission-1',
      provider: 'openai',
      sourceContext: {
        providerFallbackAttempt: 2,
        providerFallbackAttemptCount: 2,
        providerFallbackPolicy: 'recoverable-provider-failure-only',
        providerFallbackPrimary: 'anthropic',
        providerFallbackRequested: true,
      },
      startedAt: '2026-07-14T01:00:00.000Z',
    },
    agentRuns: [
      {
        artifactIds: ['artifact-1'],
        attemptCount: 2,
        attemptHistory: [
          { attempt: 1, durationMs: 120, failureKind: 'http-status', httpStatus: 503, ok: false },
          { attempt: 2, durationMs: 80, httpStatus: 200, ok: true },
        ],
        endedAt: '2026-07-14T01:02:00.000Z',
        id: 'run-1',
        missionId: 'mission-1',
        parentRunId: 'run-0',
        providerId: 'openai',
        providerResponseId: 'response-1',
        resumeFromRunId: 'run-0',
        retryCount: 1,
        role: 'executor',
        sessionId: 'session-1',
        startedAt: '2026-07-14T01:01:00.000Z',
        status: 'completed',
      },
    ],
    artifacts: [
      { createdAt: '2026-07-14T01:02:00.000Z', id: 'artifact-1', title: 'Implementation' },
      { createdAt: '2026-07-14T01:04:00.000Z', id: 'artifact-unlinked', title: 'Approval resolution' },
    ],
  };
}

test('session lineage follows only recorded mission, response, retry, run, and artifact links', () => {
  const lineage = createSessionLineage(buildPayload());

  assert.equal(lineage.mission.id, 'mission-1');
  assert.equal(lineage.session.id, 'session-1');
  assert.equal(lineage.fallback.attempt, 2);
  assert.equal(lineage.runs[0].providerResponseId, 'response-1');
  assert.equal(lineage.runs[0].retryCount, 1);
  assert.deepEqual(lineage.runs[0].attempts.map((attempt) => attempt.attempt), [1, 2]);
  assert.deepEqual(lineage.runs[0].artifacts.map((artifact) => artifact.id), ['artifact-1']);
  assert.deepEqual(lineage.runs[0].gaps, []);
  assert.deepEqual(lineage.unlinkedArtifacts.map((artifact) => artifact.id), ['artifact-unlinked']);
});

test('session lineage reports missing and conflicting provenance without inventing a link', () => {
  const payload = buildPayload();
  payload.agentRuns[0] = {
    ...payload.agentRuns[0],
    artifactIds: ['artifact-missing'],
    attemptHistory: [],
    endedAt: null,
    missionId: 'mission-other',
    providerResponseId: null,
    retryCount: 1,
    sessionId: null,
  };

  const lineage = createSessionLineage(payload);

  assert.deepEqual(lineage.runs[0].artifacts, []);
  assert.match(lineage.runs[0].gaps.join('\n'), /mission ID 불일치/);
  assert.match(lineage.runs[0].gaps.join('\n'), /session ID 없음/);
  assert.match(lineage.runs[0].gaps.join('\n'), /provider response ID 없음/);
  assert.match(lineage.runs[0].gaps.join('\n'), /provider retry 상세 없음/);
  assert.match(lineage.runs[0].gaps.join('\n'), /artifact record 없음/);
});

test('session lineage renderer keeps identifiers visible and escapes record content', () => {
  const payload = buildPayload();
  payload.mission.title = 'Trace <unsafe>';
  payload.agentRuns[0].providerResponseId = 'response-<unsafe>';

  const html = renderSessionLineage(payload);

  assert.match(html, /data-session-lineage="session-1"/);
  assert.match(html, /data-lineage-step="provider-response"/);
  assert.match(html, /response-&lt;unsafe&gt;/);
  assert.doesNotMatch(html, /response-<unsafe>/);
  assert.match(html, /run 종료/);
  assert.match(html, /시도 1 실패/);
  assert.match(html, /artifact-1/);
  assert.match(html, /실행 연결이 없는 산출물/);
});
