import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord,
  buildFineTuningPrivateAnswerQualityEnrichmentCandidate,
} from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { buildFineTuningPrivateCollectionItemArtifactPreparationResolution } from '../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { buildFineTuningPrivateCollectionItemArtifactRequest } from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItemReviewResolution } from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { withSyntheticLifecycleFixture } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

test('F1.16 creates a content-free synthetic answer quality candidate from one approved F1.15 lineage', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    const candidate = buildFineTuningPrivateAnswerQualityEnrichmentCandidate(
      candidateInput(fixture, lineage),
    );

    assert.doesNotThrow(() => assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(candidate));
    assert.equal(candidate.id, `private-answer-quality-case-${fixture.item.itemHash}`);
    assert.equal(candidate.answerQualityCaseEnrichmentCandidateCreated, true);
    assert.equal(candidate.answerQualityCaseCreated, false);
    assert.equal(candidate.q1ContractSatisfied, false);
    assert.equal(candidate.reviewerReviewRequired, true);
    assert.equal(candidate.reviewerVerdict, 'not-reviewed');
    assert.equal(candidate.precheck.status, 'passed');
    assert.equal(candidate.externalProviderCalls, 'none');
    assert.equal(candidate.productionReadyClaim, false);
    const serialized = JSON.stringify(candidate);
    for (const raw of [fixture.item.example.instruction, fixture.item.example.response, 'memory:workspace/fact']) {
      assert.equal(serialized.includes(raw), false);
    }
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 refuses a wrong lane, rejected F1.15 decision, or lineage drift', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidate(candidateInput(fixture, lineage)),
      /approved live synthetic F1\.15/,
    );
  }, { lane: 'reviewed-examples' });

  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture, { decision: 'reject' });
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidate(candidateInput(fixture, lineage)),
      /approved live synthetic F1\.15/,
    );
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    const input = enrichmentInput(fixture, lineage.resolution);
    input.artifactPreparationResolution.artifactPreparationResolutionHash = 'f'.repeat(64);
    input.artifactPreparationResolution.id = `fine-tuning-private-collection-item-artifact-preparation-resolution-${'f'.repeat(64)}`;
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
        ...candidateInput(fixture, lineage),
        input,
      }),
      /live lineage/,
    );
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 enforces exact linkage, safe bounded input, uniqueness, and deterministic precheck', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    const cases = [
      (input) => { input.retrievalInput.mission.objective = 'different'; },
      (input) => { input.answer.text = 'not allowed'; },
      (input) => { input.expectedSourceKeys.push('memory:workspace/fact'); },
      (input) => { input.forbiddenSourceKeys = ['memory:workspace/fact']; },
      (input) => { input.answer.citedSourceKeys = ['memory:workspace/missing']; },
      (input) => { input.requiredAnswerTerms = ['missing']; },
      (input) => { input.retrievalInput.mission.objective = `${fixture.item.example.instruction}\u0000`; },
      (input) => { input.retrievalInput.memoryEntries[0].content = 'customer email jane@example.com'; },
    ];
    for (const mutate of cases) {
      const input = enrichmentInput(fixture, lineage.resolution);
      mutate(input);
      assert.throws(() => buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
        ...candidateInput(fixture, lineage),
        input,
      }));
    }
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 candidate record rejects tampering', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    const candidate = buildFineTuningPrivateAnswerQualityEnrichmentCandidate(
      candidateInput(fixture, lineage),
    );
    candidate.precheck.metrics.retrievalHitRate = 0;
    assert.throws(() => assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(candidate), /integrity/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 enforces the strict live observation window and lineage observations', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    for (const observedAt of [
      fixture.item.expiresAt,
      fixture.item.retention.deleteBy,
      new Date(Date.parse(fixture.item.retention.deleteBy) + 1).toISOString(),
    ]) {
      assert.throws(
        () => buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
          ...candidateInput(fixture, lineage),
          observedAt,
        }),
        /approved live synthetic F1\.15/,
      );
    }

    const beforeResolution = new Date(Date.parse(lineage.resolution.resolvedAt) - 1).toISOString();
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
        ...candidateInput(fixture, lineage),
        observedAt: beforeResolution,
      }),
      /approved live synthetic F1\.15/,
    );

    const driftedProjection = structuredClone(lineage.projection);
    driftedProjection.sourceObservation.storedAt =
      new Date(Date.parse(fixture.item.storedAt) + 1).toISOString();
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
        ...candidateInput(fixture, lineage),
        projection: driftedProjection,
      }),
      /integrity/,
    );

    const driftedResolution = structuredClone(lineage.resolution);
    driftedResolution.bindings.itemHash = 'f'.repeat(64);
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
        ...candidateInput(fixture, lineage),
        artifactPreparationResolution: driftedResolution,
      }),
      /integrity/,
    );
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 retrieval input rejects nested extras, unsafe metadata, limits, and folded duplicates', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    const mutations = [
      (input) => { input.retrievalInput.previousOutputs.extra = {}; },
      (input) => { input.retrievalInput.memoryEntries[0].extra = 'value'; },
      (input) => { input.retrievalInput.memoryEntries[0].dataOrigin = 'owner-authored'; },
      (input) => { input.retrievalInput.attachments = [{ dataOrigin: 'curated-synthetic', fileName: 'case.md', promptContent: 'Safe synthetic lifecycle.', extra: {} }]; },
      (input) => { input.retrievalInput.attachments = [{ dataOrigin: 'owner-authored', fileName: 'case.md', promptContent: 'Safe synthetic lifecycle.' }]; },
      (input) => { input.retrievalInput.pack.reviewRules = [{ description: 'Verify synthetic lifecycle.', id: 'extra' }]; },
      (input) => { input.retrievalInput.mission.title = `unsafe\u061c`; },
      (input) => { input.retrievalInput.mission.title = `unsafe\u2060`; },
      (input) => { input.retrievalInput.mission.title = 'x'.repeat(16 * 1024 + 1); },
      (input) => { input.requiredAnswerTerms = ['Synthetic', 'synthetic']; },
      (input) => { input.expectedSourceKeys = ['memory:Workspace/fact']; input.answer.citedSourceKeys = ['memory:Workspace/fact']; },
      (input) => { input.retrievalInput.memoryEntries = Array.from({ length: 17 }, () => ({ content: 'Synthetic lifecycle response is verified.', dataOrigin: 'curated-synthetic', kind: 'fact', scope: 'workspace' })); },
    ];
    for (const mutate of mutations) {
      const input = enrichmentInput(fixture, lineage.resolution);
      mutate(input);
      assert.throws(() => buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
        ...candidateInput(fixture, lineage),
        input,
      }));
    }

    const decomposed = enrichmentInput(fixture, lineage.resolution);
    decomposed.retrievalInput.mission.title = 'Cafe\u0301 lifecycle';
    const candidate = buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
      ...candidateInput(fixture, lineage),
      input: decomposed,
    });
    assert.doesNotThrow(() => assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(candidate));
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 rejects semantic rehash attacks against summary, counts, metrics, and bindings', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    const original = buildFineTuningPrivateAnswerQualityEnrichmentCandidate(
      candidateInput(fixture, lineage),
    );
    const attacks = [
      (candidate) => { candidate.inputSummary.extra = 1; },
      (candidate) => {
        candidate.precheck.counts.expectedSourceCount = 2;
        candidate.precheck.metrics.expectedSourceCitationRate = 0.5;
        candidate.precheck.metrics.retrievalHitRate = 0.5;
        candidate.precheck.precheckHash = digest(JSON.stringify({
          counts: candidate.precheck.counts,
          metrics: candidate.precheck.metrics,
          status: candidate.precheck.status,
        }));
      },
      (candidate) => {
        candidate.precheck.counts.forbiddenTermMatchCount = 1;
        candidate.precheck.metrics.forbiddenTermMatchCount = 1;
        candidate.precheck.precheckHash = digest(JSON.stringify({
          counts: candidate.precheck.counts,
          metrics: candidate.precheck.metrics,
          status: candidate.precheck.status,
        }));
      },
      (candidate) => {
        candidate.inputSummary.citedSourceKeyCount = 2;
        candidate.precheck.counts.citedSourceCount = 2;
        candidate.precheck.counts.groundedCitationCount = 2;
        candidate.precheck.precheckHash = digest(JSON.stringify({
          counts: candidate.precheck.counts,
          metrics: candidate.precheck.metrics,
          status: candidate.precheck.status,
        }));
      },
      (candidate) => { candidate.bindings.itemHash = 'f'.repeat(64); },
      (candidate) => { candidate.bindings.extra = 'f'.repeat(64); },
    ];
    for (const attack of attacks) {
      const candidate = structuredClone(original);
      attack(candidate);
      rehashCandidate(candidate);
      assert.throws(
        () => assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(candidate),
        /integrity|fields are invalid/,
      );
    }
  }, { lane: 'answer-quality-cases' });
});

function approvedLineage(fixture, { decision = 'approve' } = {}) {
  const reviewTarget = fixture.item.lane === 'answer-quality-cases'
    ? 'answer-quality-case-enrichment-review'
    : 'reviewed-example-candidate-review';
  const artifactTarget = fixture.item.lane === 'answer-quality-cases'
    ? 'answer-quality-case-enrichment'
    : 'reviewed-example-canonicalization';
  const projectedAt = new Date(Date.parse(fixture.item.storedAt) + 1_000).toISOString();
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt,
    request: {
      admission: ref(fixture.admission, 'admissionHash'), item: ref(fixture.item, 'itemHash'),
      requestedAt: projectedAt, requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: reviewTarget, workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  const reviewedAt = new Date(Date.parse(projectedAt) + 1_000).toISOString();
  const reviewResolution = buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision: {
      admission: ref(fixture.admission, 'admissionHash'),
      confirmationToken: `approve-private-collection-item-review:${projection.projectionHash}`,
      decidedAt: reviewedAt, decidedByRole: 'quality-reviewer', decision: 'approve', evidenceSha256: digest('review'),
      item: ref(fixture.item, 'itemHash'), projection: ref(projection, 'projectionHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
      target: projection.projectionKind, workspace: ref(fixture.workspace, 'workspaceHash'),
    }, item: fixture.item, projection, resolvedAt: reviewedAt, workspace: fixture.workspace,
  });
  const requestedAt = new Date(Date.parse(reviewedAt) + 1_000).toISOString();
  const artifactRequest = buildFineTuningPrivateCollectionItemArtifactRequest({
    admission: fixture.admission,
    artifactRequestInput: {
      admission: ref(fixture.admission, 'admissionHash'), item: ref(fixture.item, 'itemHash'),
      projection: ref(projection, 'projectionHash'), requestedAt, requestedByRole: 'local-operator-role',
      reviewResolution: ref(reviewResolution, 'resolutionHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
      target: artifactTarget, workspace: ref(fixture.workspace, 'workspaceHash'),
    }, createdAt: requestedAt, item: fixture.item, projection, reviewResolution, workspace: fixture.workspace,
  });
  const decidedAt = new Date(Date.parse(requestedAt) + 1_000).toISOString();
  const resolution = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
    admission: fixture.admission, artifactRequest,
    decision: {
      artifactRequest: ref(artifactRequest, 'artifactRequestHash'),
      confirmationToken: `${decision}-private-collection-item-artifact-preparation:${artifactRequest.artifactRequestHash}`,
      decidedAt, decidedByRole: 'quality-reviewer', decision, evidenceSha256: digest(`preparation-${decision}`),
      item: ref(fixture.item, 'itemHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1',
      target: artifactRequest.target, workspace: ref(fixture.workspace, 'workspaceHash'),
    }, item: fixture.item, projection, resolvedAt: decidedAt, reviewResolution, workspace: fixture.workspace,
  });
  return { artifactRequest, projection, resolution, reviewResolution };
}

function enrichmentInput(fixture, resolution) {
  return {
    answer: { citedSourceKeys: ['memory:workspace/fact'] },
    artifactPreparationResolution: ref(resolution, 'artifactPreparationResolutionHash'),
    expectedSourceKeys: ['memory:workspace/fact'],
    forbiddenAnswerTerms: ['production validated'],
    forbiddenSourceKeys: ['memory:mission/preference'],
    item: ref(fixture.item, 'itemHash'),
    requiredAnswerTerms: ['synthetic', 'lifecycle'],
    retrievalInput: {
      attachments: [],
      memoryEntries: [{
        content: 'Synthetic lifecycle response is verified.',
        dataOrigin: 'curated-synthetic',
        kind: 'fact',
        scope: 'workspace',
      }],
      mission: { constraints: [], deliverableType: 'decision-memo', mode: 'knowledge', objective: fixture.item.example.instruction, title: 'Synthetic lifecycle' },
      pack: { requiredSections: [], reviewRules: [] }, previousOutputs: {}, providerRole: 'manager', role: 'manager',
    },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-input/v1',
    workspace: ref(fixture.workspace, 'workspaceHash'),
  };
}

function candidateInput(fixture, lineage) {
  return {
    admission: fixture.admission,
    artifactPreparationResolution: lineage.resolution,
    artifactRequest: lineage.artifactRequest,
    input: enrichmentInput(fixture, lineage.resolution),
    item: fixture.item,
    observedAt: new Date(Date.parse(lineage.resolution.resolvedAt) + 1_000).toISOString(),
    projection: lineage.projection,
    reviewResolution: lineage.reviewResolution,
    workspace: fixture.workspace,
  };
}

function ref(value, field) {
  return { id: value.id, [field]: value[field] };
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
function rehashCandidate(candidate) {
  const { candidateHash: ignoredHash, id: ignoredId, ...content } = candidate;
  candidate.candidateHash = digest(JSON.stringify(content));
}
