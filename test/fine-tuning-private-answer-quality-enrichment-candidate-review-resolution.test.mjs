import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { buildFineTuningPrivateAnswerQualityEnrichmentCandidate } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewDecisionInput,
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution,
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord,
  buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution,
} from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import { buildFineTuningPrivateCollectionItemArtifactPreparationResolution } from '../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { buildFineTuningPrivateCollectionItemArtifactRequest } from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItemReviewResolution } from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { withSyntheticLifecycleFixture } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

test('F1.17 approve records reviewer pass while preserving the case materialization boundary', () => {
  withReviewFixture(({ candidate, decision, fixture, resolvedAt }) => {
    const resolution = buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
      admission: fixture.admission,
      candidate,
      decision,
      item: fixture.item,
      resolvedAt,
      workspace: fixture.workspace,
    });

    assert.doesNotThrow(() =>
      assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(resolution));
    assert.doesNotThrow(() =>
      assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution(resolution, {
        admission: fixture.admission,
        candidate,
        decision,
        item: fixture.item,
        workspace: fixture.workspace,
      }));
    assert.equal(resolution.reviewerVerdict, 'pass');
    assert.equal(resolution.q1ReviewerGateSatisfied, true);
    assert.equal(resolution.answerQualityCaseMaterializationAllowed, true);
    assert.equal(resolution.q1ContractSatisfied, false);
    assert.equal(resolution.answerQualityCaseCreated, false);
    assert.equal(resolution.answerQualityCaseEnrichmentCandidateCreated, true);
    assert.equal(resolution.answerQualityCaseEvaluationExecuted, false);
    assert.equal(resolution.candidateReviewCreated, true);
    assert.equal(resolution.candidateReviewResolved, true);
    assert.equal(resolution.dataOrigin, 'curated-synthetic');
    assert.equal(resolution.evidenceIndependentlyVerified, false);
    assert.equal(resolution.ownerAttestationRecorded, true);
    assert.equal(resolution.ownerIdentityVerified, false);
    assert.equal(resolution.itemPathStored, false);
    assert.equal(resolution.payloadStored, false);
    assert.equal(resolution.providerSubmissionCreated, false);
    assert.equal(resolution.workspaceMutationPerformed, false);
    assert.equal(resolution.actualModelTrainingExecuted, false);
    assert.equal(resolution.externalProviderCalls, 'none');
    assert.equal(resolution.externalSubmissionAuthorized, false);
    assert.equal(resolution.deploymentAuthorized, false);
    assert.equal(resolution.productionReadyClaim, false);
    assert.equal(resolution.bindings.candidateHash, candidate.candidateHash);
    assert.equal(
      resolution.bindings.candidateReviewDecisionHash,
      resolution.decisionHash,
    );
    assert.equal(resolution.sourceObservation.itemStoredAt, fixture.item.storedAt);
    assert.equal(JSON.stringify(resolution).includes(decision.confirmationToken), false);
  });
});

test('F1.17 reject records reviewer failure and keeps materialization closed', () => {
  withReviewFixture(({ candidate, fixture, resolvedAt }) => {
    const decision = reviewDecision(fixture, candidate, 'reject');
    const resolution = buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
      admission: fixture.admission,
      candidate,
      decision,
      item: fixture.item,
      resolvedAt,
      workspace: fixture.workspace,
    });

    assert.equal(resolution.decision, 'reject');
    assert.equal(resolution.reviewerVerdict, 'fail');
    assert.equal(resolution.q1ReviewerGateSatisfied, false);
    assert.equal(resolution.answerQualityCaseMaterializationAllowed, false);
    assert.equal(resolution.q1ContractSatisfied, false);
    assert.equal(resolution.answerQualityCaseCreated, false);
    assert.equal(resolution.answerQualityCaseEvaluationExecuted, false);
    assert.equal(resolution.trainingAuthorized, false);
    assert.equal(resolution.providerSubmissionAuthorized, false);
    assert.equal(resolution.trainingSubmissionCreated, false);
    assert.equal(resolution.productionReadyClaim, false);
    assert.doesNotThrow(() =>
      assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution(resolution, {
        admission: fixture.admission,
        candidate,
        decision,
        item: fixture.item,
        workspace: fixture.workspace,
      }));
  });
});

test('F1.17 decision input requires exact references, authority, target, evidence, and token', () => {
  withReviewFixture(({ candidate, decision, fixture }) => {
    const mutations = [
      (value) => { value.extra = true; },
      (value) => { value.decidedByRole = 'local-operator-role'; },
      (value) => { value.target = 'answer-quality-case-materialization'; },
      (value) => { value.evidenceSha256 = 'not-a-hash'; },
      (value) => { value.confirmationToken = `approve-private-answer-quality-enrichment-candidate-review:${'f'.repeat(64)}`; },
      (value) => { value.item.itemHash = 'f'.repeat(64); },
      (value) => { value.candidate.id = `private-answer-quality-case-${'f'.repeat(64)}`; },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(decision);
      mutate(changed);
      assert.throws(() =>
        assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewDecisionInput(changed));
    }

    const wrongCandidate = structuredClone(decision);
    wrongCandidate.candidate.candidateHash = 'f'.repeat(64);
    wrongCandidate.confirmationToken =
      `approve-private-answer-quality-enrichment-candidate-review:${wrongCandidate.candidate.candidateHash}`;
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
        admission: fixture.admission,
        candidate,
        decision: wrongCandidate,
        item: fixture.item,
        resolvedAt: decision.decidedAt,
        workspace: fixture.workspace,
      }),
      /exact live F1\.16 candidate/,
    );
  });
});

test('F1.17 enforces candidate-to-decision ordering and strict retention windows', () => {
  withReviewFixture(({ candidate, decision, fixture }) => {
    const beforeCandidate = structuredClone(decision);
    beforeCandidate.decidedAt =
      new Date(Date.parse(candidate.observedAt) - 1).toISOString();
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
        admission: fixture.admission,
        candidate,
        decision: beforeCandidate,
        item: fixture.item,
        resolvedAt: candidate.observedAt,
        workspace: fixture.workspace,
      }),
      /exact live F1\.16 candidate/,
    );

    const afterDecision = new Date(Date.parse(decision.decidedAt) - 1).toISOString();
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
        admission: fixture.admission,
        candidate,
        decision,
        item: fixture.item,
        resolvedAt: afterDecision,
        workspace: fixture.workspace,
      }),
      /exact live F1\.16 candidate/,
    );

    for (const resolvedAt of [fixture.item.expiresAt, fixture.item.retention.deleteBy]) {
      assert.throws(
        () => buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
          admission: fixture.admission,
          candidate,
          decision,
          item: fixture.item,
          resolvedAt,
          workspace: fixture.workspace,
        }),
        /exact live F1\.16 candidate/,
      );
    }

    const retentionDrift = structuredClone(candidate);
    retentionDrift.sourceObservation.expiresAt =
      new Date(Date.parse(candidate.sourceObservation.expiresAt) + 1_000).toISOString();
    rehashCandidate(retentionDrift);
    const driftDecision = reviewDecision(fixture, retentionDrift, 'approve');
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
        admission: fixture.admission,
        candidate: retentionDrift,
        decision: driftDecision,
        item: fixture.item,
        resolvedAt: driftDecision.decidedAt,
        workspace: fixture.workspace,
      }),
      /exact live F1\.16 candidate/,
    );
  });
});

test('F1.17 record validation rejects semantic rehash and live candidate substitution', () => {
  withReviewFixture(({ candidate, decision, fixture, resolvedAt }) => {
    const original = buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
      admission: fixture.admission,
      candidate,
      decision,
      item: fixture.item,
      resolvedAt,
      workspace: fixture.workspace,
    });

    for (const mutate of [
      (resolution) => { resolution.answerQualityCaseMaterializationAllowed = false; },
      (resolution) => { resolution.q1ContractSatisfied = true; },
      (resolution) => { resolution.answerQualityCaseEvaluationExecuted = true; },
      (resolution) => { resolution.decisionHash = 'f'.repeat(64); },
      (resolution) => { resolution.bindings.candidateReviewDecisionHash = 'f'.repeat(64); },
      (resolution) => {
        resolution.sourceObservation.itemStoredAt =
          new Date(Date.parse(resolution.sourceObservation.candidateObservedAt) + 1).toISOString();
      },
      (resolution) => { resolution.decisionRecord.extra = true; },
    ]) {
      const changed = structuredClone(original);
      mutate(changed);
      rehashResolution(changed);
      assert.throws(
        () =>
          assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(changed),
        /integrity|fields are invalid/,
      );
    }

    const substituted = structuredClone(original);
    substituted.candidate.candidateHash = 'f'.repeat(64);
    substituted.bindings.candidateHash = substituted.candidate.candidateHash;
    rehashResolution(substituted);
    assert.doesNotThrow(() =>
      assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(substituted));
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution(substituted, {
        admission: fixture.admission,
        candidate,
        decision,
        item: fixture.item,
        workspace: fixture.workspace,
      }),
      /does not match|exact live F1\.16 candidate/,
    );

    const decisionSubstitution = structuredClone(original);
    decisionSubstitution.decisionRecord.evidenceSha256 = 'e'.repeat(64);
    decisionSubstitution.decisionHash = digest(
      JSON.stringify(decisionSubstitution.decisionRecord),
    );
    decisionSubstitution.bindings.candidateReviewDecisionHash =
      decisionSubstitution.decisionHash;
    rehashResolution(decisionSubstitution);
    assert.doesNotThrow(() =>
      assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
        decisionSubstitution,
      ));
    assert.throws(
      () =>
        assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution(
          decisionSubstitution,
          {
            admission: fixture.admission,
            candidate,
            decision,
            item: fixture.item,
            workspace: fixture.workspace,
          },
        ),
      /does not match/,
    );
  });
});

function withReviewFixture(assertions) {
  withSyntheticLifecycleFixture((fixture) => {
    const lineage = approvedLineage(fixture);
    const candidate = buildFineTuningPrivateAnswerQualityEnrichmentCandidate(
      candidateInput(fixture, lineage),
    );
    const decision = reviewDecision(fixture, candidate, 'approve');
    const resolvedAt = new Date(Date.parse(decision.decidedAt) + 1_000).toISOString();
    assertions({ candidate, decision, fixture, lineage, resolvedAt });
  }, { lane: 'answer-quality-cases' });
}

function approvedLineage(fixture) {
  const projectedAt = new Date(Date.parse(fixture.item.storedAt) + 1_000).toISOString();
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt,
    request: {
      admission: ref(fixture.admission, 'admissionHash'),
      item: ref(fixture.item, 'itemHash'),
      requestedAt: projectedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: 'answer-quality-case-enrichment-review',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  const reviewedAt = new Date(Date.parse(projectedAt) + 1_000).toISOString();
  const reviewResolution = buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision: {
      admission: ref(fixture.admission, 'admissionHash'),
      confirmationToken: `approve-private-collection-item-review:${projection.projectionHash}`,
      decidedAt: reviewedAt,
      decidedByRole: 'quality-reviewer',
      decision: 'approve',
      evidenceSha256: digest('review'),
      item: ref(fixture.item, 'itemHash'),
      projection: ref(projection, 'projectionHash'),
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
      target: projection.projectionKind,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    projection,
    resolvedAt: reviewedAt,
    workspace: fixture.workspace,
  });
  const requestedAt = new Date(Date.parse(reviewedAt) + 1_000).toISOString();
  const artifactRequest = buildFineTuningPrivateCollectionItemArtifactRequest({
    admission: fixture.admission,
    artifactRequestInput: {
      admission: ref(fixture.admission, 'admissionHash'),
      item: ref(fixture.item, 'itemHash'),
      projection: ref(projection, 'projectionHash'),
      requestedAt,
      requestedByRole: 'local-operator-role',
      reviewResolution: ref(reviewResolution, 'resolutionHash'),
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
      target: 'answer-quality-case-enrichment',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    createdAt: requestedAt,
    item: fixture.item,
    projection,
    reviewResolution,
    workspace: fixture.workspace,
  });
  const decidedAt = new Date(Date.parse(requestedAt) + 1_000).toISOString();
  const resolution = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
    admission: fixture.admission,
    artifactRequest,
    decision: {
      artifactRequest: ref(artifactRequest, 'artifactRequestHash'),
      confirmationToken:
        `approve-private-collection-item-artifact-preparation:${artifactRequest.artifactRequestHash}`,
      decidedAt,
      decidedByRole: 'quality-reviewer',
      decision: 'approve',
      evidenceSha256: digest('preparation-approve'),
      item: ref(fixture.item, 'itemHash'),
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1',
      target: artifactRequest.target,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    projection,
    resolvedAt: decidedAt,
    reviewResolution,
    workspace: fixture.workspace,
  });
  return { artifactRequest, projection, resolution, reviewResolution };
}

function candidateInput(fixture, lineage) {
  return {
    admission: fixture.admission,
    artifactPreparationResolution: lineage.resolution,
    artifactRequest: lineage.artifactRequest,
    input: {
      answer: { citedSourceKeys: ['memory:workspace/fact'] },
      artifactPreparationResolution: ref(
        lineage.resolution,
        'artifactPreparationResolutionHash',
      ),
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
        mission: {
          constraints: [],
          deliverableType: 'decision-memo',
          mode: 'knowledge',
          objective: fixture.item.example.instruction,
          title: 'Synthetic lifecycle',
        },
        pack: { requiredSections: [], reviewRules: [] },
        previousOutputs: {},
        providerRole: 'manager',
        role: 'manager',
      },
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-input/v1',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    observedAt: new Date(Date.parse(lineage.resolution.resolvedAt) + 1_000).toISOString(),
    projection: lineage.projection,
    reviewResolution: lineage.reviewResolution,
    workspace: fixture.workspace,
  };
}

function reviewDecision(fixture, candidate, decision) {
  const decidedAt = new Date(Date.parse(candidate.observedAt) + 1_000).toISOString();
  return {
    admission: ref(fixture.admission, 'admissionHash'),
    candidate: ref(candidate, 'candidateHash'),
    confirmationToken:
      `${decision}-private-answer-quality-enrichment-candidate-review:${candidate.candidateHash}`,
    decidedAt,
    decidedByRole: 'quality-reviewer',
    decision,
    evidenceSha256: digest(`candidate-review-${decision}`),
    item: ref(fixture.item, 'itemHash'),
    schemaVersion:
      'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-candidate-review-decision-input/v1',
    target: 'answer-quality-case-q1-review',
    workspace: ref(fixture.workspace, 'workspaceHash'),
  };
}

function ref(value, field) {
  return { id: value.id, [field]: value[field] };
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function rehashResolution(resolution) {
  const {
    candidateReviewResolutionHash: ignoredHash,
    id: ignoredId,
    ...content
  } = resolution;
  resolution.candidateReviewResolutionHash = digest(JSON.stringify(content));
  resolution.id =
    'fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-' +
    resolution.candidateReviewResolutionHash;
}

function rehashCandidate(candidate) {
  const { candidateHash: ignoredHash, id: ignoredId, ...content } = candidate;
  candidate.candidateHash = digest(JSON.stringify(content));
}
