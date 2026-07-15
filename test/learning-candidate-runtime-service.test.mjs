import assert from 'node:assert/strict';
import test from 'node:test';

import { createLearningCandidateRuntimeService } from '../src/core/learning-candidate-runtime-service.mjs';

test('provider fallback enrichment updates the store before overwriting its artifact', () => {
  const effects = [];
  let candidate = {
    artifactPath: '/artifacts/candidate.md',
    evidence: {},
    id: 'candidate-1',
    proposal: { target: 'template' },
    recordType: 'failure-pattern',
    sessionId: 'session-1',
    summary: 'original summary',
    title: 'failure-pattern candidate for Mission',
  };
  const service = createLearningCandidateRuntimeService({
    fileSystem: {
      writeFileSync(filePath, content, encoding) {
        effects.push(`artifact-write:${filePath}:${encoding}`);
        assert.match(content, /provider-lesson/);
      },
    },
    now: () => '2026-07-16T00:00:00.000Z',
    store: {
      listLearningCandidates: ({ sessionId }) => sessionId === candidate.sessionId ? [candidate] : [],
      updateLearningCandidate(id, updater) {
        effects.push(`candidate-update:${id}`);
        candidate = updater(candidate);
        return candidate;
      },
    },
  });

  const providerFallback = {
    attempts: [{
      fallbackAttempt: 1,
      providerFailure: { failureKind: 'timeout', recoverable: true },
      providerId: 'primary',
      sessionId: 'session-1',
    }],
    enabled: true,
    finalStatus: 'failed',
    policyId: 'provider-failure-only',
    primaryProviderId: 'primary',
  };
  const result = service.attachProviderFallbackSummary({ learningCandidate: candidate }, providerFallback);

  assert.deepEqual(effects, [
    'candidate-update:candidate-1',
    'artifact-write:/artifacts/candidate.md:utf8',
  ]);
  assert.equal(result.learningCandidate.recordType, 'provider-lesson');
  assert.equal(result.learningCandidate.proposal.target, 'provider-policy');
  assert.equal(result.providerFallback, providerFallback);
});

test('artifact overwrite is skipped when the candidate has no artifact path', () => {
  let writeCount = 0;
  const service = createLearningCandidateRuntimeService({
    fileSystem: {
      writeFileSync() {
        writeCount += 1;
      },
    },
    now: () => '2026-07-16T00:00:00.000Z',
    store: {},
  });

  service.writeUpdatedLearningCandidateArtifact({ id: 'candidate-1' });

  assert.equal(writeCount, 0);
});
