import assert from 'node:assert/strict';
import { formatLiveValidationFailureLines, parseLiveValidationReason } from './live-validation-utils.mjs';

const parsed = parseLiveValidationReason(
  [
    'openai live mission run failed',
    'rootDir=/tmp/live-root',
    'workspaceId=workspace_123',
    'missionId=mission_456',
    'reviewerSummary=Deterministic review failed after provider mismatch.',
    'artifact=reviewer-report.md',
    'sessionId=session_789',
    'missionStatus=failed',
  ].join(' | '),
);

assert.ok(parsed);
assert.equal(parsed.message, 'openai live mission run failed');
assert.equal(parsed.details.rootDir, '/tmp/live-root');
assert.equal(parsed.details.workspaceId, 'workspace_123');
assert.equal(parsed.details.missionId, 'mission_456');
assert.equal(parsed.details.reviewerSummary, 'Deterministic review failed after provider mismatch.');
assert.equal(parsed.details.artifact, 'reviewer-report.md');
assert.equal(parsed.details.sessionId, 'session_789');
assert.equal(parsed.details.missionStatus, 'failed');

const lines = formatLiveValidationFailureLines(parsed);
assert.ok(lines.some((line) => line.includes('failure: openai live mission run failed')));
assert.ok(lines.some((line) => line.includes('rootDir: /tmp/live-root')));
assert.ok(lines.some((line) => line.includes('reviewerSummary: Deterministic review failed after provider mismatch.')));

console.log(
  JSON.stringify(
    {
      ok: true,
      parsedReason: parsed,
      renderedLines: lines,
    },
    null,
    2,
  ),
);
